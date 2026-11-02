/**
 * Whole-collection export from an OGC API Features server. The server caps each
 * response (DIE's pygeoapi: 10,000 items), so the file is assembled page by
 * page with limit/offset and returned as Blob parts — never one giant string.
 */
import type { OgcFeaturesClient } from "@/clients/ogcFeatures"

/** Rows per request — DIE's pygeoapi returns at most this many. */
export const EXPORT_PAGE_SIZE = 10000

export type CollectionFormat = "csv" | "geojson"

interface Options {
  /** Total rows to fetch (the collection's numberMatched). */
  total: number
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

/** Every page of a collection as CSV, with the header kept only once. */
async function csvParts(
  client: OgcFeaturesClient,
  collectionId: string,
  { total, signal, onProgress }: Options
): Promise<BlobPart[]> {
  const parts: string[] = []
  for (let offset = 0; offset < total; offset += EXPORT_PAGE_SIZE) {
    const page = await client.getItemsCsv(
      collectionId,
      { limit: EXPORT_PAGE_SIZE, offset },
      signal
    )
    // Each page repeats the header row; keep it from the first page only.
    const body = offset === 0 ? page : page.slice(page.indexOf("\n") + 1)
    if (body) {
      // Start each page on its own line if the last one didn't end with one.
      if (parts.length && !parts[parts.length - 1].endsWith("\n")) parts.push("\r\n")
      parts.push(body)
    }
    onProgress?.(Math.min(offset + EXPORT_PAGE_SIZE, total), total)
  }
  return parts
}

/** Every page of a collection as one GeoJSON FeatureCollection. */
async function geojsonParts(
  client: OgcFeaturesClient,
  collectionId: string,
  { total, signal, onProgress }: Options
): Promise<BlobPart[]> {
  const parts: BlobPart[] = ['{"type":"FeatureCollection","features":[']
  let first = true
  for (let offset = 0; offset < total; offset += EXPORT_PAGE_SIZE) {
    const fc = await client.getItems(collectionId, { limit: EXPORT_PAGE_SIZE, offset }, signal)
    for (const f of fc.features ?? []) {
      parts.push((first ? "" : ",") + JSON.stringify(f))
      first = false
    }
    onProgress?.(Math.min(offset + EXPORT_PAGE_SIZE, total), total)
  }
  parts.push("]}")
  return parts
}

export function collectionParts(
  client: OgcFeaturesClient,
  collectionId: string,
  format: CollectionFormat,
  options: Options
): Promise<BlobPart[]> {
  return format === "csv"
    ? csvParts(client, collectionId, options)
    : geojsonParts(client, collectionId, options)
}
