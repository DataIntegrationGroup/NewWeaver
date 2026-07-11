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

/**
 * Approval (QA) state → point/line COLOR, following USGS hydrograph convention:
 * approved data blue, provisional data red, everything else (missing state)
 * gray. Color encodes approval and nothing else, so it never collides with the
 * measurement-condition signal (which is carried by SYMBOL SHAPE below). Blues
 * are dark-mode-aware to stay legible on both surfaces; the approved blue tracks
 * the neutral line color. Tooltips are raw HTML, so this returns a hex.
 */
type ApprovalClass = { key: string; label: string; color: string }
function approvalClass(approval: string | undefined, dark: boolean): ApprovalClass {
  const s = (approval ?? "").toLowerCase()
  if (s.includes("approv"))
    return { key: "approved", label: "Approved", color: dark ? "#38bdf8" : "#0369a1" }
  if (s.includes("provisional"))
    return { key: "provisional", label: "Provisional", color: dark ? "#f87171" : "#dc2626" }
  return { key: "unknown", label: "Unknown", color: "#9ca3af" }
}

/** The raw qualifier is one of ~20 verbose USGS `lev_status` strings — too many
 *  to distinguish individually. Bucket each into a handful of measurement
 *  conditions carried by SYMBOL SHAPE (USGS keys color to approval, not
 *  condition), so a point's approval and its condition read on independent
 *  channels. `symbol` is an ECharts symbol name; `glyph` mirrors it in the
 *  HTML legend. */
type ConditionClass = { key: string; label: string; symbol: string; glyph: string }
const CONDITION_NORMAL: ConditionClass = {
  key: "normal",
  label: "Normal / static",
  symbol: "circle",
  glyph: "●",
}
function conditionClass(qualifier?: string): ConditionClass {
  const s = (qualifier ?? "").toLowerCase()
  // No qualifier, an explicit "static", or "not affected" are all a normal,
  // unaffected reading.
  if (!s || s.includes("static") || s.includes("not affected")) return CONDITION_NORMAL
  // Pumping wins over "Above" etc. — "Above, Pumping" is a pumping condition.
  if (s.includes("pump")) return { key: "pumping", label: "Pumping-affected", symbol: "triangle", glyph: "▲" }
  if (/(dry|flow|obstruction|cascad)/.test(s))
    return { key: "impaired", label: "Dry / flowing / obstructed", symbol: "diamond", glyph: "◆" }
  // Everything else that still affects the level (atmospheric, nearby surface
  // water, foreign substance, unspecified "other" remarks).
  return { key: "other", label: "Other affected", symbol: "rect", glyph: "■" }
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
  // each point's approval/qualifier (ignored by the cartesian axes). Color each
  // point by its approval class and shape it by its measurement condition — two
  // independent channels, so provisional (red) never reads as pumping again.
  const seriesData = points.map((p) => {
    const ac = approvalClass(p.approval, dark)
    const cc = conditionClass(p.qualifier)
    return {
      value: [p.t, p.v, p.approval ?? "", p.qualifier ?? ""],
      itemStyle: { color: ac.color },
      symbol: cc.symbol,
    }
  })
  // Approval (color) and condition (shape) classes present in this series, each
  // ordered by first appearance so the two legends are stable across renders.
  const approvalLegend: ApprovalClass[] = []
  const conditionLegend: ConditionClass[] = []
  const seenApproval = new Set<string>()
  const seenCondition = new Set<string>()
  for (const p of points) {
    const ac = approvalClass(p.approval, dark)
    if (!seenApproval.has(ac.key)) {
      seenApproval.add(ac.key)
      approvalLegend.push(ac)
    }
    const cc = conditionClass(p.qualifier)
    if (!seenCondition.has(cc.key)) {
      seenCondition.add(cc.key)
      conditionLegend.push(cc)
    }
  }
  // Approval legend earns its space when a series mixes states, or when the sole
  // state is a meaningful one (approved/provisional, not "unknown").
  const showApprovalLegend =
    approvalLegend.length > 1 ||
    (approvalLegend.length === 1 && approvalLegend[0].key !== "unknown")
  // Condition legend (scatter only — a connected line has no per-point symbol)
  // shows when conditions actually distinguish points.
  const showConditionLegend =
    !isContinuous &&
    (conditionLegend.length > 1 ||
      (conditionLegend.length === 1 && conditionLegend[0].key !== "normal"))
  // A connected logger line can't color per point; take the USGS cue and draw
  // the whole line red if any reading is provisional, else the approved/neutral
  // blue (unknown loggers keep the neutral blue rather than washing out gray).
  const lineColor = points.some((p) => approvalClass(p.approval, dark).key === "provisional")
    ? approvalClass("provisional", dark).color
    : line
  const series = isContinuous
    ? {
        type: "line",
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.25, color: lineColor },
        itemStyle: { color: lineColor },
        data: seriesData,
        name: name ?? wellId,
      }
    : {
        type: "scatter",
        symbolSize: 6,
        // Per-point color (approval) and symbol (condition) come from each data
        // item's itemStyle/symbol set above.
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
          const ac = approvalClass(approval, dark)
          parts.push(
            ac.key !== "unknown"
              ? `<span style="color:${ac.color};font-weight:600">${approval}</span>`
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
      {showApprovalLegend && (
        <div
          data-testid="hydrograph-approval-legend"
          className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground"
        >
          <span className="font-medium uppercase tracking-wide">Approval</span>
          {approvalLegend.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      )}
      {showConditionLegend && (
        <div
          data-testid="hydrograph-condition-legend"
          className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground"
        >
          <span className="font-medium uppercase tracking-wide">Condition</span>
          {conditionLegend.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1">
              <span className="shrink-0 leading-none" aria-hidden>{c.glyph}</span>
              {c.label}
            </span>
          ))}
        </div>
      )}
      <ReactECharts option={option} style={{ height: 300 }} notMerge />
    </div>
  )
}
