import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { Feature, FeatureCollection } from "geojson"

import { featuresClient } from "@/clients/ogcFeatures"
import { DIE_FEATURES_BASE_URL } from "@/config"
import { datasetsFromCollections, type Dataset } from "@/catalog/mapDatasets"
import { useDieCollections } from "@/hooks/useDieCollections"
import { normalizeDieProps, joinByFeatureId } from "@/lib/dieProps"
import { resolveFacet, type Facet } from "@/lib/facets"
import { clearLoadProgress, setLoadProgress } from "@/lib/loadProgress"

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] }

/**
 * Query key for a map dataset's sites. Shaped like featuresLayerKey
 * (`["features", base, collectionId, …]`) so the persister matches it, with a
 * "dataset" marker so it never shares a cache entry with a catalog layer
 * reading the same collection without normalizing or joining it.
 */
export function datasetQueryKey(dataset: Dataset) {
  return ["features", DIE_FEATURES_BASE_URL, dataset.collectionId, "dataset", dataset.id] as const
}

/** Every site in a DIE collection, keyed by `feature_id`, missing values as null. */
export async function fetchDieCollection(
  collectionId: string,
  progressKey = collectionId
): Promise<FeatureCollection> {
  try {
    const fc = await featuresClient(DIE_FEATURES_BASE_URL).getAllItems(
      collectionId,
      undefined,
      10000,
      100,
      (n) => setLoadProgress(progressKey, n)
    )
    return {
      type: "FeatureCollection",
      features: fc.features.map((f: Feature) => {
        const properties = normalizeDieProps((f.properties ?? {}) as Record<string, unknown>)
        // DIE's bare `id` repeats across sources; feature_id (`NMBGMR:AB-0001`)
        // is unique, and selection/highlighting key on properties.id.
        const id = String(properties.feature_id ?? f.id)
        return { ...f, id, properties: { ...properties, id } }
      }),
    }
  } finally {
    clearLoadProgress(progressKey)
  }
}

/** A dataset's sites, normalized, with its joined collections merged on. */
export async function fetchDataset(dataset: Dataset): Promise<FeatureCollection> {
  const joins = dataset.joins ?? []
  const [base, ...joined] = await Promise.all([
    fetchDieCollection(dataset.collectionId, dataset.id),
    ...joins.map((j) => fetchDieCollection(j.collectionId)),
  ])
  return joinByFeatureId(
    base,
    joined.map((fc, i) => ({ fc, fields: joins[i].fields }))
  )
}

/** The map's datasets, from DIE's /collections (catalog/mapDatasets). */
export function useMapDatasets() {
  const { data, isLoading, error } = useDieCollections()
  const datasets = useMemo(() => (data ? datasetsFromCollections(data) : []), [data])
  return { datasets, isLoading, error }
}

export interface DatasetData {
  data: FeatureCollection
  /** The dataset's facets with bins resolved from the loaded sites. */
  facets: Facet[]
  isLoading: boolean
  error: unknown
}

/** Sites for a map dataset, normalized and joined, with its facets resolved. */
export function useDatasetData(dataset: Dataset | undefined): DatasetData {
  const query = useQuery({
    queryKey: dataset ? datasetQueryKey(dataset) : ["features", "no-dataset"],
    queryFn: () => fetchDataset(dataset!),
    enabled: !!dataset,
  })
  const data = query.data ?? EMPTY
  const facets = useMemo(
    () => (dataset?.facets ?? []).map((spec) => resolveFacet(spec, data.features)),
    [dataset, data]
  )
  return { data, facets, isLoading: !dataset || query.isLoading, error: query.error }
}
