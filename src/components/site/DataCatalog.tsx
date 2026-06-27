/**
 * Data Catalog (SPEC §T.T13–T15 / §I.catalog). A searchable, faceted tiled
 * gallery of every dataset Weaver reads, one card per catalog entry sourced from
 * the shared DATASET_CATALOG (§V.V18 — no second hand-maintained list). Cards
 * are grouped under their section heading and can be narrowed by measurement,
 * group, and source facets or free text. Each card shows all available metadata
 * (hiding what's missing rather than faking it), a copyable shareable link
 * (§V.V16), a live link to the upstream service, and deep links that open the
 * dataset on the map (§V.V15) or straight in the download dialog.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Download, ExternalLink, MapPin, Search, Share2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SitePage as Page } from "./SitePage"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import {
  DATASET_CATALOG,
  DATASET_GROUPS,
  DATASET_MEASUREMENTS,
  DATASET_SOURCES,
  datasetMapSearch,
  datasetSearchText,
  type DatasetMeta,
} from "@/catalog/datasets"

type SortKey = "name" | "source"

function shareUrl(id: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/catalog?dataset=${encodeURIComponent(id)}`
}

/** A toggleable facet pill. */
function FacetChip({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

function FacetRow({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
}) {
  if (options.length < 2) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {options.map((o) => (
        <FacetChip
          key={o}
          label={o}
          active={selected.has(o)}
          onToggle={() => onToggle(o)}
        />
      ))}
    </div>
  )
}

function DatasetCard({
  d,
  highlighted,
}: {
  d: DatasetMeta
  highlighted: boolean
}) {
  async function copyShare() {
    const url = shareUrl(d.id)
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied", { description: url })
    } catch {
      toast.error("Couldn't copy link", { description: url })
    }
  }

  return (
    <Card
      data-testid={`catalog-card-${d.id}`}
      className={"flex h-full flex-col" + (highlighted ? " ring-2 ring-primary" : "")}
    >
      <CardHeader>
        <CardTitle className="text-base">{d.title}</CardTitle>
        {d.measurementLabel && (
          <Badge variant="secondary" className="mt-1 w-fit">
            {d.measurementLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm">
        {d.description && (
          <p className="text-muted-foreground">{d.description}</p>
        )}
        <dl className="space-y-1">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Group</dt>
            <dd className="font-medium">{d.group}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-medium">
              {d.service.url ? (
                <a
                  href={d.service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`catalog-card-source-${d.id}`}
                  className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                >
                  {d.service.name}
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                d.service.name
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Standard</dt>
            <dd className="font-medium">{d.service.protocol}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button asChild size="sm" data-testid={`catalog-card-map-${d.id}`}>
          <Link to="/map" search={datasetMapSearch(d.id)}>
            <MapPin /> View on map
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          data-testid={`catalog-card-download-${d.id}`}
        >
          <Link to="/map" search={datasetMapSearch(d.id)} hash="download">
            <Download /> Download
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          data-testid={`catalog-card-share-${d.id}`}
          onClick={copyShare}
        >
          <Share2 /> Share
        </Button>
      </CardFooter>
    </Card>
  )
}

interface CatalogSearch {
  q?: string
  dataset?: string
  groups?: string
  measures?: string
  sources?: string
  sort?: SortKey
}

/** Parse a comma-joined URL facet value into a set. */
function toSet(v: string | undefined): Set<string> {
  return new Set((v ?? "").split(",").map((s) => s.trim()).filter(Boolean))
}

/** Serialize a facet set back to a URL value (undefined when empty). */
function fromSet(s: Set<string>): string | undefined {
  return s.size ? [...s].join(",") : undefined
}

export function DataCatalog() {
  useDocumentTitle("Data Catalog — Weaver")
  const search = useSearch({ from: "/catalog" }) as CatalogSearch
  const navigate = useNavigate({ from: "/catalog" })

  const [query, setQuery] = useState(search.q ?? "")
  const highlightRef = useRef<HTMLDivElement>(null)

  const groups = toSet(search.groups)
  const measures = toSet(search.measures)
  const sources = toSet(search.sources)
  const sort: SortKey = search.sort === "source" ? "source" : "name"

  // Keep the query in the URL so a filtered view is itself shareable.
  useEffect(() => {
    navigate({
      search: (prev: CatalogSearch) => ({ ...prev, q: query || undefined }),
      replace: true,
    })
  }, [query, navigate])

  // A ?dataset= deep link scrolls its card into view and highlights it (§V.V16).
  useEffect(() => {
    if (search.dataset && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: "center" })
    }
  }, [search.dataset])

  /** Toggle a value in a URL-backed facet set. */
  function toggleFacet(key: "groups" | "measures" | "sources", value: string) {
    const next = toSet(search[key])
    if (next.has(value)) next.delete(value)
    else next.add(value)
    navigate({
      search: (prev: CatalogSearch) => ({ ...prev, [key]: fromSet(next) }),
      replace: true,
    })
  }

  function setSort(next: SortKey) {
    navigate({
      search: (prev: CatalogSearch) => ({ ...prev, sort: next === "name" ? undefined : next }),
      replace: true,
    })
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = DATASET_CATALOG.filter((d) => {
      if (q && !datasetSearchText(d).includes(q)) return false
      if (groups.size && !groups.has(d.group)) return false
      if (measures.size && !(d.measurementLabel && measures.has(d.measurementLabel)))
        return false
      if (sources.size && !sources.has(d.service.name)) return false
      return true
    })
    sorted.sort((a, b) =>
      sort === "source"
        ? a.service.name.localeCompare(b.service.name) || a.title.localeCompare(b.title)
        : a.title.localeCompare(b.title)
    )
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps -- facet sets derive from search
  }, [query, search.groups, search.measures, search.sources, sort])

  const activeFacets = groups.size + measures.size + sources.size
  const hasFilters = activeFacets > 0 || query.trim().length > 0

  function clearAll() {
    setQuery("")
    navigate({
      search: (prev: CatalogSearch) => ({
        ...prev,
        q: undefined,
        groups: undefined,
        measures: undefined,
        sources: undefined,
      }),
      replace: true,
    })
  }

  return (
    <Page>
      <div data-testid="catalog-page">
        <header className="mb-6">
          <h1 className="!text-4xl font-bold text-primary">Data Catalog</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every dataset and integrated product Weaver brings together — from
            agency monitoring networks to statewide water-data products. Search
            it, filter by what's measured, open it on the map, or download it.
          </p>
        </header>

        <div className="mb-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="catalog-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search datasets — name, source, what's measured…"
              className="pl-9"
            />
          </div>

          <FacetRow
            label="Measures"
            options={DATASET_MEASUREMENTS}
            selected={measures}
            onToggle={(v) => toggleFacet("measures", v)}
          />
          <FacetRow
            label="Group"
            options={DATASET_GROUPS}
            selected={groups}
            onToggle={(v) => toggleFacet("groups", v)}
          />
          <FacetRow
            label="Source"
            options={DATASET_SOURCES}
            selected={sources}
            onToggle={(v) => toggleFacet("sources", v)}
          />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p data-testid="catalog-count" className="text-sm text-muted-foreground">
            {results.length} of {DATASET_CATALOG.length} datasets
            {hasFilters && (
              <button
                type="button"
                data-testid="catalog-clear"
                onClick={clearAll}
                className="ml-2 text-primary underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sort
            </span>
            <FacetChip label="Name" active={sort === "name"} onToggle={() => setSort("name")} />
            <FacetChip label="Source" active={sort === "source"} onToggle={() => setSort("source")} />
          </div>
        </div>

        {results.length === 0 ? (
          <p data-testid="catalog-empty" className="text-muted-foreground">
            No datasets match your filters.
          </p>
        ) : (
          // Grouped by section, in catalog order; a group is shown only when it
          // has matching results.
          <div className="space-y-8">
            {DATASET_GROUPS.map((group) => {
              const inGroup = results.filter((d) => d.group === group)
              if (inGroup.length === 0) return null
              return (
                <section key={group} data-testid={`catalog-group-${group}`}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}{" "}
                    <span className="font-normal normal-case">({inGroup.length})</span>
                  </h2>
                  <div
                    data-testid="catalog-grid"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {inGroup.map((d) => (
                      <div
                        key={d.id}
                        ref={d.id === search.dataset ? highlightRef : undefined}
                      >
                        <DatasetCard d={d} highlighted={d.id === search.dataset} />
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </Page>
  )
}
