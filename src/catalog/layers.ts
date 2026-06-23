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
import type { ArcGisQuery } from "@/clients/arcGisRest"
import type { FieldDisplay } from "@/lib/fields"
import { formatOseValue } from "@/lib/oseCodes"
import {
  OCOTILLO_FEATURES_BASE_URL,
  OSE_ARCGIS_BASE_URL,
  STA_ST2_BASE_URL,
  USGS_OGC_BASE_URL,
} from "@/config"

/** MapLibre paint/layout for a vector layer, kept loose at the catalog level. */
export interface LayerStyle {
  type: "circle" | "fill" | "line" | "symbol"
  paint?: Record<string, unknown>
  layout?: Record<string, unknown>
}

/**
 * What a layer measures, independent of which network produces it. Powers the
 * "browse by what's measured" facet so a researcher can enable, say, all water
 * quality data across every agency at once (SPEC §T.T4, §V.V4).
 */
export type MeasurementType =
  | "water_level"
  | "water_quality"
  | "surface_water"
  | "wells"
  | "weather"
  | "geochemistry"

interface BaseLayer {
  id: string
  title: string
  description?: string
  /** What this layer measures (for the measurement facet). */
  measurementType?: MeasurementType
  /** Shown in the catalog/toggle list; off by default unless true. */
  defaultVisible?: boolean
  /** Group heading in the layer list. Layers without a section list first. */
  section?: string
  /**
   * Which feature properties to show in the attribute table and hover popup.
   * Omit for all fields; otherwise provide an `include` or `exclude` list.
   */
  fields?: FieldDisplay
  /**
   * Display formatter for a property value (e.g. expand coded fields to a
   * human-readable label). Applied in the table, popup, and inspect panel;
   * the underlying data is unchanged. Defaults to a plain string cast.
   */
  formatValue?: (key: string, value: unknown) => string
  /**
   * Exclude from the attribute table's automatic active-layer pick. A dense,
   * default-on context layer (e.g. statewide wells seeding the first paint)
   * should not silently become the table subject and displace the agency layer
   * the table defaults to. Explicit selection still opens it (SPEC §V.V12).
   */
  excludeFromAutoTable?: boolean
  /** Cluster dense points on the map. ArcGIS layers cluster by default. */
  cluster?: boolean
  /** Cluster merge radius in px (default 4, matching Weaver). Smaller = looser. */
  clusterRadius?: number
  /** Stop clustering above this zoom (default 18, matching Weaver). */
  clusterMaxZoom?: number
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
  /**
   * Cap how many features the pager loads. Bounds open-ended time-series
   * collections (e.g. USGS continuous/daily values) so a layer can't pull
   * millions of rows. Omit to load every matching feature.
   */
  maxFeatures?: number
}

/** Monitoring-point layer read from STA Locations. */
export interface StaLayer extends BaseLayer {
  source: "sta"
  /** STA server base URL. Defaults to the primary FROST when omitted. */
  staBaseUrl?: string
  /** STA query selecting the locations/things for this layer. */
  query?: StaQuery
}

/**
 * OSE GIS layer read from an ArcGIS REST FeatureServer (Esri). Points of
 * Diversion and Aquifer Test Wells. `serviceUrl` is the full FeatureServer
 * layer URL (…/FeatureServer/0). Clusters by default — these layers are dense.
 */
export interface ArcGisLayer extends BaseLayer {
  source: "arcgis"
  /** Full FeatureServer layer URL, e.g. `…/OSE_…/FeatureServer/0`. */
  serviceUrl: string
  query?: ArcGisQuery
  /** Field carrying the stable feature id (default "objectid"). */
  idField?: string
  /**
   * Optional per-feature property transform applied after GeoJSON conversion —
   * derive computed fields (e.g. a combined PLSS string) or drop raw columns.
   * Must preserve `id`.
   */
  mapProperties?: (props: Record<string, unknown>) => Record<string, unknown>
}

export type LayerConfig = FeaturesLayer | StaLayer | ArcGisLayer

// Scatter markers carry a dark border so light-colored fills stay legible on
// the pale basemap (matches the original Weaver black point stroke).
const SCATTER_STROKE = "#1f2937"

const pointStyle: LayerStyle = {
  type: "circle",
  paint: {
    "circle-radius": 3.75,
    "circle-stroke-width": 1,
    "circle-stroke-color": SCATTER_STROKE,
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
  measurementType: "water_level",
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
  /** On by default. Statewide integrated products seed the first paint. */
  defaultVisible?: boolean
  /** Map-context only — not the table's default subject (SPEC §V.V12). */
  excludeFromAutoTable?: boolean
  /** What this collection measures (for the measurement facet, SPEC §T.T4). */
  mt?: MeasurementType
}[] = [
  { id: "locations", title: "Locations", color: "#2563eb", description: "All monitoring locations.", mt: "wells" },
  // Statewide well coverage — default-on so the first map paint shows data
  // across New Mexico, not one clustered network (SPEC §V.V5). Map-context
  // only: it must not hijack the table's default subject (SPEC §V.V12).
  { id: "actively_monitored_wells", title: "Actively Monitored Wells", color: "#1d4ed8", defaultVisible: true, excludeFromAutoTable: true, mt: "wells" },
  { id: "water_wells", title: "Water Wells", color: "#0ea5e9", mt: "wells" },
  { id: "water_well_summary", title: "Water Well Summary", color: "#0891b2", mt: "wells" },
  { id: "latest_depth_to_water_wells", title: "Latest Depth to Water (Wells)", color: "#0e7490", mt: "water_level" },
  { id: "depth_to_water_trend_wells", title: "Depth to Water Trend (Wells)", color: "#155e75", mt: "water_level" },
  { id: "water_elevation_wells", title: "Water Elevation (Wells)", color: "#0d9488", mt: "water_level" },
  { id: "latest_tds_wells", title: "Latest TDS (Wells)", color: "#dc2626", mt: "water_quality" },
  { id: "avg_tds_wells", title: "Average TDS (Wells)", color: "#ea580c", mt: "water_quality" },
  { id: "major_chemistry_results", title: "Major Chemistry (Wells)", color: "#db2777", mt: "water_quality" },
  { id: "minor_chemistry_wells", title: "Minor Chemistry (Wells)", color: "#c026d3", mt: "water_quality" },
  { id: "springs", title: "Springs", color: "#16a34a", mt: "surface_water" },
  { id: "diversions_surface_water", title: "Surface Water Diversions", color: "#65a30d", mt: "surface_water" },
  { id: "perennial_streams", title: "Perennial Streams", color: "#0284c7", mt: "surface_water" },
  { id: "ephemeral_streams", title: "Ephemeral Streams", color: "#38bdf8", mt: "surface_water" },
  { id: "lakes_ponds_reservoirs", title: "Lakes, Ponds, and Reservoirs", color: "#2dd4bf", mt: "surface_water" },
  { id: "outfalls_wastewater_return_flow", title: "Outfalls and Return Flow", color: "#a16207", mt: "surface_water" },
  { id: "meteorological_stations", title: "Meteorological Stations", color: "#7c3aed", mt: "weather" },
  { id: "rock_sample_locations", title: "Rock Sample Locations", color: "#92400e", mt: "geochemistry" },
  { id: "soil_gas_sample_locations", title: "Soil Gas Sample Locations", color: "#9333ea", mt: "geochemistry" },
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
  defaultVisible: c.defaultVisible,
  excludeFromAutoTable: c.excludeFromAutoTable,
  measurementType: c.mt,
  section: OCOTILLO_SECTION,
  style: c.geom === "polygon" ? polygonStyle(c.color) : staPoint(c.color),
}))

/**
 * OSE GIS — Office of the State Engineer datasets served as ArcGIS REST Feature
 * Services. Dense statewide point layers, so both cluster and start hidden;
 * toggling one on streams its features from the Esri endpoint. The POD layer
 * requests the attributes the OSE filter operates on (status, pod_status, use_,
 * depths, well-log date) plus its identifier.
 */
const OSE_GIS_SECTION = "OSE GIS"

const POD_OUT_FIELDS =
  "pod_file,pod_status,status,use_,depth_well,depth_wate,log_file_d,nmwrrs_wrs"

function arcgisPoint(color: string): LayerStyle {
  return {
    type: "circle",
    paint: {
      "circle-radius": 3.75,
      "circle-color": color,
      "circle-stroke-width": 1,
      "circle-stroke-color": SCATTER_STROKE,
    },
  }
}

/**
 * OSE Aquifer Test Wells store the public land survey location across seven raw
 * columns (township, range, section, and four nested quarter calls). The map
 * surfaces them as one BLM-standard legal description instead, e.g.
 * "T. 15 N., R. 19 W., Sec. 4, NW¼SW¼SE¼" — township, range, section, then the
 * aliquot parts largest-to-smallest. Quarter values arrive as "NW (1)"; the
 * parenthetical code is stripped.
 */
const AQUIFER_PLSS_FIELDS = [
  "TWS", "RNG", "SEC", "qtr_4th", "qtr_16th", "qtr_64th", "qtr_256th",
] as const

function quarterDir(v: unknown): string {
  return String(v ?? "").replace(/\s*\(\d+\)\s*$/, "").trim()
}

/** Split a township/range like "05W" into its number ("5") and direction ("W"). */
function splitTownRange(v: unknown): { num: string; dir: string } | null {
  const m = String(v ?? "").trim().match(/^0*(\d+)\s*([NSEW]?)$/i)
  return m ? { num: m[1], dir: m[2].toUpperCase() } : null
}

/** Build a BLM-standard legal description, e.g. "T. 15 N., R. 19 W., Sec. 4, NW¼SW¼SE¼". */
function aquiferPlss(p: Record<string, unknown>): string {
  const parts: string[] = []
  const t = splitTownRange(p.TWS)
  if (t) parts.push(`T. ${t.num}${t.dir ? ` ${t.dir}` : ""}.`)
  const r = splitTownRange(p.RNG)
  if (r) parts.push(`R. ${r.num}${r.dir ? ` ${r.dir}` : ""}.`)
  const sec = String(p.SEC ?? "").trim()
  if (sec) parts.push(`Sec. ${sec}`)
  // Aliquot parts largest-to-smallest, concatenated with no separators.
  const aliquot = ["qtr_4th", "qtr_16th", "qtr_64th", "qtr_256th"]
    .map((k) => quarterDir(p[k]))
    .filter(Boolean)
    .map((d) => `${d}¼`)
    .join("")
  if (aliquot) parts.push(aliquot)
  return parts.join(", ")
}

/** Collapse the raw PLSS columns into one `PLSS` field; drop the raw ones. */
function aquiferProps(p: Record<string, unknown>): Record<string, unknown> {
  const out = { ...p }
  for (const k of AQUIFER_PLSS_FIELDS) delete out[k]
  const plss = aquiferPlss(p)
  if (plss) out.PLSS = plss
  return out
}

/** Fields shown for an aquifer-test well, in order (PLSS is computed). */
const AQUIFER_DISPLAY_FIELDS = [
  "OSE_POD_ID", "ALT_WELL_NAME", "COUNTY", "BASIN", "PLSS", "Latitude", "Longitude",
  "GROUND_ELEV_FT_AMSL", "WELL_DEPTH_FT_BGL", "TOP_SCRN_FT_BGL", "BOTTOM_SCRN_FT_BGL",
  "SCREEN_LENGTH_FT", "SCREEN_DIAM_INCHES", "FORMATION_NAME", "GEOLOGIC_DESCRIPTION",
  "WELL_COMMENTS",
  "TEST_DATE", "TEST_TYPE", "TEST_TYPE_2", "PUMPING_RATE_GPM",
  "START_WATER_LEVEL_FT_BMP", "END_WATER_LEVEL_BMP", "TEST_DURATION_MINUTES",
  "RECOV_TEST_DURATION_MINUTES",
  "TRANS_DRAWDOWN_LOW_FT2PD", "TRANS_RECOVERY_LOW_FT2PD", "STORAGE_COEFF_LOW",
  "SPECIFIC_YIELD_LOW", "SPECIFIC_CAPACITY_LOW_GPM_P_FT", "H_HYDRAULIC_CONDUCT_LOW_FTPD",
  "V_HYDRAULIC_CONDUCT_LOW_FTPD", "PUMP_TEST_COMMENTS",
  "REPORT_DATE", "REFERENCE", "URL_REFERENCE", "data_verification",
]

// Request the displayed server columns plus the raw PLSS pieces (needed to
// build PLSS) and the object id (selection). PLSS itself is computed, not fetched.
const AQUIFER_OUT_FIELDS = [
  ...AQUIFER_DISPLAY_FIELDS.filter((f) => f !== "PLSS"),
  ...AQUIFER_PLSS_FIELDS,
  "objectid",
].join(",")

const oseGisLayers: ArcGisLayer[] = [
  {
    id: "ose-pods",
    title: "OSE Points of Diversion",
    description:
      "Points of Diversion from the OSE WATERS database (ArcGIS REST). Carries water-right status, POD status, use, well depth, depth to water, and well-log date for filtering.",
    source: "arcgis",
    serviceUrl: `${OSE_ARCGIS_BASE_URL}/OSE_Points_of_Diversion/FeatureServer/0`,
    idField: "pod_file",
    query: { outFields: POD_OUT_FIELDS },
    section: OSE_GIS_SECTION,
    // Dense statewide layer — cluster 2x more aggressively than the default.
    clusterRadius: 8,
    // Hide the synthetic `id` (it duplicates pod_file) from the table/popup.
    fields: { exclude: ["id"] },
    // Expand coded fields (status, pod_status, use_) to "Label (CODE)".
    formatValue: formatOseValue,
    style: arcgisPoint("#6b7280"),
  },
  {
    id: "ose-aquifer-tests",
    title: "OSE Aquifer Test Wells",
    description:
      "Wells in the OSE Aquifer Test database (ArcGIS REST), where pump-test data is available.",
    source: "arcgis",
    serviceUrl: `${OSE_ARCGIS_BASE_URL}/OSE_Aquifer_Test_Wells_view_pub/FeatureServer/0`,
    idField: "objectid",
    query: { outFields: AQUIFER_OUT_FIELDS },
    section: OSE_GIS_SECTION,
    mapProperties: aquiferProps,
    fields: { include: AQUIFER_DISPLAY_FIELDS },
    style: arcgisPoint("#1a365d"),
  },
]

/**
 * NWIS — USGS Water Data for the Nation, the modern NWIS replacement, served as
 * OGC API Features (so it rides the same OgcFeaturesClient as Ocotillo). Starting
 * with groundwater sites: the `monitoring-locations` collection filtered to
 * `site_type_code=GW`, scoped to New Mexico (`state_code=35`). Dense, so it
 * clusters and starts hidden.
 */
const NWIS_SECTION = "NWIS"

const NWIS_DISPLAY_FIELDS = [
  "monitoring_location_name",
  "monitoring_location_number",
  "agency_name",
  "site_type",
  "county_name",
  "state_name",
  "altitude",
  "national_aquifer_code",
  "aquifer_type_code",
  "well_constructed_depth",
  "construction_date",
]

// New Mexico extent — the value collections carry no state/site-type filter, so
// they are scoped spatially. [minLon, minLat, maxLon, maxLat].
const NM_BBOX: [number, number, number, number] = [-109, 31, -103, 37]

// Shared field sets for the USGS observation collections.
const NWIS_VALUE_FIELDS = [
  "monitoring_location_id", "parameter_code", "statistic_id", "time", "value",
  "unit_of_measure", "approval_status", "qualifier",
]
const NWIS_FIELD_MEAS_FIELDS = [
  "monitoring_location_id", "parameter_code", "value", "unit_of_measure", "time",
  "observing_procedure", "approval_status", "measuring_agency",
]
const NWIS_CHANNEL_FIELDS = [
  "monitoring_location_id", "measurement_number", "time", "channel_name",
  "channel_flow", "channel_flow_unit", "channel_width", "channel_width_unit",
  "channel_velocity", "channel_velocity_unit",
]

// Cap for open-ended time-series collections so a layer can't pull millions of
// rows; the "latest-*" snapshots are bounded and load in full.
const NWIS_VALUE_CAP = 10000

/** One USGS observation collection rendered as an NWIS map layer. */
const NWIS_VALUE_LAYERS: {
  id: string
  collectionId: string
  title: string
  color: string
  fields: string[]
  /** Full time-series collections get capped; latest-* snapshots do not. */
  capped?: boolean
}[] = [
  { id: "nwis-latest-continuous", collectionId: "latest-continuous", title: "Latest Continuous Values", color: "#2563eb", fields: NWIS_VALUE_FIELDS },
  { id: "nwis-latest-daily", collectionId: "latest-daily", title: "Latest Daily Values", color: "#0891b2", fields: NWIS_VALUE_FIELDS },
  { id: "nwis-latest-field-measurements", collectionId: "latest-field-measurements", title: "Latest Field Measurements", color: "#7c3aed", fields: NWIS_FIELD_MEAS_FIELDS, capped: true },
  { id: "nwis-field-measurements", collectionId: "field-measurements", title: "Field Measurements", color: "#9333ea", fields: NWIS_FIELD_MEAS_FIELDS, capped: true },
  { id: "nwis-channel-measurements", collectionId: "channel-measurements", title: "Channel Measurements", color: "#db2777", fields: NWIS_CHANNEL_FIELDS, capped: true },
]

const nwisLayers: FeaturesLayer[] = [
  {
    id: "nwis-groundwater",
    title: "Groundwater Sites",
    description:
      "USGS NWIS groundwater monitoring locations (wells) in New Mexico, from the Water Data for the Nation OGC API (monitoring-locations, site_type_code=GW).",
    source: "features",
    featuresBaseUrl: USGS_OGC_BASE_URL,
    collectionId: "monitoring-locations",
    query: { site_type_code: "GW", state_code: "35" },
    measurementType: "water_level",
    section: NWIS_SECTION,
    cluster: true,
    fields: { include: NWIS_DISPLAY_FIELDS },
    style: staPoint("#15803d"),
  },
  ...NWIS_VALUE_LAYERS.map(
    (v): FeaturesLayer => ({
      id: v.id,
      title: v.title,
      description: `USGS ${v.title} for New Mexico, from the Water Data for the Nation OGC API (${v.collectionId}).${v.capped ? ` Open-ended time series — limited to the first ${NWIS_VALUE_CAP.toLocaleString()} features.` : ""}`,
      source: "features",
      featuresBaseUrl: USGS_OGC_BASE_URL,
      collectionId: v.collectionId,
      query: { bbox: NM_BBOX },
      ...(v.capped ? { maxFeatures: NWIS_VALUE_CAP } : {}),
      section: NWIS_SECTION,
      cluster: true,
      fields: { include: v.fields },
      style: staPoint(v.color),
    })
  ),
]

export const LAYER_CATALOG: LayerConfig[] = [
  ...st2AgencyLayers,
  ...ocotilloLayers,
  ...oseGisLayers,
  ...nwisLayers,
]

/**
 * Measurement categories for the "browse by what's measured" facet (SPEC §T.T4).
 * Ordered most- to least-common; only categories with ≥1 catalog layer surface.
 */
const ALL_MEASUREMENT_CATEGORIES: { type: MeasurementType; label: string }[] = [
  { type: "water_level", label: "Water levels" },
  { type: "water_quality", label: "Water quality" },
  { type: "surface_water", label: "Surface water" },
  { type: "wells", label: "Wells" },
  { type: "weather", label: "Weather" },
  { type: "geochemistry", label: "Geochemistry" },
]

export const MEASUREMENT_CATEGORIES = ALL_MEASUREMENT_CATEGORIES.filter((c) =>
  LAYER_CATALOG.some((l) => l.measurementType === c.type)
)

/** Layer ids that measure the given type, across all networks. */
export function layersForMeasurement(type: MeasurementType): string[] {
  return LAYER_CATALOG.filter((l) => l.measurementType === type).map((l) => l.id)
}

/**
 * Help text for each layer-group heading, shown as a tooltip on hover. Keyed by
 * the `section` value used on the layers above.
 */
export const SECTION_DESCRIPTIONS: Record<string, string> = {
  STA: "Live monitoring locations from the SensorThings API (FROST), grouped by operating agency. Turn an agency on to map its wells, then click a point to browse its datastreams and chart the measured time series.",
  Ocotillo:
    "New Mexico water datasets from the Ocotillo OGC API Features service — water wells, springs, surface water, chemistry, and project areas. Each layer is a published collection; turn one on to load its features onto the map.",
  "OSE GIS":
    "Office of the State Engineer datasets served as ArcGIS REST Feature Services — statewide Points of Diversion and Aquifer Test Wells. These layers are dense, so the map clusters them; zoom or click a cluster to break it apart.",
  NWIS:
    "USGS sites and observations from the modern Water Data for the Nation OGC API, scoped to New Mexico — groundwater wells plus latest continuous and daily values, field measurements, and channel measurements. Layers are dense and cluster; zoom or click a cluster to break it apart.",
}

export function getLayer(id: string): LayerConfig | undefined {
  return LAYER_CATALOG.find((l) => l.id === id)
}
