import { useState } from "react"
import { useLocation } from "@tanstack/react-router"
import { Check, Copy } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { OCOTILLO_FEATURES_BASE_URL } from "@/config"
import { SitePage } from "./SitePage"

const OGC_LANDING_URL = OCOTILLO_FEATURES_BASE_URL.replace(/\/+$/, "")
const OGC_COLLECTIONS_URL = `${OGC_LANDING_URL}/collections`

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

const TAB_VALUES = ["using", "sources", "gis", "disclaimer"]

export function Help() {
  // Allow deep-linking a tab via the URL hash (e.g. /help#gis from the export
  // dialog's Desktop GIS banner).
  const { hash } = useLocation()
  const tab = hash.replace(/^#/, "")
  const defaultTab = TAB_VALUES.includes(tab) ? tab : "using"
  return (
    <SitePage>
      <div className="space-y-6" data-testid="help-page">
        <h1 className="!text-4xl text-primary">Documentation &amp; Help</h1>
        <p className="text-muted-foreground">
          How to use Weaver, where its data comes from, and the terms under which
          it is provided.
        </p>

        <Tabs defaultValue={defaultTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="using">Using the map</TabsTrigger>
            <TabsTrigger value="sources">Data sources</TabsTrigger>
            <TabsTrigger value="gis">Desktop GIS</TabsTrigger>
            <TabsTrigger value="disclaimer">Disclaimer</TabsTrigger>
          </TabsList>

          <TabsContent value="using" className="space-y-4 pt-4">
            <h2 className="!text-2xl text-primary">Using the map</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Layers.</strong> Use the sidebar to toggle data layers on
                and off. Each layer is a monitoring network or an integrated
                dataset.
              </li>
              <li>
                <strong>Monitoring points.</strong> Click a point to open its
                panel, choose a datastream, and view a time-series chart of its
                observations.
              </li>
              <li>
                <strong>Vector features.</strong> Click a feature to inspect its
                attributes, or open the <em>Attribute table</em> to browse, sort,
                and page through a layer.
              </li>
              <li>
                <strong>Filter.</strong> Restrict data to the current map extent
                with “Filter to map view,” or type in the feature filter to match
                attributes.
              </li>
              <li>
                <strong>Share.</strong> The visible layers, map extent, and
                selection are encoded in the page URL — copy it to share the exact
                view.
              </li>
            </ul>
          </TabsContent>

          <TabsContent value="sources" className="space-y-4 pt-4">
            <h2 className="!text-2xl text-primary">Data sources</h2>
            <p className="text-muted-foreground">
              Weaver reads public data through two open, standards-based
              interfaces — no source-specific code:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>OGC API Features</strong> — vector / integrated layers
                published by the Data Integration Engine.
              </li>
              <li>
                <strong>OGC SensorThings API (STA)</strong> — monitoring
                locations and time series from the FROST server, including
                multiple agency networks (e.g. City of Albuquerque, Bernalillo
                County, NM Office of the State Engineer).
              </li>
            </ul>
          </TabsContent>

          <TabsContent value="gis" className="space-y-4 pt-4" data-testid="help-gis">
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
              <CopyUrl value={OGC_LANDING_URL} label="Copy OGC landing page URL" />
              <p className="text-xs text-muted-foreground">
                Use this landing page URL as the server connection — not a single
                collection’s items URL.
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
                  <strong>Landing page</strong> —{" "}
                  <a
                    href={OGC_LANDING_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary underline underline-offset-2"
                  >
                    {OGC_LANDING_URL}
                  </a>{" "}
                  (use as the server connection URL).
                </li>
                <li>
                  <strong>Collections</strong> —{" "}
                  <a
                    href={OGC_COLLECTIONS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary underline underline-offset-2"
                  >
                    {OGC_COLLECTIONS_URL}
                  </a>{" "}
                  (review what’s published before connecting).
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
                Collection names vary by deployment. If one is missing, open the{" "}
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
          </TabsContent>

          <TabsContent value="disclaimer" className="space-y-4 pt-4">
            <h2 className="!text-2xl text-primary">Disclaimer</h2>
            <p className="text-muted-foreground">
              At NMBGMR, we use different tools to collect groundwater level
              measurements, including continuous data recorders and manual
              measurements. All data provided here are in feet, depth to water,
              below ground surface (BGS). We use pressure transducers to record
              pressure of water over a device installed in the well, which is
              converted to feet of water and depth to water. We provide here up to
              one measurement per hour where the data are that frequent. In some
              locations we have more data available. We also use continuous
              acoustic sounder devices which convert a sound reflection into a
              measurement of depth to water. These can be used for long term
              trends in groundwater levels. While we do our best to review and
              quality check these data, please use these data with caution.
              Site-specific conditions should be verified, especially for legally
              binding decisions. Data are subject to changes, deletion, or being
              moved without notice at any time and should not be relied on for any
              critical application. Any opinions expressed may not necessarily
              reflect the official position of the New Mexico Bureau of Geology,
              New Mexico Tech, or the State of New Mexico. No warranty expressed or
              implied, is made regarding the accuracy or utility of the data for
              general or scientific purposes.
            </p>
            <p className="text-muted-foreground">
              This geospatial data is being provided to the public as a resource
              to aid in the understanding of the resources of New Mexico. However,
              there are limitations for all data, particularly when aggregated
              with other data that may have been collected at different times, by
              different agencies or people, and for different purposes. All
              geospatial data sets are inherently scale-dependent and may falsely
              imply relationships with other data or a false level of accuracy
              when zoomed-in beyond the scale of analysis. Users of this data
              should carefully read the included metadata for each data set.
              Site-specific conditions should also be verified, especially for
              legally binding decisions. Users are also welcome to contact us for
              clarification regarding the strengths and limitations of our data.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </SitePage>
  )
}
