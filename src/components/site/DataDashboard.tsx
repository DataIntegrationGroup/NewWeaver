/**
 * Home-page stat tiles (SPEC §T.T11). The dataset count is live from DIE and
 * shows "—" until it loads.
 */
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useDieStats } from "@/hooks/useDieStats"

// Distinct DIE `source` values as of 2026-10-29. pygeoapi can't count distinct
// values cheaply, so they're hardcoded.
const DIE_SOURCES = [
  "BOR-RISE",
  "ISCSevenRivers",
  "NMBGMR",
  "ST/DWB",
  "ST2/BernCo",
  "ST2/CABQ",
  "ST2/EBID",
  "ST2/NMOSE-Roswell",
  "ST2/PVACD",
  "USGS-NWIS",
  "WQP",
]

// Earliest DIE record as of 2026-10-29 (a few sites' 1900 dates look like
// placeholders).
const RECORD_START = 1903
const RECORD_END = new Date().getFullYear()

function fmtNum(n: number | undefined): string {
  return n === undefined ? "—" : n.toLocaleString()
}

function StatTile({
  testid,
  value,
  label,
  className,
}: {
  testid?: string
  value: string
  label: string
  className?: string
}) {
  return (
    <Card data-testid={testid} className={className}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums sm:text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

export function DataDashboard() {
  const { data } = useDieStats()

  return (
    <section data-testid="home-dashboard" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatTile
        testid="dashboard-stat-services"
        value={fmtNum(DIE_SOURCES.length)}
        label="Data sources"
      />
      <StatTile
        testid="dashboard-stat-datasets"
        value={fmtNum(data?.datasets)}
        label="Datasets"
      />
      <StatTile
        className="col-span-2 sm:col-span-1"
        value={`${RECORD_START}–${RECORD_END}`}
        label={`${RECORD_END - RECORD_START} years of record`}
      />
    </section>
  )
}
