import { useQuery } from "@tanstack/react-query"

import { featuresClient } from "@/clients/ogcFeatures"
import { DIE_FEATURES_BASE_URL } from "@/config"
import { bareWellId } from "@/lib/planning"

export interface SampleRow {
  /** ISO date of the sample. */
  date: string
  /** Numeric result, or null when the lab reported text (e.g. "< MRL"). */
  value: number | null
  /** The result as reported, for text results. */
  text: string
  units?: string
  source?: string
  /** The approval label as the source reported it (e.g. "Final"). */
  approvalLabel?: string
}

const ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&amp;": "&" }

/**
 * The result as a number. The time-series collections send numeric results
 * as strings ("470.0"); anything that isn't a plain number ("< MRL 0.001
 * MG/L") is a text result and gets null.
 */
function toValue(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  if (typeof raw !== "string" || !/^\s*-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?\s*$/i.test(raw)) return null
  return Number(raw)
}

/** Some results arrive HTML-escaped ("&lt; MRL 0.001 MG/L"). */
function unescape(s: string): string {
  return s.replace(/&(lt|gt|amp);/g, (m) => ENTITIES[m])
}

/**
 * One site's samples from a DIE time-series collection, newest first.
 * Filtered by the bare id, then narrowed to this site's rows (feature ids are
 * `source:id:date`), since a bare id can repeat across agencies.
 */
export async function fetchSiteSamples(collectionId: string, siteId: string): Promise<SampleRow[]> {
  const fc = await featuresClient(DIE_FEATURES_BASE_URL).getAllItems(
    collectionId,
    { id: bareWellId(siteId) },
    10000,
    5
  )
  const own = fc.features.filter((f) =>
    String(f.properties?.feature_id ?? "").startsWith(`${siteId}:`)
  )
  return (own.length ? own : fc.features)
    .map((f) => {
      const p = (f.properties ?? {}) as Record<string, unknown>
      const raw = p.parameter_value
      return {
        date: String(p.date_measured ?? p.datetime ?? "").slice(0, 10),
        value: toValue(raw),
        text: unescape(String(raw ?? "")),
        units: typeof p.parameter_units === "string" ? p.parameter_units : undefined,
        source: typeof p.source === "string" ? p.source : undefined,
        approvalLabel:
          typeof p.approval_status === "string" && p.approval_status ? p.approval_status : undefined,
      }
    })
    .filter((r) => r.date)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function useSiteSamples(collectionId: string | undefined, siteId: string) {
  return useQuery({
    queryKey: ["site-samples", collectionId, siteId],
    enabled: !!collectionId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchSiteSamples(collectionId!, siteId),
  })
}
