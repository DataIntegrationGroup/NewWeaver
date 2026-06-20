import { useIsFetching, useQuery } from "@tanstack/react-query"
import type { FeatureCollection } from "geojson"

import { staClient, type Location } from "@/clients/sensorThings"
import { featuresClient } from "@/clients/ogcFeatures"
import { LAYER_CATALOG, type FeaturesLayer, type StaLayer } from "@/catalog/layers"

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] }

/** Query keys, exported so non-hook code (e.g. export selection) can read the
 *  same cached FeatureCollections the map renders. */
export function staLayerKey(layer: StaLayer) {
  return ["sta", layer.staBaseUrl ?? "default", "locations", layer.query ?? null] as const
}
export function featuresLayerKey(layer: FeaturesLayer) {
  return [
    "features",
    layer.featuresBaseUrl ?? "default",
    layer.collectionId,
    layer.query ?? null,
  ] as const
}

/**
 * Ids of catalog layers whose data query is currently fetching — used to show
 * a per-layer loading spinner while a freshly-toggled layer pulls its data.
 * Iterates the static LAYER_CATALOG so the hook count stays constant across
 * renders (safe despite the loop).
 */
export function useLayerLoading(): Set<string> {
  const loading = new Set<string>()
  for (const layer of LAYER_CATALOG) {
    const queryKey =
      layer.source === "sta" ? staLayerKey(layer) : featuresLayerKey(layer)
    // eslint-disable-next-line react-hooks/rules-of-hooks -- constant-length loop over a static catalog
    if (useIsFetching({ queryKey }) > 0) loading.add(layer.id)
  }
  return loading
}

/** Turn STA Locations into a GeoJSON FeatureCollection for MapLibre. */
function locationsToGeoJSON(locations: Location[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations
      .filter((loc) => loc.location)
      .map((loc) => ({
        type: "Feature",
        geometry: loc.location,
        properties: {
          id: loc["@iot.id"],
          name: loc.name,
          description: loc.description ?? null,
        },
      })),
  }
}

/** Monitoring locations from STA, as GeoJSON points. */
export function useStaLayer(layer: StaLayer) {
  return useQuery({
    queryKey: staLayerKey(layer),
    queryFn: async () => {
      const res = await staClient(layer.staBaseUrl).listLocations(layer.query)
      return locationsToGeoJSON(res.value)
    },
    placeholderData: EMPTY,
  })
}

/** Vector items from an OGC API Features collection, as GeoJSON. */
export function useFeaturesLayer(layer: FeaturesLayer) {
  return useQuery({
    queryKey: featuresLayerKey(layer),
    queryFn: async () => {
      const fc = await featuresClient(layer.featuresBaseUrl).getAllItems(
        layer.collectionId,
        layer.query
      )
      return fc as FeatureCollection
    },
    placeholderData: EMPTY,
  })
}

/** Datastreams available at an STA monitoring location. */
export function useDatastreams(
  locationId: string | undefined,
  staBaseUrl?: string
) {
  return useQuery({
    queryKey: ["sta", staBaseUrl ?? "default", "datastreams", locationId],
    enabled: !!locationId,
    queryFn: () => staClient(staBaseUrl).datastreamsForLocation(locationId!),
  })
}

/** Observations for a datastream, oldest→newest for charting. */
export function useObservations(
  datastreamId: string | number | undefined,
  staBaseUrl?: string
) {
  return useQuery({
    queryKey: ["sta", staBaseUrl ?? "default", "observations", datastreamId],
    enabled: datastreamId !== undefined && datastreamId !== null,
    queryFn: async () => {
      const res = await staClient(staBaseUrl).observationsForDatastream(
        datastreamId!,
        { $orderby: "phenomenonTime asc", $top: 2000 }
      )
      return res.value
    },
  })
}
