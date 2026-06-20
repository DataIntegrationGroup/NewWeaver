import type { BasemapOption } from "@/components/ui/basemap-selector"

/**
 * Token-free basemaps (CARTO GL styles) — no API key, fitting a public site.
 * The `id` is the MapLibre style URL applied to the map.
 */
export const BASEMAPS: BasemapOption[] = [
  {
    id: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    title: "Light",
  },
  {
    id: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    title: "Voyager",
  },
  {
    id: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    title: "Dark",
  },
  {
    // Esri World Imagery + transparent reference overlays (roads, place
    // labels) — a token-free hybrid. No hosted GL style exists, so the basemap
    // is an inline raster style; overlay layers draw on top of the imagery.
    id: "satellite-esri",
    title: "Satellite",
    style: {
      version: 8,
      sources: {
        "esri-world-imagery": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution:
            "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        },
        "esri-transportation": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
        },
        "esri-places": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
        },
      },
      layers: [
        { id: "esri-world-imagery", type: "raster", source: "esri-world-imagery" },
        { id: "esri-places", type: "raster", source: "esri-places" },
        { id: "esri-transportation", type: "raster", source: "esri-transportation" },
      ],
    },
  },
]

export const DEFAULT_BASEMAP = BASEMAPS[0].id
