/**
 * Resolve what the user has selected for export. Mirrors the attribute table
 * (src/components/app/AttributeTable.tsx): apply the active filters, then — when
 * the user has drawn shapes — RESTRICT to points inside those shapes. A drawn
 * shape narrows the selection to its interior; it does not widen it. With no
 * shapes the selection is exactly the filtered/visible set (see
 * features/export/design.md). Reads the same cached FeatureCollections the map
 * renders, via the React Query client, so no data is fetched twice.
 */
import type { QueryClient } from "@tanstack/react-query"
import type { Feature, FeatureCollection, Polygon } from "geojson"

import type { LayerConfig, StaLayer } from "@/catalog/layers"
import { staLayerKey, featuresLayerKey, arcgisLayerKey, wfsLayerKey } from "@/hooks/useLayerData"
import { filterFeatures, type FeatureFilters } from "@/lib/filterFeatures"
import { firstPosition, pointInAnyShape } from "@/lib/geo"

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
 * restrict the filtered set to their interior; with no shapes it is exactly the
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
  let drawnCount = 0

  for (const layer of layers) {
    const key =
      layer.source === "sta"
        ? staLayerKey(layer)
        : layer.source === "arcgis"
          ? arcgisLayerKey(layer)
          : layer.source === "wfs"
            ? wfsLayerKey(layer)
            : featuresLayerKey(layer)
    const fc = queryClient.getQueryData<FeatureCollection>(key)
    if (!fc) continue

    const filtered = filterFeatures(fc, filters).features

    // A drawn shape narrows the selection to its interior (matching the
    // attribute table). Without a shape, the filtered/visible set stands.
    const chosen = shapes.length
      ? filtered.filter((f) => pointInAnyShape(f, shapes))
      : filtered

    if (shapes.length) drawnCount += chosen.length
    else filteredCount += chosen.length

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
      drawn: drawnCount,
      total: filteredCount + drawnCount,
    },
  }
}
