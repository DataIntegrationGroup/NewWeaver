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

  const option = {
    grid: { left: 48, right: 16, top: 16, bottom: 32 },
    xAxis: { type: "time" },
    yAxis: { type: "value", name: unit, nameLocation: "end" },
    tooltip: { trigger: "axis" },
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
    <div data-testid="datastream-chart">
      <ReactECharts option={option} style={{ height: 240 }} notMerge />
    </div>
  )
}
