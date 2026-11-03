import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query"
import type { RegionKind } from "@/catalog/regions"
import type { RegionRef } from "@/lib/urlState"
import { fetchRegionFeature, fetchRegionOptions, regionPolygons } from "@/lib/regions"

/** Named regions of one kind (county/PWS/basin) — static reference data, so
 *  it's fetched once per kind and kept indefinitely. */
export function useRegionOptions(kind: RegionKind | undefined) {
  return useQuery({
    queryKey: ["region-options", kind],
    queryFn: () => fetchRegionOptions(kind!),
    enabled: kind !== undefined,
    staleTime: Infinity,
  })
}

type RegionFeature = Awaited<ReturnType<typeof fetchRegionFeature>>

/** Module-level so `useQueries` keeps the combined result's identity until a
 *  query actually changes — a map pan re-renders but doesn't re-filter. */
function combineRegions(results: UseQueryResult<RegionFeature>[]) {
  return {
    /** Per region, in order: its feature once loaded. */
    regions: results.map((r) => ({ feature: r.data, isLoading: r.isLoading })),
    /** Every loaded region's polygons, for filtering and framing. */
    polygons: results.flatMap((r) => (r.data ? regionPolygons(r.data) : [])),
  }
}

/** Every selected region's full geometry + attributes, fetched in parallel. */
export function useRegionFeatures(regions: RegionRef[]) {
  return useQueries({
    queries: regions.map((r) => ({
      queryKey: ["region-feature", r.kind, r.id],
      queryFn: () => fetchRegionFeature(r.kind, r.id),
      staleTime: Infinity,
    })),
    combine: combineRegions,
  })
}
