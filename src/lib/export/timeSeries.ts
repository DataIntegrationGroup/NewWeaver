/**
 * Time-series export: gather observations across all selected datastreams and
 * flatten them into one long / tidy table (one row per observation). See
 * features/export/design.md.
 */
import { staClient } from "@/clients/sensorThings"
import type { SelectedLocation } from "@/lib/selection"
import { toCsv, type CsvValue } from "./csv"

export const TIME_SERIES_HEADERS = [
  "location_id",
  "location_name",
  "longitude",
  "latitude",
  "datastream_id",
  "datastream_name",
  "unit",
  "phenomenon_time",
  "result",
]

/** Inclusive date range, `YYYY-MM-DD` (blank bound = open-ended). */
export interface TimeRange {
  from?: string
  to?: string
}

function phenomenonTimeFilter(range?: TimeRange): string | undefined {
  if (!range) return undefined
  const clauses: string[] = []
  if (range.from) clauses.push(`phenomenonTime ge ${range.from}T00:00:00Z`)
  if (range.to) clauses.push(`phenomenonTime le ${range.to}T23:59:59Z`)
  return clauses.length ? clauses.join(" and ") : undefined
}

export interface GatherOpts {
  range?: TimeRange
  signal?: AbortSignal
  /** Reports progress per location processed. */
  onProgress?: (done: number, total: number) => void
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError")
}

/** Long-format rows for every observation across the selected locations. */
export async function gatherTimeSeriesRows(
  locations: SelectedLocation[],
  opts: GatherOpts = {}
): Promise<CsvValue[][]> {
  const rows: CsvValue[][] = []
  const $filter = phenomenonTimeFilter(opts.range)
  let done = 0

  for (const loc of locations) {
    throwIfAborted(opts.signal)
    const client = staClient(loc.staBaseUrl)
    const datastreams = await client.datastreamsForLocation(loc.id)
    for (const ds of datastreams) {
      throwIfAborted(opts.signal)
      const observations = await client.observationsPaged(ds["@iot.id"], {
        $orderby: "phenomenonTime asc",
        $top: 1000,
        $filter,
      })
      const unit = ds.unitOfMeasurement?.symbol ?? ""
      for (const o of observations) {
        rows.push([
          loc.id,
          loc.name,
          loc.longitude,
          loc.latitude,
          String(ds["@iot.id"]),
          ds.name,
          unit,
          o.phenomenonTime,
          o.result,
        ])
      }
    }
    opts.onProgress?.(++done, locations.length)
  }
  return rows
}

export function timeSeriesCsv(rows: CsvValue[][]): string {
  return toCsv(TIME_SERIES_HEADERS, rows)
}
