# Map page rework — plan (W10-489)

Rework `/map` into a one-dataset-at-a-time explorer of the DIE pygeoapi
products, **inside the existing AppShell**. The prototype
(`prototype/map-page-redesign`, `e77a2fb`) is a source of ideas and code
snippets, not a spec. Where this doc and the prototype disagree, this doc wins.

## Guardrails

- **Minimal change to the shell.** Keep AppShell's layout: left resizable
  `<aside>` (drawer below `lg`), `<main>` with MapView + AttributeTable, right
  detail panel. No new layout regions (no filter bar above the map).
- **shadcn first.** Compose `RadioGroup`, `Checkbox`, `Accordion`, `Select`,
  `Slider`, `Popover`, `Tabs`, `Badge`, `Sheet` from `components/ui`. Add a
  primitive with the shadcn CLI only when one is missing. No hand-rolled
  dropdowns or toggle buttons. Theme via tokens, not raw colors (except the
  class swatches).
- **Web-map practice.** One thematic layer + context overlays. Data-driven
  styling with MapLibre expressions (no per-feature JS styling). Sort keys so
  muted/no-value points draw underneath. No clustering on classed layers.
  Color schemes that are color-blind safe and keep their order in the legend.
  Keyboard reachable legend/facets with `aria` state.
- **One source of truth** for every filter. No control writes state another
  control also owns.

## Decisions

| Decision | Notes |
|---|---|
| One dataset on the map, plus context | Context = region outlines, drawn shapes, search pin, basemap. No stacked point layers. |
| Only DIE pygeoapi products | All ~45 non-DIE layers (STA, Ocotillo, OSE, GeoServer WFS) are **removed** from the map. Old links with unknown/removed ids fall back to Water Levels. |
| Datasets = summaries + derived | See [Datasets](#datasets). Derived products fold into their parent as color-by options instead of separate rows. |
| Find a place tops the sidebar | `LocationSearch` sits above the dataset picker; Home's `/map#find` links focus it. |
| Filters live in the sidebar | Always-visible Filters section under the dataset picker; replaces the gear popover and the SearchWidgets "Filter" accordion. Active filters show as removable chips over the top of the map (reusing the `ActiveLayerChips` slot). |
| Faceted filters; the legend is the color-by facet | One component, one state. See [Facets and legend](#facets-and-legend). |
| Water Levels backed by two collections | `nm_waterlevels_summary` drives map, filters and headline numbers; `nm_waterlevel_trends` is fetched per-site in the detail panel. No rising/falling copy yet. |
| Quantile bins for analytes | TDS uses salinity classes; every other analyte uses quantile bins. Drinking-water limits (% of MCL, `nm_mcl_exceedance`) are left out until that logic is checked. |
| Site detail panel replaces InspectPanel | Summary first, then tabs. InspectPanel is deleted with the non-DIE layers. |
| Map state in the URL | Dataset, color-by, facet selections (including source), regions, search, selection. Share captures all of it. |

## API facts (Oct 30 2026)

- `nm_waterlevel_status` **no longer exists**; today's default `hydrograph`
  layer points at it. Also gone: `nm_waterlevel_change`,
  `nm_depletion_projection`, `nm_seasonal_amplitude`, `nm_arsenic_trend`,
  `nm_nitrate_trend`, `nm_wqi`, `nm_sar`, `nm_ion_balance`,
  `nm_well_correlation`, `nm_pod_age_*`. (`src/lib/planning.ts` still references
  several; planning is hidden by W10-477, so out of scope here, but flag it.)
- Summary schema (water levels and all 13 analytes): `source, id, name,
  well_depth, nrecords, min, max, mean, earliest_date, latest_date,
  latest_value, latest_units, usgs_site_id, alternate_site_id, feature_id`.
- Properties are typed JSON, but some missing values arrive as `""` or
  `"None"`. Normalize those to `null` once at load so filters, MapLibre
  expressions and the table never mistake them for values.
- Time series: `nm_<analyte>_timeseries`, `nm_waterlevels_timeseries` (883k
  rows; fetched per site only). Analyte values can be text (`'&lt; MRL 0.001
  MG/L'`); the readings table shows them as-is.

## Datasets

The dataset list comes from DIE's `/collections` (`datasetsFromCollections`
in `src/catalog/mapDatasets.ts`): every `nm_<analyte>_summary` becomes an
analyte dataset with id `<analyte>`, labelled from the collection title. An
analyte is a major ion when `nm_major_chemistry` lists it as a keyword,
otherwise a minor or trace constituent. Concentration units come from each
row's `latest_units`. Only Water Levels, Major Chemistry and TDS are written
out (`OVERRIDES`), for their own facets and joins, and each shows only while
the API still lists its collection. The URL uses the dataset id.

| Group | Dataset | Collection(s) | kind | Color-by facets (default first) |
|---|---|---|---|---|
| Water levels | Water Levels | `nm_waterlevels_summary` (+ `nm_waterlevel_trends` per site) | well | Last measured (`latest_date`; replaces monitoring recency) · Source · Depth to water (`latest_value`) · Years of record (derived `latest_date − earliest_date`) · Readings (`nrecords`) |
| Major ions | Major Chemistry | `nm_major_chemistry` + `nm_water_type` (dominant ions) + `nm_hardness` joined by `feature_id` | ions | Source · Hardness class (`hardness_class`; unmatched → No value). No Last measured: each ion has its own date. |
| Minor and trace constituents | Arsenic, Fluoride, Uranium, Nitrate | `nm_<x>_summary` | analyte | Last measured · Source · Concentration (quantiles) · Readings |
| Major ions | Total Dissolved Solids | `nm_tds_summary` | analyte | Last measured · Source · Salinity (fresh / slightly brackish / brackish / saline) · Readings |
| Major ions | Sulfate, Chloride, Calcium, Magnesium, Sodium, Potassium, Bicarbonate, Carbonate | `nm_<x>_summary` | analyte | Last measured · Source · Concentration (quantiles) · Readings |

`nm_mcl_exceedance` is not used yet: drinking-water limits wait until that
logic is checked.

The picker is a grouped shadcn `Select` (`SelectGroup` + `SelectLabel` per
group) to leave the sidebar for filters, with a one-line blurb for the
selected dataset under it. The major ions stay as 8 rows for now; collapsing
them into one dataset with an ion choice can come later if the list feels long.

## Facets and legend

A **facet** is a field split into ordered bins with live counts:

```ts
interface Facet {
  id: string                // URL key, e.g. "span", "readings", "last", "source"
  label: string
  field: string | ((p) => unknown)   // derived fields computed at load
  bins: Bin[] | "quantile" | "categorical"
  colors?: string[]         // present → the facet can be the color-by
}
```

- **State:** `colorBy: facetId` and `selected: Record<facetId, binIndex[]>`
  (empty = all). Source is a categorical facet; the only other filters are
  Region and search. A date range filter was tried and dropped: with only
  first/latest dates per site it matched too loosely. "Last measured" covers
  recency for now.
- **Rendering:** the Filters section lists the dataset's facets. The color-by
  facet is shown expanded, with swatches: that block *is* the legend. Other
  facets are collapsed `Accordion` items with checkbox rows and counts. A
  "Color by" `Select` picks which facet gets swatches; switching it doesn't
  touch any selections.
- **Counts:** each facet's counts are computed with every filter applied
  *except its own* (standard faceted-search rule), so unchecking a bin doesn't
  zero its own count. Compute once per filter change in AppShell (one pass,
  all facets) and pass down.
- **Map:** `circle-color` is a `match`/`step` expression from the color-by
  facet; non-selected bins are excluded by `filterFeatures`, not hidden by
  paint, so the table and export match.
- **Quantile bins** (5 per dataset, single-hue sequential ramp) are computed
  from the unfiltered dataset at load (stable while filtering), with edges
  rounded to 2 significant figures for readable labels.
- **Chips:** each active facet/date/source/region/search shows a chip
  (`Readings: 10+ ×`) on the map. The chip clears that one filter.

## Detail panel (`SiteDetail.tsx`)

Keep from the prototype: right panel, resizable, 540px default, new storage
key; full-screen `Sheet` below `lg`; header with site name, then `Source ·
Dataset`; up to 4 headline numbers including well depth; `Tabs`.

- **well:** headline: latest depth to water (+ date), readings, years of
  record, well depth. Tabs: Chart (`Hydrograph compact`), Details (from the
  summary + trends: min/max/mean, first/latest, slope shown as a number with
  units, no rising/falling words), Readings (`ObservationTable`).
- **analyte:** latest value + date, samples, range, well depth; takeaway box
  (salinity class / quantile position); Details; Readings
  from `nm_<x>_timeseries`.
- **ions:** cation/anion bars, hardness class, dominant cation and anion.
- Formatting rules from the prototype (`fmt`, `fmtDate`, drop internals).

## URL state

Extend `urlState.ts` / `useViewState`: `ds` (dataset id), `color`, `f`
(facet selections as bin keys, e.g. `{"span":["0","1"],"source":["NMBGMR"]}`),
plus existing `regions`, `q`, `sel`, view. Switching dataset clears the
selection, facet selections and color-by (facets differ per dataset). Legacy `layers=` links map known DIE ids to a dataset,
otherwise Water Levels.

## Implementation phases

One PR on `W10-489-…`, titled `feat(map): rework the map page around one DIE
dataset at a time (W10-489)`. The phases below are the order of work, and each
phase lands as one or more conventional commits. Each commit builds,
type-checks and passes unit tests on its own so the history bisects cleanly.
The full BDD suite runs once, at the end of phase 5.

1. **Data foundations** (no visible change)
   - `feat(catalog): add the DIE map dataset registry`
   - `feat(data): coerce DIE summary properties to typed values on load`
   - `feat(catalog): join water type and hardness onto major chemistry`
   - `feat(filters): add facet bins, quantiles and date-range overlap`
   - `test(filters): cover facet bins, overlap edges and exclude-own counts`
2. **One dataset on the map**
   - `feat(map): render the selected dataset with color-by styling`
   - `feat(map): pick the dataset from the sidebar`
   - `feat(url): store the dataset in the URL and map legacy layer links`
     (this also fixes the dead `nm_waterlevel_status` default)
3. **Filters section and legend**
   - `feat(map): add the faceted filters section with the color-by legend`
   - `feat(map): add source, region and search filters`
   - `feat(map): show active filters as removable chips on the map`
   - `feat(map): move Find a place to the top of the sidebar`
   - `feat(url): store color-by and filter selections in the URL`
   - `feat(datasets): open datasets on the map by dataset id`
4. **Site detail panel**
   - `feat(map): add the site detail panel shell`
   - `feat(map): show well, analyte and ion summaries in the detail panel`
   - `feat(map): link other datasets at the same site`
5. **Removal and tests**
   - `refactor(map): remove non-DIE layers and the old sidebar components`
     (non-DIE layers, `LayerList`, `SearchWidgets`, `MeasurementFacet`,
     `InspectPanel`, `MapLegend`, `filter-controls` usage)
   - `test(bdd): rewrite the map scenarios for datasets, facets and the detail panel`
   - `docs(help): update the tour and Help copy for the new map`

## Open questions

1. Source labels (`ST/DWB`, `ISCSevenRivers`, `BOR-RISE`, `WQP/NWIS`): confirm
   with DIE.

### `#find` / `#measure` deep links

AppShell reads the URL hash on load. `#find` opens the sidebar, expands the
SearchWidgets "location" accordion and focuses `#location-search-input`;
`#measure` expands the measurement facet; `#download` opens the export dialog.
Home links to `/map#find` twice (hero place search, "Find data near a place"
card). Nothing links to `#measure` any more (that card now goes to
`/datasets`), and nothing in `src` links to `#download`. Removing SearchWidgets
removes the accordion `#find` opens.

Decision: `LocationSearch` ("Find a place") moves to the top of the sidebar,
above the dataset picker. `#find` opens the sidebar (drawer below `lg`) and
focuses that input. Drop `#measure`; keep `#download`. Passing Home's typed
place text to the map is a separate ticket, not part of this work.
