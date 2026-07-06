import ReactECharts from "echarts-for-react"

import { useWellSeries } from "@/hooks/usePlanning"
import { Skeleton } from "@/components/ui/skeleton"

interface HydrographProps {
  /** Well id — keys the die:nm_waterlevels_timeseries fetch. */
  wellId: string
  /** Well name, used as the series label. */
  name?: string
  /** Tune axis/line colors for a dark surface (default: light). */
  dark?: boolean
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

const fmtNum = (n: number) => n.toFixed(2)

/**
 * One well's water-level hydrograph: depth to water over time, fetched live on
 * demand via `useWellSeries`. Depth increases downward, so the y-axis is
 * inverted (0 at the top). Shared by the planning page and the map inspector.
 */
export function Hydrograph({ wellId, name, dark = false }: HydrographProps) {
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
  const min = Math.min(...values)
  const max = Math.max(...values)
  const axis = dark ? "#9ca3af" : "#6b7280"
  const line = dark ? "#38bdf8" : "#0369a1"

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
      formatter: (ps: { value: [string, number] }[]) => {
        const p = ps[0]
        return p ? `${fmtDate(p.value[0])}<br/><strong>${p.value[1].toFixed(2)} ${units}</strong>` : ""
      },
    },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 20, bottom: 8 }],
    series: [
      {
        type: "line",
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.25, color: line },
        itemStyle: { color: line },
        data: points.map((p) => [p.t, p.v]),
        name: name ?? wellId,
      },
    ],
  }

  return (
    <div data-testid="hydrograph">
      <dl className="mb-2 grid grid-cols-4 gap-2 rounded-md border bg-muted/30 p-2 text-center">
        {[
          { k: "Latest", v: `${fmtNum(latest)} ${units}` },
          { k: "Shallowest", v: fmtNum(min) },
          { k: "Deepest", v: fmtNum(max) },
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
      <p className="mb-1 text-[11px] text-muted-foreground">
        Period of record: {fmtDate(points[0].t)} – {fmtDate(points[points.length - 1].t)}
      </p>
      <ReactECharts option={option} style={{ height: 300 }} notMerge />
    </div>
  )
}
