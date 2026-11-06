import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageDescription, PageHeader, PageTitle } from "@/components/ui/page"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { DIE_REPO_URL } from "@/config"
import { SitePage } from "./SitePage"

/** In-app link to a Help section. */
function HelpLink({ hash, children }: { hash: string; children: React.ReactNode }) {
  return (
    <Link to="/help" hash={hash} className="link">
      {children}
    </Link>
  )
}

export function About() {
  useDocumentTitle("Weaver — About")
  return (
    <SitePage
      header={
        <PageHeader>
          <PageTitle>About Weaver</PageTitle>
          <PageDescription>
            Integrated water data for New Mexico, harmonized from the agencies
            that collect it.
          </PageDescription>
        </PageHeader>
      }
    >
      <article className="space-y-12" data-testid="about-page">
        <section className="space-y-3">
          <h2>What is Weaver?</h2>
          <p className="text-muted-foreground">
            Weaver harmonizes water data from agencies across New Mexico into
            integrated datasets for mapping, analysis and downstream use. It
            complements the source data and never replaces it: each agency
            remains the authoritative record. See the{" "}
            <HelpLink hash="disclaimer">disclaimer</HelpLink>.
          </p>
          <p className="text-muted-foreground">
            Built by the Water Data Initiative at the New Mexico Bureau of
            Geology and Mineral Resources (NMBGMR).
          </p>
        </section>

        <section className="space-y-3">
          <h2>The Weaver API</h2>
          <p className="text-muted-foreground">
            The integrated datasets are served by the Weaver API, an open OGC
            API – Features service refreshed monthly. It converts units and
            names into a common shape while keeping each agency’s originals and
            site IDs. The code is{" "}
            <a href={DIE_REPO_URL} target="_blank" rel="noreferrer" className="link">
              public and open source
            </a>
            , and we welcome feedback. See{" "}
            <HelpLink hash="api">the Weaver API</HelpLink> to query it.
          </p>
        </section>

        <section className="space-y-3">
          <h2>What you can do</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Map water levels or water quality across every agency at once.</li>
            <li>Filter by value, source or area, and open any site’s full record.</li>
            <li>Download what you find, or connect your own tools to the API.</li>
          </ul>
        </section>

        <Card className="items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h2>Check out our other work</h2>
            <p className="text-muted-foreground">
              Weaver is part of the New Mexico Water Data Initiative. See the
              initiative's other projects, tools, and data.
            </p>
          </div>
          <a
            href="https://newmexicowaterdata.org/"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants()}
          >
            Visit New Mexico Water Data <ArrowRight data-icon="inline-end" />
          </a>
        </Card>
      </article>
    </SitePage>
  )
}
