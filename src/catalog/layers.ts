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
import { STA_ST2_BASE_URL } from "@/config"

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

function staPoint(color: string): LayerStyle {
  return { ...pointStyle, paint: { ...pointStyle.paint, "circle-color": color } }
}

/**
 * Agencies served by the st2 FROST server, each filtered by
 * `properties/agency`. Counts are approximate location totals at time of
 * wiring. CABQ is on by default; the rest start hidden to avoid clutter.
 */
const ST2_AGENCIES: { code: string; title: string; color: string }[] = [
  { code: "CABQ", title: "City of Albuquerque (CABQ)", color: "#d97706" },
  { code: "BernCo", title: "Bernalillo County", color: "#047857" },
  { code: "OSE", title: "NM Office of the State Engineer", color: "#0891b2" },
  { code: "OSE-Roswell", title: "OSE — Roswell District", color: "#0e7490" },
  { code: "SanAcaciaReach", title: "San Acacia Reach", color: "#7c3aed" },
  { code: "PVACD", title: "Pecos Valley ACD", color: "#db2777" },
  { code: "EBWPC", title: "EBWPC", color: "#ea580c" },
  { code: "EBID", title: "Elephant Butte Irrigation District", color: "#65a30d" },
  { code: "CityOfRoswell", title: "City of Roswell", color: "#c026d3" },
]

const st2AgencyLayers: StaLayer[] = ST2_AGENCIES.map((a) => ({
  id: `st2-${a.code.toLowerCase()}`,
  title: a.title,
  description: `${a.title} monitoring locations from the st2 FROST server (agency=${a.code}).`,
  source: "sta",
  staBaseUrl: STA_ST2_BASE_URL,
  defaultVisible: a.code === "CABQ",
  query: { $filter: `properties/agency eq '${a.code}'`, $top: 2000 },
  style: staPoint(a.color),
}))

export const LAYER_CATALOG: LayerConfig[] = [
  {
    id: "monitoring-locations",
    title: "Monitoring locations",
    description: "Water-level monitoring points from FROST (SensorThings).",
    source: "sta",
    defaultVisible: true,
    query: { $top: 1000 },
    style: staPoint("#1d4ed8"),
  },
  ...st2AgencyLayers,
  {
    id: "water-levels-summary",
    title: "Water-levels summary",
    description: "Integrated water-level statistics computed by DIE.",
    source: "features",
    collectionId: "water_levels_summary",
    style: staPoint("#047857"),
  },
  {
    id: "latest-tds",
    title: "Latest TDS",
    description: "Latest total dissolved solids, computed by DIE.",
    source: "features",
    collectionId: "latest_tds",
    style: staPoint("#dc2626"),
  },
]

export function getLayer(id: string): LayerConfig | undefined {
  return LAYER_CATALOG.find((l) => l.id === id)
}
