import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Download, Layers, Share2 } from "lucide-react"
import type { Polygon } from "geojson"
import { usePostHog } from "posthog-js/react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { useTheme } from "@/components/theme-provider"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import type { MapRef } from "@/components/ui/map"
import {
  NavBar,
  NavBarBrand,
  NavBarNav,
  NavBarLink,
  NavBarActions,
} from "@/components/ui/navbar"
import { PageShell } from "@/components/ui/page"
import { NEW_MEXICO_VIEW } from "@/components/ui/map"
import { LAYER_CATALOG, getLayer } from "@/catalog/layers"
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
import { MapView } from "./MapView"
import { InspectPanel } from "./InspectPanel"
import { AttributeTable } from "./AttributeTable"
import { FilterControls } from "./FilterControls"
import { ExportDialog } from "./ExportDialog"

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
  const [opacityById, setOpacityById] = useState<Record<string, number>>({})
  // Per-layer filtered feature counts, reported by the map sources.
  const [layerCounts, setLayerCounts] = useState<Record<string, number>>({})

  const layerIds = search.layers ?? []
  const visibleLayers = LAYER_CATALOG.filter((l) => layerIds.includes(l.id))
  const selectedLayer = selection ? getLayer(selection.layerId) : undefined

  // Active layer for the table: the selected layer, else first visible.
  const activeLayer =
    selectedLayer ??
    visibleLayers.find((l) => l.source === "features") ??
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

  return (
    <PageShell>
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50"
      >
        Skip to map
      </a>
      <NavBar fluid>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            className="lg:hidden"
            aria-label="Toggle layers panel"
            aria-controls="layer-sidebar"
            aria-expanded={sidebarOpen}
            data-testid="toggle-sidebar"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <Layers />
          </Button>
          <NavBarBrand asChild>
            <Link to="/">Weaver</Link>
          </NavBarBrand>
          <NavBarNav>
            <NavBarLink asChild>
              <Link to="/about">About</Link>
            </NavBarLink>
            <NavBarLink asChild>
              <Link to="/help" data-testid="nav-help">
                Help
              </Link>
            </NavBarLink>
          </NavBarNav>
        </div>
        <div className="hidden lg:block">{filterControls}</div>
        <NavBarActions>
          <Button
            variant="outline"
            size="sm"
            data-testid="toggle-table"
            aria-pressed={tableOpen}
            onClick={() => {
              const next = !tableOpen
              if (next) posthog.capture("attribute_table_opened")
              setTableOpen(next)
            }}
          >
            {tableOpen ? "Hide table" : "Attribute table"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="share-view"
            onClick={shareView}
          >
            <Share2 />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="open-export"
            onClick={() => setExportOpen(true)}
          >
            <Download />
            Download
          </Button>
          <Badge variant="secondary">v0.1.0</Badge>
          <ModeToggle />
        </NavBarActions>
      </NavBar>

      <div className="relative flex min-h-0 flex-1">
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
          className={cn(
            "w-72 shrink-0 space-y-5 overflow-y-auto border-r bg-card p-5",
            "absolute inset-y-0 left-0 z-40 max-w-[85%] transition-transform duration-200",
            "lg:static lg:max-w-none lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="lg:hidden">{filterControls}</div>
          <LayerList
            visible={layerIds}
            opacityById={opacityById}
            onOpacityChange={(id, v) =>
              setOpacityById((m) => ({ ...m, [id]: v }))
            }
            onToggle={(id) => {
              const nowVisible = !layerIds.includes(id)
              posthog.capture("layer_toggled", {
                layer_id: id,
                layer_title: getLayer(id)?.title,
                visible: nowVisible,
              })
              toggleLayer(id)
            }}
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
              onLayerCount={(id, n) =>
                setLayerCounts((m) => (m[id] === n ? m : { ...m, [id]: n }))
              }
              emptyFilterQuery={emptyFilterQuery}
              selection={selection}
              initialView={initialView}
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
            <div className="h-72 shrink-0 border-t bg-card">
              <AttributeTable
                layer={activeLayer}
                filters={filters}
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
    </PageShell>
  )
}
