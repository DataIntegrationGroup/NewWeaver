/**
 * SearchWidgets — the sidebar's four "find/narrow the data" tools (place
 * search, regions of interest, browse-by-measurement, text/extent filter)
 * grouped into a collapsible accordion instead of four always-open sections
 * stacked on top of each other. Collapsed by default to cut sidebar clutter;
 * `openRequest` lets a parent force one open (e.g. the #find/#measure
 * doorway deep links in AppShell, which need their target section visible).
 */
import { useEffect, useState, type ReactNode } from "react"
import { Gauge, Layers, MapPin, LandPlot, SlidersHorizontal } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { LayerConfig, MeasurementType } from "@/catalog/layers"
import type { RegionKind } from "@/catalog/regions"
import type { GeocodeResult } from "@/lib/geocode"
import type { RegionCoverage } from "@/lib/regions"
import { LocationSearch } from "./LocationSearch"
import { RegionSelector, type RegionChip } from "./RegionSelector"
import { MeasurementFacet } from "./MeasurementFacet"
import { FilterControls } from "@/components/ui/filter-controls"

interface SearchWidgetsProps {
  layers: LayerConfig[]
  onLocate: (result: GeocodeResult | null) => void
  onExport: () => void
  regionChips: RegionChip[]
  regionCoverage: RegionCoverage | null
  onAddRegion: (kind: RegionKind, id: string) => void
  onRemoveRegion: (kind: RegionKind, id: string) => void
  onClearRegions: () => void
  onMeasurementSelect: (type: MeasurementType) => void
  bbox: boolean
  q: string
  onBboxChange: (v: boolean) => void
  onQueryChange: (v: string) => void
  /** The layer catalog (LayerList), rendered as the accordion's "Layers"
   *  section. Passed as a node so AppShell keeps owning the layer state/props
   *  instead of threading them all through here. */
  layersSlot?: ReactNode
  /** Force a section open (e.g. a #find/#measure doorway deep link); bump
   *  `nonce` to re-fire on repeated requests for the same section. */
  openRequest?: { section: "location" | "regions" | "measure" | "filter"; nonce: number }
}

export function SearchWidgets({
  layers,
  onLocate,
  onExport,
  regionChips,
  regionCoverage,
  onAddRegion,
  onRemoveRegion,
  onClearRegions,
  onMeasurementSelect,
  bbox,
  q,
  onBboxChange,
  onQueryChange,
  layersSlot,
  openRequest,
}: SearchWidgetsProps) {
  // The layer catalog opens by default (it's the primary control); the
  // find/narrow tools stay collapsed except a section restored from a shared
  // URL (region chips, an active text/extent filter). Lazy init — checked once.
  const [open, setOpen] = useState<string[]>(() => {
    const initial: string[] = layersSlot ? ["layers"] : []
    if (regionChips.length > 0) initial.push("regions")
    if (bbox || q) initial.push("filter")
    return initial
  })

  useEffect(() => {
    if (!openRequest) return
    setOpen((cur) => (cur.includes(openRequest.section) ? cur : [...cur, openRequest.section]))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fire on nonce, not object identity
  }, [openRequest?.nonce])

  return (
    <div data-testid="search-widgets">
      <Accordion type="multiple" value={open} onValueChange={setOpen}>
        <AccordionItem value="location">
          <AccordionTrigger data-testid="search-widget-location-trigger">
            <span className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              Find a location
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <LocationSearch layers={layers} onLocate={onLocate} onExport={onExport} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="regions">
          <AccordionTrigger data-testid="search-widget-regions-trigger">
            <span className="flex items-center gap-2">
              <LandPlot className="size-4 shrink-0 text-muted-foreground" />
              Regions of interest
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <RegionSelector
              chips={regionChips}
              coverage={regionCoverage}
              onAdd={onAddRegion}
              onRemove={onRemoveRegion}
              onClearAll={onClearRegions}
              onExport={onExport}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="measure">
          <AccordionTrigger data-testid="search-widget-measure-trigger">
            <span className="flex items-center gap-2">
              <Gauge className="size-4 shrink-0 text-muted-foreground" />
              Browse by what’s measured
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <MeasurementFacet onSelect={onMeasurementSelect} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="filter">
          <AccordionTrigger data-testid="search-widget-filter-trigger">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
              Filter
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <FilterControls
              bbox={bbox}
              q={q}
              onBboxChange={onBboxChange}
              onQueryChange={onQueryChange}
            />
          </AccordionContent>
        </AccordionItem>

        {layersSlot && (
          <AccordionItem value="layers">
            <AccordionTrigger data-testid="search-widget-layers-trigger">
              <span className="flex items-center gap-2">
                <Layers className="size-4 shrink-0 text-muted-foreground" />
                Datasets
              </span>
            </AccordionTrigger>
            <AccordionContent>{layersSlot}</AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
