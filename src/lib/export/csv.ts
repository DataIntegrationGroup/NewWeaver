/**
 * CSV serialization + browser download helpers for the export feature.
 * RFC-4180 quoting: fields containing a comma, quote, or newline are wrapped
 * in double quotes with embedded quotes doubled.
 */

export type CsvValue = string | number | boolean | null | undefined

function escapeCell(value: CsvValue): string {
  const s = value == null ? "" : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Build a CSV string from a header row and data rows. */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(escapeCell).join(",")]
  for (const row of rows) lines.push(row.map(escapeCell).join(","))
  return lines.join("\r\n")
}

/** Trigger a client-side file download of `content`. */
export function downloadFile(
  filename: string,
  content: string,
  mime: string
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** `weaver-{kind}-{YYYYMMDD-HHmm}` — the stable export filename stem. */
export function exportFilename(kind: string, date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0")
  const stamp =
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `-${p(date.getHours())}${p(date.getMinutes())}`
  return `weaver-${kind}-${stamp}`
}
