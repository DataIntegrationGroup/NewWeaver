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
]

export const DEFAULT_BASEMAP = BASEMAPS[0].id
