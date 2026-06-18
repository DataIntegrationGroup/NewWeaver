/**
 * Upstream service endpoints. v1 reads exactly two public, standards-based
 * interfaces — no per-source code.
 *
 *  - SensorThings API (STA) on FROST — monitoring locations + time series.
 *  - OGC API Features on DIE's pygeoapi — vector / integrated collections.
 *
 * Override at build time with VITE_STA_BASE_URL / VITE_FEATURES_BASE_URL.
 */

export const STA_BASE_URL =
  import.meta.env.VITE_STA_BASE_URL ??
  "https://sta.newmexicowaterdata.org/FROST/v1.1"

// DIE pygeoapi base. Placeholder until Phase 1 stands up the public endpoint
// (DIE is command-line only today — see weaver-replacement-plan §5).
export const FEATURES_BASE_URL =
  import.meta.env.VITE_FEATURES_BASE_URL ??
  "https://features.newmexicowaterdata.org"
