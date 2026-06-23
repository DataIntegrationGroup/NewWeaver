/**
 * Nightly stats JSON (SPEC §T.T11b). DIE writes this file to GCP each night;
 * the home dashboard reads it read-only. Weaver computes nothing here — it only
 * parses and validates what DIE published (§C.C2, §V.V13, §V.V14).
 */
import { STATS_URL } from "@/config"

/** A single source-update event for the activity feed (§V.V14). */
export interface StatEvent {
  /** Which source updated (human label). */
  source: string
  /** ISO-8601 timestamp of the update. */
  timestamp: string
  /** Optional update kind ("refresh", "new", …). */
  kind?: string
}

/** The whole stats document. */
export interface WeaverStats {
  /** ISO-8601 time the file was generated. */
  generatedAt: string
  counts: {
    services: number
    datasets: number
    sites: number
  }
  /** Most-recent-first source updates; may be empty. */
  events: StatEvent[]
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

/**
 * Validate an unknown payload into WeaverStats. Throws on a shape mismatch so
 * the caller can fall back rather than render garbage — never coerce a partial
 * document into fabricated numbers (§V.V13).
 */
export function parseStats(raw: unknown): WeaverStats {
  if (!raw || typeof raw !== "object") throw new Error("stats: not an object")
  const o = raw as Record<string, unknown>
  const counts = o.counts as Record<string, unknown> | undefined
  if (
    !counts ||
    !isFiniteNumber(counts.services) ||
    !isFiniteNumber(counts.datasets) ||
    !isFiniteNumber(counts.sites)
  ) {
    throw new Error("stats: missing or non-numeric counts")
  }
  if (typeof o.generatedAt !== "string") {
    throw new Error("stats: missing generatedAt")
  }
  const events = Array.isArray(o.events)
    ? (o.events as unknown[]).filter(
        (e): e is StatEvent =>
          !!e &&
          typeof e === "object" &&
          typeof (e as StatEvent).source === "string" &&
          typeof (e as StatEvent).timestamp === "string"
      )
    : []
  return {
    generatedAt: o.generatedAt,
    counts: {
      services: counts.services,
      datasets: counts.datasets,
      sites: counts.sites,
    },
    events,
  }
}

/** Whether a stats source is configured at all. */
export const statsConfigured = Boolean(STATS_URL)

/** Fetch + validate the nightly stats JSON. Throws on network or shape errors. */
export async function fetchStats(): Promise<WeaverStats> {
  if (!STATS_URL) throw new Error("stats: no STATS_URL configured")
  const res = await fetch(STATS_URL)
  if (!res.ok) throw new Error(`stats: HTTP ${res.status}`)
  return parseStats(await res.json())
}
