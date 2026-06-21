import type { FeatureCollection } from "geojson"

import { Source, Layer } from "@/components/ui/map"
import type { LayerProps } from "@/components/ui/map"
import {
  type LayerConfig,
  type StaLayer,
  type FeaturesLayer,
  type ArcGisLayer,
} from "@/catalog/layers"
import {
  useStaLayer,
  useFeaturesLayer,
  useArcGisLayer,
} from "@/hooks/useLayerData"
import { filterFeatures, type FeatureFilters } from "@/lib/filterFeatures"

/** Render-layer id (the MapLibre layer that receives feature clicks) for a layer. */
export function renderLayerId(layer: LayerConfig): string {
  return layer.source === "sta" ? `${layer.id}-points` : `${layer.id}-render`
}

/** MapLibre cluster-circle layer id for a clustered layer. */
export function clusterLayerId(layer: LayerConfig): string {
  return `${layer.id}-clusters`
}

/**
 * Whether a layer renders clustered. ArcGIS layers cluster by default; any
 * other layer opts in with `cluster: true` (e.g. the dense NWIS sites).
 */
export function isClustered(layer: LayerConfig): boolean {
  return layer.source === "arcgis" ? layer.cluster !== false : layer.cluster === true
}

/**
 * MapLibre layer ids that should receive pointer interaction for a catalog
 * layer: its feature layer, plus the cluster-circle layer when clustered (so a
 * click can expand the cluster).
 */
export function interactiveLayerIdsFor(layer: LayerConfig): string[] {
  return isClustered(layer)
    ? [renderLayerId(layer), clusterLayerId(layer)]
    : [renderLayerId(layer)]
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

/** Step-sized cluster bubbles, tinted with the layer color and dark-bordered. */
function clusterPaint(color: string) {
  return {
    "circle-color": color,
    "circle-opacity": 0.9,
    "circle-stroke-color": "#1f2937",
    "circle-stroke-width": 1,
    // Grow the bubble with the number of points it stands in for (Weaver steps).
    "circle-radius": [
      "step",
      ["get", "point_count"],
      3,
      2, 4.25,
      5, 4.75,
      10, 5.75,
      25, 7,
      50, 8.75,
      100, 12,
      250, 15,
      500, 20,
      1000, 25,
      10000, 35,
    ],
  }
}

/**
 * Render a GeoJSON FeatureCollection for a catalog layer — clustered (bubbles +
 * unclustered interactive points) or plain — plus the selection highlight.
 * Shared by every source so clustering is a per-layer flag, not per-source code.
 */
function GeoSource({
  layer,
  fc,
  selectedFeatureId,
}: {
  layer: LayerConfig
  fc: FeatureCollection
  selectedFeatureId?: string
}) {
  const paint = layer.style.paint ?? {}

  if (!isClustered(layer)) {
    return (
      <Source id={layer.id} type="geojson" data={fc}>
        <Layer
          {...({
            id: renderLayerId(layer),
            type: layer.style.type,
            paint,
            layout: layer.style.layout ?? {},
          } as unknown as LayerProps)}
        />
        {highlightLayer(layer.id, selectedFeatureId)}
      </Source>
    )
  }

  const color = (paint["circle-color"] as string) ?? "#1f2937"
  return (
    <Source
      {...({
        id: layer.id,
        type: "geojson",
        data: fc,
        cluster: true,
        clusterMaxZoom: layer.clusterMaxZoom ?? 18,
        clusterRadius: layer.clusterRadius ?? 4,
      } as unknown as Parameters<typeof Source>[0])}
    >
      {/* Clustered bubbles (no count label). */}
      <Layer
        {...({
          id: clusterLayerId(layer),
          type: "circle",
          filter: ["has", "point_count"],
          paint: clusterPaint(color),
        } as unknown as LayerProps)}
      />
      {/* Individual (unclustered) points — the interactive feature layer. */}
      <Layer
        {...({
          id: renderLayerId(layer),
          type: "circle",
          filter: ["!", ["has", "point_count"]],
          paint,
        } as unknown as LayerProps)}
      />
      {highlightLayer(layer.id, selectedFeatureId)}
    </Source>
  )
}

function StaSource({ layer, filters, selectedFeatureId }: { layer: StaLayer } & Omit<LayerProps2, "layer">) {
  const { data } = useStaLayer(layer)
  if (!data) return null
  return <GeoSource layer={layer} fc={filterFeatures(data, filters)} selectedFeatureId={selectedFeatureId} />
}

function FeaturesSource({ layer, filters, selectedFeatureId }: { layer: FeaturesLayer } & Omit<LayerProps2, "layer">) {
  const { data } = useFeaturesLayer(layer)
  if (!data) return null
  return <GeoSource layer={layer} fc={filterFeatures(data, filters)} selectedFeatureId={selectedFeatureId} />
}

function ArcGisSource({ layer, filters, selectedFeatureId }: { layer: ArcGisLayer } & Omit<LayerProps2, "layer">) {
  const { data } = useArcGisLayer(layer)
  if (!data) return null
  return <GeoSource layer={layer} fc={filterFeatures(data, filters)} selectedFeatureId={selectedFeatureId} />
}

/** Render a single catalog layer, dispatching on its source. */
export function CatalogLayer({ layer, filters, selectedFeatureId }: LayerProps2) {
  if (layer.source === "sta")
    return <StaSource layer={layer} filters={filters} selectedFeatureId={selectedFeatureId} />
  if (layer.source === "arcgis")
    return <ArcGisSource layer={layer} filters={filters} selectedFeatureId={selectedFeatureId} />
  return <FeaturesSource layer={layer} filters={filters} selectedFeatureId={selectedFeatureId} />
}
