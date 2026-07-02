/**
 * RegionSelector — pick one or more named regions of interest (counties,
 * public water systems, hydrologic basins) instead of hand-drawing a shape.
 * Selected regions restrict the map/table/export to features inside at least
 * one of them (`FeatureFilters.regionPolygons`, lib/filterFeatures.ts) — a
 * different, narrower semantic than a drawn shape's additive widening.
 */
import { useMemo, useRef, useState } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { REGION_CATALOG, REGION_KINDS, type RegionKind } from "@/catalog/regions"
import { useRegionOptions } from "@/hooks/useRegions"
import type { RegionCoverage } from "@/lib/regions"

export interface RegionChip {
  kind: RegionKind
  id: string
  name: string | undefined
  loading: boolean
}

interface RegionSelectorProps {
  chips: RegionChip[]
  coverage: RegionCoverage | null
  onAdd: (kind: RegionKind, id: string) => void
  onRemove: (kind: RegionKind, id: string) => void
  onClearAll: () => void
  onExport: () => void
}

const MAX_SUGGESTIONS = 8

export function RegionSelector({
  chips,
  coverage,
  onAdd,
  onRemove,
  onClearAll,
  onExport,
}: RegionSelectorProps) {
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
  const anyLoading = chips.some((c) => c.loading)

  return (
    <section aria-label="Select regions of interest" data-testid="region-selector">
      <div className="flex gap-2">
        <Select value={kind ?? ""} onValueChange={(v) => changeKind(v as RegionKind)}>
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
            <li
              key={`${c.kind}:${c.id}`}
              data-testid="region-chip"
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs"
            >
              <span className="text-muted-foreground">{REGION_CATALOG[c.kind].label}:</span>
              <span className="max-w-40 truncate">{c.name ?? (c.loading ? "Loading…" : c.id)}</span>
              <button
                type="button"
                aria-label={`Remove ${c.name ?? c.id}`}
                data-testid="region-chip-remove"
                onClick={() => onRemove(c.kind, c.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {chips.length > 0 && (
        <div className="mt-2 rounded-md border bg-muted/40 p-3" data-testid="region-panel">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {chips.length} region{chips.length === 1 ? "" : "s"} selected
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="region-clear-all"
              onClick={onClearAll}
            >
              Clear all
            </Button>
          </div>
          {!anyLoading && coverage && (
            coverage.total > 0 ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {coverage.total} monitored{" "}
                  {coverage.total === 1 ? "point" : "points"} inside:
                </p>
                <ul className="mt-1.5 space-y-1 text-sm" data-testid="region-coverage-list">
                  {coverage.layers.map((l) => (
                    <li key={l.layerId} className="flex justify-between gap-2">
                      <span>{l.title}</span>
                      <span className="shrink-0 text-muted-foreground">{l.count}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  data-testid="region-export"
                  onClick={onExport}
                >
                  <Download />
                  Download this data
                </Button>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground" data-testid="region-coverage-empty">
                No monitored data inside the selected regions among the visible layers.
              </p>
            )
          )}
        </div>
      )}
    </section>
  )
}
