/**
 * Client-side geocoding for the Map page (SPEC §T.T3). Two free, key-less
 * services cover each other's gaps — see §C.C7 / config.ts:
 *
 *  - geocodeAddress() tries the US Census geocoder first (precise US street
 *    addresses, via JSONP to dodge its missing CORS headers), then falls back
 *    to Photon for places and non-US matches.
 *  - suggestPlaces() uses Photon's forgiving prefix search for type-ahead.
 *
 * Both bias toward New Mexico without excluding the rest of the world.
 */
import {
  CENSUS_GEOCODER_URL,
  GEOCODER_BIAS,
  PHOTON_GEOCODER_URL,
} from "@/config"

export interface GeocodeResult {
  /** Stable id for list keys. */
  id: string
  /** Longitude, latitude of the match. */
  lng: number
  lat: number
  /** Human-readable label, for the search box and the coverage panel. */
  label: string
}

// --- Photon (OSM) -----------------------------------------------------------

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_id?: number
    osm_type?: string
    name?: string
    housenumber?: string
    street?: string
    city?: string
    district?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
  }
}

interface PhotonResponse {
  features?: PhotonFeature[]
}

/** Compose a compact, human-readable label from a Photon feature's props. */
function labelFor(p: NonNullable<PhotonFeature["properties"]>): string {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ")
  const head = street || p.name || ""
  const tail = [p.city ?? p.district, p.county, p.state, p.country].filter(
    (part): part is string => Boolean(part) && part !== head
  )
  const parts = [head, ...tail].filter(
    (part, i, all) => part && part !== all[i - 1]
  )
  return parts.join(", ")
}

function fromPhoton(f: PhotonFeature, i: number): GeocodeResult | null {
  const c = f.geometry?.coordinates
  const p = f.properties
  if (!c || typeof c[0] !== "number" || typeof c[1] !== "number" || !p) {
    return null
  }
  const label = labelFor(p)
  if (!label) return null
  // Photon can return several features sharing an osm id; suffix the index so
  // list keys stay unique.
  const base =
    p.osm_type && p.osm_id != null ? `${p.osm_type}${p.osm_id}` : "osm"
  return { id: `${base}-${i}`, lng: c[0], lat: c[1], label }
}

async function photonQuery(
  q: string,
  limit: number,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  const [lon, lat] = GEOCODER_BIAS.split(",")
  const url =
    `${PHOTON_GEOCODER_URL}?` +
    new URLSearchParams({
      q,
      limit: String(limit),
      lang: "en",
      // Bias (not restrict) toward NM — out-of-state addresses still resolve.
      lat,
      lon,
    }).toString()

  const res = await fetch(url, { signal })
  if (!res.ok) return []

  const body = (await res.json()) as PhotonResponse
  const seen = new Set<string>()
  return (body.features ?? [])
    .map((f, i) => fromPhoton(f, i))
    .filter((r): r is GeocodeResult => r !== null)
    // Photon often returns the same place several times; keep one per label.
    .filter((r) => !seen.has(r.label) && seen.add(r.label))
}

// --- US Census (JSONP) ------------------------------------------------------

interface CensusResponse {
  result?: {
    addressMatches?: {
      matchedAddress?: string
      coordinates?: { x: number; y: number }
      tigerLine?: { tigerLineId?: string }
    }[]
  }
}

let jsonpSeq = 0

/**
 * Load a JSONP endpoint via a <script> tag. The Census geocoder sends no CORS
 * headers, so a plain fetch is blocked in the browser; JSONP is its documented
 * cross-origin path. Resolves null on error/timeout rather than throwing.
 */
function jsonp<T>(baseUrl: string, timeoutMs = 8000): Promise<T | null> {
  if (typeof document === "undefined") return Promise.resolve(null)
  return new Promise((resolve) => {
    const cb = `__weaver_geo_${jsonpSeq++}`
    const script = document.createElement("script")
    const w = window as unknown as Record<string, unknown>
    const timer = setTimeout(() => finish(null), timeoutMs)
    function finish(value: T | null) {
      clearTimeout(timer)
      delete w[cb]
      script.remove()
      resolve(value)
    }
    w[cb] = (data: T) => finish(data)
    script.onerror = () => finish(null)
    const sep = baseUrl.includes("?") ? "&" : "?"
    script.src = `${baseUrl}${sep}format=jsonp&callback=${cb}`
    document.head.appendChild(script)
  })
}

async function censusGeocode(q: string): Promise<GeocodeResult | null> {
  const url =
    `${CENSUS_GEOCODER_URL}?` +
    new URLSearchParams({
      address: q,
      benchmark: "Public_AR_Current",
    }).toString()

  const body = await jsonp<CensusResponse>(url)
  const m = body?.result?.addressMatches?.[0]
  const c = m?.coordinates
  if (!c || typeof c.x !== "number" || typeof c.y !== "number") return null
  return {
    id: `census-${m?.tigerLine?.tigerLineId ?? q}`,
    lng: c.x,
    lat: c.y,
    label: m?.matchedAddress ?? q,
  }
}

// --- public API -------------------------------------------------------------

/**
 * Type-ahead suggestions for a partial query. Photon drives the prefix search
 * (places + streets), but its OSM data often lacks exact house numbers — so we
 * also fire a Census lookup and, when it resolves a precise street address,
 * prepend it. That puts "812 LEROY PL, SOCORRO, NM" at the top of the list even
 * though Photon only knows the street. Returns up to `limit` matches (empty on
 * no match, blank input, or transport error).
 */
export async function suggestPlaces(
  q: string,
  signal?: AbortSignal,
  limit = 5
): Promise<GeocodeResult[]> {
  const text = q.trim()
  if (!text) return []
  const [photon, census] = await Promise.all([
    photonQuery(text, limit, signal).catch(() => [] as GeocodeResult[]),
    // Only worth a Census call once the query looks like a street address
    // (has a leading house number) — avoids per-keystroke lookups on places.
    /^\s*\d/.test(text) ? censusGeocode(text) : Promise.resolve(null),
  ])
  if (signal?.aborted) return []

  if (!census) return photon
  // Census match goes first; drop any Photon entry at the same spot (its
  // coarse street centroid for the same address).
  const deduped = photon.filter(
    (p) => Math.abs(p.lat - census.lat) > 1e-4 || Math.abs(p.lng - census.lng) > 1e-4
  )
  return [census, ...deduped].slice(0, limit)
}

/**
 * Geocode a free-text address or place to a single best match. Census first for
 * precise US street addresses, then Photon for places / non-US. Resolves null
 * when neither matches or on a transport error.
 */
export async function geocodeAddress(
  address: string,
  signal?: AbortSignal
): Promise<GeocodeResult | null> {
  const text = address.trim()
  if (!text) return null

  const precise = await censusGeocode(text)
  if (precise) return precise
  if (signal?.aborted) return null

  try {
    const matches = await photonQuery(text, 1, signal)
    return matches[0] ?? null
  } catch {
    return null
  }
}
