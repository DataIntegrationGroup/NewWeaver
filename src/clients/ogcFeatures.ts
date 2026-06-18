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

  /** Fetch GeoJSON items for a collection. */
  getItems(
    collectionId: string,
    query?: ItemsQuery
  ): Promise<FeatureCollection> {
    return this.get<FeatureCollection>(
      `/collections/${collectionId}/items${buildQuery(query)}`
    )
  }

  /** Fetch a single feature by id. */
  getItem(collectionId: string, featureId: string): Promise<Feature> {
    return this.get<Feature>(
      `/collections/${collectionId}/items/${featureId}`
    )
  }
}

export const features = new OgcFeaturesClient()
