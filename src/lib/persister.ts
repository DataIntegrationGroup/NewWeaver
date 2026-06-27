import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { get, set, del } from "idb-keyval"
import { compressToUTF16, decompressFromUTF16 } from "lz-string"

/**
 * IndexedDB-backed React Query persister for layer data. localStorage is too
 * small (~5MB) for multi-MB FeatureCollections, so we store in IndexedDB via
 * idb-keyval and LZ-compress the serialized cache to keep the footprint down.
 */
export const layerPersister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: "weaver-query-cache",
  // Coalesce rapid cache writes (a layer paging in fires many updates).
  throttleTime: 1000,
  serialize: (data) => compressToUTF16(JSON.stringify(data)),
  deserialize: (str) => JSON.parse(decompressFromUTF16(str)),
})
