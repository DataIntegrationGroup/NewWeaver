import { useQueries, useQuery } from "@tanstack/react-query"
import type { Polygon } from "geojson"
import { fetchRegionWaterData, fetchWellSeries } from "@/lib/planning"

export interface PlanningRegionInput {
  key: string
  polygons: Polygon[]
}

/**
 * Fetch the integrated water-data products for each selected region separately,
 * cached per region (keyed by region key). Toggling a region only fetches (or
 * evicts) that region — every other region stays served from cache — instead of
 * refetching the whole selection's combined bbox on every toggle. The caller
 * merges the per-region results and derives the summary. `progress` (0–1) is the
 * fraction of selected regions whose data has loaded.
 */
export function usePlanningWaterData(regions: PlanningRegionInput[]) {
  const results = useQueries({
    queries: regions.map((r) => ({
      queryKey: ["planning-region-water", r.key],
      enabled: r.polygons.length > 0,
      staleTime: 5 * 60 * 1000,
      queryFn: () => fetchRegionWaterData(r.polygons),
    })),
  })

  const loaded = results.filter((q) => q.data).length
  return {
    results,
    isLoading: regions.length > 0 && loaded < regions.length,
    isError: results.some((q) => q.isError),
    progress: regions.length > 0 ? loaded / regions.length : 0,
  }
}

/** Fetch one well's water-level time series (hydrograph). Disabled until a
 *  well id is set (i.e. a well is picked). */
export function useWellSeries(wellId: string | null) {
  return useQuery({
    queryKey: ["well-series", wellId],
    enabled: !!wellId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchWellSeries(wellId!),
  })
}
