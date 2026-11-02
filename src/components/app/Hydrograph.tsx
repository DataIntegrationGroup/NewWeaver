import { useWellSeries } from "@/hooks/usePlanning"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusChip, ApprovalChip, MetaChip } from "@/components/ui/metadata-chips"
import { TimeSeriesChart } from "./TimeSeriesChart"

interface HydrographProps {
  /** Well id — keys the nm_waterlevels_timeseries fetch. */
  wellId: string
  /** Well name, used as the series label. */
  name?: string
  /** Water-level status class (e.g. "much below normal"), shown as a chip in
   *  the stats header and colored by class. Omit to hide the chip. */
  status?: string
  /** Force a connected line; see TimeSeriesChart. */
  continuous?: boolean
  /** Tune axis/line colors for a dark surface (default: light). */
  dark?: boolean
  /** Plot height in px (default 300). */
  chartHeight?: number
  /** Show the "expand to modal" button (default true). */
  expandable?: boolean
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

const fmtNum = (n: number) => n.toFixed(2)
/** Depth readings are to the hundredth of a foot; keep that in the tooltip. */
const fmtDepth = (v: number, units?: string) => `${fmtNum(v)} ${units ?? ""}`.trim()

/**
 * One well's water-level hydrograph: depth to water over time, fetched live on
 * demand via `useWellSeries`, with a stats box above a `TimeSeriesChart`.
 * Depth increases downward, so the y-axis is inverted (0 at the top). Shared
 * by the planning page and the map's site panel.
 */
export function Hydrograph({
  wellId,
  name,
  status,
  continuous,
  dark = false,
  chartHeight = 300,
  expandable = true,
}: HydrographProps) {
  const { data, isLoading, isError } = useWellSeries(wellId)

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="hydrograph-loading">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (isError || !data || data.points.length === 0) {
    return (
      <p data-testid="hydrograph-empty" className="py-10 text-center text-sm text-muted-foreground">
        No water-level readings available for this well.
      </p>
    )
  }

  const { points, units } = data
  const values = points.map((p) => p.v)
  const latest = values[values.length - 1]
  // Per-observation provenance (source/QA/qualifier) for the most recent reading.
  const lastPoint = points[points.length - 1]
  const min = Math.min(...values)
  const max = Math.max(...values)

  return (
    <div data-testid="hydrograph">
      <div className="mb-2 rounded-md border bg-muted/30 p-2">
        {status && (
          <div data-testid="hydrograph-status" className="mb-2 flex justify-center">
            <StatusChip value={status} />
          </div>
        )}
        <dl className="grid grid-cols-4 gap-2 text-center">
        {[
          { k: "Latest", v: `${fmtNum(latest)} ${units}` },
          { k: "Shallowest", v: `${fmtNum(min)} ${units}` },
          { k: "Deepest", v: `${fmtNum(max)} ${units}` },
          { k: "Readings", v: values.length.toLocaleString() },
        ].map((s) => (
          <div key={s.k}>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {s.k}
            </dt>
            <dd className="text-sm font-semibold tabular-nums">{s.v}</dd>
          </div>
        ))}
        </dl>
        {(lastPoint.source || lastPoint.approval || lastPoint.qualifier) && (
          <div
            data-testid="hydrograph-latest-meta"
            className="mt-2 flex flex-wrap items-center justify-center gap-1.5 border-t pt-2"
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Latest reading
            </span>
            {lastPoint.source && <MetaChip label="Source" value={lastPoint.source} />}
            {lastPoint.approval && <ApprovalChip value={lastPoint.approval} />}
            {lastPoint.qualifier && <MetaChip label="Qualifier" value={lastPoint.qualifier} />}
          </div>
        )}
      </div>
      <p className="mb-1 text-[11px] text-muted-foreground">
        Period of record: {fmtDate(points[0].t)} – {fmtDate(points[points.length - 1].t)}
      </p>
      <TimeSeriesChart
        points={points}
        yLabel="Depth to water"
        units={units}
        invertY
        name={name}
        title={wellId}
        continuous={continuous}
        dark={dark}
        chartHeight={chartHeight}
        expandable={expandable}
        formatValue={fmtDepth}
      />
    </div>
  )
}
