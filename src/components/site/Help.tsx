import { useEffect, useState } from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageDescription, PageHeader, PageTitle } from "@/components/ui/page"
import { cn } from "@/lib/utils"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { DIE_REPO_URL, WEAVER_API_URL } from "@/config"
import { SitePage } from "./SitePage"

const API_URL = WEAVER_API_URL.replace(/\/+$/, "")
const API_COLLECTIONS_URL = `${API_URL}/collections`

/** External link styled for the docs body. */
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="link break-all"
    >
      {children}
    </a>
  )
}

/** One example API request: what it does and its linked URL. */
function Example({ label, path }: { label: string; path: string }) {
  const url = `${API_URL}${path}`
  return (
    <li className="space-y-1">
      <p>{label}</p>
      <code className="block rounded-md bg-muted px-3 py-2 text-sm">
        <A href={url}>{path}</A>
      </code>
    </li>
  )
}

/** Agencies whose records feed the integrated datasets. */
const AGENCIES = [
  "NM Bureau of Geology and Mineral Resources (NMBGMR)",
  "U.S. Geological Survey (USGS)",
  "Water Quality Portal",
  "NM Environment Department, Drinking Water Bureau",
  "NM Office of the State Engineer",
  "NM Interstate Stream Commission",
  "U.S. Bureau of Reclamation",
  "City of Albuquerque",
  "Bernalillo County",
  "City of Roswell",
  "Elephant Butte Irrigation District",
  "Pecos Valley Artesian Conservancy District",
]

const GIS_DOCS = {
  arcgis:
    "https://pro.arcgis.com/en/pro-app/latest/help/data/services/use-ogc-api-services.htm",
  qgis: "https://docs.qgis.org/latest/en/docs/user_manual/working_with_ogc/ogc_client_support.html",
}

/** Starter collections for a GIS connection, linked to their Datasets entry. */
const COMMON_COLLECTIONS = [
  { id: "nm_waterlevels_summary", title: "NM Unified Water Levels Summary" },
  { id: "nm_tds_summary", title: "NM TDS Summary" },
  { id: "nm_arsenic_summary", title: "NM Arsenic Summary" },
]

/** Copyable URL pill — click to copy the API URL to the clipboard. */
function CopyUrl({ value, label, testId }: { value: string; label: string; testId: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — the URL is still selectable above
    }
  }
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm">
        {value}
      </code>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={label}
        data-testid={testId}
        onClick={copy}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}

/** A numbered set of steps for connecting one desktop GIS application. */
function ConnectCard({
  title,
  steps,
  note,
  href,
}: {
  title: string
  steps: string[]
  note?: string
  href: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {note ? <p className="text-muted-foreground">{note}</p> : null}
        <a href={href} target="_blank" rel="noreferrer" className="link">
          Official documentation
        </a>
      </CardContent>
    </Card>
  )
}

const SECTIONS = [
  { id: "using", label: "Using the map" },
  { id: "sources", label: "Data sources" },
  { id: "api", label: "Weaver API" },
  { id: "gis", label: "Desktop GIS" },
  { id: "glossary", label: "Glossary" },
  { id: "faq", label: "FAQ" },
  { id: "disclaimer", label: "Disclaimer" },
] as const

/** Glossary entries — plain-language definitions of terms used across Weaver. */
const GLOSSARY: { term: string; def: React.ReactNode }[] = [
  {
    term: "Source",
    def: "The agency that collected a site’s data. Its site ID is that agency’s own.",
  },
  {
    term: "Summary and time series",
    def: "A summary is one row per site (latest value, count, range, dates); a time series is one row per reading or sample.",
  },
  {
    term: "Approval status",
    def: "Whether the agency has reviewed a reading, such as provisional or approved.",
  },
  {
    term: "Major ions",
    def: "The constituents that make up most dissolved minerals: calcium, magnesium, sodium, potassium, bicarbonate, carbonate, sulfate and chloride.",
  },
  {
    term: "Depth to water (DTW / BGS)",
    def: "How far below the ground surface the water table sits, in feet. Larger numbers mean a deeper water level. “BGS” = below ground surface.",
  },
  {
    term: "Hydrograph",
    def: "A plot of one well’s depth-to-water over time. Because depth increases downward, the y-axis is inverted — a line trending up on the page means the water level is rising.",
  },
  {
    term: "Groundwater trend",
    def: "The long-term direction of a well’s depth-to-water from a linear fit over its record. Because the measure is depth, “deepening” means the level is falling and “rising” means it is recovering.",
  },
  {
    term: "Monitoring recency",
    def: "Whether a well has a recent reading. “Active” wells have current data; “stale” wells have not reported lately.",
  },
  {
    term: "MCL exceedance",
    def: "A sample where an analyte is above its drinking-water Maximum Contaminant Level — a regulatory quality threshold.",
  },
  {
    term: "Points of Diversion (POD)",
    def: "Locations, published by the Office of the State Engineer, where water is legally authorized to be diverted or pumped.",
  },
  {
    term: "Region of interest",
    def: "A county, public water system, or hydrologic basin you pick to restrict the data to that area — an alternative to drawing a shape by hand.",
  },
]

/** A question / answer pair in the FAQ. */
function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold">{q}</h3>
      <div className="text-muted-foreground">{children}</div>
    </div>
  )
}

/** Sticky outline of the page's sections, with the in-view section highlighted. */
function DocsSidebar({ active }: { active: string }) {
  return (
    <nav
      aria-label="Documentation outline"
      className="sticky top-6 hidden w-48 shrink-0 self-start md:block"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1 border-l">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className={cn(
                "-ml-px block border-l-2 py-1 pl-3 text-sm transition-colors",
                active === s.id
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Help() {
  // Allow deep-linking a section via the URL hash (e.g. /help#gis from the
  // export dialog's Desktop GIS banner).
  useDocumentTitle("Weaver — Help")
  const { hash } = useLocation()
  const [active, setActive] = useState<string>(SECTIONS[0].id)

  // Scroll the hash target into view on mount / hash change.
  useEffect(() => {
    const id = hash.replace(/^#/, "")
    if (!SECTIONS.some((s) => s.id === id)) return
    document.getElementById(id)?.scrollIntoView({ block: "start" })
    setActive(id)
  }, [hash])

  // Scrollspy: highlight the last section whose heading has scrolled past the
  // top of the viewport. A scroll-position read (rather than an Intersection
  // Observer band) reliably selects the final section once the page bottoms out.
  useEffect(() => {
    const scroller = document.getElementById(SECTIONS[0].id)?.closest("main")
    if (!scroller) return
    const onScroll = () => {
      // A short final section can't scroll its heading to the top, so pin the
      // last entry once we've reached the bottom of the scroll region.
      if (
        scroller.scrollTop + scroller.clientHeight >=
        scroller.scrollHeight - 2
      ) {
        setActive(SECTIONS[SECTIONS.length - 1].id)
        return
      }
      const cutoff = scroller.getBoundingClientRect().top + 120
      let current: string = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= cutoff) current = s.id
      }
      setActive(current)
    }
    onScroll()
    // Re-read after layout settles so a hash-driven initial scroll is reflected.
    const raf = requestAnimationFrame(onScroll)
    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      scroller.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <SitePage
      header={
        <PageHeader>
          <PageTitle>Documentation &amp; Help</PageTitle>
          <PageDescription>
            Using the map, where the data comes from, the Weaver API, and the
            terms of use.
          </PageDescription>
        </PageHeader>
      }
    >
      <div data-testid="help-page">
        <div className="flex gap-10">
          <DocsSidebar active={active} />

          <div className="min-w-0 flex-1 space-y-12">
            <section id="using" className="scroll-mt-6 space-y-4">
              <h2>Using the map</h2>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Dataset.</strong> Pick one from the top of the
                  sidebar: water levels, major ions, or trace constituents such
                  as arsenic and nitrate.
                </li>
                <li>
                  <strong>Color by.</strong> The legend colors sites by one
                  property and counts the sites in each bin.
                </li>
                <li>
                  <strong>Filter.</strong> Tick bins under any property to keep
                  only matching sites. Active filters show as chips over the
                  map; remove a chip to clear it.
                </li>
                <li>
                  <strong>Find a place.</strong> Search an address or place to
                  move the map there.
                </li>
                <li>
                  <strong>Region.</strong> Pick a county, water system or
                  groundwater basin to keep only the sites inside it, or draw
                  your own shape on the map.
                </li>
                <li>
                  <strong>Site details.</strong> Selecting a site shows its
                  chart, summary, and every reading or sample behind it.
                </li>
                <li>
                  <strong>Share.</strong> The URL saves your whole view;{" "}
                  <strong>Share</strong> copies it.
                </li>
              </ul>
            </section>

            <section id="sources" className="scroll-mt-6 space-y-4">
              <h2>Data sources</h2>
              <p className="text-muted-foreground">
                Every value comes from one of these agencies. A site’s{" "}
                <strong>source</strong> is the agency that collected it, and its
                ID is that agency’s own. The agency’s record is authoritative.
              </p>
              <ul className="grid list-disc gap-x-6 gap-y-1 pl-6 text-muted-foreground sm:grid-cols-2">
                {AGENCIES.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section id="api" className="scroll-mt-6 space-y-4">
              <h2>The Weaver API</h2>
              <p className="text-muted-foreground">
                The Weaver API is a public{" "}
                <strong>OGC API – Features</strong> service and the only one the
                map reads. No key is needed.
              </p>
              <CopyUrl value={API_URL} label="Copy Weaver API URL" testId="copy-api-url" />

              <div className="space-y-2">
                <h3>
                  How the data is integrated
                </h3>
                <p className="text-muted-foreground">
                  On a monthly schedule, the Data Integration Engine:
                </p>
                <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                  <li>
                    <strong>Gathers</strong> sites, water levels and
                    water-quality results from each agency.
                  </li>
                  <li>
                    <strong>Harmonizes</strong> names and units into a common
                    shape, keeping each agency’s originals.
                  </li>
                  <li>
                    <strong>Publishes</strong> the results to the Weaver API.
                  </li>
                </ol>
                <p className="text-muted-foreground">
                  The code is <A href={DIE_REPO_URL}>open source</A>, and we
                  welcome feedback.
                </p>
              </div>

              <div className="space-y-2">
                <h3>
                  What it serves
                </h3>
                <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>
                    <code>nm_&lt;analyte&gt;_summary</code>: one row per site.
                  </li>
                  <li>
                    <code>nm_&lt;analyte&gt;_timeseries</code>: one row per
                    reading or sample.
                  </li>
                  <li>
                    Derived products such as major chemistry, hardness, trends
                    and MCL exceedances.
                  </li>
                </ul>
                <p className="text-muted-foreground">
                  See the <A href={API_COLLECTIONS_URL}>collections list</A>.
                </p>
              </div>

              <div className="space-y-2">
                <h3>
                  Getting the data
                </h3>
                <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>
                    <strong>Download data</strong> on the map saves the
                    filtered sites as GeoJSON or CSV.
                  </li>
                  <li>
                    A well’s <strong>Readings</strong> tab downloads its
                    readings as CSV.
                  </li>
                  <li>
                    For anything larger, query the API or{" "}
                    <a href="#gis" className="link">
                      connect a desktop GIS
                    </a>
                    .
                  </li>
                </ul>
                <ul className="space-y-3 pt-1 text-muted-foreground">
                  <Example
                    label="Arsenic summaries as GeoJSON:"
                    path="/collections/nm_arsenic_summary/items?f=json&limit=100"
                  />
                  <Example
                    label="TDS summaries in a bounding box, as CSV:"
                    path="/collections/nm_tds_summary/items?f=csv&bbox=-107,34.9,-106.4,35.3"
                  />
                  <Example
                    label="One site’s water levels, by source and ID:"
                    path="/collections/nm_waterlevels_timeseries/items?f=csv&source=ST2/BernCo&id=10000&limit=10000"
                  />
                </ul>
              </div>
            </section>

            <section
              id="gis"
              data-testid="help-gis"
              className="scroll-mt-6 space-y-4"
            >
              <h2>
                Connect a desktop GIS
              </h2>
              <p className="text-muted-foreground">
                Add the Weaver API to <strong>ArcGIS Pro</strong> or{" "}
                <strong>QGIS</strong> as a read-only OGC API connection. Use
                the landing page URL, not a collection’s items URL.
              </p>
              <CopyUrl
                value={API_URL}
                label="Copy Weaver API landing page URL"
                testId="copy-gis-url"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <ConnectCard
                  title="ArcGIS Pro"
                  steps={[
                    "In the Catalog pane, create a new OGC API Server connection.",
                    "Paste the URL above.",
                    "Expand the connection and add a collection to the map.",
                  ]}
                  href={GIS_DOCS.arcgis}
                />
                <ConnectCard
                  title="QGIS"
                  steps={[
                    "Open the Data Source Manager, WFS / OGC API – Features tab.",
                    "Create a connection with the URL above.",
                    "Connect and add one or more collections.",
                  ]}
                  href={GIS_DOCS.qgis}
                />
              </div>

              <div className="space-y-2">
                <h3>
                  Good collections to start with
                </h3>
                <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                  {COMMON_COLLECTIONS.map((c) => (
                    <li key={c.id}>
                      <Link to="/datasets" search={{ dataset: c.id }} className="link">
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground">
                  Time-series collections are large; set a feature limit or
                  filter when adding them.
                </p>
              </div>
            </section>

            <section id="glossary" className="scroll-mt-6 space-y-4">
              <h2>Glossary</h2>
              <p className="text-muted-foreground">
                Plain-language definitions of terms used across the map.
              </p>
              <dl className="divide-y border-y">
                {GLOSSARY.map((g) => (
                  <div key={g.term} className="py-3">
                    <dt className="font-medium">{g.term}</dt>
                    <dd className="mt-1 text-muted-foreground">{g.def}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="faq" className="scroll-mt-6 space-y-4">
              <h2>
                Frequently asked questions
              </h2>
              <div className="space-y-5">
                <Faq q="Why don’t I see any data?">
                  A filter is likely hiding it. Remove the chips over the map to
                  see the whole dataset.
                </Faq>
                <Faq q="A site has no chart — why?">
                  The site may have only one reading. Major chemistry has no
                  chart yet.
                </Faq>
                <Faq q="What does “depth to water” mean, and why is the chart upside down?">
                  Depth to water is measured downward from the ground surface, so a
                  bigger number is a deeper water level. Hydrographs invert the
                  y-axis so a rising water level reads as an upward line. See the{" "}
                  <a
                    href="#glossary"
                    className="link"
                  >
                    glossary
                  </a>
                  .
                </Faq>
                <Faq q="How current is the data?">
                  Each dataset refreshes monthly; its abstract on the{" "}
                  <Link to="/datasets" className="link">
                    Datasets
                  </Link>{" "}
                  page gives the day of the month. Agencies publish on their own
                  schedules, so recency also varies by site.
                </Faq>
                <Faq q="Why does a value differ from the agency’s own website?">
                  It may have been converted to a common unit, or the agency
                  may have updated it since the last monthly run. The agency’s
                  value is authoritative.
                </Faq>
                <Faq q="Can I use this data in my own tools?">
                  Yes. Download from the map, query the{" "}
                  <a href="#api" className="link">
                    Weaver API
                  </a>
                  , or{" "}
                  <a href="#gis" className="link">
                    connect a desktop GIS
                  </a>
                  . Please read the{" "}
                  <a href="#disclaimer" className="link">
                    disclaimer
                  </a>{" "}
                  first.
                </Faq>
                <Faq q="What does a shared link contain?">
                  Only your map view: the dataset, filters, region and selected
                  site. It holds no personal information.
                </Faq>
              </div>
            </section>

            <section id="disclaimer" className="scroll-mt-6 space-y-4">
              <h2>Disclaimer</h2>
              <p className="text-muted-foreground">
                At NMBGMR, we use different tools to collect groundwater level
                measurements, including continuous data recorders and manual
                measurements. All data provided here are in feet, depth to water,
                below ground surface (BGS). We use pressure transducers to record
                pressure of water over a device installed in the well, which is
                converted to feet of water and depth to water. We provide here up
                to one measurement per hour where the data are that frequent. In
                some locations we have more data available. We also use continuous
                acoustic sounder devices which convert a sound reflection into a
                measurement of depth to water. These can be used for long term
                trends in groundwater levels. While we do our best to review and
                quality check these data, please use these data with caution.
                Site-specific conditions should be verified, especially for
                legally binding decisions. Data are subject to changes, deletion,
                or being moved without notice at any time and should not be relied
                on for any critical application. Any opinions expressed may not
                necessarily reflect the official position of the New Mexico Bureau
                of Geology, New Mexico Tech, or the State of New Mexico. No
                warranty expressed or implied, is made regarding the accuracy or
                utility of the data for general or scientific purposes.
              </p>
              <p className="text-muted-foreground">
                This geospatial data is being provided to the public as a resource
                to aid in the understanding of the resources of New Mexico.
                However, there are limitations for all data, particularly when
                aggregated with other data that may have been collected at
                different times, by different agencies or people, and for
                different purposes. All geospatial data sets are inherently
                scale-dependent and may falsely imply relationships with other
                data or a false level of accuracy when zoomed-in beyond the scale
                of analysis. Users of this data should carefully read the included
                metadata for each data set. Site-specific conditions should also
                be verified, especially for legally binding decisions. Users are
                also welcome to contact us for clarification regarding the
                strengths and limitations of our data.
              </p>
            </section>
          </div>
        </div>
      </div>
    </SitePage>
  )
}
