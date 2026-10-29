import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowRight, MapPin, Layers, Compass, Code2, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageShell } from "@/components/ui/page"
import { SiteHeader, SLACK_URL } from "./SiteHeader"
import { DataSourceCarousel } from "./DataSourceCarousel"
import { DataDashboard } from "./DataDashboard"
import { DataFlowBeam } from "./DataFlowBeam"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

/** Section width and gutter — matches the TopNav so content lines up with it. */
const CONTAINER = "mx-auto w-full max-w-7xl px-[clamp(1.25rem,4.4vw,3.5rem)]"

/** Example searches offered under each hero search tab. */
const TRY_PLACES = ["Socorro", "87801"]
const TRY_DATASETS = ["Arsenic", "Nitrate", "Depth to water"]

// Line-style tabs over the hero photo: white labels with a white underline on
// the selected tab. `dark:` repeats are needed to beat the trigger's own
// dark-mode text colours.
const HERO_TAB =
  "text-white/70 hover:text-white data-active:text-white after:bg-white dark:text-white/70 dark:hover:text-white dark:data-active:text-white"

const HERO_CHIP = "border-white/40 text-white hover:bg-white/10"

function HeroSearch() {
  const navigate = useNavigate()
  const [placeQuery, setPlaceQuery] = useState("")
  const [datasetQuery, setDatasetQuery] = useState("")

  // The place text isn't handed to the map yet — #find opens and focuses the
  // map's own location search. Homepage geocoding (with suggestions) comes later.
  const findPlace = (e: React.FormEvent) => {
    e.preventDefault()
    navigate({ to: "/map", hash: "find" })
  }

  const searchDatasets = (e: React.FormEvent) => {
    e.preventDefault()
    const q = datasetQuery.trim()
    navigate({ to: "/catalog", search: q ? { q } : {} })
  }

  return (
    <Tabs defaultValue="place">
      <TabsList variant="line">
        <TabsTrigger value="place" className={HERO_TAB}>
          <MapPin data-icon="inline-start" /> Find a place
        </TabsTrigger>
        <TabsTrigger value="datasets" className={HERO_TAB}>
          <Search data-icon="inline-start" /> Find a dataset
        </TabsTrigger>
      </TabsList>

      <TabsContent value="place" className="flex flex-col gap-3">
        <form onSubmit={findPlace} className="flex flex-col gap-2 sm:flex-row">
          <InputGroup className="bg-background text-foreground">
            <InputGroupAddon>
              <MapPin />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Address or place"
              placeholder="Address, city, or ZIP"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
            />
          </InputGroup>
          <Button type="submit">
            Search map <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-white/90">
          <span>Try</span>
          {TRY_PLACES.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className={HERO_CHIP}
              render={<button type="button" onClick={() => setPlaceQuery(label)} />}
            >
              {label}
            </Badge>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="datasets" className="flex flex-col gap-3">
        <form onSubmit={searchDatasets} className="flex flex-col gap-2 sm:flex-row">
          <InputGroup className="bg-background text-foreground">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search datasets"
              placeholder="e.g. arsenic, depth to water"
              value={datasetQuery}
              onChange={(e) => setDatasetQuery(e.target.value)}
            />
          </InputGroup>
          <Button type="submit">
            Search datasets <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-white/90">
          <span>Try</span>
          {TRY_DATASETS.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className={HERO_CHIP}
              render={<Link to="/catalog" search={{ q: label.toLowerCase() }} />}
            >
              {label}
            </Badge>
          ))}
          <Link to="/catalog" className="font-medium underline">
            Browse all datasets
          </Link>
        </div>
      </TabsContent>
    </Tabs>
  )
}

function Hero() {
  return (
    <section className="relative" data-testid="home-hero">
      <img
        src="/weaver-home-hero.jpg"
        alt="Aerial view of a New Mexico river winding through autumn cottonwood bosque"
        data-testid="home-hero-image"
        width={2048}
        height={1151}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-r from-brand-deep/95 via-brand-deep/85 to-brand-deep/60 lg:to-transparent" />

      <div className={`relative pt-20 pb-32 ${CONTAINER}`}>
        <div className="flex max-w-xl flex-col gap-6 text-white">
          <div className="flex flex-col gap-3">
            <a
              href="https://newmexicowaterdata.org"
              target="_blank"
              rel="noreferrer"
              className="w-fit text-sm font-medium text-brand-mist hover:underline"
            >
              Part of the New Mexico Water Data Initiative
            </a>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance text-white sm:text-5xl">
              Weaving together{" "}
              <span className="block text-brand-sand">New Mexico water data</span>
            </h1>
          </div>
          <p className="text-lg text-white/90">
            Water levels, water quality, and well records from state, local, and
            federal monitoring networks, searchable in one place.
          </p>
          <HeroSearch />
        </div>
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
    id: "find",
    icon: MapPin,
    title: "Find data near a place",
    body: "Search a place and see what’s monitored nearby.",
    cta: "Search the map",
    to: "/map" as const,
    hash: "find",
  },
  {
    id: "measure",
    icon: Layers,
    title: "Browse by what’s measured",
    body: "Jump straight to groundwater levels or groundwater quality — across every network at once.",
    cta: "Browse datasets",
    to: "/catalog" as const,
  },
  {
    id: "gis",
    icon: Compass,
    title: "Use it in your GIS",
    body: "Connect ArcGIS Pro or QGIS directly to the OGC API Features service.",
    cta: "Connection guide",
    to: "/help" as const,
    hash: "gis",
  },
  {
    id: "api",
    icon: Code2,
    title: "Build with the API",
    body: "Read the same open endpoints Weaver uses, straight from your own tools.",
    cta: "API docs",
    to: "/help" as const,
    hash: "api",
  },
]

const DOORWAY_GROUPS = [
  { title: "Explore", blurb: "Look up water data in the browser.", doorways: DOORWAYS.slice(0, 2) },
  { title: "Integrate", blurb: "Bring Weaver data into your own tools.", doorways: DOORWAYS.slice(2) },
]

function SectionHeading({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground">{blurb}</p>
    </div>
  )
}

function Doorways() {
  return (
    <section
      className={`grid gap-12 pt-14 lg:grid-cols-2 ${CONTAINER}`}
      data-testid="home-doorways"
    >
      {DOORWAY_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-6">
          <SectionHeading title={group.title} blurb={group.blurb} />
          <div className="grid gap-4 sm:grid-cols-2">
            {group.doorways.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <d.icon className="mb-2 size-5 text-primary" />
                  <CardTitle>{d.title}</CardTitle>
                  <CardDescription>{d.body}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Link
                    to={d.to}
                    hash={d.hash}
                    data-testid={`doorway-${d.id}`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    {d.cta} <ArrowRight data-icon="inline-end" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

/**
 * One-line orientation statement (SPEC §T.T7): plain-language scope so a visitor
 * can judge "is my thing in here?" before clicking. Scope copy, not mechanics.
 */
const ORIENTATION =
  "Groundwater levels and groundwater quality — from state, local, and federal monitoring networks across New Mexico."

function DataFlow() {
  return (
    <section className="mt-20 bg-brand-deep text-white">
      <div className={`grid items-center gap-12 py-20 lg:grid-cols-[1fr_2fr] ${CONTAINER}`}>
        <div className="flex max-w-md flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            From the sources <span className="text-brand-sand">to your tools.</span>
          </h2>
          <p className="text-white/90" data-testid="home-orientation">
            {ORIENTATION}
          </p>
        </div>
        <DataFlowBeam />
      </div>
    </section>
  )
}

function Partners() {
  return (
    <section className={`pt-20 ${CONTAINER}`} data-testid="home-data-sources">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <SectionHeading
          title="Our data partners"
          blurb="Monitoring networks that feed Weaver."
        />
        <Link to="/catalog" className={buttonVariants({ variant: "link" })}>
          All sources in Datasets <ArrowRight data-icon="inline-end" />
        </Link>
      </div>
      <DataSourceCarousel />
    </section>
  )
}

function Community() {
  return (
    <section className={`pt-20 pb-16 ${CONTAINER}`}>
      <Card className="items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Join our community
          </h2>
          <p className="text-muted-foreground">
            We are a group of water-data specialists working to improve the flow
            of data from producer to consumer. Help shape the future of
            water-data accessibility in New Mexico.
          </p>
        </div>
        <a
          href={SLACK_URL}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants()}
        >
          Join on Slack
        </a>
      </Card>
    </section>
  )
}

export function Home() {
  useDocumentTitle("Weaver — New Mexico Water Data")
  return (
    <PageShell>
      <SiteHeader />
      <main className="flex-1 overflow-y-auto">
        <Hero />
        <div className={`relative -mt-14 ${CONTAINER}`}>
          <DataDashboard />
        </div>
        <Doorways />
        <DataFlow />
        <Partners />
        <Community />
      </main>
    </PageShell>
  )
}
