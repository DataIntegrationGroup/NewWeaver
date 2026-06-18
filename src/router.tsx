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
import { validateSearch } from "@/lib/urlState"

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

const routeTree = rootRoute.addChildren([
  homeRoute,
  mapRoute,
  aboutRoute,
  helpRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
