import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

/** Source facet: any number of sources, each with its count for the current view. */
export function DatasetFilters({
  sourceList,
  selected,
  counts,
  onToggle,
  onClear,
}: {
  sourceList: string[]
  selected: string[]
  counts: Map<string, number>
  onToggle: (source: string) => void
  onClear: () => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-2">
        <legend className="text-sm font-medium">Source</legend>
        {selected.length > 0 && (
          <Button variant="link" size="xs" className="h-auto p-0" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
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
    </fieldset>
  )
}
