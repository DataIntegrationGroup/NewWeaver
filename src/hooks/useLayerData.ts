import { useQuery } from "@tanstack/react-query"
import type { FeatureCollection } from "geojson"

import { sta, type Location } from "@/clients/sensorThings"
import { features } from "@/clients/ogcFeatures"
import type { FeaturesLayer, StaLayer } from "@/catalog/layers"

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] }

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
    queryKey: ["sta", "locations", layer.query ?? null],
    queryFn: async () => {
      const res = await sta.listLocations(layer.query)
      return locationsToGeoJSON(res.value)
    },
    placeholderData: EMPTY,
  })
}

/** Vector items from an OGC API Features collection, as GeoJSON. */
export function useFeaturesLayer(layer: FeaturesLayer) {
  return useQuery({
    queryKey: ["features", layer.collectionId, layer.query ?? null],
    queryFn: async () => {
      const fc = await features.getItems(layer.collectionId, layer.query)
      return fc as FeatureCollection
    },
    placeholderData: EMPTY,
  })
}
