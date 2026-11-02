import { useState } from "react"
import ReactECharts from "echarts-for-react"
import { Maximize2 } from "lucide-react"

import { formatNumber } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface TimeSeriesPoint {
  /** ISO date or datetime. */
  t: string
  v: number
  /** Normalized QA state; picks the point color. */
  approval?: string
  /** The source's own approval label, for the tooltip. */
  approvalLabel?: string
  /** Measurement qualifier; picks the point shape. */
  qualifier?: string
  source?: string
}

interface TimeSeriesChartProps {
  /** Points in time order, oldest first. */
  points: TimeSeriesPoint[]
  /** Y-axis label, without units. */
  yLabel: string
  units?: string
  /** Flip the y-axis (depth: 0 at the top). */
  invertY?: boolean
  /** Series label; also the modal title. */
  name?: string
  /** Modal title when there's no `name`. */
  title?: string
  /** Force a connected line; otherwise inferred from reading density. */
  continuous?: boolean
  /** Colors for a dark surface. */
  dark?: boolean
  /** Plot height in px (default 300). */
  chartHeight?: number
  /** Show the expand button (default true). */
  expandable?: boolean
  /** Shown when there are no points. */
  emptyMessage?: string
  /** Color points by approval (default true); off uses one color. */
  colorByApproval?: boolean
  /** Tooltip value text (default `formatNumber`). */
  formatValue?: (v: number, units?: string) => string | undefined
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

/** Approval → color, USGS style: approved blue, provisional red, else gray. */
type ApprovalClass = { key: string; label: string; color: string }
function approvalClass(approval: string | undefined, dark: boolean): ApprovalClass {
  const s = (approval ?? "").toLowerCase()
  if (s.includes("approv"))
    return { key: "approved", label: "Approved", color: dark ? "#38bdf8" : "#0369a1" }
  if (s.includes("provisional"))
    return { key: "provisional", label: "Provisional", color: dark ? "#f87171" : "#dc2626" }
  return { key: "unknown", label: "Unknown", color: "#9ca3af" }
}

/** Buckets USGS `lev_status` qualifiers into a few conditions, shown as shapes. */
type ConditionClass = { key: string; label: string; symbol: string; glyph: string }
const CONDITION_NORMAL: ConditionClass = {
  key: "normal",
  label: "Normal / static",
  symbol: "circle",
  glyph: "●",
}
function conditionClass(qualifier?: string): ConditionClass {
  const s = (qualifier ?? "").toLowerCase()
  if (!s || s.includes("static") || s.includes("not affected")) return CONDITION_NORMAL
  // "Above, Pumping" counts as pumping.
  if (s.includes("pump")) return { key: "pumping", label: "Pumping-affected", symbol: "triangle", glyph: "▲" }
  if (/(dry|flow|obstruction|cascad)/.test(s))
    return { key: "impaired", label: "Dry / flowing / obstructed", symbol: "diamond", glyph: "◆" }
  return { key: "other", label: "Other affected", symbol: "rect", glyph: "■" }
}

/** Tooltips are raw HTML; source labels are API text. */
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** A time series as a line or scatter, with legends and an expand modal. */
export function TimeSeriesChart({
  points,
  yLabel,
  units,
  invertY = false,
  name,
  title,
  continuous,
  dark = false,
  chartHeight = 300,
  expandable = true,
  emptyMessage = "No readings available.",
  formatValue = formatNumber,
  colorByApproval = true,
}: TimeSeriesChartProps) {
  const [expanded, setExpanded] = useState(false)

  if (points.length === 0) {
    return (
      <p data-testid="time-series-empty" className="py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  const axis = dark ? "#9ca3af" : "#6b7280"
  const line = dark ? "#38bdf8" : "#0369a1"

  // Loggers (2+ readings a day) draw as a line, manual readings as a scatter.
  const distinctDays = new Set(points.map((p) => p.t.slice(0, 10))).size
  const isContinuous = continuous ?? (distinctDays > 0 && points.length / distinctDays >= 2)
  // Extra dims carry approval, qualifier and label to the tooltip.
  const seriesData = points.map((p) => {
    const ac = approvalClass(p.approval, dark)
    const cc = conditionClass(p.qualifier)
    return {
      value: [p.t, p.v, p.approval ?? "", p.qualifier ?? "", p.approvalLabel ?? p.approval ?? ""],
      itemStyle: { color: colorByApproval ? ac.color : line },
      symbol: cc.symbol,
    }
  })
  // Legend entries, in order of first appearance.
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
  // Only worth showing if it tells points apart or isn't all "unknown".
  const showApprovalLegend =
    colorByApproval &&
    (approvalLegend.length > 1 ||
      (approvalLegend.length === 1 && approvalLegend[0].key !== "unknown"))
  // Scatter only: a line has no per-point symbols.
  const showConditionLegend =
    !isContinuous &&
    (conditionLegend.length > 1 ||
      (conditionLegend.length === 1 && conditionLegend[0].key !== "normal"))
  // A line can't color per point: red if any reading is provisional.
  const lineColor = colorByApproval && points.some((p) => approvalClass(p.approval, dark).key === "provisional")
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
        name: name ?? title,
      }
    : {
        type: "scatter",
        symbolSize: 6,
        data: seriesData,
        name: name ?? title,
      }

  const option = {
    animation: false,
    grid: { left: 64, right: 16, top: 16, bottom: 56 },
    xAxis: { type: "time", axisLabel: { color: axis } },
    yAxis: {
      type: "value",
      name: units ? `${yLabel} (${units})` : yLabel,
      nameLocation: "middle",
      nameGap: 46,
      inverse: invertY,
      scale: true,
      axisLabel: { color: axis },
      nameTextStyle: { color: axis },
    },
    tooltip: {
      trigger: "axis",
      formatter: (ps: { value: [string, number, string, string, string] }[]) => {
        const p = ps[0]
        if (!p) return ""
        const [t, v, approval, qualifier, label] = p.value
        const parts: string[] = []
        if (label) {
          const ac = approvalClass(approval, dark)
          parts.push(
            colorByApproval && ac.key !== "unknown"
              ? `<span style="color:${ac.color};font-weight:600">${escapeHtml(label)}</span>`
              : `<span style="opacity:0.7">${escapeHtml(label)}</span>`
          )
        }
        if (qualifier) parts.push(`<span style="opacity:0.7">${escapeHtml(qualifier)}</span>`)
        const meta = parts.join('<span style="opacity:0.7"> · </span>')
        return (
          `${fmtDate(t)}<br/><strong>${formatValue(v, units) ?? v}</strong>` +
          (meta ? `<br/>${meta}` : "")
        )
      },
    },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 20, bottom: 8 }],
    series: [series],
  }

  return (
    <div data-testid="time-series-chart">
      {expandable && (
        <div className="mb-1 flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            onClick={() => setExpanded(true)}
            aria-label="Expand chart"
            data-testid="time-series-expand"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {showApprovalLegend && (
        <div
          data-testid="time-series-approval-legend"
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
          data-testid="time-series-condition-legend"
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
      <ReactECharts option={option} style={{ height: chartHeight }} notMerge />

      {expandable && (
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent
            className="max-w-[calc(100%-2rem)] sm:max-w-4xl"
            data-testid="time-series-modal"
          >
            <DialogHeader>
              <DialogTitle>{name ?? title}</DialogTitle>
            </DialogHeader>
            <TimeSeriesChart
              points={points}
              yLabel={yLabel}
              units={units}
              invertY={invertY}
              name={name}
              title={title}
              continuous={continuous}
              dark={dark}
              chartHeight={520}
              expandable={false}
              colorByApproval={colorByApproval}
              emptyMessage={emptyMessage}
              formatValue={formatValue}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
