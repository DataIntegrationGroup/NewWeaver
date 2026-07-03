import { useEffect, useRef } from "react"
import type { FeatureCollection, Polygon } from "geojson"
import { Map, Source, Layer, type MapRef } from "@/components/ui/map"
import { polygonsBbox } from "@/lib/regions"
import { STATUS_CLASSES, WELL_UNKNOWN_COLOR, wellColorExpression } from "@/lib/planning"

export interface PlanningRegion {
  key: string
  name: string
  polygons: Polygon[]
}

interface PlanningMapProps {
  regions: PlanningRegion[]
  /** Monitored wells inside the regions, colored by water-level status. */
  wells?: FeatureCollection | null
}

/** GeoJSON of all visible region polygons, tagged with the region name. */
function toFeatureCollection(regions: PlanningRegion[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: regions.flatMap((r) =>
      r.polygons.map((p) => ({
        type: "Feature" as const,
        geometry: p,
        properties: { name: r.name },
      }))
    ),
  }
}

/**
 * PlanningMap — draws every selected region as a filled, outlined boundary and
 * frames the map to the combined extent whenever the set of visible regions
 * changes. Purpose-built for the planning page (no catalog layers, no clicks).
 */
export function PlanningMap({ regions, wells }: PlanningMapProps) {
  const mapRef = useRef<MapRef | null>(null)

  // The identity of the visible set: refit only when regions are added/removed.
  const key = regions.map((r) => r.key).sort().join("|")

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const polys = regions.flatMap((r) => r.polygons)
    const bbox = polygonsBbox(polys)
    if (!bbox) return
    map.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 56, maxZoom: 11, duration: 700 }
    )
    // Refit keyed on the visible set; polygons for a given key are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const data = toFeatureCollection(regions)

  return (
    <div className="h-full w-full" data-testid="planning-map">
      <Map ref={mapRef} onLoad={() => {
        // Frame the initial selection once the canvas is ready.
        const map = mapRef.current
        const bbox = polygonsBbox(regions.flatMap((r) => r.polygons))
        if (map && bbox) {
          map.fitBounds(
            [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
            { padding: 56, maxZoom: 11, duration: 0 }
          )
        }
      }}>
        {regions.length > 0 && (
          <Source id="planning-regions" type="geojson" data={data}>
            <Layer
              id="planning-regions-fill"
              type="fill"
              paint={{ "fill-color": "#0d9488", "fill-opacity": 0.06 }}
            />
            <Layer
              id="planning-regions-line"
              type="line"
              paint={{ "line-color": "#0d9488", "line-width": 2 }}
            />
          </Source>
        )}
        {wells && wells.features.length > 0 && (
          <Source id="planning-wells" type="geojson" data={wells}>
            <Layer
              id="planning-wells-circle"
              type="circle"
              paint={{
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 11, 4],
                "circle-color": wellColorExpression() as never,
                "circle-stroke-width": 0.5,
                "circle-stroke-color": "rgba(0,0,0,0.35)",
                "circle-opacity": 0.9,
              }}
            />
          </Source>
        )}
      </Map>

      {wells && wells.features.length > 0 && (
        <div
          className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md border bg-card/95 px-2.5 py-2 text-[11px] shadow-sm backdrop-blur"
          data-testid="planning-well-legend"
        >
          <p className="mb-1 font-semibold text-foreground">
            {wells.features.length.toLocaleString()} wells · level status
          </p>
          <ul className="space-y-0.5">
            {STATUS_CLASSES.map((c) => (
              <li key={c.key} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ background: c.color }}
                />
                <span className="text-muted-foreground">{c.label}</span>
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ background: WELL_UNKNOWN_COLOR }}
              />
              <span className="text-muted-foreground">No status</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
