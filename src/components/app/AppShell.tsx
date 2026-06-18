import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
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
import { useViewState } from "@/hooks/useViewState"
import type { Selection } from "@/lib/urlState"
import { LayerList } from "./LayerList"
import { MapView } from "./MapView"
import { InspectPanel } from "./InspectPanel"
import { AttributeTable } from "./AttributeTable"
import { FilterControls } from "./FilterControls"

/**
 * AppShell — header + filters + layer sidebar + map + inspect panel + table.
 * All view state lives in the URL via useViewState, so any view is shareable.
 */
export function AppShell() {
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

  const [bounds, setBounds] = useState<[number, number, number, number] | undefined>()
  const [tableOpen, setTableOpen] = useState(false)

  const layerIds = search.layers ?? []
  const visibleLayers = LAYER_CATALOG.filter((l) => layerIds.includes(l.id))
  const selectedLayer = selection ? getLayer(selection.layerId) : undefined

  // Active layer for the table: the selected layer, else first visible.
  const activeLayer =
    selectedLayer ??
    visibleLayers.find((l) => l.source === "features") ??
    visibleLayers[0]

  const filters = { q: search.q, bbox: search.bbox, bounds }

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
    }
  }, [select, clearSelection])

  return (
    <PageShell>
      <NavBar fluid>
        <div className="flex items-center gap-2">
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
        <FilterControls
          bbox={!!search.bbox}
          q={search.q ?? ""}
          onBboxChange={setBbox}
          onQueryChange={setQuery}
        />
        <NavBarActions>
          <Button
            variant="outline"
            size="sm"
            data-testid="toggle-table"
            aria-pressed={tableOpen}
            onClick={() => setTableOpen((v) => !v)}
          >
            {tableOpen ? "Hide table" : "Attribute table"}
          </Button>
          <Badge variant="secondary">v0.1.0</Badge>
          <ModeToggle />
        </NavBarActions>
      </NavBar>

      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-y-auto border-r bg-card p-5">
          <LayerList visible={layerIds} onToggle={toggleLayer} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <MapView
              layers={visibleLayers}
              filters={filters}
              selection={selection}
              initialView={initialView}
              onSelect={select}
              onClearSelection={clearSelection}
              onMove={(lng, lat, z, b) => {
                setBounds(b)
                setView(lng, lat, z)
              }}
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
          />
        )}
      </div>
    </PageShell>
  )
}
