import type { Feature, FeatureCollection, Polygon } from "geojson"
import { firstPosition, pointInAnyShape } from "@/lib/geo"

export interface FeatureFilters {
  /** Free-text match against attribute values. */
  q?: string
  /** When true, keep only features whose geometry falls inside `bounds`. */
  bbox?: boolean
  /** [west, south, east, north] current map extent. */
  bounds?: [number, number, number, number]
  /**
   * Selected region(s) of interest (county/PWS/basin) — when present, keep
   * only features inside at least one of them. Restrictive (unlike a manual
   * drawn shape, which widens the export selection additively — lib/selection.ts).
   */
  regionPolygons?: Polygon[]
}

// Building the lowercase, space-joined attribute blob is the expensive part
// of a text filter (every property of every feature, stringified). Cache it
// per feature so re-filtering on a new/narrowed query — the debounced text
// box fires on every keystroke pause — doesn't re-stringify unchanged data.
const searchTextCache = new WeakMap<Feature, string>()

function searchableText(f: Feature): string {
  const cached = searchTextCache.get(f)
  if (cached !== undefined) return cached
  const props = f.properties ?? {}
  const text = Object.values(props)
    .map((v) => String(v ?? ""))
    .join(" ")
    .toLowerCase()
  searchTextCache.set(f, text)
  return text
}

export function matchesText(f: Feature, q: string): boolean {
  return searchableText(f).includes(q.toLowerCase())
}

/** True if `field`'s value is one of `values` (empty selection = match all). */
export function matchesValues(f: Feature, field: string, values: string[]): boolean {
  if (values.length === 0) return true
  return values.includes(String(f.properties?.[field]))
}

/** True if `field`'s numeric value falls within [min, max]. Features whose
 *  value is missing or non-numeric are excluded — a value filter keeps only
 *  points with a value in range. */
export function matchesRange(
  f: Feature,
  field: string,
  min: number,
  max: number
): boolean {
  const n = Number(f.properties?.[field])
  return Number.isFinite(n) && n >= min && n <= max
}

function inBounds(
  f: Feature,
  [w, s, e, n]: [number, number, number, number]
): boolean {
  const p = firstPosition(f)
  if (!p) return true
  const [lng, lat] = p
  return lng >= w && lng <= e && lat >= s && lat <= n
}

/** Apply text + spatial filters to a FeatureCollection. */
export function filterFeatures(
  fc: FeatureCollection,
  filters: FeatureFilters
): FeatureCollection {
  let features = fc.features
  if (filters.q) features = features.filter((f) => matchesText(f, filters.q!))
  if (filters.bbox && filters.bounds) {
    const b = filters.bounds
    features = features.filter((f) => inBounds(f, b))
  }
  if (filters.regionPolygons && filters.regionPolygons.length > 0) {
    const polys = filters.regionPolygons
    features = features.filter((f) => pointInAnyShape(f, polys))
  }
  return { type: "FeatureCollection", features }
}
