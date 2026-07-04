import { useEffect, useState } from "react"
import { useLocation } from "@tanstack/react-router"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import {
  OCOTILLO_FEATURES_BASE_URL,
  OSE_ARCGIS_BASE_URL,
  STA_BASE_URL,
  STA_ST2_BASE_URL,
  USGS_OGC_BASE_URL,
} from "@/config"
import { SitePage } from "./SitePage"

const OGC_LANDING_URL = OCOTILLO_FEATURES_BASE_URL.replace(/\/+$/, "")
const OGC_COLLECTIONS_URL = `${OGC_LANDING_URL}/collections`

const USGS_LANDING_URL = USGS_OGC_BASE_URL.replace(/\/+$/, "")
const USGS_COLLECTIONS_URL = `${USGS_LANDING_URL}/collections`
const OSE_POD_URL = `${OSE_ARCGIS_BASE_URL}/OSE_Points_of_Diversion/FeatureServer/0`
const OSE_AQUIFER_URL = `${OSE_ARCGIS_BASE_URL}/OSE_Aquifer_Test_Wells_view_pub/FeatureServer/0`

/** External link styled for the docs body. */
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-all text-primary underline underline-offset-2"
    >
      {children}
    </a>
  )
}

/** One API-endpoint row: a service label and its linked base URL. */
function ApiRow({ label, url }: { label: string; url: string }) {
  return (
    <li>
      <strong>{label}</strong> — <A href={url}>{url}</A>
    </li>
  )
}

const GIS_DOCS = {
  arcgis:
    "https://pro.arcgis.com/en/pro-app/latest/help/data/services/use-ogc-api-services.htm",
  qgis: "https://docs.qgis.org/latest/en/docs/user_manual/working_with_ogc/ogc_client_support.html",
}

const COMMON_COLLECTIONS = [
  "Water Wells",
  "Springs",
  "Latest Depth to Water (Wells)",
  "Average TDS (Wells)",
  "Latest TDS (Wells)",
]

/** Copyable URL pill — click to copy the OGC endpoint to the clipboard. */
function CopyUrl({ value, label }: { value: string; label: string }) {
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
        data-testid="copy-ogc-url"
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
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="!text-lg font-semibold text-primary">{title}</h3>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-block break-all text-sm text-primary underline underline-offset-2"
      >
        Official documentation
      </a>
    </div>
  )
}

const SECTIONS = [
  { id: "using", label: "Using the map" },
  { id: "planning", label: "Regional planning" },
  { id: "exporting", label: "Exporting data" },
  { id: "sources", label: "Data sources" },
  { id: "gis", label: "Desktop GIS" },
  { id: "glossary", label: "Glossary" },
  { id: "faq", label: "FAQ" },
  { id: "disclaimer", label: "Disclaimer" },
] as const

/** Glossary entries — plain-language definitions of terms used across Weaver. */
const GLOSSARY: { term: string; def: React.ReactNode }[] = [
  {
    term: "Depth to water (DTW / BGS)",
    def: "How far below the ground surface the water table sits, in feet. Larger numbers mean a deeper water level. “BGS” = below ground surface.",
  },
  {
    term: "Hydrograph",
    def: "A plot of one well’s depth-to-water over time. Because depth increases downward, the y-axis is inverted — a line trending up on the page means the water level is rising.",
  },
  {
    term: "Water-level status",
    def: "Where a well’s most recent reading falls against its own history, ranked into percentile classes from “much below normal” to “much above normal.” Wells without enough record are “insufficient data.”",
  },
  {
    term: "Groundwater trend",
    def: "The long-term direction of a well’s depth-to-water from a linear fit over its record. Because the measure is depth, “deepening” means the level is falling and “rising” means it is recovering.",
  },
  {
    term: "Depletion projection",
    def: "An estimate of when a well would decline to its reported well depth if the current trend continues. “Projected” wells are those on track to run dry.",
  },
  {
    term: "Seasonal amplitude",
    def: "How much a well’s water level swings within a typical year — the within-year high-to-low range.",
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
      <h3 className="!text-base font-semibold text-foreground">{q}</h3>
      <div className="text-sm text-muted-foreground">{children}</div>
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
    <SitePage>
      <div data-testid="help-page">
        <header className="mb-8">
          <h1 className="!text-4xl text-primary">Documentation &amp; Help</h1>
          <p className="mt-2 text-muted-foreground">
            How to use Weaver, where its data comes from, and the terms under
            which it is provided.
          </p>
        </header>

        <div className="flex gap-10">
          <DocsSidebar active={active} />

          <div className="min-w-0 flex-1 space-y-12">
            <section id="using" className="scroll-mt-6 space-y-4">
              <h2 className="!text-2xl text-primary">Using the map</h2>
              <p className="text-muted-foreground">
                Weaver is a map-first way to explore New Mexico water data. Turn
                on the layers you care about, click a site to read its details,
                narrow to an area, and download what you find.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Layers.</strong> Use the sidebar to toggle data layers
                  on and off. Each layer is a monitoring network or an integrated
                  dataset, grouped by source. Dense point layers cluster when
                  zoomed out and separate as you zoom in.
                </li>
                <li>
                  <strong>Inspect a site.</strong> Click any point to open its
                  details panel — identifiers, attributes, and, where a site has a
                  record, its water-level or water-quality time series.
                </li>
                <li>
                  <strong>Attribute table.</strong> Open the table to see every
                  visible feature as sortable rows. It stays in sync with the map,
                  the current filters, and any area you’ve selected.
                </li>
                <li>
                  <strong>Find a place.</strong> Search an address to recenter the
                  map and see what’s monitored nearby, with the coverage — and
                  gaps — for that location.
                </li>
                <li>
                  <strong>Select an area.</strong> Draw a rectangle or polygon, or
                  pick a region of interest (a county, public water system, or
                  hydrologic basin) to restrict the data to that area for viewing
                  and export.
                </li>
                <li>
                  <strong>Filter.</strong> Restrict data to the current map extent
                  with “Filter to map view,” or type in the feature filter to
                  match attributes.
                </li>
                <li>
                  <strong>Basemap &amp; theme.</strong> Switch the basemap (Light,
                  Dark, Satellite, and more) to suit the task, and toggle light or
                  dark mode from the header.
                </li>
                <li>
                  <strong>Share.</strong> The visible layers, map extent, and
                  selection are encoded in the page URL — copy it to share the
                  exact view.
                </li>
              </ul>
            </section>

            <section id="planning" className="scroll-mt-6 space-y-4">
              <h2 className="!text-2xl text-primary">Regional planning</h2>
              <p className="text-muted-foreground">
                The <strong>Regional Planning</strong> page rolls the per-well
                integrated data products up into decision-support summaries for an
                area. Toggle one or more regions — counties, public water systems,
                or hydrologic basins — in the sidebar; the map frames them and the
                dashboard pulls the water data live and summarizes it. Turn on
                several regions to compare them side by side.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Monitoring points.</strong> How many wells fall inside
                  the selected regions, and how many are actively reporting vs
                  stale.
                </li>
                <li>
                  <strong>Water-level status.</strong> How current levels compare
                  to each well’s own history, as a distribution from much-below to
                  much-above normal, with headline counts of below- and
                  above-normal wells.
                </li>
                <li>
                  <strong>Groundwater trend.</strong> The long-term direction of
                  levels across the region, plus the median rate of change.
                </li>
                <li>
                  <strong>Depletion outlook.</strong> Wells projected to decline to
                  their well depth if current trends hold, with soonest and median
                  timing.
                </li>
                <li>
                  <strong>Seasonal swing &amp; quality.</strong> Typical
                  within-year amplitude and any drinking-water limit exceedances.
                </li>
                <li>
                  <strong>Hydrographs.</strong> Every well with repeat readings is
                  listed; click one — or a well point on the map — to plot its
                  depth-to-water over time. Each KPI card can also highlight just
                  its wells on the map.
                </li>
              </ul>
            </section>

            <section id="exporting" className="scroll-mt-6 space-y-4">
              <h2 className="!text-2xl text-primary">Exporting data</h2>
              <p className="text-muted-foreground">
                Everything you see is downloadable. Make a selection — draw a
                shape, pick a region, or filter the map — then open{" "}
                <strong>Download data</strong> and choose a format:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Time series (CSV).</strong> Every observation for the
                  selected monitoring locations, one row per reading — the format
                  for trend analysis and charting.
                </li>
                <li>
                  <strong>Latest observation (CSV).</strong> The most recent
                  reading per location — a compact snapshot of current conditions.
                </li>
                <li>
                  <strong>Features (GeoJSON).</strong> A geospatial inventory of
                  the selection for use in a GIS or mapping tool.
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Time-series and latest exports need monitoring locations that carry
                a record; the Features export also works for vector-only layers.
                For a live connection instead of a one-time file, connect a{" "}
                <a
                  href="#gis"
                  className="text-primary underline underline-offset-2"
                >
                  desktop GIS
                </a>{" "}
                to the OGC API.
              </p>
            </section>

            <section id="sources" className="scroll-mt-6 space-y-4">
              <h2 className="!text-2xl text-primary">Data sources</h2>
              <p className="text-muted-foreground">
                Weaver reads public data through open, standards-based interfaces
                — no source-specific code. Four services back the map today:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>OGC API Features</strong> — vector / integrated layers
                  published by New Mexico Water Data (wells, springs, surface
                  water, chemistry, and more).
                </li>
                <li>
                  <strong>OGC SensorThings API (STA)</strong> — monitoring
                  locations and time series, including multiple agency networks
                  (e.g. City of Albuquerque, Bernalillo County, NM Office of the
                  State Engineer).
                </li>
                <li>
                  <strong>ArcGIS REST (OSE GIS)</strong> — the Office of the State
                  Engineer’s Esri Feature Services: statewide Points of Diversion
                  and Aquifer Test Wells.
                </li>
                <li>
                  <strong>USGS Water Data for the Nation (NWIS)</strong> — USGS’s
                  modern OGC API, read for New Mexico groundwater sites and their
                  continuous, daily, field, and channel measurements.
                </li>
              </ul>

              <div id="api" className="scroll-mt-6 space-y-2 pt-1">
                <h3 className="!text-lg font-semibold text-primary">
                  API endpoints
                </h3>
                <p className="text-sm text-muted-foreground">
                  Every layer reads one of these public APIs directly — no
                  Weaver-only backend. Use them in your own tools.
                </p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm text-muted-foreground">
                  <ApiRow label="OGC API Features — integrated collections" url={OGC_LANDING_URL} />
                  <ApiRow label="SensorThings — NM Water Data (primary)" url={STA_BASE_URL} />
                  <ApiRow label="SensorThings — agency networks" url={STA_ST2_BASE_URL} />
                  <ApiRow label="OSE ArcGIS REST — Points of Diversion" url={OSE_POD_URL} />
                  <ApiRow label="OSE ArcGIS REST — Aquifer Test Wells" url={OSE_AQUIFER_URL} />
                  <ApiRow label="USGS Water Data for the Nation" url={USGS_LANDING_URL} />
                </ul>
              </div>
            </section>

            <section
              id="gis"
              data-testid="help-gis"
              className="scroll-mt-6 space-y-4"
            >
              <h2 className="!text-2xl text-primary">
                Connect a desktop GIS to the OGC API
              </h2>
              <p className="text-muted-foreground">
                The same OGC API Features service behind this map can be added
                directly to <strong>ArcGIS Pro</strong> and <strong>QGIS</strong>,
                so you can browse, query, and export the collections in your own
                GIS. These layers are <strong>read-only</strong> — use them for
                discovery, display, querying, and export.
              </p>

              <div className="space-y-2">
                <p className="text-sm font-semibold">OGC API landing page URL</p>
                <CopyUrl
                  value={OGC_LANDING_URL}
                  label="Copy OGC landing page URL"
                />
                <p className="text-xs text-muted-foreground">
                  Use this landing page URL as the server connection — not a
                  single collection’s items URL.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ConnectCard
                  title="ArcGIS Pro / Desktop"
                  steps={[
                    "Open the Catalog pane and create a new OGC API Server connection.",
                    "Paste the OGC API landing page URL above.",
                    "Expand the server connection, choose the collection you want, and add it to the current map.",
                    "If ArcGIS prompts for layer options, set extent or maximum-feature limits for large collections.",
                  ]}
                  href={GIS_DOCS.arcgis}
                />
                <ConnectCard
                  title="QGIS"
                  steps={[
                    "Open the Data Source Manager.",
                    "Choose the WFS / OGC API – Features connection tab.",
                    "Create a new connection using the OGC API landing page URL above.",
                    "Connect to the server, select one or more collections, and add them to the map.",
                    "For large layers, set paging or feature limits in the connection and layer options.",
                  ]}
                  note="QGIS expects the OGC API landing page, not a single collection items URL, when you create the server connection."
                  href={GIS_DOCS.qgis}
                />
              </div>

              <div className="space-y-2">
                <h3 className="!text-lg font-semibold text-primary">
                  Useful endpoints
                </h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    <strong>OGC API landing page</strong> —{" "}
                    <A href={OGC_LANDING_URL}>{OGC_LANDING_URL}</A> (use as the OGC
                    API server connection URL).
                  </li>
                  <li>
                    <strong>Available collections</strong> —{" "}
                    <A href={OGC_COLLECTIONS_URL}>{OGC_COLLECTIONS_URL}</A> (review
                    what’s published before connecting).
                  </li>
                  <li>
                    <strong>USGS Water Data for the Nation</strong> —{" "}
                    <A href={USGS_LANDING_URL}>{USGS_LANDING_URL}</A> — another OGC
                    API landing page; connect the same way (see its{" "}
                    <A href={USGS_COLLECTIONS_URL}>collections</A>).
                  </li>
                  <li>
                    <strong>OSE Points of Diversion</strong> —{" "}
                    <A href={OSE_POD_URL}>{OSE_POD_URL}</A> — an ArcGIS REST Feature
                    Service; add it as an <em>ArcGIS Server</em> connection rather
                    than an OGC API one.
                  </li>
                  <li>
                    <strong>OSE Aquifer Test Wells</strong> —{" "}
                    <A href={OSE_AQUIFER_URL}>{OSE_AQUIFER_URL}</A> — ArcGIS REST
                    Feature Service (same as above).
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="!text-lg font-semibold text-primary">
                  Common collections to look for
                </h3>
                <div className="flex flex-wrap gap-2">
                  {COMMON_COLLECTIONS.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Collection names vary by deployment. If one is missing, open
                  the{" "}
                  <a
                    href={OGC_COLLECTIONS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    collections endpoint
                  </a>{" "}
                  and use the names published there.
                </p>
              </div>
            </section>

            <section id="glossary" className="scroll-mt-6 space-y-4">
              <h2 className="!text-2xl text-primary">Glossary</h2>
              <p className="text-muted-foreground">
                Plain-language definitions of terms used across the map and the
                planning dashboard.
              </p>
              <dl className="space-y-3">
                {GLOSSARY.map((g) => (
                  <div key={g.term} className="rounded-lg border bg-card p-4">
                    <dt className="font-semibold text-foreground">{g.term}</dt>
                    <dd className="mt-1 text-sm text-muted-foreground">{g.def}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="faq" className="scroll-mt-6 space-y-4">
              <h2 className="!text-2xl text-primary">
                Frequently asked questions
              </h2>
              <div className="space-y-5">
                <Faq q="Why don’t I see any data?">
                  Make sure at least one layer is turned on in the sidebar. Some
                  layers only reveal individual points as you zoom in, and any
                  active filter (map view, feature filter, or a selected area) can
                  hide features outside it — clear filters to see everything again.
                </Faq>
                <Faq q="A site has no time series — why?">
                  Not every feature carries a record. Water-level and
                  water-quality series come from monitoring locations that report
                  to the SensorThings networks; vector-only layers (for example
                  Points of Diversion) are locations without an attached series.
                </Faq>
                <Faq q="What does “depth to water” mean, and why is the chart upside down?">
                  Depth to water is measured downward from the ground surface, so a
                  bigger number is a deeper water level. Hydrographs invert the
                  y-axis so a rising water level reads as an upward line. See the{" "}
                  <a
                    href="#glossary"
                    className="text-primary underline underline-offset-2"
                  >
                    glossary
                  </a>
                  .
                </Faq>
                <Faq q="How current is the data?">
                  Weaver reads the source APIs live, so you see what each service
                  currently publishes. Update frequency varies by network and
                  site — the planning page’s “active vs stale” counts reflect which
                  wells have recent readings.
                </Faq>
                <Faq q="Can I use this data in my own tools?">
                  Yes. Export CSV or GeoJSON from{" "}
                  <a
                    href="#exporting"
                    className="text-primary underline underline-offset-2"
                  >
                    Download data
                  </a>
                  , connect a{" "}
                  <a
                    href="#gis"
                    className="text-primary underline underline-offset-2"
                  >
                    desktop GIS
                  </a>{" "}
                  to the OGC API, or call the{" "}
                  <a
                    href="#api"
                    className="text-primary underline underline-offset-2"
                  >
                    public API endpoints
                  </a>{" "}
                  directly. Please read the{" "}
                  <a
                    href="#disclaimer"
                    className="text-primary underline underline-offset-2"
                  >
                    disclaimer
                  </a>{" "}
                  first.
                </Faq>
                <Faq q="Is a shared link private?">
                  No. The URL encodes only the view — layers, extent, and
                  selection — and points at the same public data everyone sees. It
                  contains no personal information.
                </Faq>
              </div>
            </section>

            <section id="disclaimer" className="scroll-mt-6 space-y-4">
              <h2 className="!text-2xl text-primary">Disclaimer</h2>
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
