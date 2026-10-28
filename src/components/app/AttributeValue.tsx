/**
 * AttributeValue — field-aware rendering of a feature attribute for the table,
 * inspect panel, and hover popup. When the property key is known: date fields
 * become human-readable, water-level `status` fields a severity StatusChip, and
 * trend/direction fields a TrendChip. Everything else falls back to the DSDS
 * FieldValue (links, coded-value badges, approval badges, plain text).
 */
import { formatDate, isDateField } from "@/lib/format"
import { FieldValue } from "@/components/ui/field-value"
import { StatusChip, TrendChip } from "@/components/ui/metadata-chips"

// Same "CODE: Label" shape FieldValue renders as a coded badge.
const CODE_RE = /^([A-Z][A-Z0-9]{1,5}): (.+)$/

// Property keys that render as a trend/direction chip (arrow + tone).
const TREND_FIELDS = new Set(["trend_category", "direction"])

export function AttributeValue({ field, value }: { field: string; value: string }) {
  const v = value.trim()
  if (v) {
    if (isDateField(field)) {
      const human = formatDate(v)
      if (human) return <>{human}</>
    }
    // Percentile status word (not an OSE "CODE: Label" coded value).
    if (field === "status" && !CODE_RE.test(v)) return <StatusChip value={v} />
    if (TREND_FIELDS.has(field)) return <TrendChip value={v} />
  }
  return <FieldValue value={value} />
}
