# Download / Export — design note

Companion to the Gherkin features in this directory.

## Goal

Let a user pull the data behind the map out as files. The map shows one DIE
dataset at a time (`src/catalog/mapDatasets.ts`), and the **Download modal**
offers two exports of it:

1. **Site summary (filtered)** → **CSV** or **GeoJSON** of the dataset's
   summary rows (one per site) for the sites the map and table show, built in
   the browser from features already loaded. No fetching. The modal says it's
   the summary, not individual readings.
2. **Time series (full dataset)** → hands off to the shared dataset download
   dialog (`DatasetDownloadDialog`) for the dataset's `nm_*_timeseries`
   collection: every reading for every site, not limited to the selection.
   The modal frames it as the raw data the summary is calculated from (for
   reproducing or checking it), and points casual users back to the summary.

Plus a **map drawing tool** (rectangle + polygon) to restrict the selection
spatially.

## Selection model — what gets exported

`resolveSelection` (`src/lib/selection.ts`) takes the filtered features the map
already shows (text, facets, regions, map-view bbox) and, when the user has
drawn shapes, keeps only the sites inside any of them. A drawn shape only ever
shrinks the set. This matches the attribute table, so the download equals
what's on screen.

```
selection = shapes.length
  ? pointsInside(drawnShapes, filteredSites)   // restrict
  : filteredSites                              // filters only
```

The modal shows the count, labelled "from drawing" when a shape is restricting,
else "from filters". An empty selection disables the sites download.

## Export contents

### Site summary (CSV)

One row per site. Columns lead with `feature_id, name, longitude, latitude`,
then every other property across the sites, sorted. The internal `id` key is
dropped; nested values are JSON-encoded. Summary products already carry the
latest reading (`latest_value`, `latest_date`), so this doubles as the
latest-observation export.

### Site summary (GeoJSON)

A `FeatureCollection` of the selected sites with their original geometry and
properties, minus the internal `id`.

### Time series (full dataset)

The dataset download dialog fetches the collection page by page (10,000 rows
per request), shows the row count up front, flags files over 30,000 rows,
requires confirmation over 100,000, and shows progress with cancel. CSV or
GeoJSON.

## UI surface

- **Trigger:** "Download" in the map sidebar, opening a DSDS `Dialog`.
- **Export kind:** Site summary (filtered) / Time series (full dataset). Time series is
  offered only when the dataset has a time-series collection.
- **Format:** CSV / GeoJSON toggle, shared with the dataset download dialog
  (`EXPORT_FORMATS` in `src/lib/export/collection.ts`).
- **Filename:** `weaver-{dataset}-sites-{YYYYMMDD-HHmm}.{csv|geojson}`.

## Modules

| file                                                    | responsibility                         |
| ------------------------------------------------------- | -------------------------------------- |
| `src/lib/export/sites.ts`                               | filtered sites → CSV / GeoJSON         |
| `src/lib/export/collection.ts`                          | paged whole-collection download        |
| `src/lib/export/csv.ts`                                 | rows → CSV string; `downloadFile`      |
| `src/lib/selection.ts`                                  | resolve the selection; drawn shapes    |
| `src/components/app/ExportDialog.tsx`                   | the map's download modal               |
| `src/components/site/datasets/DatasetDownloadDialog.tsx` | whole-collection download dialog       |
| `src/components/app/DrawControls.tsx`                   | terra-draw toolbar                     |

## Deferred

- Time series limited to the selection (needs server-side CQL2 filtering or an
  async export job).
- Sharing a drawn selection via URL.
- Formats beyond CSV + GeoJSON.
