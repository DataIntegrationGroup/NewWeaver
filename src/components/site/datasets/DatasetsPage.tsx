/**
 * Datasets — search and browse the integrated products the DIE pygeoapi
 * serves, as its /collections endpoint describes them. A topic facet on the
 * left (when the collections' keywords offer one), the matching list in the middle, and the selected dataset's
 * details on the right (in a Sheet on narrow screens). Query, topic, sort and
 * selection all live in the URL, so any view is a shareable link.
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { PageDescription, PageHeader, PageTitle } from "@/components/ui/page"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { TRY_DATASETS } from "@/catalog/datasets"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useDieCollections } from "@/hooks/useDieCollections"
import { toDataset, topicKeywords } from "./collections"
import type { DatasetsSearch } from "@/router"
import { cn } from "@/lib/utils"
import { SitePage } from "../SitePage"
import { DatasetDetail } from "./DatasetDetail"
import { DatasetFilters } from "./DatasetFilters"
import { DatasetList, type ActiveFilter } from "./DatasetList"
import { filterDatasets, type DatasetSort } from "./filters"

export function DatasetsPage() {
  useDocumentTitle("Weaver — Datasets")
  const search = useSearch({ from: "/datasets" })
  const navigate = useNavigate({ from: "/datasets" })
  const isWide = useMediaQuery("(min-width: 64rem)")
  const [sheetOpen, setSheetOpen] = useState(false)

  // The input is local state so typing stays snappy; the URL follows it.
  const [query, setQuery] = useState(search.q ?? "")
  const sort: DatasetSort = search.sort ?? "relevance"

  const update = (patch: Partial<DatasetsSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  useEffect(() => {
    navigate({ search: (prev) => ({ ...prev, q: query || undefined }), replace: true })
  }, [query, navigate])

  const collections = useDieCollections()
  const all = useMemo(() => (collections.data ?? []).map(toDataset), [collections.data])
  const topics = useMemo(() => topicKeywords(all), [all])
  // Ignore a linked topic the collections no longer offer.
  const topic = search.topic && topics.includes(search.topic) ? search.topic : undefined

  const { results, matchedCount, topicCounts } = useMemo(
    () => filterDatasets({ all, topics, query, topic, sort }),
    [all, topics, query, topic, sort]
  )

  // The linked dataset if it's still in the results, else the first match.
  const selected = results.find((d) => d.id === search.dataset) ?? results[0]

  function select(id: string, openSheet = true) {
    update({ dataset: id })
    if (openSheet && !isWide) setSheetOpen(true)
  }

  function onSearchKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    e.preventDefault()
    const i = selected ? results.indexOf(selected) : -1
    const next = results[e.key === "ArrowDown" ? Math.min(i + 1, results.length - 1) : Math.max(i - 1, 0)]
    if (next) select(next.id, false)
  }

  const filters: ActiveFilter[] = [
    ...(query.trim()
      ? [{ kind: "Search", label: `“${query.trim()}”`, onClear: () => setQuery("") }]
      : []),
    ...(topic
      ? [{ kind: "Topic", label: topic, onClear: () => update({ topic: undefined }) }]
      : []),
  ]

  const header = (
    <PageHeader>
      <PageTitle>Find the integrated dataset you need.</PageTitle>
      <PageDescription>
        Search every Weaver integrated water dataset by name, parameter, or topic. Results
        update as you type.
      </PageDescription>
      <div className="flex max-w-2xl flex-col gap-3 pt-2">
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search datasets"
            placeholder="e.g. arsenic, depth to water"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            data-testid="datasets-search"
          />
          {query && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => setQuery("")}>
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <span>Try</span>
          {TRY_DATASETS.map((label) => (
            <Badge
              key={label}
              variant="outline"
              render={<button type="button" onClick={() => setQuery(label.toLowerCase())} />}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </PageHeader>
  )

  return (
    <SitePage header={header}>
      <div
        data-testid="datasets-page"
        className={cn(
          "grid items-start gap-6",
          topics.length > 0
            ? "lg:grid-cols-[13rem_minmax(0,1fr)_22rem]"
            : "lg:grid-cols-[minmax(0,1fr)_24rem]"
        )}
      >
        {topics.length > 0 && (
          <DatasetFilters
            topics={topics}
            topic={topic}
            total={matchedCount}
            counts={topicCounts}
            onTopic={(topic) => update({ topic })}
          />
        )}

        <DatasetList
          status={collections.status}
          onRetry={() => collections.refetch()}
          results={results}
          topics={topics}
          selectedId={selected?.id}
          onSelect={select}
          sort={sort}
          onSort={(s) => update({ sort: s === "relevance" ? undefined : s })}
          filters={filters}
          onClearAll={() => {
            setQuery("")
            update({ topic: undefined })
          }}
        />

        {selected && isWide && (
          <Card className="sticky top-6">
            <CardContent>
              <DatasetDetail d={selected} />
            </CardContent>
          </Card>
        )}
      </div>

      {selected && !isWide && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="sr-only">{selected.title}</SheetTitle>
              <SheetDescription className="sr-only">Dataset details</SheetDescription>
            </SheetHeader>
            <DatasetDetail d={selected} className="px-4 pb-6" />
          </SheetContent>
        </Sheet>
      )}
    </SitePage>
  )
}
