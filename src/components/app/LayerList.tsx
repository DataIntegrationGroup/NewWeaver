import { LAYER_CATALOG, type LayerConfig } from "@/catalog/layers"
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
import { useLayerLoading } from "@/hooks/useLayerData"

interface LayerListProps {
  /** Ids of currently-visible layers. */
  visible: string[]
  onToggle: (id: string) => void
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

/** All sections expanded by default. */
const DEFAULT_OPEN = SECTIONS.map((s) => s.section)

/**
 * LayerList — the catalog of map layers, each with a legend swatch and a
 * visibility toggle. Driven entirely by LAYER_CATALOG via the DSDS
 * LayerSelector, so a new dataset shows up here without UI changes. Layers are
 * grouped by their `section` into collapsible accordion groups (all open by
 * default; each can be toggled independently).
 */
export function LayerList({ visible, onToggle }: LayerListProps) {
  const loadingIds = [...useLayerLoading()]
  return (
    <div className="space-y-4">
      <h2 className="!text-base !font-semibold uppercase tracking-wide text-muted-foreground">
        Layers
      </h2>
      <Accordion type="multiple" defaultValue={DEFAULT_OPEN}>
        {SECTIONS.map(({ section, options }) => (
          <AccordionItem key={section} value={section}>
            <AccordionTrigger className="!text-xs !font-semibold uppercase tracking-wide text-muted-foreground/80">
              {section}
            </AccordionTrigger>
            <AccordionContent>
              <LayerSelector
                options={options}
                value={visible}
                loadingIds={loadingIds}
                onToggle={onToggle}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
