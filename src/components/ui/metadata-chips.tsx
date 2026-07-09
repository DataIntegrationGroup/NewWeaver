/**
 * StatusChip / TrendChip — inline pills for the inspector metadata sections.
 * StatusChip colors a water-level percentile class (or any status word) by
 * severity; TrendChip pairs a direction word with an up/down/flat arrow. Both
 * are tinted (not solid) so they read as inline values inside the attribute
 * list, distinct from the solid hero chip in the hydrograph header.
 */
import { TrendingDown, TrendingUp, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

type Tone = "red" | "amber" | "green" | "blue" | "indigo" | "slate"

const TONE: Record<Tone, string> = {
  red: "bg-red-500/15 text-red-700 dark:text-red-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  indigo: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  slate: "bg-muted text-muted-foreground",
}

const DOT: Record<Tone, string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  slate: "bg-muted-foreground/50",
}

/** Water-level percentile class → severity tone. Depth below normal = a low,
 *  dropping water table (warm); above normal = a high one (cool). Compound
 *  ("much …") forms are checked before their bare word. */
function statusTone(status: string): Tone {
  const s = status.toLowerCase()
  if (s.includes("much below")) return "red"
  if (s.includes("below")) return "amber"
  if (s.includes("much above")) return "indigo"
  if (s.includes("above")) return "blue"
  if (s.includes("normal")) return "green"
  return "slate"
}

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"

export function StatusChip({ value }: { value: string }) {
  const tone = statusTone(value)
  return (
    <span data-testid="status-chip" className={cn(chipBase, TONE[tone])}>
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      {value}
    </span>
  )
}

/** Direction/trend word → arrow. Purely directional: these words describe
 *  different underlying metrics (a rising water level vs. an increasing
 *  depth-to-water mean the opposite thing for the aquifer), so the arrow states
 *  the raw direction only and the chip stays tone-neutral — it makes no
 *  good/bad claim. Severity lives in the StatusChip. */
function trendIcon(value: string): typeof TrendingUp {
  const s = value.toLowerCase()
  if (/(declin|decreas|fall|drop|down|lower|deepen|negative)/.test(s)) return TrendingDown
  if (/(ris|increas|recover|up|higher|shallow|positive|gain)/.test(s)) return TrendingUp
  return Minus
}

export function TrendChip({ value }: { value: string }) {
  const Icon = trendIcon(value)
  return (
    <span data-testid="trend-chip" className={cn(chipBase, TONE.slate)}>
      <Icon className="size-3 shrink-0" />
      {value}
    </span>
  )
}
