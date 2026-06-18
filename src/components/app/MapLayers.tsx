import { Source, Layer } from "@/components/ui/map"
import type { LayerProps } from "@/components/ui/map"
import {
  type LayerConfig,
  type StaLayer,
  type FeaturesLayer,
} from "@/catalog/layers"
import { useStaLayer, useFeaturesLayer } from "@/hooks/useLayerData"
import { filterFeatures, type FeatureFilters } from "@/lib/filterFeatures"

/** Render-layer id (the MapLibre layer that receives clicks) for a catalog layer. */
export function renderLayerId(layer: LayerConfig): string {
  return layer.source === "sta" ? `${layer.id}-points` : `${layer.id}-render`
}

interface LayerProps2 {
  layer: LayerConfig
  filters: FeatureFilters
  selectedFeatureId?: string
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

function StaSource({ layer, filters, selectedFeatureId }: { layer: StaLayer } & Omit<LayerProps2, "layer">) {
  const { data } = useStaLayer(layer)
  if (!data) return null
  const fc = filterFeatures(data, filters)

  return (
    <Source id={layer.id} type="geojson" data={fc}>
      <Layer
        {...({
          id: renderLayerId(layer),
          type: "circle",
          paint: layer.style.paint ?? {},
        } as unknown as LayerProps)}
      />
      {highlightLayer(layer.id, selectedFeatureId)}
    </Source>
  )
}

function FeaturesSource({ layer, filters, selectedFeatureId }: { layer: FeaturesLayer } & Omit<LayerProps2, "layer">) {
  const { data } = useFeaturesLayer(layer)
  if (!data) return null
  const fc = filterFeatures(data, filters)

  return (
    <Source id={layer.id} type="geojson" data={fc}>
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

/** Render a single catalog layer, dispatching on its source. */
export function CatalogLayer({ layer, filters, selectedFeatureId }: LayerProps2) {
  return layer.source === "sta" ? (
    <StaSource layer={layer} filters={filters} selectedFeatureId={selectedFeatureId} />
  ) : (
    <FeaturesSource layer={layer} filters={filters} selectedFeatureId={selectedFeatureId} />
  )
}
