import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { get, set, del } from "idb-keyval"

/**
 * Gzip a string to bytes using the browser's native CompressionStream. This is
 * orders of magnitude faster than a JS LZ implementation (a ~20MB layer cache
 * compressed via lz-string blocked the main thread ~4s; native gzip streams it
 * off the critical path), and idb-keyval stores the resulting Uint8Array fine.
 */
async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(buf: BufferSource): Promise<string> {
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))
  return new Response(stream).text()
}

/**
 * IndexedDB-backed React Query persister for layer data. localStorage is too
 * small (~5MB) for multi-MB FeatureCollections, so we store gzip-compressed
 * bytes in IndexedDB via idb-keyval. Compression/decompression happen inside the
 * async storage layer so they never block React's render thread.
 */
export const layerPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      const buf = await get<BufferSource>(key)
      return buf ? await gunzip(buf) : null
    },
    setItem: async (key, value) => set(key, await gzip(value)),
    removeItem: (key) => del(key),
  },
  // -v2: switched from lz-string (UTF16) to native gzip bytes; old blobs are an
  // incompatible format, so a new key cleanly abandons them.
  key: "weaver-query-cache-v2",
  // Coalesce rapid cache writes (a layer paging in fires many updates).
  throttleTime: 1000,
})
