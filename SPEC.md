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
- C7 geocoder = US Census Geocoder (free, no key, public-domain, US-only — fits NM).
  [DECIDED 2026-06-22]. Nominatim/OSM = fallback if Census down.

## §I surfaces

- I.landing — landing/hero page (3 mechanism cards: Interactive map / Time series / Standards-based)
- I.map — Map page, MapLibre GL
- I.about — About page ("What you can do" list)
- I.help — Help/Docs page (Using the map / Data sources / API endpoints / Connect desktop GIS)
- I.layers — layer panel; group headers STA (agency networks), OCOTILLO (product names)
- I.svc — backing services: OGC API Features, SensorThings/FROST, ArcGIS REST, USGS NWIS
- I.export — Download/export control

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

## §T tasks

| id | st | task | cites |
|----|----|------|-------|
| T1 | x | discover codebase → docs/codebase-map.md: framework/build/routing, map impl + layer registration, layer-list grouping (STA/OCOTILLO)→service map, landing/About/Help/Map components, existing search/geocode/filter, confirm no backend | V11,I.map,I.layers,I.svc |
| T2 | x | fix default map view: fit-to-data-extent across enabled layers OR arrival-location; >1 representative layer visible, no misleading single cluster | V5,I.map |
| T3 | x | location search on Map: address/place via client geocoder (US Census, C7); fly+drop marker; results panel "what we have / what we don't"; query OGC/ArcGIS collections by bbox (no server nearest — compute nearest client-side from bbox results). well-ID = address-only; optional client-side filter on loaded feature ids (monitoring_location_number/@iot.id/pod_file). doc choice in codebase-map | V3,C2,C7,I.map,I.svc |
| T4a | . | add `measurementType` field to BaseLayer (src/catalog/layers.ts:29); populate per layer (depth_to_water, tds, chemistry, water_elevation, water_level, surface_water...). prereq for facet | I.layers |
| T4 | . | "browse by what's measured" facet keyed on T4a field: categories across networks; select → enable matching layers all networks + zoom extent | V4,T4a,I.map,I.layers |
| T5 | . | make export discoverable from a result: surface Download +/or API-collection link wherever narrowed (location result, facet, layer), not just toolbar | V9,I.export,I.map |
| T6 | . | reframe landing: replace 3 mechanism cards with question doorways → near-a-place(→T3), by-measured(→T4), use-in-GIS(→help GIS), build-with-API(→help API). real routes, plain labels, no "Standards-based" primary. keep "Explore map" but land on useful default (T2) | V1,V2,I.landing,I.help |
| T7 | . | landing: one-line orientation statement above doorways — what coverage exists (data kinds + geo/temporal scope), pulled from real sources, no overstate | C5,I.landing,I.svc |
| T8 | . | plain-language feature/point panel: lead with what-is-it + who-measures; tech ids secondary | V6,I.map |
| T9 | . | layer-panel headers: regroup STA+OCOTILLO → "Monitoring networks" (STA) vs "Integrated data products" (Ocotillo) [DECIDED]. update SECTION_DESCRIPTIONS (layers.ts:452). raw "OCOTILLO" not user-visible | V8,I.layers |
| T10 | . | copy cleanup: remove mechanics bullets from About "What you can do" + Help "Using the map" ("click point→datastreams", "click feature→attributes"). KEEP scope/provenance + Data sources/API/GIS sections intact | V7,C4,C5,I.about,I.help |

Sequencing: T1 → T2 (quick win) → T3,T4,T5 (core value) → T6,T7 (entry reframe, dep on routes) → T8,T9,T10 (polish).

## §B bugs

| id | date | cause | fix |
|----|------|-------|-----|
| B1 | 2026-06-22 | T2 made statewide `actively_monitored_wells` default-visible (V5). It's features-source + early in catalog order, so the table's "first visible features layer" auto-pick promoted it over CABQ/toggled Springs; mock returns it empty → 8 filter/table/draw/sort BDD scenarios failed (table bound to empty layer). | V12: `excludeFromAutoTable` flag; AppShell skips flagged layers in table auto-pick |

## open-Q — all resolved ✓

- O1 ✓ NO server well-ID lookup. No service exposes queryable well-ID search; nearest-point
  not implemented. ID fields exist (monitoring_location_number/@iot.id/pod_file) but only
  usable as client-side filter on already-loaded features. bbox queries exist on OGC+ArcGIS,
  NOT STA. → location search = address-only (T3). well-ID = optional client filter.
- O2 ✓ DECIDED → US Census Geocoder (C7).
- O3 ✓ no measurement-type metadata on layers today. Facet needs new field → T4a.
  DECIDED → layer regroup = "Monitoring networks" vs "Integrated data products" (T9).
- O4 ✓ confirmed client-only, no Weaver backend. About + Help + all clients fetch third-party
  direct (config.ts, clients/*). No geocoding exists; only client text-filter. C2 verified.
