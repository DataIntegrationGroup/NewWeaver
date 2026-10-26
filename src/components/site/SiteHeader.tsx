import { Link, useLocation } from "@tanstack/react-router"
import { TopNav } from "@/components/top-nav"
import { ModeToggle } from "@/components/mode-toggle"

export const SLACK_URL = "https://new-mexico-water-data.slack.com"

const NAV = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/planning", label: "Planning" },
  { href: "/catalog", label: "Catalog" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
]

const TEST_IDS: Record<string, string> = Object.fromEntries(
  NAV.map((item) => [item.href, `nav-${item.label.toLowerCase()}`])
)

const BRAND = (
  <span className="flex items-baseline gap-2">
    Weaver
    <span className="text-sm font-normal text-muted-foreground">
      New Mexico Water Data
    </span>
  </span>
)

/** Shared top navigation for the content pages, the map and planning. */
export function SiteHeader() {
  const { pathname } = useLocation()
  return (
    <TopNav
      brand={BRAND}
      links={NAV}
      pathname={pathname}
      // TopNav marks the current link itself (prefix match, so /catalog/x
      // still marks Catalog); `exact` stops the router from also marking "/"
      // current on every page. Spread rather than pass `children`: the desktop
      // links leave it unset so NavigationMenuLink can supply the label, and
      // an explicit undefined would win the prop merge and blank it.
      renderLink={({ href, ...props }) => (
        <Link
          to={href}
          activeOptions={{ exact: true }}
          data-testid={props.children === BRAND ? undefined : TEST_IDS[href]}
          {...props}
        />
      )}
      actions={<ModeToggle />}
    />
  )
}
