import { Fragment, useRef, useState } from "react"
import { Layers } from "lucide-react"
import type { Map as MaplibreMap, GeoJSONSource } from "maplibre-gl"
import type { Polygon } from "geojson"
import {
  Map,
  Popup,
  type MapRef,
  type MapLayerMouseEvent,
} from "@/components/ui/map"
import { DrawControls } from "./DrawControls"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  BasemapSelector,
  type BasemapOption,
} from "@/components/ui/basemap-selector"

import type { LayerConfig } from "@/catalog/layers"
import type { FeatureFilters } from "@/lib/filterFeatures"
import { selectFields, type FieldDisplay } from "@/lib/fields"

/** Plain string cast used when a layer declares no value formatter. */
const defaultFormat = (_key: string, value: unknown) => String(value ?? "")
import type { Selection } from "@/lib/urlState"
import {
  CatalogLayer,
  renderLayerId,
  clusterLayerId,
  interactiveLayerIdsFor,
  isClustered,
} from "./MapLayers"
import { FieldValue } from "./FieldValue"

interface MapViewProps {
  /** Optional external ref so the parent can drive the map (e.g. fly-to). */
  mapRef?: React.RefObject<MapRef | null>
  layers: LayerConfig[]
  filters: FeatureFilters
  /** Layer id → opacity (0–1). */
  opacityById?: Record<string, number>
  /** Reports a layer's filtered feature count (for the empty-filter state). */
  onLayerCount?: (id: string, count: number) => void
  /** When set, the active text filter matched no features — show an empty card. */
  emptyFilterQuery?: string
  selection?: Selection
  initialView: { longitude: number; latitude: number; zoom: number }
  basemap: string
  basemaps: BasemapOption[]
  onBasemapChange: (id: string) => void
  onSelect: (sel: Selection) => void
  onClearSelection: () => void
  onMove: (lng: number, lat: number, z: number, bounds: [number, number, number, number]) => void
  onShapesChange: (shapes: Polygon[]) => void
}

/**
 * MapView — the primary surface. Renders visible catalog layers, routes map
 * clicks to feature selection, and reports view changes (extent → URL).
 */
export function MapView({
  mapRef: externalMapRef,
  layers,
  filters,
  opacityById,
  onLayerCount,
  emptyFilterQuery,
  selection,
  initialView,
  basemap,
  basemaps,
  onBasemapChange,
  onSelect,
  onClearSelection,
  onMove,
  onShapesChange,
}: MapViewProps) {
  const internalMapRef = useRef<MapRef | null>(null)
  const mapRef = externalMapRef ?? internalMapRef
  const interactiveLayerIds = layers.flatMap(interactiveLayerIdsFor)
  const clusterLayerIds = new Set(
    layers.filter(isClustered).map(clusterLayerId)
  )
  const [drawMap, setDrawMap] = useState<MaplibreMap | null>(null)

  const [hoverInfo, setHoverInfo] = useState<{
    longitude: number
    latitude: number
    name?: string
    title?: string
    color?: string
    properties: Record<string, unknown>
    fields?: FieldDisplay
    format?: (key: string, value: unknown) => string
  } | null>(null)

  // Hit-test on move: a feature under the pointer drives the hover popup and
  // the pointer cursor; empty space clears both.
  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const hit = e.features?.[0]
    // Clusters get a pointer cursor but no attribute popup.
    if (!hit || hit.properties?.cluster) {
      setHoverInfo((prev) => (prev ? null : prev))
      return
    }
    const properties = (hit.properties ?? {}) as Record<string, unknown>
    const layer = layers.find((l) => renderLayerId(l) === hit.layer?.id)
    setHoverInfo({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      name: (properties.name as string) ?? undefined,
      title: layer?.title,
      color: (layer?.style.paint?.["circle-color"] as string) ?? undefined,
      properties,
      fields: layer?.fields,
      format: layer?.formatValue,
    })
  }

  const handleClick = (e: MapLayerMouseEvent) => {
    const hit = e.features?.[0]
    if (!hit) {
      onClearSelection()
      return
    }
    // A click on a cluster zooms in until it breaks apart, rather than selecting.
    const hitLayerId = hit.layer?.id ?? ""
    if (clusterLayerIds.has(hitLayerId)) {
      expandCluster(hitLayerId, hit)
      return
    }
    const layer = layers.find((l) => renderLayerId(l) === hitLayerId)
    if (!layer) return
    // Prefer the feature's own `id` property: a clustered source reassigns the
    // MapLibre feature id to a supercluster id, so `hit.id` would not match the
    // real feature in the data (breaking the inspect panel and highlight).
    const featureId = String(hit.properties?.id ?? hit.id ?? "")
    onSelect({ layerId: layer.id, featureId })
  }

  // Zoom to the level at which a clicked cluster splits, centered on it.
  const expandCluster = (
    clusterLayer: string,
    hit: NonNullable<MapLayerMouseEvent["features"]>[number]
  ) => {
    const map = mapRef.current?.getMap()
    const sourceId = clusterLayer.replace(/-clusters$/, "")
    const source = map?.getSource(sourceId) as GeoJSONSource | undefined
    const clusterId = hit.properties?.cluster_id
    if (!map || !source || clusterId == null) return
    const geom = hit.geometry
    const center =
      geom?.type === "Point" ? (geom.coordinates as [number, number]) : undefined
    Promise.resolve(source.getClusterExpansionZoom(clusterId))
      .then((zoom) => {
        if (center) map.easeTo({ center, zoom, duration: 400 })
      })
      .catch(() => {})
  }

  const emitMove = () => {
    const map = mapRef.current
    if (!map) return
    const c = map.getCenter()
    const b = map.getBounds()
    onMove(c.lng, c.lat, map.getZoom(), [
      b.getWest(),
      b.getSouth(),
      b.getEast(),
      b.getNorth(),
    ])
  }

  // Test seam: deterministic map ops for the BDD harness (avoids driving the
  // WebGL canvas directly). Harmless in production.
  const handleLoad = () => {
    const map = mapRef.current
    if (!map) return
    setDrawMap(map.getMap() as unknown as MaplibreMap)
    ;(window as unknown as { __weaverMap?: unknown }).__weaverMap = {
      getCenter: () => map.getCenter(),
      getZoom: () => map.getZoom(),
      zoomIn: () => map.zoomTo(map.getZoom() + 1, { duration: 0 }),
      jumpTo: (lng: number, lat: number, zoom: number) =>
        map.jumpTo({ center: [lng, lat], zoom }),
      panEast: () => {
        const c = map.getCenter()
        map.jumpTo({ center: [c.lng + 3, c.lat] })
      },
      queryRendered: (layerId: string) =>
        map.getLayer(layerId)
          ? map
              .queryRenderedFeatures(undefined, { layers: [layerId] })
              .map((f) => f.properties)
          : [],
      layerIds: () => map.getStyle().layers.map((l) => l.id),
    }
    emitMove()
  }

  return (
    <div
      className="relative h-full w-full"
      data-testid="map"
      role="region"
      aria-label="Interactive water-data map"
    >
      <Map
        ref={mapRef}
        mapStyle={
          basemaps.find((b) => b.id === basemap)?.style ?? basemap
        }
        initialViewState={initialView}
        interactiveLayerIds={interactiveLayerIds}
        cursor={hoverInfo ? "pointer" : undefined}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        onLoad={handleLoad}
        onMoveEnd={emitMove}
      >
        {layers.map((layer) => (
          <CatalogLayer
            key={layer.id}
            layer={layer}
            filters={filters}
            opacity={opacityById?.[layer.id] ?? 1}
            onCount={onLayerCount}
            selectedFeatureId={
              selection?.layerId === layer.id ? selection.featureId : undefined
            }
          />
        ))}

        {hoverInfo && (
          <Popup
            longitude={hoverInfo.longitude}
            latitude={hoverInfo.latitude}
            offset={12}
            closeButton={false}
            closeOnClick={false}
            maxWidth="440px"
          >
            {/* No fixed anchor: MapLibre flips the popup to whichever side keeps
                it on-screen. A tall field list scrolls within a capped height. */}
            <div
              data-testid="feature-popup"
              className="max-h-[min(60vh,20rem)] overflow-y-auto px-3 py-2.5 text-foreground"
            >
              {(hoverInfo.title || hoverInfo.name) && (
                <div className="mb-2 border-b border-border pb-2">
                  {hoverInfo.title && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ background: hoverInfo.color ?? "var(--primary)" }}
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {hoverInfo.title}
                      </span>
                    </div>
                  )}
                  {hoverInfo.name && (
                    <p className="mt-0.5 text-sm font-semibold leading-tight">
                      {hoverInfo.name}
                    </p>
                  )}
                </div>
              )}
              <dl className="grid grid-cols-[max-content_1fr] text-xs [&>*:nth-last-child(-n+2)]:border-b-0">
                {selectFields(Object.keys(hoverInfo.properties), hoverInfo.fields)
                  .filter((k) => k !== "name")
                  .map((k) => (
                    <Fragment key={k}>
                      <dt className="whitespace-nowrap border-b border-border/40 py-1 pr-4 align-top font-medium text-muted-foreground">
                        {k}
                      </dt>
                      <dd className="break-words border-b border-border/40 py-1 align-top tabular-nums">
                        <FieldValue
                          value={(hoverInfo.format ?? defaultFormat)(k, hoverInfo.properties[k])}
                        />
                      </dd>
                    </Fragment>
                  ))}
              </dl>
            </div>
          </Popup>
        )}
      </Map>

      {emptyFilterQuery && (
        <div
          data-testid="empty-filter"
          className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center"
        >
          <div className="pointer-events-auto max-w-sm rounded-lg border bg-card/95 px-4 py-3 text-center text-sm shadow-md backdrop-blur">
            <p className="font-medium text-foreground">No features match your filter</p>
            <p className="mt-0.5 text-muted-foreground">
              Nothing in the visible layers matches “{emptyFilterQuery}”.
            </p>
          </div>
        </div>
      )}

      <div className="absolute left-2 top-2 z-10 flex flex-col gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Choose basemap"
              data-testid="basemap-trigger"
            >
              <Layers />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Basemap
            </p>
            <BasemapSelector
              options={basemaps}
              value={basemap}
              onValueChange={onBasemapChange}
            />
          </PopoverContent>
        </Popover>

        <DrawControls map={drawMap} onShapesChange={onShapesChange} />
      </div>
    </div>
  )
}
