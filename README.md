# Weaver (NewWeaver)

A public, read-only web map of New Mexico water data. It reads live from
standards-based services (OGC API Features, OGC SensorThings, ArcGIS REST, and
OGC WFS) with no source-specific code and no backend of its own: no accounts,
no private data, no editing.

It will replace the legacy Weaver at weaver.newmexicowaterdata.org at launch. See
[`docs/why-newweaver.md`](docs/why-newweaver.md) for background and scope.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite + TypeScript, pnpm |
| UI | React, Tailwind, DataServicesDesignSystem (vendored shadcn components) |
| Server state | TanStack Query |
| Routing | TanStack Router (view state encoded in the URL) |
| Tables | TanStack Table |
| Map | MapLibre GL via react-map-gl, terra-draw for draw selection |
| Charts | ECharts |
| Analytics | PostHog (off unless `VITE_POSTHOG_KEY` is set) |

### Design system

UI components are **vendored** from
[DataServicesDesignSystem](https://github.com/DataIntegrationGroup/DataServicesDesignSystem)
(shadcn source). The canonical components live there — including the MapLibre
`Map` primitive in `src/components/ui/map.tsx`. Pull updates with the shadcn
registry / by re-copying.

## Develop

Prerequisites: Node 22 and pnpm 11 or newer.

```bash
pnpm install
cp .env.example .env   # optional; every variable has a default
pnpm dev               # http://localhost:5173
```

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Typecheck + production build into `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm lint` | ESLint |
| `pnpm test:bdd` | Headless specs (data clients and logic, mocked `fetch`) |
| `pnpm test:bdd:frontend` | Browser specs (real UI in Chromium, mocked APIs) |

The browser specs need Chromium installed once:
`pnpm exec playwright install chromium`. See
[`features/README.md`](features/README.md) for how the specs are organized.
