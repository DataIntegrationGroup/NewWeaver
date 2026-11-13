/** Filtered map sites as CSV or GeoJSON, built from the features already loaded. */
import type { Feature, FeatureCollection } from "geojson"

import { firstPosition } from "@/lib/geo"
import { toCsv, type CsvValue } from "./csv"

const LEADING = ["feature_id", "name", "longitude", "latitude"]

function cell(v: unknown): CsvValue {
  if (v == null) return null
  if (typeof v === "object") return JSON.stringify(v)
  return v as CsvValue
}

/** One row per site; columns are the union of property keys, with lon/lat added. */
export function sitesCsv(features: Feature[]): string {
  const keys = new Set<string>()
  for (const f of features) for (const k of Object.keys(f.properties ?? {})) keys.add(k)
  keys.delete("id") // internal key, duplicates feature_id
  const rest = [...keys].filter((k) => !LEADING.includes(k)).sort()
  const headers = [...LEADING, ...rest]
  const rows = features.map((f) => {
    const p = f.properties ?? {}
    const pos = firstPosition(f)
    return headers.map((h) =>
      h === "longitude" ? pos?.[0] : h === "latitude" ? pos?.[1] : cell(p[h])
    )
  })
  return toCsv(headers, rows)
}

/** Filtered sites as GeoJSON, minus the internal `id` property. */
export function sitesGeoJSON(features: Feature[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features.map(({ properties, ...f }) => {
      const props = { ...properties }
      delete props.id
      return { ...f, properties: props }
    }),
  }
}
