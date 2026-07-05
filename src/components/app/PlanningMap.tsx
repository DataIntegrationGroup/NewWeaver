import { Fragment, useEffect, useRef, useState } from "react"
import type { FeatureCollection, Polygon } from "geojson"
import {
  Map,
  Source,
  Layer,
  Popup,
  type MapRef,
  type MapLayerMouseEvent,
} from "@/components/ui/map"
import { polygonsBbox } from "@/lib/regions"
import { STATUS_CLASSES, WELL_UNKNOWN_COLOR, wellColorExpression } from "@/lib/planning"

const WELLS_LAYER_ID = "planning-wells-circle"

// Water-level status → swatch color, mirroring the map's circle paint.
const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  STATUS_CLASSES.map((c) => [c.key, c.color])
)

// Boolean concern flags carried on each well point, shown as popup rows when set.
const CONCERN_LABELS: { key: string; label: string }[] = [
  { key: "below", label: "Below normal" },
  { key: "above", label: "Above normal" },
  { key: "deplete", label: "Projected depletion" },
  { key: "mcl", label: "MCL exceedance" },
  { key: "series", label: "Has time series" },
]

export interface PlanningRegion {
  key: string
  name: string
  polygons: Polygon[]
}

interface PlanningMapProps {
  regions: PlanningRegion[]
  /** Monitored wells inside the regions, colored by water-level status. */
  wells?: FeatureCollection | null
  /** When set, well points are clickable and this fires with the clicked
   *  well's id + name (used to open its hydrograph). */
  onWellClick?: (id: string, name: string) => void
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
 * changes. Monitored wells hover to a detail popup and click to open their
 * hydrograph, matching the main map. Purpose-built for the planning page.
 */
export function PlanningMap({ regions, wells, onWellClick }: PlanningMapProps) {
  const mapRef = useRef<MapRef | null>(null)
  const [hoverInfo, setHoverInfo] = useState<{
    longitude: number
    latitude: number
    name: string
    status: string
    color: string
    concerns: string[]
  } | null>(null)

  const hasWells = !!wells && wells.features.length > 0
  const clickable = !!onWellClick && hasWells

  const handleClick = (e: MapLayerMouseEvent) => {
    if (!onWellClick) return
    const hit = e.features?.[0]
    const p = hit?.properties
    if (p?.id != null) onWellClick(String(p.id), String(p.name ?? ""))
  }

  // Hit-test on move: a well under the pointer drives the hover popup; empty
  // space clears it. Mirrors the main map's hover behavior.
  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const p = e.features?.[0]?.properties
    if (!p) {
      setHoverInfo((prev) => (prev ? null : prev))
      return
    }
    const status = String(p.status ?? "unknown")
    setHoverInfo({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      name: String(p.name ?? ""),
      status,
      color: STATUS_COLOR[status] ?? WELL_UNKNOWN_COLOR,
      // Tiled properties may carry booleans as real booleans or strings.
      concerns: CONCERN_LABELS.filter(
        (c) => p[c.key] === true || p[c.key] === "true"
      ).map((c) => c.label),
    })
  }

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
      <Map
        ref={mapRef}
        interactiveLayerIds={hasWells ? [WELLS_LAYER_ID] : undefined}
        cursor={clickable && hoverInfo ? "pointer" : undefined}
        onClick={clickable ? handleClick : undefined}
        onMouseMove={hasWells ? handleMouseMove : undefined}
        onLoad={() => {
          // Frame the initial selection once the canvas is ready.
          const map = mapRef.current
          const bbox = polygonsBbox(regions.flatMap((r) => r.polygons))
          if (map && bbox) {
            map.fitBounds(
              [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
              { padding: 56, maxZoom: 11, duration: 0 }
            )
          }
        }}
      >
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

        {hoverInfo && (
          <Popup
            longitude={hoverInfo.longitude}
            latitude={hoverInfo.latitude}
            offset={12}
            closeButton={false}
            closeOnClick={false}
            maxWidth="320px"
          >
            <div
              data-testid="planning-well-popup"
              className="max-w-full overflow-x-hidden px-3 py-2.5 text-foreground"
            >
              <div className="mb-2 border-b border-border pb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ background: hoverInfo.color }}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Monitored well
                  </span>
                </div>
                {hoverInfo.name && (
                  <p className="mt-0.5 text-sm font-semibold leading-tight">
                    {hoverInfo.name}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-[max-content_minmax(0,1fr)] text-xs [&>*:nth-last-child(-n+2)]:border-b-0">
                <Fragment>
                  <dt className="whitespace-nowrap border-b border-border/40 py-1 pr-4 align-top font-medium text-muted-foreground">
                    Level status
                  </dt>
                  <dd className="min-w-0 break-words border-b border-border/40 py-1 align-top">
                    {hoverInfo.status}
                  </dd>
                </Fragment>
                {hoverInfo.concerns.map((label) => (
                  <Fragment key={label}>
                    <dt className="whitespace-nowrap border-b border-border/40 py-1 pr-4 align-top font-medium text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="min-w-0 break-words border-b border-border/40 py-1 align-top">
                      Yes
                    </dd>
                  </Fragment>
                ))}
              </dl>
              {onWellClick && (
                <p className="pt-1.5 text-[11px] italic text-muted-foreground">
                  Click the point for its hydrograph
                </p>
              )}
            </div>
          </Popup>
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
