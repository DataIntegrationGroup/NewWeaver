import { Link } from "@tanstack/react-router"
import {
  NavBar,
  NavBarBrand,
  NavBarNav,
  NavBarLink,
  NavBarActions,
} from "@/components/ui/navbar"
import { ModeToggle } from "@/components/mode-toggle"

export const SLACK_URL = "https://new-mexico-water-data.slack.com"

const NAV = [
  { to: "/", label: "Home", exact: true },
  { to: "/map", label: "Map", exact: false },
  { to: "/about", label: "About", exact: false },
  { to: "/help", label: "Help", exact: false },
] as const

/** Shared top navigation for the content pages (home, about, help). */
export function SiteHeader() {
  return (
    <NavBar>
      <NavBarBrand asChild>
        <Link to="/">
          Weaver
          <span className="text-sm font-normal text-muted-foreground">
            New Mexico Water Data
          </span>
        </Link>
      </NavBarBrand>
      <NavBarNav>
        {NAV.map((item) => (
          <NavBarLink key={item.to} asChild>
            <Link
              to={item.to}
              activeProps={{ "data-active": "true" }}
              activeOptions={{ exact: item.exact }}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              {item.label}
            </Link>
          </NavBarLink>
        ))}
        <NavBarActions>
          <ModeToggle />
        </NavBarActions>
      </NavBarNav>
    </NavBar>
  )
}
