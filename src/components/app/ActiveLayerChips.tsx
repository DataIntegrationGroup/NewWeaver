import { X } from "lucide-react"

import type { LayerConfig } from "@/catalog/layers"

/** A layer's display color, from whichever paint channel it draws with. */
function layerColor(layer: LayerConfig): string {
  const p = layer.style.paint ?? {}
  return (
    (p["circle-color"] as string) ??
    (p["fill-color"] as string) ??
    (p["line-color"] as string) ??
    "var(--primary)"
  )
}

/**
 * Chips overlaid on the map naming the visible layers, each with its legend
 * color. Clicking a chip toggles that layer off — a quick read of (and handle
 * on) what's currently drawn without opening the sidebar.
 */
export function ActiveLayerChips({
  layers,
  onRemove,
}: {
  layers: LayerConfig[]
  onRemove: (id: string) => void
}) {
  if (layers.length === 0) return null
  return (
    <div
      data-testid="active-layer-chips"
      className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-14"
    >
      <div className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-1.5">
        {layers.map((l) => (
          <button
            key={l.id}
            type="button"
            data-testid={`chip-${l.id}`}
            aria-label={`Hide ${l.title}`}
            onClick={() => onRemove(l.id)}
            className="group flex items-center gap-1.5 rounded-full border bg-card/95 py-1 pl-2 pr-1.5 text-xs shadow-sm backdrop-blur transition-colors hover:bg-accent"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: layerColor(l) }}
            />
            <span className="max-w-[10rem] truncate">{l.title}</span>
            <X className="size-3 shrink-0 text-muted-foreground group-hover:text-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
