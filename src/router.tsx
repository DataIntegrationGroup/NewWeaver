import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"
import { AppShell } from "@/components/app/AppShell"

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

/**
 * Index route — the map view. Map/layer/selection state will be encoded in
 * this route's search params (Phase 3) so any view is a shareable link.
 */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: AppShell,
})

const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
