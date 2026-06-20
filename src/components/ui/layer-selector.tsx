import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** How a layer's points are drawn — mirrors the map's circle paint so the
 *  swatch in the list matches what's on the map. */
export interface PointStyle {
  /** Fill color of the point (MapLibre `circle-color`). */
  color: string
  /** Stroke color (MapLibre `circle-stroke-color`). Defaults to white. */
  strokeColor?: string
  /** Marker geometry hint — circle is the only kind today, but vector
   *  collections may draw as a filled square (fill) or a line. */
  shape?: "circle" | "square" | "line"
}

/**
 * PointSwatch — a small legend glyph drawn to match a map layer's point
 * style. Decorative: callers should pair it with the layer title for an
 * accessible label, so it's hidden from assistive tech.
 */
function PointSwatch({
  point,
  className,
  ...props
}: { point: PointStyle } & React.ComponentProps<"svg">) {
  const stroke = point.strokeColor ?? "#ffffff"
  const shape = point.shape ?? "circle"
  return (
    <svg
      data-slot="point-swatch"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      {...props}
    >
      {shape === "line" ? (
        <line
          x1="2"
          y1="8"
          x2="14"
          y2="8"
          stroke={point.color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : shape === "square" ? (
        <rect
          x="3"
          y="3"
          width="10"
          height="10"
          rx="1.5"
          fill={point.color}
          stroke={stroke}
          strokeWidth="1.5"
        />
      ) : (
        <circle cx="8" cy="8" r="5" fill={point.color} stroke={stroke} strokeWidth="1.5" />
      )}
    </svg>
  )
}

export interface LayerOption {
  /** Stable layer id. */
  id: string
  title: string
  description?: string
  /** Point style used to draw the legend swatch. */
  style: PointStyle
}

interface LayerSelectorProps extends Omit<React.ComponentProps<"ul">, "onToggle"> {
  options: LayerOption[]
  /** Ids of currently-visible layers. */
  value: string[]
  /** Ids whose data is loading; shows a spinner beside the toggle. */
  loadingIds?: string[]
  onToggle: (id: string) => void
}

/**
 * LayerSelector — a checkable list of map layers, each with a legend swatch
 * showing how its points are drawn. Presentational: the consumer owns the
 * catalog and the visibility state, mirroring BasemapSelector.
 */
function LayerSelector({
  options,
  value,
  loadingIds,
  onToggle,
  className,
  ...props
}: LayerSelectorProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <ul
        data-slot="layer-selector"
        role="group"
        aria-label="Map layers"
        className={cn("space-y-2", className)}
        {...props}
      >
        {options.map((option) => {
          const checked = value.includes(option.id)
          const loading = loadingIds?.includes(option.id) ?? false
          const label = (
            <label
              htmlFor={`layer-${option.id}`}
              className="flex min-w-0 cursor-pointer items-center gap-2.5"
            >
              <PointSwatch point={option.style} />
              <span className="truncate text-sm font-medium leading-tight">
                {option.title}
              </span>
            </label>
          )
          return (
            <li
              key={option.id}
              data-testid={`layer-row-${option.id}`}
              data-layer-title={option.title}
              data-visible={checked || undefined}
              className="flex items-center justify-between gap-3"
            >
              {option.description ? (
                <Tooltip>
                  <TooltipTrigger asChild>{label}</TooltipTrigger>
                  <TooltipContent side="right" className="max-w-56">
                    {option.description}
                  </TooltipContent>
                </Tooltip>
              ) : (
                label
              )}
              <div className="flex items-center gap-2">
                {loading && (
                  <Loader2
                    data-testid={`layer-loading-${option.id}`}
                    className="size-4 shrink-0 animate-spin text-muted-foreground"
                    aria-label="Loading layer data"
                  />
                )}
                <Switch
                  id={`layer-${option.id}`}
                  data-testid={`layer-toggle-${option.id}`}
                  checked={checked}
                  onCheckedChange={() => onToggle(option.id)}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </TooltipProvider>
  )
}

export { LayerSelector, PointSwatch }
