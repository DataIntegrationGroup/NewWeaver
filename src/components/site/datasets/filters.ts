/**
 * Search, topic and sort for the Datasets page — pure functions over the DIE
 * collections, so the page component only wires them to the URL.
 */
import type { Dataset } from "./collections"

export type DatasetSort = "relevance" | "name"

export const SORT_OPTIONS: { value: DatasetSort; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "name", label: "Name A–Z" },
]

function searchText(d: Dataset): string {
  return [d.title, d.description, ...d.keywords].filter(Boolean).join(" ").toLowerCase()
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

export function filterDatasets({
  all,
  topics,
  query,
  topic,
  sort,
}: {
  all: Dataset[]
  /** Keywords offered as topics (see topicKeywords). */
  topics: string[]
  query: string
  topic?: string
  sort: DatasetSort
}) {
  const matched = matchQuery(all, query)
  const topicCounts = new Map(
    topics.map((t) => [t, matched.filter((d) => d.keywords.includes(t)).length])
  )
  const inTopic = topic ? matched.filter((d) => d.keywords.includes(topic)) : matched
  const results =
    sort === "name" ? [...inTopic].sort((a, b) => a.title.localeCompare(b.title)) : inTopic
  return { results, matchedCount: matched.length, topicCounts }
}
