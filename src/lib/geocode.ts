/**
 * Client-side address geocoding via the US Census Geocoder (SPEC §T.T3).
 *
 * Free, key-less, public-domain, US-only — a good fit for New Mexico addresses
 * and for Weaver's "no backend" constraint (§C.C2). Returns a single best match
 * or null when nothing geocodes.
 */
import { CENSUS_GEOCODER_URL } from "@/config"

export interface GeocodeResult {
  /** Longitude, latitude of the matched address. */
  lng: number
  lat: number
  /** Human-readable matched address, for echoing back to the user. */
  label: string
}

interface CensusResponse {
  result?: {
    addressMatches?: {
      matchedAddress?: string
      coordinates?: { x: number; y: number }
    }[]
  }
}

/** Geocode a free-text address. Resolves null on no match or a transport error. */
export async function geocodeAddress(
  address: string,
  signal?: AbortSignal
): Promise<GeocodeResult | null> {
  const q = address.trim()
  if (!q) return null

  const url =
    `${CENSUS_GEOCODER_URL}?` +
    new URLSearchParams({
      address: q,
      benchmark: "Public_AR_Current",
      format: "json",
    }).toString()

  const res = await fetch(url, { signal })
  if (!res.ok) return null

  const body = (await res.json()) as CensusResponse
  const match = body.result?.addressMatches?.[0]
  const c = match?.coordinates
  if (!c || typeof c.x !== "number" || typeof c.y !== "number") return null

  return { lng: c.x, lat: c.y, label: match?.matchedAddress ?? q }
}
