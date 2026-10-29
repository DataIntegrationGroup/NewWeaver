/**
 * The Datasets page's view of a DIE pygeoapi collection: what the API says
 * about it (title, description, sources, keywords, API page) plus the Weaver
 * map layer that draws it, if any. The page lists exactly what /collections returns, so a
 * product added or retitled upstream shows up without a Weaver change.
 */
import type { Collection } from "@/clients/ogcFeatures"
import { DIE_FEATURES_BASE_URL } from "@/config"
import { LAYER_CATALOG } from "@/catalog/layers"

export interface Dataset {
  id: string
  title: string
  description?: string
  /** Contributing sources, from the description's closing "Sources: …" line. */
  sources: string[]
  /** All of the collection's keywords — searched, not shown. */
  keywords: string[]
  /** Keywords worth showing: those not shared by every collection (see withTags). */
  tags: string[]
  /** The collection's HTML page on the API, for browsing its items. */
  apiUrl: string
  /** Weaver map layer that draws this collection, if there is one. */
  mapLayerId?: string
}

/** First map layer reading each DIE collection, keyed by collection id. */
const MAP_LAYER_BY_COLLECTION = new Map<string, string>()
for (const l of LAYER_CATALOG) {
  if (l.source !== "features") continue
  if ((l.featuresBaseUrl ?? DIE_FEATURES_BASE_URL) !== DIE_FEATURES_BASE_URL) continue
  if (!MAP_LAYER_BY_COLLECTION.has(l.collectionId)) MAP_LAYER_BY_COLLECTION.set(l.collectionId, l.id)
}

/** A description's closing "Sources: A, B, C." sentence. */
const SOURCES_SENTENCE = /\s*Sources?:\s*([^.]+)\.?\s*$/

/** Split a DIE description into its prose and the sources it lists last. */
function splitSources(description = ""): { description?: string; sources: string[] } {
  const match = SOURCES_SENTENCE.exec(description)
  if (!match) return { description: description || undefined, sources: [] }
  return {
    description: description.slice(0, match.index) || undefined,
    sources: match[1].split(",").map((s) => s.trim()).filter(Boolean),
  }
}

export function toDataset(c: Collection): Dataset {
  return {
    id: c.id,
    title: c.title ?? c.id,
    ...splitSources(c.description),
    keywords: c.keywords ?? [],
    tags: c.keywords ?? [],
    apiUrl:
      c.links.find((l) => l.rel === "self" && l.type === "text/html")?.href ??
      `${DIE_FEATURES_BASE_URL}/collections/${c.id}?f=html`,
    mapLayerId: MAP_LAYER_BY_COLLECTION.get(c.id),
  }
}

/** Every source named across the datasets, alphabetically. */
export function allSources(datasets: Dataset[]): string[] {
  return [...new Set(datasets.flatMap((d) => d.sources))].sort((a, b) => a.localeCompare(b))
}

/**
 * Drop keywords every collection shares (today: water, groundwater, New
 * Mexico) from each dataset's tags — they say nothing about any one of them.
 */
export function withTags(datasets: Dataset[]): Dataset[] {
  const common = datasets.length
    ? datasets.map((d) => new Set(d.keywords)).reduce((a, b) => new Set([...a].filter((k) => b.has(k))))
    : new Set<string>()
  return datasets.map((d) => ({ ...d, tags: d.keywords.filter((k) => !common.has(k)) }))
}
