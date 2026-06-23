# Codebase map — Weaver

> Discovery doc for the discovery-layer UX work (SPEC.md §T.T1, invariant V11).
> Facts later tasks depend on. Generated 2026-06-22.

## Stack

- **Framework**: React 19 + TypeScript, Vite build (`vite.config.ts`), pnpm workspace.
- **Routing**: TanStack Router, code-based (`src/router.tsx`). 4 routes:
  - `/` → `Home` (`src/components/site/Home.tsx`) — landing/hero.
  - `/map` → `AppShell` (`src/components/app/AppShell.tsx`) — interactive map app.
    Search params validated by `validateSearch` (`src/lib/urlState.ts`); visible
    layers, map extent, selection encoded in URL → every view is a shareable link.
  - `/about` → `About` (`src/components/site/About.tsx`).
  - `/help` → `Help` (`src/components/site/Help.tsx`).
- **Data**: TanStack Query (`src/lib/queryClient.ts`), client-side cache only.
- **Map**: MapLibre GL via `react-map-gl` + `terra-draw` for draw tools.
- **UI**: shadcn/radix (`src/components/ui`), Tailwind, echarts (time series).
- **Analytics**: PostHog, opt-in via `VITE_POSTHOG_KEY` (off in dev/CI).

## Backend? — NO Weaver-owned backend (confirmed, §C.C2 / §O.O4)

All data fetched **direct from third-party services** client-side. No proxy, no
Weaver API. Endpoints in `src/config.ts` (all `VITE_*` overridable):

| const | service | protocol |
|-------|---------|----------|
| `STA_BASE_URL` | FROST SensorThings (primary) | OGC SensorThings (STA) |
| `STA_ST2_BASE_URL` | FROST st2 (CABQ/BernCo/OSE agency data) | STA |
| `FEATURES_BASE_URL` | DIE pygeoapi | OGC API Features |
| `OCOTILLO_FEATURES_BASE_URL` | Ocotillo pygeoapi (NM water collections) | OGC API Features |
| `OSE_ARCGIS_BASE_URL` | OSE GIS Esri FeatureServer (PODs, aquifer tests) | ArcGIS REST |
| `USGS_OGC_BASE_URL` | USGS Water Data (NWIS replacement) | OGC API Features |

About + Help copy both state "display surface only / no Weaver-only backend"
(`About.tsx`, `Help.tsx`). → discovery (geocode/search) MUST be client-side.

## Clients (`src/clients/`)

- `ogcFeatures.ts` — `OgcFeaturesClient`. `/collections/{id}/items`, **bbox** +
  limit/offset paging. Used by DIE, Ocotillo, USGS NWIS.
- `sensorThings.ts` — STA. `/Locations`, `/Datastreams`; `$filter`/`$expand`/
  `$select`, `@iot.nextLink` paging. `Datastream.observationType` +
  `unitOfMeasurement` discovered at click-time. **No bbox.**
- `arcGisRest.ts` — `ArcGisRestClient`. FeatureServer `/query`, `where`/`outFields`/
  `resultOffset`, **envelope bbox** (`esriGeometryEnvelope`).

## Layer catalog (`src/catalog/layers.ts`)

`BaseLayer` interface (~line 29): `id, title, description?, defaultVisible?,
section?, fields?, formatValue?, cluster?, style`. **No `measurementType` field** —
the "by what's measured" facet (§T.T4) requires adding one (§T.T4a).

Two section groups today (`section` string drives layer-list headers):

- **STA** (`st2AgencyLayers`, ~line 126): 9 agency monitoring networks (CABQ,
  BernCo, OSE, Roswell, San Acacia, PVACD, EBWPC, EBID, City of Roswell). STA
  Locations filtered `properties/agency eq '{code}'`. These = monitoring networks.
- **Ocotillo** (`ocotilloLayers` / `OCOTILLO_COLLECTIONS`, ~line 156): 22 OGC
  Features collections = integrated data products. "OCOTILLO" = internal vocab,
  not user-meaningful (§T.T9 renames → "Integrated data products").
  - wells: actively_monitored_wells, water_wells, water_well_summary
  - depth-to-water: latest_depth_to_water_wells, depth_to_water_trend_wells
  - water elevation: water_elevation_wells
  - chemistry: latest_tds_wells, avg_tds_wells, major_chemistry_results, minor_chemistry_wells
  - surface water: springs, diversions_surface_water, perennial_streams,
    ephemeral_streams, lakes_ponds_reservoirs
  - other: meteorological_stations, rock_sample_locations, soil_gas_sample_locations,
    outfalls_wastewater_return_flow, project_areas
- Plus OSE GIS group (ArcGIS, clustered): PODs (`pod_file` id), aquifer tests.
- NWIS layer: `monitoring-locations`, `site_type_code=GW` + `state_code=35`,
  `NM_BBOX` hardcoded `[-109,31,-103,37]` (~line 370).

`SECTION_DESCRIPTIONS` map (~line 452) — section → caption string (T9 edits here).

## Search / geocode / filter — what exists

- **Text/attribute filter only**, client-side: `src/lib/filterFeatures.ts`
  (`matchesText` substring, `inBounds` map-extent), UI `FilterControls.tsx`.
- **Layer search**: name/description text match in sidebar `LayerList.tsx`.
- **No geocoding** (no address/place lookup). **No server well-ID search**
  (§O.O1). **No nearest-point** query. Well IDs exist as fields
  (`monitoring_location_number`, `@iot.id`, `pod_file`) — usable only as
  client filter on already-loaded features.

## Key components (`src/components/app/`)

`AppShell` (map page root), `MapView` / `MapLayers` (MapLibre), `LayerList`,
`ActiveLayerChips`, `InspectPanel` (point/feature click panel — §T.T8 target),
`AttributeTable`, `DatastreamChart` (echarts), `ExportDialog` + `src/lib/export`
(§T.T5 download), `FilterControls`, `DrawControls`, `OnboardingTour`.

## Decisions locked (from SPEC §O)

- Geocoder = **US Census Geocoder** (free, no key, public-domain, US-only).
- Layer regroup = **"Monitoring networks"** (STA) vs **"Integrated data products"** (Ocotillo).
- Location search = **address-only** (no server well-ID lookup); nearest computed
  client-side from bbox query results.
