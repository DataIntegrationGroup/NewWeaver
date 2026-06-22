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
- [x] Layer-tree tools — Expand all / Collapse all
- [x] Resizable layer sidebar — drag the right edge (desktop); width persisted (localStorage)
- [ ] Remember open/closed accordion sections across visits

## Visual / theme

- [x] Dark-mode audit — verified OK; header/sidebar/panels all theme correctly.
- [x] Pair the basemap with the theme — dark mode → dark tiles, light → light; satellite is left as chosen.
- [x] Top loading bar during data fetches (indeterminate bar pinned to the top)
- [x] Skeleton loaders — map first paint, attribute table, and STA datastream panel
- [ ] Open Graph meta tags for link previews

## Onboarding / sharing

- [x] First-visit hint tour (3 steps: layers → inspect → share; dismissed once per browser)
- [x] Interactive tour — each step spotlights its target (dim backdrop + cut-out +
      pulsing ring) and anchors the card beside it; arrow keys / dot nav; click
      backdrop to dismiss
- [x] Info popovers / tooltips on map controls (filter, draw, basemap)

## Robustness / a11y

- [x] Error boundary — friendly recovery card instead of a white screen on render crashes
- [x] Fetch-failure toast with retry — names the failed layer, one-click refetch
- [ ] `aria-live` for selection/loading; keyboard-nav for layer toggles + carousel

---

# Round 3 — deeper polish

A second-pass brainstorm aimed at the actual data UX. ⚡ = quick win,
★ = big bet (high value, more work).

## Time-series chart (the core "see the data" moment)

- [x] ⚡ Hover tooltip on the chart — formatted date + value at the cursor
- [x] ⚡ Stat strip above the chart — latest, min, max, count, period of record
- [ ] Date-range presets (1y / 5y / 10y / all) + brush-to-zoom on the series
- [ ] ★ Compare mode — plot several datastreams or several sites on one chart
- [ ] Download the plotted series as CSV; export the chart as PNG
- [ ] Trend sparkline in the hover popup for monitoring points

## Attribute table

- [x] ⚡ Active-filter summary in the table footer (q / extent / polygon, clearable)
- [x] ⚡ Density toggle (compact / comfortable)
- [ ] Column show/hide menu; sticky first (id) column
- [ ] Per-column quick filter inputs
- [x] ★ Row virtualization (hand-rolled windowing, no dep) — 278k-row OSE PODs
      renders ~23 rows in the DOM; pagination replaced with smooth scroll
- [ ] Export the current table view to CSV (respects filters + polygon)
- [ ] Auto-scroll the selected row into view when picked on the map

## Filters & selection

- [ ] ★ OSE attribute-filter UI — the predicate logic already exists
      (`src/lib/oseFilter.ts`); wire up status / pod_status / use multiselects +
      depth range sliders + well-log toggle, with active-filter chips
- [ ] Filter chips bar — show active q / bbox / polygon, each with its own clear
- [ ] Multi-select features (shift-click / drag) → compare in the panel
- [ ] Prev / next feature navigation in the inspect panel
- [ ] Recent searches dropdown on the text filter

## Map tools

- [x] ⚡ "Fit to data" — zoom to the combined extent of visible layers
- [x] ⚡ Coordinate readout (lng/lat) following the cursor
- [ ] Geolocate ("my location") control
- [ ] Measure distance / area tool
- [ ] Collapsible legend panel (color ↔ layer ↔ what it means)
- [ ] Cluster hover affordance + spiderfy at max zoom (carried from round 2)

## Data trust

- [x] ⚡ Approval-status chip for NWIS values (`approval_status` → Approved/Provisional)
- [ ] Per-layer "data as of …" freshness line
- [ ] Per-feature source link (USGS site page, OSE record) where available
- [ ] Number/date formatting + units everywhere (carried from round 2)

## Accessibility & motion

- [ ] Move focus into the inspect panel when it opens; return focus on close
- [ ] Keyboard nav for layer toggles, table rows, and the carousel
- [ ] Colorblind-safe layer palette (or shape encoding) + contrast check
- [ ] Honor `prefers-reduced-motion` on panel/chip transitions

## Mobile

- [ ] Inspect panel as a bottom sheet on small screens
- [ ] Attribute table as stacked cards on mobile
- [ ] Touch-friendly draw + larger hit targets

## Misc

- [ ] 404 / not-found route with a link home
- [ ] Keyboard-shortcuts cheatsheet (press `?`)
- [ ] Open Graph meta tags for link previews (carried from round 2)
