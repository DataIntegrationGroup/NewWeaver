import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FilterControlsProps {
  bbox: boolean
  q: string
  onBboxChange: (v: boolean) => void
  onQueryChange: (v: string) => void
}

/** Spatial (filter-to-extent) + text attribute filters. */
export function FilterControls({ bbox, q, onBboxChange, onQueryChange }: FilterControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Switch
          id="filter-bbox"
          data-testid="filter-bbox"
          checked={bbox}
          onCheckedChange={onBboxChange}
        />
        <Label htmlFor="filter-bbox" className="whitespace-nowrap text-sm">
          Filter to map view
        </Label>
      </div>
      <Input
        data-testid="filter-text"
        placeholder="Filter features…"
        className="h-8 w-56"
        value={q}
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </div>
  )
}
