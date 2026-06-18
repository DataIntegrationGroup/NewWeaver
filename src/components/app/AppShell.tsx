import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/mode-toggle"
import { LAYER_CATALOG } from "@/catalog/layers"
import { LayerList } from "./LayerList"
import { MapView } from "./MapView"

/**
 * AppShell — header + layer sidebar + full-bleed map. The public v1 surface:
 * an interactive map of NM water data with layer toggles.
 *
 * Skeleton: visible-layer state is local. Phase 3 moves it (plus bbox/zoom and
 * selection) into the URL via TanStack Router search params for shareable views.
 */
export function AppShell() {
  const [visible, setVisible] = useState<string[]>(
    LAYER_CATALOG.filter((l) => l.defaultVisible).map((l) => l.id)
  )

  const toggle = (id: string) =>
    setVisible((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    )

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b bg-card px-5 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="!text-2xl !leading-none">Weaver</h1>
          <p className="text-sm text-muted-foreground">New Mexico Water Data</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">v0.1.0</Badge>
          <ModeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-y-auto border-r bg-card p-5">
          <LayerList visible={visible} onToggle={toggle} />
        </aside>
        <main className="min-w-0 flex-1">
          <MapView visible={visible} />
        </main>
      </div>
    </div>
  )
}
