# Weaver (NewWeaver)

A modern, public, read-only web app that displays New Mexico water data through
standards-based service layers — no source-specific code.

- **OGC API Features** (pygeoapi; also USGS Water Data for the Nation) —
  vector / integrated collections
- **OGC SensorThings API** (FROST) — monitoring locations + time series,
  spanning a primary server and the `st2` agency-networks server
- **OGC WFS** (GeoServer) — per-location integrated summary products
- **ArcGIS REST** (Esri Feature Services) — OSE Points of Diversion and
  Aquifer Test Wells

This is a display surface only: no authentication, no accounts, no private
data, no editing/ingest. See `weaver-replacement-plan` for full scope.

> Replaces the legacy Weaver at weaver.newmexicowaterdata.org.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite + TypeScript |
| UI | DataServicesDesignSystem (vendored shadcn components in `src/components`) |
| Server state | TanStack Query |
| Routing | TanStack Router (view state encoded in the URL) |
| Tables | TanStack Table |
| Map | MapLibre GL via react-map-gl (token-free basemap) |
| Charts | ECharts (datastream observation plots) |
| Data clients | thin typed OGC API Features, SensorThings, WFS, and ArcGIS REST clients |

## Architecture

Four data adapters, one map, a config-driven layer catalog, detail/inspect views.

- `src/clients/ogcFeatures.ts` — `OgcFeaturesClient` (pygeoapi, USGS OGC API)
- `src/clients/sensorThings.ts` — `SensorThingsClient` (FROST STA)
- `src/clients/wfsClient.ts` — `WfsClient` (GeoServer WFS summary products)
- `src/clients/arcGisRest.ts` — ArcGIS REST client (OSE Feature Services)
- `src/catalog/layers.ts` — the layer registry; adding a dataset = a new entry
- `src/components/app/` — app shell, map view, layer list, panels
- `src/config.ts` — upstream endpoints (override via `VITE_*` env vars). STA
  is one protocol but may span multiple FROST servers (primary FROST + the
  `st2` server hosting CABQ); a catalog layer targets one via `staBaseUrl`.

No backend of its own: static hosting + the upstream APIs (all must have CORS
enabled for the public origin; the GeoServer WFS is proxied same-origin because
it sends no CORS headers — see `vite.config.ts` / nginx).

### Design system

UI components are **vendored** from
[DataServicesDesignSystem](https://github.com/DataIntegrationGroup/DataServicesDesignSystem)
(shadcn source). The canonical components live there — including the MapLibre
`Map` primitive in `src/components/ui/map.tsx`. Pull updates with the shadcn
registry / by re-copying.

## Specs first

Behaviour is defined as Gherkin in [`features/`](features/) before
implementation. See [`features/README.md`](features/README.md). Run with
`npm run test:bdd`.

## Develop

```bash
pnpm install
pnpm dev         # Vite dev server
pnpm build       # typecheck + production build
pnpm lint
```

## Status

Phase 2–3: app shell + basemap + typed data clients + config-driven layer
catalog (incl. all st2 agencies); catalog layers render on the map via TanStack
Query. Implemented: feature/point selection → inspect panel, monitoring point →
datastreams → ECharts time-series, TanStack attribute table (sort/paginate, row
↔ map selection), text + map-extent filtering, and full URL-encoded view state
(layers, extent, selection — shareable + Back-navigable).

Specs: `@client` adapter contracts pass headless (`pnpm test:bdd`). The
`@frontend` specs drive the real UI in Chromium via Playwright with mocked APIs
(`pnpm test:bdd:frontend`) — see [features/README.md](features/README.md).

> Upstream data plumbing (Aqueduct → FROST; DIE → pygeoapi) is **referenced
> only** — it lives in other repos and is out of scope here.
