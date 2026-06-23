import { Fragment, useEffect, useRef, useState } from "react"
import { Layers, Maximize } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import type { Map as MaplibreMap, GeoJSONSource } from "maplibre-gl"
import type { FeatureCollection, Polygon, Position } from "geojson"
import {
  Map,
  Marker,
  Popup,
  type MapRef,
  type MapLayerMouseEvent,
} from "@/components/ui/map"
import { MapPin } from "lucide-react"
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
import {
  staLayerKey,
  featuresLayerKey,
  arcgisLayerKey,
} from "@/hooks/useLayerData"

/** Plain string cast used when a layer declares no value formatter. */
const defaultFormat = (_key: string, value: unknown) => String(value ?? "")

/** React Query cache key for a layer's GeoJSON data (mirrors the data hooks). */
function layerCacheKey(layer: LayerConfig) {
  if (layer.source === "sta") return staLayerKey(layer)
  if (layer.source === "arcgis") return arcgisLayerKey(layer)
  return featuresLayerKey(layer)
}

/** Expand a bbox to include every coordinate in a geometry's nested arrays. */
function growBbox(coords: unknown, bbox: [number, number, number, number]) {
  if (typeof (coords as number[])[0] === "number") {
    const [x, y] = coords as Position
    if (x < bbox[0]) bbox[0] = x
    if (y < bbox[1]) bbox[1] = y
    if (x > bbox[2]) bbox[2] = x
    if (y > bbox[3]) bbox[3] = y
    return
  }
  for (const c of coords as unknown[]) growBbox(c, bbox)
}
import type { Selection } from "@/lib/urlState"
import {
  CatalogLayer,
  renderLayerId,
  clusterLayerId,
  interactiveLayerIdsFor,
  isClustered,
} from "./MapLayers"
import { Skeleton } from "@/components/ui/skeleton"
import { FieldValue } from "./FieldValue"
import { ActiveLayerChips } from "./ActiveLayerChips"

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
  /** Toggle a layer off from its on-map chip. */
  onToggleLayer?: (id: string) => void
  selection?: Selection
  /** Pin dropped by the location search (SPEC §T.T3). */
  marker?: { lng: number; lat: number } | null
  /** Fit the map to a set of layers' extent (measurement facet, SPEC §T.T4). */
  fitRequest?: { ids: string[]; nonce: number }
  initialView: { longitude: number; latitude: number; zoom: number }
  /** Frame the data extent on first paint (no explicit view in the URL). */
  autoFit?: boolean
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
  onToggleLayer,
  selection,
  marker,
  fitRequest,
  initialView,
  autoFit,
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
  const queryClient = useQueryClient()
  const [mapLoaded, setMapLoaded] = useState(false)
  const [cursor, setCursor] = useState<[number, number] | null>(null)

  // Zoom to the combined extent of the loaded features. With no ids, fits all
  // visible layers; with ids, only those (used by the measurement facet, T4).
  // Returns true if it actually fit (i.e. some feature geometry was loaded).
  const fitToData = (ids?: string[]): boolean => {
    const map = mapRef.current
    if (!map) return false
    const target = ids ? layers.filter((l) => ids.includes(l.id)) : layers
    const bbox: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
    let any = false
    for (const layer of target) {
      const fc = queryClient.getQueryData<FeatureCollection>(layerCacheKey(layer))
      for (const f of fc?.features ?? []) {
        const g = f.geometry
        if (!g || g.type === "GeometryCollection") continue
        growBbox((g as { coordinates: unknown }).coordinates, bbox)
        any = true
      }
    }
    if (any && Number.isFinite(bbox[0])) {
      map.fitBounds(
        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
        { padding: 60, maxZoom: 14, duration: 600 }
      )
      return true
    }
    return false
  }

  // First-paint auto-fit: when the URL carries no explicit view, frame the data
  // across New Mexico instead of the static all-NM view (SPEC §V.V5). Fires once,
  // after the map is ready and the enabled layers' features have loaded. A user
  // pan or a shared deep-link (autoFit=false) is never overridden.
  const didAutoFit = useRef(false)
  const tryAutoFit = () => {
    if (!autoFit || didAutoFit.current || !mapLoaded) return
    if (fitToData()) didAutoFit.current = true
  }

  // Facet fit (SPEC §T.T4): when a measurement category is chosen, frame just
  // its layers. Their data may still be loading, so the request is held and
  // retried as those layers' features land (handleLayerCount), then cleared.
  const pendingFit = useRef<string[] | null>(null)
  const tryPendingFit = () => {
    if (!pendingFit.current || !mapLoaded) return
    if (fitToData(pendingFit.current)) pendingFit.current = null
  }
  useEffect(() => {
    if (fitRequest?.ids?.length) {
      pendingFit.current = fitRequest.ids
      tryPendingFit()
    }
    // Only react to a new request (nonce), not to identity churn of the array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequest?.nonce])

  // A layer reporting its count means its features just landed in the cache —
  // a good moment to attempt the first-paint fit and any pending facet fit.
  const handleLayerCount = (id: string, count: number) => {
    onLayerCount?.(id, count)
    tryAutoFit()
    tryPendingFit()
  }
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
    setCursor([e.lngLat.lng, e.lngLat.lat])
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

  // Any deliberate navigation (user drag/zoom, or a programmatic fly-to) cancels
  // a pending first-paint auto-fit, so a late-loading layer can never yank the
  // view out from under a view the user already chose. The auto-fit's own
  // fitBounds is exempt: it sets didAutoFit before animating, so by the time its
  // moveEnd lands the flag is already true.
  const handleMoveEnd = () => {
    if (autoFit) didAutoFit.current = true
    emitMove()
  }

  // Test seam: deterministic map ops for the BDD harness (avoids driving the
  // WebGL canvas directly). Harmless in production.
  const handleLoad = () => {
    const map = mapRef.current
    if (!map) return
    setMapLoaded(true)
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
    // Features may already be cached before the map finished loading; attempt
    // the first-paint fit now that the map is ready.
    if (autoFit && !didAutoFit.current && fitToData()) didAutoFit.current = true
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
        onMouseLeave={() => {
          setHoverInfo(null)
          setCursor(null)
        }}
        onLoad={handleLoad}
        onMoveEnd={handleMoveEnd}
      >
        {marker && (
          <Marker longitude={marker.lng} latitude={marker.lat} anchor="bottom">
            <MapPin
              className="size-7 fill-primary text-primary-foreground drop-shadow"
              data-testid="search-marker"
            />
          </Marker>
        )}
        {layers.map((layer) => (
          <CatalogLayer
            key={layer.id}
            layer={layer}
            filters={filters}
            opacity={opacityById?.[layer.id] ?? 1}
            onCount={handleLayerCount}
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
          className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center"
        >
          <div className="pointer-events-auto max-w-sm rounded-lg border bg-card/95 px-4 py-3 text-center text-sm shadow-md backdrop-blur">
            <p className="font-medium text-foreground">No features match your filter</p>
            <p className="mt-0.5 text-muted-foreground">
              Nothing in the visible layers matches “{emptyFilterQuery}”.
            </p>
          </div>
        </div>
      )}

      {!mapLoaded && (
        <Skeleton
          data-testid="map-skeleton"
          className="absolute inset-0 z-20 rounded-none"
        />
      )}

      {onToggleLayer && (
        <ActiveLayerChips layers={layers} onRemove={onToggleLayer} />
      )}

      <div className="absolute left-2 top-2 z-10 flex flex-col gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Choose basemap"
              title="Choose basemap"
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

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Zoom to data"
          title="Zoom to the visible layers"
          data-testid="fit-to-data"
          onClick={() => fitToData()}
        >
          <Maximize />
        </Button>

        <DrawControls map={drawMap} onShapesChange={onShapesChange} />
      </div>

      {cursor && (
        <div
          data-testid="cursor-coords"
          className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded border bg-card/90 px-2 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground shadow-sm backdrop-blur"
        >
          {cursor[1].toFixed(4)}, {cursor[0].toFixed(4)}
        </div>
      )}
    </div>
  )
}
