import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface SourceFacetProps {
  sourceList: string[]
  selected: string[]
  counts: Map<string, number>
  onToggle: (source: string) => void
  onClear: () => void
}

function SourceOptions({ sourceList, selected, counts, onToggle }: SourceFacetProps) {
  return (
    <div className="flex flex-col gap-1">
      {sourceList.map((s) => (
        <label
          key={s}
          data-testid={`datasets-source-${s}`}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
        >
          <Checkbox checked={selected.includes(s)} onCheckedChange={() => onToggle(s)} />
          <span className="flex-1">{s}</span>
          <span className="text-muted-foreground tabular-nums">{counts.get(s) ?? 0}</span>
        </label>
      ))}
    </div>
  )
}

function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <Button variant="link" size="xs" className="h-auto p-0" onClick={onClear}>
      Clear
    </Button>
  )
}

/**
 * Source facet: any number of sources, each with its count for the current
 * view. `collapsible` (narrow screens) folds it into a closed accordion so the
 * results aren't pushed below a long list; the trigger shows how many are on.
 */
export function DatasetFilters({
  collapsible = false,
  ...props
}: SourceFacetProps & { collapsible?: boolean }) {
  const { selected, onClear } = props

  if (collapsible) {
    return (
      <Accordion data-testid="datasets-source-accordion" className="rounded-lg border px-3">
        <AccordionItem value="source">
          <AccordionTrigger className="items-center hover:no-underline">
            <span className="flex items-center gap-2">
              Source
              {selected.length > 0 && <Badge>{selected.length} selected</Badge>}
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2">
            {selected.length > 0 && (
              <div className="px-2">
                <ClearButton onClear={onClear} />
              </div>
            )}
            <SourceOptions {...props} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  return (
    <fieldset className="-mx-2 flex flex-col gap-2">
      <div className="flex items-center justify-between px-2">
        <legend className="text-sm font-medium">Source</legend>
        {selected.length > 0 && <ClearButton onClear={onClear} />}
      </div>
      <SourceOptions {...props} />
    </fieldset>
  )
}
