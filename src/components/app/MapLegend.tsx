import type { LayerConfig } from "@/catalog/layers"

interface MapLegendProps {
  /** Visible catalog layers; only those with a `legend` render a section. */
  layers: LayerConfig[]
  /** Ids hidden via their on-map chip — excluded even if still "visible". */
  hiddenLayerIds?: string[]
  /** Layer id → color-by-class toggle; adds a classification key when on. */
  classifyById?: Record<string, boolean>
}

/** Format an mg/L bin as a short range label (e.g. "1,000–3,000", ">10,000"). */
function binLabel(min: number, max: number, domainMax: number): string {
  if (min <= 0) return `<${max.toLocaleString()}`
  if (max >= domainMax) return `>${min.toLocaleString()}`
  return `${min.toLocaleString()}–${max.toLocaleString()}`
}

/** Legend entries for a layer: its static `legend`, or its classification
 *  palette when the color-by-class toggle is on. */
function entriesFor(
  layer: LayerConfig,
  classifyOn: boolean
): { label: string; color: string }[] | undefined {
  if (classifyOn && layer.rangePresets?.every((p) => p.color) && layer.rangePresets.length > 0) {
    const domainMax = layer.rangeDomain?.[1] ?? Infinity
    const unit = layer.rangeUnit ? ` ${layer.rangeUnit}` : ""
    return layer.rangePresets.map((p) => ({
      label: `${p.label} (${binLabel(p.min, p.max, domainMax)}${unit})`,
      color: p.color!,
    }))
  }
  if (layer.legend && layer.legend.length > 0) return layer.legend
  return undefined
}

/**
 * MapLegend — swatch/label key for categorically color-mapped layers (e.g.
 * Monitoring Recency's active/stale, or a layer with the color-by-class toggle
 * on). Layers drawn with a single flat color carry no key and are skipped; the
 * sidebar swatch already covers them.
 */
export function MapLegend({ layers, hiddenLayerIds, classifyById }: MapLegendProps) {
  const sections = layers
    .filter((l) => !hiddenLayerIds?.includes(l.id))
    .map((l) => ({ layer: l, entries: entriesFor(l, !!classifyById?.[l.id]) }))
    .filter((s): s is { layer: LayerConfig; entries: { label: string; color: string }[] } =>
      s.entries !== undefined
    )
  if (sections.length === 0) return null

  return (
    <div
      data-testid="map-legend"
      className="pointer-events-none absolute bottom-8 right-2 z-10 flex max-h-[60%] flex-col gap-2 overflow-y-auto"
    >
      {sections.map(({ layer, entries }) => (
        <div
          key={layer.id}
          data-testid={`map-legend-${layer.id}`}
          className="pointer-events-auto rounded-lg border bg-card/95 px-2.5 py-2 text-xs shadow-sm backdrop-blur"
        >
          <p className="mb-1 font-semibold text-foreground">{layer.title}</p>
          <ul className="space-y-0.5">
            {entries.map((entry) => (
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
