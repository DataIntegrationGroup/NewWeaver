import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router"
import { AppShell } from "@/components/app/AppShell"
import { Home } from "@/components/site/Home"
import { About } from "@/components/site/About"
import { Help } from "@/components/site/Help"
import { DatasetsPage } from "@/components/site/datasets/DatasetsPage"
import { validateSearch } from "@/lib/urlState"

/**
 * Datasets search params: free-text query, the selected (shareable) dataset id,
 * comma-joined source selections, and a sort key. Every key is optional so the page's default
 * view has a clean URL.
 */
export interface DatasetsSearch {
  q?: string
  dataset?: string
  sources?: string
  sort?: "name"
}

function validateDatasetsSearch(raw: Record<string, unknown>): DatasetsSearch {
  const str = (v: unknown) =>
    typeof v === "string" && v.length > 0 ? v : undefined
  return {
    q: str(raw.q),
    dataset: str(raw.dataset),
    sources: str(raw.sources),
    sort: raw.sort === "name" ? "name" : undefined,
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

const datasetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/datasets",
  component: DatasetsPage,
  validateSearch: validateDatasetsSearch,
})

/** The page was called Catalog; keep old links (and their ?q=) working. */
const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/catalog",
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/datasets", search: validateDatasetsSearch(search) })
  },
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  mapRoute,
  aboutRoute,
  helpRoute,
  datasetsRoute,
  catalogRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
