/**
 * FieldValue — renders a feature attribute value for the table, inspect panel,
 * and hover popup. URLs become a clickable link; coded values formatted as
 * "CODE: Label" (the OSE status / pod_status / use_ fields) render the code as
 * a chip followed by its label; everything else is plain text.
 */
const URL_RE = /^https?:\/\/\S+$/i
const CODE_RE = /^([A-Z][A-Z0-9]{1,5}): (.+)$/

// USGS observation approval states → a colored status chip.
const APPROVAL: Record<string, string> = {
  Approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Provisional: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
}

export function FieldValue({ value }: { value: string }) {
  const v = value.trim()

  if (APPROVAL[v]) {
    return (
      <span
        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${APPROVAL[v]}`}
      >
        {v}
      </span>
    )
  }

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

  const code = v.match(CODE_RE)
  if (code) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {code[1]}
        </span>
        <span className="break-words">{code[2]}</span>
      </span>
    )
  }

  return <>{value}</>
}
