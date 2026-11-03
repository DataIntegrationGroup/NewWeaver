/**
 * URL-encoded view state. The map dataset, map extent, and the current
 * selection live in the route's search params so any view is a shareable link
 * (weaver-replacement-plan §4 "State in the URL").
 */
import { DEFAULT_DATASET_ID } from "@/catalog/mapDatasets"
import { REGION_KINDS, type RegionKind } from "@/catalog/regions"

export interface Selection {
  layerId: string
  featureId: string
}

export interface WeaverSearch {
  /** Map dataset id (catalog/mapDatasets). Defaults to Water Levels; an id
   *  /collections doesn't list falls back to it on the map. */
  ds?: string
  /** Color-by facet id; the dataset's default when absent. */
  color?: string
  /** Ticked bins per facet id, as bin keys (lib/facets `binKey`). */
  f?: Record<string, string[]>
  /** Map center + zoom. */
  lng?: number
  lat?: number
  z?: number
  /** Selected feature, encoded "<layerId>~<featureId>". */
  sel?: string
  /** Restrict data to the current map extent. */
  bbox?: boolean
  /** Free-text attribute filter. */
  q?: string
  /** Selected regions of interest, each encoded "<kind>:<id>". */
  regions?: string[]
}

export interface RegionRef {
  kind: RegionKind
  id: string
}

const DATASET_ID = /^[a-z0-9-]+$/

/** `{ facetId: ["key", …] }`, dropping anything malformed or empty. */
function asFacetKeys(v: unknown): Record<string, string[]> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined
  const out: Record<string, string[]> = {}
  for (const [k, keys] of Object.entries(v)) {
    const list = asList(keys)
    if (list.length) out[k] = list
  }
  return Object.keys(out).length ? out : undefined
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string")
  if (typeof v === "string") return v.split(",").filter(Boolean)
  return []
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined
}

function asNumber(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN
  return Number.isFinite(n) ? n : undefined
}

/** Parse/validate raw search into a typed WeaverSearch (TanStack Router). */
export function validateSearch(raw: Record<string, unknown>): WeaverSearch {
  // A dataset id wins (checked against /collections on the map, which isn't
  // loaded yet); else Water Levels.
  const ds = DATASET_ID.test(asString(raw.ds) ?? "") ? (raw.ds as string) : DEFAULT_DATASET_ID

  return {
    ds,
    color: asString(raw.color),
    f: asFacetKeys(raw.f),
    lng: asNumber(raw.lng),
    lat: asNumber(raw.lat),
    z: asNumber(raw.z),
    sel: asString(raw.sel),
    bbox: raw.bbox === true || raw.bbox === "true",
    q: asString(raw.q),
    regions: asList(raw.regions),
  }
}

export function encodeSelection(sel: Selection): string {
  return `${sel.layerId}~${sel.featureId}`
}

export function decodeSelection(sel: string | undefined): Selection | undefined {
  if (!sel) return undefined
  const i = sel.indexOf("~")
  if (i < 0) return undefined
  return { layerId: sel.slice(0, i), featureId: sel.slice(i + 1) }
}

export function encodeRegionRef(kind: RegionKind, id: string): string {
  return `${kind}:${id}`
}

function decodeRegionRef(token: string): RegionRef | undefined {
  const i = token.indexOf(":")
  if (i < 0) return undefined
  const kind = token.slice(0, i) as RegionKind
  const id = token.slice(i + 1)
  if (!REGION_KINDS.includes(kind) || !id) return undefined
  return { kind, id }
}

/** Decode the URL's region tokens, dropping duplicates and malformed entries. */
export function decodeRegionRefs(regions: string[] | undefined): RegionRef[] {
  if (!regions?.length) return []
  const seen = new Set<string>()
  const out: RegionRef[] = []
  for (const token of regions) {
    const ref = decodeRegionRef(token)
    if (!ref) continue
    const key = encodeRegionRef(ref.kind, ref.id)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(ref)
  }
  return out
}
