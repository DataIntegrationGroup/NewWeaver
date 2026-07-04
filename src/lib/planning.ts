/**
 * Regional water-planning decision support — data access and aggregation.
 *
 * Pulls the "Integrated data products" WFS layers (per-well summaries published
 * from NM Water Data's GeoServer) live for a set of region polygons, then rolls
 * them up into the summary statistics a regional water manager needs: how much
 * is monitored, how water levels sit against their historical range, which way
 * the trend points, depletion risk, seasonal swing, and drinking-water quality.
 *
 * The page reads this data straight from the WFS API (bbox-filtered, then
 * point-in-polygon refined) — it never depends on the map page's cached layers
 * or the nightly precomputed stats file, keeping the client-only constraint.
 */
import type { Feature, FeatureCollection, Polygon } from "geojson"
import { GEOSERVER_WFS_BASE_URL } from "@/config"
import { wfsClient } from "@/clients/wfsClient"
import { pointInAnyShape } from "@/lib/geo"
import { polygonsBbox } from "@/lib/regions"

/** WFS typeNames of the integrated data products this page summarises. */
export const PLANNING_TYPENAMES = {
  status: "die:nm_waterlevel_status",
  trends: "die:nm_waterlevel_trends",
  depletion: "die:nm_depletion_projection",
  recency: "die:nm_monitoring_recency",
  amplitude: "die:nm_seasonal_amplitude",
  mcl: "die:nm_mcl_exceedance",
} as const

/** Per-observation water-level series (one row per reading), keyed by well id. */
export const TIMESERIES_TYPENAME = "die:nm_waterlevels_timeseries"

export type PlanningDataset = keyof typeof PLANNING_TYPENAMES

export interface RegionWaterData {
  status: Feature[]
  trends: Feature[]
  depletion: Feature[]
  recency: Feature[]
  amplitude: Feature[]
  mcl: Feature[]
}

const EMPTY: RegionWaterData = {
  status: [],
  trends: [],
  depletion: [],
  recency: [],
  amplitude: [],
  mcl: [],
}

/**
 * Fetch every planning dataset within the region polygons. Each layer is first
 * narrowed to the polygons' combined bounding box on the server (WFS `bbox`),
 * then refined client-side to the points that actually fall inside a polygon.
 * `onProgress` reports datasets completed (0–6) so the UI can show a progress
 * bar while the six requests run in parallel.
 */
export async function fetchRegionWaterData(
  polygons: Polygon[],
  onProgress?: (done: number, total: number) => void
): Promise<RegionWaterData> {
  const bbox = polygonsBbox(polygons)
  if (!bbox) return EMPTY

  const client = wfsClient(GEOSERVER_WFS_BASE_URL)
  const names = Object.values(PLANNING_TYPENAMES)
  const total = names.length
  let done = 0

  const load = async (typeName: string): Promise<Feature[]> => {
    const fc = await client.getAllFeatures(typeName, { bbox })
    const inside = fc.features.filter((f) => pointInAnyShape(f, polygons))
    done += 1
    onProgress?.(done, total)
    return inside
  }

  const [status, trends, depletion, recency, amplitude, mcl] = await Promise.all([
    load(PLANNING_TYPENAMES.status),
    load(PLANNING_TYPENAMES.trends),
    load(PLANNING_TYPENAMES.depletion),
    load(PLANNING_TYPENAMES.recency),
    load(PLANNING_TYPENAMES.amplitude),
    load(PLANNING_TYPENAMES.mcl),
  ])
  return { status, trends, depletion, recency, amplitude, mcl }
}

/** Dataset keys in a RegionWaterData, for iterating merges/summaries. */
const DATASET_KEYS = Object.keys(EMPTY) as (keyof RegionWaterData)[]

/**
 * Merge per-region water data into one dataset, deduping features by well id
 * within each product (a well on a shared boundary can appear in two regions).
 * Fetching + point-in-polygon happens per region and is cached, so toggling one
 * region only fetches that region; this merge recombines cached parts cheaply.
 */
export function mergeRegionWaterData(parts: RegionWaterData[]): RegionWaterData {
  if (parts.length === 1) return parts[0]
  const out: RegionWaterData = {
    status: [],
    trends: [],
    depletion: [],
    recency: [],
    amplitude: [],
    mcl: [],
  }
  for (const key of DATASET_KEYS) {
    const seen = new Set<string>()
    for (const part of parts) {
      for (const f of part[key]) {
        const id = String(f.properties?.id ?? f.id ?? "")
        if (id) {
          if (seen.has(id)) continue
          seen.add(id)
        }
        out[key].push(f)
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Tally a string property across features, keeping insertion order for known
 *  keys and dropping empties. */
function tally(features: Feature[], key: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const f of features) {
    const v = f.properties?.[key]
    if (v == null || v === "") continue
    const s = String(v)
    out.set(s, (out.get(s) ?? 0) + 1)
  }
  return out
}

/** The five percentile classes, worst→best, plus the insufficient-data bucket.
 *  Colors match the Water Level Status map layer's legend. */
export const STATUS_CLASSES: { key: string; label: string; color: string }[] = [
  { key: "much below normal", label: "Much below normal", color: "#b91c1c" },
  { key: "below normal", label: "Below normal", color: "#f97316" },
  { key: "normal", label: "Normal", color: "#16a34a" },
  { key: "above normal", label: "Above normal", color: "#38bdf8" },
  { key: "much above normal", label: "Much above normal", color: "#1e40af" },
  { key: "insufficient", label: "Insufficient data", color: "#9ca3af" },
]

export const TREND_CLASSES: { key: string; label: string; color: string }[] = [
  { key: "increasing", label: "Deepening (level falling)", color: "#dc2626" },
  { key: "decreasing", label: "Rising (level recovering)", color: "#16a34a" },
  { key: "stable", label: "Stable", color: "#6b7280" },
]

export interface Distribution {
  label: string
  color: string
  count: number
}

/** Neutral fill for a monitored well with no water-level status classification. */
export const WELL_UNKNOWN_COLOR = "#64748b"

/** Concern categories a well can belong to — the map-toggle buttons on the
 *  matching KPI cards filter the well points to these memberships. */
export type WellCategory = "below" | "above" | "deplete" | "mcl" | "series"

function idsWhere(features: Feature[], pred: (p: Record<string, unknown>) => boolean): Set<string> {
  const out = new Set<string>()
  for (const f of features) {
    const p = (f.properties ?? {}) as Record<string, unknown>
    const id = p.id ?? f.id
    if (id != null && pred(p)) out.add(String(id))
  }
  return out
}

/**
 * Every monitored well in the region as a point, deduped by id across the
 * datasets and tagged with its water-level `status` (percentile class) where
 * one exists, plus boolean membership flags (`below`/`deplete`/`mcl`) so the
 * map can filter to a specific concern. Feeds the map so a manager sees *where*
 * the wells are, not just the roll-up counts.
 */
export function wellPoints(data: RegionWaterData): FeatureCollection {
  const statusById = new Map<string, string>()
  for (const f of data.status) {
    const id = f.properties?.id ?? f.id
    const s = f.properties?.status
    if (id != null && typeof s === "string") statusById.set(String(id), s)
  }

  // Id sets for each toggleable concern (mirror the KPI-card definitions).
  const belowIds = idsWhere(
    data.status,
    (p) => p.status === "below normal" || p.status === "much below normal"
  )
  const aboveIds = idsWhere(
    data.status,
    (p) => p.status === "above normal" || p.status === "much above normal"
  )
  const depleteIds = idsWhere(data.depletion, (p) => p.status === "projected")
  const mclIds = idsWhere(data.mcl, (p) => p.any_exceedance === true)
  // Wells with a hydrograph (more than one reading) — see wellsWithSeries.
  const seriesIds = new Set(wellsWithSeries(data).map((r) => r.id))

  const seen = new Set<string>()
  const features: Feature[] = []
  // Status features first so their geometry/status win; then fill in wells that
  // only appear in the other products.
  for (const set of [data.status, data.recency, data.trends, data.depletion, data.amplitude, data.mcl]) {
    for (const f of set) {
      if (!f.geometry || f.geometry.type !== "Point") continue
      const id = String(f.properties?.id ?? f.id ?? "")
      if (!id || seen.has(id)) continue
      seen.add(id)
      features.push({
        type: "Feature",
        geometry: f.geometry,
        properties: {
          id,
          name: f.properties?.name ?? "",
          status: statusById.get(id) ?? "unknown",
          below: belowIds.has(id),
          above: aboveIds.has(id),
          deplete: depleteIds.has(id),
          mcl: mclIds.has(id),
          series: seriesIds.has(id),
        },
      })
    }
  }
  return { type: "FeatureCollection", features }
}

/** Filter well points to those in any of the active concern categories. An
 *  empty set means "no filter" — return every well. */
export function filterWells(
  wells: FeatureCollection,
  active: Set<WellCategory>
): FeatureCollection {
  if (active.size === 0) return wells
  return {
    type: "FeatureCollection",
    features: wells.features.filter((f) => {
      const p = f.properties ?? {}
      return [...active].some((cat) => p[cat] === true)
    }),
  }
}

// ---------------------------------------------------------------------------
// Water-level records / hydrographs
// ---------------------------------------------------------------------------

export interface WellSeriesRow {
  id: string
  name: string
  /** Number of water-level readings on record. */
  count: number
  source?: string
  latestDtw?: number
}

/**
 * Wells in the region with more than one water-level reading — the candidates
 * for a hydrograph. Built from the summary products (which already carry a
 * reading count per well), deduped by id and sorted by record count desc.
 */
export function wellsWithSeries(data: RegionWaterData): WellSeriesRow[] {
  const rows = new Map<string, WellSeriesRow>()
  // Status carries record_count + latest_dtw; recency/trends backfill wells the
  // status product doesn't cover. Keep the largest count seen for each well.
  for (const set of [data.status, data.recency, data.trends]) {
    for (const f of set) {
      const p = (f.properties ?? {}) as Record<string, unknown>
      const id = String(p.id ?? f.id ?? "")
      if (!id) continue
      // observation_count is the raw reading count (closest to the hydrograph's
      // length); record_count is a coarser fallback.
      const count = num(p.observation_count) ?? num(p.record_count) ?? 0
      if (count <= 1) continue
      const existing = rows.get(id)
      if (existing && existing.count >= count) continue
      rows.set(id, {
        id,
        name: String(p.name ?? existing?.name ?? ""),
        count,
        source: (p.source as string) ?? existing?.source,
        latestDtw: num(p.latest_dtw) ?? existing?.latestDtw,
      })
    }
  }
  return [...rows.values()].sort((a, b) => b.count - a.count)
}

export interface SeriesPoint {
  /** ISO datetime of the reading. */
  t: string
  /** Depth to water below ground surface (ft). */
  v: number
}

export interface WellSeries {
  points: SeriesPoint[]
  units: string
}

/**
 * Fetch one well's full water-level time series from the WFS timeseries layer,
 * filtered by well id and ordered oldest→newest. Live from the API.
 */
export async function fetchWellSeries(id: string): Promise<WellSeries> {
  const client = wfsClient(GEOSERVER_WFS_BASE_URL)
  const escaped = id.replace(/'/g, "''")
  const fc = await client.getAllFeatures(
    TIMESERIES_TYPENAME,
    { cqlFilter: `id='${escaped}'` },
    5000,
    40
  )
  let units = "ft"
  const points: SeriesPoint[] = []
  for (const f of fc.features) {
    const p = (f.properties ?? {}) as Record<string, unknown>
    const t = String(p.datetime ?? "")
    const v = num(p.parameter_value)
    if (p.parameter_units) units = String(p.parameter_units)
    if (t && v !== undefined) points.push({ t, v })
  }
  points.sort((a, b) => a.t.localeCompare(b.t))
  return { points, units }
}

/** MapLibre `circle-color` match expression coloring a well by its status. */
export function wellColorExpression(): unknown[] {
  const stops = STATUS_CLASSES.flatMap((c) => [c.key, c.color])
  return ["match", ["get", "status"], ...stops, WELL_UNKNOWN_COLOR]
}

export interface PlanningSummary {
  /** Distinct monitoring points across the datasets. */
  monitoringPoints: number
  active: number
  stale: number

  /** Water-level status against period-of-record percentiles. */
  statusDist: Distribution[]
  statusScored: number
  belowNormal: number
  aboveNormal: number

  /** Groundwater level trend direction. */
  trendDist: Distribution[]
  trendScored: number
  medianSlope: number | undefined

  /** Depletion projection. */
  depletionScored: number
  projectedToDeplete: number
  medianYearsToDepletion: number | undefined
  soonestDepletionYear: number | undefined
  exceedsWellDepth: number

  /** Seasonal amplitude (within-year swing) — median is robust to the odd
   *  bad-data outlier; `amplitudeWells` is how many wells it's computed over. */
  typicalAmplitude: number | undefined
  amplitudeWells: number

  /** Drinking-water quality. */
  mclScored: number
  mclExceedances: number
}

/** Roll a region's water data into decision-support statistics. */
export function summarizeWaterData(data: RegionWaterData): PlanningSummary {
  // Monitoring points: union of well ids across the datasets (each product is a
  // per-well summary over the same well set, but coverage differs by product).
  const ids = new Set<string>()
  for (const key of Object.keys(data) as PlanningDataset[]) {
    for (const f of data[key]) {
      const id = f.properties?.id ?? f.id
      if (id != null) ids.add(String(id))
    }
  }

  const recencyStatus = tally(data.recency, "status")

  // Water-level status distribution.
  const statusTally = tally(data.status, "status")
  const statusDist = STATUS_CLASSES.map((c) => ({
    label: c.label,
    color: c.color,
    count: statusTally.get(c.key) ?? 0,
  }))
  const statusScored = data.status.filter(
    (f) => f.properties?.status && f.properties.status !== "insufficient"
  ).length
  const belowNormal =
    (statusTally.get("much below normal") ?? 0) + (statusTally.get("below normal") ?? 0)
  const aboveNormal =
    (statusTally.get("much above normal") ?? 0) + (statusTally.get("above normal") ?? 0)

  // Trend distribution + median slope (ft/yr) among wells with a real trend.
  const trendTally = tally(data.trends, "trend_category")
  const trendDist = TREND_CLASSES.map((c) => ({
    label: c.label,
    color: c.color,
    count: trendTally.get(c.key) ?? 0,
  }))
  const trendScored = trendDist.reduce((a, d) => a + d.count, 0)
  const slopes = data.trends
    .filter((f) => ["increasing", "decreasing", "stable"].includes(String(f.properties?.trend_category)))
    .map((f) => num(f.properties?.slope_per_year))
    .filter((v): v is number => v !== undefined)
  const medianSlope = median(slopes)

  // Depletion projection.
  const depStatus = tally(data.depletion, "status")
  const projectedToDeplete = depStatus.get("projected") ?? 0
  const exceedsWellDepth = depStatus.get("dtw exceeds well depth") ?? 0
  const depletionScored = data.depletion.filter(
    (f) => num(f.properties?.years_to_depletion) !== undefined
  ).length
  const yearsToDepletion = data.depletion
    .map((f) => num(f.properties?.years_to_depletion))
    .filter((v): v is number => v !== undefined && v >= 0)
  // Only forward-looking projections: a "projected" year in the past means the
  // linear model already expected depletion, which isn't a useful soonest date.
  const thisYear = new Date().getFullYear()
  const projectedYears = data.depletion
    .map((f) => num(f.properties?.projected_depletion_year))
    .filter((v): v is number => v !== undefined && v >= thisYear)

  // Seasonal amplitude among wells with a computed value. Report the median —
  // the source occasionally carries an implausible outlier that would blow out
  // a mean or max.
  const amps = data.amplitude
    .filter((f) => f.properties?.status === "ok")
    .map((f) => num(f.properties?.mean_amplitude_ft))
    .filter((v): v is number => v !== undefined)

  // Drinking-water quality: features carrying an any_exceedance flag.
  const mclScored = data.mcl.filter((f) => f.properties?.any_exceedance != null).length
  const mclExceedances = data.mcl.filter((f) => f.properties?.any_exceedance === true).length

  return {
    monitoringPoints: ids.size,
    active: recencyStatus.get("active") ?? 0,
    stale: recencyStatus.get("stale") ?? 0,
    statusDist,
    statusScored,
    belowNormal,
    aboveNormal,
    trendDist,
    trendScored,
    medianSlope,
    depletionScored,
    projectedToDeplete,
    medianYearsToDepletion: median(yearsToDepletion),
    soonestDepletionYear: projectedYears.length ? Math.min(...projectedYears) : undefined,
    exceedsWellDepth,
    typicalAmplitude: median(amps),
    amplitudeWells: amps.length,
    mclScored,
    mclExceedances,
  }
}
