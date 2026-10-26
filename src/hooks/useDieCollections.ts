import { useQuery } from "@tanstack/react-query"
import { featuresClient } from "@/clients/ogcFeatures"
import { DIE_FEATURES_BASE_URL } from "@/config"

/** The DIE pygeoapi, through the shared OGC API Features client. */
export const die = featuresClient(DIE_FEATURES_BASE_URL)
const HOUR = 60 * 60 * 1000

/** Every collection the DIE pygeoapi serves, as its /collections describes them. */
export function useDieCollections() {
  return useQuery({
    queryKey: ["die-collections"],
    queryFn: async () => (await die.listCollections()).collections,
    staleTime: HOUR,
  })
}

/** Property names a DIE collection's features carry, from its queryables. */
export function useDieFields(collectionId: string) {
  return useQuery({
    queryKey: ["die-fields", collectionId],
    queryFn: async () =>
      Object.keys((await die.getQueryables(collectionId)).properties ?? {}).filter(
        (k) => k !== "geometry"
      ),
    staleTime: HOUR,
  })
}

/** How many items a DIE collection holds (numberMatched), for download sizing. */
export function useDieCount(collectionId: string, enabled = true) {
  return useQuery({
    queryKey: ["die-count", collectionId],
    queryFn: async () =>
      (await die.getItems(collectionId, { limit: 1, skipGeometry: true })).numberMatched ?? null,
    staleTime: HOUR,
    enabled,
  })
}
