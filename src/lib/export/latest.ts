/**
 * Latest-observation export: one row per selected datastream, carrying its
 * single most-recent observation. See features/export/design.md.
 */
import { staClient } from "@/clients/sensorThings"
import type { SelectedLocation } from "@/lib/selection"
import { toCsv, type CsvValue } from "./csv"
import type { GatherOpts } from "./timeSeries"

export const LATEST_HEADERS = [
  "location_id",
  "location_name",
  "longitude",
  "latitude",
  "datastream_id",
  "datastream_name",
  "unit",
  "phenomenon_time",
  "result",
  "result_time",
]

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError")
}

/** One row per datastream with its newest observation (blank if none). */
export async function gatherLatestRows(
  locations: SelectedLocation[],
  opts: Pick<GatherOpts, "signal" | "onProgress"> = {}
): Promise<CsvValue[][]> {
  const rows: CsvValue[][] = []
  let done = 0

  for (const loc of locations) {
    throwIfAborted(opts.signal)
    const client = staClient(loc.staBaseUrl)
    const datastreams = await client.datastreamsForLocation(loc.id)
    for (const ds of datastreams) {
      throwIfAborted(opts.signal)
      const o = await client.latestObservation(ds["@iot.id"])
      rows.push([
        loc.id,
        loc.name,
        loc.longitude,
        loc.latitude,
        String(ds["@iot.id"]),
        ds.name,
        ds.unitOfMeasurement?.symbol ?? "",
        o?.phenomenonTime ?? "",
        o?.result ?? "",
        o?.resultTime ?? "",
      ])
    }
    opts.onProgress?.(++done, locations.length)
  }
  return rows
}

export function latestCsv(rows: CsvValue[][]): string {
  return toCsv(LATEST_HEADERS, rows)
}
