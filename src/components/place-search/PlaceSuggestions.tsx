import { MapPin } from "lucide-react"

import type { GeocodeResult } from "@/lib/geocode"

/** The place search's type-ahead dropdown, under its input. */
export function PlaceSuggestions({
  id,
  suggestions,
  onPick,
}: {
  /** Matches the input's `aria-controls`. */
  id: string
  suggestions: GeocodeResult[]
  onPick: (s: GeocodeResult) => void
}) {
  return (
    <ul
      id={id}
      role="listbox"
      data-testid="place-suggestions"
      className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {suggestions.map((s) => (
        <li key={s.id} role="option" aria-selected={false}>
          <button
            type="button"
            data-testid="place-suggestion"
            // Mousedown fires before the input's blur closes the dropdown.
            onMouseDown={(e) => {
              e.preventDefault()
              onPick(s)
            }}
            className="flex w-full items-start gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span>{s.label}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
