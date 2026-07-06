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
import { filterFeatures, matchesText, matchesValues, matchesRange, type FeatureFilters } from "@/lib/filterFeatures"

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
  /** Size points by the layer's `bubbleField` (proportional-symbol map). */
  bubble?: boolean
  /** Color points by which `rangePresets` bin their `rangeField` value falls in. */
  classify?: boolean
  /** Min/max bounds filtering features by the layer's `rangeField` value. */
  range?: [number, number]
  /** Reports the filtered feature count after rendering. */
  onCount?: (id: string, count: number) => void
}

type Paint = Record<string, unknown>

/**
 * Proportional-symbol radius: size a point by a numeric field's value. Linear
 * interpolation over breakpoints tuned for TDS (mg/L); reasonable for any
 * positive magnitude. Non-numeric/null values coalesce to the smallest dot.
 */
function bubbleRadius(field: string): unknown {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["to-number", ["get", field]], 0],
    0, 3,
    500, 6,
    2000, 10,
    5000, 16,
    15000, 26,
  ]
}

/** Presets whose bins fully define a classification color ramp (every preset
 *  carries a color). Returned sorted ascending by `min`. */
export function classifyPresets(
  layer: LayerConfig
): { label: string; min: number; max: number; color: string }[] | undefined {
  const p = layer.rangePresets
  if (!layer.rangeField || !p || p.length === 0 || !p.every((x) => x.color)) return undefined
  return [...p].sort((a, b) => a.min - b.min) as {
    label: string
    min: number
    max: number
    color: string
  }[]
}

/**
 * Data-driven `circle-color`: tint each point by which preset bin its numeric
 * `field` value falls in (a `step` over the bin edges). Missing/null values
 * draw grey. Assumes contiguous, ascending bins (as `classifyPresets` returns).
 */
function classifyColor(
  field: string,
  presets: { min: number; color: string }[]
): unknown {
  const step: unknown[] = ["step", ["to-number", ["get", field]], presets[0].color]
  for (let i = 1; i < presets.length; i++) step.push(presets[i].min, presets[i].color)
  return ["case", ["==", ["get", field], null], "#9ca3af", step]
}

/** Scale a paint's opacity channels by `opacity` (no-op at 1). Preserves a
 *  data-driven opacity expression (e.g. the choropleth ramp) by multiplying it
 *  rather than flattening it to a constant. */
function withOpacity(paint: Paint, type: string, opacity: number): Paint {
  if (opacity >= 1) return paint
  // number → v*opacity; expression → ["*", expr, opacity]; missing → opacity.
  const scale = (v: unknown): unknown =>
    typeof v === "number"
      ? v * opacity
      : Array.isArray(v)
        ? ["*", v, opacity]
        : opacity
  const p = { ...paint }
  if (type === "fill") {
    p["fill-opacity"] = scale(paint["fill-opacity"])
  } else if (type === "line") {
    p["line-opacity"] = scale(paint["line-opacity"])
  } else {
    p["circle-opacity"] = scale(paint["circle-opacity"])
    p["circle-stroke-opacity"] = scale(paint["circle-stroke-opacity"])
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
  bubble,
  classify,
  range,
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
  bubble?: boolean
  classify?: boolean
  range?: [number, number]
  onCount?: (id: string, count: number) => void
}) {
  const facetField = layer.facet?.field
  const facetKey = facetValues?.join(",")
  const rangeField = layer.rangeField
  const rangeKey = range?.join(",")
  const filteredFc = useMemo(() => {
    let out = fc
    if (attributeQuery) {
      out = { ...out, features: out.features.filter((f) => matchesText(f, attributeQuery)) }
    }
    if (facetField && facetValues && facetValues.length > 0) {
      out = { ...out, features: out.features.filter((f) => matchesValues(f, facetField, facetValues)) }
    }
    if (rangeField && range) {
      out = { ...out, features: out.features.filter((f) => matchesRange(f, rangeField, range[0], range[1])) }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps -- facetValues/range compared via facetKey/rangeKey, not identity
  }, [fc, attributeQuery, facetField, facetKey, rangeField, rangeKey])
  const count = filteredFc.features.length
  useEffect(() => {
    onCount?.(layer.id, count)
  }, [onCount, layer.id, count])

  // Bubble map sizes points by a numeric field; it takes over circle-radius.
  const bubbleOn = !!bubble && !!layer.bubbleField
  // Classification tints each point by its rangeField bin; takes over circle-color.
  const classPresets = classify ? classifyPresets(layer) : undefined
  const classifyOn = !!classPresets
  // A color override edits the paint property that actually draws this layer —
  // fill-color for polygons (e.g. the editable choropleth), line-color for
  // lines, circle-color for points.
  const colorKey =
    layer.style.type === "fill"
      ? "fill-color"
      : layer.style.type === "line"
        ? "line-color"
        : "circle-color"
  const basePaint: Paint = {
    ...(layer.style.paint ?? {}),
    ...(colorOverride ? { [colorKey]: colorOverride } : {}),
    ...(bubbleOn ? { "circle-radius": bubbleRadius(layer.bubbleField!) } : {}),
    // Classification wins over a single-color override for the point fill.
    ...(classifyOn
      ? { "circle-color": classifyColor(layer.rangeField!, classPresets!) }
      : {}),
  }
  const paint = withOpacity(basePaint, layer.style.type, opacity)
  // MapLibre layout visibility: hides the layer (no draw, no clicks) while
  // keeping the source loaded, so its chip and count survive a hide toggle.
  const vis = visible === false ? "none" : "visible"

  // Clustering aggregates points, which hides per-point magnitude — so a
  // bubble map is drawn unclustered even if clustering is otherwise on.
  const clustered = isClustered(layer, clusterOverride) && !bubbleOn && !classifyOn
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
