import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { setWorkerUrl } from "maplibre-gl"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import { useIsFetching } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { RouterProvider } from "@tanstack/react-router"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"
import { ThemeProvider } from "next-themes"

import "./index.css"
import { POSTHOG_KEY, POSTHOG_HOST } from "./config"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { TooltipProvider } from "./components/ui/tooltip"
import { Toaster } from "./components/ui/sonner"
import { TopLoadingBar } from "./components/top-loading-bar"
import { queryClient } from "./lib/queryClient"
import { layerPersister } from "./lib/persister"
import { CATALOG_VERSION, PERSISTED_INTEGRATED_COLLECTIONS } from "./catalog/layers"
import { router } from "./router"

// Wire the generic (design-system) loading bar to this app's query activity.
function GlobalLoadingBar() {
  return <TopLoadingBar active={useIsFetching() > 0} />
}

// MapLibre v6 resolves its worker relative to its own module, which breaks
// under Vite's dep pre-bundling; hand it a Vite-built worker URL instead, once,
// before the first map renders.
setWorkerUrl(maplibreWorkerUrl)

// Init only when a key is configured, so dev builds and CI emit nothing by
// default. capture_pageview "history_change" fires $pageview on TanStack
// Router navigations (SPA history pushes).
if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: POSTHOG_HOST || "https://us.posthog.com",
    capture_pageview: "history_change",
    capture_exceptions: true,
    defaults: "2025-05-24",
  })
}

const app = (
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="weaver-theme">
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: layerPersister,
            maxAge: 24 * 60 * 60 * 1000,
            buster: CATALOG_VERSION,
            dehydrateOptions: {
              // Persist only the Integrated data products layer queries (now
              // OGC API Features). The features query key is
              // ["features", baseUrl, collectionId, …].
              shouldDehydrateQuery: (q) => {
                const key = q.queryKey
                return (
                  key[0] === "features" &&
                  typeof key[2] === "string" &&
                  PERSISTED_INTEGRATED_COLLECTIONS.has(key[2])
                )
              },
            },
          }}
        >
          <TooltipProvider>
            <GlobalLoadingBar />
            <RouterProvider router={router} />
            <Toaster richColors closeButton />
          </TooltipProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
)

createRoot(document.getElementById("root")!).render(
  POSTHOG_KEY ? <PostHogProvider client={posthog}>{app}</PostHogProvider> : app
)
