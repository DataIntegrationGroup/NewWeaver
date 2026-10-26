/**
 * The Datasets page's view of a DIE pygeoapi collection: what the API says
 * about it (title, description, keywords, API page) plus the Weaver map layer that
 * draws it, if any. The page lists exactly what /collections returns, so a
 * product added or retitled upstream shows up without a Weaver change.
 */
import type { Collection } from "@/clients/ogcFeatures"
import { DIE_FEATURES_BASE_URL } from "@/config"
import { LAYER_CATALOG } from "@/catalog/layers"

export interface Dataset {
  id: string
  title: string
  description?: string
  keywords: string[]
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

export function toDataset(c: Collection): Dataset {
  return {
    id: c.id,
    title: c.title ?? c.id,
    description: c.description,
    keywords: c.keywords ?? [],
    apiUrl:
      c.links.find((l) => l.rel === "self" && l.type === "text/html")?.href ??
      `${DIE_FEATURES_BASE_URL}/collections/${c.id}?f=html`,
    mapLayerId: MAP_LAYER_BY_COLLECTION.get(c.id),
  }
}

/**
 * Keywords that tell collections apart — any keyword every collection shares
 * (today: water, groundwater, New Mexico) says nothing and is dropped.
 */
export function topicKeywords(datasets: Dataset[]): string[] {
  const counts = new Map<string, number>()
  for (const d of datasets) for (const k of new Set(d.keywords)) counts.set(k, (counts.get(k) ?? 0) + 1)
  return [...counts]
    .filter(([, n]) => n < datasets.length)
    .map(([k]) => k)
    .sort((a, b) => a.localeCompare(b))
}
