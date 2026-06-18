import * as React from "react"
import {
  Map as MapLibreMap,
  NavigationControl,
  ScaleControl,
  type MapProps as MapLibreMapProps,
  type MapRef,
} from "react-map-gl/maplibre"

import "maplibre-gl/dist/maplibre-gl.css"

import { cn } from "@/lib/utils"

/**
 * Token-free open basemap (CARTO Positron). Requires no API key, which fits
 * public, no-key Data Services apps. Override via the `mapStyle` prop.
 */
export const DEFAULT_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

/** Rough bounding box of New Mexico — sensible default extent. */
export const NEW_MEXICO_VIEW = {
  longitude: -106.1,
  latitude: 34.4,
  zoom: 5.5,
} as const

export type MapProps = MapLibreMapProps & {
  /** Container className. The MapLibre canvas fills this box. */
  className?: string
  /** Show the zoom/compass control (default: true). */
  showNavigation?: boolean
  /** Show the scale bar (default: true). */
  showScale?: boolean
  /** Corner for the built-in controls (default: "top-right"). */
  controlPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

/**
 * Map — thin wrapper over react-map-gl's MapLibre map with a token-free
 * basemap, New Mexico default extent, and nav/scale controls. Pass layers,
 * markers, popups, and other react-map-gl children directly.
 */
const Map = React.forwardRef<MapRef, MapProps>(function Map(
  {
    className,
    children,
    showNavigation = true,
    showScale = true,
    controlPosition = "top-right",
    mapStyle = DEFAULT_MAP_STYLE,
    initialViewState,
    ...props
  },
  ref
) {
  return (
    <div
      data-slot="map"
      className={cn("relative h-full w-full overflow-hidden", className)}
    >
      <MapLibreMap
        ref={ref}
        mapStyle={mapStyle}
        initialViewState={initialViewState ?? NEW_MEXICO_VIEW}
        style={{ width: "100%", height: "100%" }}
        {...props}
      >
        {showNavigation && <NavigationControl position={controlPosition} />}
        {showScale && <ScaleControl position="bottom-left" />}
        {children}
      </MapLibreMap>
    </div>
  )
})

export { Map }

// Re-export the react-map-gl/maplibre primitives consumers need so they can
// build layers without a direct react-map-gl dependency.
export {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  GeolocateControl,
  useMap,
  type MapRef,
  type LayerProps,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre"
