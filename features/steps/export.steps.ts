import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"
import type { Feature } from "geojson"

import {
  gatherTimeSeriesRows,
  timeSeriesCsv,
  TIME_SERIES_HEADERS,
  type TimeRange,
} from "@/lib/export/timeSeries"
import { gatherLatestRows, latestCsv } from "@/lib/export/latest"
import { buildFeaturesGeoJSON } from "@/lib/export/geojson"
import type { Selection } from "@/lib/selection"
import type { ClientWorld } from "./support/world"

/**
 * Deterministic STA fixture for export specs: two locations, four datastreams
 * (one empty), spread across dates so a time range and the empty-series case
 * are both exercised.
 */
const LOCS: Record<
  string,
  {
    name: string
    lng: number
    lat: number
    datastreams: { id: number; name: string; unit: string; obs: { t: string; r: number }[] }[]
  }
> = {
  L1: {
    name: "YALE1",
    lng: -106.62,
    lat: 35.08,
    datastreams: [
      {
        id: 201,
        name: "Manual Water Level",
        unit: "ft",
        obs: [
          { t: "2020-01-01T00:00:00Z", r: 10 },
          { t: "2020-06-01T00:00:00Z", r: 11 },
          { t: "2021-01-01T00:00:00Z", r: 12 },
        ],
      },
      { id: 202, name: "Continuous Water Level", unit: "m", obs: [{ t: "2020-03-01T00:00:00Z", r: 5 }] },
    ],
  },
  L2: {
    name: "ALPHA WELL",
    lng: -104.52,
    lat: 33.39,
    datastreams: [
      { id: 203, name: "Total Dissolved Solids", unit: "mg/L", obs: [{ t: "2020-02-01T00:00:00Z", r: 300 }] },
      { id: 204, name: "Empty Series", unit: "ft", obs: [] },
    ],
  },
}

const ALL_DATASTREAMS = Object.values(LOCS).flatMap((l) => l.datastreams)

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, statusText: "OK", json: async () => body } as Response
}

/** Fake fetch that serves the STA fixture, honouring $filter/$orderby/$top. */
function installStaFixture(world: ClientWorld) {
  const fake = async (input: string | URL): Promise<Response> => {
    const url = String(input)
    world.requestedUrls.push(url)

    const things = url.match(/\/Locations\(([^)]+)\)\/Things/)
    if (things) {
      const loc = LOCS[things[1]]
      return jsonResponse({
        value: [
          {
            "@iot.id": 1,
            name: "thing",
            Datastreams: (loc?.datastreams ?? []).map((d) => ({
              "@iot.id": d.id,
              name: d.name,
              unitOfMeasurement: { name: d.unit, symbol: d.unit },
            })),
          },
        ],
      })
    }

    const obsMatch = url.match(/\/Datastreams\((\d+)\)\/Observations/)
    if (obsMatch) {
      const ds = ALL_DATASTREAMS.find((d) => d.id === Number(obsMatch[1]))
      let obs = (ds?.obs ?? []).map((o) => ({
        "@iot.id": Number(obsMatch[1]) * 1000,
        phenomenonTime: o.t,
        result: o.r,
        resultTime: o.t,
      }))
      const params = new URL(url, "http://x").searchParams
      const filter = params.get("$filter") ?? ""
      const ge = filter.match(/phenomenonTime ge ([0-9T:Z-]+)/)
      const le = filter.match(/phenomenonTime le ([0-9T:Z-]+)/)
      if (ge) obs = obs.filter((o) => o.phenomenonTime >= ge[1])
      if (le) obs = obs.filter((o) => o.phenomenonTime <= le[1])
      obs.sort((a, b) => (a.phenomenonTime < b.phenomenonTime ? -1 : 1))
      if (/desc/.test(params.get("$orderby") ?? "")) obs.reverse()
      const top = Number(params.get("$top") ?? 0)
      return jsonResponse({ value: top > 0 ? obs.slice(0, top) : obs })
    }

    return jsonResponse({ value: [] })
  }
  ;(globalThis as { fetch: typeof fetch }).fetch = fake as typeof fetch
}

type World = ClientWorld & {
  selection: Selection
  range?: TimeRange
  csv?: string
  rows?: unknown[][]
  geojson?: GeoJSON.FeatureCollection
}

Given(
  "a selection of monitoring locations with datastreams and observations",
  function (this: World) {
    installStaFixture(this)
    this.selection = {
      locations: Object.entries(LOCS).map(([id, l]) => ({
        layerId: "monitoring",
        id,
        name: l.name,
        longitude: l.lng,
        latitude: l.lat,
        properties: { agency: "CABQ" },
      })),
      features: [],
      counts: { filtered: 2, drawn: 0, total: 2 },
    }
  }
)

Given("the export is configured with a time range", function (this: World) {
  this.range = { from: "2020-05-01", to: "2020-12-31" }
})

Given("one selected datastream has no observations", function () {
  // The fixture's "Empty Series" datastream (204) already has no observations.
})

Given(
  "the selection includes vector features from an OGC API Features layer",
  function (this: World) {
    const feature: Feature = {
      type: "Feature",
      id: "wl-1",
      geometry: { type: "Point", coordinates: [-105.1, 34.2] },
      properties: { id: "wl-1", name: "Summary 1", depth_ft: 42 },
    }
    this.selection.features.push({ layerId: "ocotillo-springs", feature })
  }
)

When("the user exports the selection as time series", async function (this: World) {
  this.rows = await gatherTimeSeriesRows(this.selection.locations, { range: this.range })
  this.csv = timeSeriesCsv(this.rows)
})

When("the user exports the selection as latest observation", async function (this: World) {
  this.rows = await gatherLatestRows(this.selection.locations)
  this.csv = latestCsv(this.rows)
})

When("the user exports the selection as features", async function (this: World) {
  this.geojson = await buildFeaturesGeoJSON(this.selection)
})

// --- shared CSV helpers ---------------------------------------------------

function dataRows(world: World): string[][] {
  return (world.csv ?? "").split("\r\n").slice(1).filter(Boolean).map((l) => l.split(","))
}
function header(world: World): string {
  return (world.csv ?? "").split("\r\n")[0]
}
const col = (h: string) => TIME_SERIES_HEADERS.indexOf(h)

Then("a single CSV file is produced", function (this: World) {
  assert.equal(typeof this.csv, "string")
  assert.ok((this.csv ?? "").length > 0)
})

Then("its header is {string}", function (this: World, expected: string) {
  assert.equal(header(this), expected)
})

Then(
  "every observation across all selected datastreams appears as its own row",
  function (this: World) {
    // No range: 3 (ds201) + 1 (ds202) + 1 (ds203) + 0 (ds204) = 5.
    assert.equal(dataRows(this).length, 5)
  }
)

Then("rows from different datastreams share the one file", function (this: World) {
  const ids = new Set(dataRows(this).map((r) => r[col("datastream_id")]))
  assert.ok(ids.size > 1, "expected rows from more than one datastream")
})

Then(
  "each row's {string} matches its datastream's unit of measurement",
  function (this: World, field: string) {
    const unitFor = new Map(ALL_DATASTREAMS.map((d) => [String(d.id), d.unit]))
    for (const r of dataRows(this)) {
      assert.equal(r[col(field)], unitFor.get(r[col("datastream_id")]))
    }
  }
)

Then("each row's {string} is an ISO 8601 instant", function (this: World, field: string) {
  for (const r of dataRows(this)) {
    assert.match(r[col(field)], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  }
})

Then(
  "only observations whose phenomenon time is within the range are included",
  function (this: World) {
    const from = this.range!.from!
    const to = this.range!.to!
    const times = dataRows(this).map((r) => r[col("phenomenon_time")])
    assert.ok(times.length > 0, "expected at least one in-range row")
    for (const t of times) {
      assert.ok(t >= from && t <= `${to}T23:59:59Z`, `out-of-range row ${t}`)
    }
  }
)

Then("observations outside the range are excluded", function (this: World) {
  const times = dataRows(this).map((r) => r[col("phenomenon_time")])
  assert.ok(!times.includes("2020-01-01T00:00:00Z"))
  assert.ok(!times.includes("2021-01-01T00:00:00Z"))
})

Then("that datastream produces no rows", function (this: World) {
  const names = dataRows(this).map((r) => r[col("datastream_name")])
  assert.ok(!names.includes("Empty Series"))
})

Then("the other datastreams' rows are still present", function (this: World) {
  assert.ok(dataRows(this).length > 0)
})

Then(
  "it contains exactly one row per selected datastream",
  function (this: World) {
    assert.equal(dataRows(this).length, ALL_DATASTREAMS.length)
  }
)

Then("each row holds that datastream's most recent observation", function (this: World) {
  const byId = new Map(dataRows(this).map((r) => [r[col("datastream_id")], r]))
  assert.equal(byId.get("201")?.[col("result")], "12")
  assert.equal(byId.get("203")?.[col("result")], "300")
})

Then("each row includes the location longitude and latitude", function (this: World) {
  for (const r of dataRows(this)) {
    assert.ok(r[col("longitude")].length > 0)
    assert.ok(r[col("latitude")].length > 0)
  }
})

Then("each row includes the observation result time", function (this: World) {
  // result_time is the latest export's last column.
  const idx = "location_id,location_name,longitude,latitude,datastream_id,datastream_name,unit,phenomenon_time,result,result_time"
    .split(",")
    .indexOf("result_time")
  const rows = dataRows(this)
  // ds with observations carry a result_time; the empty one is blank.
  assert.ok(rows.some((r) => (r[idx] ?? "").length > 0))
})

// --- features GeoJSON -----------------------------------------------------

Then("a GeoJSON FeatureCollection is produced", function (this: World) {
  assert.equal(this.geojson?.type, "FeatureCollection")
})

Then("it contains one feature per selected thing", function (this: World) {
  assert.equal(this.geojson!.features.length, this.selection.locations.length)
})

Then("each feature's geometry is its location point", function (this: World) {
  for (const f of this.geojson!.features) {
    assert.equal(f.geometry?.type, "Point")
  }
})

Then("each feature lists its datastreams in properties", function (this: World) {
  for (const f of this.geojson!.features) {
    assert.ok(Array.isArray(f.properties?.datastreams))
    assert.ok((f.properties!.datastreams as unknown[]).length > 0)
  }
})

Then("no observations are included in the GeoJSON", function (this: World) {
  const blob = JSON.stringify(this.geojson)
  assert.ok(!/"result"/.test(blob) && !/"observations"/.test(blob))
})

Then(
  "those features appear in the GeoJSON with their original geometry and properties",
  function (this: World) {
    const passthrough = this.geojson!.features.find((f) => f.id === "wl-1")
    assert.ok(passthrough, "expected the OGC feature to pass through")
    assert.equal(passthrough!.properties?.name, "Summary 1")
    assert.equal((passthrough!.geometry as GeoJSON.Point).coordinates[0], -105.1)
  }
)
