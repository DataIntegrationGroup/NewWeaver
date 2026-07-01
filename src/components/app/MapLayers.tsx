import { useEffect, useMemo } from "react"
import type { FeatureCollection } from "geojson"

import { Source, Layer } from "@/components/ui/map"
import type { LayerProps } from "@/components/ui/map"
import {
  type LayerConfig,
  type StaLayer,
  type FeaturesLayer,
  type ArcGisLayer,
  type WfsLayer,
} from "@/catalog/layers"
import {
  useStaLayer,
  useFeaturesLayer,
  useArcGisLayer,
  useWfsLayer,
} from "@/hooks/useLayerData"
import { filterFeatures, matchesText, matchesValues, type FeatureFilters } from "@/lib/filterFeatures"

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
 * `override` — from the layer's settings popover — wins when given, letting a
 * color-mapped layer (e.g. Monitoring Recency) turn clustering on/off so its
 * categorical colors stay visible at the point level.
 */
export function isClustered(layer: LayerConfig, override?: boolean): boolean {
  if (override !== undefined) return override
  return layer.source === "arcgis" ? layer.cluster !== false : layer.cluster === true
}

/**
 * MapLibre layer ids that should receive pointer interaction for a catalog
 * layer: its feature layer, plus the cluster-circle layer when clustered (so a
 * click can expand the cluster).
 */
export function interactiveLayerIdsFor(layer: LayerConfig, clusterOverride?: boolean): string[] {
  return isClustered(layer, clusterOverride)
    ? [renderLayerId(layer), clusterLayerId(layer)]
    : [renderLayerId(layer)]
}

interface LayerProps2 {
  layer: LayerConfig
  filters: FeatureFilters
  selectedFeatureId?: string
  /** Layer opacity 0–1 (default 1). */
  opacity?: number
  /** Whether the layer is drawn (default true). Hidden via its on-map chip. */
  visible?: boolean
  /** Hide features where trend_category === "not enough data". */
  hideNoData?: boolean
  /** Per-layer free-text match against attribute values (settings popover). */
  attributeQuery?: string
  /** Selected values for the layer's facet (`layer.facet.field`); empty/undefined = all. */
  facetValues?: string[]
  /** Override the layer's default clustering (settings popover). */
  clusterOverride?: boolean
  /** Override the layer's point color. */
  colorOverride?: string
  /** Reports the filtered feature count after rendering. */
  onCount?: (id: string, count: number) => void
}

type Paint = Record<string, unknown>

/** Scale a paint's opacity channels by `opacity` (no-op at 1). */
function withOpacity(paint: Paint, type: string, opacity: number): Paint {
  if (opacity >= 1) return paint
  const num = (v: unknown) => (typeof v === "number" ? v : 1)
  const p = { ...paint }
  if (type === "fill") {
    p["fill-opacity"] = num(paint["fill-opacity"]) * opacity
  } else if (type === "line") {
    p["line-opacity"] = num(paint["line-opacity"]) * opacity
  } else {
    p["circle-opacity"] = num(paint["circle-opacity"]) * opacity
    p["circle-stroke-opacity"] = num(paint["circle-stroke-opacity"]) * opacity
  }
  return p
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
  opacity = 1,
  visible = true,
  attributeQuery,
  facetValues,
  clusterOverride,
  colorOverride,
  onCount,
}: {
  layer: LayerConfig
  fc: FeatureCollection
  selectedFeatureId?: string
  opacity?: number
  visible?: boolean
  attributeQuery?: string
  facetValues?: string[]
  clusterOverride?: boolean
  colorOverride?: string
  onCount?: (id: string, count: number) => void
}) {
  const facetField = layer.facet?.field
  const facetKey = facetValues?.join(",")
  const filteredFc = useMemo(() => {
    let out = fc
    if (attributeQuery) {
      out = { ...out, features: out.features.filter((f) => matchesText(f, attributeQuery)) }
    }
    if (facetField && facetValues && facetValues.length > 0) {
      out = { ...out, features: out.features.filter((f) => matchesValues(f, facetField, facetValues)) }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps -- facetValues compared via facetKey, not identity
  }, [fc, attributeQuery, facetField, facetKey])
  const count = filteredFc.features.length
  useEffect(() => {
    onCount?.(layer.id, count)
  }, [onCount, layer.id, count])

  const basePaint = colorOverride
    ? { ...(layer.style.paint ?? {}), "circle-color": colorOverride }
    : (layer.style.paint ?? {})
  const paint = withOpacity(basePaint, layer.style.type, opacity)
  // MapLibre layout visibility: hides the layer (no draw, no clicks) while
  // keeping the source loaded, so its chip and count survive a hide toggle.
  const vis = visible === false ? "none" : "visible"

  const clustered = isClustered(layer, clusterOverride)
  // react-map-gl's <Source> only calls setData() when props change on an
  // existing geojson source — `cluster`/`clusterRadius` are frozen at first
  // creation and silently ignored after that. Keying on `clustered` forces a
  // full unmount/remount (removeSource → addSource) so toggling the
  // clustering switch actually takes effect on the map.
  if (!clustered) {
    return (
      <Source key={`${layer.id}:flat`} id={layer.id} type="geojson" data={filteredFc}>
        <Layer
          {...({
            id: renderLayerId(layer),
            type: layer.style.type,
            paint,
            layout: { ...(layer.style.layout ?? {}), visibility: vis },
          } as unknown as LayerProps)}
        />
        {highlightLayer(layer.id, selectedFeatureId)}
      </Source>
    )
  }

  const rawColor = paint["circle-color"]
  const color = colorOverride ?? (typeof rawColor === "string" ? rawColor : "#6b7280")
  return (
    <Source
      key={`${layer.id}:clustered`}
      {...({
        id: layer.id,
        type: "geojson",
        data: filteredFc,
        cluster: true,
        // maxzoom must exceed clusterMaxZoom, or MapLibre warns on every tile.
        maxzoom: (layer.clusterMaxZoom ?? 18) + 1,
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
          paint: withOpacity(clusterPaint(color), "circle", opacity),
          layout: { visibility: vis },
        } as unknown as LayerProps)}
      />
      {/* Individual (unclustered) points — the interactive feature layer. */}
      <Layer
        {...({
          id: renderLayerId(layer),
          type: "circle",
          filter: ["!", ["has", "point_count"]],
          paint,
          layout: { visibility: vis },
        } as unknown as LayerProps)}
      />
      {highlightLayer(layer.id, selectedFeatureId)}
    </Source>
  )
}

function StaSource({ layer, filters, ...rest }: { layer: StaLayer } & Omit<LayerProps2, "layer">) {
  const { data } = useStaLayer(layer)
  const fc = useMemo(() => (data ? filterFeatures(data, filters) : undefined), [data, filters])
  if (!fc) return null
  return <GeoSource layer={layer} fc={fc} {...rest} />
}

function FeaturesSource({ layer, filters, ...rest }: { layer: FeaturesLayer } & Omit<LayerProps2, "layer">) {
  const { data } = useFeaturesLayer(layer)
  const fc = useMemo(() => (data ? filterFeatures(data, filters) : undefined), [data, filters])
  if (!fc) return null
  return <GeoSource layer={layer} fc={fc} {...rest} />
}

function ArcGisSource({ layer, filters, ...rest }: { layer: ArcGisLayer } & Omit<LayerProps2, "layer">) {
  const { data } = useArcGisLayer(layer)
  const fc = useMemo(() => (data ? filterFeatures(data, filters) : undefined), [data, filters])
  if (!fc) return null
  return <GeoSource layer={layer} fc={fc} {...rest} />
}

function WfsSource({ layer, filters, hideNoData, ...rest }: { layer: WfsLayer } & Omit<LayerProps2, "layer">) {
  // useWfsLayer already applies layer.mapProperties, so `data` here is the
  // same transformed shape the table and inspect panel see.
  const { data } = useWfsLayer(layer)
  const fc = useMemo(() => {
    if (!data) return undefined
    let out = filterFeatures(data, filters)
    if (hideNoData) {
      out = { ...out, features: out.features.filter((f) => f.properties?.trend_category !== "not enough data") }
    }
    return out
  }, [data, filters, hideNoData])
  if (!fc) return null
  return <GeoSource layer={layer} fc={fc} {...rest} />
}

/** Render a single catalog layer, dispatching on its source. */
export function CatalogLayer({ layer, ...rest }: LayerProps2) {
  if (layer.source === "sta") return <StaSource layer={layer} {...rest} />
  if (layer.source === "arcgis") return <ArcGisSource layer={layer} {...rest} />
  if (layer.source === "wfs") return <WfsSource layer={layer} {...rest} />
  return <FeaturesSource layer={layer} {...rest} />
}
