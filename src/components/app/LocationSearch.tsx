/**
 * LocationSearch — address / place search on the Map page (SPEC §T.T3 / §V.V3).
 *
 * Geocodes free text client-side (Photon/OSM), with type-ahead suggestions as
 * the user types. On selection it asks the parent to fly the map and drop a
 * pin, then reports coverage: what's monitored nearby and, when nothing is, an
 * explicit "nothing monitored here" — so a well owner always knows whether
 * they're in the right place.
 */
import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Download, MapPin, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LayerConfig } from "@/catalog/layers"
import {
  geocodeAddress,
  suggestPlaces,
  type GeocodeResult,
} from "@/lib/geocode"
import { nearbyCoverage, COVERAGE_RADIUS_KM, type Coverage } from "@/lib/coverage"

interface LocationSearchProps {
  layers: LayerConfig[]
  /** Fly the map to this point and drop a pin; null clears the pin. */
  onLocate: (result: GeocodeResult | null) => void
  /** Open the export flow for the data the user has narrowed to (SPEC §T.T5). */
  onExport: () => void
}

type Status = "idle" | "searching" | "notfound" | "error" | "located"

const SUGGEST_DEBOUNCE_MS = 250

export function LocationSearch({ layers, onLocate, onExport }: LocationSearchProps) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [result, setResult] = useState<GeocodeResult | null>(null)
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const geocodeAbort = useRef<AbortController | null>(null)
  const suggestAbort = useRef<AbortController | null>(null)
  // Skip the next debounced suggest pass (e.g. after picking a suggestion, the
  // input value changes but we don't want to re-open the dropdown).
  const skipSuggest = useRef(false)

  // Debounced type-ahead suggestions.
  useEffect(() => {
    if (skipSuggest.current) {
      skipSuggest.current = false
      return
    }
    const q = value.trim()
    if (!q) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(async () => {
      suggestAbort.current?.abort()
      const ctrl = new AbortController()
      suggestAbort.current = ctrl
      const found = await suggestPlaces(q, ctrl.signal)
      if (ctrl.signal.aborted) return
      setSuggestions(found)
      setShowSuggestions(found.length > 0)
    }, SUGGEST_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value])

  /** Drop the pin and compute coverage for a resolved match. */
  const locate = (found: GeocodeResult) => {
    setResult(found)
    setStatus("located")
    onLocate(found)
    setCoverage(nearbyCoverage([found.lng, found.lat], layers, queryClient))
  }

  const pick = (s: GeocodeResult) => {
    suggestAbort.current?.abort()
    skipSuggest.current = true
    setValue(s.label)
    setSuggestions([])
    setShowSuggestions(false)
    locate(s)
  }

  const run = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    // Submitting runs the full geocode (Census-first, precise street match) —
    // not the top type-ahead suggestion, which is only a coarse Photon hit.
    suggestAbort.current?.abort()
    geocodeAbort.current?.abort()
    const ctrl = new AbortController()
    geocodeAbort.current = ctrl
    setStatus("searching")
    setShowSuggestions(false)
    setCoverage(null)
    try {
      const found = await geocodeAddress(q, ctrl.signal)
      if (ctrl.signal.aborted) return
      if (!found) {
        setStatus("notfound")
        setResult(null)
        onLocate(null)
        return
      }
      locate(found)
    } catch {
      if (!ctrl.signal.aborted) setStatus("error")
    }
  }

  const clear = () => {
    geocodeAbort.current?.abort()
    suggestAbort.current?.abort()
    skipSuggest.current = true
    setValue("")
    setStatus("idle")
    setResult(null)
    setCoverage(null)
    setSuggestions([])
    setShowSuggestions(false)
    onLocate(null)
  }

  return (
    <section aria-label="Find data near a place" data-testid="location-search">
      <form onSubmit={run} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="location-search-input"
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            placeholder="Search an address or place…"
            aria-label="Address or place"
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="location-search-suggestions"
            data-testid="location-search-input"
            className="pl-8"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul
              id="location-search-suggestions"
              role="listbox"
              data-testid="location-search-suggestions"
              className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
            >
              {suggestions.map((s) => (
                <li key={s.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    data-testid="location-search-suggestion"
                    // Use mousedown so the pick fires before the input blur
                    // that would otherwise close the dropdown first.
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pick(s)
                    }}
                    className="flex w-full items-start gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span>{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" size="sm" data-testid="location-search-submit">
          Find
        </Button>
        {status !== "idle" && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear location search"
            data-testid="location-search-clear"
            onClick={clear}
          >
            <X />
          </Button>
        )}
      </form>

      {status === "searching" && (
        <p className="mt-2 text-sm text-muted-foreground">Searching…</p>
      )}
      {status === "notfound" && (
        <p
          className="mt-2 text-sm text-muted-foreground"
          data-testid="location-search-notfound"
        >
          Couldn’t find that address. Try a street address, city, or place in New
          Mexico.
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-sm text-destructive">
          Address search is unavailable right now. Please try again.
        </p>
      )}

      {status === "located" && result && coverage && (
        <div
          className="mt-3 rounded-md border bg-muted/40 p-3"
          data-testid="coverage-panel"
        >
          <p className="flex items-start gap-1.5 text-sm font-medium">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{result.label}</span>
          </p>
          {coverage.total > 0 ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {coverage.total} monitored{" "}
                {coverage.total === 1 ? "point" : "points"} within{" "}
                {COVERAGE_RADIUS_KM} km:
              </p>
              <ul className="mt-1.5 space-y-1 text-sm" data-testid="coverage-list">
                {coverage.layers.map((l) => (
                  <li key={l.layerId} className="flex justify-between gap-2">
                    <span>{l.title}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {l.count}
                      {l.nearestKm !== null &&
                        ` · ${l.nearestKm.toFixed(1)} km`}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                data-testid="coverage-export"
                onClick={onExport}
              >
                <Download />
                Download this data
              </Button>
            </>
          ) : (
            <p
              className="mt-2 text-sm text-muted-foreground"
              data-testid="coverage-empty"
            >
              No monitored data within {COVERAGE_RADIUS_KM} km of this location.
              The data you’re looking for may not be in any network here.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
