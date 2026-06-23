/**
 * LocationSearch — address search on the Map page (SPEC §T.T3 / §V.V3).
 *
 * Geocodes a free-text address client-side (US Census), asks the parent to fly
 * the map and drop a pin, then reports coverage: what's monitored nearby and,
 * when nothing is, an explicit "nothing monitored here" — so a well owner
 * always knows whether they're in the right place.
 */
import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Download, MapPin, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LayerConfig } from "@/catalog/layers"
import { geocodeAddress, type GeocodeResult } from "@/lib/geocode"
import { nearbyCoverage, COVERAGE_RADIUS_KM, type Coverage } from "@/lib/coverage"

interface LocationSearchProps {
  layers: LayerConfig[]
  /** Fly the map to this point and drop a pin; null clears the pin. */
  onLocate: (result: GeocodeResult | null) => void
  /** Open the export flow for the data the user has narrowed to (SPEC §T.T5). */
  onExport: () => void
}

type Status = "idle" | "searching" | "notfound" | "error" | "located"

export function LocationSearch({ layers, onLocate, onExport }: LocationSearchProps) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [result, setResult] = useState<GeocodeResult | null>(null)
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStatus("searching")
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
      setResult(found)
      setStatus("located")
      onLocate(found)
      setCoverage(
        nearbyCoverage([found.lng, found.lat], layers, queryClient)
      )
    } catch {
      if (!ctrl.signal.aborted) setStatus("error")
    }
  }

  const clear = () => {
    abortRef.current?.abort()
    setValue("")
    setStatus("idle")
    setResult(null)
    setCoverage(null)
    onLocate(null)
  }

  return (
    <section aria-label="Find data near a place" data-testid="location-search">
      <form onSubmit={run} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search an address or place…"
            aria-label="Address or place"
            data-testid="location-search-input"
            className="pl-8"
          />
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
