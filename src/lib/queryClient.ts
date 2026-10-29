import { QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

/** Human label for a failed query, derived from its key (source + collection). */
function queryLabel(key: readonly unknown[]): string {
  const [kind, , collection] = key as [string, unknown, unknown]
  if (typeof collection === "string") return collection
  return typeof kind === "string" ? kind : "data"
}

export const queryClient = new QueryClient({
  // Surface data-fetch failures (after retries are exhausted) as a toast with a
  // one-click retry, instead of silently leaving a layer blank.
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Dashboard counts are optional; their tiles just show "—".
      if (query.queryKey[0] === "die-stats") return
      toast.error(`Couldn't load ${queryLabel(query.queryKey)}`, {
        description: error instanceof Error ? error.message : undefined,
        action: { label: "Retry", onClick: () => query.fetch() },
      })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // Must be ≥ the persist maxAge (24h) so a cached layer query isn't
      // garbage-collected before it can be restored from IndexedDB.
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
