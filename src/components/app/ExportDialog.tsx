/** The map's download modal: the filtered site summary as CSV/GeoJSON, or the dataset's full time series. */
import { useMemo, useState } from "react"
import type { Feature, Polygon } from "geojson"
import { usePostHog } from "posthog-js/react"

import type { LayerConfig } from "@/catalog/layers"
import { resolveSelection } from "@/lib/selection"
import { EXPORT_FORMATS, type CollectionFormat } from "@/lib/export/collection"
import { downloadFile, exportFilename } from "@/lib/export/csv"
import { sitesCsv, sitesGeoJSON } from "@/lib/export/sites"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExportGisBanner } from "@/components/export/ExportParts"
import { DatasetDownloadDialog } from "@/components/site/datasets/DatasetDownloadDialog"

type ExportKind = "sites" | "timeseries"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  layer: LayerConfig
  /** The layer's features, already filtered. */
  features: Feature[]
  shapes: Polygon[]
  /** DIE collection with every reading for the dataset, if it has one. */
  timeseriesCollectionId?: string
}

export function ExportDialog({
  open,
  onOpenChange,
  layer,
  features,
  shapes,
  timeseriesCollectionId,
}: ExportDialogProps) {
  const posthog = usePostHog()
  const [kind, setKind] = useState<ExportKind>("sites")
  const [format, setFormat] = useState<CollectionFormat>("csv")
  const [seriesOpen, setSeriesOpen] = useState(false)

  const selection = useMemo(() => resolveSelection(features, shapes), [features, shapes])
  const count = selection.features.length
  const isSeries = kind === "timeseries" && !!timeseriesCollectionId
  const spec = EXPORT_FORMATS.find((f) => f.id === format)!

  const kinds: { id: ExportKind; label: string }[] = [
    { id: "sites", label: "Site summary (filtered)" },
    ...(timeseriesCollectionId
      ? [{ id: "timeseries" as const, label: "Time series (full dataset)" }]
      : []),
  ]

  function runExport() {
    if (isSeries) {
      onOpenChange(false)
      setSeriesOpen(true)
      return
    }
    const stem = exportFilename(`${layer.id}-sites`)
    const content =
      format === "csv" ? sitesCsv(selection.features) : JSON.stringify(sitesGeoJSON(selection.features))
    downloadFile(`${stem}.${spec.ext}`, content, spec.mime)
    posthog.capture("export_completed", { export_kind: `sites_${format}`, feature_count: count })
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="export-dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download data</DialogTitle>
            <DialogDescription>
              Export the summary for the sites you've filtered or drawn around, or the
              dataset's full time series.
            </DialogDescription>
          </DialogHeader>

          <ExportGisBanner />

          <div
            role="radiogroup"
            aria-label="Export type"
            className={kinds.length > 1 ? "grid grid-cols-2 gap-2" : "grid gap-2"}
          >
            {kinds.map((k) => (
              <Button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={kind === k.id}
                data-testid={`export-kind-${k.id}`}
                variant={kind === k.id ? "default" : "outline"}
                size="sm"
                className="h-auto whitespace-normal py-2 text-xs"
                onClick={() => setKind(k.id)}
              >
                {k.label}
              </Button>
            ))}
          </div>

          {isSeries ? (
            <div data-testid="export-summary" className="space-y-2 text-sm">
              <p>
                Every reading for every site in {layer.title}: the raw data the site summary is
                calculated from. Useful for reproducing or checking the summary values, or
                running your own analysis.
              </p>
              <p className="text-muted-foreground">
                It's a large file covering the whole dataset, not just your filters or drawing.
                For a quick look, check out the site summary for this or other parameters.
              </p>
            </div>
          ) : (
            <>
              <div role="radiogroup" aria-label="File format" className="grid grid-cols-2 gap-2">
                {EXPORT_FORMATS.map((f) => (
                  <Button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={format === f.id}
                    data-testid={`export-format-${f.id}`}
                    variant={format === f.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormat(f.id)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>

              <p data-testid="export-summary" className="text-sm">
                <strong>{count}</strong> sites selected
                <span className="text-muted-foreground">
                  {" "}
                  ({selection.counts.drawn} from drawing, {selection.counts.filtered} from
                  filters)
                </span>
              </p>

              <p data-testid="export-sites-note" className="text-sm text-muted-foreground">
                One row per site from the {layer.title} summary, not individual readings.
              </p>

              {count === 0 && (
                <p data-testid="export-empty" className="text-sm text-muted-foreground">
                  Nothing is selected. Adjust filters or draw a selection.
                </p>
              )}
            </>
          )}

          <DialogFooter>
            <Button
              data-testid="export-download"
              disabled={!isSeries && count === 0}
              onClick={runExport}
            >
              {isSeries ? "Continue" : `Download ${spec.label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {timeseriesCollectionId && (
        <DatasetDownloadDialog
          key={timeseriesCollectionId}
          dataset={{ id: timeseriesCollectionId, title: `${layer.title} time series` }}
          description="Every reading behind the site summary, for every site in the dataset, straight from the Weaver API."
          open={seriesOpen}
          onOpenChange={setSeriesOpen}
        />
      )}
    </>
  )
}
