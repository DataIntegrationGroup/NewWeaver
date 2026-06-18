import { Source, Layer } from "@/components/ui/map"
import type { LayerProps } from "@/components/ui/map"
import {
  type LayerConfig,
  type StaLayer,
  type FeaturesLayer,
} from "@/catalog/layers"
import { useStaLayer, useFeaturesLayer } from "@/hooks/useLayerData"

/**
 * STA monitoring points as a clustered GeoJSON source. MapLibre's built-in
 * clustering covers point density (no deck.gl needed — plan §9.5).
 */
function StaSource({ layer }: { layer: StaLayer }) {
  const { data } = useStaLayer(layer)
  if (!data) return null

  const color =
    (layer.style.paint?.["circle-color"] as string | undefined) ?? "#006E7B"

  return (
    <Source
      id={layer.id}
      type="geojson"
      data={data}
      cluster
      clusterRadius={50}
      clusterMaxZoom={12}
    >
      <Layer
        id={`${layer.id}-clusters`}
        type="circle"
        filter={["has", "point_count"]}
        paint={{
          "circle-color": color,
          "circle-opacity": 0.7,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            50,
            18,
            200,
            24,
          ],
        }}
      />
      <Layer
        id={`${layer.id}-cluster-count`}
        type="symbol"
        filter={["has", "point_count"]}
        layout={{
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        }}
        paint={{ "text-color": "#ffffff" }}
      />
      <Layer
        {...({
          id: `${layer.id}-points`,
          type: "circle",
          filter: ["!", ["has", "point_count"]],
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
