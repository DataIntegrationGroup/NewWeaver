import * as React from "react"
import { Settings } from "lucide-react"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
  layerId,
  value,
  onChange,
}: {
  id: string
  layerId: string
  value: string
  onChange: (v: string) => void
}) {
  const [text, setText] = React.useState(value)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Resync the local (debounced) text when the committed value changes
  // externally — e.g. a reset or share-link navigation — and drop any pending
  // keystrokes so they can't land on top of it.
  React.useEffect(() => {
    clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(value)
  }, [value])

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
      id={id}
      type="search"
      placeholder="Filter features…"
      className="h-7 text-xs"
      value={text}
      data-testid={`layer-attribute-filter-${layerId}`}
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
  return (
    <ToggleGroup
      multiple
      variant="outline"
      size="sm"
      spacing={1}
      value={selected}
      onValueChange={onChange}
      aria-label={facet.label}
      className="flex-wrap"
    >
      {facet.options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          data-testid={`layer-facet-${id}-${opt.value}`}
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/**
 * ChoiceChips — single-select quick-pick chips (range presets, minimum
 * records, recency). Clicking the active chip keeps it selected, so there's
 * always a current choice.
 */
function ChoiceChips({
  label,
  choices,
  value,
  onChange,
  testIdPrefix,
}: {
  label: string
  choices: { value: string; label: string }[]
  /** Active choice, or undefined when none matches (e.g. a custom range). */
  value: string | undefined
  onChange: (value: string) => void
  testIdPrefix: string
}) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={1}
      value={value === undefined ? [] : [value]}
      onValueChange={(v) => {
        if (v[0] !== undefined) onChange(v[0])
      }}
      aria-label={label}
      className="flex-wrap"
    >
      {choices.map((c) => (
        <ToggleGroupItem
          key={c.value}
          value={c.value}
          data-testid={`${testIdPrefix}-${c.value}`}
        >
          {c.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
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
  /** Shows a "color by class" toggle in the settings popover (tints points by
   *  which `range.presets` bin their value falls in). */
  supportsClassifyToggle?: boolean
  /** Shows a min/max value range slider in the settings popover, filtering by
   *  `field` over the full [min, max] domain. `presets` render as quick-pick
   *  chips above the slider, each setting it to a named [min, max];
   *  `presetsRef` links a citation for the classification underneath. */
  range?: {
    field: string
    min: number
    max: number
    unit?: string
    presets?: { label: string; min: number; max: number; color?: string }[]
    presetsRef?: { label: string; url: string }
  }
  /** Shows a "minimum records" threshold in the settings popover: quick-pick
   *  chips that keep only features with at least the chosen count. The first
   *  option is the default (typically a low "show all" value). */
  minRecords?: {
    options: number[]
  }
  /** Shows a "measured within" recency filter in the settings popover:
   *  quick-pick year windows that keep only features measured within that many
   *  years of now. An "All" chip (no cutoff, value 0) is the default. */
  recency?: {
    options: number[]
  }
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
  /** Layer id → whether color-by-class is on (settings popover). */
  classifyById?: Record<string, boolean>
  onClassifyChange?: (id: string, classify: boolean) => void
  /** Layer id → current [min, max] value range (settings popover slider). */
  rangeById?: Record<string, [number, number]>
  onRangeChange?: (id: string, range: [number, number]) => void
  /** Layer id → current minimum-records threshold (settings popover). */
  minRecordsById?: Record<string, number>
  onMinRecordsChange?: (id: string, min: number) => void
  /** Layer id → current recency window in years, 0 = All (settings popover). */
  recencyById?: Record<string, number>
  onRecencyChange?: (id: string, years: number) => void
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
  classifyById,
  onClassifyChange,
  rangeById,
  onRangeChange,
  minRecordsById,
  onMinRecordsChange,
  recencyById,
  onRecencyChange,
  colorById,
  onColorChange,
  onToggle,
  className,
  ...props
}: LayerSelectorProps) {
  const uid = React.useId()
  return (
    <TooltipProvider delay={200}>
      <ul
        data-slot="layer-selector"
        aria-label="Map layers"
        className={cn("space-y-2", className)}
        {...props}
      >
        {options.map((option) => {
          const fieldId = `${uid}-${option.id}`
          const checked = value.includes(option.id)
          const loading = loadingIds?.includes(option.id) ?? false
          const loaded = progressById?.[option.id] ?? 0
          const opacity = opacityById?.[option.id] ?? 1
          const colorOverride = colorById?.[option.id]
          const swatchStyle = colorOverride
            ? { ...option.style, color: colorOverride }
            : option.style
          const showFacet = !!(option.facet && onFacetChange)
          const showAttributeFilter = !option.facet && !!onAttributeQueryChange
          const showNoData = !!(option.supportsNoDataFilter && onHideNoDataChange)
          const showCluster = !!(option.supportsClusterToggle && onClusterChange)
          const showBubble = !!(option.supportsBubbleToggle && onBubbleChange)
          const showClassify = !!(option.supportsClassifyToggle && onClassifyChange)
          const showRange = !!(option.range && onRangeChange)
          const showMinRecords = !!(option.minRecords && onMinRecordsChange)
          const showRecency = !!(option.recency && onRecencyChange)
          const hasSettings =
            !!onOpacityChange ||
            showFacet ||
            showAttributeFilter ||
            showNoData ||
            showCluster ||
            showBubble ||
            showClassify ||
            showRange ||
            showMinRecords ||
            showRecency
          const titleLabel = (
            <label
              htmlFor={fieldId}
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
                      <TooltipTrigger render={titleLabel} />
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
                      <Spinner
                        data-testid={`layer-loading-${option.id}`}
                        aria-label="Loading layer data"
                      />
                    </span>
                  )}
                  {checked && hasSettings && (
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`${option.title} settings`}
                            className="text-muted-foreground"
                          />
                        }
                      >
                        <Settings />
                      </PopoverTrigger>
                      <PopoverContent className="w-56" side="left" align="center">
                        <FieldGroup className="gap-0 divide-y *:py-2 *:first:pt-0 *:last:pb-0">
                          {onOpacityChange && (
                            <Field className="gap-1.5">
                              <div className="flex items-center justify-between">
                                <FieldTitle className="text-xs font-normal text-muted-foreground">
                                  Opacity
                                </FieldTitle>
                                <span className="text-xs tabular-nums">{Math.round(opacity * 100)}%</span>
                              </div>
                              <Slider
                                min={0}
                                max={100}
                                step={1}
                                value={Math.round(opacity * 100)}
                                data-testid={`layer-opacity-${option.id}`}
                                aria-label={`${option.title} opacity`}
                                onValueChange={(v) => onOpacityChange(option.id, (v as number) / 100)}
                              />
                            </Field>
                          )}
                          {showFacet && (
                            <Field className="gap-1">
                              <FieldTitle className="text-xs font-normal text-muted-foreground">{option.facet!.label}</FieldTitle>
                              <FacetChips
                                id={option.id}
                                facet={option.facet!}
                                selected={facetValuesById?.[option.id] ?? []}
                                onChange={(values) => onFacetChange!(option.id, values)}
                              />
                            </Field>
                          )}
                          {showAttributeFilter && (
                            <Field className="gap-1">
                              <FieldLabel htmlFor={`${fieldId}-filter`} className="text-xs font-normal text-muted-foreground">
                                Filter features
                              </FieldLabel>
                              <AttributeFilterInput
                                id={`${fieldId}-filter`}
                                layerId={option.id}
                                value={attributeQueryById?.[option.id] ?? ""}
                                onChange={(v) => onAttributeQueryChange!(option.id, v)}
                              />
                            </Field>
                          )}
                          {showNoData && (
                            <Field orientation="horizontal">
                              <FieldLabel htmlFor={`${fieldId}-no-data`} className="text-xs font-normal text-muted-foreground">
                                Hide no-data points
                              </FieldLabel>
                              <Switch
                                id={`${fieldId}-no-data`}
                                checked={hideNoDataById?.[option.id] ?? false}
                                onCheckedChange={(v) => onHideNoDataChange!(option.id, v)}
                              />
                            </Field>
                          )}
                          {showCluster && (
                            <Field orientation="horizontal">
                              <FieldLabel htmlFor={`${fieldId}-cluster`} className="text-xs font-normal text-muted-foreground">
                                Cluster points
                              </FieldLabel>
                              <Switch
                                id={`${fieldId}-cluster`}
                                checked={clusterById?.[option.id] ?? false}
                                onCheckedChange={(v) => onClusterChange!(option.id, v)}
                              />
                            </Field>
                          )}
                          {showBubble && (
                            <Field orientation="horizontal">
                              <FieldLabel htmlFor={`${fieldId}-bubble`} className="text-xs font-normal text-muted-foreground">
                                Bubble map (size by value)
                              </FieldLabel>
                              <Switch
                                id={`${fieldId}-bubble`}
                                checked={bubbleById?.[option.id] ?? false}
                                onCheckedChange={(v) => onBubbleChange!(option.id, v)}
                              />
                            </Field>
                          )}
                          {showClassify && (
                            <Field orientation="horizontal">
                              <FieldLabel htmlFor={`${fieldId}-classify`} className="text-xs font-normal text-muted-foreground">
                                Color by class
                              </FieldLabel>
                              <Switch
                                id={`${fieldId}-classify`}
                                checked={classifyById?.[option.id] ?? false}
                                onCheckedChange={(v) => onClassifyChange!(option.id, v)}
                              />
                            </Field>
                          )}
                          {showRange && (() => {
                            const { min, max, unit, presets, presetsRef } = option.range!
                            const [lo, hi] = rangeById?.[option.id] ?? [min, max]
                            // 200 stops across the domain, without rounding,
                            // so sub-unit ranges (e.g. 0–0.5 mg/L) still slide.
                            const step = (max - min) / 200 || 1
                            return (
                              <Field className="gap-1.5">
                                <div className="flex items-center justify-between">
                                  <FieldTitle className="text-xs font-normal text-muted-foreground">
                                    Value range
                                  </FieldTitle>
                                  <span className="text-xs tabular-nums">
                                    {lo.toLocaleString()}–{hi.toLocaleString()}
                                    {unit ? ` ${unit}` : ""}
                                  </span>
                                </div>
                                {presets && presets.length > 0 && (
                                  <ChoiceChips
                                    label={`${option.title} range presets`}
                                    choices={presets.map((p) => ({ value: p.label, label: p.label }))}
                                    value={presets.find((p) => p.min === lo && p.max === hi)?.label}
                                    onChange={(label) => {
                                      const p = presets.find((p) => p.label === label)!
                                      onRangeChange!(option.id, [p.min, p.max])
                                    }}
                                    testIdPrefix={`layer-range-preset-${option.id}`}
                                  />
                                )}
                                {presetsRef && (
                                  <a
                                    href={presetsRef.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                                  >
                                    {presetsRef.label} ↗
                                  </a>
                                )}
                                <Slider
                                  min={min}
                                  max={max}
                                  step={step}
                                  value={[lo, hi]}
                                  data-testid={`layer-range-${option.id}`}
                                  aria-label={`${option.title} value range`}
                                  onValueChange={(v) => {
                                    const [a, b] = v as number[]
                                    onRangeChange!(option.id, [a, b])
                                  }}
                                />
                              </Field>
                            )
                          })()}
                          {showMinRecords && (
                            <Field className="gap-1.5">
                              <FieldTitle className="text-xs font-normal text-muted-foreground">
                                Minimum records
                              </FieldTitle>
                              <ChoiceChips
                                label={`${option.title} minimum records`}
                                choices={option.minRecords!.options.map((n) => ({
                                  value: String(n),
                                  label: n <= 1 ? "All" : `≥ ${n.toLocaleString()}`,
                                }))}
                                value={String(minRecordsById?.[option.id] ?? option.minRecords!.options[0])}
                                onChange={(v) => onMinRecordsChange!(option.id, Number(v))}
                                testIdPrefix={`layer-min-records-${option.id}`}
                              />
                            </Field>
                          )}
                          {showRecency && (
                            <Field className="gap-1.5">
                              <FieldTitle className="text-xs font-normal text-muted-foreground">
                                Measured within
                              </FieldTitle>
                              <ChoiceChips
                                label={`${option.title} measured within`}
                                choices={[0, ...option.recency!.options].map((y) => ({
                                  value: String(y),
                                  label: y === 0 ? "All" : `${y} yr`,
                                }))}
                                value={String(recencyById?.[option.id] ?? 0)}
                                onChange={(v) => onRecencyChange!(option.id, Number(v))}
                                testIdPrefix={`layer-recency-${option.id}`}
                              />
                            </Field>
                          )}
                        </FieldGroup>
                      </PopoverContent>
                    </Popover>
                  )}
                  <Switch
                    id={fieldId}
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
