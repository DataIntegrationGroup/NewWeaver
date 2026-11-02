/**
 * Download a whole DIE collection as CSV or GeoJSON. The API returns at most
 * 10,000 rows per request, so the file is assembled page by page; the dialog
 * says up front how big it is, flags large files, makes very large downloads an
 * explicit choice,
 * and shows progress with a way to cancel. Shares its warning, progress and
 * GIS banner with the map's ExportDialog.
 */
import { useRef, useState } from "react"
import { usePostHog } from "posthog-js/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ExportGisBanner,
  ExportProgress,
  LargeExportConfirm,
  LargeExportNotice,
} from "@/components/export/ExportParts"
import { die, useDieCount } from "@/hooks/useDieCollections"
import {
  EXPORT_PAGE_SIZE,
  collectionParts,
  type CollectionFormat,
} from "@/lib/export/collection"
import { downloadFile, exportFilename } from "@/lib/export/csv"
import type { Dataset } from "./collections"

const FORMATS: { id: CollectionFormat; label: string; ext: string; mime: string }[] = [
  { id: "csv", label: "CSV", ext: "csv", mime: "text/csv" },
  { id: "geojson", label: "GeoJSON", ext: "geojson", mime: "application/geo+json" },
]

/** Above this many rows the dialog flags a large file. */
const LARGE_ROW_COUNT = 30_000
/** Above this many rows a download must be confirmed first. */
const CONFIRM_ROW_COUNT = 100_000

export function DatasetDownloadDialog({
  dataset,
  open,
  onOpenChange,
}: {
  dataset: Dataset
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const posthog = usePostHog()
  const count = useDieCount(dataset.id, open)
  const [format, setFormat] = useState<CollectionFormat>("csv")
  const [confirmedLarge, setConfirmedLarge] = useState(false)
  const [phase, setPhase] = useState<"idle" | "running" | "error">("idle")
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const total = count.data ?? 0
  const requests = Math.ceil(total / EXPORT_PAGE_SIZE)
  const isLarge = total > LARGE_ROW_COUNT
  const needsConfirm = total > CONFIRM_ROW_COUNT
  const running = phase === "running"
  const ready = count.isSuccess && total > 0 && (!needsConfirm || confirmedLarge)
  const spec = FORMATS.find((f) => f.id === format)!

  async function runDownload() {
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setPhase("running")
    setProgress({ done: 0, total })
    const event = { export_kind: `dataset_${format}`, collection_id: dataset.id, row_count: total }
    posthog.capture("export_started", event)

    try {
      const parts = await collectionParts(die, dataset.id, format, {
        total,
        signal: controller.signal,
        onProgress: (done, t) => setProgress({ done, total: t }),
      })
      downloadFile(`${exportFilename(dataset.id)}.${spec.ext}`, parts, spec.mime)
      posthog.capture("export_completed", event)
      setPhase("idle")
      onOpenChange(false)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setPhase("idle")
      } else {
        const message = e instanceof Error ? e.message : "Download failed"
        posthog.capture("export_failed", { ...event, error_message: message })
        setError(message)
        setPhase("error")
      }
    } finally {
      abortRef.current = null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <DialogContent data-testid="dataset-download-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download {dataset.title}</DialogTitle>
          <DialogDescription>The full dataset, straight from the Weaver API.</DialogDescription>
        </DialogHeader>

        <ExportGisBanner />

        <div role="radiogroup" aria-label="File format" className="grid grid-cols-2 gap-2">
          {FORMATS.map((f) => (
            <Button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={format === f.id}
              data-testid={`dataset-download-format-${f.id}`}
              variant={format === f.id ? "default" : "outline"}
              size="sm"
              disabled={running}
              onClick={() => setFormat(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div data-testid="dataset-download-summary" className="text-sm">
          {count.isPending ? (
            <Skeleton className="h-5 w-48" />
          ) : count.isError || count.data == null ? (
            <span className="text-muted-foreground">Couldn’t check the size of this dataset.</span>
          ) : (
            <>
              <strong>{total.toLocaleString()}</strong> rows
              {requests > 1 && (
                <span className="text-muted-foreground">
                  {" "}
                  — fetched from the Weaver API in {requests} requests of{" "}
                  {EXPORT_PAGE_SIZE.toLocaleString()}
                </span>
              )}
            </>
          )}
        </div>

        {isLarge && !needsConfirm && (
          <LargeExportNotice>
            This file has {total.toLocaleString()} rows, so it may take a little while to
            download and open.
          </LargeExportNotice>
        )}

        {needsConfirm && (
          <LargeExportConfirm
            title="Large dataset"
            checked={confirmedLarge}
            disabled={running}
            onCheckedChange={setConfirmedLarge}
          >
            This is a very large download ({total.toLocaleString()} rows). It may take a few
            minutes and a lot of memory.
          </LargeExportConfirm>
        )}

        {running && <ExportProgress done={progress.done} total={progress.total} unit="rows" />}

        {phase === "error" && error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}

        <DialogFooter>
          {running ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          ) : (
            <Button data-testid="dataset-download-start" disabled={!ready} onClick={runDownload}>
              Download {spec.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
