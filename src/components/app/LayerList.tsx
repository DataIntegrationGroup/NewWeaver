import { useState } from "react"

import {
  LAYER_CATALOG,
  SECTION_DESCRIPTIONS,
  type LayerConfig,
} from "@/catalog/layers"
import { Input } from "@/components/ui/input"
import {
  LayerSelector,
  type LayerOption,
  type PointStyle,
} from "@/components/ui/layer-selector"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLayerLoading } from "@/hooks/useLayerData"
import { useLoadProgress } from "@/lib/loadProgress"

interface LayerListProps {
  /** Ids of currently-visible layers. */
  visible: string[]
  onToggle: (id: string) => void
  /** Layer id → opacity (0–1); a visible layer gets an opacity slider. */
  opacityById?: Record<string, number>
  onOpacityChange?: (id: string, opacity: number) => void
  /** Layer id → free-text attribute filter (settings popover). */
  attributeQueryById?: Record<string, string>
  onAttributeQueryChange?: (id: string, q: string) => void
  /** Layer id → selected values for that layer's facet (settings popover). */
  facetValuesById?: Record<string, string[]>
  onFacetChange?: (id: string, values: string[]) => void
  /** Layer id → whether clustering is on (settings popover). */
  clusterById?: Record<string, boolean>
  onClusterChange?: (id: string, cluster: boolean) => void
  /** Layer id → whether the bubble map (size-by-value) is on (settings popover). */
  bubbleById?: Record<string, boolean>
  onBubbleChange?: (id: string, bubble: boolean) => void
  /** Layer id → whether color-by-class is on (settings popover). */
  classifyById?: Record<string, boolean>
  onClassifyChange?: (id: string, classify: boolean) => void
  /** Layer id → [min, max] value range filter (settings popover). */
  rangeById?: Record<string, [number, number]>
  onRangeChange?: (id: string, range: [number, number]) => void
  /** Layer id → color override hex string. */
  colorById?: Record<string, string>
  onColorChange?: (id: string, color: string) => void
}

/** Derive the legend swatch style from a catalog layer's MapLibre paint. */
function pointStyle(layer: LayerConfig): PointStyle {
  const paint = layer.style.paint ?? {}
  const color =
    (paint["circle-color"] as string) ??
    (paint["fill-color"] as string) ??
    (paint["line-color"] as string) ??
    "currentColor"
  const shape =
    layer.style.type === "line"
      ? "line"
      : layer.style.type === "fill"
        ? "square"
        : "circle"
  return {
    color,
    strokeColor: (paint["circle-stroke-color"] as string) ?? undefined,
    shape,
  }
}

function toOption(layer: LayerConfig): LayerOption {
  return {
    id: layer.id,
    title: layer.title,
    description: layer.description,
    style: pointStyle(layer),
    facet: layer.facet,
    // Cluster toggle for color-mapped ("legend") layers, where clustering hides
    // the per-point category color behind a flat bubble, and for any point layer
    // that clusters by default so the user can spread points back out.
    supportsClusterToggle: !!layer.legend || layer.cluster === true,
    // Bubble map is offered for layers that declare a numeric field to size by.
    supportsBubbleToggle: !!layer.bubbleField,
    // Color-by-class is offered when the range presets carry a full color palette.
    supportsClassifyToggle: !!(
      layer.rangeField &&
      layer.rangePresets?.length &&
      layer.rangePresets.every((p) => p.color)
    ),
    // Value range slider for layers that declare a numeric field + domain.
    range:
      layer.rangeField && layer.rangeDomain
        ? {
            field: layer.rangeField,
            min: layer.rangeDomain[0],
            max: layer.rangeDomain[1],
            unit: layer.rangeUnit,
            presets: layer.rangePresets,
            presetsRef: layer.rangePresetsSource,
          }
        : undefined,
  }
}

/** Catalog grouped by section, preserving first-seen order. Layers without a
 *  section fall back to an "Other" heading. */
const SECTIONS: { section: string; options: LayerOption[] }[] = (() => {
  const groups = new Map<string, LayerOption[]>()
  for (const layer of LAYER_CATALOG) {
    const section = layer.section ?? "Other"
    const list = groups.get(section) ?? []
    list.push(toOption(layer))
    groups.set(section, list)
  }
  return [...groups].map(([section, options]) => ({ section, options }))
})()

/** Groundwater levels + chemistry expanded; all others collapsed. */
const DEFAULT_OPEN = ["Groundwater levels", "Groundwater Chemistry"]

/**
 * LayerList — the catalog of map layers, each with a legend swatch and a
 * visibility toggle. Driven entirely by LAYER_CATALOG via the DSDS
 * LayerSelector, so a new dataset shows up here without UI changes. Layers are
 * grouped by their `section` into collapsible accordion groups (all open by
 * default; each can be toggled independently).
 */
export function LayerList({ visible, onToggle, opacityById, onOpacityChange, attributeQueryById, onAttributeQueryChange, facetValuesById, onFacetChange, clusterById, onClusterChange, bubbleById, onBubbleChange, classifyById, onClassifyChange, rangeById, onRangeChange, colorById, onColorChange }: LayerListProps) {
  const loadingIds = [...useLayerLoading()]
  const progressById = useLoadProgress()
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState<string[]>(DEFAULT_OPEN)

  // Filter the catalog by title/description; while searching, every matching
  // section is forced open so results aren't hidden inside a collapsed group.
  const q = search.trim().toLowerCase()
  const sections = q
    ? SECTIONS.map((s) => ({
        section: s.section,
        options: s.options.filter(
          (o) =>
            o.title.toLowerCase().includes(q) ||
            o.description?.toLowerCase().includes(q)
        ),
      })).filter((s) => s.options.length > 0)
    : SECTIONS
  const openValue = q ? sections.map((s) => s.section) : open

  const allSections = SECTIONS.map((s) => s.section)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            data-testid="layers-expand-all"
            onClick={() => setOpen(allSections)}
            className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Expand all
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            data-testid="layers-collapse-all"
            onClick={() => setOpen([])}
            className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Collapse all
          </button>
        </div>
      </div>
      <Input
        type="search"
        placeholder="Search datasets…"
        data-testid="layer-search"
        className="h-8"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No layers match “{search}”.</p>
      ) : (
      <TooltipProvider delayDuration={200}>
      <Accordion type="multiple" value={openValue} onValueChange={setOpen}>
        {sections.map(({ section, options }) => {
          const help = SECTION_DESCRIPTIONS[section]
          const trigger = (
            <AccordionTrigger className="!text-xs !font-semibold uppercase tracking-wide text-muted-foreground/80">
              {section}
            </AccordionTrigger>
          )
          return (
          <AccordionItem key={section} value={section}>
            {help ? (
              <Tooltip>
                <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-72"
                  data-testid={`layer-group-tooltip-${section}`}
                >
                  {help}
                </TooltipContent>
              </Tooltip>
            ) : (
              trigger
            )}
            <AccordionContent>
              <LayerSelector
                options={options}
                value={visible}
                loadingIds={loadingIds}
                progressById={progressById}
                opacityById={opacityById}
                onOpacityChange={onOpacityChange}
                attributeQueryById={attributeQueryById}
                onAttributeQueryChange={onAttributeQueryChange}
                facetValuesById={facetValuesById}
                onFacetChange={onFacetChange}
                clusterById={clusterById}
                onClusterChange={onClusterChange}
                bubbleById={bubbleById}
                onBubbleChange={onBubbleChange}
                classifyById={classifyById}
                onClassifyChange={onClassifyChange}
                rangeById={rangeById}
                onRangeChange={onRangeChange}
                colorById={colorById}
                onColorChange={onColorChange}
                onToggle={onToggle}
              />
            </AccordionContent>
          </AccordionItem>
          )
        })}
      </Accordion>
      </TooltipProvider>
      )}
    </div>
  )
}
