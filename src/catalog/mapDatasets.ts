/**
 * Map datasets: the DIE pygeoapi products the map offers, one at a time. The
 * list comes from the API's /collections: every `nm_<analyte>_summary` is an
 * analyte dataset, labelled from its title. Only products that don't fit that
 * pattern, or need hand-tuned bins, are written out here (OVERRIDES). Each
 * dataset lists its facets (lib/facets): the filters in the sidebar, and the
 * "color by" options for the legend. The first colorable facet is the
 * default color-by.
 */
import type { Collection } from "@/clients/ogcFeatures"
import { DIE_FEATURES_BASE_URL } from "@/config"
import { facetStyle, type Facet, type FacetSpec } from "@/lib/facets"
import { pointStyle, type FeaturesLayer } from "./layers"

export type DatasetKind = "well" | "analyte" | "ions"

export type DatasetGroup = "Water levels" | "Major ions" | "Minor and trace constituents"

/** A second collection merged onto the dataset's sites by `feature_id`. */
export interface DatasetJoin {
  collectionId: string
  fields: string[]
}

export interface Dataset {
  /** Stable id; the map URL's `ds` value. */
  id: string
  label: string
  group: DatasetGroup
  /** One line under the picker for the selected dataset. */
  blurb: string
  /** Which site-detail layout fits. */
  kind: DatasetKind
  /** DIE collection with one row per site. */
  collectionId: string
  joins?: DatasetJoin[]
  /** Per-site lookups for the detail panel. */
  detail?: { timeseries?: string; trends?: string }
  facets: FacetSpec[]
}

export const GROUP_ORDER: DatasetGroup[] = [
  "Water levels",
  "Major ions",
  "Minor and trace constituents",
]

// ── Sources ──────────────────────────────────────────────────────────────

/** Every DIE product carries the originating agency's code in `source`. */
export const SOURCE_FIELD = "source"

// Unconfirmed names (ST/DWB, ISCSevenRivers, BOR-RISE, WQP/NWIS) are best
// guesses until DIE confirms them.
const SOURCE_LABELS: Record<string, string> = {
  NMBGMR: "NM Bureau of Geology (NMBGMR)",
  "USGS-NWIS": "USGS (NWIS)",
  WQP: "Water Quality Portal",
  "WQP/NWIS": "Water Quality Portal (USGS)",
  "ST/DWB": "NMED Drinking Water Bureau",
  "BOR-RISE": "Bureau of Reclamation (RISE)",
  ISCSevenRivers: "ISC — Seven Rivers",
  "ST2/CABQ": "City of Albuquerque",
  "ST2/BernCo": "Bernalillo County",
  "ST2/NMOSE": "NM Office of the State Engineer",
  "ST2/NMOSE-Roswell": "NM State Engineer — Roswell",
  "ST2/EBID": "Elephant Butte Irrigation District",
  "ST2/PVACD": "Pecos Valley ACD",
  "ST2/CityOfRoswell": "City of Roswell",
}

/** Readable agency name for a `source` code; unknown codes pass through
 *  without their ST/ST2 prefix. */
export function sourceLabel(code: string): string {
  return SOURCE_LABELS[code] ?? code.replace(/^ST2?\//, "")
}

// Categorical palette (Tableau 10 order). Sources are binned most common
// first, so the big statewide networks take the first colors.
const SOURCE_PALETTE = [
  "#4e79a7", "#f28e2b", "#59a14f", "#e15759", "#76b7b2",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
]

const sourceFacet: FacetSpec = {
  id: "source",
  label: "Source",
  title: "Agency that collected the data",
  field: SOURCE_FIELD,
  categories: { palette: SOURCE_PALETTE, label: sourceLabel },
}

// ── Shared facets for summary products ──────────────────────────────────

/** ISO date `n` years before today; compares as a string with ISO dates. */
function yearsAgo(n: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d.toISOString().slice(0, 10)
}

const readingsFacet = (noun: string): FacetSpec => ({
  id: "readings",
  label: `Number of ${noun}`,
  title: `${noun[0].toUpperCase()}${noun.slice(1)} per site`,
  field: "nrecords",
  firstOnTop: true,
  bins: [
    { label: "100+", min: 100, color: "#4c1d95" },
    { label: "10–99", min: 10, max: 100, color: "#7c3aed" },
    { label: "2–9", min: 2, max: 10, color: "#c4b5fd" },
    { label: "1", max: 2, color: "#9ca3af", muted: true },
  ],
})

const lastMeasuredFacet: FacetSpec = {
  id: "last",
  label: "Last measured",
  title: "Most recent measurement",
  field: "latest_date",
  firstOnTop: true,
  bins: [
    { label: "Within 2 years", min: yearsAgo(2), color: "#16a34a" },
    { label: "2–10 years ago", min: yearsAgo(10), max: yearsAgo(2), color: "#0d9488" },
    { label: "10–30 years ago", min: yearsAgo(30), max: yearsAgo(10), color: "#f59e0b" },
    { label: "Over 30 years ago", max: yearsAgo(30), color: "#9ca3af", muted: true },
  ],
}

// ── Analytes ────────────────────────────────────────────────────────────

// Single-hue sequential ramp (teal), light → dark with concentration.
const CONCENTRATION_RAMP = ["#99f6e4", "#2dd4bf", "#14b8a6", "#0f766e", "#134e4a"]

function concentrationFacet(name: string): FacetSpec {
  return {
    id: "conc",
    label: "Concentration",
    title: `Latest ${name}`,
    field: "latest_value",
    // Units come from the rows: DIE's descriptions don't always match them.
    quantiles: { count: 5, ramp: CONCENTRATION_RAMP, unitField: "latest_units" },
  }
}

const analyteFacets = (value: FacetSpec): FacetSpec[] => [
  lastMeasuredFacet,
  sourceFacet,
  value,
  readingsFacet("samples"),
]

// ── Hand-tuned datasets ─────────────────────────────────────────────────

/**
 * Datasets that don't follow the `nm_<analyte>_summary` pattern or need fixed
 * bins. Each shows only while the API still lists its collection.
 */
export const OVERRIDES: Dataset[] = [
  {
    id: "water-levels",
    label: "Water Levels",
    group: "Water levels",
    kind: "well",
    blurb: "Wells with depth-to-water readings. Click one to see its readings over time.",
    collectionId: "nm_waterlevels_summary",
    detail: { timeseries: "nm_waterlevels_timeseries", trends: "nm_waterlevel_trends" },
    facets: [
      lastMeasuredFacet,
      sourceFacet,
      {
        id: "dtw",
        label: "Depth to water",
        title: "Latest depth to water (ft)",
        field: "latest_value",
        bins: [
          { label: "Under 50 ft", max: 50, color: "#1d4ed8" },
          { label: "50–150 ft", min: 50, max: 150, color: "#38bdf8" },
          { label: "150–300 ft", min: 150, max: 300, color: "#f59e0b" },
          { label: "300 ft and over", min: 300, color: "#92400e" },
        ],
      },
      {
        id: "span",
        label: "Years of record",
        title: "Years between first and latest reading",
        // Derived on load from earliest_date / latest_date (lib/dieProps).
        field: "span_years",
        firstOnTop: true,
        bins: [
          { label: "25+ years", min: 25, color: "#1e3a8a" },
          { label: "10–25 years", min: 10, max: 25, color: "#2563eb" },
          { label: "1–10 years", min: 1, max: 10, color: "#60a5fa" },
          { label: "Under 1 year", max: 1, color: "#9ca3af", muted: true },
        ],
      },
      readingsFacet("readings"),
    ],
  },
  {
    id: "major-chemistry",
    label: "Major Chemistry",
    group: "Major ions",
    kind: "ions",
    blurb: "Latest major-ion results per site, with hardness and dominant ions.",
    collectionId: "nm_major_chemistry",
    joins: [
      { collectionId: "nm_water_type", fields: ["dominant_cation", "dominant_anion"] },
      { collectionId: "nm_hardness", fields: ["hardness_caco3", "hardness_class"] },
    ],
    facets: [
      // No Last measured yet: each ion carries its own date.
      sourceFacet,
      {
        id: "hardness",
        label: "Hardness",
        title: "Hardness as CaCO₃",
        field: "hardness_class",
        bins: [
          { label: "Soft", value: "soft", color: "#bae6fd" },
          { label: "Moderately hard", value: "moderate", color: "#38bdf8" },
          { label: "Hard", value: "hard", color: "#0369a1" },
          { label: "Very hard", value: "very hard", color: "#0c2d48" },
        ],
      },
    ],
  },
  {
    id: "tds",
    label: "Total Dissolved Solids",
    group: "Major ions",
    kind: "analyte",
    blurb: "Salinity per site, fresh through saline.",
    collectionId: "nm_tds_summary",
    detail: { timeseries: "nm_tds_timeseries" },
    facets: analyteFacets({
      id: "salinity",
      label: "Salinity",
      title: "Latest TDS (mg/L)",
      field: "latest_value",
      bins: [
        { label: "Fresh (< 1,000)", max: 1000, color: "#2563eb" },
        { label: "Slightly brackish (1,000–3,000)", min: 1000, max: 3000, color: "#14b8a6" },
        { label: "Brackish (3,000–10,000)", min: 3000, max: 10000, color: "#f59e0b" },
        { label: "Saline (10,000+)", min: 10000, color: "#b91c1c" },
      ],
    }),
  },
]

export const DEFAULT_DATASET_ID = "water-levels"

// ── From the API ────────────────────────────────────────────────────────

const SUMMARY = /^nm_(.+)_summary$/
const MAJOR_CHEMISTRY = "nm_major_chemistry"

/** "NM Arsenic Summary" → "Arsenic". */
function analyteLabel(c: Collection, analyte: string): string {
  const title = c.title?.replace(/^NM\s+/, "").replace(/\s+Summary$/i, "")
  return title || analyte[0].toUpperCase() + analyte.slice(1)
}

/**
 * The map's datasets from DIE's /collections, in picker order: each group in
 * GROUP_ORDER, hand-tuned datasets first, then the API's own order. An
 * analyte is a major ion when the major chemistry product lists it as a
 * keyword; anything else is a minor or trace constituent.
 */
export function datasetsFromCollections(collections: Collection[]): Dataset[] {
  const ids = new Set(collections.map((c) => c.id))
  const majorIons = new Set(
    collections.find((c) => c.id === MAJOR_CHEMISTRY)?.keywords?.map((k) => k.toLowerCase())
  )
  const tuned = OVERRIDES.filter((d) => ids.has(d.collectionId))
  const generic = collections.flatMap((c): Dataset[] => {
    const analyte = SUMMARY.exec(c.id)?.[1]
    if (!analyte || OVERRIDES.some((d) => d.collectionId === c.id)) return []
    const label = analyteLabel(c, analyte)
    const timeseries = `nm_${analyte}_timeseries`
    return [
      {
        id: analyte,
        label,
        group: majorIons.has(analyte) ? "Major ions" : "Minor and trace constituents",
        blurb: `Latest ${label.toLowerCase()} concentration per site.`,
        kind: "analyte",
        collectionId: c.id,
        detail: ids.has(timeseries) ? { timeseries } : undefined,
        facets: analyteFacets(concentrationFacet(label.toLowerCase())),
      },
    ]
  })
  return GROUP_ORDER.flatMap((g) => [...tuned, ...generic].filter((d) => d.group === g))
}

/**
 * DIE collection → the map dataset that shows it: a hand-tuned dataset's own
 * collection, joins and per-site lookups, older water-level products folded
 * into Water Levels, else `nm_<analyte>_summary|timeseries` → the analyte.
 * Synchronous (no /collections needed), for the Datasets page.
 */
const DATASET_BY_COLLECTION = new Map<string, string>([
  ["nm_waterlevel_status", "water-levels"],
  ["nm_monitoring_recency", "water-levels"],
  ...OVERRIDES.flatMap((d) =>
    [
      d.collectionId,
      ...(d.joins ?? []).map((j) => j.collectionId),
      d.detail?.timeseries,
      d.detail?.trends,
    ]
      .filter((c): c is string => !!c)
      .map((c) => [c, d.id] as [string, string])
  ),
])

export function datasetForCollection(collectionId: string): string | undefined {
  return (
    DATASET_BY_COLLECTION.get(collectionId) ??
    /^nm_(.+)_(?:summary|timeseries)$/.exec(collectionId)?.[1]
  )
}

/** The default "color by": the dataset's first colorable facet with bins
 *  (Last measured, or Source where there's no single date). */
export function defaultColorFacet(facets: Facet[]): Facet | undefined {
  return facets.find((f) => f.colorable !== false && f.bins.length > 0)
}

/**
 * A dataset as a map layer, colored by `color`. Never clustered (clusters
 * hide the colors); muted bins and "No value" sort beneath the rest so
 * thousands of grey sites don't cover the ones worth seeing.
 */
export function datasetLayer(dataset: Dataset, color?: Facet): FeaturesLayer {
  const style = color ? facetStyle(color) : undefined
  return {
    id: dataset.id,
    title: dataset.label,
    description: dataset.blurb,
    source: "features",
    featuresBaseUrl: DIE_FEATURES_BASE_URL,
    collectionId: dataset.collectionId,
    keyByFeatureId: true,
    wellMetadata: dataset.kind === "well",
    legend: color?.bins.map((b) => ({ label: b.label, color: b.color })),
    style: {
      type: "circle",
      paint: { ...pointStyle.paint, "circle-color": style?.color ?? "#2563eb" },
      layout: style ? { "circle-sort-key": style.sortKey } : undefined,
    },
  }
}
