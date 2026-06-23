/**
 * Dataset metadata — one record per catalog layer, the single source of truth
 * for the home dashboard counts (SPEC §T.T11) and the Data Catalog cards
 * (§T.T13, §T.T14). Derived from LAYER_CATALOG so a new dataset = a new layer
 * entry, never a hand-maintained second list (§V.V18).
 *
 * Each record adds the human-facing facets a non-expert browses by — which
 * service it comes from, what it measures, which group it belongs to — plus a
 * deep link that opens the dataset on the map with its layer visible (§V.V15).
 */
import {
  LAYER_CATALOG,
  MEASUREMENT_CATEGORIES,
  type LayerConfig,
  type MeasurementType,
} from "@/catalog/layers"
import {
  OCOTILLO_FEATURES_BASE_URL,
  STA_ST2_BASE_URL,
  USGS_OGC_BASE_URL,
} from "@/config"

/** The upstream service a dataset is read from, named for a human. */
export interface DatasetService {
  /** Plain-language service name (e.g. "Ocotillo data products"). */
  name: string
  /** Standards protocol (e.g. "OGC API Features"). */
  protocol: string
}

/** Everything the dashboard and catalog need about one dataset. */
export interface DatasetMeta {
  /** Catalog layer id — also the `layers` deep-link value (§V.V15). */
  id: string
  title: string
  description?: string
  /** What it measures, if classified (drives a facet/badge). */
  measurementType?: MeasurementType
  /** Human label for the measurement type ("Water levels"), if any. */
  measurementLabel?: string
  /** Layer-list group it belongs to (e.g. "Monitoring networks"). */
  group: string
  service: DatasetService
}

const MEASUREMENT_LABELS: Record<string, string> = Object.fromEntries(
  MEASUREMENT_CATEGORIES.map((c) => [c.type, c.label])
)

/**
 * Name the service a layer reads from. STA vs OGC API Features vs ArcGIS REST,
 * disambiguated by base URL where one protocol fronts several deployments.
 */
function serviceFor(layer: LayerConfig): DatasetService {
  if (layer.source === "sta") {
    return layer.staBaseUrl === STA_ST2_BASE_URL
      ? { name: "NM agency monitoring networks (FROST)", protocol: "OGC SensorThings" }
      : { name: "NM Water Data SensorThings (FROST)", protocol: "OGC SensorThings" }
  }
  if (layer.source === "arcgis") {
    return { name: "NM OSE GIS (ArcGIS REST)", protocol: "ArcGIS REST" }
  }
  // source === "features"
  if (layer.featuresBaseUrl === OCOTILLO_FEATURES_BASE_URL) {
    return { name: "Ocotillo integrated data products", protocol: "OGC API Features" }
  }
  if (layer.featuresBaseUrl === USGS_OGC_BASE_URL) {
    return { name: "USGS Water Data for the Nation", protocol: "OGC API Features" }
  }
  return { name: "DIE data exchange (pygeoapi)", protocol: "OGC API Features" }
}

function toMeta(layer: LayerConfig): DatasetMeta {
  return {
    id: layer.id,
    title: layer.title,
    description: layer.description,
    measurementType: layer.measurementType,
    measurementLabel: layer.measurementType
      ? MEASUREMENT_LABELS[layer.measurementType]
      : undefined,
    group: layer.section ?? "Other",
    service: serviceFor(layer),
  }
}

/** Every dataset, in catalog order. */
export const DATASET_CATALOG: DatasetMeta[] = LAYER_CATALOG.map(toMeta)

/** Count of distinct upstream services represented across the catalog. */
export const DATASET_SERVICE_COUNT: number = new Set(
  DATASET_CATALOG.map((d) => d.service.name)
).size

/** Total dataset count. */
export const DATASET_COUNT: number = DATASET_CATALOG.length

/** Lowercase haystack of all displayed metadata, for free-text search (§V.V17). */
export function datasetSearchText(d: DatasetMeta): string {
  return [
    d.title,
    d.description,
    d.group,
    d.service.name,
    d.service.protocol,
    d.measurementLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

/** Map deep link that opens this dataset's layer visible (§V.V15). */
export function datasetMapSearch(id: string): { layers: string[] } {
  return { layers: [id] }
}
