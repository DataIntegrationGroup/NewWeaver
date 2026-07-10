import { Download } from "lucide-react"

import { useWellSeries } from "@/hooks/usePlanning"
import { toCsv, downloadFile, exportFilename } from "@/lib/export/csv"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

interface ObservationTableProps {
  /** Well id — same key the sibling Hydrograph uses, so the `useWellSeries`
   *  query is already cached and this adds no extra fetch. */
  wellId: string
  /** Well name, used in the CSV filename. */
  name?: string
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

/** Title-case a normalized approval flag like `provisional` → `Provisional`. */
const fmtApproval = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Collapsible table of a well's raw water-level observations, with a CSV
 * download. Shares the `useWellSeries` cache with the Hydrograph chart, so it
 * renders from the same points without re-fetching. Collapsed by default to
 * keep the inspector chart-first.
 */
export function ObservationTable({ wellId, name }: ObservationTableProps) {
  const { data } = useWellSeries(wellId)
  const points = data?.points ?? []
  const units = data?.units ?? "ft"

  if (points.length === 0) return null

  // Newest reading first — the table reads top-down from the latest measurement.
  const rows = [...points].reverse()

  const download = () => {
    const csv = toCsv(
      ["datetime", `depth_to_water_${units}`, "source", "approval_status", "qualifier"],
      points.map((p) => [p.t, p.v, p.source ?? "", p.approval ?? "", p.qualifier ?? ""])
    )
    downloadFile(
      `${exportFilename(`observations-${name ?? wellId}`)}.csv`,
      csv,
      "text/csv"
    )
  }

  return (
    <Accordion type="single" collapsible data-testid="observation-table">
      <AccordionItem value="observations" className="border-none">
        <AccordionTrigger className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
          Observations ({points.length.toLocaleString()})
        </AccordionTrigger>
        <AccordionContent>
          <div className="mb-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={download}
              data-testid="observation-download"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </Button>
          </div>
          <div className="max-h-64 overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Depth to water ({units})</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Qualifier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p, i) => (
                  <TableRow key={`${p.t}-${i}`}>
                    <TableCell className="tabular-nums">{fmtDate(p.t)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.v.toFixed(2)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {p.source ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.approval ? fmtApproval(p.approval) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.qualifier ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
