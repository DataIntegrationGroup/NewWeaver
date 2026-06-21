/**
 * SensorThingsClient — thin typed client for the OGC SensorThings API (STA)
 * served by FROST. Backs monitoring-point layers and time-series charts.
 *
 * Only the entities v1 needs are modeled: Things, Locations, Datastreams,
 * Observations. Paging follows STA's @iot.nextLink; $expand/$filter/$select
 * are passed through as query options.
 */
import { STA_BASE_URL } from "@/config"

export interface StaEntity {
  "@iot.id": number | string
  "@iot.selfLink"?: string
}

export interface Location extends StaEntity {
  name: string
  description?: string
  encodingType: string
  /** GeoJSON geometry (typically Point) in EPSG:4326. */
  location: GeoJSON.Geometry
}

export interface Thing extends StaEntity {
  name: string
  description?: string
  properties?: Record<string, unknown>
  Locations?: Location[]
  Datastreams?: Datastream[]
}

export interface UnitOfMeasurement {
  name: string
  symbol: string
  definition?: string
}

export interface Datastream extends StaEntity {
  name: string
  description?: string
  observationType?: string
  unitOfMeasurement: UnitOfMeasurement
  phenomenonTime?: string
  resultTime?: string
  Thing?: Thing
}

export interface Observation extends StaEntity {
  phenomenonTime: string
  result: number | string
  resultTime?: string | null
}

/** STA collection envelope: { value: [...], @iot.nextLink?: string }. */
export interface StaCollection<T> {
  value: T[]
  "@iot.count"?: number
  "@iot.nextLink"?: string
}

export interface StaQuery {
  $filter?: string
  $expand?: string
  $select?: string
  $orderby?: string
  $top?: number
  $skip?: number
  $count?: boolean
}

function buildQuery(q?: StaQuery): string {
  if (!q) return ""
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null) params.set(k, String(v))
  }
  const s = params.toString()
  return s ? `?${s}` : ""
}

export class SensorThingsClient {
  private readonly baseUrl: string

  constructor(baseUrl: string = STA_BASE_URL) {
    this.baseUrl = baseUrl
  }

  /** GET an absolute or base-relative URL, returning parsed JSON. */
  private async get<T>(url: string): Promise<T> {
    const full = url.startsWith("http") ? url : `${this.baseUrl}${url}`
    const res = await fetch(full, { headers: { Accept: "application/json" } })
    if (!res.ok) {
      throw new Error(`STA request failed: ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }

  /** List entities of a collection (e.g. "Locations", "Datastreams"). */
  listCollection<T>(
    entity: string,
    query?: StaQuery
  ): Promise<StaCollection<T>> {
    return this.get<StaCollection<T>>(`/${entity}${buildQuery(query)}`)
  }

  /** Follow a @iot.nextLink to fetch the next page. */
  nextPage<T>(nextLink: string): Promise<StaCollection<T>> {
    return this.get<StaCollection<T>>(nextLink)
  }

  listLocations(query?: StaQuery) {
    return this.listCollection<Location>("Locations", query)
  }

  listThings(query?: StaQuery) {
    return this.listCollection<Thing>("Things", query)
  }

  /** Datastreams for a Thing. */
  datastreamsForThing(thingId: number | string, query?: StaQuery) {
    return this.get<StaCollection<Datastream>>(
      `/Things(${thingId})/Datastreams${buildQuery(query)}`
    )
  }

  /**
   * Things at a Location, each expanded with its Datastreams. Carries Thing
   * `properties` (well metadata) the inspect panel displays.
   */
  async thingsForLocation(locationId: number | string): Promise<Thing[]> {
    const res = await this.get<StaCollection<Thing>>(
      `/Locations(${locationId})/Things?$expand=Datastreams`
    )
    return res.value
  }

  /**
   * Datastreams available at a Location, flattened across its Things.
   * (Locations(id)/Things expanded with their Datastreams.)
   */
  async datastreamsForLocation(
    locationId: number | string
  ): Promise<Datastream[]> {
    return (await this.thingsForLocation(locationId)).flatMap(
      (t) => t.Datastreams ?? []
    )
  }

  /** Observations for a Datastream, default newest-first. */
  observationsForDatastream(datastreamId: number | string, query?: StaQuery) {
    return this.get<StaCollection<Observation>>(
      `/Datastreams(${datastreamId})/Observations${buildQuery({
        $orderby: "phenomenonTime desc",
        ...query,
      })}`
    )
  }

  /**
   * All observations for a Datastream, following @iot.nextLink until the
   * series is exhausted or `cap` is reached. Used by exports, which need the
   * full range rather than a single page.
   */
  async observationsPaged(
    datastreamId: number | string,
    query?: StaQuery,
    cap = 50_000
  ): Promise<Observation[]> {
    let page = await this.observationsForDatastream(datastreamId, query)
    const out: Observation[] = [...page.value]
    while (page["@iot.nextLink"] && out.length < cap) {
      page = await this.nextPage<Observation>(page["@iot.nextLink"])
      out.push(...page.value)
    }
    return out.length > cap ? out.slice(0, cap) : out
  }

  /** The single most-recent observation for a Datastream, if any. */
  async latestObservation(
    datastreamId: number | string
  ): Promise<Observation | undefined> {
    const res = await this.observationsForDatastream(datastreamId, {
      $top: 1,
      $orderby: "phenomenonTime desc",
    })
    return res.value[0]
  }
}

/** Default client (primary FROST). */
export const sta = new SensorThingsClient()

// STA is one protocol but data may live on more than one FROST server
// (e.g. CABQ on st2). Cache one client per base URL so layers can target the
// right server without growing source-specific code.
const clientCache = new Map<string, SensorThingsClient>([[STA_BASE_URL, sta]])

export function staClient(baseUrl: string = STA_BASE_URL): SensorThingsClient {
  let client = clientCache.get(baseUrl)
  if (!client) {
    client = new SensorThingsClient(baseUrl)
    clientCache.set(baseUrl, client)
  }
  return client
}
