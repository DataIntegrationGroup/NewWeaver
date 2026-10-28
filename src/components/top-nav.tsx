"use client"

import * as React from "react"
import { MenuIcon } from "lucide-react"
import { cn } from "cn"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export type TopNavLink = { label: string; href: string }

type LinkProps = {
  href: string
  className?: string
  "aria-current"?: "page"
  onClick?: () => void
  children?: React.ReactNode
}

const defaultLink = (props: LinkProps) => <a {...props} />

/** The most specific link that contains the pathname, so /datasets/42 still
 *  marks "Datasets" current. Matches AppShell. */
function currentHref(pathname: string | undefined, links: TopNavLink[]) {
  if (!pathname) return undefined
  return links
    .map((link) => link.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
}

const BRAND_CLASS = "font-heading text-2xl leading-none font-bold text-primary"

/**
 * TopNav block — the navigation bar for content sites (for tool-style apps,
 * use AppShell). The brand sits on the left and the links on the right, in a
 * NavigationMenu; below the md breakpoint they move into a Sheet that opens
 * from the right. The link containing `pathname` is marked current. Pass your
 * router's Link through `renderLink`; `actions`, such as a mode toggle, go
 * after the links.
 *
 *   <TopNav
 *     brand="Weaver"
 *     links={[{ label: "Datasets", href: "/datasets" }]}
 *     pathname={location.pathname}
 *     renderLink={({ href, ...props }) => <Link to={href} {...props} />}
 *   />
 */
export function TopNav({
  brand,
  brandHref = "/",
  links,
  pathname,
  renderLink = defaultLink,
  actions,
  className,
}: {
  brand: React.ReactNode
  brandHref?: string
  links: TopNavLink[]
  pathname?: string
  renderLink?: (props: LinkProps) => React.ReactElement
  actions?: React.ReactNode
  className?: string
}) {
  const active = currentHref(pathname, links)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={cn("border-b bg-card", className)}>
      {/* max-w-7xl with a gutter that grows with the window. */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-[clamp(1.25rem,4.4vw,3.5rem)] py-3">
        {renderLink({ href: brandHref, className: BRAND_CLASS, children: brand })}
        <div className="flex items-center gap-1 sm:gap-3">
          <NavigationMenu aria-label="Main" className="hidden md:flex">
            <NavigationMenuList className="gap-1">
              {links.map((link) => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink
                    active={link.href === active}
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "text-base text-muted-foreground hover:text-foreground data-active:bg-muted data-active:text-foreground"
                    )}
                    render={renderLink({ href: link.href })}
                  >
                    {link.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          {actions && <div className="flex items-center gap-1.5 sm:gap-3">{actions}</div>}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="-mr-2 md:hidden" aria-label="Open menu" />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
                {renderLink({
                  href: brandHref,
                  className: BRAND_CLASS,
                  onClick: closeMenu,
                  children: brand,
                })}
              </SheetHeader>
              <nav aria-label="Main" className="flex flex-col gap-1 px-4">
                {links.map((link) => (
                  <React.Fragment key={link.href}>
                    {renderLink({
                      href: link.href,
                      className: cn(
                        buttonVariants({ variant: "ghost" }),
                        "justify-start text-base aria-[current=page]:bg-muted"
                      ),
                      "aria-current": link.href === active ? "page" : undefined,
                      onClick: closeMenu,
                      children: link.label,
                    })}
                  </React.Fragment>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
