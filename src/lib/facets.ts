/**
 * Facets: a site property split into ordered bins, each with a live count.
 * Facets are both the map's filters (tick bins to keep) and its legend: the
 * facet picked as "color by" draws its bins' colors on the map. One
 * definition drives the JS side (filtering, counts) and the MapLibre side
 * (`binExpr`), so the two can't disagree about which bin a site is in.
 *
 * Values are expected to be typed (see lib/dieProps): numeric bins match
 * numbers only, string bins match strings only (ISO dates sort as strings, so
 * date bins need no date parsing inside MapLibre), and `value` bins match a
 * categorical string exactly. A site matching no bin is "No value" (-1).
 */
import type { Feature } from "geojson"

export interface Bin {
  label: string
  color: string
  /** Exact categorical match. */
  value?: string
  /** Lower bound, inclusive. Omit for open-ended. */
  min?: number | string
  /** Upper bound, exclusive. Omit for open-ended. */
  max?: number | string
  /** A "not much to see here" bin: drawn beneath the others. */
  muted?: boolean
  /** URL key, for bins whose position isn't stable between loads. */
  key?: string
}

export interface Facet {
  /** Short, stable key; used in the URL. */
  id: string
  label: string
  /** What the bins measure, shown above them when this facet is the legend. */
  title?: string
  field: string
  bins: Bin[]
  /** Draw the first bin on top (default: the last bin draws on top). */
  firstOnTop?: boolean
  /** False for facets that filter but can't sensibly color the map. */
  colorable?: boolean
}

/** How a facet's bins are made. Fixed bins are written out; the others are
 *  built from the loaded data by `resolveFacet`. */
export type FacetSpec = Omit<Facet, "bins"> &
  (
    | { bins: Bin[] }
    | {
        quantiles: {
          count: number
          ramp: string[]
          /** Unit for the bin labels, or the field each site carries it in. */
          unit?: string
          unitField?: string
        }
      }
    | { categories: { palette: string[]; label?: (value: string) => string } }
  )

/** Index of the "No value" bin in selections and counts. */
export const NO_VALUE = -1
export const NO_VALUE_BIN: Bin = { label: "No value", color: "#9ca3af", muted: true }

/** Ticked bins per facet id. A facet that's absent or empty keeps every site. */
export type FacetSelections = Record<string, number[]>

function inRange<T extends number | string>(v: T, min?: T, max?: T): boolean {
  return (min === undefined || v >= min) && (max === undefined || v < max)
}

function isStringBin(b: Bin): boolean {
  return typeof b.min === "string" || typeof b.max === "string"
}

/** Which bin a feature falls in, or NO_VALUE. */
export function binIndex(f: Feature, facet: Facet): number {
  const v = f.properties?.[facet.field]
  return facet.bins.findIndex((b) => {
    if (b.value !== undefined) return v === b.value
    if (isStringBin(b)) {
      return typeof v === "string" && inRange(v, b.min as string, b.max as string)
    }
    return typeof v === "number" && inRange(v, b.min as number, b.max as number)
  })
}

/**
 * MapLibre `case` expression mirroring `binIndex`: each bin's `out`, else
 * `fallback`. Type checks stand in for null guards: `to-number` would turn a
 * missing value into 0 and drop it in the lowest bin.
 */
export function binExpr(
  facet: Facet,
  out: (b: Bin, i: number) => unknown,
  fallback: unknown
): unknown[] {
  const get = ["get", facet.field]
  const cases = facet.bins.flatMap((b, i) => {
    if (b.value !== undefined) return [["==", get, b.value], out(b, i)]
    const type = isStringBin(b) ? "string" : "number"
    const test: unknown[] = ["all", ["==", ["typeof", get], type]]
    if (b.min !== undefined) test.push([">=", get, b.min])
    if (b.max !== undefined) test.push(["<", get, b.max])
    return [test, out(b, i)]
  })
  return ["case", ...cases, fallback]
}

/** MapLibre paint/layout for coloring points by `facet`: `circle-color`, and
 *  a `circle-sort-key` that sinks muted bins and "No value" beneath the rest. */
export function facetStyle(facet: Facet) {
  const n = facet.bins.length
  return {
    color: binExpr(facet, (b) => b.color, NO_VALUE_BIN.color),
    sortKey: binExpr(
      facet,
      (b, i) => (b.muted ? 0 : facet.firstOnTop ? n - i : i + 1),
      0
    ),
  }
}

/** Round to `digits` significant figures, for readable bin edges. */
export function roundSig(n: number, digits = 2): number {
  if (n === 0 || !Number.isFinite(n)) return n
  return Number(n.toPrecision(digits))
}

function fmtEdge(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 })
}

/**
 * `count` quantile bins over `values`, with edges rounded to 2 significant
 * figures. Repeated edges collapse (a mostly-zero analyte gets fewer bins), and
 * the ramp is sampled across however many bins remain.
 */
export function quantileBins(
  values: number[],
  count: number,
  ramp: string[],
  unit?: string
): Bin[] {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return []
  const edges: number[] = []
  for (let k = 1; k < count; k++) {
    const e = roundSig(sorted[Math.floor((sorted.length * k) / count)])
    if (e > sorted[0] && (edges.length === 0 || e > edges[edges.length - 1])) edges.push(e)
  }
  const u = unit ? ` ${unit}` : ""
  const n = edges.length + 1
  const color = (i: number) => ramp[n === 1 ? ramp.length - 1 : Math.round((i * (ramp.length - 1)) / (n - 1))]
  return Array.from({ length: n }, (_, i) => {
    const min = i === 0 ? undefined : edges[i - 1]
    const max = i === n - 1 ? undefined : edges[i]
    const label =
      min === undefined && max === undefined
        ? `All values${u}`
        : min === undefined
          ? `Under ${fmtEdge(max!)}${u}`
          : max === undefined
            ? `${fmtEdge(min)}${u} and over`
            : `${fmtEdge(min)}–${fmtEdge(max)}${u}`
    // Keyed by edges: a monthly refresh moves them, and a shared link
    // shouldn't silently start meaning a different range.
    return { label, color: color(i), min, max, key: `${min ?? ""}~${max ?? ""}` }
  })
}

/** One bin per distinct string value, most common first. Colors come from the
 *  palette in order; values past the end of the palette share its last color. */
export function categoryBins(
  features: Feature[],
  field: string,
  palette: string[],
  label: (value: string) => string = (v) => v
): Bin[] {
  const counts = new Map<string, number>()
  for (const f of features) {
    const v = f.properties?.[field]
    if (typeof v === "string") counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value], i) => ({
      value,
      label: label(value),
      color: palette[Math.min(i, palette.length - 1)],
    }))
}

/** The most common string value of `field`, if any. */
function mostCommon(features: Feature[], field: string): string | undefined {
  return categoryBins(features, field, [""])[0]?.value
}

/** A facet with its bins filled in from the loaded features. */
export function resolveFacet(spec: FacetSpec, features: Feature[]): Facet {
  if ("bins" in spec) return spec
  if ("quantiles" in spec) {
    const { quantiles: q, ...rest } = spec
    const values = features.flatMap((f) => {
      const v = f.properties?.[spec.field]
      return typeof v === "number" ? [v] : []
    })
    const unit = q.unit ?? (q.unitField ? mostCommon(features, q.unitField) : undefined)
    return { ...rest, bins: quantileBins(values, q.count, q.ramp, unit) }
  }
  const { categories: c, ...rest } = spec
  return { ...rest, bins: categoryBins(features, spec.field, c.palette, c.label) }
}

/** Keep features whose bin is ticked in every facet with a selection. */
export function matchesFacets(
  f: Feature,
  facets: Facet[],
  selections: FacetSelections
): boolean {
  return facets.every((facet) => {
    const sel = selections[facet.id]
    return !sel || sel.length === 0 || sel.includes(binIndex(f, facet))
  })
}

/**
 * Per-facet bin counts, faceted-search style: each facet is counted with
 * every other facet's selection applied but not its own, so unticking a bin
 * doesn't zero that bin's count. Each facet's array holds one count per bin,
 * then "No value" last. `matching` is the features passing every facet, from
 * the same pass.
 */
export function facetCounts(
  features: Feature[],
  facets: Facet[],
  selections: FacetSelections
): { counts: number[][]; matching: Feature[] } {
  const counts = facets.map((facet) => new Array<number>(facet.bins.length + 1).fill(0))
  const matching: Feature[] = []
  const idx = new Array<number>(facets.length)
  for (const f of features) {
    let failed = -1
    let failures = 0
    for (let k = 0; k < facets.length; k++) {
      idx[k] = binIndex(f, facets[k])
      const sel = selections[facets[k].id]
      if (sel && sel.length > 0 && !sel.includes(idx[k])) {
        failures++
        failed = k
      }
    }
    if (failures > 1) continue
    if (failures === 0) matching.push(f)
    for (let k = 0; k < facets.length; k++) {
      if (failures === 1 && k !== failed) continue
      const i = idx[k] === NO_VALUE ? facets[k].bins.length : idx[k]
      counts[k][i]++
    }
  }
  return { counts, matching }
}

/**
 * Stable key for a bin, for the URL: its own `key` (quantile edges), a
 * categorical bin's value, a fixed range bin's position, or "none". Bins
 * built from the data can shift position between loads; these keys can't.
 */
export function binKey(facet: Facet, i: number): string {
  if (i === NO_VALUE) return "none"
  const b = facet.bins[i]
  return b.key ?? b.value ?? String(i)
}

/** URL bin keys per facet → bin indexes, dropping keys that no longer exist. */
export function selectionsFromKeys(
  facets: Facet[],
  keys: Record<string, string[]> | undefined
): FacetSelections {
  const out: FacetSelections = {}
  for (const facet of facets) {
    const sel = keys?.[facet.id]
    if (!sel?.length) continue
    const idx = facet.bins.map((_, i) => i).filter((i) => sel.includes(binKey(facet, i)))
    if (sel.includes("none")) idx.push(NO_VALUE)
    if (idx.length) out[facet.id] = idx
  }
  return out
}

/**
 * Flip one bin in a facet's selection. An empty selection means every bin is
 * on, so the first untick selects all the others; ticking the last one back
 * returns to empty. "No value" counts as a bin, so unticking a colored bin
 * keeps sites without a value.
 */
export function toggleBin(facet: Facet, selected: number[], i: number): number[] {
  const all = [...facet.bins.map((_, k) => k), NO_VALUE]
  const current = selected.length ? selected : all
  const next = current.includes(i) ? current.filter((k) => k !== i) : [...current, i]
  return all.every((k) => next.includes(k)) ? [] : next
}
