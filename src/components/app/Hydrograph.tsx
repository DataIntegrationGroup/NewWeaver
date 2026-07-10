import ReactECharts from "echarts-for-react"

import { useWellSeries } from "@/hooks/usePlanning"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusChip, ApprovalChip, MetaChip } from "@/components/ui/metadata-chips"

interface HydrographProps {
  /** Well id — keys the die:nm_waterlevels_timeseries fetch. */
  wellId: string
  /** Well name, used as the series label. */
  name?: string
  /** Water-level status class (e.g. "much below normal"), shown as a chip in
   *  the stats header and colored by class. Omit to hide the chip. */
  status?: string
  /** Force the series to draw as a connected line (a continuous datastream).
   *  When omitted, continuity is inferred from reading density — a series
   *  averaging multiple readings per day is a logger (line), otherwise the
   *  readings are drawn as an unconnected scatter. */
  continuous?: boolean
  /** Tune axis/line colors for a dark surface (default: light). */
  dark?: boolean
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

const fmtNum = (n: number) => n.toFixed(2)

/** Approval word → tooltip color, matching ApprovalChip tones (emerald/amber,
 *  else muted). Hydrograph tooltips are raw HTML, so this returns a hex. */
const approvalColor = (s: string) => {
  const v = s.toLowerCase()
  if (v.includes("approv")) return "#10b981"
  if (v.includes("provisional")) return "#f59e0b"
  return ""
}

/** The raw qualifier is one of ~20 verbose USGS condition strings — too many to
 *  color distinctly. Bucket each into a handful of semantic classes so points
 *  color by measurement condition, with a compact legend. */
type QualifierClass = { key: string; label: string; color: string }
const QUALIFIER_UNSPECIFIED: QualifierClass = {
  key: "none",
  label: "Unspecified",
  color: "#9ca3af",
}
function qualifierClass(qualifier?: string): QualifierClass {
  const s = (qualifier ?? "").toLowerCase()
  if (!s) return QUALIFIER_UNSPECIFIED
  // Pumping wins over "Above" etc. — "Above, Pumping" is a pumping condition.
  if (s.includes("pump")) return { key: "pumping", label: "Pumping-affected", color: "#f59e0b" }
  if (/(dry|flow|obstruction|cascad)/.test(s))
    return { key: "impaired", label: "Dry / flowing / obstructed", color: "#ef4444" }
  if (s.includes("static") || s.includes("not affected"))
    return { key: "static", label: "Static", color: "#10b981" }
  return { key: "other", label: "Other conditions", color: "#3b82f6" }
}

/**
 * One well's water-level hydrograph: depth to water over time, fetched live on
 * demand via `useWellSeries`. Depth increases downward, so the y-axis is
 * inverted (0 at the top). Shared by the planning page and the map inspector.
 */
export function Hydrograph({ wellId, name, status, continuous, dark = false }: HydrographProps) {
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
  const axis = dark ? "#9ca3af" : "#6b7280"
  const line = dark ? "#38bdf8" : "#0369a1"

  // Continuous datastreams (loggers) draw as a connected line; discrete
  // manual readings draw as an unconnected scatter. When the caller doesn't
  // state it, infer from density: a logger averages several readings per
  // distinct day, a manual record roughly one.
  const distinctDays = new Set(points.map((p) => p.t.slice(0, 10))).size
  const isContinuous = continuous ?? (distinctDays > 0 && points.length / distinctDays >= 2)
  // Carry per-observation provenance as extra data dims so the tooltip can show
  // each point's approval/qualifier (ignored by the cartesian axes), and color
  // each point by its qualifier class.
  const seriesData = points.map((p) => {
    const cls = qualifierClass(p.qualifier)
    return {
      value: [p.t, p.v, p.approval ?? "", p.qualifier ?? ""],
      itemStyle: { color: cls.color },
    }
  })
  // Qualifier classes present in this series, for the chart legend. Ordered by
  // first appearance so the legend is stable across renders.
  const legend: QualifierClass[] = []
  const seen = new Set<string>()
  for (const p of points) {
    const cls = qualifierClass(p.qualifier)
    if (!seen.has(cls.key)) {
      seen.add(cls.key)
      legend.push(cls)
    }
  }
  // Only worth showing when qualifiers actually distinguish points.
  const showLegend = legend.length > 1 || (legend.length === 1 && legend[0].key !== "none")
  const series = isContinuous
    ? {
        type: "line",
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.25, color: line },
        itemStyle: { color: line },
        data: seriesData,
        name: name ?? wellId,
      }
    : {
        type: "scatter",
        symbolSize: 5,
        // Per-point color comes from each data item's itemStyle (qualifier class).
        data: seriesData,
        name: name ?? wellId,
      }

  const option = {
    animation: false,
    grid: { left: 64, right: 16, top: 16, bottom: 56 },
    xAxis: { type: "time", axisLabel: { color: axis } },
    yAxis: {
      type: "value",
      name: `Depth to water (${units})`,
      nameLocation: "middle",
      nameGap: 46,
      inverse: true,
      scale: true,
      axisLabel: { color: axis },
      nameTextStyle: { color: axis },
    },
    tooltip: {
      trigger: "axis",
      formatter: (ps: { value: [string, number, string, string] }[]) => {
        const p = ps[0]
        if (!p) return ""
        const [t, v, approval, qualifier] = p.value
        const parts: string[] = []
        if (approval) {
          const c = approvalColor(approval)
          parts.push(
            c
              ? `<span style="color:${c};font-weight:600">${approval}</span>`
              : `<span style="opacity:0.7">${approval}</span>`
          )
        }
        if (qualifier) parts.push(`<span style="opacity:0.7">${qualifier}</span>`)
        const meta = parts.join('<span style="opacity:0.7"> · </span>')
        return (
          `${fmtDate(t)}<br/><strong>${v.toFixed(2)} ${units}</strong>` +
          (meta ? `<br/>${meta}` : "")
        )
      },
    },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 20, bottom: 8 }],
    series: [series],
  }

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
      {showLegend && (
        <div
          data-testid="hydrograph-qualifier-legend"
          className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground"
        >
          {legend.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      )}
      <ReactECharts option={option} style={{ height: 300 }} notMerge />
    </div>
  )
}
