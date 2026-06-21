/**
 * FieldValue — renders a feature attribute value for the table, inspect panel,
 * and hover popup. A value that is an http(s) URL (e.g. the OSE `nmwrrs_wrs`
 * well-record link) becomes a clickable link labelled by its host; everything
 * else renders as plain text.
 */
const URL_RE = /^https?:\/\/\S+$/i

export function FieldValue({ value }: { value: string }) {
  const v = value.trim()
  if (URL_RE.test(v)) {
    let host = v
    try {
      host = new URL(v).hostname
    } catch {
      // Malformed despite the regex — fall back to the raw URL as the label.
    }
    return (
      <a
        href={v}
        target="_blank"
        rel="noreferrer"
        className="break-all text-primary underline underline-offset-2"
      >
        {host} ↗
      </a>
    )
  }
  return <>{value}</>
}
