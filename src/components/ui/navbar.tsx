import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"

/**
 * NavBar — top navigation chrome for Data Services apps. Router-agnostic: link
 * elements are passed in via `render`, so the consuming app supplies its own
 * router's Link (or a plain `<a>`).
 *
 *   <NavBar>
 *     <NavBarBrand render={<Link to="/" />}>Weaver</NavBarBrand>
 *     <NavBarNav>
 *       <NavBarLink render={<Link to="/map" />}>Map</NavBarLink>
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
          "flex items-center justify-between gap-2 py-3 sm:gap-4",
          fluid ? "px-3 sm:px-5" : "mx-auto max-w-6xl px-4 sm:px-6"
        )}
      >
        {children}
      </div>
    </header>
  )
}

function NavBarBrand({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex items-baseline gap-2 text-2xl font-bold leading-none text-primary",
          className
        ),
      },
      props
    ),
    render,
    state: { slot: "navbar-brand" },
  })
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
 * A nav link. Use `render` to render the app's router Link. Mark the active
 * link by setting `data-active` (e.g. via the router's activeProps) or the
 * `active` prop for non-router use.
 */
function NavBarLink({
  className,
  render,
  active,
  ...props
}: useRender.ComponentProps<"a"> & { active?: boolean }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[active]:bg-muted data-[active]:text-foreground",
          className
        ),
      },
      props
    ),
    render,
    state: { slot: "navbar-link", active: active || undefined },
  })
}

function NavBarActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="navbar-actions"
      className={cn("flex items-center gap-1.5 sm:gap-3", className)}
      {...props}
    />
  )
}

export { NavBar, NavBarBrand, NavBarNav, NavBarLink, NavBarActions }
