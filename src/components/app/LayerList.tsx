import { LAYER_CATALOG, type LayerConfig } from "@/catalog/layers"
import {
  LayerSelector,
  type LayerOption,
  type PointStyle,
} from "@/components/ui/layer-selector"

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

const OPTIONS: LayerOption[] = LAYER_CATALOG.map((layer) => ({
  id: layer.id,
  title: layer.title,
  description: layer.description,
  style: pointStyle(layer),
}))

/**
 * LayerList — the catalog of map layers, each with a legend swatch and a
 * visibility toggle. Driven entirely by LAYER_CATALOG via the DSDS
 * LayerSelector, so a new dataset shows up here without UI changes.
 */
export function LayerList({ visible, onToggle }: LayerListProps) {
  return (
    <div className="space-y-4">
      <h2 className="!text-base !font-semibold uppercase tracking-wide text-muted-foreground">
        Layers
      </h2>
      <LayerSelector options={OPTIONS} value={visible} onToggle={onToggle} />
    </div>
  )
}
