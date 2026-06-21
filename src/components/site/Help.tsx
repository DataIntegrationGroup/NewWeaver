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
  { id: "sources", label: "Data sources" },
  { id: "gis", label: "Desktop GIS" },
  { id: "disclaimer", label: "Disclaimer" },
] as const

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
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong>Layers.</strong> Use the sidebar to toggle data layers
                  on and off. Each layer is a monitoring network or an integrated
                  dataset.
                </li>
                <li>
                  <strong>Monitoring points.</strong> Click a point to open its
                  panel, choose a datastream, and view a time-series chart of its
                  observations.
                </li>
                <li>
                  <strong>Vector features.</strong> Click a feature to inspect its
                  attributes, or open the <em>Attribute table</em> to browse,
                  sort, and page through a layer.
                </li>
                <li>
                  <strong>Filter.</strong> Restrict data to the current map extent
                  with “Filter to map view,” or type in the feature filter to
                  match attributes.
                </li>
                <li>
                  <strong>Share.</strong> The visible layers, map extent, and
                  selection are encoded in the page URL — copy it to share the
                  exact view.
                </li>
              </ul>
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
                  published by the Data Integration Engine (the Ocotillo
                  pygeoapi: wells, springs, surface water, chemistry, and more).
                </li>
                <li>
                  <strong>OGC SensorThings API (STA)</strong> — monitoring
                  locations and time series from the FROST server, including
                  multiple agency networks (e.g. City of Albuquerque, Bernalillo
                  County, NM Office of the State Engineer).
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

              <div className="space-y-2 pt-1">
                <h3 className="!text-lg font-semibold text-primary">
                  API endpoints
                </h3>
                <p className="text-sm text-muted-foreground">
                  Every layer reads one of these public APIs directly — no
                  Weaver-only backend. Use them in your own tools.
                </p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm text-muted-foreground">
                  <ApiRow label="OGC API Features (Ocotillo)" url={OGC_LANDING_URL} />
                  <ApiRow label="SensorThings — FROST (primary)" url={STA_BASE_URL} />
                  <ApiRow label="SensorThings — FROST (st2 / agencies)" url={STA_ST2_BASE_URL} />
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
                    <strong>Ocotillo landing page</strong> —{" "}
                    <A href={OGC_LANDING_URL}>{OGC_LANDING_URL}</A> (use as the OGC
                    API server connection URL).
                  </li>
                  <li>
                    <strong>Ocotillo collections</strong> —{" "}
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
