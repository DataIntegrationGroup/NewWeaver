/**
 * URL-encoded view state. Visible layers, map extent, and the current
 * selection live in the route's search params so any view is a shareable link
 * (weaver-replacement-plan §4 "State in the URL").
 */
import { LAYER_CATALOG } from "@/catalog/layers"
import { REGION_KINDS, type RegionKind } from "@/catalog/regions"

export interface Selection {
  layerId: string
  featureId: string
}

export interface WeaverSearch {
  /** Visible layer ids. Optional in the URL (defaults applied on read). */
  layers?: string[]
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

const DEFAULT_LAYERS = LAYER_CATALOG.filter((l) => l.defaultVisible).map(
  (l) => l.id
)

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined
}

function asNumber(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN
  return Number.isFinite(n) ? n : undefined
}

/** Parse/validate raw search into a typed WeaverSearch (TanStack Router). */
export function validateSearch(raw: Record<string, unknown>): WeaverSearch {
  let layers: string[]
  if (Array.isArray(raw.layers)) {
    layers = raw.layers.filter((x): x is string => typeof x === "string")
  } else if (typeof raw.layers === "string") {
    layers = raw.layers.split(",").filter(Boolean)
  } else {
    layers = DEFAULT_LAYERS
  }

  let regions: string[]
  if (Array.isArray(raw.regions)) {
    regions = raw.regions.filter((x): x is string => typeof x === "string")
  } else if (typeof raw.regions === "string") {
    regions = raw.regions.split(",").filter(Boolean)
  } else {
    regions = []
  }

  return {
    layers,
    lng: asNumber(raw.lng),
    lat: asNumber(raw.lat),
    z: asNumber(raw.z),
    sel: asString(raw.sel),
    bbox: raw.bbox === true || raw.bbox === "true",
    q: asString(raw.q),
    regions,
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
