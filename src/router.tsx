import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"
import { AppShell } from "@/components/app/AppShell"
import { Home } from "@/components/site/Home"
import { About } from "@/components/site/About"
import { Help } from "@/components/site/Help"
import { DataCatalog } from "@/components/site/DataCatalog"
import { validateSearch } from "@/lib/urlState"

/**
 * Catalog search params: free-text query, an optional shareable dataset id,
 * comma-joined facet selections (group / measure / source), and a sort key.
 */
function validateCatalogSearch(raw: Record<string, unknown>): {
  q?: string
  dataset?: string
  groups?: string
  measures?: string
  sources?: string
  sort?: "name" | "source"
} {
  const str = (v: unknown) =>
    typeof v === "string" && v.length > 0 ? v : undefined
  return {
    q: str(raw.q),
    dataset: str(raw.dataset),
    groups: str(raw.groups),
    measures: str(raw.measures),
    sources: str(raw.sources),
    sort: raw.sort === "source" ? "source" : undefined,
  }
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
})

/**
 * Map route — the interactive app. Visible layers, map extent, and selection
 * are encoded in this route's search params so any view is a shareable link.
 */
const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/map",
  component: AppShell,
  validateSearch,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: About,
})

const helpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/help",
  component: Help,
})

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/catalog",
  component: DataCatalog,
  validateSearch: validateCatalogSearch,
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  mapRoute,
  aboutRoute,
  helpRoute,
  catalogRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
