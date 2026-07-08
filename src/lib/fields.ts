/**
 * Field display selection — which feature properties a layer surfaces in the
 * attribute table and the hover popup, and in what order.
 *
 * Default is "all fields, in their natural order". A layer narrows this by
 * declaring at most one of:
 *   - `include`: show only these keys, in this order (an allow-list + ordering).
 *   - `exclude`: show every key except these (a deny-list).
 * If both are given, `include` defines the set and order, then `exclude` is
 * removed from it. Keys named in `include` that a feature lacks are skipped.
 */
export interface FieldDisplay {
  /** Allow-list: only these keys, in this order. */
  include?: string[]
  /** Deny-list: every key except these. */
  exclude?: string[]
}

/** Property key carrying a well-depth unit string (e.g. "ft"). Never shown as
 *  its own field — it's folded into the `well_depth` label as `well_depth (ft)`
 *  (see `fieldLabel`), leaving the value column a bare number. */
export const WELL_DEPTH_KEY = "well_depth"
export const WELL_DEPTH_UNITS_KEY = "well_depth_units"

/**
 * Resolve the visible, ordered field keys for a feature given a layer's
 * `FieldDisplay`. `keys` is the feature's property keys in natural order.
 * `well_depth_units` is always dropped — it's merged into the `well_depth`
 * label rather than shown as its own row/column.
 */
export function selectFields(keys: string[], fields?: FieldDisplay): string[] {
  const shown = keys.filter((k) => k !== WELL_DEPTH_UNITS_KEY)
  if (!fields) return shown
  let out = shown
  if (fields.include) {
    // Allow-list defines both membership and order; keep only present keys.
    out = fields.include.filter((k) => shown.includes(k))
  }
  if (fields.exclude) {
    const drop = new Set(fields.exclude)
    out = out.filter((k) => !drop.has(k))
  }
  return out
}

/** Plain-language display names for property keys whose raw name is noise. */
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  observation_count: "observations",
}

/**
 * Display label for a property key. `well_depth` folds its companion
 * `well_depth_units` into the label — `well_depth (ft)` — so the value renders
 * as a bare number (e.g. `140`). Keys in `FIELD_LABEL_OVERRIDES` get a
 * friendlier name; every other key renders as-is.
 */
export function fieldLabel(key: string, props: Record<string, unknown>): string {
  if (key === WELL_DEPTH_KEY) {
    const unit = props[WELL_DEPTH_UNITS_KEY]
    if (unit != null && String(unit).trim() !== "") return `${WELL_DEPTH_KEY} (${String(unit).trim()})`
  }
  return FIELD_LABEL_OVERRIDES[key] ?? key
}

/** Format a finite number to exactly 2 decimal places (e.g. `2` → `"2.00"`);
 *  undefined for non-numeric/non-finite values so callers can fall through
 *  to their normal formatting. */
export function fixed2(value: unknown): string | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : undefined
}

// Field-name fragments that unambiguously identify a water-level, trend, or
// elevation reading — these always render to exactly 2 decimal places, never
// raw source precision. Layers whose numeric fields are named generically
// (e.g. GeoServer's shared min/max/mean/latest_value summary schema, reused
// by TDS/arsenic/chemistry too) can't be matched by name alone; those set
// their own `formatValue` instead (see wfs-nm-waterlevels-summary in
// catalog/layers.ts).
const ROUNDED_FIELD_RE = /depth_to_water|depth_wat|water_level|elevation|slope_per_year|change_ft|dtw/i

/** `fixed2`, gated to fields whose name marks them as a water-level, trend,
 *  or elevation reading. Undefined when the field doesn't match, so callers
 *  fall through to their normal formatting. */
export function roundedFieldValue(key: string, value: unknown): string | undefined {
  return ROUNDED_FIELD_RE.test(key) ? fixed2(value) : undefined
}
