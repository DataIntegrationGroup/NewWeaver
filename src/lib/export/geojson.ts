/**
 * Features export: a GeoJSON inventory of the selection. STA things become
 * point features carrying their datastreams in properties (no observations);
 * OGC API Features pass through unchanged. See features/export/design.md.
 */
import type { Feature, FeatureCollection, Geometry } from "geojson"

import { staClient } from "@/clients/sensorThings"
import type { Selection } from "@/lib/selection"
import type { GatherOpts } from "./timeSeries"

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError")
}

/** Build the features GeoJSON for a resolved selection. */
export async function buildFeaturesGeoJSON(
  selection: Selection,
  opts: Pick<GatherOpts, "signal" | "onProgress"> = {}
): Promise<FeatureCollection<Geometry | null>> {
  const features: Feature<Geometry | null>[] = []
  const total = selection.locations.length
  let done = 0

  for (const loc of selection.locations) {
    throwIfAborted(opts.signal)
    const datastreams = await staClient(loc.staBaseUrl).datastreamsForLocation(loc.id)
    features.push({
      type: "Feature",
      geometry:
        loc.longitude != null && loc.latitude != null
          ? { type: "Point", coordinates: [loc.longitude, loc.latitude] }
          : null,
      properties: {
        ...loc.properties,
        location_id: loc.id,
        name: loc.name,
        datastreams: datastreams.map((d) => ({
          id: d["@iot.id"],
          name: d.name,
          unit: d.unitOfMeasurement?.symbol,
          observationType: d.observationType,
          phenomenonTime: d.phenomenonTime,
        })),
      },
    })
    opts.onProgress?.(++done, total)
  }

  // OGC API Features pass through with original geometry + properties.
  for (const sf of selection.features) features.push(sf.feature)

  return { type: "FeatureCollection", features }
}
