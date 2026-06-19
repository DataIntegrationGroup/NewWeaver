import { useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Polygon } from "geojson"
import { usePostHog } from "posthog-js/react"

import type { LayerConfig } from "@/catalog/layers"
import type { FeatureFilters } from "@/lib/filterFeatures"
import { resolveSelection } from "@/lib/selection"
import {
  gatherTimeSeriesRows,
  timeSeriesCsv,
  type TimeRange,
} from "@/lib/export/timeSeries"
import { gatherLatestRows, latestCsv } from "@/lib/export/latest"
import { buildFeaturesGeoJSON } from "@/lib/export/geojson"
import { downloadFile, exportFilename } from "@/lib/export/csv"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"

type ExportKind = "timeseries" | "latest" | "features"

const KINDS: { id: ExportKind; label: string; ext: string }[] = [
  { id: "timeseries", label: "Time series", ext: "csv" },
  { id: "latest", label: "Latest observation", ext: "csv" },
  { id: "features", label: "Features (GeoJSON)", ext: "geojson" },
]

/** Above this many locations, an unbounded time-series export is flagged. */
const LARGE_LOCATION_COUNT = 25

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  layers: LayerConfig[]
  filters: FeatureFilters
  shapes: Polygon[]
}

export function ExportDialog({
  open,
  onOpenChange,
  layers,
  filters,
  shapes,
}: ExportDialogProps) {
  const posthog = usePostHog()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<ExportKind>("timeseries")
  const [range, setRange] = useState<TimeRange>({})
  const [confirmedLarge, setConfirmedLarge] = useState(false)
  const [phase, setPhase] = useState<"idle" | "running" | "error">("idle")
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Recompute the selection from the live cache whenever inputs change.
  const selection = useMemo(
    () => resolveSelection(layers, filters, shapes, queryClient),
    [layers, filters, shapes, queryClient]
  )

  const hasLocations = selection.locations.length > 0
  const hasFeatures = selection.features.length > 0
  // Time series / latest need STA locations; features can also use vector data.
  const exportable = kind === "features" ? hasLocations || hasFeatures : hasLocations

  const isLarge =
    kind === "timeseries" &&
    !range.from &&
    !range.to &&
    selection.locations.length > LARGE_LOCATION_COUNT
  const blockedByConfirm = isLarge && !confirmedLarge

  const onProgress = (done: number, total: number) => setProgress({ done, total })

  async function runExport() {
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setPhase("running")
    setProgress({ done: 0, total: selection.locations.length })

    posthog.capture("export_started", {
      export_kind: kind,
      location_count: selection.locations.length,
      feature_count: selection.features.length,
      has_date_range: !!(range.from || range.to),
    })

    try {
      if (kind === "timeseries") {
        const rows = await gatherTimeSeriesRows(selection.locations, {
          range,
          signal: controller.signal,
          onProgress,
        })
        downloadFile(`${exportFilename("timeseries")}.csv`, timeSeriesCsv(rows), "text/csv")
      } else if (kind === "latest") {
        const rows = await gatherLatestRows(selection.locations, {
          signal: controller.signal,
          onProgress,
        })
        downloadFile(`${exportFilename("latest")}.csv`, latestCsv(rows), "text/csv")
      } else {
        const fc = await buildFeaturesGeoJSON(selection, {
          signal: controller.signal,
          onProgress,
        })
        downloadFile(
          `${exportFilename("features")}.geojson`,
          JSON.stringify(fc, null, 2),
          "application/geo+json"
        )
      }

      posthog.capture("export_completed", {
        export_kind: kind,
        location_count: selection.locations.length,
      })

      setPhase("idle")
      onOpenChange(false)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setPhase("idle")
      } else {
        const message = e instanceof Error ? e.message : "Export failed"
        posthog.capture("export_failed", {
          export_kind: kind,
          error_message: message,
        })
        setError(message)
        setPhase("error")
      }
    } finally {
      abortRef.current = null
    }
  }

  const running = phase === "running"
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <DialogContent data-testid="export-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download data</DialogTitle>
          <DialogDescription>
            Export the current selection. Drawn shapes and the visible/filtered
            points both feed the selection.
          </DialogDescription>
        </DialogHeader>

        {/* Export kind */}
        <div role="radiogroup" aria-label="Export type" className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <Button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              data-testid={`export-kind-${k.id}`}
              variant={kind === k.id ? "default" : "outline"}
              size="sm"
              className="h-auto whitespace-normal py-2 text-xs"
              disabled={running}
              onClick={() => setKind(k.id)}
            >
              {k.label}
            </Button>
          ))}
        </div>

        {/* Selection summary */}
        <p data-testid="export-summary" className="text-sm">
          {kind === "features" ? (
            <span>
              <strong>{selection.locations.length + selection.features.length}</strong>{" "}
              features selected
            </span>
          ) : (
            <span>
              <strong>{selection.locations.length}</strong> monitoring locations selected
            </span>
          )}
          <span className="text-muted-foreground">
            {" "}
            ({selection.counts.drawn} from drawing, {selection.counts.filtered} from filters)
          </span>
        </p>

        {/* Time range — time series only */}
        {kind === "timeseries" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="export-from" className="text-xs">From</Label>
              <Input
                id="export-from"
                type="date"
                data-testid="export-from"
                value={range.from ?? ""}
                disabled={running}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-to" className="text-xs">To</Label>
              <Input
                id="export-to"
                type="date"
                data-testid="export-to"
                value={range.to ?? ""}
                disabled={running}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || undefined }))}
              />
            </div>
          </div>
        )}

        {/* Large-export warning */}
        {isLarge && (
          <label
            data-testid="export-large-warning"
            className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs"
          >
            <Checkbox
              checked={confirmedLarge}
              disabled={running}
              onCheckedChange={(v) => setConfirmedLarge(v === true)}
              className="mt-0.5"
            />
            <span>
              This may download a very large file ({selection.locations.length} locations,
              full history). Check to confirm before downloading.
            </span>
          </label>
        )}

        {!exportable && (
          <p data-testid="export-empty" className="text-sm text-muted-foreground">
            Nothing is selected. Toggle a layer, adjust filters, or draw a selection.
          </p>
        )}

        {running && (
          <div className="space-y-1.5">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              Fetching… {progress.done}/{progress.total} locations
            </p>
          </div>
        )}

        {phase === "error" && error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}

        <Separator className="-mx-4 w-[calc(100%+2rem)]" />

        <DialogFooter>
          {running ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          ) : (
            <Button
              data-testid="export-download"
              disabled={!exportable || blockedByConfirm}
              onClick={runExport}
            >
              Download {KINDS.find((k) => k.id === kind)?.ext.toUpperCase()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
