import { PageShell, PageBody } from "@/components/ui/page"
import { SiteHeader } from "./SiteHeader"

/** Content-page chrome: shared NavBar + a centered scrollable body. */
export function SitePage({ children }: { children: React.ReactNode }) {
  return (
    <PageShell>
      <SiteHeader />
      <PageBody>{children}</PageBody>
    </PageShell>
  )
}
