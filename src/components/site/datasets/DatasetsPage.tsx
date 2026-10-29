/**
 * Datasets — search and browse the integrated products the DIE pygeoapi
 * serves, as its /collections endpoint describes them. A source facet on the
 * left, the matching list in the middle, and the selected dataset's
 * details on the right (in a Sheet on narrow screens). Query, sources, sort and
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
import { allSources, toDataset, withTags } from "./collections"
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
  const all = useMemo(() => withTags((collections.data ?? []).map(toDataset)), [collections.data])
  const sourceList = useMemo(() => allSources(all), [all])
  // Linked sources the collections still name, in facet order.
  const sources = useMemo(() => {
    const linked = (search.sources ?? "").split(",")
    return sourceList.filter((s) => linked.includes(s))
  }, [search.sources, sourceList])
  const setSources = (next: string[]) => update({ sources: next.join(",") || undefined })
  const toggleSource = (s: string) =>
    setSources(sources.includes(s) ? sources.filter((x) => x !== s) : [...sources, s])

  const { results, sourceCounts } = useMemo(
    () => filterDatasets({ all, sourceList, query, sources, sort }),
    [all, sourceList, query, sources, sort]
  )
  const hasFacets = sourceList.length > 0
  // One column template for the header's search row and the body, so the
  // search box ends exactly where the results list does.
  const columns = cn(
    "grid gap-x-6",
    hasFacets
      ? "lg:grid-cols-[13rem_minmax(0,1fr)_22rem]"
      : "lg:grid-cols-[minmax(0,1fr)_24rem]"
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
    ...sources.map((s) => ({
      kind: "Source",
      label: s,
      onClear: () => setSources(sources.filter((x) => x !== s)),
    })),
  ]

  const header = (
    <PageHeader>
      <PageTitle>Find the integrated dataset you need.</PageTitle>
      <PageDescription>
        Search every Weaver integrated water dataset by name, parameter, or source. Results
        update as you type.
      </PageDescription>
      <div className={cn(columns, "pt-2")}>
        <div className={cn("flex flex-col gap-3", hasFacets && "lg:col-span-2")}>
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
      </div>
    </PageHeader>
  )

  return (
    <SitePage header={header}>
      <div
        data-testid="datasets-page"
        className={cn(columns, "items-start gap-y-6")}
      >
        {hasFacets && (
          <DatasetFilters
            collapsible={!isWide}
            sourceList={sourceList}
            selected={sources}
            counts={sourceCounts}
            onToggle={toggleSource}
            onClear={() => setSources([])}
          />
        )}

        <DatasetList
          status={collections.status}
          onRetry={() => collections.refetch()}
          results={results}
          selectedId={selected?.id}
          onSelect={select}
          sort={sort}
          onSort={(s) => update({ sort: s === "relevance" ? undefined : s })}
          filters={filters}
          onClearAll={() => {
            setQuery("")
            update({ sources: undefined })
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
