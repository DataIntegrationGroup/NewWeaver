# Weaver (NewWeaver)

A modern, public, read-only web app that displays New Mexico water data through
two standards-based service layers — no source-specific code.

- **OGC API Features** (DIE's pygeoapi) — vector / integrated collections
- **OGC SensorThings API** (FROST) — monitoring locations + time series

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
| Data clients | thin typed OGC API Features + SensorThings clients |

## Architecture

Two data adapters, one map, a config-driven layer catalog, detail/inspect views.

- `src/clients/ogcFeatures.ts` — `OgcFeaturesClient` (DIE pygeoapi)
- `src/clients/sensorThings.ts` — `SensorThingsClient` (FROST STA)
- `src/catalog/layers.ts` — the layer registry; adding a dataset = a new entry
- `src/components/app/` — app shell, map view, layer list, panels
- `src/config.ts` — upstream endpoints (override via `VITE_*` env vars)

No backend of its own: static hosting + the two upstream APIs (both must have
CORS enabled for the public origin).

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

Phase 0/2 skeleton: app shell + basemap + typed data clients + layer catalog.
The map layers, inspect panels, charts, filtering, and URL state described in
`features/` are not yet implemented.

> Upstream data plumbing (Aqueduct → FROST; DIE → pygeoapi) is **referenced
> only** — it lives in other repos and is out of scope here.
