import { useMemo } from "react"
import type { FeatureCollection, Polygon } from "geojson"

import { pointInAnyShape } from "@/lib/geo"
import { Source, Layer } from "@/components/ui/map"
import type { LayerProps } from "@/components/ui/map"
import type { LayerConfig } from "@/catalog/layers"

/** Render-layer id (the MapLibre layer that receives feature clicks) for a layer. */
export function renderLayerId(layer: LayerConfig): string {
  return `${layer.id}-render`
}

function highlightLayer(id: string, selectedFeatureId?: string) {
  if (!selectedFeatureId) return null
  return (
    <Layer
      {...({
        id: `${id}-highlight`,
        type: "circle",
        filter: ["==", ["to-string", ["get", "id"]], selectedFeatureId],
        paint: {
          "circle-radius": 9,
          "circle-color": "transparent",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#111827",
        },
      } as unknown as LayerProps)}
    />
  )
}

/**
 * The map dataset's sites, already filtered by AppShell, plus the selection
 * highlight. A drawn selection hides points outside it.
 */
export function DatasetSource({
  layer,
  fc,
  shapes,
  selectedFeatureId,
}: {
  layer: LayerConfig
  fc: FeatureCollection
  shapes?: Polygon[]
  selectedFeatureId?: string
}) {
  // Key on geometry, not identity/length, so dragging a vertex (same count)
  // still recomputes the clip.
  const shapesKey = shapes?.length ? JSON.stringify(shapes.map((s) => s.coordinates)) : ""
  const clipped = useMemo(
    () =>
      shapes?.length
        ? { ...fc, features: fc.features.filter((f) => pointInAnyShape(f, shapes)) }
        : fc,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shapes compared via shapesKey
    [fc, shapesKey]
  )
  return (
    <Source id={layer.id} type="geojson" data={clipped}>
      <Layer
        {...({
          id: renderLayerId(layer),
          type: layer.style.type,
          paint: layer.style.paint ?? {},
          layout: layer.style.layout ?? {},
        } as unknown as LayerProps)}
      />
      {highlightLayer(layer.id, selectedFeatureId)}
    </Source>
  )
}
