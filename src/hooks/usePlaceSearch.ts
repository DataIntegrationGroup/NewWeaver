import { useEffect, useId, useRef, useState } from "react"
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"

import { geocodeAddress, suggestPlaces, type GeocodeResult } from "@/lib/geocode"

const SUGGEST_DEBOUNCE_MS = 250

interface PlaceSearchOptions {
  /** The pinned place's label, e.g. from the URL; the text follows it. */
  label?: string
  /** A place was found (picked or geocoded), or null when cleared or not found. */
  onLocate: (result: GeocodeResult | null) => void
}

/** Place search shared by Home and the map: debounced type-ahead suggestions, full geocode on submit. */
export function usePlaceSearch({ label, onLocate }: PlaceSearchOptions) {
  const listId = useId()
  const [text, setText] = useState(label ?? "")
  // Suggest only for the user's own typing, never for a picked or restored place.
  const [typed, setTyped] = useState(false)
  const [focused, setFocused] = useState(false)

  // A mutation so callbacks fire only for the latest submit, never after reset() or unmount.
  const geocode = useMutation({ mutationFn: (q: string) => geocodeAddress(q) })
  const { reset } = geocode

  // Follow the pinned label; a removed pin clears only text that still shows it.
  const prevLabel = useRef(label)
  useEffect(() => {
    const prev = prevLabel.current
    prevLabel.current = label
    if (label === prev) return
    setTyped(false)
    if (label === undefined) {
      setText((t) => (t === prev ? "" : t))
    } else {
      setText(label)
      reset()
    }
  }, [label, reset])

  const q = useDebounced(text.trim(), SUGGEST_DEBOUNCE_MS)
  const { data: suggestions = [] } = useQuery({
    queryKey: ["place-suggest", q],
    queryFn: ({ signal }) => suggestPlaces(q, signal),
    enabled: typed && focused && q !== "",
    // suggestPlaces turns network failures into [], so never trust a cached list.
    staleTime: 0,
    // Keep the last list up while the next one loads, so it doesn't blink per keystroke.
    placeholderData: keepPreviousData,
    // Type-ahead shouldn't flash the global loading bar.
    meta: { quiet: true },
  })
  const showSuggestions = typed && focused && text.trim() !== "" && suggestions.length > 0

  const pick = (place: GeocodeResult) => {
    reset()
    setText(place.label)
    setTyped(false)
    onLocate(place)
  }

  const search = (query: string) => {
    const q = query.trim()
    if (!q) return
    setText(query)
    setTyped(false)
    geocode.mutate(q, { onSuccess: onLocate })
  }

  const clear = () => {
    reset()
    setText("")
    setTyped(false)
    onLocate(null)
  }

  return {
    text,
    /** Spread onto the search input. */
    inputProps: {
      value: text,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        reset()
        setText(e.target.value)
        setTyped(true)
      },
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      role: "combobox",
      autoComplete: "off",
      "aria-expanded": showSuggestions,
      "aria-controls": listId,
    },
    listId,
    suggestions,
    showSuggestions,
    searching: geocode.isPending,
    notFound: geocode.isSuccess && !geocode.data,
    failed: geocode.isError,
    pick,
    /** Geocode `query`, e.g. a "Try" example. */
    search,
    submit: (e: React.FormEvent) => {
      e.preventDefault()
      search(text)
    },
    clear,
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}
