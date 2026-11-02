/**
 * RegionSelector — pick one or more named regions of interest (counties,
 * public water systems, hydrologic basins) instead of hand-drawing a shape.
 * Selected regions restrict the map/table/export to features inside at least
 * one of them (`FeatureFilters.regionPolygons`, lib/filterFeatures.ts) — a
 * different, narrower semantic than a drawn shape's additive widening.
 */
import { useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  REGION_CATALOG,
  REGION_KIND_ITEMS,
  REGION_KINDS,
  type RegionKind,
} from "@/catalog/regions"
import { useRegionOptions } from "@/hooks/useRegions"

export interface RegionChip {
  kind: RegionKind
  id: string
  name: string | undefined
  loading: boolean
}

interface RegionSelectorProps {
  chips: RegionChip[]
  onAdd: (kind: RegionKind, id: string) => void
  onRemove: (kind: RegionKind, id: string) => void
}

const MAX_SUGGESTIONS = 8

export function RegionSelector({ chips, onAdd, onRemove }: RegionSelectorProps) {
  const [kind, setKind] = useState<RegionKind | undefined>(undefined)
  const [query, setQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: options, isLoading: optionsLoading } = useRegionOptions(kind)
  const selectedIds = useMemo(
    () => new Set(chips.filter((c) => c.kind === kind).map((c) => c.id)),
    [chips, kind]
  )

  const suggestions = useMemo(() => {
    if (!options) return []
    const q = query.trim().toLowerCase()
    const matches = (q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options).filter(
      (o) => !selectedIds.has(o.id)
    )
    return matches.slice(0, MAX_SUGGESTIONS)
  }, [options, query, selectedIds])

  const changeKind = (next: RegionKind) => {
    setKind(next)
    setQuery("")
    setShowSuggestions(false)
  }

  const pick = (id: string) => {
    if (!kind) return
    onAdd(kind, id)
    setQuery("")
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const entry = kind ? REGION_CATALOG[kind] : undefined

  return (
    <section aria-label="Select regions of interest" data-testid="region-selector">
      <div className="flex gap-2">
        <Select
          items={REGION_KIND_ITEMS}
          value={kind ?? null}
          onValueChange={(v) => v && changeKind(v)}
        >
          <SelectTrigger
            className="w-36 shrink-0"
            data-testid="region-kind-select"
            aria-label="Region type"
          >
            <SelectValue placeholder="Region type" />
          </SelectTrigger>
          <SelectContent>
            {REGION_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {REGION_CATALOG[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="search"
            value={query}
            disabled={!kind}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(!!kind)}
            placeholder={entry ? `Add a ${entry.label.toLowerCase()}…` : "Choose a type first"}
            aria-label={entry ? `Search ${entry.label}` : "Region name"}
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="region-search-suggestions"
            data-testid="region-search-input"
          />
          {showSuggestions && kind && (
            <ul
              id="region-search-suggestions"
              role="listbox"
              data-testid="region-search-suggestions"
              className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
            >
              {optionsLoading && (
                <li className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</li>
              )}
              {!optionsLoading && suggestions.length === 0 && (
                <li className="px-2 py-1.5 text-sm text-muted-foreground">
                  No {entry?.label.toLowerCase()} matches “{query}”.
                </li>
              )}
              {suggestions.map((s) => (
                <li key={s.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    data-testid="region-search-suggestion"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pick(s.id)
                    }}
                    className="flex w-full items-start rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="region-chips">
          {chips.map((c) => (
            <li key={`${c.kind}:${c.id}`} data-testid="region-chip">
              <Badge variant="outline" className="h-6 pr-0.5">
                <span className="text-muted-foreground">{REGION_CATALOG[c.kind].label}:</span>
                <span className="max-w-40 truncate">{c.name ?? (c.loading ? "Loading…" : c.id)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 rounded-full"
                  aria-label={`Remove ${c.name ?? c.id}`}
                  data-testid="region-chip-remove"
                  onClick={() => onRemove(c.kind, c.id)}
                >
                  <X />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
