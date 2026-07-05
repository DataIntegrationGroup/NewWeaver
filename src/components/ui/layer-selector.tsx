import * as React from "react"
import { Loader2, Settings } from "lucide-react"

import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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

/**
 * AttributeFilterInput — the free-text field inside a layer's settings
 * popover. Locally debounced (mirrors FilterControls) so filtering a dense
 * layer doesn't re-run on every keystroke.
 */
function AttributeFilterInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (v: string) => void
}) {
  const [text, setText] = React.useState(value)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Resync the local (debounced) text when the committed value changes
  // externally — e.g. a reset or share-link navigation.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setText(value), [value])

  // Clear any pending debounce on unmount (e.g. the settings popover closing)
  // so it can't fire onChange after teardown.
  React.useEffect(() => () => clearTimeout(timer.current), [])

  const onType = (v: string) => {
    setText(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v), 250)
  }

  return (
    <Input
      type="search"
      placeholder="Filter features…"
      className="h-7 text-xs"
      value={text}
      data-testid={`layer-attribute-filter-${id}`}
      aria-label="Filter features by attribute"
      onChange={(e) => onType(e.target.value)}
    />
  )
}

/** A categorical property offered as multi-select chips in the settings popover. */
export interface LayerFacet {
  field: string
  label: string
  options: { value: string; label: string }[]
}

/**
 * FacetChips — toggleable chips for a layer's categorical facet (e.g.
 * Monitoring Recency's active/stale). Selecting one or more narrows the
 * layer to matching features; none selected shows everything.
 */
function FacetChips({
  id,
  facet,
  selected,
  onChange,
}: {
  id: string
  facet: LayerFacet
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {facet.options.map((opt) => {
        const active = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            data-testid={`layer-facet-${id}-${opt.value}`}
            onClick={() => toggle(opt.value)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export interface LayerOption {
  /** Stable layer id. */
  id: string
  title: string
  description?: string
  /** Point style used to draw the legend swatch. */
  style: PointStyle
  /** Shows a "hide no-data points" toggle in the settings popover. */
  supportsNoDataFilter?: boolean
  /** Categorical facet; shown as multi-select chips instead of free text. */
  facet?: LayerFacet
  /** Shows a "cluster points" toggle in the settings popover. */
  supportsClusterToggle?: boolean
  /** Shows a "bubble map" (size points by value) toggle in the settings popover. */
  supportsBubbleToggle?: boolean
  /** Shows a min/max value range slider in the settings popover, filtering by
   *  `field` over the full [min, max] domain. */
  range?: { field: string; min: number; max: number; unit?: string }
}

interface LayerSelectorProps extends Omit<React.ComponentProps<"ul">, "onToggle"> {
  options: LayerOption[]
  /** Ids of currently-visible layers. */
  value: string[]
  /** Ids whose data is loading; shows a spinner beside the toggle. */
  loadingIds?: string[]
  /** Layer id → features loaded so far, shown while a big layer pages in. */
  progressById?: Record<string, number>
  /** Layer id → opacity (0–1). A visible layer gets an opacity slider. */
  opacityById?: Record<string, number>
  onOpacityChange?: (id: string, opacity: number) => void
  /** Layer id → whether "not enough data" points are hidden. */
  hideNoDataById?: Record<string, boolean>
  onHideNoDataChange?: (id: string, hide: boolean) => void
  /** Layer id → free-text attribute filter, shown in the settings popover.
   *  Ignored for a layer with a `facet` — chips replace free text there. */
  attributeQueryById?: Record<string, string>
  onAttributeQueryChange?: (id: string, q: string) => void
  /** Layer id → selected values for that layer's facet. */
  facetValuesById?: Record<string, string[]>
  onFacetChange?: (id: string, values: string[]) => void
  /** Layer id → whether clustering is on (settings popover). */
  clusterById?: Record<string, boolean>
  onClusterChange?: (id: string, cluster: boolean) => void
  /** Layer id → whether the bubble map (size-by-value) is on (settings popover). */
  bubbleById?: Record<string, boolean>
  onBubbleChange?: (id: string, bubble: boolean) => void
  /** Layer id → current [min, max] value range (settings popover slider). */
  rangeById?: Record<string, [number, number]>
  onRangeChange?: (id: string, range: [number, number]) => void
  /** Layer id → color override hex string. */
  colorById?: Record<string, string>
  onColorChange?: (id: string, color: string) => void
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
  progressById,
  opacityById,
  onOpacityChange,
  hideNoDataById,
  onHideNoDataChange,
  attributeQueryById,
  onAttributeQueryChange,
  facetValuesById,
  onFacetChange,
  clusterById,
  onClusterChange,
  bubbleById,
  onBubbleChange,
  rangeById,
  onRangeChange,
  colorById,
  onColorChange,
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
          const loaded = progressById?.[option.id] ?? 0
          const opacity = opacityById?.[option.id] ?? 1
          const colorOverride = colorById?.[option.id]
          const swatchStyle = colorOverride
            ? { ...option.style, color: colorOverride }
            : option.style
          const titleLabel = (
            <label
              htmlFor={`layer-${option.id}`}
              className="min-w-0 cursor-pointer"
            >
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
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {onColorChange ? (
                    <label
                      aria-label={`${option.title} color`}
                      className="shrink-0 cursor-pointer rounded focus-within:ring-2 focus-within:ring-ring"
                    >
                      <PointSwatch point={swatchStyle} />
                      <input
                        type="color"
                        value={colorOverride ?? (typeof option.style.color === "string" ? option.style.color : "#6b7280")}
                        onChange={(e) => onColorChange(option.id, e.target.value)}
                        className="sr-only"
                      />
                    </label>
                  ) : (
                    <PointSwatch point={swatchStyle} />
                  )}
                  {option.description ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{titleLabel}</TooltipTrigger>
                      <TooltipContent side="right" className="max-w-56">
                        {option.description}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    titleLabel
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {loading && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      {loaded > 0 && (
                        <span
                          data-testid={`layer-progress-${option.id}`}
                          className="text-xs tabular-nums"
                        >
                          {loaded.toLocaleString()}
                        </span>
                      )}
                      <Loader2
                        data-testid={`layer-loading-${option.id}`}
                        className="size-4 shrink-0 animate-spin"
                        aria-label="Loading layer data"
                      />
                    </span>
                  )}
                  {checked && onOpacityChange && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={`${option.title} settings`}
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Settings className="size-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56" side="left" align="center">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Opacity</span>
                          <span className="text-xs tabular-nums">{Math.round(opacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(opacity * 100)}
                          data-testid={`layer-opacity-${option.id}`}
                          aria-label={`${option.title} opacity`}
                          onChange={(e) => onOpacityChange(option.id, Number(e.target.value) / 100)}
                          className="h-1 w-full cursor-pointer accent-primary"
                        />
                        {option.facet && onFacetChange ? (
                          <div className="mt-2 pt-2 border-t space-y-1">
                            <span className="text-xs text-muted-foreground">{option.facet.label}</span>
                            <FacetChips
                              id={option.id}
                              facet={option.facet}
                              selected={facetValuesById?.[option.id] ?? []}
                              onChange={(values) => onFacetChange(option.id, values)}
                            />
                          </div>
                        ) : (
                          onAttributeQueryChange && (
                            <div className="mt-2 pt-2 border-t space-y-1">
                              <span className="text-xs text-muted-foreground">Filter features</span>
                              <AttributeFilterInput
                                id={option.id}
                                value={attributeQueryById?.[option.id] ?? ""}
                                onChange={(v) => onAttributeQueryChange(option.id, v)}
                              />
                            </div>
                          )
                        )}
                        {option.supportsNoDataFilter && onHideNoDataChange && (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Hide no-data points</span>
                            <Switch
                              checked={hideNoDataById?.[option.id] ?? false}
                              onCheckedChange={(v) => onHideNoDataChange(option.id, v)}
                              aria-label="Hide no-data points"
                            />
                          </div>
                        )}
                        {option.supportsClusterToggle && onClusterChange && (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Cluster points</span>
                            <Switch
                              checked={clusterById?.[option.id] ?? false}
                              onCheckedChange={(v) => onClusterChange(option.id, v)}
                              aria-label="Cluster points"
                            />
                          </div>
                        )}
                        {option.supportsBubbleToggle && onBubbleChange && (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Bubble map (size by value)</span>
                            <Switch
                              checked={bubbleById?.[option.id] ?? false}
                              onCheckedChange={(v) => onBubbleChange(option.id, v)}
                              aria-label="Bubble map"
                            />
                          </div>
                        )}
                        {option.range && onRangeChange && (() => {
                          const { min, max, unit } = option.range!
                          const [lo, hi] = rangeById?.[option.id] ?? [min, max]
                          const step = Math.max(1, Math.round((max - min) / 200))
                          return (
                            <div className="mt-2 pt-2 border-t space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Value range</span>
                                <span className="text-xs tabular-nums">
                                  {lo.toLocaleString()}–{hi.toLocaleString()}
                                  {unit ? ` ${unit}` : ""}
                                </span>
                              </div>
                              <Slider
                                min={min}
                                max={max}
                                step={step}
                                value={[lo, hi]}
                                data-testid={`layer-range-${option.id}`}
                                aria-label={`${option.title} value range`}
                                onValueChange={(v) =>
                                  onRangeChange(option.id, [v[0], v[1]] as [number, number])
                                }
                              />
                            </div>
                          )
                        })()}
                      </PopoverContent>
                    </Popover>
                  )}
                  <Switch
                    id={`layer-${option.id}`}
                    data-testid={`layer-toggle-${option.id}`}
                    checked={checked}
                    onCheckedChange={() => onToggle(option.id)}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </TooltipProvider>
  )
}

export { LayerSelector, PointSwatch }
