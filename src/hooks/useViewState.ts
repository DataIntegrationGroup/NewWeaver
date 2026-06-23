import { useSearch, useNavigate } from "@tanstack/react-router"

import {
  decodeSelection,
  encodeSelection,
  type Selection,
  type WeaverSearch,
} from "@/lib/urlState"

/**
 * Single source of truth for view state, backed by the URL. Reads the route's
 * search params and exposes typed setters that patch them — so every change
 * (layers, extent, selection, filters) is reflected in a shareable link.
 */
export function useViewState() {
  const search = useSearch({ from: "/map" }) as WeaverSearch
  const navigate = useNavigate({ from: "/map" })

  // Discrete actions push history (so Back restores the prior view); the
  // frequent map-move updates replace it (no history spam).
  const patch = (next: Partial<WeaverSearch>, replace = false) =>
    navigate({
      search: (prev: WeaverSearch) => ({ ...prev, ...next }),
      replace,
    })

  const selection = decodeSelection(search.sel)

  return {
    search,
    selection,
    toggleLayer(id: string) {
      const current = search.layers ?? []
      const layers = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
      patch({ layers })
    },
    /** Enable the given layer ids (union with current visible). */
    enableLayers(ids: string[]) {
      const current = search.layers ?? []
      const layers = [...new Set([...current, ...ids])]
      patch({ layers })
    },
    setView(lng: number, lat: number, z: number) {
      patch({ lng, lat, z }, true)
    },
    select(sel: Selection) {
      patch({ sel: encodeSelection(sel) })
    },
    clearSelection() {
      patch({ sel: undefined })
    },
    setBbox(bbox: boolean) {
      patch({ bbox })
    },
    setQuery(q: string) {
      patch({ q: q || undefined })
    },
  }
}
