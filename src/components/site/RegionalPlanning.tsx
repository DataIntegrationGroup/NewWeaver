import { useMemo, useState } from "react"
import ReactECharts from "echarts-for-react"
import {
  Activity,
  Droplets,
  Eye,
  EyeOff,
  Gauge,
  Info,
  MapPin,
  TrendingDown,
  TriangleAlert,
  Waves,
  X,
} from "lucide-react"
import { PageShell } from "@/components/ui/page"
import { SiteHeader } from "@/components/site/SiteHeader"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { REGION_CATALOG, REGION_KINDS, type RegionKind } from "@/catalog/regions"
import { useRegionOptions, useRegionFeatures } from "@/hooks/useRegions"
import { regionPolygons } from "@/lib/regions"
import { useTheme } from "@/components/theme-provider"
import type { RegionRef } from "@/lib/urlState"
import { PlanningMap, type PlanningRegion } from "@/components/app/PlanningMap"
import { usePlanningWaterData, useWellSeries } from "@/hooks/usePlanning"
import {
  wellPoints,
  filterWells,
  wellsWithSeries,
  type Distribution,
  type PlanningSummary,
  type WellCategory,
  type WellSeriesRow,
} from "@/lib/planning"
import { LineChart } from "lucide-react"

const regionKey = (kind: RegionKind, id: string) => `${kind}:${id}`

interface SelectedRegion extends RegionRef {
  name: string
}

// ---------------------------------------------------------------------------
// Sidebar: region kind picker + searchable toggle list + selected chips
// ---------------------------------------------------------------------------

function RegionPicker({
  selected,
  onToggle,
  onClear,
}: {
  selected: Map<string, SelectedRegion>
  onToggle: (region: SelectedRegion) => void
  onClear: () => void
}) {
  const [kind, setKind] = useState<RegionKind>("county")
  const [query, setQuery] = useState("")
  const { data: options, isLoading } = useRegionOptions(kind)

  const filtered = useMemo(() => {
    if (!options) return []
    const q = query.trim().toLowerCase()
    const list = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options
    return list.slice(0, 300)
  }, [options, query])

  const entry = REGION_CATALOG[kind]

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Regions
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Toggle regions on to compare them. The map frames every region you turn on.
        </p>
      </div>

      <Select value={kind} onValueChange={(v) => setKind(v as RegionKind)}>
        <SelectTrigger className="w-full" aria-label="Region type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REGION_KINDS.map((k) => (
            <SelectItem key={k} value={k}>
              {REGION_CATALOG[k].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${entry.label.toLowerCase()}…`}
        aria-label={`Search ${entry.label}`}
      />

      {selected.size > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <Button variant="ghost" size="sm" onClick={onClear} data-testid="planning-clear">
            Clear all
          </Button>
        </div>
      )}

      <ul
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1"
        data-testid="planning-region-list"
      >
        {isLoading && (
          <li className="space-y-2 py-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </li>
        )}
        {!isLoading &&
          filtered.map((o) => {
            const k = regionKey(kind, o.id)
            const checked = selected.has(k)
            return (
              <li key={k}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle({ kind, id: o.id, name: o.name })}
                    data-testid="planning-region-toggle"
                  />
                  <span className="min-w-0 truncate">{o.name}</span>
                </label>
              </li>
            )
          })}
        {!isLoading && filtered.length === 0 && (
          <li className="px-2 py-2 text-sm text-muted-foreground">
            No {entry.label.toLowerCase()} matches “{query}”.
          </li>
        )}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard pieces
// ---------------------------------------------------------------------------

const fmt = (n: number | undefined, digits = 0) =>
  n === undefined || !Number.isFinite(n)
    ? "—"
    : n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Small "ⓘ" affordance whose popover explains what a card shows and how it's
 *  computed. Reused by both the KPI cards and the chart cards. */
function InfoPopover({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`About ${title}`}
          data-testid="planning-card-info"
          className="text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-xs leading-relaxed">
        <p className="mb-1 text-sm font-semibold">{title}</p>
        <div className="space-y-1.5 text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
  info,
  mapToggle,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  tone?: "default" | "warn" | "danger"
  info?: React.ReactNode
  /** When set, renders a "show on map" toggle that filters the well points. */
  mapToggle?: { active: boolean; onToggle: () => void }
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground"
  return (
    <Card size="sm">
      <CardContent className="flex flex-col p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-muted p-2 text-muted-foreground">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              {info && <InfoPopover title={label}>{info}</InfoPopover>}
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
        {mapToggle && (
          <button
            type="button"
            aria-pressed={mapToggle.active}
            onClick={mapToggle.onToggle}
            data-testid="planning-map-toggle"
            className={`mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              mapToggle.active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {mapToggle.active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {mapToggle.active ? "Showing on map" : "Show on map"}
          </button>
        )}
      </CardContent>
    </Card>
  )
}

function DistributionChart({
  data,
  dark,
  total,
}: {
  data: Distribution[]
  dark: boolean
  total: number
}) {
  const shown = data.filter((d) => d.count > 0)
  if (total === 0 || shown.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No scored wells in the selected regions.
      </p>
    )
  }
  const textColor = dark ? "#e5e7eb" : "#374151"
  const option = {
    animation: false,
    tooltip: {
      trigger: "item",
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/><strong>${p.value.toLocaleString()}</strong> (${p.percent}%)`,
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 0,
      top: "center",
      textStyle: { color: textColor, fontSize: 11 },
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        center: ["32%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        data: shown.map((d) => ({
          name: d.label,
          value: d.count,
          itemStyle: { color: d.color },
        })),
      },
    ],
  }
  return <ReactECharts option={option} style={{ height: 220 }} notMerge />
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

/** Hydrograph for one well: depth-to-water over time, fetched live on demand.
 *  Depth increases downward, so the y-axis is inverted (0 at the top). */
function WellHydrograph({ well, dark }: { well: WellSeriesRow; dark: boolean }) {
  const { data, isLoading, isError } = useWellSeries(well.id)

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
      <p className="py-10 text-center text-sm text-muted-foreground">
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
        name: well.name,
      },
    ],
  }

  const fmtNum = (n: number) => n.toFixed(2)

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

/** Hydrograph modal for a selected well; shared by the records list and the
 *  map (a click on a well point opens the same dialog). */
function HydrographDialog({
  well,
  dark,
  onClose,
}: {
  well: WellSeriesRow | null
  dark: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={!!well} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{well?.name || well?.id}</DialogTitle>
          <DialogDescription>
            {well?.source ? `${well.source} · ` : ""}
            Water-level hydrograph (depth to water below ground surface).
          </DialogDescription>
        </DialogHeader>
        {well && <WellHydrograph well={well} dark={dark} />}
      </DialogContent>
    </Dialog>
  )
}

/** Card listing every well in the region with more than one water-level
 *  reading; picking one opens its hydrograph via `onSelect`. */
function WaterLevelRecords({
  rows,
  mapActive,
  onToggleMap,
  onSelect,
}: {
  rows: WellSeriesRow[]
  mapActive: boolean
  onToggleMap: () => void
  onSelect: (well: WellSeriesRow) => void
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows
  }, [rows, query])
  const shown = filtered.slice(0, 250)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="size-4 text-muted-foreground" />
          Water-level records
          <div className="ml-auto flex items-center gap-2">
            {rows.length > 0 && (
              <button
                type="button"
                aria-pressed={mapActive}
                onClick={onToggleMap}
                data-testid="planning-map-toggle"
                className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                  mapActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {mapActive ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                {mapActive ? "Showing on map" : "Show on map"}
              </button>
            )}
            <InfoPopover title="Water-level records">
              <p>
                Wells in the selected regions with more than one water-level reading — the wells
                that have a hydrograph. Click a well to plot its depth-to-water over time, or “Show
                on map” to highlight just these wells.
              </p>
              <p>
                The list comes from the summary products’ per-well reading counts (more than one
                reading). Each hydrograph is fetched live from the water-level time-series API for
                that well.
              </p>
            </InfoPopover>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-xs text-muted-foreground">
          {rows.length.toLocaleString()} wells with repeat readings.
        </p>
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wells…"
          aria-label="Search wells with records"
          className="mb-2"
        />
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No wells with repeat readings in the selected regions.
          </p>
        ) : (
          <ul
            className="max-h-72 space-y-0.5 overflow-y-auto pr-1"
            data-testid="well-records-list"
          >
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  data-testid="well-record-row"
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="min-w-0 truncate">{r.name || r.id}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {r.count.toLocaleString()} readings
                  </span>
                </button>
              </li>
            ))}
            {filtered.length > shown.length && (
              <li className="px-2 py-1.5 text-xs text-muted-foreground">
                +{(filtered.length - shown.length).toLocaleString()} more — refine your search.
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function Dashboard({
  summary,
  dark,
  activeCategories,
  onToggleCategory,
  seriesWells,
  onSelectWell,
}: {
  summary: PlanningSummary
  dark: boolean
  activeCategories: Set<WellCategory>
  onToggleCategory: (cat: WellCategory) => void
  seriesWells: WellSeriesRow[]
  onSelectWell: (well: WellSeriesRow) => void
}) {
  const belowPct =
    summary.statusScored > 0
      ? Math.round((summary.belowNormal / summary.statusScored) * 100)
      : undefined
  const slope = summary.medianSlope
  const slopeLabel =
    slope === undefined
      ? "—"
      : `${slope > 0 ? "+" : ""}${fmt(slope, 2)} ft/yr`

  return (
    <div className="space-y-5" data-testid="planning-dashboard">
      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={MapPin}
          label="Monitoring points"
          value={fmt(summary.monitoringPoints)}
          sub={`${fmt(summary.active)} active · ${fmt(summary.stale)} stale`}
          info={
            <>
              <p>
                Distinct wells with any integrated data product falling inside the selected
                regions.
              </p>
              <p>
                Counted as the union of well ids across all six products, then filtered to points
                inside the region boundaries. Active vs stale comes from the Monitoring Recency
                product — a well is “active” when it has a recent observation, “stale” when it
                doesn’t.
              </p>
            </>
          }
        />
        <KpiCard
          icon={TrendingDown}
          label="Below-normal levels"
          value={fmt(summary.belowNormal)}
          sub={belowPct !== undefined ? `${belowPct}% of scored wells` : undefined}
          tone={belowPct !== undefined && belowPct >= 40 ? "danger" : "warn"}
          mapToggle={{
            active: activeCategories.has("below"),
            onToggle: () => onToggleCategory("below"),
          }}
          info={
            <>
              <p>
                Wells whose most recent water level sits below or much below their own historical
                range.
              </p>
              <p>
                From the Water Level Status product: the latest reading is ranked against each
                well’s period-of-record percentiles. This counts the “below normal” and “much
                below normal” classes. The percentage is out of wells with enough record to be
                scored (excludes “insufficient data”).
              </p>
            </>
          }
        />
        <KpiCard
          icon={TriangleAlert}
          label="Projected to deplete"
          value={fmt(summary.projectedToDeplete)}
          sub={
            summary.soonestDepletionYear
              ? `soonest ~${summary.soonestDepletionYear}`
              : undefined
          }
          tone={summary.projectedToDeplete > 0 ? "danger" : "default"}
          mapToggle={{
            active: activeCategories.has("deplete"),
            onToggle: () => onToggleCategory("deplete"),
          }}
          info={
            <>
              <p>
                Wells the current trend projects will decline to their well depth (run dry) if the
                decline continues.
              </p>
              <p>
                From the Depletion Projection product, counting wells with status “projected.”
                “Soonest” is the earliest projected depletion year among those wells, limited to
                future years.
              </p>
            </>
          }
        />
        <KpiCard
          icon={Droplets}
          label="Exceed drinking limits"
          value={fmt(summary.mclExceedances)}
          sub={summary.mclScored > 0 ? `of ${fmt(summary.mclScored)} tested` : undefined}
          tone={summary.mclExceedances > 0 ? "warn" : "default"}
          mapToggle={{
            active: activeCategories.has("mcl"),
            onToggle: () => onToggleCategory("mcl"),
          }}
          info={
            <>
              <p>
                Wells where at least one analyte exceeds a drinking-water maximum contaminant level
                (MCL).
              </p>
              <p>
                From the MCL Exceedances product, counting features flagged with any exceedance.
                The denominator is wells that carry a test result.
              </p>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Water level status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="size-4 text-muted-foreground" />
              Water level status
              <span className="ml-auto">
                <InfoPopover title="Water level status">
                  <p>
                    How each well’s most recent water level compares to its own history — a drought
                    / recovery snapshot for the region.
                  </p>
                  <p>
                    From the Water Level Status product. The latest reading is ranked against the
                    well’s period-of-record percentiles and bucketed into five classes; wells
                    without enough history are “insufficient data.”
                  </p>
                </InfoPopover>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-1 text-xs text-muted-foreground">
              Latest reading vs each well's own historical range ({fmt(summary.statusScored)}{" "}
              scored wells).
            </p>
            <DistributionChart data={summary.statusDist} dark={dark} total={summary.statusScored} />
          </CardContent>
        </Card>

        {/* Groundwater trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-muted-foreground" />
              Groundwater trend
              <span className="ml-auto">
                <InfoPopover title="Groundwater trend">
                  <p>
                    The long-term direction of each well’s depth-to-water, from a linear trend over
                    its record.
                  </p>
                  <p>
                    From the Groundwater Trends product. Because the measure is depth-to-water,
                    “deepening” means the water level is falling and “rising” means it’s
                    recovering. Median trend is the median slope (ft/yr) across wells with a real
                    trend.
                  </p>
                </InfoPopover>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-1 text-xs text-muted-foreground">
              Long-term direction of depth-to-water ({fmt(summary.trendScored)} wells).
            </p>
            <DistributionChart data={summary.trendDist} dark={dark} total={summary.trendScored} />
            <div className="mt-2 grid grid-cols-2 gap-3">
              <StatTile label="Median trend" value={slopeLabel} sub="depth-to-water change" />
              <StatTile
                label="Falling levels"
                value={fmt(summary.trendDist.find((d) => d.label.startsWith("Deepening"))?.count ?? 0)}
                sub="wells deepening"
              />
            </div>
          </CardContent>
        </Card>

        {/* Well depletion outlook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4 text-muted-foreground" />
              Well depletion outlook
              <span className="ml-auto">
                <InfoPopover title="Well depletion outlook">
                  <p>
                    When wells are projected to decline to their well depth (run dry) if the current
                    trend holds.
                  </p>
                  <p>
                    From the Depletion Projection product. “Projected to deplete” counts wells with
                    status “projected” out of those that can be projected. Median time and soonest
                    year use only forward-looking projections. “Already exceeded” are wells whose
                    water level is already below the reported well depth.
                  </p>
                </InfoPopover>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <StatTile
              label="Projected to deplete"
              value={fmt(summary.projectedToDeplete)}
              sub={`of ${fmt(summary.depletionScored)} projectable`}
            />
            <StatTile
              label="Median time"
              value={
                summary.medianYearsToDepletion !== undefined
                  ? `${fmt(summary.medianYearsToDepletion)} yr`
                  : "—"
              }
              sub="to reach well depth"
            />
            <StatTile
              label="Soonest depletion"
              value={summary.soonestDepletionYear ? String(summary.soonestDepletionYear) : "—"}
              sub="projected year"
            />
            <StatTile
              label="Already exceeded"
              value={fmt(summary.exceedsWellDepth)}
              sub="water below well depth"
            />
          </CardContent>
        </Card>

        {/* Seasonal swing + activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Waves className="size-4 text-muted-foreground" />
              Seasonal swing &amp; monitoring
              <span className="ml-auto">
                <InfoPopover title="Seasonal swing & monitoring">
                  <p>
                    How much water levels rise and fall within a year, and how current the region’s
                    monitoring is.
                  </p>
                  <p>
                    Typical swing is the median within-year amplitude from the Seasonal Amplitude
                    product (median resists the occasional bad-data outlier); “wells measured” is
                    how many wells it’s computed over. Active/stale counts come from the Monitoring
                    Recency product.
                  </p>
                </InfoPopover>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <StatTile
              label="Typical swing"
              value={summary.typicalAmplitude !== undefined ? `${fmt(summary.typicalAmplitude, 1)} ft` : "—"}
              sub="median within-year range"
            />
            <StatTile
              label="Wells measured"
              value={fmt(summary.amplitudeWells)}
              sub="seasonal amplitude"
            />
            <StatTile label="Active monitoring" value={fmt(summary.active)} sub="recent observations" />
            <StatTile label="Stale monitoring" value={fmt(summary.stale)} sub="no recent data" />
          </CardContent>
        </Card>
      </div>

      <WaterLevelRecords
        rows={seriesWells}
        mapActive={activeCategories.has("series")}
        onToggleMap={() => onToggleCategory("series")}
        onSelect={onSelectWell}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function RegionalPlanning() {
  useDocumentTitle("Weaver — Regional Planning")
  const { theme } = useTheme()
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const [selected, setSelected] = useState<Map<string, SelectedRegion>>(new Map())

  const toggle = (region: SelectedRegion) => {
    setSelected((prev) => {
      const next = new Map(prev)
      const k = regionKey(region.kind, region.id)
      if (next.has(k)) next.delete(k)
      else next.set(k, region)
      return next
    })
  }
  const clearAll = () => setSelected(new Map())

  const selectedList = useMemo(() => Array.from(selected.values()), [selected])
  const refs: RegionRef[] = useMemo(
    () => selectedList.map((r) => ({ kind: r.kind, id: r.id })),
    [selectedList]
  )

  const featureQueries = useRegionFeatures(refs)

  // Which selected regions have their geometry loaded — the useQueries array's
  // identity churns every render, so memoize on this stable readiness string
  // (not the array itself) to avoid recomputing polygons on every render.
  const readySignature = featureQueries.map((q) => (q.data ? "1" : "0")).join("")

  // Resolve each selected region to its polygons once its geometry lands.
  const planningRegions: PlanningRegion[] = useMemo(() => {
    const out: PlanningRegion[] = []
    selectedList.forEach((r, i) => {
      const feature = featureQueries[i]?.data
      if (!feature) return
      const polys = regionPolygons(feature)
      if (polys.length) out.push({ key: regionKey(r.kind, r.id), name: r.name, polygons: polys })
    })
    return out
    // featureQueries identity churns each render; depend on the resolved data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedList, readySignature])

  const allPolygons = useMemo(
    () => planningRegions.flatMap((r) => r.polygons),
    [planningRegions]
  )
  const regionKeys = planningRegions.map((r) => r.key)

  const geometryLoading = refs.length > 0 && planningRegions.length < refs.length
  const {
    data: result,
    isLoading: dataLoading,
    isError,
    progress,
  } = usePlanningWaterData(regionKeys, allPolygons)

  const loading = geometryLoading || dataLoading

  // Which concern categories are toggled to filter the map's well points.
  const [activeCategories, setActiveCategories] = useState<Set<WellCategory>>(new Set())
  const toggleCategory = (cat: WellCategory) =>
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

  const wells = useMemo(
    () => (result ? wellPoints(result.data) : null),
    [result]
  )
  // Union of the active categories' wells; all wells when none are toggled.
  const shownWells = useMemo(
    () => (wells ? filterWells(wells, activeCategories) : null),
    [wells, activeCategories]
  )

  // Wells with a hydrograph, plus a fast id → row lookup for map clicks.
  const seriesWells = useMemo(
    () => (result ? wellsWithSeries(result.data) : []),
    [result]
  )
  const seriesById = useMemo(
    () => new Map(seriesWells.map((r) => [r.id, r])),
    [seriesWells]
  )

  // The well whose hydrograph is open (from the list, or a map click).
  const [selectedWell, setSelectedWell] = useState<WellSeriesRow | null>(null)

  // Map clicks open a hydrograph only while the records layer is the one shown.
  const wellClickHandler = activeCategories.has("series")
    ? (id: string, name: string) =>
        setSelectedWell(seriesById.get(id) ?? { id, name, count: 0 })
    : undefined

  return (
    <PageShell>
      <SiteHeader />
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="flex w-80 shrink-0 flex-col border-r bg-card p-4">
          <RegionPicker selected={selected} onToggle={toggle} onClear={clearAll} />
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative h-[42%] min-h-[280px] shrink-0 border-b">
            <PlanningMap
              regions={planningRegions}
              wells={shownWells}
              onWellClick={wellClickHandler}
            />
            {selectedList.length > 0 && (
              <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[70%] flex-wrap gap-1.5">
                {selectedList.map((r) => (
                  <span
                    key={regionKey(r.kind, r.id)}
                    className="pointer-events-auto inline-flex items-center gap-1 rounded-full border bg-card/95 px-2 py-0.5 text-xs shadow-sm backdrop-blur"
                  >
                    <span className="text-muted-foreground">{REGION_CATALOG[r.kind].label}:</span>
                    <span className="max-w-40 truncate font-medium">{r.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${r.name}`}
                      onClick={() => toggle(r)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {selectedList.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <MapPin className="mb-3 size-8 opacity-40" />
                <p className="text-base font-medium text-foreground">
                  Select one or more regions
                </p>
                <p className="mt-1 max-w-md text-sm">
                  Toggle counties, public water systems, or hydrologic basins in the sidebar to see
                  monitoring coverage, water-level status, trends, and depletion risk pulled live
                  from the water-data APIs.
                </p>
              </div>
            ) : loading ? (
              <div className="mx-auto max-w-md space-y-3 pt-10 text-center">
                <p className="text-sm font-medium">Pulling water data for the selected regions…</p>
                <Progress value={Math.round(progress * 100)} />
                <p className="text-xs text-muted-foreground">
                  Reading integrated data products from the WFS API.
                </p>
              </div>
            ) : isError ? (
              <p className="pt-10 text-center text-sm text-destructive">
                Could not load water data for the selected regions. Try again.
              </p>
            ) : result ? (
              <Dashboard
                summary={result.summary}
                dark={dark}
                activeCategories={activeCategories}
                onToggleCategory={toggleCategory}
                seriesWells={seriesWells}
                onSelectWell={setSelectedWell}
              />
            ) : null}
          </div>
        </main>
      </div>

      <HydrographDialog
        well={selectedWell}
        dark={dark}
        onClose={() => setSelectedWell(null)}
      />
    </PageShell>
  )
}
