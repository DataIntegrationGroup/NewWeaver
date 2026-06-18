/**
 * Layer catalog — the config-driven registry of what the app displays. Each
 * entry says where its data comes from (OGC API Features or STA) and how to
 * draw it. Adding a dataset = adding an entry here, not writing code.
 *
 * v1 scope (weaver-replacement-plan §9.3): manual + continuous water-level
 * measurements, water-levels summary, latest_tds. The exact DIE collection
 * ids and STA filters are locked in Phase 0 — values below are placeholders.
 */
import type { ItemsQuery } from "@/clients/ogcFeatures"
import type { StaQuery } from "@/clients/sensorThings"
import { STA_CABQ_BASE_URL } from "@/config"

/** MapLibre paint/layout for a vector layer, kept loose at the catalog level. */
export interface LayerStyle {
  type: "circle" | "fill" | "line" | "symbol"
  paint?: Record<string, unknown>
  layout?: Record<string, unknown>
}

interface BaseLayer {
  id: string
  title: string
  description?: string
  /** Shown in the catalog/toggle list; off by default unless true. */
  defaultVisible?: boolean
  style: LayerStyle
}

/** Vector / integrated layer read from DIE's OGC API Features. */
export interface FeaturesLayer extends BaseLayer {
  source: "features"
  /** DIE pygeoapi collection id. */
  collectionId: string
  query?: ItemsQuery
}

/** Monitoring-point layer read from STA Locations. */
export interface StaLayer extends BaseLayer {
  source: "sta"
  /** STA server base URL. Defaults to the primary FROST when omitted. */
  staBaseUrl?: string
  /** STA query selecting the locations/things for this layer. */
  query?: StaQuery
}

export type LayerConfig = FeaturesLayer | StaLayer

const pointStyle: LayerStyle = {
  type: "circle",
  paint: {
    "circle-radius": 5,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#ffffff",
  },
}

export const LAYER_CATALOG: LayerConfig[] = [
  {
    id: "monitoring-locations",
    title: "Monitoring locations",
    description: "Water-level monitoring points from FROST (SensorThings).",
    source: "sta",
    defaultVisible: true,
    query: { $top: 1000 },
    style: { ...pointStyle, paint: { ...pointStyle.paint, "circle-color": "#1d4ed8" } },
  },
  {
    id: "cabq-wells",
    title: "CABQ groundwater wells",
    description:
      "City of Albuquerque monitoring wells (groundwater levels/elevations), from the st2 FROST server.",
    source: "sta",
    staBaseUrl: STA_CABQ_BASE_URL,
    defaultVisible: true,
    query: { $filter: "properties/agency eq 'CABQ'", $top: 1000 },
    style: { ...pointStyle, paint: { ...pointStyle.paint, "circle-color": "#d97706" } },
  },
  {
    id: "water-levels-summary",
    title: "Water-levels summary",
    description: "Integrated water-level statistics computed by DIE.",
    source: "features",
    collectionId: "water_levels_summary",
    style: { ...pointStyle, paint: { ...pointStyle.paint, "circle-color": "#86911A" } },
  },
  {
    id: "latest-tds",
    title: "Latest TDS",
    description: "Latest total dissolved solids, computed by DIE.",
    source: "features",
    collectionId: "latest_tds",
    style: { ...pointStyle, paint: { ...pointStyle.paint, "circle-color": "#C04034" } },
  },
]

export function getLayer(id: string): LayerConfig | undefined {
  return LAYER_CATALOG.find((l) => l.id === id)
}
