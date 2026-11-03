import { useEffect, useMemo, useRef, useState } from "react"
import { Download, SlidersHorizontal, Share2, Table2 } from "lucide-react"
import type { FeatureCollection, Polygon } from "geojson"
import { usePostHog } from "posthog-js/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import type { MapRef } from "@/components/ui/map"
import { SiteHeader } from "@/components/site/SiteHeader"
import { PageShell } from "@/components/ui/page"
import { NEW_MEXICO_VIEW } from "@/components/ui/map"
import { DEFAULT_DATASET_ID, datasetLayer, defaultColorFacet } from "@/catalog/mapDatasets"
import { useDatasetData, useMapDatasets } from "@/hooks/useDatasetData"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { filterFeatures } from "@/lib/filterFeatures"
import {
  NO_VALUE,
  binKey,
  facetCounts,
  selectionsFromKeys,
  type Facet,
} from "@/lib/facets"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  BASEMAPS,
  DEFAULT_BASEMAP,
  LIGHT_BASEMAP,
  DARK_BASEMAP,
  SATELLITE_BASEMAP,
} from "@/catalog/basemaps"
import { useViewState } from "@/hooks/useViewState"
import type { Selection } from "@/lib/urlState"
import { LocationSearch } from "./LocationSearch"
import { RegionSelector } from "./RegionSelector"
import { DatasetPicker } from "./DatasetPicker"
import { FacetAccordionItem, FacetLegend } from "./FacetFilters"
import { FilterChips, type FilterChip } from "./FilterChips"
import type { RegionChip } from "./RegionSelector"
import { FilterControls } from "@/components/ui/filter-controls"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import type { GeocodeResult } from "@/lib/geocode"
import { REGION_CATALOG, type RegionKind } from "@/catalog/regions"
import { useRegionFeatures } from "@/hooks/useRegions"
import { polygonsBbox, cleanRegionName } from "@/lib/regions"
import { MapView } from "./MapView"
import { SiteDetail } from "./SiteDetail"
import { AttributeTable } from "./AttributeTable"
import { ExportDialog } from "./ExportDialog"
import { OnboardingTour, type TourStep } from "@/components/onboarding-tour"

const SIDEBAR_WIDTH_KEY = "weaver-sidebar-width"
const SIDEBAR_MIN = 240
const SIDEBAR_MAX = 520
const SIDEBAR_DEFAULT = 288

// Getting-started tour content — points at this app's real UI. The tour
// component itself is generic (design-system); the steps live here.
const TOUR_STEPS: TourStep[] = [
  {
    title: "Pick a dataset",
    body: "Choose what the map shows — water levels or a water-quality result — then color and filter its sites in the sidebar.",
    target: "#map-sidebar",
    place: "right",
  },
  {
    title: "Inspect a point",
    body: "Click any point on the map to open its details — attributes, and for monitoring sites, a time-series chart of its observations.",
    target: "#main-content",
    place: "bottom",
  },
  {
    title: "Share your view",
    body: "The page URL captures your exact map — dataset, filters, extent, and selection. Hit Share to copy a link to it.",
    target: "[data-testid='share-view']",
    place: "bottom",
  },
]

/**
 * AppShell — header + dataset/filter sidebar + map + site detail panel + table.
 * All view state lives in the URL via useViewState, so any view is shareable.
 */
export function AppShell() {
  const posthog = usePostHog()
  const {
    search,
    selection,
    regions,
    setDataset,
    setColorBy,
    setFacet,
    clearFilters,
    setView,
    select,
    clearSelection,
    setBbox,
    setQuery,
    addRegion,
    removeRegion,
  } = useViewState()

  useDocumentTitle("Weaver — Map")
  const mapRef = useRef<MapRef | null>(null)
  const isDark = useTheme().resolvedTheme === "dark"

  const [bounds, setBounds] = useState<[number, number, number, number] | undefined>()
  const [tableOpen, setTableOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [shapes, setShapes] = useState<Polygon[]>([])
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP)
  // Pin dropped by the location search (SPEC §T.T3); null when none.
  const [searchMarker, setSearchMarker] = useState<{ lng: number; lat: number } | null>(null)

  // Resizable sidebar (desktop only); width persisted across visits.
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
    return saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX ? saved : SIDEBAR_DEFAULT
  })
  // Drag the right edge to resize. Moving right (larger clientX) widens it.
  const startSidebarResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidth
    const onMove = (ev: PointerEvent) =>
      setSidebarWidth(
        Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + (ev.clientX - startX)))
      )
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      setSidebarWidth((w) => {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(w)))
        return w
      })
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  // One dataset on the map at a time, from DIE's /collections. An id the API
  // doesn't list (an old link, a retired product) falls back to Water Levels.
  const { datasets, error: datasetsError } = useMapDatasets()
  const dataset =
    datasets.find((d) => d.id === search.ds) ??
    datasets.find((d) => d.id === DEFAULT_DATASET_ID) ??
    datasets[0]
  const { data, facets, isLoading, error } = useDatasetData(dataset)
  // Wait for the sites before picking a color: data-built facets (Source)
  // have no bins until then, and the default would jump once they land.
  const colorFacet = isLoading
    ? undefined
    : (facets.find((f) => f.id === search.color && f.colorable !== false && f.bins.length > 0) ??
      defaultColorFacet(facets))
  // Bin keys in the URL → bin indexes. Keyed on the serialized keys so a
  // re-render with an equal `f` doesn't re-filter.
  const facetKeysKey = JSON.stringify(search.f ?? {})
  const selections = useMemo(
    () => selectionsFromKeys(facets, search.f),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search.f compared by value
    [facets, facetKeysKey]
  )
  const setFacetBins = (facet: Facet, bins: number[]) => {
    posthog.capture("facet_changed", { dataset_id: dataset?.id, facet_id: facet.id })
    setFacet(facet.id, bins.map((i) => binKey(facet, i)))
  }
  const isDesktop = useMediaQuery("(min-width: 64rem)")
  const layer = useMemo(
    () => (dataset ? datasetLayer(dataset, colorFacet) : undefined),
    [dataset, colorFacet]
  )

  // Regions of interest (county/PWS/basin), resolved from the URL — 0 or more.
  // Their combined polygons restrict the map/table/export — narrower than a
  // drawn shape, which only ever widens (lib/selection.ts). `polygons` keeps
  // its identity until a region query changes, so panning doesn't re-filter.
  const { regions: regionResults, polygons: regionPolys } = useRegionFeatures(regions)
  const regionChips: RegionChip[] = regions.map((r, i) => {
    const raw = regionResults[i]?.feature?.properties?.[REGION_CATALOG[r.kind].nameField]
    return {
      kind: r.kind,
      id: r.id,
      name: typeof raw === "string" ? cleanRegionName(raw) : undefined,
      loading: regionResults[i]?.isLoading ?? true,
    }
  })

  // Only pull `bounds` in when the "filter to map view" toggle is actually on
  // — otherwise `bounds` (which changes on every pan/zoom) would re-filter
  // every site on every drag frame although nothing filterable changed.
  const boundsForFilter = search.bbox ? bounds : undefined
  // Every filter except the facets: what facet counts are taken over.
  const baseFilters = useMemo(
    () => ({
      q: search.q,
      bbox: search.bbox,
      bounds: boundsForFilter,
      regionPolygons: regionPolys.length ? regionPolys : undefined,
    }),
    [search.q, search.bbox, boundsForFilter, regionPolys]
  )
  // The one filtering pass: per-bin counts (each facet without its own
  // selection) and the sites passing everything, which the map, table, place
  // search and export all share.
  const { counts, filtered } = useMemo(() => {
    const base = filterFeatures(data, baseFilters).features
    const { counts, matching } = facetCounts(base, facets, selections)
    const filtered: FeatureCollection = { type: "FeatureCollection", features: matching }
    return { counts, filtered }
  }, [data, baseFilters, facets, selections])
  const total = filtered.features.length
  const coverageSources = useMemo(
    () => (dataset ? [{ id: dataset.id, title: dataset.label, features: data.features }] : []),
    [dataset, data]
  )

  // Every active filter as a removable chip over the map.
  const filterChips: FilterChip[] = [
    ...facets.flatMap((f) => {
      const sel = selections[f.id]
      if (!sel) return []
      // Name whichever side is shorter: the bins kept, or the ones hidden.
      const all = [...f.bins.map((_, i) => i), NO_VALUE]
      const name = (i: number) => (i === NO_VALUE ? "No value" : f.bins[i].label)
      const kept = sel.filter((i) => i !== NO_VALUE).map(name)
      const hidden = all.filter((i) => !sel.includes(i)).map(name)
      const shown =
        kept.length === 0
          ? "No value"
          : kept.length <= hidden.length
            ? kept.join(", ")
            : `excluding ${hidden.join(", ")}`
      return [{ id: f.id, label: `${f.label}: ${shown}`, onRemove: () => setFacet(f.id, []) }]
    }),
    ...regionChips.map((r) => ({
      id: `region-${r.kind}-${r.id}`,
      label: r.name ?? REGION_CATALOG[r.kind].label,
      onRemove: () => handleRemoveRegion(r.kind, r.id),
    })),
    ...(search.q ? [{ id: "q", label: `Search: ${search.q}`, onRemove: () => setQuery("") }] : []),
    ...(search.bbox
      ? [{ id: "bbox", label: "In map view", onRemove: () => setBbox(false) }]
      : []),
  ]

  // Accordion sections that start open: any filter restored from the URL.
  const [openFilterSections] = useState(() => [
    ...Object.keys(search.f ?? {}),
    ...(search.q || search.bbox ? ["search"] : []),
  ])
  const filtersActive = filterChips.length > 0

  const initialView = {
    longitude: search.lng ?? NEW_MEXICO_VIEW.longitude,
    latitude: search.lat ?? NEW_MEXICO_VIEW.latitude,
    zoom: search.z ?? NEW_MEXICO_VIEW.zoom,
  }

  // Test seam: lets the BDD harness pick a feature deterministically without
  // simulating a WebGL canvas click.
  useEffect(() => {
    ;(window as unknown as { __weaver?: unknown }).__weaver = {
      select: (sel: Selection) => select(sel),
      clearSelection,
      // Inject drawn shapes deterministically (the BDD harness can't drive the
      // terra-draw canvas). Mirrors what DrawControls' onShapesChange does.
      setShapes: (polys: Polygon[]) => setShapes(polys),
    }
  }, [select, clearSelection])

  // Landing doorways deep-link here with a hash (SPEC §T.T6): #find focuses the
  // place search at the top of the sidebar; #download opens the export dialog.
  // The sidebar opens so the search is visible on mobile.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    if (hash === "download") {
      setExportOpen(true)
      return
    }
    if (hash !== "find") return
    setSidebarOpen(true)
    const t = setTimeout(() => document.getElementById("location-search-input")?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  // Keep the basemap paired with the theme: dark mode → dark tiles, light →
  // light. Satellite is theme-neutral, so leave it as the user chose.
  useEffect(() => {
    setBasemap((cur) =>
      cur === SATELLITE_BASEMAP ? cur : isDark ? DARK_BASEMAP : LIGHT_BASEMAP
    )
  }, [isDark])

  // Esc clears the current selection / closes the detail panel (unless it's
  // closing the mobile sidebar).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selection && !sidebarOpen) clearSelection()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selection, sidebarOpen, clearSelection])

  /** Center the map on a feature and zoom in if currently zoomed out. */
  const flyTo = (lng: number, lat: number) => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 13),
      duration: 600,
    })
  }

  // The region set just changed (added/removed, or restored from a shared
  // URL) and geometry has landed — fit the map to their combined extent, once
  // per distinct region set (a second region's geometry landing later
  // shouldn't refit once the first has).
  const regionsKey = regions.map((r) => `${r.kind}:${r.id}`).join(",")
  const firedRegionsKey = useRef<string | null>(null)
  useEffect(() => {
    if (firedRegionsKey.current === regionsKey) return
    if (regionPolys.length === 0) return
    const bbox = polygonsBbox(regionPolys)
    if (!bbox) return
    firedRegionsKey.current = regionsKey
    mapRef.current?.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 60, duration: 600 }
    )
  }, [regionsKey, regionPolys])

  const handleAddRegion = (kind: RegionKind, id: string) => {
    addRegion(kind, id)
    posthog.capture("region_selected", { region_kind: kind })
  }
  const handleRemoveRegion = (kind: RegionKind, id: string) => {
    removeRegion(kind, id)
    posthog.capture("region_removed", { region_kind: kind })
  }

  // Location search located (or cleared) a place: drop/clear the pin and fly to it.
  const handleLocate = (r: GeocodeResult | null) => {
    if (r) {
      setSearchMarker({ lng: r.lng, lat: r.lat })
      flyTo(r.lng, r.lat)
      posthog.capture("location_searched", { label: r.label })
    } else {
      setSearchMarker(null)
    }
  }

  const shareView = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied", { description: "Shareable URL for this exact view." })
    } catch {
      toast.error("Couldn’t copy the link")
    }
  }

  const handleBboxChange = (v: boolean) => {
    posthog.capture("filter_to_extent_toggled", { enabled: v })
    setBbox(v)
  }

  // View actions (table / share / download) — live in the sidebar so the
  // top navigation stays identical to the content pages.
  const viewActions = (
    <div className="grid grid-cols-3 gap-2">
      <Button
        variant="outline"
        size="sm"
        className="justify-center"
        data-testid="toggle-table"
        aria-pressed={tableOpen}
        aria-label={tableOpen ? "Hide attribute table" : "Show attribute table"}
        onClick={() => {
          const next = !tableOpen
          if (next) posthog.capture("attribute_table_opened")
          setTableOpen(next)
        }}
      >
        <Table2 />
        <span>{tableOpen ? "Hide" : "Table"}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="justify-center"
        data-testid="share-view"
        aria-label="Share this view"
        onClick={shareView}
      >
        <Share2 />
        <span>Share</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="justify-center"
        data-testid="open-export"
        aria-label="Download data"
        onClick={() => setExportOpen(true)}
      >
        <Download />
        <span>Download</span>
      </Button>
    </div>
  )

  const sidebar = (
    <>
      <Field>
        <FieldLabel htmlFor="location-search-input">Find a place</FieldLabel>
        <LocationSearch
          sources={coverageSources}
          onLocate={handleLocate}
          onExport={() => setExportOpen(true)}
        />
      </Field>
      <FieldSet className="gap-3">
        <FieldLegend variant="label">Region</FieldLegend>
        <RegionSelector chips={regionChips} onAdd={handleAddRegion} onRemove={handleRemoveRegion} />
      </FieldSet>
      {datasetsError ? (
        <Alert variant="destructive" data-testid="datasets-error">
          <AlertTitle>Couldn’t load the datasets</AlertTitle>
          <AlertDescription>The water data service didn’t respond. Try reloading the page.</AlertDescription>
        </Alert>
      ) : (
        <DatasetPicker
          datasets={datasets}
          dataset={dataset}
          onChange={(id) => {
            posthog.capture("dataset_selected", { dataset_id: id })
            setDataset(id)
          }}
        />
      )}
      <FieldSet className="gap-3" data-testid="filters-section">
        <FieldLegend variant="label" className="flex w-full items-center justify-between">
          Coloring and Filters
          {filtersActive && (
            <Button
              variant="link"
              size="xs"
              className="h-auto p-0"
              data-testid="clear-filters"
              onClick={() => {
                posthog.capture("filters_cleared", { dataset_id: dataset?.id })
                clearFilters()
              }}
            >
              Clear filters
            </Button>
          )}
        </FieldLegend>
        {error ? (
          <Alert variant="destructive" data-testid="dataset-error">
            <AlertTitle>Couldn’t load {dataset?.label ?? "this dataset"}</AlertTitle>
            <AlertDescription>Try another dataset, or reload the page.</AlertDescription>
          </Alert>
        ) : isLoading || !dataset || !colorFacet ? (
          <div className="space-y-2" data-testid="dataset-loading">
            <Skeleton className="h-8 w-24" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <>
            <FacetLegend
              datasetLabel={dataset.label}
              total={total}
              facets={facets}
              colorFacet={colorFacet}
              counts={counts[facets.indexOf(colorFacet)]}
              selected={selections[colorFacet.id] ?? []}
              onChange={(bins) => setFacetBins(colorFacet, bins)}
              onColorChange={(id) => {
                posthog.capture("color_by_changed", { dataset_id: dataset.id, facet_id: id })
                setColorBy(id)
              }}
            />
            <Accordion multiple defaultValue={openFilterSections}>
              {facets.map((f, k) =>
                f === colorFacet || f.bins.length === 0 ? null : (
                  <FacetAccordionItem
                    key={f.id}
                    facet={f}
                    counts={counts[k]}
                    selected={selections[f.id] ?? []}
                    onChange={(bins) => setFacetBins(f, bins)}
                  />
                )
              )}
              <AccordionItem value="search">
                <AccordionTrigger data-testid="filter-search-trigger">Search sites</AccordionTrigger>
                <AccordionContent>
                  <FilterControls
                    bbox={!!search.bbox}
                    q={search.q ?? ""}
                    onBboxChange={handleBboxChange}
                    onQueryChange={setQuery}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </FieldSet>
      {viewActions}
    </>
  )

  return (
    <PageShell>
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50"
      >
        Skip to map
      </a>
      <SiteHeader />

      <div className="relative flex min-h-0 flex-1">
        {isDesktop ? (
          <aside
            id="map-sidebar"
            aria-label="Dataset and filters"
            style={{ width: sidebarWidth }}
            className="relative shrink-0 space-y-5 overflow-y-auto border-r bg-card p-5"
          >
            {sidebar}
            {/* Resize handle on the right edge. */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              data-testid="sidebar-resize"
              onPointerDown={startSidebarResize}
              className="absolute right-0 top-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40"
            />
          </aside>
        ) : (
          <>
            <Button
              variant="outline"
              size="icon-sm"
              className="absolute left-3 top-3 z-30 bg-card shadow-sm"
              aria-label="Open dataset and filters"
              data-testid="toggle-sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <SlidersHorizontal />
            </Button>
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent
                side="left"
                id="map-sidebar"
                className="w-[85%] gap-5 overflow-y-auto p-5"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Dataset and filters</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>
          </>
        )}

        <main
          id="main-content"
          aria-label="Map and data"
          className="flex min-w-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1">
            {layer ? (
              <MapView
                mapRef={mapRef}
                layer={layer}
                data={filtered}
                empty={!isLoading && data.features.length > 0 && total === 0}
                selection={selection}
                marker={searchMarker}
                initialView={initialView}
                autoFit={
                  search.lng === undefined &&
                  search.lat === undefined &&
                  search.z === undefined
                }
                basemap={basemap}
                basemaps={BASEMAPS}
                onBasemapChange={setBasemap}
                onSelect={(sel) => {
                  posthog.capture("feature_selected", {
                    layer_id: sel.layerId,
                    feature_id: sel.featureId,
                  })
                  select(sel)
                }}
                onClearSelection={clearSelection}
                onMove={(lng, lat, z, b) => {
                  setBounds(b)
                  setView(lng, lat, z)
                }}
                onShapesChange={setShapes}
                region={regionPolys.length ? { polygons: regionPolys } : undefined}
                showLegend={!isDesktop}
                overlay={<FilterChips chips={filterChips} />}
              />
            ) : (
              <Skeleton data-testid="map-skeleton" className="h-full w-full rounded-none" />
            )}
          </div>
          {tableOpen && layer && (
            <div className="h-[45vh] shrink-0 border-t bg-card sm:h-72">
              <AttributeTable
                layer={layer}
                data={filtered}
                loading={isLoading}
                shapes={shapes}
                onClearShapes={() => setShapes([])}
                onExport={() => setExportOpen(true)}
                selectedFeatureId={
                  selection?.layerId === layer.id ? selection.featureId : undefined
                }
                onSelect={(featureId) => select({ layerId: layer.id, featureId })}
              />
            </div>
          )}
        </main>

        {dataset && selection?.layerId === dataset.id && (
          <SiteDetail
            key={selection.featureId}
            dataset={dataset}
            featureId={selection.featureId}
            onClose={clearSelection}
            onZoomTo={flyTo}
          />
        )}
      </div>

      {layer && (
        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          layer={layer}
          features={filtered.features}
          shapes={shapes}
        />
      )}

      <OnboardingTour steps={TOUR_STEPS} storageKey="weaver-tour-seen" />
    </PageShell>
  )
}
