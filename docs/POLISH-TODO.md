# Site polish — backlog

Brainstormed UI/UX polish, grouped. ⚡ = quick win. Checked = shipped.

## Quick wins (first pass)

- [x] ⚡ Per-route page titles (`document.title` per route) — favicon already set
- [x] ⚡ `Esc` clears the current selection / closes the inspect panel
- [x] ⚡ "Zoom to feature" button in the inspect panel header
- [x] ⚡ Persist inspect-panel width across opens (localStorage)
- [x] ⚡ Copy-to-clipboard on inspect-panel values (coords, IDs, the well-record URL)
- [x] ⚡ Share button + "Link copied" toast (the URL already encodes the view)
- [x] ⚡ Debounce the text filter input
- [x] ⚡ Per-layer opacity control

## Map interactions

- [x] Fly-to — "Zoom to feature" recenters/zooms (panel button); auto fly-on-click deferred
- [x] Loading progress for big layers — live "10,000 → 20,000 …" count in the layer list while paging
- [x] Empty state when the text filter matches 0 features (centered map card)
- [ ] Cluster hover affordance (pointer cursor + highlight)
- [ ] Spiderfy / "N sites here" when points stack past `clusterMaxZoom`

## Inspect panel / data

- [x] STA Thing-properties table (well metadata) above the datastream chart
- [ ] Number/date formatting (`940` → `940 ft`, epoch → readable, thousands separators)
- [ ] Sparkline / latest value for the NWIS time-series layers

## Layer list

- [ ] Per-visible-layer feature-count badge (needs cache-count without triggering hidden fetches)
- [x] Search box to filter the layer list (40+ layers)
- [x] Active-layer chips overlaid on the map (click to hide a layer)
- [ ] Remember open/closed accordion sections across visits

## Visual / theme

- [x] Dark-mode audit — verified OK; header/sidebar/panels all theme correctly.
- [x] Pair the basemap with the theme — dark mode → dark tiles, light → light; satellite is left as chosen.
- [x] Top loading bar during data fetches (indeterminate bar pinned to the top)
- [x] Skeleton loaders — map first paint, attribute table, and STA datastream panel
- [ ] Open Graph meta tags for link previews

## Onboarding / sharing

- [x] First-visit hint tour (3 steps: layers → inspect → share; dismissed once per browser)
- [x] Info popovers / tooltips on map controls (filter, draw, basemap)

## Robustness / a11y

- [x] Error boundary — friendly recovery card instead of a white screen on render crashes
- [x] Fetch-failure toast with retry — names the failed layer, one-click refetch
- [ ] `aria-live` for selection/loading; keyboard-nav for layer toggles + carousel
