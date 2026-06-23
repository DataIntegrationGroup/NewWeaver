# SPEC — Weaver discovery-layer UX

## §G goal

Add discovery layer to Weaver (newweaver.newmexicowaterdata.org). Site organized by
producer model (products/layers/networks, STA vs OGC). Reframe so non-expert can ask
"what data near my place / about X?". Goal = discovery layer, not more data. When
tradeoff ambiguous → optimize low-friction discovery for non-expert.

Personas: researcher, agency staff, well-owner (Joe Schmo), API dev, GIS user.
P1-3 underserved today; fix their entry.

## §C constraints

- C1 no new datasets, no data-pipeline change. UX layer over existing services only.
- C2 client-side only — no Weaver-owned backend (per About page; verify in T1).
  Discovery (geocode/search) built client-side, query backing collections direct.
- C3 don't add backend datastore for user data unless task needs server search + team OK.
- C4 don't degrade dev/GIS docs (Data sources / API endpoints / Connect desktop GIS).
- C5 copy rule: affordance over explanation. Drop mechanics copy ("click point to view
  datastreams"). Scope/coverage/provenance copy allowed + encouraged.
- C6 stack: React + Vite, TanStack Router/Query/Table, MapLibre GL (react-map-gl),
  shadcn/radix, echarts. Don't assume — confirm in T1.
- C7 geocoder = Photon (komoot/OSM): free, no key, CORS-enabled, matches places
  AND addresses, supports type-ahead suggestions. Results bbox-biased to NM.
  [REVISED 2026-06-23: was US Census Geocoder — Census is US-address-only, has no
  autocomplete, and sends no CORS headers, so browser geocoding never resolved.]

## §I surfaces

- I.landing — landing/hero page (3 mechanism cards: Interactive map / Time series / Standards-based)
- I.map — Map page, MapLibre GL
- I.about — About page ("What you can do" list)
- I.help — Help/Docs page (Using the map / Data sources / API endpoints / Connect desktop GIS)
- I.layers — layer panel; group headers STA (agency networks), OCOTILLO (product names)
- I.svc — backing services: OGC API Features, SensorThings/FROST, ArcGIS REST, USGS NWIS
- I.export — Download/export control
- I.home-dash — home-page data dashboard (stat tiles + activity feed) [NEW 2026-06-23]
- I.stats-json — nightly stats JSON on GCP (counts + update events), built by DIE,
  frontend fetches read-only. URL via `VITE_*` config const (cf I.svc pattern) [NEW 2026-06-23]
- I.catalog — Data Catalog page, new route `/catalog`: tiled gallery of all
  datasets/products, searchable, full metadata per card [NEW 2026-06-23]

## §V invariants

- V1 every landing doorway = real link/route, not decorative.
- V2 "Standards-based" not a primary doorway label (dev-only value).
- V3 location search empty result → explicit "nothing monitored here" message required.
  User must always know if "in right place".
- V4 measurement facet selection enables relevant layers across ALL networks at once +
  zooms to their extent. Not per-agency hunting.
- V5 default map view ≠ single clustered blob (CABQ). First paint communicates
  "data across NM", via fit-to-data-extent or arrival-location.
- V6 feature/point panel leads plain-language (what is it, who measures) BEFORE tech
  terms (datastream/SensorThings/OGC). Tech ids secondary, not removed.
- V7 no interface-mechanics copy anywhere ("click X to view/inspect Y"). Scope/
  coverage/provenance copy kept (C5).
- V8 layer group headers human-meaningful. Raw "OCOTILLO" not user-visible. Prefer
  regroup (measurement-type OR networks-vs-integrated-products) over caption.
- V9 export/download reachable FROM a narrowed result (location result, facet, layer),
  not only top toolbar.
- V10 no backend datastore added for user data (C3).
- V11 T1 codebase-map (docs/codebase-map.md) exists before feature code; later tasks
  cite facts from it.
- V12 a default-on map-context layer (e.g. statewide wells for V5 first paint) must
  NOT auto-become the attribute table's active layer. Table auto-pick skips layers
  flagged `excludeFromAutoTable`; explicit selection still opens them. Catalog order +
  "first visible features layer" heuristic else lets a dense empty default layer
  displace the agency/toggled layer the table defaults to.
- V13 dashboard counts (services/datasets/sites) read from nightly DIE stats JSON
  (I.stats-json), not hardcoded, not computed live. JSON missing/stale/unreachable →
  graceful fallback (last-known or "—"), never crash, never fabricate. No overstate.
- V14 activity feed reads update events from same stats JSON (I.stats-json). JSON
  absent → scaffold shows empty/placeholder state clearly labeled, NEVER fabricated
  timestamps. Adapter wraps fetch so source swap = config change only.
- V15 catalog card "view on map" = real `/map` deep link with that dataset's layer
  visible (reuse urlState visible-layers encoding), not decorative (cf V1).
- V16 catalog card shareable link = stable URL-addressable deep link to that
  dataset (e.g. `/catalog?dataset={id}` or `#id`), copyable from card.
- V17 catalog searchable across ALL displayed metadata (title/desc/measurementType/
  section/service). Empty search → explicit "no datasets match" message (cf V3).
- V18 catalog metadata pulled from single source-of-truth (catalog/layers.ts +
  service map), no per-card hardcoded duplication. Missing metadata field hidden,
  not faked.

## §T tasks

| id | st | task | cites |
|----|----|------|-------|
| T1 | x | discover codebase → docs/codebase-map.md: framework/build/routing, map impl + layer registration, layer-list grouping (STA/OCOTILLO)→service map, landing/About/Help/Map components, existing search/geocode/filter, confirm no backend | V11,I.map,I.layers,I.svc |
| T2 | x | fix default map view: fit-to-data-extent across enabled layers OR arrival-location; >1 representative layer visible, no misleading single cluster | V5,I.map |
| T3 | x | location search on Map: address/place via client geocoder (Photon, C7) with type-ahead suggestions; fly+drop marker; results panel "what we have / what we don't"; query OGC/ArcGIS collections by bbox (no server nearest — compute nearest client-side from bbox results). well-ID = address-only; optional client-side filter on loaded feature ids (monitoring_location_number/@iot.id/pod_file). doc choice in codebase-map | V3,C2,C7,I.map,I.svc |
| T4a | x | add `measurementType` field to BaseLayer (src/catalog/layers.ts:29); populate per layer (depth_to_water, tds, chemistry, water_elevation, water_level, surface_water...). prereq for facet | I.layers |
| T4 | x | "browse by what's measured" facet keyed on T4a field: categories across networks; select → enable matching layers all networks + zoom extent | V4,T4a,I.map,I.layers |
| T5 | x | make export discoverable from a result: surface Download +/or API-collection link wherever narrowed (location result, facet, layer), not just toolbar | V9,I.export,I.map |
| T6 | x | reframe landing: replace 3 mechanism cards with question doorways → near-a-place(→T3), by-measured(→T4), use-in-GIS(→help GIS), build-with-API(→help API). real routes, plain labels, no "Standards-based" primary. keep "Explore map" but land on useful default (T2) | V1,V2,I.landing,I.help |
| T7 | x | landing: one-line orientation statement above doorways — what coverage exists (data kinds + geo/temporal scope), pulled from real sources, no overstate | C5,I.landing,I.svc |
| T8 | x | plain-language feature/point panel: lead with what-is-it + who-measures; tech ids secondary | V6,I.map |
| T9 | x | layer-panel headers: regroup STA+OCOTILLO → "Monitoring networks" (STA) vs "Integrated data products" (Ocotillo) [DECIDED]. update SECTION_DESCRIPTIONS (layers.ts:452). raw "OCOTILLO" not user-visible | V8,I.layers |
| T10 | x | copy cleanup: remove mechanics bullets from About "What you can do" + Help "Using the map" ("click point→datastreams", "click feature→attributes"). KEEP scope/provenance + Data sources/API/GIS sections intact | V7,C4,C5,I.about,I.help |
| T11a | x | build unified dataset-metadata selector: one fn over catalog/layers.ts + service map → list of {id, title, description, measurementType, section/group label, service name, protocol, route deep-link}. single source-of-truth for dashboard counts AND catalog cards | V18,I.catalog,I.svc,I.layers |
| T11b | x | stats-JSON client: fetch nightly DIE JSON from GCP (URL = new `VITE_STATS_URL` const in config.ts), TanStack Query, typed schema {generatedAt, counts:{services,datasets,sites}, events:[{source,timestamp,kind?}]}. graceful fail (missing/stale/unreachable → fallback, no crash) | V13,V14,I.stats-json |
| T11 | x | home dashboard (I.home-dash) on `/`: stat tiles = #services + #datasets + total #sites, all from T11b stats JSON. place near hero, below/with doorways (T6). show generatedAt ("updated {date}"). missing → "—"/last-known, no magic numbers | V13,T11b,I.home-dash |
| T12 | x | activity feed on dashboard: render update events from T11b JSON (source, timestamp, kind). JSON absent → empty/placeholder clearly labeled. NO fabricated timestamps | V14,T11b,I.home-dash |
| T13 | x | Data Catalog route `/catalog` + nav link (header/landing doorway). tiled/gallery layout, one card per dataset/product from T11a | I.catalog,I.landing |
| T14 | x | catalog card content: show all available metadata (T11a fields); hide missing, don't fake. each card = shareable deep link (V16) + "view on map" button → `/map` w/ layer visible (V15) | V15,V16,V18,T11a,I.catalog,I.map |
| T15 | x | catalog search/filter: match across all displayed metadata; type-ahead OK. empty result → explicit "no datasets match" | V17,I.catalog |

Sequencing: T1 → T2 (quick win) → T3,T4,T5 (core value) → T6,T7 (entry reframe, dep on routes) → T8,T9,T10 (polish).
New (2026-06-23): T11a (shared metadata selector) + T11b (stats-JSON client) → T11,T12
(home dashboard) → T13 (catalog route) → T14,T15 (catalog cards + search). T14
view-on-map reuses urlState visible-layers deep-link (codebase-map). T14 metadata
depends on T4a `measurementType` (done). Dashboard counts/feed = read-only from
DIE nightly JSON (I.stats-json); Weaver does NOT compute them (keeps C2 client-only).

## §B bugs

| id | date | cause | fix |
|----|------|-------|-----|
| B1 | 2026-06-22 | T2 made statewide `actively_monitored_wells` default-visible (V5). It's features-source + early in catalog order, so the table's "first visible features layer" auto-pick promoted it over CABQ/toggled Springs; mock returns it empty → 8 filter/table/draw/sort BDD scenarios failed (table bound to empty layer). | V12: `excludeFromAutoTable` flag; AppShell skips flagged layers in table auto-pick |

## open-Q (dashboard+catalog, 2026-06-23)

- O5 source unit DECIDED → show BOTH: #services + #datasets as separate tiles, plus
  total #sites (V13, T11).
- O6 ✓ activity feed + ALL counts DECIDED → nightly DIE job writes static JSON to GCP
  (I.stats-json); frontend fetches read-only (T11b). NOT scaffold-only, NOT live-computed.
  JSON schema = `{generatedAt, counts:{services,datasets,sites}, events:[{source,timestamp,kind?}]}`.
- O7 ✓ RESOLVED → no live site-count query. Site count precomputed nightly by DIE in
  stats JSON. Keeps C2 (Weaver computes nothing). Open sub-Q: exact JSON URL/schema =
  DIE-side, coordinate before T11b.
- O8 ? catalog scope: include STA agency networks as cards too, or Ocotillo products
  only? default → ALL datasets (STA + Ocotillo + OSE + NWIS) for completeness. confirm.

## open-Q — original, all resolved ✓

- O1 ✓ NO server well-ID lookup. No service exposes queryable well-ID search; nearest-point
  not implemented. ID fields exist (monitoring_location_number/@iot.id/pod_file) but only
  usable as client-side filter on already-loaded features. bbox queries exist on OGC+ArcGIS,
  NOT STA. → location search = address-only (T3). well-ID = optional client filter.
- O2 ✓ DECIDED → US Census Geocoder (C7).
- O3 ✓ no measurement-type metadata on layers today. Facet needs new field → T4a.
  DECIDED → layer regroup = "Monitoring networks" vs "Integrated data products" (T9).
- O4 ✓ confirmed client-only, no Weaver backend. About + Help + all clients fetch third-party
  direct (config.ts, clients/*). No geocoding exists; only client text-filter. C2 verified.
