import type { LayerConfig } from "@/catalog/layers"

/**
 * MapLegend — the color-by key floated over the map where the sidebar (which
 * carries the full legend with counts and checkboxes) is hidden.
 */
export function MapLegend({ layer }: { layer: LayerConfig }) {
  if (!layer.legend?.length) return null
  return (
    <div
      data-testid="map-legend"
      className="pointer-events-none absolute bottom-8 right-2 z-10 flex max-h-[60%] flex-col gap-2 overflow-y-auto"
    >
      <div
        data-testid={`map-legend-${layer.id}`}
        className="pointer-events-auto rounded-lg border bg-card/95 px-2.5 py-2 text-xs shadow-sm backdrop-blur"
      >
        <p className="mb-1 font-semibold text-foreground">{layer.title}</p>
        <ul className="space-y-0.5">
          {layer.legend.map((entry) => (
            <li key={entry.label} className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ background: entry.color }}
              />
              <span className="text-muted-foreground">{entry.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
