/**
 * OSE attribute filtering — the predicate Weaver applies to OSE Points of
 * Diversion. Ported from the original Weaver `oseFilterWorker.js`, which ran
 * these same checks off-thread against each feature's properties.
 *
 * Six independent filters, all AND-combined. An empty multi-select means "no
 * constraint" (every value passes); a range at its full default span passes
 * everything; the well-log flag is opt-in.
 */
import type { Feature, FeatureCollection } from "geojson"

export interface OseFilter {
  /** Water-right status codes (`status`), e.g. ADJ, LIC. Empty = all. */
  statuses: string[]
  /** POD status codes (`pod_status`), e.g. ACT, PLG. Empty = all. */
  podStatuses: string[]
  /** Use codes (`use_`), e.g. IRR, DOM. Empty = all. */
  useCodes: string[]
  /** Well depth window in feet (`depth_well`), [min, max]. */
  wellDepthRange: [number, number]
  /** Depth-to-water window in feet (`depth_wate`), [min, max]. */
  depthRange: [number, number]
  /** When true, keep only PODs that have a well-log file date (`log_file_d`). */
  hasWellLogFileDate: boolean
}

/** Depth sliders span 0–4000 ft in Weaver; the full span is "no constraint". */
export const OSE_DEPTH_MIN = 0
export const OSE_DEPTH_MAX = 4000

export const OSE_FILTER_DEFAULTS: OseFilter = {
  statuses: [],
  podStatuses: [],
  useCodes: [],
  wellDepthRange: [OSE_DEPTH_MIN, OSE_DEPTH_MAX],
  depthRange: [OSE_DEPTH_MIN, OSE_DEPTH_MAX],
  hasWellLogFileDate: false,
}

/** Water-right status codes the OSE publishes (`status`). */
export const OSE_STATUS_CODES = [
  "ADJ", "ADM", "APP", "APR", "CAN", "CLS", "DCL", "DED", "DEN", "EXP",
  "HS", "LIC", "NOI", "NOT", "OMS", "OOJ", "PBU", "PMT", "PRG", "REN",
  "RET", "TRN", "WMS", "WTD",
] as const

/** POD status codes (`pod_status`). */
export const OSE_POD_STATUS_CODES = ["PEN", "PLG", "CAP", "INC", "ACT"] as const

/** A range constrains only once narrowed from its full default span. */
function isActiveRange([min, max]: [number, number]): boolean {
  return min > OSE_DEPTH_MIN || max < OSE_DEPTH_MAX
}

/**
 * A numeric property within an *active* [min, max]. A full-span range is "no
 * constraint" and passes everything (including PODs missing the value); once
 * narrowed, a missing or out-of-range value is excluded.
 */
function inRange(value: unknown, range: [number, number]): boolean {
  if (!isActiveRange(range)) return true
  const n = Number(value)
  return Number.isFinite(n) && n >= range[0] && n <= range[1]
}

/** A non-empty multi-select keeps only members; an empty one keeps everything. */
function inSet(value: unknown, allowed: string[]): boolean {
  return allowed.length === 0 || allowed.includes(String(value))
}

/** True when a feature's OSE properties satisfy every active filter. */
export function matchesOseFilter(
  props: Record<string, unknown> | null | undefined,
  filter: OseFilter
): boolean {
  const p = props ?? {}
  if (!inSet(p.status, filter.statuses)) return false
  if (!inSet(p.pod_status, filter.podStatuses)) return false
  if (!inSet(p.use_, filter.useCodes)) return false
  if (!inRange(p.depth_well, filter.wellDepthRange)) return false
  if (!inRange(p.depth_wate, filter.depthRange)) return false
  if (filter.hasWellLogFileDate) {
    const log = p.log_file_d
    if (log === null || log === undefined || String(log).trim() === "") return false
  }
  return true
}

/** Filter a GeoJSON collection down to features matching the OSE filter. */
export function applyOseFilter(
  fc: FeatureCollection,
  filter: OseFilter
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.filter((f: Feature) => matchesOseFilter(f.properties, filter)),
  }
}

/** True when a filter is at its defaults (so the app can skip the work). */
export function isOseFilterEmpty(filter: OseFilter): boolean {
  return (
    filter.statuses.length === 0 &&
    filter.podStatuses.length === 0 &&
    filter.useCodes.length === 0 &&
    filter.wellDepthRange[0] <= OSE_DEPTH_MIN &&
    filter.wellDepthRange[1] >= OSE_DEPTH_MAX &&
    filter.depthRange[0] <= OSE_DEPTH_MIN &&
    filter.depthRange[1] >= OSE_DEPTH_MAX &&
    !filter.hasWellLogFileDate
  )
}
