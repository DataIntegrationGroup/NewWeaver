import { useEffect, useRef, useState } from "react"
import { Info } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FilterControlsProps {
  bbox: boolean
  q: string
  onBboxChange: (v: boolean) => void
  onQueryChange: (v: string) => void
}

/** Spatial (filter-to-extent) + text attribute filters. */
export function FilterControls({ bbox, q, onBboxChange, onQueryChange }: FilterControlsProps) {
  // Debounce typing so each keystroke doesn't re-filter every layer (and push a
  // URL update). The input is locally controlled; the committed value lands
  // ~250ms after the user stops.
  const [text, setText] = useState(q)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Keep in sync when the query changes externally (URL navigation, share link).
  useEffect(() => setText(q), [q])

  const onType = (v: string) => {
    setText(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onQueryChange(v), 250)
  }

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
        value={text}
        onChange={(e) => onType(e.target.value)}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="About filtering"
            data-testid="filter-info"
            className="text-muted-foreground hover:text-foreground"
          >
            <Info className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64">
          <strong>Filter to map view</strong> limits data to the current map
          extent. The text box matches feature attributes — type to narrow what’s
          shown.
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
