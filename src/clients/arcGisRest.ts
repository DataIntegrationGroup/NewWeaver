/**
 * ArcGisRestClient — typed client for an ArcGIS REST FeatureServer layer.
 * Backs the OSE GIS layers (Points of Diversion, Aquifer Test Wells), which are
 * published as Esri Feature Services rather than OGC API / STA.
 *
 * Each client is bound to one FeatureServer layer URL (…/FeatureServer/0). It
 * queries with `f=geojson`, so responses come back as standard GeoJSON — the
 * map and table consume them with no Esri-specific shapes leaking out. Paging
 * follows Esri's `resultOffset` / `resultRecordCount` + `exceededTransferLimit`
 * protocol, mirroring how the original Weaver pulled the OSE aquifer-test wells.
 */

export interface Link {
  href: string
  rel: string
}

export type Feature = GeoJSON.Feature
export interface FeatureCollection extends GeoJSON.FeatureCollection {
  /** Esri sets this when a query hit the server's transfer cap — page again. */
  exceededTransferLimit?: boolean
  properties?: { exceededTransferLimit?: boolean } & Record<string, unknown>
}

export interface ArcGisQuery {
  /** Attribute filter; defaults to "1=1" (all rows). */
  where?: string
  /** Comma-separated field list, or "*" (default). */
  outFields?: string
  /** Esri paging cursor. */
  resultOffset?: number
  /** Page size. */
  resultRecordCount?: number
  /** Spatial filter as a lon/lat envelope [minX, minY, maxX, maxY] in 4326. */
  bbox?: [number, number, number, number]
}

/** Add an envelope spatial filter to a query param set. */
function applyBbox(params: URLSearchParams, bbox: [number, number, number, number]) {
  params.set("geometry", bbox.join(","))
  params.set("geometryType", "esriGeometryEnvelope")
  params.set("inSR", "4326")
  params.set("spatialRel", "esriSpatialRelIntersects")
}

/** Build the `?…` query string for a FeatureServer `/query` request. */
function buildQuery(q?: ArcGisQuery): string {
  const params = new URLSearchParams()
  params.set("f", "geojson")
  params.set("where", q?.where ?? "1=1")
  params.set("outFields", q?.outFields ?? "*")
  params.set("returnGeometry", "true")
  if (q?.resultOffset != null) params.set("resultOffset", String(q.resultOffset))
  if (q?.resultRecordCount != null)
    params.set("resultRecordCount", String(q.resultRecordCount))
  if (q?.bbox) applyBbox(params, q.bbox)
  return `?${params.toString()}`
}

/** Read Esri's "more rows available" flag, which sits at one of two spots. */
function exceeded(fc: FeatureCollection): boolean {
  return (fc.exceededTransferLimit ?? fc.properties?.exceededTransferLimit) === true
}

export class ArcGisRestClient {
  /** Full URL to the FeatureServer layer, e.g. `…/FeatureServer/0`. */
  private readonly layerUrl: string

  constructor(layerUrl: string) {
    this.layerUrl = layerUrl.replace(/\/+$/, "")
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.layerUrl}${path}`, {
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      throw new Error(
        `ArcGIS request failed: ${res.status} ${res.statusText}`
      )
    }
    return res.json() as Promise<T>
  }

  /** Fetch a single page of GeoJSON features. */
  query(q?: ArcGisQuery): Promise<FeatureCollection> {
    return this.get<FeatureCollection>(`/query${buildQuery(q)}`)
  }

  /**
   * Fetch every feature, following Esri's offset paging until the server stops
   * setting `exceededTransferLimit`. `pageSize` is the per-request cap;
   * `maxPages` bounds the loop so a huge layer (OSE PODs is hundreds of
   * thousands of rows) can't spin forever. Any caller offset/count in `q` is
   * overridden by the pager.
   */
  async getAllFeatures(
    q?: ArcGisQuery,
    pageSize = 2000,
    maxPages = 200
  ): Promise<FeatureCollection> {
    const all: Feature[] = []
    let resultOffset = 0

    for (let page = 0; page < maxPages; page++) {
      const fc = await this.query({
        ...q,
        resultOffset,
        resultRecordCount: pageSize,
      })
      const batch = fc.features ?? []
      all.push(...batch)

      // Stop when the server signals no overflow, or it short-paged us.
      if (!exceeded(fc) || batch.length < pageSize) break
      resultOffset += pageSize
    }

    return { type: "FeatureCollection", features: all }
  }

  /** Total feature count for a query (honors where + bbox). -1 if unavailable. */
  async getCount(q?: ArcGisQuery): Promise<number> {
    const params = new URLSearchParams()
    params.set("f", "json")
    params.set("where", q?.where ?? "1=1")
    params.set("returnCountOnly", "true")
    if (q?.bbox) applyBbox(params, q.bbox)
    try {
      const data = await this.get<{ count?: number }>(`/query?${params.toString()}`)
      return typeof data.count === "number" ? data.count : -1
    } catch {
      return -1
    }
  }

  /**
   * Fetch every feature, fanning the offset pages out concurrently instead of
   * walking them one at a time. A statewide layer like OSE PODs is ~140 pages
   * at the service's 2000-row cap; serial paging means 140 sequential round
   * trips. We ask for the count once, then run the pages with a bounded
   * concurrency so wall-clock is ~ceil(pages / concurrency) round trips.
   *
   * Falls back to serial `getAllFeatures` when the server won't return a count.
   * `maxFeatures` caps the work so an unexpectedly huge layer can't run away.
   */
  async getAllFeaturesParallel(
    q?: ArcGisQuery,
    pageSize = 2000,
    concurrency = 6,
    maxFeatures = 500_000
  ): Promise<FeatureCollection> {
    const total = await this.getCount(q)
    if (total < 0) return this.getAllFeatures(q, pageSize)
    if (total === 0) return { type: "FeatureCollection", features: [] }

    const capped = Math.min(total, maxFeatures)
    const offsets: number[] = []
    for (let o = 0; o < capped; o += pageSize) offsets.push(o)

    const pages: Feature[][] = new Array(offsets.length)
    let next = 0
    const worker = async () => {
      for (let i = next++; i < offsets.length; i = next++) {
        const fc = await this.query({
          ...q,
          resultOffset: offsets[i],
          resultRecordCount: pageSize,
        })
        pages[i] = fc.features ?? []
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, offsets.length) }, worker)
    )

    return { type: "FeatureCollection", features: pages.flat() }
  }

  /** Fetch a single feature by its ObjectID. */
  async getFeature(
    objectId: number | string,
    objectIdField = "objectid"
  ): Promise<Feature | undefined> {
    const fc = await this.query({ where: `${objectIdField}=${objectId}` })
    return fc.features?.[0]
  }
}

// One protocol, but each OSE service lives at its own FeatureServer URL. Cache
// one client per layer URL so layers stay config-only — no per-source code.
const clientCache = new Map<string, ArcGisRestClient>()

export function arcgisClient(layerUrl: string): ArcGisRestClient {
  let client = clientCache.get(layerUrl)
  if (!client) {
    client = new ArcGisRestClient(layerUrl)
    clientCache.set(layerUrl, client)
  }
  return client
}
