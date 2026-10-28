"use client"

import * as React from "react"
import { Check } from "lucide-react"
import type { StyleSpecification } from "maplibre-gl"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"

import { cn } from "cn"
import { RadioGroup } from "@/components/ui/radio-group"

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

interface BasemapSelectorProps
  extends Omit<
    React.ComponentProps<typeof RadioGroup>,
    "value" | "defaultValue" | "onValueChange"
  > {
  options: BasemapOption[]
  /** Currently-selected basemap id. */
  value: string
  onValueChange: (id: string) => void
}

/**
 * BasemapSelector — a grid of selectable basemap thumbnails. Presentational
 * and map-library agnostic: the consumer owns the style list and applies the
 * chosen id to its map. A RadioGroup underneath, so arrow keys move the
 * selection and Tab enters and leaves the group as one stop.
 */
function BasemapSelector({
  options,
  value,
  onValueChange,
  className,
  ...props
}: BasemapSelectorProps) {
  return (
    <RadioGroup
      data-slot="basemap-selector"
      aria-label="Basemap"
      value={value}
      onValueChange={onValueChange}
      className={cn("grid-cols-2", className)}
      {...props}
    >
      {options.map((option) => (
        <RadioPrimitive.Root
          key={option.id}
          value={option.id}
          className={cn(
            "group relative block overflow-hidden rounded-lg border-2 text-left outline-none transition-colors",
            "border-border bg-background hover:border-muted-foreground/40",
            "focus-visible:ring-3 focus-visible:ring-ring/50",
            "data-checked:border-primary"
          )}
        >
          <div className="relative aspect-[2/1] bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_25%,transparent),color-mix(in_oklch,var(--secondary)_30%,transparent))]">
            {option.preview && (
              <img
                src={option.preview}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            <RadioPrimitive.Indicator className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3.5" />
            </RadioPrimitive.Indicator>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 py-1 text-xs font-semibold text-white">
              {option.title}
            </span>
          </div>
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  )
}

export { BasemapSelector }
