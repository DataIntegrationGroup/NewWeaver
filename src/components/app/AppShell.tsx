import { useEffect, useMemo, useRef, useState } from "react"
import { Download, Layers, Share2, Table2 } from "lucide-react"
import type { Polygon } from "geojson"
import { useQueryClient } from "@tanstack/react-query"
import { usePostHog } from "posthog-js/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import type { MapRef } from "@/components/ui/map"
import { SiteHeader } from "@/components/site/SiteHeader"
import { PageShell } from "@/components/ui/page"
import { NEW_MEXICO_VIEW } from "@/components/ui/map"
import {
  LAYER_CATALOG,
  getLayer,
  layersForMeasurement,
  type MeasurementType,
} from "@/catalog/layers"
import {
  BASEMAPS,
  DEFAULT_BASEMAP,
  LIGHT_BASEMAP,
  DARK_BASEMAP,
  SATELLITE_BASEMAP,
} from "@/catalog/basemaps"
import { useViewState } from "@/hooks/useViewState"
import type { Selection } from "@/lib/urlState"
import { LayerList } from "./LayerList"
import { SearchWidgets } from "./SearchWidgets"
import type { RegionChip } from "./RegionSelector"
import type { GeocodeResult } from "@/lib/geocode"
import { REGION_CATALOG, type RegionKind } from "@/catalog/regions"
import { useRegionFeatures } from "@/hooks/useRegions"
import { regionPolygons, polygonsBbox, regionCoverage, cleanRegionName } from "@/lib/regions"
import { MapView } from "./MapView"
import { InspectPanel } from "./InspectPanel"
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
    title: "Browse the layers",
    body: "Toggle data layers on and off in the sidebar — monitoring networks, OSE GIS, and USGS NWIS. Use the search box to find one fast.",
    target: "#layer-sidebar",
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
    body: "The page URL captures your exact map — visible layers, extent, and selection. Hit Share to copy a link to it.",
    target: "[data-testid='share-view']",
    place: "bottom",
  },
]

/**
 * AppShell — header + filters + layer sidebar + map + inspect panel + table.
 * All view state lives in the URL via useViewState, so any view is shareable.
 */
export function AppShell() {
  const posthog = usePostHog()
  const {
    search,
    selection,
    regions,
    toggleLayer,
    enableLayers,
    setView,
    select,
    clearSelection,
    setBbox,
    setQuery,
    addRegion,
    removeRegion,
    clearRegions,
  } = useViewState()
  const queryClient = useQueryClient()

  useDocumentTitle("Weaver — Map")
  const mapRef = useRef<MapRef | null>(null)
  const { theme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const [bounds, setBounds] = useState<[number, number, number, number] | undefined>()
  const [tableOpen, setTableOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [shapes, setShapes] = useState<Polygon[]>([])
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP)
  // Pin dropped by the location search (SPEC §T.T3); null when none.
  const [searchMarker, setSearchMarker] = useState<{ lng: number; lat: number } | null>(null)
  // Measurement-facet fit request (SPEC §T.T4); nonce retriggers the same ids.
  const [fitRequest, setFitRequest] = useState<{ ids: string[]; nonce: number } | null>(null)
  // Forces open a collapsed SearchWidgets accordion section (e.g. the
  // #find/#measure doorway hash below); nonce retriggers the same section.
  const [openSearchRequest, setOpenSearchRequest] = useState<
    { section: "location" | "regions" | "measure" | "filter"; nonce: number } | null
  >(null)
  const [opacityById, setOpacityById] = useState<Record<string, number>>({})
  const [attributeQueryById, setAttributeQueryById] = useState<Record<string, string>>({})
  const [facetValuesById, setFacetValuesById] = useState<Record<string, string[]>>({})
  // Cluster-toggle default state. Color-mapped ("legend") layers default to
  // unclustered so their per-point category color is visible; other clustering
  // point layers default to clustered (matching their `cluster: true`). The
  // settings popover lets a user flip either. Kept in sync with the toggle
  // visibility rule in LayerList.toOption (legend || cluster === true).
  const [clusterById, setClusterById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      LAYER_CATALOG.filter((l) => l.legend || l.cluster === true).map((l) => [
        l.id,
        l.legend ? false : true,
      ])
    )
  )
  // Per-layer bubble-map (proportional-symbol) toggle; off by default.
  const [bubbleById, setBubbleById] = useState<Record<string, boolean>>({})
  // Per-layer color-by-class toggle (tints points by their rangeField bin); off by default.
  const [classifyById, setClassifyById] = useState<Record<string, boolean>>({})
  // Per-layer [min, max] value range filter over the layer's rangeField.
  const [rangeById, setRangeById] = useState<Record<string, [number, number]>>({})
  // Per-layer minimum-records threshold over the layer's minRecordsField.
  const [minRecordsById, setMinRecordsById] = useState<Record<string, number>>({})
  const [colorById, setColorById] = useState<Record<string, string>>({})
  // Layers hidden from the map via their chip (still enabled/listed, just not
  // drawn). Distinct from toggleLayer, which removes a layer outright.
  const [hiddenLayerIds, setHiddenLayerIds] = useState<string[]>([])
  // Per-layer filtered feature counts, reported by the map sources.
  const [layerCounts, setLayerCounts] = useState<Record<string, number>>({})

  // Resizable layer sidebar (desktop only); width persisted across visits.
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

  const layerIds = search.layers ?? []
  // Stable reference across renders unless the visible-layer set actually
  // changes — a fresh array here would force every CatalogLayer to re-key and
  // every source to re-filter on any unrelated re-render (e.g. a map pan).
  const layerIdsKey = layerIds.join(",")
  const visibleLayers = useMemo(
    () => LAYER_CATALOG.filter((l) => layerIds.includes(l.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the joined id string, not the array identity
    [layerIdsKey]
  )
  const selectedLayer = selection ? getLayer(selection.layerId) : undefined

  // Regions of interest (county/PWS/basin), resolved from the URL — 0 or more.
  // Their combined polygons restrict the map/table/export via
  // `filters.regionPolygons` (lib/filterFeatures.ts) — narrower than a drawn
  // shape, which only ever widens (lib/selection.ts).
  const regionFeatureQueries = useRegionFeatures(regions)
  const regionChips: RegionChip[] = regions.map((r, i) => {
    const q = regionFeatureQueries[i]
    return {
      kind: r.kind,
      id: r.id,
      name: (() => {
        const raw = q.data?.properties?.[REGION_CATALOG[r.kind].nameField] as
          | string
          | undefined
        return raw != null ? cleanRegionName(raw) : undefined
      })(),
      loading: q.isLoading,
    }
  })
  const allRegionPolys = useMemo(
    () => regionFeatureQueries.flatMap((q) => (q.data ? regionPolygons(q.data) : [])),
    [regionFeatureQueries]
  )
  const regionCov = useMemo(
    () =>
      allRegionPolys.length
        ? regionCoverage(allRegionPolys, visibleLayers, queryClient)
        : null,
    [allRegionPolys, visibleLayers, queryClient]
  )

  // Active layer for the table: the selected layer, else the first visible
  // table-eligible layer. Dense default-on context layers (e.g. statewide wells
  // seeding the first paint) are excluded from this auto-pick so they don't
  // displace the agency layer the table defaults to (SPEC §V.V12).
  const tableCandidates = visibleLayers.filter((l) => !l.excludeFromAutoTable)
  const activeLayer =
    selectedLayer ??
    tableCandidates.find((l) => l.source === "features") ??
    tableCandidates[0] ??
    visibleLayers[0]

  // Only pull `bounds` in when the "filter to map view" toggle is actually on
  // — otherwise `bounds` (which changes on every pan/zoom) would invalidate
  // `filters`' identity on every map move even though nothing filterable
  // changed, forcing every layer (region-filtered ones especially — a
  // per-feature point-in-polygon test) to re-filter on every drag frame.
  const boundsForFilter = search.bbox ? bounds : undefined
  const filters = useMemo(
    () => ({
      q: search.q,
      bbox: search.bbox,
      bounds: boundsForFilter,
      regionPolygons: allRegionPolys.length ? allRegionPolys : undefined,
    }),
    [search.q, search.bbox, boundsForFilter, allRegionPolys]
  )

  // Empty state: a text filter is active, every visible layer has reported its
  // filtered count, and they all came back empty.
  const emptyFilterQuery =
    search.q &&
    visibleLayers.length > 0 &&
    visibleLayers.every((l) => layerCounts[l.id] === 0)
      ? search.q
      : undefined

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
  // location search; #measure reveals the measurement facet; #download (from a
  // catalog card) opens the export dialog. Sidebar opens so the target is
  // visible on mobile.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    if (hash === "download") {
      setExportOpen(true)
      return
    }
    if (hash !== "find" && hash !== "measure") return
    setSidebarOpen(true)
    setOpenSearchRequest({ section: hash === "find" ? "location" : "measure", nonce: Date.now() })
    const t = setTimeout(() => {
      if (hash === "find") {
        document.getElementById("location-search-input")?.focus()
      } else {
        document
          .querySelector('[data-testid="measurement-facet"]')
          ?.scrollIntoView({ block: "nearest" })
      }
    }, 50)
    return () => clearTimeout(t)
  }, [])

  // Keep the basemap paired with the theme: dark mode → dark tiles, light →
  // light. Satellite is theme-neutral, so leave it as the user chose.
  useEffect(() => {
    setBasemap((cur) =>
      cur === SATELLITE_BASEMAP ? cur : isDark ? DARK_BASEMAP : LIGHT_BASEMAP
    )
  }, [isDark])

  // Esc clears the current selection / closes the inspect panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selection) clearSelection()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selection, clearSelection])

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
  // per distinct region set. `useQueries` hands back a new array each render
  // regardless of whether the data changed, so this guards with a ref keyed
  // on `regionsKey` rather than trusting `allRegionPolys`' identity — fitBounds
  // triggers onMove → a URL patch → re-render, which would otherwise re-fire
  // the effect and loop.
  const regionsKey = regions.map((r) => `${r.kind}:${r.id}`).join(",")
  const firedRegionsKey = useRef<string | null>(null)
  useEffect(() => {
    if (firedRegionsKey.current === regionsKey) return
    if (allRegionPolys.length === 0) return
    const bbox = polygonsBbox(allRegionPolys)
    if (!bbox) return
    firedRegionsKey.current = regionsKey
    mapRef.current?.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 60, duration: 600 }
    )
  }, [regionsKey, allRegionPolys])

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

  // Facet pick: enable every layer measuring this type (across all networks)
  // and zoom the map to their combined extent (SPEC §T.T4 / §V.V4).
  const handleMeasurement = (type: MeasurementType) => {
    const ids = layersForMeasurement(type)
    if (ids.length === 0) return
    enableLayers(ids)
    setFitRequest((prev) => ({ ids, nonce: (prev?.nonce ?? 0) + 1 }))
    posthog.capture("measurement_facet_selected", { measurement: type, layers: ids.length })
  }

  const handleToggleLayer = (id: string) => {
    posthog.capture("layer_toggled", {
      layer_id: id,
      layer_title: getLayer(id)?.title,
      visible: !layerIds.includes(id),
    })
    // Drop any stale hidden flag so a re-enabled layer comes back visible.
    setHiddenLayerIds((ids) => ids.filter((x) => x !== id))
    toggleLayer(id)
  }

  // Chip body click: hide/show the layer on the map without removing it.
  const handleToggleLayerHidden = (id: string) => {
    setHiddenLayerIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    )
    posthog.capture("layer_visibility_toggled", {
      layer_id: id,
      layer_title: getLayer(id)?.title,
      hidden: !hiddenLayerIds.includes(id),
    })
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
        {/* Mobile-only opener for the layers/controls panel (the panel is
            always present on ≥lg). */}
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute left-3 top-3 z-30 bg-card shadow-sm lg:hidden"
          aria-label="Toggle layers panel"
          aria-controls="layer-sidebar"
          aria-expanded={sidebarOpen}
          data-testid="toggle-sidebar"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <Layers />
        </Button>
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close layers panel"
            className="absolute inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          id="layer-sidebar"
          aria-label="Layers and filters"
          style={{ width: sidebarWidth }}
          className={cn(
            "w-72 shrink-0 space-y-5 overflow-y-auto border-r bg-card p-5",
            "absolute inset-y-0 left-0 z-40 max-w-[85%] transition-transform duration-200",
            "lg:relative lg:max-w-none lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {viewActions}
          <SearchWidgets
            layers={visibleLayers}
            onLocate={handleLocate}
            onExport={() => setExportOpen(true)}
            regionChips={regionChips}
            regionCoverage={regionCov}
            onAddRegion={handleAddRegion}
            onRemoveRegion={handleRemoveRegion}
            onClearRegions={clearRegions}
            onMeasurementSelect={handleMeasurement}
            bbox={!!search.bbox}
            q={search.q ?? ""}
            onBboxChange={handleBboxChange}
            onQueryChange={setQuery}
            openRequest={openSearchRequest ?? undefined}
            layersSlot={
              <LayerList
                visible={layerIds}
                opacityById={opacityById}
                onOpacityChange={(id, v) =>
                  setOpacityById((m) => ({ ...m, [id]: v }))
                }
                attributeQueryById={attributeQueryById}
                onAttributeQueryChange={(id, q) =>
                  setAttributeQueryById((m) => ({ ...m, [id]: q }))
                }
                facetValuesById={facetValuesById}
                onFacetChange={(id, values) =>
                  setFacetValuesById((m) => ({ ...m, [id]: values }))
                }
                clusterById={clusterById}
                onClusterChange={(id, cluster) =>
                  setClusterById((m) => ({ ...m, [id]: cluster }))
                }
                bubbleById={bubbleById}
                onBubbleChange={(id, bubble) =>
                  setBubbleById((m) => ({ ...m, [id]: bubble }))
                }
                classifyById={classifyById}
                onClassifyChange={(id, classify) =>
                  setClassifyById((m) => ({ ...m, [id]: classify }))
                }
                rangeById={rangeById}
                onRangeChange={(id, range) =>
                  setRangeById((m) => ({ ...m, [id]: range }))
                }
                minRecordsById={minRecordsById}
                onMinRecordsChange={(id, min) =>
                  setMinRecordsById((m) => ({ ...m, [id]: min }))
                }
                colorById={colorById}
                onColorChange={(id, color) =>
                  setColorById((m) => ({ ...m, [id]: color }))
                }
                onToggle={handleToggleLayer}
              />
            }
          />
          {/* Resize handle on the right edge — desktop only. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize layers panel"
            data-testid="sidebar-resize"
            onPointerDown={startSidebarResize}
            className="absolute right-0 top-0 z-20 hidden h-full w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40 lg:block"
          />
        </aside>

        <main
          id="main-content"
          aria-label="Map and data"
          className="flex min-w-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1">
            <MapView
              mapRef={mapRef}
              layers={visibleLayers}
              filters={filters}
              opacityById={opacityById}
              attributeQueryById={attributeQueryById}
              facetValuesById={facetValuesById}
              clusterById={clusterById}
              bubbleById={bubbleById}
              classifyById={classifyById}
              rangeById={rangeById}
              minRecordsById={minRecordsById}
              colorById={colorById}
              hiddenLayerIds={hiddenLayerIds}
              onToggleLayerHidden={handleToggleLayerHidden}
              onLayerCount={(id, n) =>
                setLayerCounts((m) => (m[id] === n ? m : { ...m, [id]: n }))
              }
              emptyFilterQuery={emptyFilterQuery}
              onToggleLayer={handleToggleLayer}
              selection={selection}
              marker={searchMarker}
              fitRequest={fitRequest ?? undefined}
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
              region={allRegionPolys.length ? { polygons: allRegionPolys } : undefined}
            />
          </div>
          {tableOpen && activeLayer && (
            <div className="h-[45vh] shrink-0 border-t bg-card sm:h-72">
              <AttributeTable
                layer={activeLayer}
                filters={filters}
                shapes={shapes}
                attributeQuery={attributeQueryById[activeLayer.id]}
                facetValues={facetValuesById[activeLayer.id]}
                onClearText={() => setQuery("")}
                onClearExtent={() => setBbox(false)}
                onClearShapes={() => setShapes([])}
                onClearRegions={clearRegions}
                onClearAttributeQuery={() =>
                  setAttributeQueryById((m) => ({ ...m, [activeLayer.id]: "" }))
                }
                onClearFacet={() =>
                  setFacetValuesById((m) => ({ ...m, [activeLayer.id]: [] }))
                }
                onExport={() => setExportOpen(true)}
                selectedFeatureId={
                  selection?.layerId === activeLayer.id ? selection.featureId : undefined
                }
                onSelect={(featureId) => select({ layerId: activeLayer.id, featureId })}
              />
            </div>
          )}
        </main>

        {selection && selectedLayer && (
          <InspectPanel
            layer={selectedLayer}
            featureId={selection.featureId}
            onClose={clearSelection}
            onZoomTo={flyTo}
          />
        )}
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        layers={visibleLayers}
        filters={filters}
        shapes={shapes}
      />

      <OnboardingTour steps={TOUR_STEPS} storageKey="weaver-tour-seen" />
    </PageShell>
  )
}
