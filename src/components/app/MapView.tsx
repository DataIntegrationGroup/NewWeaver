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
import type { Selection } from "@/lib/urlState"
import {
  CatalogLayer,
  renderLayerId,
  clusterLayerId,
  interactiveLayerIdsFor,
} from "./MapLayers"

interface MapViewProps {
  layers: LayerConfig[]
  filters: FeatureFilters
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
  layers,
  filters,
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
  const mapRef = useRef<MapRef | null>(null)
  const interactiveLayerIds = layers.flatMap(interactiveLayerIdsFor)
  const clusterLayerIds = new Set(
    layers.filter((l) => l.source === "arcgis").map(clusterLayerId)
  )
  const [drawMap, setDrawMap] = useState<MaplibreMap | null>(null)

  const [hoverInfo, setHoverInfo] = useState<{
    longitude: number
    latitude: number
    name?: string
    properties: Record<string, unknown>
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
    setHoverInfo({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      name: (properties.name as string) ?? undefined,
      properties,
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
    const featureId = String(hit.id ?? hit.properties?.id ?? "")
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
            selectedFeatureId={
              selection?.layerId === layer.id ? selection.featureId : undefined
            }
          />
        ))}

        {hoverInfo && (
          <Popup
            longitude={hoverInfo.longitude}
            latitude={hoverInfo.latitude}
            anchor="bottom"
            offset={12}
            closeButton={false}
            closeOnClick={false}
            className="max-w-xs"
          >
            <div data-testid="feature-popup" className="text-foreground">
              {hoverInfo.name && (
                <p className="mb-1 text-sm font-semibold leading-tight">
                  {hoverInfo.name}
                </p>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
                {Object.entries(hoverInfo.properties)
                  .filter(([k]) => k !== "name")
                  .map(([k, v]) => (
                    <Fragment key={k}>
                      <dt className="font-medium text-muted-foreground">{k}</dt>
                      <dd className="break-words">{String(v ?? "")}</dd>
                    </Fragment>
                  ))}
              </dl>
            </div>
          </Popup>
        )}
      </Map>

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
