import { Map } from "@/components/ui/map"

/**
 * MapView — the primary surface. Wraps the design system Map primitive.
 *
 * Skeleton: renders the basemap only. Catalog layers (STA points, Features
 * collections), click-to-inspect, and clustering are wired in Phase 2/3 per
 * the feature specs in /features.
 */
export function MapView() {
  return (
    <div className="h-full w-full">
      <Map />
    </div>
  )
}
