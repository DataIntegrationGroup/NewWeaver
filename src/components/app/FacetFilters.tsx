import { useId } from "react"

import { cn } from "@/lib/utils"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NO_VALUE, NO_VALUE_BIN, toggleBin, type Facet } from "@/lib/facets"

interface FacetRowsProps {
  facet: Facet
  /** One count per bin, then "No value" (lib/facets `facetCounts`). */
  counts: number[]
  /** Ticked bin indexes; empty = every bin. */
  selected: number[]
  onChange: (selected: number[]) => void
  /** Show each bin's map color (the color-by facet, i.e. the legend). */
  swatches?: boolean
}

/**
 * A facet's bins as checkbox rows with live counts. Counts leave out the
 * facet's own selection, so an unticked bin still shows how many sites it
 * would add back. The last ticked bin can't be unticked: an empty selection
 * means "every bin", not "none".
 */
export function FacetRows({ facet, counts, selected, onChange, swatches }: FacetRowsProps) {
  const id = useId()
  const noValue = counts[facet.bins.length] ?? 0
  const rows = facet.bins.map((bin, i) => ({ i, bin, count: counts[i] ?? 0 }))
  if (noValue > 0) {
    rows.push({ i: NO_VALUE, bin: NO_VALUE_BIN, count: noValue })
  }
  const isOn = (i: number) => selected.length === 0 || selected.includes(i)
  const onCount = rows.filter((r) => isOn(r.i)).length

  return (
    <FieldGroup className="gap-0.5" data-testid={`facet-${facet.id}`}>
      {rows.map(({ i, bin, count }) => {
        const on = isOn(i)
        const key = i === NO_VALUE ? "none" : String(i)
        return (
          <Field
            key={key}
            orientation="horizontal"
            className={cn("gap-2 rounded-md px-1 py-1 hover:bg-accent", !on && "text-muted-foreground")}
            data-testid={`facet-${facet.id}-bin-${key}`}
          >
            <Checkbox
              id={`${id}-${key}`}
              checked={on}
              disabled={on && onCount === 1}
              onCheckedChange={() => onChange(toggleBin(facet, selected, i))}
            />
            <FieldLabel htmlFor={`${id}-${key}`} className="min-w-0 items-center font-normal">
              {swatches && (
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-full ring-1 ring-black/10", !on && "opacity-40")}
                  style={{ background: bin.color }}
                />
              )}
              <span className="min-w-0 flex-1 truncate" title={bin.label}>{bin.label}</span>
            </FieldLabel>
            <span className="text-xs tabular-nums text-muted-foreground">
              {count.toLocaleString()}
            </span>
          </Field>
        )
      })}
    </FieldGroup>
  )
}

interface FacetLegendProps {
  datasetLabel: string
  /** Sites passing every filter. */
  total: number
  facets: Facet[]
  colorFacet: Facet
  counts: number[]
  selected: number[]
  onChange: (selected: number[]) => void
  onColorChange: (facetId: string) => void
}

/**
 * The legend: the color-by facet's bins with their map colors, counts and
 * checkboxes. Switching "Color by" keeps every facet's selection.
 */
export function FacetLegend({
  datasetLabel,
  total,
  facets,
  colorFacet,
  counts,
  selected,
  onChange,
  onColorChange,
}: FacetLegendProps) {
  const id = useId()
  const colorable = facets.filter((f) => f.colorable !== false && f.bins.length > 0)
  return (
    <section aria-label={`${datasetLabel} legend`} data-testid="dataset-legend" className="space-y-2">
      <p className="text-sm text-muted-foreground">
        <span className="text-2xl font-semibold text-foreground" data-testid="dataset-total">
          {total.toLocaleString()}
        </span>{" "}
        {total === 1 ? "site" : "sites"}
      </p>
      {colorable.length > 1 && (
        <Field orientation="horizontal">
          <FieldLabel htmlFor={id} className="shrink-0 whitespace-nowrap">
            Color by
          </FieldLabel>
          <Select
            items={colorable.map((f) => ({ value: f.id, label: f.label }))}
            value={colorFacet.id}
            onValueChange={(v) => v && onColorChange(v)}
          >
            <SelectTrigger id={id} size="sm" className="w-full" data-testid="color-by-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorable.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      {colorFacet.title && <p className="text-xs text-muted-foreground">{colorFacet.title}</p>}
      <FacetRows facet={colorFacet} counts={counts} selected={selected} onChange={onChange} swatches />
    </section>
  )
}

/** "2 of 4" when a facet is narrowed; nothing when every bin is on. */
function selectionSummary(facet: Facet, selected: number[]): string | undefined {
  const bins = selected.filter((i) => i !== NO_VALUE)
  return selected.length ? `${bins.length} of ${facet.bins.length}` : undefined
}

/** A non-color facet as a collapsible filter. */
export function FacetAccordionItem(props: Omit<FacetRowsProps, "swatches">) {
  const summary = selectionSummary(props.facet, props.selected)
  return (
    <AccordionItem value={props.facet.id}>
      <AccordionTrigger data-testid={`facet-${props.facet.id}-trigger`}>
        <span className="flex flex-1 items-center justify-between gap-2 pr-2">
          {props.facet.label}
          {summary && <span className="text-xs font-normal text-primary">{summary}</span>}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <FacetRows {...props} />
      </AccordionContent>
    </AccordionItem>
  )
}
