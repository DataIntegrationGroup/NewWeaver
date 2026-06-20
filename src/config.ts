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

/**
 * PostHog product analytics. Disabled unless VITE_POSTHOG_KEY is set, so dev
 * builds and CI emit nothing by default. Host defaults to US cloud; set
 * VITE_POSTHOG_HOST to eu.i.posthog.com (or a reverse proxy) to override.
 */
export const POSTHOG_KEY = env.VITE_POSTHOG_KEY ?? ""

export const POSTHOG_HOST =
  env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com"
