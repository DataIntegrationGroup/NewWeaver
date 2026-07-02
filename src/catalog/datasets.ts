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
  STA_BASE_URL,
  STA_ST2_BASE_URL,
  USGS_OGC_BASE_URL,
} from "@/config"

/** The upstream service a dataset is read from, named for a human. */
export interface DatasetService {
  /** Plain-language service name (e.g. "NM Water Data integrated products"). */
  name: string
  /** Standards protocol (e.g. "OGC API Features"). */
  protocol: string
  /** Live endpoint for this dataset (a sample request the user can open). */
  url?: string
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
    const base = layer.staBaseUrl ?? STA_BASE_URL
    const url = `${base}/Locations?$count=true&$top=10`
    return layer.staBaseUrl === STA_ST2_BASE_URL
      ? { name: "NM agency monitoring networks", protocol: "OGC SensorThings", url }
      : { name: "NM Water Data monitoring locations", protocol: "OGC SensorThings", url }
  }
  if (layer.source === "arcgis") {
    return {
      name: "NM Office of the State Engineer GIS",
      protocol: "ArcGIS REST",
      url: `${layer.serviceUrl}/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=10`,
    }
  }
  if (layer.source === "wfs") {
    return {
      name: "NM Water Data integrated products",
      protocol: "OGC WFS",
      url: `${layer.wfsBaseUrl}/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=${encodeURIComponent(
        layer.typeName
      )}&outputFormat=application/json&count=10`,
    }
  }
  // source === "features"
  const url = `${layer.featuresBaseUrl}/collections/${layer.collectionId}/items?f=json&limit=10`
  if (layer.featuresBaseUrl === OCOTILLO_FEATURES_BASE_URL) {
    return { name: "NM Bureau of Geology & Mineral Resources", protocol: "OGC API Features", url }
  }
  if (layer.featuresBaseUrl === USGS_OGC_BASE_URL) {
    return { name: "USGS Water Data for the Nation", protocol: "OGC API Features", url }
  }
  return { name: "NM Water Data exchange", protocol: "OGC API Features", url }
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

/** Distinct group names, in catalog (section) order — drives grouped display. */
export const DATASET_GROUPS: string[] = [
  ...new Set(DATASET_CATALOG.map((d) => d.group)),
]

/** Distinct measurement labels present, in catalog order — a browse facet. */
export const DATASET_MEASUREMENTS: string[] = [
  ...new Set(
    DATASET_CATALOG.map((d) => d.measurementLabel).filter((v): v is string => !!v)
  ),
]

/** Distinct upstream service names, in catalog order — a browse facet. */
export const DATASET_SOURCES: string[] = [
  ...new Set(DATASET_CATALOG.map((d) => d.service.name)),
]

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
