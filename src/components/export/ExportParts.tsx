/**
 * Building blocks shared by the download dialogs (the map's selection export
 * and the Datasets page's whole-collection download), so both warn, confirm
 * and report progress the same way.
 */
import { Link } from "@tanstack/react-router"
import { MonitorCog, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"

/** Steers recurring / large workflows to the live OGC API instead of files. */
export function ExportGisBanner() {
  return (
    <div
      data-testid="export-gis-banner"
      className="flex items-start gap-2.5 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"
    >
      <MonitorCog className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-muted-foreground">
        Working with this data regularly? Connect QGIS or ArcGIS Pro straight
        to the live OGC API instead of downloading files.{" "}
        <Link
          to="/help"
          hash="gis"
          data-testid="export-gis-link"
          className="font-medium text-primary underline underline-offset-2"
        >
          Set up the Desktop GIS integration
        </Link>
        .
      </p>
    </div>
  )
}

/** A warning the user must tick before a very large download can start. */
export function LargeExportConfirm({
  title,
  checked,
  disabled,
  onCheckedChange,
  children,
}: {
  title: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Alert variant="warning" data-testid="export-large-warning">
      <TriangleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{children}</p>
        <label className="flex items-center gap-2 font-medium text-foreground">
          <Checkbox
            checked={checked}
            disabled={disabled}
            onCheckedChange={(v) => onCheckedChange(v === true)}
            className="border-warning"
          />
          Check to confirm before downloading.
        </label>
      </AlertDescription>
    </Alert>
  )
}

/** A heads-up that the file will be big — informational, no confirmation. */
export function LargeExportNotice({ children }: { children: React.ReactNode }) {
  return (
    <Alert variant="warning" data-testid="export-large-notice">
      <TriangleAlert />
      <AlertTitle>Large dataset</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

/** Progress bar with a "Fetching… done/total unit" caption. */
export function ExportProgress({
  done,
  total,
  unit,
}: {
  done: number
  total: number
  unit: string
}) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <Progress value={pct} />
      <p className="text-xs text-muted-foreground">
        Fetching… {done.toLocaleString()}/{total.toLocaleString()} {unit}
      </p>
    </div>
  )
}
