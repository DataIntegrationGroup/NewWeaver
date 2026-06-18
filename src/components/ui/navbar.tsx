import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * NavBar — top navigation chrome for Data Services apps. Router-agnostic: link
 * elements are passed in via `asChild`, so the consuming app supplies its own
 * router's Link (or a plain `<a>`).
 *
 *   <NavBar>
 *     <NavBarBrand asChild><Link to="/">Weaver</Link></NavBarBrand>
 *     <NavBarNav>
 *       <NavBarLink asChild><Link to="/map">Map</Link></NavBarLink>
 *     </NavBarNav>
 *     <NavBarActions><ModeToggle /></NavBarActions>
 *   </NavBar>
 */
function NavBar({
  className,
  children,
  fluid = false,
  ...props
}: React.ComponentProps<"header"> & { fluid?: boolean }) {
  return (
    <header
      data-slot="navbar"
      className={cn("border-b bg-card", className)}
      {...props}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 py-3",
          fluid ? "px-5" : "mx-auto max-w-6xl px-6"
        )}
      >
        {children}
      </div>
    </header>
  )
}

function NavBarBrand({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="navbar-brand"
      className={cn(
        "flex items-baseline gap-2 text-2xl font-bold leading-none text-primary",
        className
      )}
      {...props}
    />
  )
}

function NavBarNav({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="navbar-nav"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

/**
 * A nav link. Use `asChild` to render the app's router Link. Mark the active
 * link by setting `data-active` (e.g. via the router's activeProps) or the
 * `active` prop for non-router use.
 */
function NavBarLink({
  className,
  asChild = false,
  active,
  ...props
}: React.ComponentProps<"a"> & { asChild?: boolean; active?: boolean }) {
  const Comp = asChild ? Slot.Root : "a"
  return (
    <Comp
      data-slot="navbar-link"
      data-active={active || undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[active]:bg-muted data-[active]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function NavBarActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="navbar-actions"
      className={cn("flex items-center gap-3", className)}
      {...props}
    />
  )
}

export { NavBar, NavBarBrand, NavBarNav, NavBarLink, NavBarActions }
