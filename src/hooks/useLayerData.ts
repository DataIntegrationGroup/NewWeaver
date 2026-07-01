import { useIsFetching, useQuery } from "@tanstack/react-query"
import type { FeatureCollection } from "geojson"

import { staClient, type Location } from "@/clients/sensorThings"
import { featuresClient } from "@/clients/ogcFeatures"
import { arcgisClient } from "@/clients/arcGisRest"
import { wfsClient } from "@/clients/wfsClient"
import { setLoadProgress, clearLoadProgress } from "@/lib/loadProgress"
import {
  LAYER_CATALOG,
  type ArcGisLayer,
  type FeaturesLayer,
  type StaLayer,
  type WfsLayer,
} from "@/catalog/layers"

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
    layer.maxFeatures ?? null,
  ] as const
}
export function arcgisLayerKey(layer: ArcGisLayer) {
  return ["arcgis", layer.serviceUrl, layer.query ?? null] as const
}
export function wfsLayerKey(layer: WfsLayer) {
  return ["wfs", layer.wfsBaseUrl, layer.typeName, layer.query ?? null] as const
}

/** Query key for any catalog layer, dispatching on its source. */
function layerKey(layer: (typeof LAYER_CATALOG)[number]) {
  if (layer.source === "sta") return staLayerKey(layer)
  if (layer.source === "arcgis") return arcgisLayerKey(layer)
  if (layer.source === "wfs") return wfsLayerKey(layer)
  return featuresLayerKey(layer)
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
    const queryKey = layerKey(layer)
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
      const pageSize = 10000
      const maxPages = layer.maxFeatures
        ? Math.max(1, Math.ceil(layer.maxFeatures / pageSize))
        : 100
      try {
        const fc = await featuresClient(layer.featuresBaseUrl).getAllItems(
          layer.collectionId,
          layer.query,
          pageSize,
          maxPages,
          (n) => setLoadProgress(layer.id, n)
        )
        return fc as FeatureCollection
      } finally {
        clearLoadProgress(layer.id)
      }
    },
    placeholderData: EMPTY,
  })
}

/**
 * Ensure every ArcGIS feature carries a stable `properties.id` (and matching
 * top-level `id`) so map selection, highlighting, and the attribute table key
 * features consistently — Esri's GeoJSON may omit `id`. Falls back through the
 * layer's id field, common ObjectID spellings, then the row index.
 */
function arcgisToGeoJSON(fc: FeatureCollection, idField: string): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.map((f, i) => {
      const p = (f.properties ?? {}) as Record<string, unknown>
      const id = String(
        f.id ?? p[idField] ?? p.OBJECTID ?? p.objectid ?? i
      )
      return { ...f, id, properties: { ...p, id } }
    }),
  }
}

/** OSE GIS points from an ArcGIS REST FeatureServer, as GeoJSON. */
export function useArcGisLayer(layer: ArcGisLayer) {
  return useQuery({
    queryKey: arcgisLayerKey(layer),
    queryFn: async () => {
      // Parallel paging: a statewide layer is ~140 pages at the 2000-row cap,
      // so concurrent pages cut load time over serial round trips.
      let fc
      try {
        fc = await arcgisClient(layer.serviceUrl).getAllFeaturesParallel(
          layer.query,
          undefined,
          undefined,
          undefined,
          (n) => setLoadProgress(layer.id, n)
        )
      } finally {
        clearLoadProgress(layer.id)
      }
      const geo = arcgisToGeoJSON(fc, layer.idField ?? "objectid")
      const map = layer.mapProperties
      if (!map) return geo
      return {
        type: "FeatureCollection" as const,
        features: geo.features.map((f) => ({
          ...f,
          properties: map((f.properties ?? {}) as Record<string, unknown>),
        })),
      }
    },
    placeholderData: EMPTY,
  })
}

/**
 * Key every WFS feature by GeoServer's unique top-level `id` (e.g.
 * `nm_arsenic_summary.1`), copying it into `properties.id` too. Map selection
 * reads `properties.id` while the inspector/table read the top-level `id`, so
 * the two must agree — and GeoServer's per-typeName id is the only field
 * guaranteed unique (a layer's own `id` column may repeat or be absent).
 */
function wfsToGeoJSON(fc: FeatureCollection): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.map((f, i) => {
      const p = (f.properties ?? {}) as Record<string, unknown>
      const id = String(f.id ?? p.id ?? i)
      return { ...f, id, properties: { ...p, id } }
    }),
  }
}

/** Vector features from a GeoServer WFS typeName, as GeoJSON. */
export function useWfsLayer(layer: WfsLayer) {
  return useQuery({
    queryKey: wfsLayerKey(layer),
    queryFn: async () => {
      let geo
      try {
        const fc = await wfsClient(layer.wfsBaseUrl).getAllFeatures(
          layer.typeName,
          layer.query,
          undefined,
          undefined,
          (n) => setLoadProgress(layer.id, n)
        )
        geo = wfsToGeoJSON(fc as FeatureCollection)
      } finally {
        clearLoadProgress(layer.id)
      }
      // Applied here (not just at render time) so the table and inspect
      // panel — which read this hook directly — see the same transformed
      // shape as the map, instead of raw GeoServer columns.
      const map = layer.mapProperties
      if (!map) return geo
      return {
        type: "FeatureCollection" as const,
        features: geo.features.map((f) => ({
          ...f,
          properties: map((f.properties ?? {}) as Record<string, unknown>),
        })),
      }
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

/** Things at an STA location, each expanded with its Datastreams + properties. */
export function useStaThings(
  locationId: string | undefined,
  staBaseUrl?: string
) {
  return useQuery({
    queryKey: ["sta", staBaseUrl ?? "default", "things", locationId],
    enabled: !!locationId,
    queryFn: () => staClient(staBaseUrl).thingsForLocation(locationId!),
  })
}

/**
 * Observations for a datastream, oldest→newest for charting. Follows STA's
 * @iot.nextLink across all pages so the full series is plotted, not just the
 * first page. Large `$top` keeps the round-trip count low.
 */
export function useObservations(
  datastreamId: string | number | undefined,
  staBaseUrl?: string
) {
  return useQuery({
    queryKey: ["sta", staBaseUrl ?? "default", "observations", datastreamId],
    enabled: datastreamId !== undefined && datastreamId !== null,
    queryFn: () =>
      staClient(staBaseUrl).observationsPaged(datastreamId!, {
        $orderby: "phenomenonTime asc",
        $top: 2000,
      }),
  })
}
