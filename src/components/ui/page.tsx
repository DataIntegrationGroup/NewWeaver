import * as React from "react"

import { cn } from "@/lib/utils"

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
 * For content pages (home, about, help); the map app uses its own full-bleed
 * layout instead.
 */
function PageBody({ className, children, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="page-body"
      className={cn("flex-1 overflow-y-auto", className)}
      {...props}
    >
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </main>
  )
}

export { PageShell, PageBody }
