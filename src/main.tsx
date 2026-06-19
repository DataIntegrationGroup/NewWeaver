import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"

import "./index.css"
import { POSTHOG_KEY, POSTHOG_HOST } from "./config"
import { ThemeProvider } from "./components/theme-provider"
import { TooltipProvider } from "./components/ui/tooltip"
import { Toaster } from "./components/ui/sonner"
import { queryClient } from "./lib/queryClient"
import { router } from "./router"

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
    <ThemeProvider defaultTheme="system" storageKey="weaver-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster richColors closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
)

createRoot(document.getElementById("root")!).render(
  POSTHOG_KEY ? <PostHogProvider client={posthog}>{app}</PostHogProvider> : app
)
