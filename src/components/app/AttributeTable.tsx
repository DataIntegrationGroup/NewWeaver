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
import type { Feature, FeatureCollection } from "geojson"

import type { LayerConfig, FeaturesLayer, StaLayer, ArcGisLayer } from "@/catalog/layers"
import { useFeaturesLayer, useStaLayer, useArcGisLayer } from "@/hooks/useLayerData"
import { filterFeatures, type FeatureFilters } from "@/lib/filterFeatures"
import { selectFields, type FieldDisplay } from "@/lib/fields"
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
  filters,
  selectedFeatureId,
  onSelect,
}: {
  fc: FeatureCollection
  fields?: FieldDisplay
  format?: (key: string, value: unknown) => string
} & Omit<AttributeTableProps, "layer">) {
  const [sorting, setSorting] = useState<SortingState>([])

  const rows = useMemo(
    () => filterFeatures(fc, filters).features,
    [fc, filters]
  )

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
        <p data-testid="no-results" className="p-6 text-sm text-muted-foreground">
          No results.
        </p>
        <div className="mt-auto border-t px-3 py-2 text-sm">
          <span data-testid="table-count" className="text-muted-foreground">
            0 features
          </span>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="attribute-table" className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: " ▲", desc: " ▼" }[h.column.getIsSorted() as string] ?? ""}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-testid="table-row"
                data-feature-id={row.id}
                data-selected={row.id === selectedFeatureId || undefined}
                className={
                  row.id === selectedFeatureId
                    ? "cursor-pointer bg-accent"
                    : "cursor-pointer"
                }
                onClick={() => onSelect(row.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-sm">
        <span data-testid="table-count" className="text-muted-foreground">
          {rows.length} feature{rows.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            data-testid="table-prev"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Prev
          </Button>
          <span className="text-muted-foreground">
            {table.getState().pagination.pageIndex + 1}/{table.getPageCount() || 1}
          </span>
          <Button
            size="xs"
            variant="outline"
            data-testid="table-next"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function FeaturesTable({ layer, ...rest }: { layer: FeaturesLayer } & Omit<AttributeTableProps, "layer">) {
  const { data } = useFeaturesLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} format={layer.formatValue} {...rest} />
}

function StaTable({ layer, ...rest }: { layer: StaLayer } & Omit<AttributeTableProps, "layer">) {
  const { data } = useStaLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} format={layer.formatValue} {...rest} />
}

function ArcGisTable({ layer, ...rest }: { layer: ArcGisLayer } & Omit<AttributeTableProps, "layer">) {
  const { data } = useArcGisLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} format={layer.formatValue} {...rest} />
}

export function AttributeTable({ layer, ...rest }: AttributeTableProps) {
  if (layer.source === "sta") return <StaTable layer={layer} {...rest} />
  if (layer.source === "arcgis") return <ArcGisTable layer={layer} {...rest} />
  return <FeaturesTable layer={layer} {...rest} />
}
