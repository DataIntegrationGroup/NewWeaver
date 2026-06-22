import ReactECharts from "echarts-for-react"

import type { Datastream } from "@/clients/sensorThings"
import { useObservations } from "@/hooks/useLayerData"
import { Skeleton } from "@/components/ui/skeleton"

interface DatastreamChartProps {
  datastream: Datastream
  staBaseUrl?: string
}

/**
 * Time-series plot of a datastream's observations (ECharts). Shows a loading
 * skeleton while fetching and a clear empty state when there are none.
 */
export function DatastreamChart({ datastream, staBaseUrl }: DatastreamChartProps) {
  const { data, isLoading } = useObservations(datastream["@iot.id"], staBaseUrl)
  const unit = datastream.unitOfMeasurement?.symbol ?? ""

  if (isLoading) {
    return (
      <div data-testid="chart-loading" className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <p data-testid="chart-empty" className="text-sm text-muted-foreground py-8 text-center">
        No observations for this datastream.
      </p>
    )
  }

  const points = data.map((o) => [o.phenomenonTime, Number(o.result)])

  const yTitle = unit ? `Depth to water (${unit})` : "Value"

  // Summary stats (data is ordered oldest → newest).
  const values = points.map((p) => p[1] as number).filter(Number.isFinite)
  const latest = values.length ? values[values.length - 1] : NaN
  const min = values.length ? Math.min(...values) : NaN
  const max = values.length ? Math.max(...values) : NaN
  const fmtNum = (n: number) =>
    Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"
  const fmtDate = (iso: unknown) =>
    new Date(String(iso)).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  const option = {
    animation: false,
    grid: { left: 64, right: 16, top: 24, bottom: 52 },
    xAxis: {
      type: "time",
    },
    yAxis: {
      type: "value",
      name: yTitle,
      nameLocation: "middle",
      nameGap: 44,
      // Depth to water (BGS): 0 at the top, increasing downward.
      inverse: true,
      // Fit the axis to the data instead of forcing zero into range.
      scale: true,
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: { value: [string, number] }[]) => {
        const p = params[0]
        if (!p) return ""
        const when = new Date(p.value[0]).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
        return `${when}<br/><strong>${fmtNum(p.value[1])}${unit ? ` ${unit}` : ""}</strong>`
      },
    },
    // Time-range selector: wheel/drag zoom on the plot + a brush slider.
    dataZoom: [
      { type: "inside" },
      { type: "slider", height: 22, bottom: 6 },
    ],
    series: [
      {
        type: "line",
        showSymbol: false,
        data: points,
        name: datastream.name,
      },
    ],
  }

  return (
    <div
      data-testid="datastream-chart"
      data-y-title={yTitle}
      data-y-inverse="true"
      data-y-scale="true"
    >
      <dl
        data-testid="chart-stats"
        className="mb-2 grid grid-cols-4 gap-2 rounded-md border bg-muted/30 p-2 text-center"
      >
        {[
          { k: "Latest", v: `${fmtNum(latest)}${unit ? ` ${unit}` : ""}` },
          { k: "Min", v: fmtNum(min) },
          { k: "Max", v: fmtNum(max) },
          { k: "Records", v: values.length.toLocaleString() },
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
        Period of record: {fmtDate(points[0][0])} – {fmtDate(points[points.length - 1][0])}
      </p>
      <ReactECharts option={option} style={{ height: 240 }} notMerge />
    </div>
  )
}
