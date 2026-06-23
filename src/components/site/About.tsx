import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SitePage } from "./SitePage"
import { SLACK_URL } from "./SiteHeader"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

export function About() {
  useDocumentTitle("Weaver — About")
  return (
    <SitePage>
      <article className="space-y-8" data-testid="about-page">
        <header>
          <h1 className="!text-4xl text-primary">About Weaver</h1>
        </header>

        <section>
          <h2 className="!text-2xl text-primary">What is Weaver?</h2>
          <p className="mt-2 text-muted-foreground">
            Weaver is developed by the Water Data Initiative team at the New
            Mexico Bureau of Geology and Mineral Resources (NMBGMR). Our goal is
            to share water data collected by NMBGMR and interweave it with other
            water-data sources to create integrated datasets — displayed here as
            a public, interactive map.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="!text-2xl text-primary">How it works</h2>
          <p className="mt-2 text-muted-foreground">
            Weaver is a display surface only — it reads public data through two
            open, standards-based interfaces and never stores or edits anything:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong>OGC API Features</strong> — vector / integrated layers
              (e.g. water-level summaries) published by the Data Integration
              Engine.
            </li>
            <li>
              <strong>OGC SensorThings API (STA)</strong> — monitoring locations
              and time-series observations served by the FROST server.
            </li>
          </ul>
        </section>

        <Separator />

        <section>
          <h2 className="!text-2xl text-primary">What you can do</h2>
          {/* Interface-mechanics bullets removed — the UI communicates these by
              affordance now (SPEC §T.T10 / §V.V7). Scope/capability statements
              kept. */}
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              Find what’s monitored near an address, or browse by what’s measured —
              water levels, water quality, surface water — across every network at once.
            </li>
            <li>
              Take the data with you: download a result or connect your own tools to
              the same open APIs.
            </li>
          </ul>
        </section>

        <Separator />

        <section className="text-center">
          <h2 className="!text-2xl text-secondary">Join our community</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Help shape the future of water-data accessibility in New Mexico.
          </p>
          <Button className="mt-4" onClick={() => window.open(SLACK_URL, "_blank")}>
            Join on Slack
          </Button>
        </section>
      </article>
    </SitePage>
  )
}
