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
  const search = useSearch({ from: "/" }) as WeaverSearch
  const navigate = useNavigate({ from: "/" })

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
      const layers = search.layers.includes(id)
        ? search.layers.filter((x) => x !== id)
        : [...search.layers, id]
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
