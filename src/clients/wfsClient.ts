/**
 * WfsClient — typed client for an OGC Web Feature Service (WFS), backing the
 * GeoServer summary layers (arsenic, water levels, TDS) published from NM Water
 * Data's GeoServer rather than OGC API / STA / ArcGIS.
 *
 * Each client is bound to one WFS endpoint base (…/geoserver). It requests
 * `outputFormat=application/json`, so GeoServer returns standard GeoJSON — the
 * map and table consume it with no WFS/GML-specific shapes leaking out. Paging
 * follows WFS 2.0 `startIndex` / `count` + the GeoJSON `numberMatched` total,
 * mirroring how OgcFeaturesClient walks pygeoapi.
 */

export type Feature = GeoJSON.Feature
export interface FeatureCollection extends GeoJSON.FeatureCollection {
  /** WFS 2.0 / GeoServer GeoJSON totals. */
  numberMatched?: number
  numberReturned?: number
  totalFeatures?: number
}

export interface WfsQuery {
  /** Spatial filter as a lon/lat envelope [minLon, minLat, maxLon, maxLat]. */
  bbox?: [number, number, number, number]
  /** ECQL/CQL attribute filter, e.g. `tds > 1000`. */
  cqlFilter?: string
  /** Comma-separated property list to return; omit for all. */
  propertyName?: string
  /** WFS paging cursor. */
  startIndex?: number
  /** Page size (WFS 2.0 `count`). */
  count?: number
}

/** GeoServer emits GeoJSON coordinates in lon/lat regardless of axis order. */
const SRS_NAME = "EPSG:4326"

/** Build the `?…` query string for a WFS GetFeature request. */
function buildQuery(typeName: string, q?: WfsQuery): string {
  const params = new URLSearchParams()
  params.set("service", "WFS")
  params.set("version", "2.0.0")
  params.set("request", "GetFeature")
  params.set("typeNames", typeName)
  params.set("outputFormat", "application/json")
  params.set("srsName", SRS_NAME)
  if (q?.bbox) params.set("bbox", [...q.bbox, SRS_NAME].join(","))
  if (q?.cqlFilter) params.set("cql_filter", q.cqlFilter)
  if (q?.propertyName) params.set("propertyName", q.propertyName)
  if (q?.startIndex != null) params.set("startIndex", String(q.startIndex))
  if (q?.count != null) params.set("count", String(q.count))
  return `?${params.toString()}`
}

export class WfsClient {
  /** WFS endpoint base, e.g. `…/geoserver` (the `/wfs` path is appended). */
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "")
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/wfs${path}`, {
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      throw new Error(`WFS request failed: ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }

  /** Fetch a single page of GeoJSON features for a typeName. */
  getFeatures(typeName: string, q?: WfsQuery): Promise<FeatureCollection> {
    return this.get<FeatureCollection>(buildQuery(typeName, q))
  }

  /**
   * Fetch every feature, following WFS `startIndex` paging until the server has
   * nothing left. GeoServer caps a page (default 1M, but a typeName may set a
   * lower max), so this loops to assemble the full FeatureCollection the
   * map/table expect. `pageSize` is the per-request `count`; `maxPages` bounds
   * the loop. Any caller startIndex/count in `q` is overridden by the pager.
   */
  async getAllFeatures(
    typeName: string,
    q?: WfsQuery,
    pageSize = 10000,
    maxPages = 100,
    onProgress?: (loaded: number) => void
  ): Promise<FeatureCollection> {
    const all: Feature[] = []
    let startIndex = 0
    let numberMatched: number | undefined

    for (let page = 0; page < maxPages; page++) {
      const fc = await this.getFeatures(typeName, {
        ...q,
        startIndex,
        count: pageSize,
      })
      numberMatched = fc.numberMatched ?? fc.totalFeatures ?? numberMatched
      const batch = fc.features ?? []
      all.push(...batch)
      onProgress?.(all.length)

      const done =
        batch.length < pageSize ||
        (numberMatched !== undefined && all.length >= numberMatched)
      if (done) break
      startIndex += pageSize
    }

    return {
      type: "FeatureCollection",
      features: all,
      numberMatched,
      numberReturned: all.length,
    }
  }
}

// One protocol, but a deployment may host layers behind one or more endpoints.
// Cache one client per base URL so layers stay config-only — no per-source code.
const clientCache = new Map<string, WfsClient>()

export function wfsClient(baseUrl: string): WfsClient {
  let client = clientCache.get(baseUrl)
  if (!client) {
    client = new WfsClient(baseUrl)
    clientCache.set(baseUrl, client)
  }
  return client
}
