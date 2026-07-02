/**
 * MeasurementFacet — "browse by what's measured" (SPEC §T.T4 / §V.V4).
 *
 * Discovery by measurement type rather than producing network. Picking a
 * category enables every matching layer across all networks at once and zooms
 * to their extent — so "show me all water quality data" is one click, not a
 * hunt through per-agency toggles.
 */
import { MEASUREMENT_CATEGORIES, type MeasurementType } from "@/catalog/layers"
import { Button } from "@/components/ui/button"

interface MeasurementFacetProps {
  /** Enable this category's layers (across all networks) and zoom to them. */
  onSelect: (type: MeasurementType) => void
}

export function MeasurementFacet({ onSelect }: MeasurementFacetProps) {
  if (MEASUREMENT_CATEGORIES.length === 0) return null
  return (
    <section aria-label="Browse by what's measured" data-testid="measurement-facet">
      <div className="flex flex-wrap gap-1.5">
        {MEASUREMENT_CATEGORIES.map((c) => (
          <Button
            key={c.type}
            type="button"
            variant="outline"
            size="sm"
            data-testid={`facet-${c.type}`}
            onClick={() => onSelect(c.type)}
          >
            {c.label}
          </Button>
        ))}
      </div>
    </section>
  )
}
