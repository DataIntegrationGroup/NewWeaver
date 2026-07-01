import { useEffect, useRef, useState } from "react"
import { Download, Layers, Share2, Table2 } from "lucide-react"
import type { Polygon } from "geojson"
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
import { LocationSearch } from "./LocationSearch"
import { MeasurementFacet } from "./MeasurementFacet"
import type { GeocodeResult } from "@/lib/geocode"
import { MapView } from "./MapView"
import { InspectPanel } from "./InspectPanel"
import { AttributeTable } from "./AttributeTable"
import { FilterControls } from "./FilterControls"
import { ExportDialog } from "./ExportDialog"
import { OnboardingTour } from "./OnboardingTour"

const SIDEBAR_WIDTH_KEY = "weaver-sidebar-width"
const SIDEBAR_MIN = 240
const SIDEBAR_MAX = 520
const SIDEBAR_DEFAULT = 288

/**
 * AppShell — header + filters + layer sidebar + map + inspect panel + table.
 * All view state lives in the URL via useViewState, so any view is shareable.
 */
export function AppShell() {
  const posthog = usePostHog()
  const {
    search,
    selection,
    toggleLayer,
    enableLayers,
    setView,
    select,
    clearSelection,
    setBbox,
    setQuery,
  } = useViewState()

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
  const [opacityById, setOpacityById] = useState<Record<string, number>>({})
  const [hideNoDataById, setHideNoDataById] = useState<Record<string, boolean>>({})
  const [attributeQueryById, setAttributeQueryById] = useState<Record<string, string>>({})
  const [facetValuesById, setFacetValuesById] = useState<Record<string, string[]>>({})
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
  const visibleLayers = LAYER_CATALOG.filter((l) => layerIds.includes(l.id))
  const selectedLayer = selection ? getLayer(selection.layerId) : undefined

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

  const filters = { q: search.q, bbox: search.bbox, bounds }

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

  const filterControls = (
    <FilterControls
      bbox={!!search.bbox}
      q={search.q ?? ""}
      onBboxChange={(v) => {
        posthog.capture("filter_to_extent_toggled", { enabled: v })
        setBbox(v)
      }}
      onQueryChange={setQuery}
    />
  )

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
          <LocationSearch
            layers={visibleLayers}
            onLocate={handleLocate}
            onExport={() => setExportOpen(true)}
          />
          {viewActions}
          <MeasurementFacet onSelect={handleMeasurement} />
          {filterControls}
          <LayerList
            visible={layerIds}
            opacityById={opacityById}
            onOpacityChange={(id, v) =>
              setOpacityById((m) => ({ ...m, [id]: v }))
            }
            hideNoDataById={hideNoDataById}
            onHideNoDataChange={(id, hide) =>
              setHideNoDataById((m) => ({ ...m, [id]: hide }))
            }
            attributeQueryById={attributeQueryById}
            onAttributeQueryChange={(id, q) =>
              setAttributeQueryById((m) => ({ ...m, [id]: q }))
            }
            facetValuesById={facetValuesById}
            onFacetChange={(id, values) =>
              setFacetValuesById((m) => ({ ...m, [id]: values }))
            }
            colorById={colorById}
            onColorChange={(id, color) =>
              setColorById((m) => ({ ...m, [id]: color }))
            }
            onToggle={handleToggleLayer}
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
              hideNoDataById={hideNoDataById}
              attributeQueryById={attributeQueryById}
              facetValuesById={facetValuesById}
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

      <OnboardingTour />
    </PageShell>
  )
}
