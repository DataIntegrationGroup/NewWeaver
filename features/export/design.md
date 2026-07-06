# Download / Export — design note

Status: **spec** (not yet implemented). Companion to the Gherkin features in
this directory.

## Goal

Let a user pull the data behind the map out as files, configured through a
**Download modal**. Three export kinds:

1. **Time series** → one combined **CSV** (long / tidy) of observations across
   all selected datastreams.
2. **Latest observation** → **CSV** snapshot, the newest observation per
   selected datastream.
3. **Features** → **GeoJSON** of the selected features only (STA Things +
   their Locations + Datastreams as properties; OGC features passed through).
   No observations in the GeoJSON.

Plus a **map drawing tool** (rectangle + polygon) to restrict the selection
spatially — narrowing the visible-layer + filter state down to the points that
fall inside the drawn shapes.

Everything is client-side: the SPA reads STA / OGC Features and assembles files
in the browser. No backend, no new service. Consistent with the read-only,
standards-only architecture.

## Selection model — what gets exported

The export operates on a resolved **selection set** of monitoring locations
(STA) and/or vector features, built in two steps:

- **Filtered points** — features from currently *visible* layers that pass the
  active filters (text `q` + "filter to map view" bbox). This is exactly what
  `filterFeatures` already produces for the map (`src/lib/filterFeatures.ts`).
- **Drawn shapes restrict** — when the user has drawn any shape (rectangle or
  polygon), the selection is narrowed to the filtered points whose point falls
  inside *any* drawn shape. A drawn shape only ever shrinks the set; it never
  adds points the filters excluded. This matches the attribute table
  (`src/components/app/AttributeTable.tsx`), so the download equals what's on
  screen.

```
selection = shapes.length
  ? pointsInside(drawnShapes, filteredPoints)   // restrict
  : filteredPoints                              // filters only
```

If no shapes are drawn, the selection is just the filtered points (today's
visible set). The modal always shows the resolved count — labelled "from
drawing" when a shape is restricting, else "from filters" — so the user knows
what they are about to export. Empty selection disables the download.

## Export contents

### Time series (CSV, long format)

One row per observation, all selected datastreams concatenated into a single
file. Columns:

| column            | source                                   |
| ----------------- | ---------------------------------------- |
| `location_id`     | STA `Location["@iot.id"]`                |
| `location_name`   | `Location.name`                          |
| `longitude`       | Location point X (EPSG:4326)             |
| `latitude`        | Location point Y                         |
| `datastream_id`   | `Datastream["@iot.id"]`                  |
| `datastream_name` | `Datastream.name`                        |
| `unit`            | `Datastream.unitOfMeasurement.symbol`    |
| `phenomenon_time` | `Observation.phenomenonTime` (ISO 8601)  |
| `result`          | `Observation.result`                     |

Long format is chosen so ragged timestamps and mixed units across series stay
correct (no pivot alignment problems). Optional **time range** (from / to)
narrows observations via STA `$filter` on `phenomenonTime`.

### Latest observation (CSV)

One row per selected **datastream**, carrying only its newest observation:

`location_id, location_name, longitude, latitude, datastream_id,
datastream_name, unit, phenomenon_time, result, result_time`

### Features (GeoJSON)

A `FeatureCollection`. For STA selections, one `Feature` per **Thing**:

- `geometry` — the Thing's Location geometry (Point, EPSG:4326).
- `properties` — `{ thing_id, location_id, name, description, <agency etc. from
  Thing.properties>, datastreams: [{ id, name, unit, observationType,
  phenomenonTime }] }`.

For OGC API Features selections, the underlying GeoJSON features pass through
unchanged. **No observations** are embedded — this file is the spatial
inventory of what's selected ("things and associated entities").

## Data fetching

Reuses and extends the existing clients (`src/clients/sensorThings.ts`,
`ogcFeatures.ts`); no per-source code leaks into the export layer.

- **Latest observation** — cheap. Per datastream:
  `Datastreams(id)/Observations?$top=1&$orderby=phenomenonTime desc`. Batch by
  expanding from locations where possible:
  `Locations(id)/Things?$expand=Datastreams($expand=Observations($top=1;$orderby=phenomenonTime desc))`.
- **Time series** — potentially large (locations × datastreams × observations).
  Page STA `@iot.nextLink` until exhausted, applying the time-range `$filter`
  and a hard per-datastream cap. Show **progress** and allow **cancel**. If the
  estimated volume is large (e.g. many continuous datastreams with no time
  range), warn and require confirmation before fetching.
- **GeoJSON** — mostly from already-loaded layer data (React Query cache),
  enriched with `$expand=Datastreams` for STA Things.

## Drawing tool

- **Library:** [terra-draw](https://github.com/JamesLMilner/terra-draw) with its
  MapLibre GL adapter — native to MapLibre, no mapbox shim. New dependency.
- **Modes:** rectangle, polygon, plus clear/delete. Exposed as a small DSDS
  button toolbar over the map (alongside the basemap control).
- **Selection:** drawn geometries live in app state. Points are tested with a
  point-in-polygon check (ray casting for polygons; bbox compare for
  rectangles) — a tiny local util to avoid a heavy geometry dependency.
- Selected points are highlighted on the map (reuse the existing highlight
  paint pattern in `MapLayers.tsx`).

## UI surface

- **Trigger:** a "Download" button in `NavBarActions` (next to "Attribute
  table"), opening a DSDS `Dialog` (`src/components/ui/dialog.tsx`).
- **Modal config:**
  - Export kind — radio: Time series / Latest observation / Features (GeoJSON).
  - Selection summary — "N locations (M from drawing, K from filters)".
  - Time range — from/to date inputs (time series only); blank = all.
  - Format — shown as a fixed label per kind (CSV or GeoJSON).
  - Download — generates the file client-side and triggers a browser download.
- **Filename:** `weaver-{kind}-{YYYYMMDD-HHmm}.{csv|geojson}`.

## Proposed new modules

| file                                   | responsibility                               |
| -------------------------------------- | -------------------------------------------- |
| `src/lib/export/csv.ts`                | rows → CSV string; `downloadFile` helper     |
| `src/lib/export/timeSeries.ts`         | gather + flatten observations → long rows    |
| `src/lib/export/latest.ts`             | gather newest observation per datastream     |
| `src/lib/export/geojson.ts`            | build the features `FeatureCollection`       |
| `src/lib/selection.ts`                 | resolve selection set; point-in-polygon      |
| `src/components/app/ExportDialog.tsx`  | the modal (DSDS Dialog)                       |
| `src/components/app/DrawControls.tsx`  | terra-draw toolbar + MapLibre adapter wiring |
| STA client additions                   | paged range fetch; latest-observation helper |

## Non-goals (v1)

- Server-side / async export of very large datasets.
- Sharing a drawn selection via URL (drawn geometry is session-only state).
- Formats beyond CSV + GeoJSON (no Shapefile, XLSX, NetCDF).
- Wide / pivoted time-series layout.
