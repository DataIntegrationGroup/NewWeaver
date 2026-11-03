/**
 * Location coverage — given a searched point, summarise what monitoring data
 * exists nearby in the loaded sites (SPEC §T.T3 / §V.V3). Computes counts and
 * the nearest point within a
 * radius so the UI can answer both "here's what we have" and, crucially,
 * "nothing monitored here".
 */
import type { Feature, Position } from "geojson"

/** Default coverage radius: ~8 km (5 mi) around the searched point. */
export const COVERAGE_RADIUS_KM = 8

export interface LayerCoverage {
  layerId: string
  title: string
  /** Count of this layer's features within the radius. */
  count: number
  /** Distance (km) to the nearest feature of this layer, or null if none. */
  nearestKm: number | null
}

export interface Coverage {
  /** Per-layer breakdown, only layers with ≥1 nearby feature. */
  layers: LayerCoverage[]
  /** Total nearby features across all layers. */
  total: number
}

/** A set of sites to count, e.g. the map's dataset. */
export interface CoverageSource {
  id: string
  title: string
  features: Feature[]
}

/** Haversine great-circle distance in km. */
function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** First coordinate pair of any geometry (point, or first vertex of a line/poly). */
function firstCoord(coords: unknown): [number, number] | null {
  if (!Array.isArray(coords)) return null
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    return [coords[0], coords[1]]
  }
  return firstCoord((coords as Position[])[0])
}

/** Summarise nearby data for a point across the given sources. */
export function nearbyCoverage(
  point: [number, number],
  sources: CoverageSource[],
  radiusKm = COVERAGE_RADIUS_KM
): Coverage {
  const out: LayerCoverage[] = []
  let total = 0

  for (const source of sources) {
    let count = 0
    let nearestKm: number | null = null
    for (const f of source.features) {
      const g = f.geometry
      if (!g || g.type === "GeometryCollection") continue
      const coord = firstCoord((g as { coordinates: unknown }).coordinates)
      if (!coord) continue
      const d = distanceKm(point, coord)
      if (d <= radiusKm) {
        count++
        if (nearestKm === null || d < nearestKm) nearestKm = d
      }
    }
    if (count > 0) {
      out.push({ layerId: source.id, title: source.title, count, nearestKm })
      total += count
    }
  }

  out.sort((a, b) => (a.nearestKm ?? Infinity) - (b.nearestKm ?? Infinity))
  return { layers: out, total }
}
