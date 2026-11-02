import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Site content width and gutter — max-w-7xl with a gutter that grows with the
 * window. Shared by TopNav, PageContainer and full-bleed home sections so
 * content always lines up with the nav.
 */
const PAGE_CONTAINER = "mx-auto w-full max-w-7xl px-[clamp(1.25rem,4.4vw,3.5rem)]"

/**
 * PageShell — full-viewport app chrome: a flex column on the app background.
 * Put a NavBar (or app header) first, then PageBody / app content.
 */
function PageShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-shell"
      className={cn(
        "flex h-svh flex-col bg-background text-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * PageBody — scrollable content region with a centered, width-capped column.
 * For prose pages (about, help); the map app uses its own full-bleed layout,
 * and pages with a PageHeader use `bare` and lay out their own containers.
 */
function PageBody({
  className,
  children,
  bare = false,
  ...props
}: React.ComponentProps<"main"> & { bare?: boolean }) {
  return (
    <main
      data-slot="page-body"
      className={cn("flex-1 overflow-y-auto", className)}
      {...props}
    >
      {bare ? children : <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>}
    </main>
  )
}

/** PageContainer — centers content at the site width and gutter. */
function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-container"
      className={cn(PAGE_CONTAINER, className)}
      {...props}
    />
  )
}

/**
 * PageHeader — a full-width band that opens a page: title, description, then
 * any children (a search box, actions) underneath.
 *
 *   <PageHeader>
 *     <PageTitle>Datasets</PageTitle>
 *     <PageDescription>Every integrated product.</PageDescription>
 *   </PageHeader>
 */
function PageHeader({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section data-slot="page-header" className="border-b" {...props}>
      <PageContainer className={cn("flex flex-col gap-4 pt-12 pb-8", className)}>
        {children}
      </PageContainer>
    </section>
  )
}

function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-title"
      className={cn("text-4xl font-extrabold tracking-tight text-balance", className)}
      {...props}
    />
  )
}

function PageDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-description"
      className={cn("max-w-2xl text-lg text-pretty text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  PAGE_CONTAINER,
  PageShell,
  PageBody,
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
}
