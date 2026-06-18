import { useRef } from "react"
import { Layers } from "lucide-react"
import {
  Map,
  type MapRef,
  type MapLayerMouseEvent,
} from "@/components/ui/map"
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
import { CatalogLayer, renderLayerId } from "./MapLayers"

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
}: MapViewProps) {
  const mapRef = useRef<MapRef | null>(null)
  const interactiveLayerIds = layers.map(renderLayerId)

  const handleClick = (e: MapLayerMouseEvent) => {
    const hit = e.features?.[0]
    if (!hit) {
      onClearSelection()
      return
    }
    const layer = layers.find((l) => renderLayerId(l) === hit.layer?.id)
    if (!layer) return
    const featureId = String(hit.id ?? hit.properties?.id ?? "")
    onSelect({ layerId: layer.id, featureId })
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
        mapStyle={basemap}
        initialViewState={initialView}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleClick}
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
      </Map>

      <div className="absolute left-2 top-2 z-10">
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
      </div>
    </div>
  )
}
