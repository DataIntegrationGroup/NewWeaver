import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { useIsFetching } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { RouterProvider } from "@tanstack/react-router"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"

import "./index.css"
import { POSTHOG_KEY, POSTHOG_HOST } from "./config"
import { ThemeProvider } from "./components/theme-provider"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { TooltipProvider } from "./components/ui/tooltip"
import { Toaster } from "./components/ui/sonner"
import { TopLoadingBar } from "./components/top-loading-bar"
import { queryClient } from "./lib/queryClient"
import { layerPersister } from "./lib/persister"
import { CATALOG_VERSION, PERSISTED_WFS_TYPENAMES } from "./catalog/layers"
import { router } from "./router"

// Wire the generic (design-system) loading bar to this app's query activity.
function GlobalLoadingBar() {
  return <TopLoadingBar active={useIsFetching() > 0} />
}

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
      <ThemeProvider defaultTheme="system" storageKey="weaver-theme">
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: layerPersister,
            maxAge: 24 * 60 * 60 * 1000,
            buster: CATALOG_VERSION,
            dehydrateOptions: {
              // Persist only the Integrated data products (WFS) layer queries.
              shouldDehydrateQuery: (q) => {
                const key = q.queryKey
                return (
                  key[0] === "wfs" &&
                  typeof key[2] === "string" &&
                  PERSISTED_WFS_TYPENAMES.has(key[2])
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
