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
      toast.error(`Couldn't load ${queryLabel(query.queryKey)}`, {
        description: error instanceof Error ? error.message : undefined,
        action: { label: "Retry", onClick: () => query.fetch() },
      })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
