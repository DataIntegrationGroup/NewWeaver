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
import { OCOTILLO_FEATURES_BASE_URL, STA_ST2_BASE_URL } from "@/config"

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
  /** Group heading in the layer list. Layers without a section list first. */
  section?: string
  style: LayerStyle
}

/** Vector / integrated layer read from DIE's OGC API Features. */
export interface FeaturesLayer extends BaseLayer {
  source: "features"
  /** pygeoapi collection id. */
  collectionId: string
  /** OGC API Features base URL. Defaults to the primary DIE pygeoapi. */
  featuresBaseUrl?: string
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
  section: "STA",
  style: staPoint(a.color),
}))

/**
 * Ocotillo — New Mexico water-data collections served from a second pygeoapi
 * (OCOTILLO_FEATURES_BASE_URL). Each entry maps 1:1 to an OGC API Features
 * collection. All start hidden to avoid clutter; users toggle them on from the
 * "New Mexico Water Data (Ocotillo)" section of the layer list.
 */
const OCOTILLO_SECTION = "Ocotillo"

const OCOTILLO_COLLECTIONS: {
  id: string
  title: string
  description?: string
  color: string
  /** Geometry kind; defaults to point. Polygon collections draw as fill. */
  geom?: "point" | "polygon"
}[] = [
  { id: "locations", title: "Locations", color: "#2563eb", description: "All monitoring locations." },
  { id: "actively_monitored_wells", title: "Actively Monitored Wells", color: "#1d4ed8" },
  { id: "water_wells", title: "Water Wells", color: "#0ea5e9" },
  { id: "water_well_summary", title: "Water Well Summary", color: "#0891b2" },
  { id: "latest_depth_to_water_wells", title: "Latest Depth to Water (Wells)", color: "#0e7490" },
  { id: "depth_to_water_trend_wells", title: "Depth to Water Trend (Wells)", color: "#155e75" },
  { id: "water_elevation_wells", title: "Water Elevation (Wells)", color: "#0d9488" },
  { id: "latest_tds_wells", title: "Latest TDS (Wells)", color: "#dc2626" },
  { id: "avg_tds_wells", title: "Average TDS (Wells)", color: "#ea580c" },
  { id: "major_chemistry_results", title: "Major Chemistry (Wells)", color: "#db2777" },
  { id: "minor_chemistry_wells", title: "Minor Chemistry (Wells)", color: "#c026d3" },
  { id: "springs", title: "Springs", color: "#16a34a" },
  { id: "diversions_surface_water", title: "Surface Water Diversions", color: "#65a30d" },
  { id: "perennial_streams", title: "Perennial Streams", color: "#0284c7" },
  { id: "ephemeral_streams", title: "Ephemeral Streams", color: "#38bdf8" },
  { id: "lakes_ponds_reservoirs", title: "Lakes, Ponds, and Reservoirs", color: "#2dd4bf" },
  { id: "outfalls_wastewater_return_flow", title: "Outfalls and Return Flow", color: "#a16207" },
  { id: "meteorological_stations", title: "Meteorological Stations", color: "#7c3aed" },
  { id: "rock_sample_locations", title: "Rock Sample Locations", color: "#92400e" },
  { id: "soil_gas_sample_locations", title: "Soil Gas Sample Locations", color: "#9333ea" },
  { id: "other_things", title: "Other Thing Types", color: "#6b7280" },
  {
    id: "project_areas",
    title: "Project Areas",
    color: "#7c3aed",
    geom: "polygon",
  },
]

const polygonStyle = (color: string): LayerStyle => ({
  type: "fill",
  paint: { "fill-color": color, "fill-opacity": 0.25, "fill-outline-color": color },
})

const ocotilloLayers: FeaturesLayer[] = OCOTILLO_COLLECTIONS.map((c) => ({
  id: `ocotillo-${c.id.replace(/_/g, "-")}`,
  title: c.title,
  description:
    c.description ??
    `${c.title} from the Ocotillo OGC API Features service (collection ${c.id}).`,
  source: "features",
  featuresBaseUrl: OCOTILLO_FEATURES_BASE_URL,
  collectionId: c.id,
  section: OCOTILLO_SECTION,
  style: c.geom === "polygon" ? polygonStyle(c.color) : staPoint(c.color),
}))

export const LAYER_CATALOG: LayerConfig[] = [
  ...st2AgencyLayers,
  ...ocotilloLayers,
]

/**
 * Help text for each layer-group heading, shown as a tooltip on hover. Keyed by
 * the `section` value used on the layers above.
 */
export const SECTION_DESCRIPTIONS: Record<string, string> = {
  STA: "Live monitoring locations from the SensorThings API (FROST), grouped by operating agency. Turn an agency on to map its wells, then click a point to browse its datastreams and chart the measured time series.",
  Ocotillo:
    "New Mexico water datasets from the Ocotillo OGC API Features service — water wells, springs, surface water, chemistry, and project areas. Each layer is a published collection; turn one on to load its features onto the map.",
}

export function getLayer(id: string): LayerConfig | undefined {
  return LAYER_CATALOG.find((l) => l.id === id)
}
