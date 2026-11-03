/**
 * Resolve what the user has selected for export. Mirrors the attribute table
 * (src/components/app/AttributeTable.tsx): apply the active filters, then — when
 * the user has drawn shapes — RESTRICT to points inside those shapes. A drawn
 * shape narrows the selection to its interior; it does not widen it. With no
 * shapes the selection is exactly the filtered/visible set (see
 * features/export/design.md). Takes the same filtered features the map and
 * table show, so nothing is filtered or fetched twice.
 */
import type { Feature, Polygon } from "geojson"

import type { LayerConfig, StaLayer } from "@/catalog/layers"
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
 * Resolve the export selection across the given layers' filtered features.
 * Drawn shapes restrict them to their interior; with no shapes it is exactly
 * the filtered/visible set.
 */
export function resolveSelection(
  sources: { layer: LayerConfig; features: Feature[] }[],
  shapes: Polygon[]
): Selection {
  const locations: SelectedLocation[] = []
  const features: SelectedFeature[] = []
  let filteredCount = 0
  let drawnCount = 0

  for (const { layer, features: filtered } of sources) {
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
