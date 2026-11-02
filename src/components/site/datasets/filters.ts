/**
 * Search, source filter and sort for the Datasets page — pure functions over the DIE
 * collections, so the page component only wires them to the URL.
 */
import type { Dataset } from "./collections"

export type DatasetSort = "relevance" | "name"

export const SORT_OPTIONS: { value: DatasetSort; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "name", label: "Name A–Z" },
]

function searchText(d: Dataset): string {
  return [d.title, d.description, ...d.sources, ...d.keywords]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

/**
 * Collections matching every term of the query, best first: a term in the
 * title counts more than one elsewhere. An empty query keeps API order.
 */
function matchQuery(all: Dataset[], query: string): Dataset[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return all
  return all
    .map((d, i) => {
      const text = searchText(d)
      const title = d.title.toLowerCase()
      const score = terms.every((t) => text.includes(t))
        ? terms.reduce((sum, t) => sum + (title.includes(t) ? 3 : 1), 0)
        : 0
      return { d, i, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.d)
}

/**
 * Query, then sources (a dataset matches if it has any selected source).
 * Source counts follow the query.
 */
export function filterDatasets({
  all,
  sourceList,
  query,
  sources,
  sort,
}: {
  all: Dataset[]
  /** Sources offered in the facet (see allSources). */
  sourceList: string[]
  query: string
  sources: string[]
  sort: DatasetSort
}) {
  const matched = matchQuery(all, query)
  const sourceCounts = new Map(
    sourceList.map((s) => [s, matched.filter((d) => d.sources.includes(s)).length])
  )
  const inSources = sources.length
    ? matched.filter((d) => sources.some((s) => d.sources.includes(s)))
    : matched
  const results =
    sort === "name" ? [...inSources].sort((a, b) => a.title.localeCompare(b.title)) : inSources
  return { results, sourceCounts }
}
