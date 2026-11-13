import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"
import type { Feature, FeatureCollection } from "geojson"

import { sitesCsv, sitesGeoJSON } from "@/lib/export/sites"
import type { ClientWorld } from "./support/world"

/** Two DIE-style sites with different property sets and one nested value. */
const SITES: Feature[] = [
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-106.62, 35.08] },
    properties: { id: "a", feature_id: "NM-1", name: "YALE1", source: "ST2/CABQ", latest_value: 120.5 },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-104.52, 33.39] },
    properties: {
      id: "b",
      feature_id: "NM-2",
      name: "ALPHA, WELL",
      source: "NMBGMR",
      well_depth: 300,
      tags: { aquifer: "Ogallala" },
    },
  },
]

type World = ClientWorld & { csv?: string; geojson?: FeatureCollection }

function csvLines(world: World): string[] {
  return (world.csv ?? "").split("\r\n").filter(Boolean)
}

Given("a selection of map sites", function () {})

When("the user exports the sites as CSV", function (this: World) {
  this.csv = sitesCsv(SITES)
})

When("the user exports the sites as GeoJSON", function (this: World) {
  this.geojson = sitesGeoJSON(SITES)
})

Then("the CSV header begins with {string}", function (this: World, prefix: string) {
  assert.ok(csvLines(this)[0].startsWith(prefix), csvLines(this)[0])
})

Then("the CSV has one row per selected site", function (this: World) {
  assert.equal(csvLines(this).length - 1, SITES.length)
})

Then("each row carries the site's longitude and latitude", function (this: World) {
  const rows = csvLines(this).slice(1)
  assert.ok(rows[0].startsWith("NM-1,YALE1,-106.62,35.08"))
  assert.ok(rows[1].startsWith('NM-2,"ALPHA, WELL",-104.52,33.39'))
})

Then("the CSV has a column for every site property", function (this: World) {
  const header = csvLines(this)[0].split(",")
  for (const k of ["source", "latest_value", "well_depth", "tags"]) assert.ok(header.includes(k), k)
})

Then("it has no internal {string} column", function (this: World, col: string) {
  assert.ok(!csvLines(this)[0].split(",").includes(col))
})

Then("a nested property value appears as JSON in its cell", function (this: World) {
  assert.ok(csvLines(this)[2].includes('"{""aquifer"":""Ogallala""}"'))
})

Then("a GeoJSON FeatureCollection is produced", function (this: World) {
  assert.equal(this.geojson?.type, "FeatureCollection")
})

Then("it contains one feature per selected site", function (this: World) {
  assert.equal(this.geojson!.features.length, SITES.length)
})

Then("each feature keeps its original geometry", function (this: World) {
  this.geojson!.features.forEach((f, i) => assert.deepEqual(f.geometry, SITES[i].geometry))
})

Then("no feature carries an internal {string} property", function (this: World, key: string) {
  for (const f of this.geojson!.features) assert.ok(!(key in (f.properties ?? {})))
})
