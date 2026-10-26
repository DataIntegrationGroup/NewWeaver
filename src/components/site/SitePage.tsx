import { PageShell, PageBody, PageContainer } from "@/components/ui/page"
import { SiteHeader } from "./SiteHeader"

/**
 * Content-page chrome: shared TopNav + a scrollable body. Pass a PageHeader as
 * `header` for a full-width title band with the content in a site-width
 * container below; without one the body is a centered prose column.
 */
export function SitePage({
  header,
  children,
}: {
  header?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PageShell>
      <SiteHeader />
      {header ? (
        <PageBody bare>
          {header}
          <PageContainer className="pt-6 pb-16">{children}</PageContainer>
        </PageBody>
      ) : (
        <PageBody>{children}</PageBody>
      )}
    </PageShell>
  )
}
