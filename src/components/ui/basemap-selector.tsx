import * as React from "react"
import { Check } from "lucide-react"
import type { StyleSpecification } from "maplibre-gl"

import { cn } from "@/lib/utils"

export interface BasemapOption {
  /** Stable id — the map style URL, or an arbitrary key when `style` is set. */
  id: string
  title: string
  /** Optional preview image URL; a gradient placeholder is shown otherwise. */
  preview?: string
  /** Inline MapLibre style. When set, applied instead of treating `id` as a
   *  style URL — used for token-free raster basemaps (e.g. satellite). */
  style?: StyleSpecification
}

interface BasemapSelectorProps extends React.ComponentProps<"div"> {
  options: BasemapOption[]
  /** Currently-selected basemap id. */
  value: string
  onValueChange: (id: string) => void
}

/**
 * BasemapSelector — a grid of selectable basemap thumbnails. Presentational
 * and map-library agnostic: the consumer owns the style list and applies the
 * chosen id to its map.
 */
function BasemapSelector({
  options,
  value,
  onValueChange,
  className,
  ...props
}: BasemapSelectorProps) {
  return (
    <div
      data-slot="basemap-selector"
      role="radiogroup"
      className={cn("grid grid-cols-2 gap-2", className)}
      {...props}
    >
      {options.map((option) => {
        const selected = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-active={selected || undefined}
            onClick={() => onValueChange(option.id)}
            className={cn(
              "group relative block overflow-hidden rounded-lg border-2 text-left outline-none transition-colors",
              "border-border bg-background hover:border-muted-foreground/40",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              "data-[active]:border-primary"
            )}
          >
            <div className="relative aspect-[2/1] bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_25%,transparent),color-mix(in_oklch,var(--secondary)_30%,transparent))]">
              {option.preview && (
                <img
                  src={option.preview}
                  alt={option.title}
                  className="h-full w-full object-cover"
                />
              )}
              {selected && (
                <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 py-1 text-xs font-semibold text-white">
                {option.title}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export { BasemapSelector }
