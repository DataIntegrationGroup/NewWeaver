/**
 * Home-page data dashboard (SPEC §T.T11 / §I.home-dash). A strip of at-a-glance
 * stat tiles — upstream services, datasets, monitoring sites, and the span of
 * record — over the activity feed (§T.T12). Counts come from the nightly DIE
 * stats JSON (§V.V13); when that file is absent the services/datasets tiles
 * fall back to the locally-derived catalog counts and the site count shows "—"
 * rather than a fabricated number.
 */
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useStats } from "@/hooks/useStats"
import { statsConfigured } from "@/lib/stats"
import { DATASET_COUNT, DATASET_SERVICE_COUNT } from "@/catalog/datasets"
import { ActivityFeed } from "./ActivityFeed"

// Placeholder: a made-up, hardcoded span of record from the design mockup. No
// data source backs it yet — replace it with a real range from the stats JSON.
const RECORD_START = 1920
const RECORD_END = 2026

function fmtNum(n: number): string {
  return n.toLocaleString()
}

function StatTile({
  testid,
  value,
  label,
}: {
  testid?: string
  value: string
  label: string
}) {
  return (
    <Card data-testid={testid}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums sm:text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

export function DataDashboard() {
  const { data } = useStats()

  // JSON wins; otherwise fall back to what we can know locally without faking.
  const services = data?.counts.services ?? DATASET_SERVICE_COUNT
  const datasets = data?.counts.datasets ?? DATASET_COUNT
  const sites = data ? fmtNum(data.counts.sites) : "—"

  const updated = data
    ? new Date(data.generatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <section data-testid="home-dashboard" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          testid="dashboard-stat-services"
          value={fmtNum(services)}
          label="Data sources"
        />
        <StatTile
          testid="dashboard-stat-datasets"
          value={fmtNum(datasets)}
          label="Datasets"
        />
        <StatTile
          testid="dashboard-stat-sites"
          value={sites}
          label="Monitoring sites"
        />
        <StatTile
          value={`${RECORD_START}–${RECORD_END}`}
          label={`${RECORD_END - RECORD_START} years of record`}
        />
      </div>

      <ActivityFeed
        events={data?.events}
        configured={statsConfigured}
        updated={updated}
      />
    </section>
  )
}
