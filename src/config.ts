/**
 * Upstream service endpoints. v1 reads exactly two public, standards-based
 * interfaces — no per-source code.
 *
 *  - SensorThings API (STA) on FROST — monitoring locations + time series.
 *  - OGC API Features on DIE's pygeoapi — vector / integrated collections.
 *
 * Override at build time with VITE_STA_BASE_URL / VITE_FEATURES_BASE_URL.
 */

// Read import.meta.env defensively so the clients also import cleanly under
// Node (cucumber-js step defs), where import.meta.env is undefined.
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {}

export const STA_BASE_URL =
  env.VITE_STA_BASE_URL ??
  "https://sta.newmexicowaterdata.org/FROST/v1.1"

// Secondary STA server (FROST), "st2", hosting CABQ, BernCo, OSE and other
// agency monitoring data. Same protocol, different deployment/path.
export const STA_ST2_BASE_URL =
  env.VITE_STA_ST2_BASE_URL ??
  "https://st2.newmexicowaterdata.org/FROST-Server/v1.1"

// DIE pygeoapi base. Placeholder until Phase 1 stands up the public endpoint
// (DIE is command-line only today — see weaver-replacement-plan §5).
export const FEATURES_BASE_URL =
  env.VITE_FEATURES_BASE_URL ??
  "https://features.newmexicowaterdata.org"

// Ocotillo pygeoapi — a second OGC API Features deployment hosting New Mexico
// water-data collections (wells, springs, surface water, chemistry). Same
// protocol as FEATURES_BASE_URL, different host/path.
export const OCOTILLO_FEATURES_BASE_URL =
  env.VITE_OCOTILLO_FEATURES_BASE_URL ??
  "https://ocotillo-api.newmexicowaterdata.org/ogcapi"

// OSE GIS — New Mexico Office of the State Engineer ArcGIS REST services
// (Points of Diversion, Aquifer Test Wells). A single Esri FeatureServer host;
// each layer appends its own service path. Same protocol, different host.
export const OSE_ARCGIS_BASE_URL =
  env.VITE_OSE_ARCGIS_BASE_URL ??
  "https://services2.arcgis.com/qXZbWTdPDbTjl7Dy/arcgis/rest/services"

// USGS Water Data for the Nation — the modern NWIS replacement, served as an
// OGC API Features endpoint (same protocol as the DIE/Ocotillo pygeoapi). The
// `monitoring-locations` collection carries NWIS sites; we read it through the
// shared OgcFeaturesClient.
export const USGS_OGC_BASE_URL =
  env.VITE_USGS_OGC_BASE_URL ?? "https://api.waterdata.usgs.gov/ogcapi/v0"

/**
 * PostHog product analytics. Disabled unless VITE_POSTHOG_KEY is set, so dev
 * builds and CI emit nothing by default. Host defaults to US cloud; set
 * VITE_POSTHOG_HOST to eu.i.posthog.com (or a reverse proxy) to override.
 */
/**
 * Nightly statistics JSON, built by DIE and published read-only to GCP (SPEC
 * §I.stats-json / §T.T11b). The home dashboard reads counts (services/datasets/
 * sites) and a source-update activity feed from this single file — Weaver itself
 * computes none of it, preserving the client-only constraint (§C.C2). Unset by
 * default so dev/CI never depend on a live file; the dashboard falls back to
 * locally-derived counts and an empty feed when it is absent (§V.V13, §V.V14).
 */
export const STATS_URL = env.VITE_STATS_URL ?? ""

export const POSTHOG_KEY = env.VITE_POSTHOG_KEY ?? ""

export const POSTHOG_HOST =
  env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com"

/**
 * Geocoding for the Map page's location search (SPEC §C.C7 / §T.T3). Two free,
 * key-less services, each covering the other's gap:
 *
 *  - US Census Geocoder — authoritative US street-address coverage (TIGER house
 *    numbers Photon's OSM data often lacks). Sends no CORS headers, so we call
 *    it via JSONP. US street addresses only — no places, no autocomplete.
 *  - Photon (komoot/OSM) — CORS-enabled, matches *places* (cities, landmarks)
 *    and supports forgiving prefix search. Drives the type-ahead suggestions
 *    and is the fallback when Census finds no street match.
 *
 * Submit tries Census first (precise), then falls back to Photon.
 */
export const CENSUS_GEOCODER_URL =
  env.VITE_CENSUS_GEOCODER_URL ??
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"

export const PHOTON_GEOCODER_URL =
  env.VITE_PHOTON_GEOCODER_URL ?? "https://photon.komoot.io/api"

/**
 * Center used to *bias* (not restrict) Photon results toward New Mexico, as
 * "lng,lat". A query like "Springer" prefers the NM town, but a real address
 * elsewhere (e.g. Guilford CT) still resolves — unlike a hard bbox filter.
 */
export const GEOCODER_BIAS =
  env.VITE_GEOCODER_BIAS ?? "-106.0,34.5"
