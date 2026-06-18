# Feature specs

Behaviour specs for NewWeaver, written in Gherkin. These define the v1 surface
**before** implementation — they are the contract the app is built against.

NewWeaver is a **public, read-only, frontend-only** app. It has no backend of
its own; it reads two public, standards-based services:

- **OGC API Features** — DIE's pygeoapi (vector / integrated collections)
- **SensorThings API (STA)** — FROST (monitoring locations + time series)

## Layer tags

Because there is no owned backend, the split is:

- `@frontend` — UI / map / browser interaction (driven via Playwright + cucumber-js)
- `@client` — contracts for the two data adapters the app *does* own
  (`OgcFeaturesClient`, `SensorThingsClient`): request shape, paging, error
  handling, against the upstream APIs (mocked in CI)

Other tags: `@smoke` (core happy paths), `@regression` (full suite),
`@wip` (in progress — remove before merge).

## Runner

`@cucumber/cucumber` (cucumber-js, TypeScript), two profiles with disjoint
step/support dirs (each registers its own World):

- **`pnpm test:bdd`** — default profile, `@client`. Steps in `features/steps/`.
  Headless, mocked `fetch`, no browser. Runs anywhere.
- **`pnpm test:bdd:frontend`** — `frontend` profile, `@frontend`. Steps in
  `features/steps-frontend/`. Drives the real UI in **Chromium via Playwright**
  with STA/Features calls mocked from `features/steps-frontend/support/fixtures.ts`.
  The World starts a Vite dev server + browser. Prereqs (once):

  ```bash
  pnpm install
  pnpm exec playwright install chromium
  ```

  Map interactions use a small test seam (`window.__weaver*`) the app exposes,
  so selection/extent are deterministic without driving the WebGL canvas.
  `@skip`-tagged scenarios are excluded.

## Scope

In scope (v1): interactive map; layer catalog + toggles; STA monitoring points →
datastreams → time-series chart; Features vector layers → inspect panel +
attribute table; bbox/text spatial filtering; shareable URL state.

Out of scope (v1): authentication / accounts, editing / ingest UI,
raster / WMS / coverage display, any source not reachable via OGC Features or STA.

v1 datasets: manual + continuous water-level measurements, water-levels summary,
latest_tds.
