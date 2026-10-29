/**
 * A small decorative chart at the top of the detail card that hints at the
 * dataset's shape — a line for time series, a box plot for summaries, and so
 * on (after the Datasets mockup). The kind comes from the collection's
 * keywords; the marks are seeded from its id, so each dataset looks a little
 * different but the same on every visit. Not real data, so hidden from
 * assistive tech.
 */
import type { Dataset } from "./collections"

type PreviewKind = "series" | "summary" | "trend" | "areas" | "points"

function previewKind(d: Dataset): PreviewKind {
  const has = (k: string) => d.keywords.some((x) => x.toLowerCase() === k)
  if (has("time series")) return "series"
  if (has("summary statistics")) return "summary"
  if (has("trend")) return "trend"
  if (has("well density")) return "areas"
  return "points"
}

/** Deterministic 0–1 sequence from a string (Park–Miller LCG). */
function seeded(id: string): () => number {
  let s = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7) || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const W = 200
const H = 56

function Series({ r }: { r: () => number }) {
  let y = 30
  const pts: string[] = []
  for (let i = 0; i <= 50; i++) {
    y += (r() - 0.5) * 8 + Math.sin(i / 3) * 1.6
    y = Math.max(8, Math.min(50, y))
    pts.push(`${i * 4} ${y.toFixed(1)}`)
  }
  const line = `M${pts.join(" L")}`
  return (
    <>
      <path d={`${line} L${W} ${H} L0 ${H}Z`} className="fill-primary/15" />
      <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-primary" />
    </>
  )
}

function Summary({ r }: { r: () => number }) {
  const dots = Array.from({ length: 44 }, (_, i) => (
    <circle key={i} cx={8 + Math.pow(r(), 1.8) * 184} cy={12 + r() * 32} r={2.2} className="fill-primary/30" />
  ))
  const q1 = 30 + r() * 20
  const q3 = q1 + 40 + r() * 30
  const median = q1 + (q3 - q1) * (0.35 + r() * 0.3)
  return (
    <>
      {dots}
      <line x1={8} x2={190} y1={28} y2={28} strokeWidth={1.5} className="stroke-primary" />
      <rect x={q1} y={18} width={q3 - q1} height={20} rx={3} strokeWidth={2} className="fill-muted stroke-primary" />
      <line x1={median} x2={median} y1={18} y2={38} strokeWidth={3} className="stroke-primary" />
    </>
  )
}

function Trend({ r }: { r: () => number }) {
  const up = 0.2 + r() * 0.3
  const down = 0.15 + r() * 0.3
  const flat = 1 - up - down
  // [width, bar fill, arrow, arrow fill] — arrows contrast with their own bar.
  const segments: [number, string, string, string][] = [
    [up, "fill-primary", "↑", "fill-primary-foreground"],
    [flat, "fill-primary/30", "→", "fill-foreground"],
    [down, "fill-primary/60", "↓", "fill-foreground"],
  ]
  let x = 0
  return (
    <>
      {segments.map(([w, fill, glyph, glyphFill], i) => {
        const start = x
        x += w * W
        return (
          <g key={i}>
            <rect x={start + (i ? 2 : 0)} y={18} width={Math.max(0, w * W - (i ? 2 : 0))} height={20} rx={3} className={fill} />
            <text x={start + (w * W) / 2} y={32.5} textAnchor="middle" className={`${glyphFill} text-[12px] font-bold`}>
              {glyph}
            </text>
          </g>
        )
      })}
    </>
  )
}

function Areas({ r }: { r: () => number }) {
  return (
    <>
      {Array.from({ length: 16 }, (_, i) => {
        const h = 8 + r() * 42
        return (
          <rect key={i} x={i * 12.5 + 1} y={54 - h} width={9} height={h} rx={2} className={i % 4 === 0 ? "fill-primary" : "fill-primary/30"} />
        )
      })}
    </>
  )
}

function Points({ r }: { r: () => number }) {
  return (
    <>
      {Array.from({ length: 70 }, (_, i) => (
        <circle key={i} cx={6 + r() * 188} cy={6 + r() * 44} r={1.6 + r() * 1.8} className={i % 3 ? "fill-primary/30" : "fill-primary"} />
      ))}
    </>
  )
}

const MARKS: Record<PreviewKind, (props: { r: () => number }) => React.ReactNode> = {
  series: Series,
  summary: Summary,
  trend: Trend,
  areas: Areas,
  points: Points,
}

export function DatasetPreview({ d }: { d: Dataset }) {
  const kind = previewKind(d)
  const Marks = MARKS[kind]
  return (
    <div data-testid="datasets-detail-preview" data-kind={kind} className="rounded-lg bg-muted p-4">
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden className="block h-auto w-full">
        <Marks r={seeded(d.id)} />
      </svg>
    </div>
  )
}
