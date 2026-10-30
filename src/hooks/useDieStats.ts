/** Home dashboard counts from DIE's pygeoapi. Failures don't toast (see queryClient). */
import { useQuery } from "@tanstack/react-query"

import { OgcFeaturesClient } from "@/clients/ogcFeatures"
import { DIE_FEATURES_BASE_URL } from "@/config"

const die = new OgcFeaturesClient(DIE_FEATURES_BASE_URL)

export interface DieStats {
  datasets: number
}

async function fetchDieStats(): Promise<DieStats> {
  const { collections } = await die.listCollections()
  return { datasets: collections.length }
}

export function useDieStats() {
  return useQuery<DieStats>({
    queryKey: ["die-stats"],
    queryFn: fetchDieStats,
    staleTime: 30 * 60 * 1000,
  })
}
