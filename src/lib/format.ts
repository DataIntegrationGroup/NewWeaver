/**
 * Value formatting helpers shared by the inspect panel, table, and popup.
 * Currently: human-readable dates.
 *
 * These product fields are *calendar dates* (some serialized bare as
 * `YYYY-MM-DD`, some as `…T00:00:00Z`), not precise instants. We render the
 * literal Y-M-D the source carries and never timezone-convert — otherwise a
 * midnight-UTC date viewed in a western (UTC-6/-7) zone renders the *previous*
 * evening. A time is shown only when the source actually carries a non-midnight
 * one, and then as the source's own wall-clock time.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** True when this property key names a calendar date/timestamp (rendered
 *  human-readable). Matches a `date` or `datetime` word and their `_date` /
 *  `_datetime` suffixes; year-only fields (e.g. `projected_depletion_year`) are
 *  deliberately excluded — they're plain ints. */
export function isDateField(key: string): boolean {
  return /(^|_)(date|datetime)$/i.test(key)
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?)?/

/**
 * Render an ISO date/datetime string as e.g. `May 12, 2023` (or
 * `May 12, 2023, 2:30 PM` when the source carries a non-midnight time).
 * Returns `null` when the value isn't a parseable date so callers fall back to
 * their normal rendering.
 */
export function formatDate(raw: string): string | null {
  const m = DATE_RE.exec(raw.trim())
  if (!m) return null
  const [, y, mo, d, hh, mm] = m
  const month = MONTHS[Number(mo) - 1]
  if (!month) return null
  const date = `${month} ${Number(d)}, ${y}`

  // No time part, or a midnight one → date only (the field is a calendar date).
  if (hh === undefined || (hh === "00" && mm === "00")) return date

  let h = Number(hh)
  const ampm = h < 12 ? "AM" : "PM"
  h = h % 12 || 12
  return `${date}, ${h}:${mm} ${ampm}`
}
