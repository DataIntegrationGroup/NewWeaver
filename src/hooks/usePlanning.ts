import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { Polygon } from "geojson"
import { fetchRegionWaterData, fetchWellSeries, summarizeWaterData } from "@/lib/planning"

/**
 * Fetch and summarise the integrated water-data products inside a set of region
 * polygons, live from the WFS API. Keyed by the region ids so switching regions
 * hits the cache; `progress` (0–1) drives a loading bar while the six datasets
 * load in parallel. Disabled until at least one region is selected.
 */
export function usePlanningWaterData(regionKeys: string[], polygons: Polygon[]) {
  const [progress, setProgress] = useState(0)

  const query = useQuery({
    queryKey: ["planning-water-data", [...regionKeys].sort()],
    enabled: polygons.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      setProgress(0)
      const data = await fetchRegionWaterData(polygons, (done, total) =>
        setProgress(done / total)
      )
      return { data, summary: summarizeWaterData(data) }
    },
  })

  return { ...query, progress }
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
