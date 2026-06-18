import { Source, Layer } from "@/components/ui/map"
import type { LayerProps } from "@/components/ui/map"
import {
  type LayerConfig,
  type StaLayer,
  type FeaturesLayer,
} from "@/catalog/layers"
import { useStaLayer, useFeaturesLayer } from "@/hooks/useLayerData"

/**
 * STA monitoring points as a GeoJSON source.
 *
 * Clustering is disabled for now — points render individually. MapLibre's
 * built-in clustering (plan §9.5) can be re-enabled later by setting
 * `cluster` on the Source and adding cluster/count layers.
 */
function StaSource({ layer }: { layer: StaLayer }) {
  const { data } = useStaLayer(layer)
  if (!data) return null

  return (
    <Source id={layer.id} type="geojson" data={data}>
      <Layer
        {...({
          id: `${layer.id}-points`,
          type: "circle",
          paint: layer.style.paint ?? {},
        } as unknown as LayerProps)}
      />
    </Source>
  )
}

/** Vector / integrated features from OGC API Features as a GeoJSON source. */
function FeaturesSource({ layer }: { layer: FeaturesLayer }) {
  const { data } = useFeaturesLayer(layer)
  if (!data) return null

  return (
    <Source id={layer.id} type="geojson" data={data}>
      <Layer
        {...({
          id: `${layer.id}-render`,
          type: layer.style.type,
          paint: layer.style.paint ?? {},
          layout: layer.style.layout ?? {},
        } as unknown as LayerProps)}
      />
    </Source>
  )
}

/** Render a single catalog layer, dispatching on its source. */
export function CatalogLayer({ layer }: { layer: LayerConfig }) {
  return layer.source === "sta" ? (
    <StaSource layer={layer} />
  ) : (
    <FeaturesSource layer={layer} />
  )
}
