/** Map page place search (SPEC §T.T3 / §V.V3): pins a geocoded place and reports what's monitored nearby. */
import { useMemo } from "react"
import { Download, MapPin, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { GeocodeResult } from "@/lib/geocode"
import { usePlaceSearch } from "@/hooks/usePlaceSearch"
import { nearbyCoverage, COVERAGE_RADIUS_KM, type CoverageSource } from "@/lib/coverage"
import { PlaceSuggestions } from "@/components/place-search/PlaceSuggestions"

interface LocationSearchProps {
  /** Sites counted around a found place. */
  sources: CoverageSource[]
  /** The pinned place, from the URL. */
  place: GeocodeResult | undefined
  /** Pin this place and fly the map to it; null clears the pin. */
  onLocate: (result: GeocodeResult | null) => void
  /** Open the export flow for the data the user has narrowed to (SPEC §T.T5). */
  onExport: () => void
}

export function LocationSearch({ sources, place, onLocate, onExport }: LocationSearchProps) {
  const places = usePlaceSearch({ label: place?.label, onLocate })

  // Recomputed as the dataset's sites load or the dataset changes.
  const coverage = useMemo(
    () => (place ? nearbyCoverage([place.lng, place.lat], sources) : null),
    [place, sources]
  )

  return (
    <section aria-label="Find data near a place" data-testid="location-search">
      <form onSubmit={places.submit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="location-search-input"
            type="search"
            {...places.inputProps}
            placeholder="Search an address or place…"
            aria-label="Address or place"
            data-testid="location-search-input"
            className="pl-8"
          />
          {places.showSuggestions && (
            <PlaceSuggestions
              id={places.listId}
              suggestions={places.suggestions}
              onPick={places.pick}
            />
          )}
        </div>
        <Button type="submit" size="sm" data-testid="location-search-submit">
          Find
        </Button>
        {(places.text || place) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear location search"
            data-testid="location-search-clear"
            onClick={places.clear}
          >
            <X />
          </Button>
        )}
      </form>

      {places.searching && (
        <p className="mt-2 text-sm text-muted-foreground">Searching…</p>
      )}
      {places.failed && (
        <p className="mt-2 text-sm text-muted-foreground" data-testid="location-search-error">
          Place search is unavailable right now. Please try again.
        </p>
      )}
      {places.notFound && !place && (
        <p
          className="mt-2 text-sm text-muted-foreground"
          data-testid="location-search-notfound"
        >
          Couldn’t find that address. Try a street address, city, or place in New
          Mexico.
        </p>
      )}

      {!places.searching && place && coverage && (
        <div
          className="mt-3 rounded-md border bg-muted/40 p-3"
          data-testid="coverage-panel"
        >
          <p className="flex items-start gap-1.5 text-sm font-medium">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{place.label}</span>
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
