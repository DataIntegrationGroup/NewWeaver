/**
 * Resolve what the user has selected for export. The selection is the union of
 *   - filtered points: features from visible layers passing the active filters
 *   - drawn points: features whose point falls inside any drawn shape
 * (see features/export/design.md). Reads the same cached FeatureCollections the
 * map renders, via the React Query client, so no data is fetched twice.
 */
import type { QueryClient } from "@tanstack/react-query"
import type { Feature, FeatureCollection, Polygon, Position } from "geojson"

import type { LayerConfig, StaLayer } from "@/catalog/layers"
import { staLayerKey, featuresLayerKey, arcgisLayerKey } from "@/hooks/useLayerData"
import { filterFeatures, type FeatureFilters } from "@/lib/filterFeatures"

/** A monitoring location chosen for export (STA source). */
export interface SelectedLocation {
  layerId: string
  staBaseUrl?: string
  id: string
  name: string
  longitude?: number
  latitude?: number
  properties: Record<string, unknown>
}

/** A vector feature chosen for export (OGC API Features source). */
export interface SelectedFeature {
  layerId: string
  feature: Feature
}

export interface Selection {
  locations: SelectedLocation[]
  features: SelectedFeature[]
  counts: { filtered: number; drawn: number; total: number }
}

/** First [lng, lat] of a feature, regardless of geometry nesting. */
function firstPosition(f: Feature): Position | undefined {
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

function pointInAnyShape(f: Feature, shapes: Polygon[]): boolean {
  const p = firstPosition(f)
  if (!p) return false
  return shapes.some((s) => pointInPolygon(p, s))
}

const featureId = (f: Feature): string => String(f.id ?? f.properties?.id ?? "")

function toSelectedLocation(f: Feature, layer: StaLayer): SelectedLocation {
  const p = firstPosition(f)
  const props = f.properties ?? {}
  return {
    layerId: layer.id,
    staBaseUrl: layer.staBaseUrl,
    id: String(props.id ?? f.id ?? ""),
    name: (props.name as string) ?? `Location ${props.id ?? ""}`,
    longitude: p?.[0],
    latitude: p?.[1],
    properties: props,
  }
}

/**
 * Resolve the export selection across the given (visible) layers. Drawn shapes
 * widen the set beyond the filtered points; with no shapes it is exactly the
 * filtered/visible set.
 */
export function resolveSelection(
  layers: LayerConfig[],
  filters: FeatureFilters,
  shapes: Polygon[],
  queryClient: QueryClient
): Selection {
  const locations: SelectedLocation[] = []
  const features: SelectedFeature[] = []
  let filteredCount = 0
  let drawnOnlyCount = 0

  for (const layer of layers) {
    const key =
      layer.source === "sta"
        ? staLayerKey(layer)
        : layer.source === "arcgis"
          ? arcgisLayerKey(layer)
          : featuresLayerKey(layer)
    const fc = queryClient.getQueryData<FeatureCollection>(key)
    if (!fc) continue

    const filtered = filterFeatures(fc, filters).features
    const filteredIds = new Set(filtered.map(featureId))

    // Drawn points that the filter didn't already include.
    const drawnExtra = shapes.length
      ? fc.features.filter(
          (f) => !filteredIds.has(featureId(f)) && pointInAnyShape(f, shapes)
        )
      : []

    filteredCount += filtered.length
    drawnOnlyCount += drawnExtra.length

    const chosen = [...filtered, ...drawnExtra]
    if (layer.source === "sta") {
      for (const f of chosen) locations.push(toSelectedLocation(f, layer))
    } else {
      for (const f of chosen) features.push({ layerId: layer.id, feature: f })
    }
  }

  return {
    locations,
    features,
    counts: {
      filtered: filteredCount,
      drawn: drawnOnlyCount,
      total: filteredCount + drawnOnlyCount,
    },
  }
}
