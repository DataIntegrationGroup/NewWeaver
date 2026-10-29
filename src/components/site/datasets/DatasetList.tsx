import { useEffect, useRef } from "react"
import { CloudOff, SearchX, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { Dataset } from "./collections"
import { SORT_OPTIONS, type DatasetSort } from "./filters"

export interface ActiveFilter {
  kind: string
  label: string
  onClear: () => void
}

/** The result list: count + sort, active filters, then one row per dataset. */
export function DatasetList({
  status,
  onRetry,
  results,
  selectedId,
  onSelect,
  sort,
  onSort,
  filters,
  onClearAll,
}: {
  status: "pending" | "error" | "success"
  onRetry: () => void
  results: Dataset[]
  selectedId?: string
  onSelect: (id: string) => void
  sort: DatasetSort
  onSort: (sort: DatasetSort) => void
  filters: ActiveFilter[]
  onClearAll: () => void
}) {
  // Keep the selected row in view as arrow keys (or a deep link) move it.
  const selectedRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" })
  }, [selectedId])

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <p data-testid="datasets-count" className="font-medium">
          {status === "success"
            ? `${results.length} ${results.length === 1 ? "dataset" : "datasets"}`
            : "Datasets"}
        </p>
        <Select
          items={SORT_OPTIONS}
          value={sort}
          onValueChange={(v) => v && onSort(v)}
        >
          <SelectTrigger aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-4 py-2">
          <span className="text-xs text-muted-foreground">Filtered by</span>
          {filters.map((f) => (
            <Badge key={`${f.kind}:${f.label}`} variant="outline" className="bg-background pr-0.5">
              <span className="font-normal text-muted-foreground">{f.kind}:</span>
              {f.label}
              <button
                type="button"
                aria-label={`Remove ${f.kind.toLowerCase()} filter ${f.label}`}
                onClick={f.onClear}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="link"
            size="xs"
            className="ml-auto"
            onClick={onClearAll}
            data-testid="datasets-clear"
          >
            Clear all
          </Button>
        </div>
      )}

      {status === "pending" ? (
        <div className="divide-y" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 px-4 py-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : status === "error" ? (
        <Empty data-testid="datasets-error">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudOff />
            </EmptyMedia>
            <EmptyTitle>Couldn’t load datasets</EmptyTitle>
            <EmptyDescription>The dataset service didn’t respond.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      ) : results.length === 0 ? (
        <Empty data-testid="datasets-empty">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No datasets match</EmptyTitle>
            <EmptyDescription>Try a different search or clear the filters.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-y">
          {results.map((d) => {
            const selected = d.id === selectedId
            return (
              <Item
                key={d.id}
                render={<button type="button" ref={selected ? selectedRef : undefined} />}
                aria-current={selected || undefined}
                onClick={() => onSelect(d.id)}
                data-testid={`datasets-row-${d.id}`}
                className="rounded-none px-4 text-left hover:bg-muted/50 aria-[current=true]:bg-muted"
              >
                <ItemHeader className="items-start">
                  <ItemTitle>{d.title}</ItemTitle>
                </ItemHeader>
                {d.description && (
                  <ItemContent>
                    <ItemDescription className="line-clamp-1">{d.description}</ItemDescription>
                  </ItemContent>
                )}
                {d.sources.length > 0 && (
                  <ItemFooter className="flex-wrap justify-start gap-1">
                    {d.sources.map((s) => (
                      <Badge key={s} variant="outline" className="font-normal text-muted-foreground">
                        {s}
                      </Badge>
                    ))}
                  </ItemFooter>
                )}
              </Item>
            )
          })}
        </div>
      )}
    </Card>
  )
}
