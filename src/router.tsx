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
import { DEFAULT_DATASET_ID } from "@/catalog/mapDatasets"
import { encodeSelection, validateSearch } from "@/lib/urlState"

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

// Legacy Weaver URLs: history-replacing redirects to the closest page here.

/** Old pages with no counterpart here. */
const LEGACY_HOME_PATHS = [
  "/st",
  "/hv",
  "/die",
  "/surfacewater",
  "/pvacd",
  "/collabnet",
  "/pws",
  "/site_cross_ref",
] as const

const legacyHomeRoutes = LEGACY_HOME_PATHS.map((path) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    beforeLoad: () => {
      throw redirect({ to: "/", replace: true })
    },
  })
)

const legacyDocsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs",
  beforeLoad: () => {
    throw redirect({ to: "/help", replace: true })
  },
})

/** Old groundwater dashboard → the map. */
const legacyGroundwaterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groundwater",
  beforeLoad: () => {
    throw redirect({ to: "/map", replace: true })
  },
})

/** Legacy point IDs are bare NMBGMR PointIDs; DIE keys sites `NMBGMR:<id>`. */
const LEGACY_SOURCE = "NMBGMR"

/** Old site page → that site selected and filtered on the map. */
const legacyLocationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/location/$pointId",
  beforeLoad: ({ params }) => {
    const raw = params.pointId.trim()
    if (!raw) throw redirect({ to: "/map", replace: true })
    const featureId = raw.includes(":") ? raw : `${LEGACY_SOURCE}:${raw}`
    const bareId = featureId.slice(featureId.indexOf(":") + 1)
    throw redirect({
      to: "/map",
      search: {
        ds: DEFAULT_DATASET_ID,
        sel: encodeSelection({ layerId: DEFAULT_DATASET_ID, featureId }),
        q: bareId,
      },
      replace: true,
    })
  },
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  mapRoute,
  aboutRoute,
  helpRoute,
  datasetsRoute,
  catalogRoute,
  ...legacyHomeRoutes,
  legacyDocsRoute,
  legacyGroundwaterRoute,
  legacyLocationRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
