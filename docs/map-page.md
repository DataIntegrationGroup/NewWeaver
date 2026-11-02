# Map page

`/map` shows one DIE pygeoapi dataset at a time, colored and filtered from the
sidebar, inside the existing AppShell (sidebar, map with the attribute table,
detail panel). Context layers sit on top: region outlines, drawn shapes, the
place-search pin and the basemap. Nothing else stacks on the map.

## Datasets

`src/catalog/mapDatasets.ts` builds the list from DIE's `/collections`:

- Every `nm_<analyte>_summary` becomes a dataset with id `<analyte>`, labelled
  from the collection title.
- An analyte is in **Major ions** when `nm_major_chemistry` lists it as a
  keyword, otherwise in **Minor and trace constituents**.
- `OVERRIDES` hand-tunes three datasets: **Water Levels** (the default),
  **Major Chemistry** (with `nm_water_type` and `nm_hardness` joined on by
  `feature_id`) and **Total Dissolved Solids** (salinity classes). Each shows
  only while the API still lists its collection.

The picker is a grouped `Select`. A dataset id the API doesn't list falls back
to Water Levels.

## Facets and legend

A facet (`src/lib/facets.ts`) is a site property split into ordered bins:
fixed ranges, quantiles, or one bin per category (Source). Sites matching no
bin fall into **No value**.

- **The legend is the color-by facet.** It shows the bins with swatches and
  counts; the other facets are collapsed checkbox lists. Switching color-by
  keeps every selection.
- **Counts exclude the facet's own selection** (faceted-search rule), so
  unticking a bin doesn't zero its count.
- **Quantile bins** (5, single-hue ramp) are built once from the loaded
  dataset, with edges rounded to 2 significant figures, so they don't move
  while filtering.
- **One definition, two sides.** The same bins drive the JS filter and counts
  and the MapLibre `circle-color` expression, so the map and the sidebar can't
  disagree about which bin a site is in.

## One filter state

Everything is stored in the URL (`src/lib/urlState.ts`, `useViewState`):

| Key | Meaning |
|---|---|
| `ds` | dataset id |
| `color` | color-by facet id (the dataset's default when absent) |
| `f` | ticked bins per facet, as bin keys, e.g. `{"last":["0","1"]}` |
| `regions` | selected regions, `<kind>:<id>` |
| `q`, `bbox` | site text search; "only sites in the map view" |
| `sel` | selected site, `<dataset>~<feature_id>` |
| `lng`, `lat`, `z` | map view |

AppShell filters once per change: the base filters (search, map view,
regions), then the facets, in one pass that also produces the counts. The map,
attribute table, place search and download all use that one filtered set.
Switching dataset clears the selection, color-by and facet selections, since
facets differ per dataset. Active filters show as removable chips over the map.

`#find` focuses the place search; `#download` opens the download dialog.

## Data loading

- A dataset's sites load in pages of 10,000 (`useDatasetData`).
- DIE sends typed JSON, but some missing values arrive as `""` or `"None"`.
  `src/lib/dieProps.ts` turns those into `null` on load, so filters, MapLibre
  expressions and the table never mistake them for values.
- Time series (e.g. `nm_waterlevels_timeseries`, ~880k rows) are only ever
  fetched per site.

## Guardrails

- Data-driven styling with MapLibre expressions, never per-feature JS styling.
  Muted and No value bins sort beneath the rest.
- No clustering: clusters would hide the color-by colors.
- One owner per piece of state; no control writes state another control owns.
- shadcn components from `components/ui` first; theme tokens, not raw colors
  (except bin swatches).

## Known gaps

- Site detail panel: InspectPanel stays until W10-491 replaces it.
- Source labels (`ST/DWB`, `ISCSevenRivers`, `BOR-RISE`, `WQP/NWIS`) are
  guesses until DIE confirms them.
- Some DIE values carry float noise (e.g. `474.7648751924755`); nothing rounds
  them yet.
