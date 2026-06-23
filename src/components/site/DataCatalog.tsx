/**
 * Data Catalog (SPEC §T.T13–T15 / §I.catalog). A searchable tiled gallery of
 * every dataset Weaver reads, one card per catalog entry sourced from the shared
 * DATASET_CATALOG (§V.V18 — no second hand-maintained list). Each card shows all
 * available metadata (hiding what's missing rather than faking it), a copyable
 * shareable link (§V.V16), and a real "View on map" deep link that opens the
 * dataset's layer visible (§V.V15).
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { MapPin, Search, Share2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SitePage as Page } from "./SitePage"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import {
  DATASET_CATALOG,
  datasetMapSearch,
  datasetSearchText,
  type DatasetMeta,
} from "@/catalog/datasets"

function shareUrl(id: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/catalog?dataset=${encodeURIComponent(id)}`
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
      className={
        "h-full" + (highlighted ? " ring-2 ring-primary" : "")
      }
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
            <dd className="font-medium">{d.service.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Standard</dt>
            <dd className="font-medium">{d.service.protocol}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="gap-2">
        <Button asChild size="sm" data-testid={`catalog-card-map-${d.id}`}>
          <Link to="/map" search={datasetMapSearch(d.id)}>
            <MapPin /> View on map
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
}

export function DataCatalog() {
  useDocumentTitle("Data Catalog — Weaver")
  const search = useSearch({ from: "/catalog" }) as CatalogSearch
  const navigate = useNavigate({ from: "/catalog" })

  const [query, setQuery] = useState(search.q ?? "")
  const highlightRef = useRef<HTMLDivElement>(null)

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return DATASET_CATALOG
    return DATASET_CATALOG.filter((d) => datasetSearchText(d).includes(q))
  }, [query])

  return (
    <Page>
      <div data-testid="catalog-page">
        <header className="mb-6">
          <h1 className="!text-4xl font-bold text-primary">Data Catalog</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every dataset and integrated product Weaver brings together — from
            agency monitoring networks to statewide water-data products. Search
            it, open it on the map, or share a direct link.
          </p>
        </header>

        <div className="relative mb-6 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="catalog-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search datasets — name, source, what's measured…"
            className="pl-9"
          />
        </div>

        {results.length === 0 ? (
          <p data-testid="catalog-empty" className="text-muted-foreground">
            No datasets match “{query}”.
          </p>
        ) : (
          <div
            data-testid="catalog-grid"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {results.map((d) => (
              <div
                key={d.id}
                ref={d.id === search.dataset ? highlightRef : undefined}
              >
                <DatasetCard d={d} highlighted={d.id === search.dataset} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
