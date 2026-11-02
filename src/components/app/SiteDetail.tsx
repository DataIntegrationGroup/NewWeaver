/** The right-hand panel for a selected site: headline numbers, then tabs. */
import { useMemo, useState, type ReactNode } from "react"
import type { Feature } from "geojson"
import { Check, Copy, Crosshair, X } from "lucide-react"

import { sourceLabel, type Dataset } from "@/catalog/mapDatasets"
import { useDatasetData } from "@/hooks/useDatasetData"
import { useSiteSamples } from "@/hooks/useSiteSamples"
import { NO_VALUE, binIndex, type Facet } from "@/lib/facets"
import { formatDate, formatNumber as fmt } from "@/lib/format"
import { firstPosition } from "@/lib/geo"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Hydrograph } from "./Hydrograph"
import { ObservationTable } from "./ObservationTable"
import { TimeSeriesChart } from "./TimeSeriesChart"

type Props = Record<string, unknown>

// New key, so widths saved for the old, narrower panel don't carry over.
const PANEL_MIN = 320
const PANEL_MAX = 800
const PANEL_DEFAULT = 540
const PANEL_WIDTH_KEY = "weaver-site-detail-width"

/** Panel width; drag the left edge to resize. */
function usePanelWidth() {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(PANEL_WIDTH_KEY))
    return saved >= PANEL_MIN && saved <= PANEL_MAX ? saved : PANEL_DEFAULT
  })
  // Moving left (smaller clientX) widens the panel.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const onMove = (ev: PointerEvent) =>
      setWidth(Math.min(PANEL_MAX, Math.max(PANEL_MIN, startW + (startX - ev.clientX))))
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      setWidth((w) => {
        localStorage.setItem(PANEL_WIDTH_KEY, String(Math.round(w)))
        return w
      })
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }
  return { width, startResize }
}

interface SiteDetailProps {
  dataset: Dataset
  featureId: string
  onClose: () => void
  onZoomTo: (lng: number, lat: number) => void
}

export function SiteDetail({ dataset, featureId, onClose, onZoomTo }: SiteDetailProps) {
  const { data, facets, isLoading } = useDatasetData(dataset)
  const feature = data.features.find((f) => String(f.id) === featureId)
  const p = (feature?.properties ?? {}) as Props
  const name = typeof p.name === "string" && p.name ? p.name : featureId
  const pos = feature ? firstPosition(feature) : undefined
  const { width, startResize } = usePanelWidth()

  return (
    <aside
      data-testid="site-detail"
      aria-label={`Site ${name}`}
      style={{ width }}
      className={cn(
        "relative flex h-full shrink-0 flex-col border-l bg-card",
        // Below lg, cover the map instead of squeezing it.
        "max-lg:absolute max-lg:inset-0 max-lg:z-40 max-lg:!w-full max-lg:border-l-0"
      )}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        data-testid="site-detail-resize"
        onPointerDown={startResize}
        className="absolute left-0 top-0 z-20 hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40 lg:block"
      />
      <header className="flex items-start gap-1 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="!text-lg !leading-tight" data-testid="site-detail-title">
            {name}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[typeof p.source === "string" ? sourceLabel(p.source) : undefined, dataset.label]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {pos && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom to site"
            data-testid="site-detail-zoom"
            onClick={() => onZoomTo(pos[0], pos[1])}
          >
            <Crosshair />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          data-testid="site-detail-close"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!feature ? (
          isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              This site isn’t in {dataset.label}.
            </p>
          )
        ) : (
          <div className="space-y-5 p-4">
            <SiteBody
              dataset={dataset}
              id={featureId}
              name={name}
              p={p}
              facets={facets}
              sites={data.features}
            />
            <SiteIds id={featureId} p={p} />
          </div>
        )}
      </div>
    </aside>
  )
}

/** The body for the dataset's kind; a new kind is a type error until handled. */
function SiteBody({
  dataset,
  id,
  name,
  p,
  facets,
  sites,
}: {
  dataset: Dataset
  id: string
  name: string
  p: Props
  facets: Facet[]
  sites: Feature[]
}) {
  switch (dataset.kind) {
    case "well":
      return <WellBody id={id} name={name} p={p} />
    case "analyte":
      return (
        <AnalyteBody
          dataset={dataset}
          id={id}
          p={p}
          facet={facets.find((f) => f.field === "latest_value")}
          sites={sites}
        />
      )
    case "ions":
      return <IonsBody p={p} />
    default:
      return assertNever(dataset.kind)
  }
}

function assertNever(x: never): never {
  throw new Error(`Unhandled dataset kind: ${String(x)}`)
}

/** Site ID with a copy button, plus any USGS / alternate IDs. */
function SiteIds({ id, p }: { id: string; p: Props }) {
  const [copied, setCopied] = useState(false)
  const extra = [
    p.usgs_site_id ? `USGS ${p.usgs_site_id}` : undefined,
    p.alternate_site_id ? `Alt. ${p.alternate_site_id}` : undefined,
  ].filter((e): e is string => !!e)
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground" data-testid="site-ids">
      <span>ID {id}</span>
      <button
        type="button"
        aria-label="Copy site ID"
        className="inline-flex items-center hover:text-foreground"
        onClick={() => {
          void navigator.clipboard?.writeText(id)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      {extra.map((e) => (
        <span key={e}>· {e}</span>
      ))}
    </p>
  )
}

// ── Shared pieces ───────────────────────────────────────────────────────

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined)

/** `Mar 21, 2023`. */
function fmtDate(v: unknown): string | undefined {
  return typeof v === "string" ? (formatDate(v) ?? undefined) : undefined
}

const yearOf = (v: unknown) => (typeof v === "string" && /^\d{4}/.test(v) ? v.slice(0, 4) : undefined)

/** `1998–2024`, or one year if both match. */
function yearRange(start: unknown, end: unknown): string | undefined {
  const a = yearOf(start)
  const b = yearOf(end)
  if (!a || !b) return undefined
  return a === b ? a : `${a}–${b}`
}

/** `160 ft (Mar 21, 2023)`. */
function withDate(value: unknown, unit: string, date: unknown): string | undefined {
  const v = fmt(value, unit)
  if (!v) return undefined
  const d = fmtDate(date)
  return d ? `${v} (${d})` : v
}

/** Headline numbers; empty ones drop out. */
function Stats({ items }: { items: { value?: string; label: string; sub?: string }[] }) {
  const shown = items.filter((s) => s.value)
  if (shown.length === 0) return null
  return (
    <dl
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}
      data-testid="site-stats"
    >
      {shown.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col">
          <dt className="order-2 text-xs text-muted-foreground">{s.label}</dt>
          <dd className="order-1 truncate text-xl font-semibold leading-tight">{s.value}</dd>
          {s.sub && <dd className="order-3 text-xs text-muted-foreground/80">{s.sub}</dd>}
        </div>
      ))}
    </dl>
  )
}

/** Label/value rows; empty ones drop out. */
function Facts({ rows }: { rows: [string, string | undefined][] }) {
  const shown = rows.filter((r): r is [string, string] => !!r[1])
  if (shown.length === 0) return null
  return (
    <dl className="divide-y text-sm" data-testid="site-facts">
      {shown.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-1.5">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  )
}

/** One plain-language line about the site. */
function Takeaway({ children }: { children: ReactNode }) {
  return (
    <div data-testid="site-takeaway" className="space-y-2 rounded-lg bg-muted/60 p-3 text-sm">
      {children}
    </div>
  )
}

// ── Water levels ───────────────────────────────────────────────────────────────

function WellBody({ id, name, p }: { id: string; name: string; p: Props }) {
  const count = num(p.nrecords)
  const span = num(p.span_years)

  return (
    <>
      <Stats
        items={[
          { value: fmt(p.latest_value, "ft"), label: "to water", sub: fmtDate(p.latest_date) },
          { value: count?.toLocaleString(), label: count === 1 ? "reading" : "readings" },
          {
            value: span !== undefined ? `${fmt(span)} yrs` : undefined,
            label: "of record",
            sub: yearRange(p.earliest_date, p.latest_date),
          },
          { value: fmt(p.well_depth, "ft"), label: "well depth" },
        ]}
      />
      <Tabs defaultValue="chart">
        <TabsList className="w-full">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="readings">Readings</TabsTrigger>
        </TabsList>
        <TabsContent value="chart" className="pt-2">
          <Hydrograph wellId={id} name={name} compact chartHeight={260} />
        </TabsContent>
        <TabsContent value="details" className="pt-2">
          <Facts
            rows={[
              ["Latest depth to water", withDate(p.latest_value, "ft", p.latest_date)],
              ["Shallowest", fmt(p.min, "ft")],
              ["Average", count !== undefined && count > 1 ? fmt(p.mean, "ft") : undefined],
              ["Deepest", fmt(p.max, "ft")],
              ["First reading", fmtDate(p.earliest_date)],
              ["Latest reading", fmtDate(p.latest_date)],
              // No change in depth to water until the trends layers are reworked.
            ]}
          />
        </TabsContent>
        <TabsContent value="readings" className="pt-2">
          <ObservationTable wellId={id} name={name} defaultOpen />
        </TabsContent>
      </Tabs>
    </>
  )
}

// ── Single analyte ──────────────────────────────────────────────────────

function AnalyteBody({
  dataset,
  id,
  p,
  facet,
  sites,
}: {
  dataset: Dataset
  id: string
  p: Props
  /** The latest-value facet (salinity or concentration). */
  facet?: Facet
  sites: Feature[]
}) {
  const unit = typeof p.latest_units === "string" ? p.latest_units : "mg/L"
  const latest = num(p.latest_value)
  const n = num(p.nrecords)
  const analyte = dataset.label.toLowerCase()

  return (
    <>
      <Stats
        items={[
          { value: fmt(latest, unit), label: "latest", sub: fmtDate(p.latest_date) },
          { value: n?.toLocaleString(), label: n === 1 ? "sample" : "samples" },
          {
            value: n !== undefined && n > 1 ? valueRange(p.min, p.max) : undefined,
            label: `range, ${unit}`,
          },
          { value: fmt(p.well_depth, "ft"), label: "well depth" },
        ]}
      />
      {latest !== undefined && (
        <Takeaway>
          {facet?.id === "conc" ? (
            <RankLine value={latest} sites={sites} analyte={analyte} />
          ) : (
            facet && <BinLine value={latest} facet={facet} />
          )}
        </Takeaway>
      )}
      <Tabs defaultValue="chart">
        <TabsList className="w-full">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="samples">Samples</TabsTrigger>
        </TabsList>
        <TabsContent value="chart" className="pt-2">
          <SamplesChart
            collectionId={dataset.detail?.timeseries}
            id={id}
            label={dataset.label}
            unit={unit}
          />
        </TabsContent>
        <TabsContent value="details" className="pt-2">
          <Facts
            rows={[
              ["Latest", withDate(latest, unit, p.latest_date)],
              ["Average", n !== undefined && n > 1 ? fmt(p.mean, unit) : undefined],
              ["First sample", fmtDate(p.earliest_date)],
              ["Latest sample", fmtDate(p.latest_date)],
            ]}
          />
        </TabsContent>
        <TabsContent value="samples" className="pt-2">
          <SamplesTable collectionId={dataset.detail?.timeseries} id={id} />
        </TabsContent>
      </Tabs>
    </>
  )
}

/** `0.2–14`. */
function valueRange(min: unknown, max: unknown): string | undefined {
  const a = fmt(min)
  const b = fmt(max)
  return a && b ? `${a}–${b}` : undefined
}

/** The latest value's bin, e.g. TDS "Slightly brackish". */
function BinLine({ value, facet }: { value: number; facet: Facet }) {
  const site: Feature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: { [facet.field]: value },
  }
  const i = binIndex(site, facet)
  if (i === NO_VALUE) return null
  const bin = facet.bins[i]
  return (
    <p className="flex items-center gap-2">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: bin.color }} />
      <span>
        Latest sample: <span className="font-semibold">{bin.label}</span>
      </span>
    </p>
  )
}

/** Percent of sites whose latest value is below `value`. */
function percentBelow(value: number, sites: Feature[]): number | undefined {
  let below = 0
  let total = 0
  for (const f of sites) {
    const v = f.properties?.latest_value
    if (typeof v !== "number") continue
    total++
    if (v < value) below++
  }
  return total === 0 ? undefined : Math.round((below / total) * 100)
}

/** Where the latest value ranks among all sites. */
function RankLine({ value, sites, analyte }: { value: number; sites: Feature[]; analyte: string }) {
  const pct = useMemo(() => percentBelow(value, sites), [value, sites])
  if (pct === undefined) return null
  return (
    <p>
      Latest {analyte} is higher than <span className="font-semibold">{pct}% of sites</span> with{" "}
      {analyte} results.
    </p>
  )
}

/** A site's numeric samples over time; text results stay in the table. */
function SamplesChart({
  collectionId,
  id,
  label,
  unit,
}: {
  collectionId?: string
  id: string
  label: string
  unit: string
}) {
  // Shares SamplesTable's query, so no refetch.
  const { data, isLoading } = useSiteSamples(collectionId, id)
  const points = useMemo(
    () =>
      (data ?? [])
        .filter((r): r is typeof r & { value: number } => r.value !== null)
        .map((r) => ({ t: r.date, v: r.value, source: r.source, approvalLabel: r.approvalLabel }))
        .reverse(),
    [data]
  )
  if (isLoading) return <Skeleton className="h-64 w-full" />
  return (
    <TimeSeriesChart
      points={points}
      yLabel={label}
      units={unit}
      title={id}
      chartHeight={260}
      colorByApproval={false}
      emptyMessage="No numeric results to chart."
    />
  )
}

/** A site's samples, newest first. */
function SamplesTable({ collectionId, id }: { collectionId?: string; id: string }) {
  const { data, isLoading } = useSiteSamples(collectionId, id)
  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (!data?.length) return <p className="text-sm text-muted-foreground">No samples found.</p>
  return (
    <div className="max-h-96 overflow-y-auto rounded-md border" data-testid="site-samples">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Result</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r, i) => (
            <TableRow key={`${r.date}-${i}`}>
              <TableCell>{fmtDate(r.date)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.value !== null ? fmt(r.value, r.units) : r.text}
              </TableCell>
              <TableCell className="text-muted-foreground">{r.source}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Major ions ──────────────────────────────────────────────────────────

const IONS: { key: string; label: string; kind: "cation" | "anion" }[] = [
  { key: "calcium", label: "Calcium", kind: "cation" },
  { key: "magnesium", label: "Magnesium", kind: "cation" },
  { key: "sodium", label: "Sodium", kind: "cation" },
  { key: "potassium", label: "Potassium", kind: "cation" },
  { key: "bicarbonate", label: "Bicarbonate", kind: "anion" },
  { key: "carbonate", label: "Carbonate", kind: "anion" },
  { key: "chloride", label: "Chloride", kind: "anion" },
  { key: "sulfate", label: "Sulfate", kind: "anion" },
]

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The sample year, or the number of dates if they differ. */
function sampledStat(firstDate: unknown, dates: (string | undefined)[]) {
  if (dates.length === 1) return { value: yearOf(firstDate), label: "sampled", sub: dates[0] }
  return { value: dates.length > 1 ? String(dates.length) : undefined, label: "sample dates" }
}

/** `Hard (180 mg/L as CaCO₃)`. */
function hardnessText(cls: unknown, caco3: unknown): string | undefined {
  if (typeof cls !== "string" || cls === "insufficient") return undefined
  const v = fmt(caco3, "mg/L")
  return v ? `${capitalize(cls)} (${v} as CaCO₃)` : capitalize(cls)
}

function IonsBody({ p }: { p: Props }) {
  const ions = IONS.map((ion) => ({
    ...ion,
    v: num(p[ion.key]),
    date: p[`${ion.key}_date`],
    unit: typeof p[`${ion.key}_units`] === "string" ? (p[`${ion.key}_units`] as string) : "mg/L",
  })).filter((ion): ion is typeof ion & { v: number } => ion.v !== undefined)
  const dates = [...new Set(ions.map((ion) => fmtDate(ion.date)).filter(Boolean))]

  return (
    <>
      <Stats
        items={[
          { value: ions.length ? String(ions.length) : undefined, label: "ions measured" },
          sampledStat(ions[0]?.date, dates),
          { value: fmt(p.well_depth, "ft"), label: "well depth" },
        ]}
      />
      {ions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No major-ion results.</p>
      ) : (
        (["cation", "anion"] as const).map((kind) => {
          const rows = ions.filter((ion) => ion.kind === kind)
          if (rows.length === 0) return null
          return (
            <div key={kind} data-testid={`ions-${kind}`}>
              <SectionTitle>{kind === "cation" ? "Cations" : "Anions"}</SectionTitle>
              <Facts
                rows={rows.map((ion) => [
                  ion.label,
                  // Per-ion dates only when they differ.
                  dates.length > 1 ? withDate(ion.v, ion.unit, ion.date) : fmt(ion.v, ion.unit),
                ])}
              />
            </div>
          )
        })
      )}
      <Facts
        rows={[
          ["Hardness", hardnessText(p.hardness_class, p.hardness_caco3)],
          ["Dominant cation", typeof p.dominant_cation === "string" ? p.dominant_cation : undefined],
          ["Dominant anion", typeof p.dominant_anion === "string" ? p.dominant_anion : undefined],
        ]}
      />
    </>
  )
}
