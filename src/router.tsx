import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"
import { AppShell } from "@/components/app/AppShell"
import { validateSearch } from "@/lib/urlState"

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

/**
 * Index route — the map view. Visible layers, map extent, and selection are
 * encoded in this route's search params so any view is a shareable link.
 */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: AppShell,
  validateSearch,
})

const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
