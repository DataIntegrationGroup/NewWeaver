import type { Feature, FeatureCollection, Position } from "geojson"

export interface FeatureFilters {
  /** Free-text match against attribute values. */
  q?: string
  /** When true, keep only features whose geometry falls inside `bounds`. */
  bbox?: boolean
  /** [west, south, east, north] current map extent. */
  bounds?: [number, number, number, number]
}

function firstPosition(f: Feature): Position | undefined {
  const g = f.geometry
  if (!g || g.type === "GeometryCollection") return undefined
  const c = (g as { coordinates: unknown }).coordinates
  // Walk to the first [lng, lat] pair regardless of geometry depth.
  let cur: unknown = c
  while (Array.isArray(cur) && Array.isArray(cur[0])) cur = cur[0]
  return Array.isArray(cur) ? (cur as Position) : undefined
}

function matchesText(f: Feature, q: string): boolean {
  const needle = q.toLowerCase()
  const props = f.properties ?? {}
  return Object.values(props).some((v) =>
    String(v ?? "").toLowerCase().includes(needle)
  )
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
  return { type: "FeatureCollection", features }
}
