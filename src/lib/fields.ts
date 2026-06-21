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

/**
 * Resolve the visible, ordered field keys for a feature given a layer's
 * `FieldDisplay`. `keys` is the feature's property keys in natural order.
 */
export function selectFields(keys: string[], fields?: FieldDisplay): string[] {
  if (!fields) return keys
  let out = keys
  if (fields.include) {
    // Allow-list defines both membership and order; keep only present keys.
    out = fields.include.filter((k) => keys.includes(k))
  }
  if (fields.exclude) {
    const drop = new Set(fields.exclude)
    out = out.filter((k) => !drop.has(k))
  }
  return out
}
