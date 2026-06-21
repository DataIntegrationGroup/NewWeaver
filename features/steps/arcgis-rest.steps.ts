import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import { ArcGisRestClient } from "@/clients/arcGisRest"
import type { ClientWorld } from "./support/world"

const OSE_LAYER =
  "https://services2.arcgis.com/qXZbWTdPDbTjl7Dy/arcgis/rest/services/OSE_Points_of_Diversion/FeatureServer/0"

/** ArcGIS f=geojson FeatureCollection, optionally flagging more pages. */
function fc(ids: (number | string)[], exceededTransferLimit = false) {
  return {
    type: "FeatureCollection",
    exceededTransferLimit,
    features: ids.map((id) => ({
      type: "Feature",
      id,
      geometry: { type: "Point", coordinates: [-106, 34] },
      properties: { objectid: id },
    })),
  }
}

Given("an ArcGIS REST client pointed at an OSE FeatureServer layer", function (this: ClientWorld) {
  this.arcgis = new ArcGisRestClient(OSE_LAYER)
})

When("the client queries the layer", async function (this: ClientWorld) {
  this.responseQueue = [fc([1, 2])]
  this.result = await this.arcgis.query()
})

Then("the request asks for GeoJSON output", function (this: ClientWorld) {
  const url = new URL(this.lastUrl)
  assert.equal(url.searchParams.get("f"), "geojson")
})

// "the response is a GeoJSON FeatureCollection" is shared with features.steps.

Then('the request URL selects where {string}', function (this: ClientWorld, where: string) {
  const url = new URL(this.lastUrl)
  assert.equal(url.searchParams.get("where"), where)
})

Then("the request URL selects all out fields", function (this: ClientWorld) {
  const url = new URL(this.lastUrl)
  assert.equal(url.searchParams.get("outFields"), "*")
})

// "a bounding box covering central New Mexico" is shared with features.steps.

When("the client queries the layer within that bounding box", async function (this: ClientWorld) {
  const bbox = this.result as [number, number, number, number]
  this.responseQueue = [fc([1])]
  this.result = await this.arcgis.query({ bbox })
})

Then("the request URL carries an envelope geometry with four coordinates", function (this: ClientWorld) {
  const url = new URL(this.lastUrl)
  const geom = url.searchParams.get("geometry")
  assert.ok(geom, "geometry param missing")
  assert.equal(geom!.split(",").length, 4)
})

Then("the request URL declares the geometry as an esri envelope", function (this: ClientWorld) {
  const url = new URL(this.lastUrl)
  assert.equal(url.searchParams.get("geometryType"), "esriGeometryEnvelope")
})

When("the client queries the layer with a count of {int} at offset {int}", async function (this: ClientWorld, count: number, offset: number) {
  this.responseQueue = [fc([1])]
  this.result = await this.arcgis.query({ resultRecordCount: count, resultOffset: offset })
})

// "the request URL includes {string}" is shared with sensorthings.steps
// (parses key=value against the query string).

Given(
  "the layer returns a full page of 2 with more available then a final page of 1",
  function (this: ClientWorld) {
    this.responseQueue = [fc([1, 2], true), fc([3], false)]
  }
)

When("the client fetches all features with a page size of {int}", async function (this: ClientWorld, pageSize: number) {
  this.result = await this.arcgis.getAllFeatures(undefined, pageSize)
})

Then("all {int} features across the pages are returned", function (this: ClientWorld, n: number) {
  const res = this.result as { features: unknown[] }
  assert.equal(res.features.length, n)
})

Then("the requests advance the result offset from {int} to {int}", function (this: ClientWorld, a: number, b: number) {
  const offsets = this.requestedUrls.map((u) => new URL(u).searchParams.get("resultOffset"))
  assert.ok(offsets.includes(String(a)), `expected a resultOffset=${a} request`)
  assert.ok(offsets.includes(String(b)), `expected a resultOffset=${b} request`)
})

Given(
  "the layer reports 3 features and returns pages of 2 then 1",
  function (this: ClientWorld) {
    // First response answers returnCountOnly; the rest are the offset pages.
    this.responseQueue = [{ count: 3 }, fc([1, 2]), fc([3])]
  }
)

Given(
  "the layer will not report a count and returns 2 then a final page of 1",
  function (this: ClientWorld) {
    // An empty count response forces the serial fallback, which then pages.
    this.responseQueue = [{}, fc([1, 2], true), fc([3])]
  }
)

When("the client fetches all features in parallel with a page size of {int}", async function (this: ClientWorld, pageSize: number) {
  this.result = await this.arcgis.getAllFeaturesParallel(undefined, pageSize)
})

When("the client fetches the feature with ObjectID {int}", async function (this: ClientWorld, oid: number) {
  this.responseQueue = [fc([oid])]
  this.result = await this.arcgis.getFeature(oid)
})

Given("the FeatureServer returns a {int} status", function (this: ClientWorld, status: number) {
  this.failStatus = status
})

When("the client queries the layer and it fails", async function (this: ClientWorld) {
  try {
    this.result = await this.arcgis.query()
  } catch (e) {
    this.error = e as Error
  }
})

Then("the client throws an error describing the failed ArcGIS request", function (this: ClientWorld) {
  assert.ok(this.error, "expected an error")
  assert.match(this.error!.message, /ArcGIS request failed/)
})
