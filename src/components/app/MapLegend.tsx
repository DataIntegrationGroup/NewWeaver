import type { LayerConfig } from "@/catalog/layers"

interface MapLegendProps {
  /** Visible catalog layers; only those with a `legend` render a section. */
  layers: LayerConfig[]
  /** Ids hidden via their on-map chip — excluded even if still "visible". */
  hiddenLayerIds?: string[]
}

/**
 * MapLegend — swatch/label key for categorically color-mapped layers (e.g.
 * Monitoring Recency's active/stale). Layers drawn with a single flat color
 * carry no `legend` and are skipped; the sidebar swatch already covers them.
 */
export function MapLegend({ layers, hiddenLayerIds }: MapLegendProps) {
  const withLegend = layers.filter(
    (l) => l.legend && l.legend.length > 0 && !hiddenLayerIds?.includes(l.id)
  )
  if (withLegend.length === 0) return null

  return (
    <div
      data-testid="map-legend"
      className="pointer-events-none absolute bottom-8 right-2 z-10 flex max-h-[60%] flex-col gap-2 overflow-y-auto"
    >
      {withLegend.map((layer) => (
        <div
          key={layer.id}
          data-testid={`map-legend-${layer.id}`}
          className="pointer-events-auto rounded-lg border bg-card/95 px-2.5 py-2 text-xs shadow-sm backdrop-blur"
        >
          <p className="mb-1 font-semibold text-foreground">{layer.title}</p>
          <ul className="space-y-0.5">
            {layer.legend!.map((entry) => (
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
      ))}
    </div>
  )
}
