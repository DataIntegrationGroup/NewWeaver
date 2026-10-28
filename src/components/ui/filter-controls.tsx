import { useEffect, useId, useRef, useState } from "react"
import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
  const id = useId()
  const [text, setText] = useState(q)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Keep in sync when the query changes externally (URL navigation, share
  // link, reset), and drop any pending keystrokes so they can't land on top.
  useEffect(() => {
    clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(q)
  }, [q])

  // Clear any pending debounce on unmount so it can't fire after teardown.
  useEffect(() => () => clearTimeout(timer.current), [])

  const onType = (v: string) => {
    setText(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onQueryChange(v), 250)
  }

  return (
    <div className="flex items-center gap-4">
      <Field orientation="horizontal" className="w-auto">
        <Switch
          id={`${id}-bbox`}
          data-testid="filter-bbox"
          checked={bbox}
          onCheckedChange={onBboxChange}
        />
        <FieldLabel htmlFor={`${id}-bbox`} className="whitespace-nowrap">
          Filter to map view
        </FieldLabel>
      </Field>
      <Input
        data-testid="filter-text"
        aria-label="Filter features"
        placeholder="Filter features…"
        className="h-8 w-56"
        value={text}
        onChange={(e) => onType(e.target.value)}
      />
      {/* Its own provider, so it works without one at the app root. */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="About filtering"
                data-testid="filter-info"
                className="text-muted-foreground"
              />
            }
          >
            <Info />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-64">
            <strong>Filter to map view</strong> limits data to the current map
            extent. The text box matches feature attributes — type to narrow what’s
            shown.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
