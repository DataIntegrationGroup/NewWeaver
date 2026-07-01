import { useQueries, useQuery } from "@tanstack/react-query"
import type { RegionKind } from "@/catalog/regions"
import type { RegionRef } from "@/lib/urlState"
import { fetchRegionFeature, fetchRegionOptions } from "@/lib/regions"

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

/** Every selected region's full geometry + attributes, fetched in parallel. */
export function useRegionFeatures(regions: RegionRef[]) {
  return useQueries({
    queries: regions.map((r) => ({
      queryKey: ["region-feature", r.kind, r.id],
      queryFn: () => fetchRegionFeature(r.kind, r.id),
      staleTime: Infinity,
    })),
  })
}
