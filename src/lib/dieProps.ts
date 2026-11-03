import type { FeatureCollection } from "geojson"

/**
 * DIE pygeoapi returns typed JSON (numbers, booleans, null), but a few
 * missing values arrive as "" or "None" (e.g. `usgs_site_id: ""`). Normalizing
 * those to null on load means a missing value is never mistaken for a value:
 * facet bins, MapLibre expressions and the table all see null.
 */

const MISSING = new Set(["None", "none", "nan", "NaN", "null", ""])

/** One DIE property value with missing markers turned into null. */
export function normalizeDieValue(v: unknown): unknown {
  return typeof v === "string" && MISSING.has(v.trim()) ? null : v
}

/** Years between two ISO dates, to one decimal; null if either is missing. */
export function spanYears(start: unknown, end: unknown): number | null {
  if (typeof start !== "string" || typeof end !== "string") return null
  const ms = Date.parse(end) - Date.parse(start)
  if (!Number.isFinite(ms)) return null
  return Math.round((ms / (365.25 * 24 * 3600 * 1000)) * 10) / 10
}

/**
 * A DIE feature's properties with missing values as null. Drops `bbox` (a
 * stringified dict, redundant with the geometry). Summary products also get
 * `span_years`, the length of the record, from earliest_date / latest_date.
 */
export function normalizeDieProps(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) {
    if (k === "bbox") continue
    out[k] = normalizeDieValue(v)
  }
  if ("earliest_date" in out && "latest_date" in out) {
    out.span_years = spanYears(out.earliest_date, out.latest_date)
  }
  return out
}

/**
 * Copy `fields` from each joined collection onto the base sites with the same
 * `feature_id`. Sites missing from a join get `null` for its fields, so every
 * site carries the same keys.
 */
export function joinByFeatureId(
  base: FeatureCollection,
  joins: { fc: FeatureCollection; fields: string[] }[]
): FeatureCollection {
  if (joins.length === 0) return base
  const lookups = joins.map(({ fc, fields }) => ({
    fields,
    byId: new Map(fc.features.map((f) => [f.properties?.feature_id, f.properties ?? {}])),
  }))
  return {
    type: "FeatureCollection",
    features: base.features.map((f) => {
      const properties = { ...f.properties }
      for (const { fields, byId } of lookups) {
        const row = byId.get(properties.feature_id)
        for (const k of fields) properties[k] = row?.[k] ?? null
      }
      return { ...f, properties }
    }),
  }
}
