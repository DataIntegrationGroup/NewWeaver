/**
 * OgcFeaturesClient — thin typed client for OGC API Features. Backs vector
 * map layers and attribute tables. Reads DIE's pygeoapi (the only Features
 * endpoint Weaver touches).
 *
 * Implements the slice v1 needs: list collections, fetch a collection's
 * GeoJSON items with bbox + limit/offset paging.
 */
import { FEATURES_BASE_URL } from "@/config"

export interface Link {
  href: string
  rel: string
  type?: string
  title?: string
}

export interface Collection {
  id: string
  title?: string
  description?: string
  extent?: {
    spatial?: { bbox: number[][]; crs?: string }
    temporal?: { interval: (string | null)[][] }
  }
  links: Link[]
}

export interface CollectionsResponse {
  collections: Collection[]
  links: Link[]
}

export type Feature = GeoJSON.Feature
export interface FeatureCollection extends GeoJSON.FeatureCollection {
  numberMatched?: number
  numberReturned?: number
  links?: Link[]
}

export interface ItemsQuery {
  /** [minLon, minLat, maxLon, maxLat] in CRS84. */
  bbox?: [number, number, number, number]
  limit?: number
  offset?: number
  /** Arbitrary attribute filters supported by the collection. */
  [key: string]: string | number | boolean | number[] | undefined
}

function buildQuery(q?: ItemsQuery): string {
  if (!q) return ""
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null) continue
    params.set(k, Array.isArray(v) ? v.join(",") : String(v))
  }
  const s = params.toString()
  return s ? `?${s}` : ""
}

export class OgcFeaturesClient {
  private readonly baseUrl: string

  constructor(baseUrl: string = FEATURES_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async get<T>(url: string): Promise<T> {
    const full = url.startsWith("http") ? url : `${this.baseUrl}${url}`
    const sep = full.includes("?") ? "&" : "?"
    const res = await fetch(`${full}${sep}f=json`, {
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      throw new Error(
        `Features request failed: ${res.status} ${res.statusText}`
      )
    }
    return res.json() as Promise<T>
  }

  /** List available collections. */
  listCollections(): Promise<CollectionsResponse> {
    return this.get<CollectionsResponse>(`/collections`)
  }

  /** Fetch a single collection's metadata. */
  getCollection(collectionId: string): Promise<Collection> {
    return this.get<Collection>(`/collections/${collectionId}`)
  }

  /** Fetch a single page of GeoJSON items for a collection. */
  getItems(
    collectionId: string,
    query?: ItemsQuery
  ): Promise<FeatureCollection> {
    return this.get<FeatureCollection>(
      `/collections/${collectionId}/items${buildQuery(query)}`
    )
  }

  /**
   * Fetch every item in a collection by following the OGC `rel="next"` link
   * chain until the server stops emitting one. This is the portable paging
   * mechanism: pygeoapi (offset-based) and GeoServer (startIndex-based) both
   * advertise the next page as a link, so we don't have to know which query
   * param a server honors — GeoServer, notably, ignores `offset`.
   *
   * `pageSize` is the initial `limit`; the server echoes it into the next
   * link. `maxPages` bounds the loop so a self-referential link can't spin
   * forever. Any caller-supplied limit/offset in `query` is overridden.
   */
  async getAllItems(
    collectionId: string,
    query?: ItemsQuery,
    pageSize = 10000,
    maxPages = 100,
    onProgress?: (loaded: number) => void
  ): Promise<FeatureCollection> {
    const all: Feature[] = []
    let numberMatched: number | undefined
    let last: FeatureCollection | undefined
    // First page respects the caller's query (bbox, filter, …) + our base URL;
    // the pager owns limit/offset.
    const rest: ItemsQuery = { ...query }
    delete rest.limit
    delete rest.offset
    let url: string | null = `/collections/${collectionId}/items${buildQuery({
      ...rest,
      limit: pageSize,
    })}`

    for (let page = 0; page < maxPages && url; page++) {
      const fc: FeatureCollection = await this.get<FeatureCollection>(url)
      last = fc
      numberMatched = fc.numberMatched ?? numberMatched
      const batch = fc.features ?? []
      all.push(...batch)
      onProgress?.(all.length)

      // Stop when we've matched everything the server reported, or there's no
      // next page. Empty batch also ends the loop (defensive).
      if (
        batch.length === 0 ||
        (numberMatched !== undefined && all.length >= numberMatched)
      ) {
        break
      }
      const next = fc.links?.find((l: Link) => l.rel === "next")?.href
      url = next ? this.followPath(next) : null
    }

    return {
      type: "FeatureCollection",
      features: all,
      numberMatched,
      numberReturned: all.length,
      links: last?.links,
    }
  }

  /**
   * Convert a `rel="next"` href into a URL `get()` can fetch: strip our base's
   * path prefix so the result is base-relative (get() re-prepends the base).
   * This keeps proxied servers same-origin — GeoServer's next link is an
   * absolute upstream URL that would otherwise bypass the CORS proxy.
   */
  private followPath(href: string): string | null {
    try {
      const next = new URL(href)
      const basePath = this.baseUrl.startsWith("http")
        ? new URL(this.baseUrl).pathname
        : this.baseUrl
      const path = next.pathname.startsWith(basePath)
        ? next.pathname.slice(basePath.length)
        : next.pathname
      return path + next.search
    } catch {
      return null
    }
  }

  /** Fetch a single feature by id. */
  getItem(collectionId: string, featureId: string): Promise<Feature> {
    return this.get<Feature>(
      `/collections/${collectionId}/items/${featureId}`
    )
  }
}

export const features = new OgcFeaturesClient()

// Features is one protocol but collections may live on more than one pygeoapi
// deployment (e.g. Ocotillo). Cache one client per base URL so layers can
// target the right server without growing source-specific code.
const clientCache = new Map<string, OgcFeaturesClient>([
  [FEATURES_BASE_URL, features],
])

export function featuresClient(
  baseUrl: string = FEATURES_BASE_URL
): OgcFeaturesClient {
  let client = clientCache.get(baseUrl)
  if (!client) {
    client = new OgcFeaturesClient(baseUrl)
    clientCache.set(baseUrl, client)
  }
  return client
}
