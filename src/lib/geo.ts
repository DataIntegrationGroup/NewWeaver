/**
 * Shared point-in-polygon geometry helpers. Used by both lib/filterFeatures.ts
 * (map/table/export restriction to a region or drawn shape) and lib/selection.ts
 * (export's additive drawn-shape widening) — split out here so neither has to
 * import the other.
 */
import type { Feature, Polygon, Position } from "geojson"

/** First [lng, lat] of a feature, regardless of geometry nesting. */
export function firstPosition(f: Feature): Position | undefined {
  const g = f.geometry
  if (!g || g.type === "GeometryCollection") return undefined
  let cur: unknown = (g as { coordinates: unknown }).coordinates
  while (Array.isArray(cur) && Array.isArray(cur[0])) cur = cur[0]
  return Array.isArray(cur) ? (cur as Position) : undefined
}

/** Ray-casting point-in-ring test. */
function pointInRing([x, y]: Position, ring: Position[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Point inside a polygon = inside its outer ring and outside every hole. */
export function pointInPolygon(p: Position, poly: Polygon): boolean {
  const [outer, ...holes] = poly.coordinates
  if (!outer || !pointInRing(p, outer)) return false
  return !holes.some((hole) => pointInRing(p, hole))
}

/** True when a feature's first point falls inside any of the given polygons. */
export function pointInAnyShape(f: Feature, shapes: Polygon[]): boolean {
  const p = firstPosition(f)
  if (!p) return false
  return shapes.some((s) => pointInPolygon(p, s))
}
