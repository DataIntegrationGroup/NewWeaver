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

- [ ] Number/date formatting (`940` → `940 ft`, epoch → readable, thousands separators)
- [ ] Sparkline / latest value for the NWIS time-series layers

## Layer list

- [ ] Per-visible-layer feature-count badge (needs cache-count without triggering hidden fetches)
- [ ] Search box to filter the layer list (40+ layers)
- [ ] Active-layer chips overlaid on the map
- [ ] Remember open/closed accordion sections across visits

## Visual / theme

- [x] Dark-mode audit — verified OK; header/sidebar/panels all theme correctly. (Basemap stays light by design; use the basemap picker for a darker tile set.)
- [ ] Top loading bar during route/data transitions
- [ ] Skeleton loaders for home cards / map first paint
- [ ] Open Graph meta tags for link previews

## Onboarding / sharing

- [ ] First-visit hint tour (layers → click a point → share)
- [ ] Info popovers ("?") on map controls (filter-to-map, draw, basemap)

## Robustness / a11y

- [ ] Error boundaries + friendly "API unavailable" states (STA / USGS / ArcGIS down)
- [ ] Fetch-failure toast with retry
- [ ] `aria-live` for selection/loading; keyboard-nav for layer toggles + carousel
