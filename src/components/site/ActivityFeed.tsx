/**
 * Source-update activity feed (SPEC §T.T12 / §V.V14). Renders the update events
 * published in the nightly stats JSON. It NEVER fabricates a timestamp — when no
 * source is wired (or the file carries no events) it shows a plainly-labelled
 * empty state instead of inventing activity.
 */
import { Clock } from "lucide-react"
import type { StatEvent } from "@/lib/stats"

/** Format an ISO timestamp as a short local date; fall back to the raw string. */
function fmt(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
}

export function ActivityFeed({
  events,
  configured,
}: {
  events: StatEvent[] | undefined
  /** Whether a stats source is wired at all. */
  configured: boolean
}) {
  const list = events ?? []

  return (
    <div data-testid="home-activity-feed" className="rounded-xl border bg-card p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Clock className="size-5 text-primary" />
        Recent source updates
      </h3>

      {list.length === 0 ? (
        <p
          data-testid="activity-empty"
          className="mt-3 text-sm text-muted-foreground"
        >
          {configured
            ? "No recent updates reported."
            : "Update activity will appear here once the data feed is connected."}
        </p>
      ) : (
        <ul className="mt-3 divide-y">
          {list.map((e, i) => (
            <li
              key={`${e.source}-${e.timestamp}-${i}`}
              data-testid="activity-event"
              className="flex items-center justify-between gap-4 py-2 text-sm"
            >
              <span className="font-medium">{e.source}</span>
              <span className="text-muted-foreground">
                {e.kind ? `${e.kind} · ` : ""}
                {fmt(e.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
