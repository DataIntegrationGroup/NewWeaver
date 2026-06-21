import { Link } from "@tanstack/react-router"
import { ArrowRight, Map as MapIcon, Database, Activity } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SLACK_URL } from "./SiteHeader"
import { SitePage as Page } from "./SitePage"
import { DataSourceCarousel } from "./DataSourceCarousel"
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

const FEATURES = [
  {
    icon: MapIcon,
    title: "Interactive map",
    body: "Browse monitoring locations and integrated water-data layers across New Mexico. Toggle layers, inspect features, and share the exact view via URL.",
  },
  {
    icon: Activity,
    title: "Time series",
    body: "Click a monitoring point to list its datastreams and plot observations over time, served from the FROST SensorThings API.",
  },
  {
    icon: Database,
    title: "Standards-based",
    body: "Everything is read through open interfaces — OGC API Features, OGC SensorThings, ArcGIS REST, and the USGS Water Data for the Nation API — so the data is interoperable, not bespoke.",
  },
]

export function Home() {
  return (
    <Page>
      <Hero />
      <Separator className="my-10" />
      <section className="grid gap-6 md:grid-cols-3" data-testid="home-cards">
        {FEATURES.map((f) => (
          <Card key={f.title} className="h-full">
            <CardHeader>
              <f.icon className="size-6 text-primary" />
              <CardTitle className="!text-xl">{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {f.body}
            </CardContent>
          </Card>
        ))}
      </section>

      <Separator className="my-10" />

      <section data-testid="home-data-sources">
        <div className="mb-5 text-center">
          <h2 className="!text-3xl text-secondary">Our data partners</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Weaver weaves together public water data from agencies across New
            Mexico and beyond, read live through open, standards-based services.
            Explore each partner in the New Mexico Water Data catalog.
          </p>
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
