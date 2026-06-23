/**
 * Home-page data dashboard (SPEC §T.T11 / §I.home-dash). Three at-a-glance stat
 * tiles — upstream services, datasets, and monitoring sites — plus the activity
 * feed (§T.T12). Counts come from the nightly DIE stats JSON (§V.V13); when that
 * file is absent the services/datasets tiles fall back to the locally-derived
 * catalog counts and the site count shows "—" rather than a fabricated number.
 */
import { Database, Layers, MapPin } from "lucide-react"

import { Card } from "@/components/ui/card"
import { useStats } from "@/hooks/useStats"
import { statsConfigured } from "@/lib/stats"
import { DATASET_COUNT, DATASET_SERVICE_COUNT } from "@/catalog/datasets"
import { ActivityFeed } from "./ActivityFeed"

function fmtNum(n: number): string {
  return n.toLocaleString()
}

function StatTile({
  testid,
  icon: Icon,
  value,
  label,
}: {
  testid: string
  icon: typeof Database
  value: string
  label: string
}) {
  return (
    <Card data-testid={testid} className="items-center gap-1 p-6 text-center">
      <Icon className="size-7 text-primary" />
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
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
    <section data-testid="home-dashboard">
      <div className="mb-5 text-center">
        <h2 className="!text-3xl text-secondary">Water data at a glance</h2>
        {updated && (
          <p
            data-testid="dashboard-updated"
            className="mt-1 text-sm text-muted-foreground"
          >
            Updated {updated}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          testid="dashboard-stat-services"
          icon={Database}
          value={fmtNum(services)}
          label="Data sources"
        />
        <StatTile
          testid="dashboard-stat-datasets"
          icon={Layers}
          value={fmtNum(datasets)}
          label="Datasets & products"
        />
        <StatTile
          testid="dashboard-stat-sites"
          icon={MapPin}
          value={sites}
          label="Monitoring sites"
        />
      </div>

      <div className="mt-4">
        <ActivityFeed events={data?.events} configured={statsConfigured} />
      </div>
    </section>
  )
}
