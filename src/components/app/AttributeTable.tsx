import { useEffect, useMemo, useRef, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import type { Feature, FeatureCollection, Polygon } from "geojson"
import {
  AlignJustify,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { LayerConfig, FeaturesLayer, StaLayer, ArcGisLayer, WfsLayer, AttributeFacet } from "@/catalog/layers"
import { useFeaturesLayer, useStaLayer, useArcGisLayer, useWfsLayer } from "@/hooks/useLayerData"
import { filterFeatures, matchesText, matchesValues, type FeatureFilters } from "@/lib/filterFeatures"
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
  /** Per-layer free-text attribute filter, set from the layer's settings popover. */
  attributeQuery?: string
  /** Selected values for the layer's facet (settings popover). */
  facetValues?: string[]
  selectedFeatureId?: string
  onSelect: (featureId: string) => void
  /** Clear the active filters/selection from the footer chips. */
  onClearText?: () => void
  onClearExtent?: () => void
  onClearShapes?: () => void
  onClearAttributeQuery?: () => void
  onClearFacet?: () => void
  /** Open the export flow for this layer's features (SPEC §T.T5). */
  onExport?: () => void
}

function featureId(f: Feature): string {
  return String(f.id ?? f.properties?.id ?? "")
}

/** A dismissible chip describing one active filter, shown in the table footer. */
function FilterChip({ label, onClear }: { label: string; onClear?: () => void }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <span className="max-w-32 truncate">{label}</span>
      {onClear && (
        <button
          type="button"
          aria-label="Clear filter"
          onClick={onClear}
          className="hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}

function TableView({
  fc,
  fields,
  facet,
  format = (_k, v) => String(v ?? ""),
  loading,
  filters,
  shapes,
  attributeQuery,
  facetValues,
  selectedFeatureId,
  onSelect,
  onClearText,
  onClearExtent,
  onClearShapes,
  onClearAttributeQuery,
  onClearFacet,
  onExport,
}: {
  fc: FeatureCollection
  fields?: FieldDisplay
  facet?: AttributeFacet
  format?: (key: string, value: unknown) => string
  loading?: boolean
} & Omit<AttributeTableProps, "layer">) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [dense, setDense] = useState(false)

  // Apply the text/extent filters, the layer's own attribute filter and
  // facet selection, then narrow to any drawn selection polygons.
  const rows = useMemo(() => {
    let features = filterFeatures(fc, filters).features
    if (attributeQuery) {
      features = features.filter((f) => matchesText(f, attributeQuery))
    }
    if (facet && facetValues && facetValues.length > 0) {
      features = features.filter((f) => matchesValues(f, facet.field, facetValues))
    }
    if (shapes && shapes.length > 0) {
      features = features.filter((f) => pointInAnyShape(f, shapes))
    }
    return features
  }, [fc, filters, attributeQuery, facet, facetValues, shapes])

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
  })

  // Row virtualization: only the rows in (and near) the viewport are in the DOM,
  // so a 278k-row layer (OSE PODs) scrolls smoothly. Spacer rows above/below
  // hold the scroll height. Plain windowing — no extra dependency.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(400)
  const rowH = dense ? 26 : 44
  const overscan = 8

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setViewportH(el.clientHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const sortedRows = table.getRowModel().rows
  const total = sortedRows.length
  const start = Math.max(0, Math.floor(scrollTop / rowH) - overscan)
  const end = Math.min(total, start + Math.ceil(viewportH / rowH) + overscan * 2)
  const visibleRows = sortedRows.slice(start, end)
  const padTop = start * rowH
  const padBottom = (total - end) * rowH
  const colCount = table.getAllLeafColumns().length

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
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
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
            {padTop > 0 && (
              <tr aria-hidden style={{ height: padTop }}>
                <td colSpan={colCount} />
              </tr>
            )}
            {visibleRows.map((row) => {
              const isSelected = row.id === selectedFeatureId
              return (
                <TableRow
                  key={row.id}
                  data-testid="table-row"
                  data-feature-id={row.id}
                  data-selected={isSelected || undefined}
                  style={{ height: rowH }}
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
                      className={cn(
                        "whitespace-nowrap px-3 align-middle tabular-nums",
                        dense ? "py-0.5 text-xs" : "py-2"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
            {padBottom > 0 && (
              <tr aria-hidden style={{ height: padBottom }}>
                <td colSpan={colCount} />
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t bg-card px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span data-testid="table-count" className="shrink-0 font-medium text-muted-foreground">
            {rows.length.toLocaleString()} feature{rows.length === 1 ? "" : "s"}
          </span>
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
            {filters.q && (
              <FilterChip label={`“${filters.q}”`} onClear={onClearText} />
            )}
            {filters.bbox && <FilterChip label="Map view" onClear={onClearExtent} />}
            {attributeQuery && (
              <FilterChip label={`“${attributeQuery}”`} onClear={onClearAttributeQuery} />
            )}
            {facet && facetValues && facetValues.length > 0 && (
              <FilterChip
                label={`${facet.label}: ${facetValues.join(", ")}`}
                onClear={onClearFacet}
              />
            )}
            {shapes && shapes.length > 0 && (
              <FilterChip label="Selection" onClear={onClearShapes} />
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onExport && (
            <Button
              size="sm"
              variant="outline"
              data-testid="table-export"
              title="Download these features"
              onClick={onExport}
            >
              <Download />
              Download
            </Button>
          )}
          <Button
            size="icon-sm"
            variant={dense ? "secondary" : "ghost"}
            aria-label="Toggle row density"
            data-testid="table-density"
            title="Toggle row density"
            onClick={() => setDense((d) => !d)}
          >
            <AlignJustify />
          </Button>
        </div>
      </div>
    </div>
  )
}

function FeaturesTable({ layer, ...rest }: { layer: FeaturesLayer } & Omit<AttributeTableProps, "layer">) {
  const { data, isFetching } = useFeaturesLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} facet={layer.facet} format={layer.formatValue} loading={isFetching} {...rest} />
}

function StaTable({ layer, ...rest }: { layer: StaLayer } & Omit<AttributeTableProps, "layer">) {
  const { data, isFetching } = useStaLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} facet={layer.facet} format={layer.formatValue} loading={isFetching} {...rest} />
}

function ArcGisTable({ layer, ...rest }: { layer: ArcGisLayer } & Omit<AttributeTableProps, "layer">) {
  const { data, isFetching } = useArcGisLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} facet={layer.facet} format={layer.formatValue} loading={isFetching} {...rest} />
}

function WfsTable({ layer, ...rest }: { layer: WfsLayer } & Omit<AttributeTableProps, "layer">) {
  const { data, isFetching } = useWfsLayer(layer)
  return <TableView fc={data ?? { type: "FeatureCollection", features: [] }} fields={layer.fields} facet={layer.facet} format={layer.formatValue} loading={isFetching} {...rest} />
}

export function AttributeTable({ layer, ...rest }: AttributeTableProps) {
  if (layer.source === "sta") return <StaTable layer={layer} {...rest} />
  if (layer.source === "arcgis") return <ArcGisTable layer={layer} {...rest} />
  if (layer.source === "wfs") return <WfsTable layer={layer} {...rest} />
  return <FeaturesTable layer={layer} {...rest} />
}
