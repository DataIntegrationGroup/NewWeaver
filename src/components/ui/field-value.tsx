import { cn } from "cn"

import { Badge } from "@/components/ui/badge"

/**
 * FieldValue — renders a feature attribute value for the table, inspect panel,
 * and hover popup. URLs become a clickable link; coded values formatted as
 * "CODE: Label" (the OSE status / pod_status / use_ fields) render the code as
 * a badge followed by its label; everything else is plain text.
 */
const URL_RE = /^https?:\/\/\S+$/i
const CODE_RE = /^([A-Z][A-Z0-9]{1,5}): (.+)$/

// USGS observation approval states → a badge in the theme's status color.
const APPROVAL = {
  Approved: "bg-success text-success-foreground",
  Provisional: "bg-warning text-warning-foreground",
} as const

export function FieldValue({ value }: { value: string }) {
  const v = value.trim()

  if (Object.hasOwn(APPROVAL, v)) {
    return (
      <Badge className={cn("uppercase", APPROVAL[v as keyof typeof APPROVAL])}>
        {v}
      </Badge>
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
        <Badge variant="outline">{code[1]}</Badge>
        <span className="break-words">{code[2]}</span>
      </span>
    )
  }

  return <>{value}</>
}
