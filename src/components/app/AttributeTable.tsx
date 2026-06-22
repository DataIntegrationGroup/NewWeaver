import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import type { Feature, FeatureCollection, Polygon } from "geojson"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { LayerConfig, FeaturesLayer, StaLayer, ArcGisLayer } from "@/catalog/layers"
import { useFeaturesLayer, useStaLayer, useArcGisLayer } from "@/hooks/useLayerData"
import { filterFeatures, type FeatureFilters } from "@/lib/filterFeatures"
import { pointInAnyShape } from "@/lib/selection"
import { selectFields, type FieldDisplay } from "@/lib/fields"
import { Skeleton } from "@/components/ui/skeleton"
import { FieldValue } from "./FieldValue"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

interface AttributeTableProps {
  layer: LayerConfig
  filters: FeatureFilters
  /** Drawn selection polygons; when present, the table is scoped to features inside them. */
  shapes?: Polygon[]
  selectedFeatureId?: string
  onSelect: (featureId: string) => void
}

function featureId(f: Feature): string {
  return String(f.id ?? f.properties?.id ?? "")
}

function TableView({
  fc,
  fields,
  format = (_k, v) => String(v ?? ""),
  loading,
  filters,
  shapes,
  selectedFeatureId,
  onSelect,
}: {
  fc: FeatureCollection
  fields?: FieldDisplay
  format?: (key: string, value: unknown) => string
  loading?: boolean
} & Omit<AttributeTableProps, "layer">) {
  const [sorting, setSorting] = useState<SortingState>([])

  // Apply the text/extent filters, then narrow to any drawn selection polygons.
  const rows = useMemo(() => {
    let features = filterFeatures(fc, filters).features
    if (shapes && shapes.length > 0) {
      features = features.filter((f) => pointInAnyShape(f, shapes))
    }
    return features
  }, [fc, filters, shapes])

  const columns = useMemo<ColumnDef<Feature>[]>(() => {
    const keys = new Set<string>()
    for (const f of rows.slice(0, 50)) {
      Object.keys(f.properties ?? {}).forEach((k) => keys.add(k))
    }
    return selectFields([...keys], fields).map((key) => ({
      id: key,
      accessorFn: (f: Feature) => f.properties?.[key],
      header: key,
      cell: (ctx) => <FieldValue value={format(key, ctx.getValue())} />,
    }))
  }, [rows, fields, format])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (f) => featureId(f),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  if (rows.length === 0) {
    return (
      <div data-testid="attribute-table" className="flex h-full flex-col">
        {loading ? (
          <div data-testid="table-skeleton" className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <p data-testid="no-results" className="p-6 text-sm text-muted-foreground">
            No results.
          </p>
        )}
        <div className="mt-auto border-t px-3 py-2 text-sm">
          <span data-testid="table-count" className="text-muted-foreground">
            {loading ? "Loading…" : "0 features"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="attribute-table" className="flex h-full flex-col bg-card text-sm">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-0 hover:bg-transparent">
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted()
                  return (
                    <TableHead
                      key={h.id}
                      className="group sticky top-0 z-10 h-9 cursor-pointer select-none whitespace-nowrap border-b border-border bg-muted px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sorted === "asc" ? (
                          <ArrowUp className="size-3 text-primary" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="size-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3 opacity-0 transition-opacity group-hover:opacity-40" />
                        )}
                      </span>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const isSelected = row.id === selectedFeatureId
              return (
                <TableRow
                  key={row.id}
                  data-testid="table-row"
                  data-feature-id={row.id}
                  data-selected={isSelected || undefined}
                  className={cn(
                    "cursor-pointer border-b border-border/40 transition-colors even:bg-muted/30 hover:bg-accent/60",
                    isSelected &&
                      "bg-accent shadow-[inset_3px_0_0_var(--primary)] hover:bg-accent"
                  )}
                  onClick={() => onSelect(row.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="whitespace-nowrap px-3 py-1.5 tabular-nums"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t bg-card px-3 py-1.5">
        <span data-testid="table-count" className="font-medium text-muted-foreground">
          {rows.length.toLocaleString()} feature{rows.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Previous page"
            data-testid="table-prev"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Next page"
            data-testid="table-next"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

function FeaturesTable({ layer, ...rest }: { layer: FeaturesLayer } & Omit<AttributeTableProps, "layer">) {
  const { data, isFetching } = useFeaturesLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} format={layer.formatValue} loading={isFetching} {...rest} />
}

function StaTable({ layer, ...rest }: { layer: StaLayer } & Omit<AttributeTableProps, "layer">) {
  const { data, isFetching } = useStaLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} format={layer.formatValue} loading={isFetching} {...rest} />
}

function ArcGisTable({ layer, ...rest }: { layer: ArcGisLayer } & Omit<AttributeTableProps, "layer">) {
  const { data, isFetching } = useArcGisLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} format={layer.formatValue} loading={isFetching} {...rest} />
}

export function AttributeTable({ layer, ...rest }: AttributeTableProps) {
  if (layer.source === "sta") return <StaTable layer={layer} {...rest} />
  if (layer.source === "arcgis") return <ArcGisTable layer={layer} {...rest} />
  return <FeaturesTable layer={layer} {...rest} />
}
