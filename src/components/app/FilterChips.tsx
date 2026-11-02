import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface FilterChip {
  /** Stable key; also the chip's test id suffix. */
  id: string
  label: string
  onRemove: () => void
}

/**
 * Active filters as removable chips along the top of the map, so what's
 * narrowing the map stays visible while the sidebar is scrolled or (on small
 * screens) closed. Editing a filter happens in the sidebar; a chip only clears.
 */
export function FilterChips({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null
  return (
    <div
      data-testid="filter-chips"
      className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-14"
    >
      <ul aria-label="Active filters" className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-1.5">
        {chips.map((c) => (
          <li key={c.id} data-testid={`filter-chip-${c.id}`}>
            <Badge variant="outline" className="h-6 bg-card/95 pr-0.5 shadow-sm backdrop-blur">
              <span className="max-w-[16rem] truncate">{c.label}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-5 rounded-full"
                aria-label={`Remove filter: ${c.label}`}
                data-testid={`filter-chip-remove-${c.id}`}
                onClick={c.onRemove}
              >
                <X />
              </Button>
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
