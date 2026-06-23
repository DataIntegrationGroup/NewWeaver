import { X } from "lucide-react"

import type { LayerConfig } from "@/catalog/layers"
import { cn } from "@/lib/utils"

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
 * Chips overlaid on the map naming the enabled layers, each with its legend
 * color. Clicking the chip body toggles that layer's visibility on the map
 * (a hidden layer stays as a dimmed chip); the × button removes the layer
 * entirely. A quick read of (and handle on) what's drawn without the sidebar.
 */
export function ActiveLayerChips({
  layers,
  hiddenIds,
  onToggle,
  onRemove,
}: {
  layers: LayerConfig[]
  /** Ids of layers currently hidden (enabled but not drawn). */
  hiddenIds?: string[]
  /** Toggle a layer's map visibility (chip body click). */
  onToggle: (id: string) => void
  /** Remove a layer entirely (× button). */
  onRemove: (id: string) => void
}) {
  if (layers.length === 0) return null
  const hidden = new Set(hiddenIds ?? [])
  return (
    <div
      data-testid="active-layer-chips"
      className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-14"
    >
      <div className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-1.5">
        {layers.map((l) => {
          const isHidden = hidden.has(l.id)
          return (
            <div
              key={l.id}
              data-testid={`chip-${l.id}`}
              data-hidden={isHidden || undefined}
              className={cn(
                "group flex items-center rounded-full border bg-card/95 text-xs shadow-sm backdrop-blur transition-colors",
                isHidden && "opacity-50"
              )}
            >
              <button
                type="button"
                data-testid={`chip-toggle-${l.id}`}
                aria-pressed={!isHidden}
                aria-label={`${isHidden ? "Show" : "Hide"} ${l.title} on the map`}
                onClick={() => onToggle(l.id)}
                className="flex items-center gap-1.5 rounded-l-full py-1 pl-2 pr-1.5 hover:bg-accent"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    isHidden && "ring-1 ring-inset ring-muted-foreground/50"
                  )}
                  style={{ background: isHidden ? "transparent" : layerColor(l) }}
                />
                <span className="max-w-[10rem] truncate">{l.title}</span>
              </button>
              <button
                type="button"
                data-testid={`chip-remove-${l.id}`}
                aria-label={`Remove ${l.title}`}
                onClick={() => onRemove(l.id)}
                className="rounded-r-full py-1 pl-0.5 pr-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-3 shrink-0" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
