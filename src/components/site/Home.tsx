import { Link } from "@tanstack/react-router"
import { ArrowRight, MapPin, Layers, Compass, Code2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SLACK_URL } from "./SiteHeader"
import { SitePage as Page } from "./SitePage"
import { DataSourceCarousel } from "./DataSourceCarousel"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import nmwdiIcon from "@/assets/nmwdi-icon.png"

function Hero() {
  return (
    <section
      className="grid items-center gap-8 md:grid-cols-2 md:gap-12"
      data-testid="home-hero"
    >
      <div className="text-left">
        <img
          src={nmwdiIcon}
          alt=""
          aria-hidden
          className="mb-4 h-20 w-auto"
        />
        <h1 className="!text-6xl !leading-none font-bold text-primary">
          Weaver
        </h1>
        <p className="mt-3 text-3xl font-bold tracking-tight text-secondary">
          Explore • Connect • Interact
        </p>
        <p className="mt-3 text-2xl font-semibold leading-tight text-secondary">
          Weaving Together New Mexico Water Data
        </p>
        <p className="mt-4 max-w-md text-muted-foreground">
          The New Mexico Water Data Initiative (NMWDI) is a collaborative effort
          to improve the availability and accessibility of water data in New
          Mexico. Weaver displays public, integrated water data on an
          interactive map.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/map">
              Explore the map <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/about">About Weaver</Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl md:[clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)]">
        <img
          src="/weaver-home-hero.jpg"
          alt="Aerial view of a New Mexico river winding through autumn cottonwood bosque"
          data-testid="home-hero-image"
          loading="lazy"
          width={2048}
          height={1151}
          className="h-64 w-full object-cover md:h-[28rem]"
        />
      </div>
    </section>
  )
}

/**
 * Question-based doorways (SPEC §T.T6): each maps to a persona's question and
 * is a real route, not decoration. "Standards-based" is deliberately absent as
 * a primary doorway — it's a feature only a developer values (§V.V2).
 */
const DOORWAYS = [
  {
    icon: MapPin,
    title: "Find data near a place",
    body: "Search an address and see what’s monitored nearby — or whether anything is.",
    to: "/map" as const,
    hash: "find",
  },
  {
    icon: Layers,
    title: "Browse by what’s measured",
    body: "Jump straight to water levels, water quality, or surface water — across every network at once.",
    to: "/map" as const,
    hash: "measure",
  },
  {
    icon: Compass,
    title: "Use it in your GIS",
    body: "Connect ArcGIS Pro or QGIS directly to the OGC API Features service.",
    to: "/help" as const,
    hash: "gis",
  },
  {
    icon: Code2,
    title: "Build with the API",
    body: "Read the same open endpoints Weaver uses, straight from your own tools.",
    to: "/help" as const,
    hash: "api",
  },
]

/**
 * One-line orientation statement (SPEC §T.T7): plain-language scope so a visitor
 * can judge "is my thing in here?" before clicking. Scope copy, not mechanics.
 */
const ORIENTATION =
  "Weaver brings together groundwater levels, water quality, springs, and surface water from state, local, and federal monitoring networks across New Mexico."

export function Home() {
  useDocumentTitle("Weaver — New Mexico Water Data")
  return (
    <Page>
      <Hero />
      <Separator className="my-10" />
      <p
        className="mx-auto max-w-3xl text-center text-lg text-muted-foreground"
        data-testid="home-orientation"
      >
        {ORIENTATION}
      </p>
      <section
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="home-doorways"
      >
        {DOORWAYS.map((d) => (
          <Link
            key={d.title}
            to={d.to}
            hash={d.hash}
            data-testid={`doorway-${d.hash}`}
            className="group block h-full rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-accent"
          >
            <d.icon className="size-6 text-primary" />
            <h3 className="mt-3 flex items-center gap-1 text-lg font-semibold">
              {d.title}
              <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{d.body}</p>
          </Link>
        ))}
      </section>

      <Separator className="my-10" />

      <section data-testid="home-data-sources">
        <div className="mb-5 text-center">
          <h2 className="!text-3xl text-secondary">Our data partners</h2>
        </div>
        <DataSourceCarousel />
      </section>

      <Separator className="my-10" />

      <section className="text-center">
        <h2 className="!text-3xl text-secondary">Join our community</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          We are a group of water-data specialists working to improve the flow of
          data from producer to consumer. Help shape the future of water-data
          accessibility in New Mexico.
        </p>
        <Button
          className="mt-5"
          onClick={() => window.open(SLACK_URL, "_blank")}
        >
          Join on Slack
        </Button>
      </section>
    </Page>
  )
}
