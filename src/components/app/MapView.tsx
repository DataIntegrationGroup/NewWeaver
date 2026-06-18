import { Map } from "@/components/ui/map"
import { LAYER_CATALOG } from "@/catalog/layers"
import { CatalogLayer } from "./MapLayers"

interface MapViewProps {
  /** Ids of catalog layers to render. */
  visible: string[]
}

/**
 * MapView — the primary surface. Renders the design system Map primitive with
 * the currently-visible catalog layers (STA points + Features collections)
 * fetched via TanStack Query.
 *
 * Phase 2: one STA layer + one Features layer render end-to-end. Click-to-
 * inspect, attribute tables, charts, filtering, and URL state follow in
 * Phase 3 per the feature specs in /features.
 */
export function MapView({ visible }: MapViewProps) {
  const layers = LAYER_CATALOG.filter((l) => visible.includes(l.id))

  return (
    <div className="h-full w-full">
      <Map>
        {layers.map((layer) => (
          <CatalogLayer key={layer.id} layer={layer} />
        ))}
      </Map>
    </div>
  )
}
