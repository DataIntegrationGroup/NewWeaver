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
import type { WfsQuery } from "@/clients/wfsClient"
import { fixed2, roundedFieldValue, type FieldDisplay } from "@/lib/fields"
import { formatOseValue } from "@/lib/oseCodes"
import {
  GEOSERVER_OGC_FEATURES_BASE_URL,
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

/**
 * A categorical feature property offered as a multi-select in the layer's
 * settings popover, e.g. Monitoring Recency's `status` (active/stale). Chips
 * are OR'd together; no chips selected shows every feature.
 */
export interface AttributeFacet {
  /** Feature property this facet reads (compared via String(value)). */
  field: string
  /** Label shown above the chip row, e.g. "Status". */
  label: string
  options: { value: string; label: string }[]
}

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
  /** Numeric property to size points by when the "bubble map" toggle is on
   *  (proportional-symbol map). Presence enables the toggle in the settings
   *  popover; turning it on sizes each point's radius by this field's value. */
  bubbleField?: string
  /** Numeric property offered as a min/max value range slider in the settings
   *  popover. Presence enables the slider; dragging it filters features whose
   *  value falls within the chosen bounds. */
  rangeField?: string
  /** Full domain [min, max] of `rangeField` for the slider bounds. */
  rangeDomain?: [number, number]
  /** Unit label shown beside the range slider (e.g. "mg/L"). */
  rangeUnit?: string
  /** Named quick-pick ranges shown as buttons above the range slider (e.g. the
   *  TDS salinity classes). Each button sets the slider to [min, max]. A `color`
   *  (all presets or none) also enables the "color by class" toggle, which tints
   *  each point by which preset bin its `rangeField` value falls in. */
  rangePresets?: { label: string; min: number; max: number; color?: string }[]
  /** Citation for the preset classification, linked under the preset buttons. */
  rangePresetsSource?: { label: string; url: string }
  /** Numeric property offered as a "minimum record count" threshold in the
   *  settings popover. Presence renders quick-pick buttons that keep only
   *  features whose value is >= the chosen threshold. Open-ended (no upper
   *  bound), unlike `rangeField`. */
  minRecordsField?: string
  /** Threshold options (ascending) for the min-records buttons; the first is
   *  the default. Include a low value (e.g. 1) as the "show all" option. */
  minRecordsOptions?: number[]
  /** Datetime property offered as a "measured within" recency filter in the
   *  settings popover. Presence renders quick-pick buttons that keep only
   *  features whose value is within the chosen number of years of now. */
  recencyField?: string
  /** Lookback windows in years (ascending) for the recency buttons. An "All"
   *  button (no cutoff) is always shown alongside them and is the default. */
  recencyOptions?: number[]
  /** Multi-select attribute filter shown in the layer's settings popover. */
  facet?: AttributeFacet
  /** Swatch/label pairs for the map legend, when points are categorically
   *  color-mapped (e.g. trend direction). Omit for a single-color layer. */
  legend?: { label: string; color: string }[]
  /** When true, the inspector renders this feature's water-level hydrograph
   *  (depth to water over time, from die:nm_waterlevels_timeseries) above the
   *  attribute metadata. The feature's `id` keys the timeseries fetch. */
  hydrograph?: boolean
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

/**
 * Layer read from an OGC Web Feature Service (WFS), e.g. GeoServer. `typeName`
 * is the workspace-qualified layer (`workspace:layer`); `wfsBaseUrl` is the
 * GeoServer base (the `/wfs` path is appended by the client). GeoServer returns
 * GeoJSON via `outputFormat=application/json`, so these ride the shared path.
 */
export interface WfsLayer extends BaseLayer {
  source: "wfs"
  /** WFS endpoint base, e.g. `…/geoserver`. */
  wfsBaseUrl: string
  /** Workspace-qualified type name, e.g. `die:nm_arsenic_summary`. */
  typeName: string
  query?: WfsQuery
  /** Optional per-feature property transform applied after fetch — normalize
   *  fields, merge columns, or guarantee nulls are present strings. */
  mapProperties?: (props: Record<string, unknown>) => Record<string, unknown>
}

export type LayerConfig = FeaturesLayer | StaLayer | ArcGisLayer | WfsLayer

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
  description: `Monitoring locations operated by ${a.title}, with time-series measurements at each site.`,
  source: "sta",
  staBaseUrl: STA_ST2_BASE_URL,
  defaultVisible: false,
  measurementType: "water_level",
  query: { $filter: `properties/agency eq '${a.code}'`, $top: 2000 },
  section: "Monitoring networks",
  style: staPoint(a.color),
}))

/**
 * Hydrograph — wells with repeat water-level readings, drawn from the integrated
 * DIE water-level status product (die:nm_waterlevel_status, whose `id` keys the
 * die:nm_waterlevels_timeseries series). Clicking a well opens the inspector,
 * which plots its hydrograph (depth to water over time) above the site
 * metadata. Lives in the "Groundwater levels" section (WFS_SECTION, referenced
 * here by literal since that const is declared later).
 */
const hydrographLayer: FeaturesLayer = {
  id: "hydrograph",
  title: "Hydrograph",
  description:
    "Wells with repeat water-level readings — click a well to see its hydrograph (depth to water over time) and site metadata.",
  source: "features",
  featuresBaseUrl: GEOSERVER_OGC_FEATURES_BASE_URL,
  collectionId: "die:nm_waterlevel_status",
  measurementType: "water_level",
  section: "Groundwater levels",
  defaultVisible: true,
  hydrograph: true,
  // parameter_name is a constant ("waterlevels") and record_count duplicates
  // the finer observations count — noise in the inspector table.
  fields: { exclude: ["parameter_name", "record_count"] },
  // Wells span 1 → ~48k readings; a min-records threshold trims the sparse
  // wells (too few points to plot a meaningful hydrograph). observation_count
  // is the raw reading count (points on the chart). Default keeps all.
  minRecordsField: "observation_count",
  minRecordsOptions: [1, 5, 10, 25, 50, 100],
  // Recency filter: keep only wells measured within N years of now, off the
  // last reading date. "All" (no cutoff) is the default.
  recencyField: "last_observation_datetime",
  recencyOptions: [1, 2, 5, 10],
  style: staPoint("#1e40af"),
}

/**
 * Ocotillo — New Mexico water-data collections served from a second pygeoapi
 * (OCOTILLO_FEATURES_BASE_URL). Each entry maps 1:1 to an OGC API Features
 * collection. All start hidden to avoid clutter; users toggle them on from the
 * "New Mexico Water Data (Ocotillo)" section of the layer list.
 */
// Human-meaningful header (SPEC §T.T9 / §V.V8): "Ocotillo" is internal vocab.
const OCOTILLO_SECTION = "NMBGMR GIS"

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
  // Statewide well coverage — user toggles it on. The hydrograph layer is the
  // sole default and itself seeds the first paint with statewide data (SPEC
  // §V.V5). Map-context only: it must not hijack the table's default subject
  // (SPEC §V.V12).
  { id: "actively_monitored_wells", title: "Actively Monitored Wells", color: "#1d4ed8", excludeFromAutoTable: true, mt: "wells" },
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
    `${c.title} across New Mexico, from the NM Bureau of Geology & Mineral Resources integrated datasets.`,
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
      "Points of Diversion from the OSE WATERS database — water-right status, POD status, use, well depth, depth to water, and well-log date, all filterable.",
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
      "Wells in the OSE Aquifer Test database, where pump-test data is available.",
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
      "USGS groundwater monitoring wells in New Mexico, from Water Data for the Nation.",
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
      description: `USGS ${v.title.toLowerCase()} for New Mexico, from Water Data for the Nation.${v.capped ? ` Open-ended time series — limited to the first ${NWIS_VALUE_CAP.toLocaleString()} features.` : ""}`,
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

/**
 * GeoServer WFS — New Mexico Water Data summary layers served from GeoServer
 * (GEOSERVER_WFS_BASE_URL) as a Web Feature Service. Each entry maps 1:1 to a
 * GeoServer typeName in the `die` workspace. Start hidden; users toggle them on
 * from the "Groundwater levels" and "Groundwater Chemistry" sections.
 */
const WFS_SECTION = "Groundwater levels"
// Water-chemistry integrated products get their own collapsible group.
const CHEM_SECTION = "Groundwater Chemistry"
// The integrated `die:` products span both sections (persisted together).
const INTEGRATED_SECTIONS = new Set([WFS_SECTION, CHEM_SECTION])
// Secondary integrated products — per-well trend/summary/density layers that
// parallel the primary summaries but are lower-traffic. Folded under the
// collapsible "Advanced" super-group (ADVANCED_SECTIONS) rather than shown
// top-level. A WFS_LAYERS entry with `section` set overrides the default
// mt-based section routing, dropping it here.
const ADVANCED_PRODUCTS_SECTION = "Additional Products"

// MCL Exceedances carries value/mcl/mcl_type/exceeds as four separate columns
// per analyte (e.g. chloride, chloride_mcl, chloride_mcl_type, chloride_exceeds).
// Collapse those into one display row per analyte that actually exceeds —
// "chloride" → "794 (MCL 250, secondary)" — instead of 28 mostly-empty columns.
const MCL_ANALYTES = ["arsenic", "chloride", "fluoride", "nitrate", "sulfate", "tds", "uranium"]

function expandMclExceedances(props: Record<string, unknown>): Record<string, unknown> {
  const drop = new Set(["exceeded_analytes"])
  for (const a of MCL_ANALYTES) {
    drop.add(a)
    drop.add(`${a}_mcl`)
    drop.add(`${a}_mcl_type`)
    drop.add(`${a}_exceeds`)
  }
  const rest: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (!drop.has(k)) rest[k] = v
  }
  for (const a of MCL_ANALYTES) {
    if (props[`${a}_exceeds`]) {
      rest[a] = `${props[a]} (MCL ${props[`${a}_mcl`]}, ${props[`${a}_mcl_type`]})`
    }
  }
  return rest
}

// Mann-Kendall trend classification shared by the arsenic/nitrate trend layers
// (same `trend_category` field and categories as nm_waterlevel_trends). Rising
// concentration reads as a concern (red); falling as improvement (green).
const TREND_FACET: AttributeFacet = {
  field: "trend_category",
  label: "Trend",
  options: [
    { value: "increasing", label: "Increasing" },
    { value: "decreasing", label: "Decreasing" },
    { value: "stable", label: "Stable" },
    { value: "not enough data", label: "Not enough data" },
  ],
}
const TREND_LEGEND = [
  { label: "Increasing", color: "#dc2626" },
  { label: "Decreasing", color: "#16a34a" },
  { label: "Stable", color: "#6b7280" },
  { label: "Not enough data", color: "#9ca3af" },
]
function trendStyle(): LayerStyle {
  return {
    type: "circle",
    paint: {
      "circle-radius": 3.75,
      "circle-stroke-width": 1,
      "circle-stroke-color": SCATTER_STROKE,
      "circle-color": [
        "match",
        ["get", "trend_category"],
        "increasing", "#dc2626",
        "decreasing", "#16a34a",
        "stable",     "#6b7280",
        /* default */ "#9ca3af",
      ],
    },
  }
}

// Total-hardness (CaCO3) classification for nm_hardness. Values from the
// source's `hardness_class` field (USGS classes: soft ≤60, moderate 61–120,
// hard 121–180, very hard >180 mg/L; 'insufficient' when uncomputable).
const HARDNESS_FACET: AttributeFacet = {
  field: "hardness_class",
  label: "Hardness",
  options: [
    { value: "soft", label: "Soft" },
    { value: "moderate", label: "Moderate" },
    { value: "hard", label: "Hard" },
    { value: "very hard", label: "Very hard" },
  ],
}
const HARDNESS_LEGEND = [
  { label: "Soft", color: "#2563eb" },
  { label: "Moderate", color: "#14b8a6" },
  { label: "Hard", color: "#f59e0b" },
  { label: "Very hard", color: "#b91c1c" },
]
function hardnessStyle(): LayerStyle {
  return {
    type: "circle",
    paint: {
      "circle-radius": 3.75,
      "circle-stroke-width": 1,
      "circle-stroke-color": SCATTER_STROKE,
      "circle-color": [
        "match",
        ["get", "hardness_class"],
        "soft",      "#2563eb",
        "moderate",  "#14b8a6",
        "hard",      "#f59e0b",
        "very hard", "#b91c1c",
        /* default */ "#9ca3af",
      ],
    },
  }
}

const WFS_LAYERS: {
  typeName: string
  title: string
  description: string
  color: string
  mt: MeasurementType
  /** Override the group heading. Defaults to CHEM_SECTION / WFS_SECTION by `mt`;
   *  set to ADVANCED_PRODUCTS_SECTION to fold under the "Advanced" super-group. */
  section?: string
  /** Server-side CQL filter applied at fetch — e.g. to pull only sites with
   *  sufficient data. Becomes the layer's WFS `cql_filter`. */
  cqlFilter?: string
  /** Numeric field to size points by under the bubble-map toggle. */
  bubbleField?: string
  /** Numeric field to expose as a min/max value range filter. */
  rangeField?: string
  /** Slider domain [min, max] for `rangeField`. */
  rangeDomain?: [number, number]
  /** Unit label shown beside the range slider. */
  rangeUnit?: string
  /** Named quick-pick ranges shown as buttons above the range slider. */
  rangePresets?: { label: string; min: number; max: number; color?: string }[]
  /** Citation for the preset classification, linked under the preset buttons. */
  rangePresetsSource?: { label: string; url: string }
  style?: LayerStyle
  fields?: FieldDisplay
  facet?: AttributeFacet
  legend?: { label: string; color: string }[]
  mapProperties?: (props: Record<string, unknown>) => Record<string, unknown>
  formatValue?: (key: string, value: unknown) => string
}[] = [
  {
    typeName: "die:nm_arsenic_summary",
    title: "Arsenic Summary",
    description:
      "Per-location arsenic summary for New Mexico.",
    color: "#b91c1c",
    mt: "water_quality",
  },
  {
    typeName: "die:nm_tds_summary",
    title: "TDS Summary",
    description:
      "Per-location total-dissolved-solids summary for New Mexico. Turn on the bubble map to size each point by its mean TDS.",
    color: "#ea580c",
    mt: "water_quality",
    // Proportional-symbol option: size points by mean TDS (mg/L).
    bubbleField: "mean",
    // Value range slider: filter to sites whose mean TDS is within bounds.
    rangeField: "mean",
    rangeDomain: [0, 35000],
    rangeUnit: "mg/L",
    // Salinity classes (mg/L TDS) after USGS/Heath (1983): quick-pick buttons
    // over the slider, and the palette for the "color by class" toggle.
    rangePresets: [
      { label: "Fresh", min: 0, max: 1000, color: "#2563eb" },
      { label: "Slightly brackish", min: 1000, max: 3000, color: "#14b8a6" },
      { label: "Brackish", min: 3000, max: 10000, color: "#f59e0b" },
      { label: "Saline", min: 10000, max: 35000, color: "#b91c1c" },
    ],
    rangePresetsSource: {
      label: "USGS salinity classes",
      url: "https://www.usgs.gov/special-topics/water-science-school/science/saline-water-and-salinity",
    },
  },
  {
    typeName: "die:nm_waterlevel_trends",
    title: "Groundwater Trends",
    description:
      "Per-location groundwater level trend summary for New Mexico.",
    color: "#6b7280",
    mt: "water_level",
    fields: {
      include: ["name", "trend_category", "well_depth", "slope_per_year", "span_years", "record_count", "source"],
    },
    // Multi-select trend classes; none selected shows every category.
    facet: {
      field: "trend_category",
      label: "Trend",
      options: [
        { value: "increasing", label: "Increasing" },
        { value: "decreasing", label: "Decreasing" },
        { value: "stable", label: "Stable" },
        { value: "not enough data", label: "Not enough data" },
      ],
    },
    legend: [
      { label: "Increasing", color: "#dc2626" },
      { label: "Decreasing", color: "#16a34a" },
      { label: "Stable", color: "#6b7280" },
      { label: "Not enough data", color: "#9ca3af" },
    ],
    style: {
      type: "circle",
      paint: {
        "circle-radius": 3.75,
        "circle-stroke-width": 1,
        "circle-stroke-color": SCATTER_STROKE,
        "circle-color": [
          "match",
          ["get", "trend_category"],
          "increasing", "#dc2626",
          "decreasing", "#16a34a",
          "stable",     "#6b7280",
          /* default */ "#9ca3af",
        ],
      },
    },
  },
  {
    typeName: "die:nm_major_chemistry",
    title: "Major Chemistry",
    description:
      "Major ion chemistry for New Mexico groundwater.",
    color: "#7c3aed",
    mt: "water_quality",
  },
  {
    typeName: "die:nm_monitoring_recency",
    title: "Monitoring Recency",
    description:
      "Per-location monitoring recency for New Mexico — days since the last observation and active/stale status.",
    color: "#0891b2",
    mt: "wells",
    fields: {
      include: [
        "name",
        "source",
        "status",
        "days_since_last",
        "last_observation_datetime",
        "first_observation_datetime",
        "record_count",
        "well_depth",
      ],
    },
    facet: {
      field: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "stale", label: "Stale" },
      ],
    },
    legend: [
      { label: "Active", color: "#16a34a" },
      { label: "Stale", color: "#dc2626" },
    ],
    style: {
      type: "circle",
      paint: {
        "circle-radius": 3.75,
        "circle-stroke-width": 1,
        "circle-stroke-color": SCATTER_STROKE,
        "circle-color": [
          "match",
          ["get", "status"],
          "active", "#16a34a",
          "stale",  "#dc2626",
          /* default */ "#9ca3af",
        ],
      },
    },
  },
  {
    typeName: "die:nm_waterlevel_change",
    title: "Water Level Change",
    description:
      "Per-location water-level change over a multi-year window for New Mexico — rising/declining direction and net change in feet.",
    color: "#1d4ed8",
    mt: "water_level",
    fields: {
      include: [
        "name",
        "source",
        "direction",
        "change_ft",
        "window_years",
        "dtw_start",
        "dtw_end",
        "end_date",
        "observation_count",
        "status",
        "well_depth",
      ],
    },
    facet: {
      field: "direction",
      label: "Direction",
      options: [
        { value: "rising", label: "Rising" },
        { value: "declining", label: "Declining" },
      ],
    },
    legend: [
      { label: "Rising", color: "#2563eb" },
      { label: "Declining", color: "#dc2626" },
    ],
    style: {
      type: "circle",
      paint: {
        "circle-radius": 3.75,
        "circle-stroke-width": 1,
        "circle-stroke-color": SCATTER_STROKE,
        "circle-color": [
          "match",
          ["get", "direction"],
          "rising",    "#2563eb",
          "declining", "#dc2626",
          /* default */ "#9ca3af",
        ],
      },
    },
  },
  {
    typeName: "die:nm_mcl_exceedance",
    title: "MCL Exceedances",
    description:
      "Per-location drinking-water MCL exceedances for New Mexico — which analytes exceed primary/secondary limits.",
    color: "#b91c1c",
    mt: "water_quality",
    // "id" stays in properties (map selection/highlight reads it) but isn't
    // worth showing; everything else surviving expandMclExceedances is shown,
    // in the order it builds: name, source, any_exceedance, exceedance_count,
    // well_depth, then one row per exceeded analyte.
    fields: { exclude: ["id"] },
    mapProperties: expandMclExceedances,
    facet: {
      field: "any_exceedance",
      label: "MCL status",
      options: [
        { value: "true", label: "Exceeds MCL" },
        { value: "false", label: "No exceedance" },
      ],
    },
    legend: [
      { label: "Exceeds MCL", color: "#dc2626" },
      { label: "No exceedance", color: "#16a34a" },
    ],
    style: {
      type: "circle",
      paint: {
        "circle-radius": 3.75,
        "circle-stroke-width": 1,
        "circle-stroke-color": SCATTER_STROKE,
        "circle-color": [
          "case",
          ["get", "any_exceedance"], "#dc2626",
          /* default */ "#16a34a",
        ],
      },
    },
  },
  {
    typeName: "die:nm_water_type",
    title: "Water Type",
    description:
      "Per-location hydrochemical water type (Piper classification) for New Mexico — dominant cation/anion facies.",
    color: "#7c3aed",
    mt: "water_quality",
    fields: {
      include: [
        "name",
        "source",
        "water_type",
        "dominant_cation",
        "dominant_anion",
        "well_depth",
      ],
    },
    facet: {
      field: "dominant_cation",
      label: "Dominant cation",
      options: [
        { value: "Ca", label: "Ca" },
        { value: "Mg", label: "Mg" },
        { value: "Na+K", label: "Na+K" },
        { value: "mixed", label: "Mixed" },
      ],
    },
    legend: [
      { label: "Ca", color: "#2563eb" },
      { label: "Mg", color: "#16a34a" },
      { label: "Na+K", color: "#ea580c" },
      { label: "Mixed", color: "#7c3aed" },
    ],
    style: {
      type: "circle",
      paint: {
        "circle-radius": 3.75,
        "circle-stroke-width": 1,
        "circle-stroke-color": SCATTER_STROKE,
        "circle-color": [
          "match",
          ["get", "dominant_cation"],
          "Ca",    "#2563eb",
          "Mg",    "#16a34a",
          "Na+K",  "#ea580c",
          "mixed", "#7c3aed",
          /* default */ "#9ca3af",
        ],
      },
    },
  },
  {
    typeName: "die:nm_seasonal_amplitude",
    title: "Seasonal Amplitude",
    description:
      "Per-location seasonal water-level amplitude for New Mexico — average and peak within-year fluctuation.",
    color: "#0d9488",
    mt: "water_level",
    fields: {
      include: [
        "name",
        "source",
        "status",
        "mean_amplitude_ft",
        "max_amplitude_ft",
        "max_amplitude_year",
        "min_amplitude_ft",
        "n_years_used",
        "n_years_with_data",
        "record_count",
        "well_depth",
      ],
    },
    formatValue: (key, value) =>
      (["mean_amplitude_ft", "max_amplitude_ft", "min_amplitude_ft"].includes(key)
        ? fixed2(value)
        : undefined) ?? String(value ?? ""),
    facet: {
      field: "status",
      label: "Status",
      options: [
        { value: "ok", label: "OK" },
        { value: "insufficient", label: "Insufficient data" },
      ],
    },
    legend: [
      { label: "OK", color: "#0d9488" },
      { label: "Insufficient data", color: "#9ca3af" },
    ],
    style: {
      type: "circle",
      paint: {
        "circle-radius": 3.75,
        "circle-stroke-width": 1,
        "circle-stroke-color": SCATTER_STROKE,
        "circle-color": [
          "match",
          ["get", "status"],
          "ok", "#0d9488",
          /* default */ "#9ca3af",
        ],
      },
    },
  },
  {
    typeName: "die:nm_depletion_projection",
    title: "Depletion Projection",
    description:
      "Per-location groundwater depletion projection for New Mexico — years until water level reaches well depth, based on the current trend.",
    color: "#c026d3",
    mt: "water_level",
    fields: {
      include: [
        "name",
        "source",
        "status",
        "trend_category",
        "slope_ft_per_year",
        "latest_dtw",
        "latest_dtw_date",
        "remaining_ft",
        "years_to_depletion",
        "projected_depletion_year",
        "span_years",
        "record_count",
        "well_depth",
      ],
    },
    formatValue: (key, value) =>
      (["slope_ft_per_year", "remaining_ft", "years_to_depletion"].includes(key)
        ? fixed2(value)
        : undefined) ?? roundedFieldValue(key, value) ?? String(value ?? ""),
    facet: {
      field: "status",
      label: "Status",
      options: [
        { value: "projected", label: "Projected" },
        { value: "dtw exceeds well depth", label: "Exceeds well depth" },
        { value: "not declining", label: "Not declining" },
        { value: "not enough data", label: "Not enough data" },
        { value: "no well depth", label: "No well depth" },
      ],
    },
    legend: [
      { label: "Projected", color: "#dc2626" },
      { label: "Exceeds well depth", color: "#7c2d12" },
      { label: "Not declining", color: "#16a34a" },
      { label: "Not enough data", color: "#9ca3af" },
      { label: "No well depth", color: "#d1d5db" },
    ],
    style: {
      type: "circle",
      paint: {
        "circle-radius": 3.75,
        "circle-stroke-width": 1,
        "circle-stroke-color": SCATTER_STROKE,
        "circle-color": [
          "match",
          ["get", "status"],
          "projected",              "#dc2626",
          "dtw exceeds well depth", "#7c2d12",
          "not declining",          "#16a34a",
          "no well depth",          "#d1d5db",
          /* default */ "#9ca3af",
        ],
      },
    },
  },
  {
    typeName: "die:nm_ion_balance",
    title: "Ion Balance",
    description:
      "Per-location major-ion charge balance for New Mexico groundwater. Shows only sites with enough cation and anion coverage to compute a balance.",
    color: "#0d9488",
    mt: "water_quality",
    // Only pull sites with sufficient data — GeoServer flags rows lacking
    // enough cation/anion coverage as balance_class 'insufficient'.
    cqlFilter: "balance_class <> 'insufficient'",
  },
  {
    typeName: "die:nm_sar",
    title: "Sodium Adsorption Ratio",
    description:
      "Per-location sodium adsorption ratio (SAR) for New Mexico — an indicator of irrigation-water suitability. Shows only sites with enough data to compute SAR.",
    color: "#ca8a04",
    mt: "water_quality",
    // Only pull sites with sufficient data — rows lacking sodium/calcium/
    // magnesium to compute SAR are flagged sar_class 'insufficient'.
    cqlFilter: "sar_class <> 'insufficient'",
  },
  {
    typeName: "die:nm_wqi",
    title: "Water Quality Index",
    description:
      "Per-location water quality index (WQI) for New Mexico — a composite summary of groundwater quality.",
    color: "#9333ea",
    mt: "water_quality",
  },
  // --- Additional Products (folded under the "Advanced" super-group) ---
  {
    typeName: "die:nm_arsenic_trend",
    title: "Arsenic Trends",
    description:
      "Per-location arsenic concentration trend (Mann-Kendall slope and category) for New Mexico groundwater.",
    color: "#b91c1c",
    mt: "water_quality",
    section: ADVANCED_PRODUCTS_SECTION,
    fields: {
      include: ["name", "trend_category", "slope_per_year", "slope_units", "span_years", "record_count", "well_depth", "source"],
    },
    facet: TREND_FACET,
    legend: TREND_LEGEND,
    style: trendStyle(),
  },
  {
    typeName: "die:nm_nitrate_trend",
    title: "Nitrate Trends",
    description:
      "Per-location nitrate concentration trend (Mann-Kendall slope and category) for New Mexico groundwater.",
    color: "#65a30d",
    mt: "water_quality",
    section: ADVANCED_PRODUCTS_SECTION,
    fields: {
      include: ["name", "trend_category", "slope_per_year", "slope_units", "span_years", "record_count", "well_depth", "source"],
    },
    facet: TREND_FACET,
    legend: TREND_LEGEND,
    style: trendStyle(),
  },
  {
    typeName: "die:nm_hardness",
    title: "Water Hardness",
    description:
      "Per-location total hardness as CaCO₃ (calcium + magnesium) for New Mexico groundwater. Turn on the bubble map to size points by hardness.",
    color: "#0d9488",
    mt: "water_quality",
    section: ADVANCED_PRODUCTS_SECTION,
    fields: {
      include: ["name", "hardness_caco3", "hardness_class", "calcium", "magnesium", "well_depth", "source"],
    },
    bubbleField: "hardness_caco3",
    rangeField: "hardness_caco3",
    rangeDomain: [0, 2000],
    rangeUnit: "mg/L CaCO₃",
    rangePresets: [
      { label: "Soft", min: 0, max: 60, color: "#2563eb" },
      { label: "Moderate", min: 60, max: 120, color: "#14b8a6" },
      { label: "Hard", min: 120, max: 180, color: "#f59e0b" },
      { label: "Very hard", min: 180, max: 2000, color: "#b91c1c" },
    ],
    rangePresetsSource: {
      label: "USGS hardness classes",
      url: "https://www.usgs.gov/special-topics/water-science-school/science/hardness-water",
    },
    facet: HARDNESS_FACET,
    legend: HARDNESS_LEGEND,
    style: hardnessStyle(),
  },
  {
    typeName: "die:nm_waterlevel_data_density",
    title: "Water Level Data Density",
    description:
      "Per-location water-level measurement coverage and frequency for New Mexico. Turn on the bubble map to size points by observations per year.",
    color: "#2563eb",
    mt: "water_level",
    section: ADVANCED_PRODUCTS_SECTION,
    fields: {
      include: ["name", "observations_per_year", "mean_interval_days", "observation_count", "record_count", "span_years", "first_observation_datetime", "last_observation_datetime", "source"],
    },
    bubbleField: "observations_per_year",
  },
  {
    typeName: "die:nm_waterlevels_summary",
    title: "Water Levels Summary",
    description:
      "Per-location depth-to-water summary statistics (min / mean / max) for New Mexico. Turn on the bubble map to size points by mean depth.",
    color: "#0891b2",
    mt: "water_level",
    section: ADVANCED_PRODUCTS_SECTION,
    fields: {
      include: ["name", "mean", "min", "max", "nrecords", "latest_value", "latest_date", "well_depth", "parameter_units", "source"],
    },
    bubbleField: "mean",
  },
]

// The integrated `die` products are served by GeoServer's OGC API Features
// endpoint (the modern replacement for its WFS). Each maps 1:1 to an OGC
// collection whose id is the workspace-qualified `die:` layer name. The `wfs-`
// id stem is kept so bookmarked URLs and layer references stay valid. A
// server-side CQL filter (e.g. "only sufficient data") rides as an OGC
// `filter` + `filter-lang=cql2-text`.
const integratedLayers: FeaturesLayer[] = WFS_LAYERS.map((w) => ({
  id: `wfs-${w.typeName.split(":").pop()!.replace(/_/g, "-")}`,
  title: w.title,
  description: w.description,
  source: "features",
  featuresBaseUrl: GEOSERVER_OGC_FEATURES_BASE_URL,
  collectionId: w.typeName,
  measurementType: w.mt,
  section: w.section ?? (w.mt === "water_quality" ? CHEM_SECTION : WFS_SECTION),
  cluster: true,
  style: w.style ?? staPoint(w.color),
  ...(w.cqlFilter && {
    query: { filter: w.cqlFilter, "filter-lang": "cql2-text" },
  }),
  ...(w.bubbleField && { bubbleField: w.bubbleField }),
  ...(w.rangeField && { rangeField: w.rangeField }),
  ...(w.rangeDomain && { rangeDomain: w.rangeDomain }),
  ...(w.rangeUnit && { rangeUnit: w.rangeUnit }),
  ...(w.rangePresets && { rangePresets: w.rangePresets }),
  ...(w.rangePresetsSource && { rangePresetsSource: w.rangePresetsSource }),
  ...(w.fields && { fields: w.fields }),
  ...(w.facet && { facet: w.facet }),
  ...(w.legend && { legend: w.legend }),
  ...(w.mapProperties && { mapProperties: w.mapProperties }),
  ...(w.formatValue && { formatValue: w.formatValue }),
}))

// Choropleth polygon layers: shade each region by well density. Drawn as a
// fill whose color is a single editable base (colorOverride sets fill-color)
// and whose opacity ramps with `wells_per_sq_km` — so the color mapping is
// editable while the density gradient is preserved. The ramp saturates near
// 0.5 wells/km² (both layers are right-skewed, so a linear ramp to the max
// would wash out nearly every region).
const DENSITY_SECTION = "Well Metadata"
const DENSITY_RAMP_MAX = 0.5

function densityFill(color: string): LayerStyle {
  return {
    type: "fill",
    paint: {
      "fill-color": color,
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["coalesce", ["to-number", ["get", "wells_per_sq_km"]], 0],
        0, 0.05,
        DENSITY_RAMP_MAX, 0.8,
      ],
      "fill-outline-color": "rgba(31,41,55,0.45)",
    },
  }
}

// Choropleth ramp for the recent-POD-by-county layer: shade each county by its
// count of recent Points of Diversion (well completions). Same single-editable-
// base-color + opacity-ramp scheme as densityFill (the swatch overrides
// fill-color, so the ramp must stay single-hue), but keyed on an integer count.
//
// Uses a `step` (class-break) ramp rather than a linear one: POD counts are
// heavily right-skewed, so a linear ramp to the max washes out nearly every
// county. Fixed breaks make a single completion already visible and saturate
// the high tail, and are robust to the unknown eventual max (the source is
// near-empty at wiring time). Break opacities climb 0.15 → 0.9; zero stays
// near-transparent so empty counties read as "no data", not "lowest class".
const COUNT_BREAKS: [number, number][] = [
  [1, 0.15],
  [3, 0.3],
  [10, 0.45],
  [25, 0.6],
  [50, 0.75],
  [100, 0.9],
]

function countFill(color: string, field: string): LayerStyle {
  return {
    type: "fill",
    paint: {
      "fill-color": color,
      "fill-opacity": [
        "step",
        ["coalesce", ["to-number", ["get", field]], 0],
        0.04,
        ...COUNT_BREAKS.flat(),
      ],
      "fill-outline-color": "rgba(31,41,55,0.45)",
    },
  }
}

const densityLayers: FeaturesLayer[] = [
  {
    id: "wells-density-basin",
    title: "Well Density by Basin",
    description:
      "Wells per km² by groundwater basin. Darker = denser; click a basin for its counts. Edit the color from the swatch.",
    source: "features",
    featuresBaseUrl: GEOSERVER_OGC_FEATURES_BASE_URL,
    collectionId: "die:nm_well_density_by_basin",
    measurementType: "wells",
    section: DENSITY_SECTION,
    style: densityFill("#b45309"),
  },
  {
    id: "wells-density-county",
    title: "Well Density by County",
    description:
      "Wells per km² by county. Darker = denser; click a county for its counts. Edit the color from the swatch.",
    source: "features",
    featuresBaseUrl: GEOSERVER_OGC_FEATURES_BASE_URL,
    collectionId: "die:nm_well_density_by_county",
    measurementType: "wells",
    section: DENSITY_SECTION,
    style: densityFill("#1d4ed8"),
  },
  {
    id: "wells-correlation",
    title: "Cross-Agency Well Correlation",
    description:
      "Wells matched across agencies (NMBGMR, OSE, and others) into correlation clusters — click a well for its linked sites, matching method, and confidence.",
    source: "features",
    featuresBaseUrl: GEOSERVER_OGC_FEATURES_BASE_URL,
    collectionId: "die:nm_well_correlation",
    measurementType: "wells",
    section: DENSITY_SECTION,
    style: staPoint("#7c3aed"),
  },
  {
    id: "pod-age-by-county",
    title: "Recent Well (POD) Age by County",
    description:
      "Distribution of recent Points of Diversion (well completions) by county over the last decade — click a county for its per-year counts, trend, and peak year.",
    source: "features",
    featuresBaseUrl: GEOSERVER_OGC_FEATURES_BASE_URL,
    collectionId: "die:nm_pod_age_by_county",
    measurementType: "wells",
    section: DENSITY_SECTION,
    style: countFill("#0f766e", "total_recent_pods"),
  },
  {
    id: "pod-age-points",
    title: "Recent Wells (PODs) — Last 10 Years",
    description:
      "Individual well completions (Points of Diversion) from the last ten years — click a well for its completion year, aquifer, and depth.",
    source: "features",
    featuresBaseUrl: GEOSERVER_OGC_FEATURES_BASE_URL,
    collectionId: "die:nm_pod_age_points",
    measurementType: "wells",
    section: DENSITY_SECTION,
    style: staPoint("#0891b2"),
  },
]

export const LAYER_CATALOG: LayerConfig[] = [
  hydrographLayer,
  ...integratedLayers,
  ...st2AgencyLayers,
  ...ocotilloLayers,
  ...oseGisLayers,
  ...nwisLayers,
  ...densityLayers,
]

/**
 * Bump when a persisted layer's feature shape changes (new `mapProperties`,
 * renamed fields, etc.) so the IndexedDB cache busts instead of replaying a
 * stale shape. Used as the persist `buster` in main.tsx. Bumped to 4 when the
 * integrated products moved from WFS to OGC API Features (new query keys).
 */
export const CATALOG_VERSION = "4"

/**
 * OGC collection ids whose fetched FeatureCollections are persisted to
 * IndexedDB — only the integrated `die:` products (the "Groundwater levels" and
 * "Groundwater Chemistry" sections). The features query key carries the
 * collection id, so the persist predicate matches on these.
 */
export const PERSISTED_INTEGRATED_COLLECTIONS = new Set(
  LAYER_CATALOG.filter(
    (l) => l.source === "features" && !!l.section && INTEGRATED_SECTIONS.has(l.section)
  ).map((l) => (l as FeaturesLayer).collectionId)
)

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
// Plain-language, scope-focused group captions (no interface-mechanics copy,
// SPEC §V.V7). Keyed by the section header above.
export const SECTION_DESCRIPTIONS: Record<string, string> = {
  "Monitoring networks":
    "Live monitoring locations operated by water agencies across New Mexico — cities, counties, irrigation districts, and the State Engineer — each network mapped on its own.",
  "NMBGMR GIS":
    "New Mexico water data integrated from many sources into statewide products — water wells, springs, surface water, water levels, and chemistry.",
  "OSE GIS":
    "Statewide datasets from the New Mexico Office of the State Engineer — Points of Diversion and Aquifer Test Wells.",
  NWIS:
    "U.S. Geological Survey sites and observations for New Mexico, from the Water Data for the Nation service — groundwater wells plus continuous, daily, field, and channel measurements.",
  "Groundwater levels":
    "Per-location groundwater-level summary products — levels, trends, seasonal amplitude, and depletion projections.",
  "Groundwater Chemistry":
    "Per-location groundwater-chemistry summary products — arsenic, TDS, major-ion chemistry, water type, SAR, water quality index, and drinking-water exceedances.",
  "Well Metadata":
    "Well-level reference datasets — density choropleths (wells per km² by basin and county), cross-agency well correlation, and recent Point-of-Diversion age distributions. Edit a layer's color from its swatch.",
  "Additional Products":
    "Secondary per-location summary products — arsenic and nitrate concentration trends, water hardness, and water-level data density and summary statistics.",
}

/**
 * Sections folded under the collapsible "Advanced" super-group at the end of the
 * layer list, in display order. Rendered as nested accordions by LayerList;
 * everything not listed here stays a top-level group.
 */
export const ADVANCED_SECTION = "Advanced"
export const ADVANCED_SECTIONS = [
  "Monitoring networks",
  "NMBGMR GIS",
  "OSE GIS",
  "NWIS",
  ADVANCED_PRODUCTS_SECTION,
]

export function getLayer(id: string): LayerConfig | undefined {
  return LAYER_CATALOG.find((l) => l.id === id)
}
