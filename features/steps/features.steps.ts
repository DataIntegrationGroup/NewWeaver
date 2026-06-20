import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import { OgcFeaturesClient } from "@/clients/ogcFeatures"
import type { ClientWorld } from "./support/world"

const PYGEOAPI = "https://features.example.org"

Given("an OGC API Features client pointed at the DIE pygeoapi endpoint", function (this: ClientWorld) {
  this.features = new OgcFeaturesClient(PYGEOAPI)
})

When("the client requests the collections list", async function (this: ClientWorld) {
  this.result = await this.features.listCollections()
})

Then('the response contains a "collections" array', function (this: ClientWorld) {
  const res = this.result as { collections: unknown[] }
  assert.ok(Array.isArray(res.collections))
})

Then("each collection has an id and links", function (this: ClientWorld) {
  const res = this.result as { collections: { id: string; links: unknown[] }[] }
  for (const c of res.collections) {
    assert.ok(c.id)
    assert.ok(Array.isArray(c.links))
  }
})

When("the client requests items for collection {string}", async function (this: ClientWorld, collectionId: string) {
  this.result = await this.features.getItems(collectionId)
})

Then("the request asks for JSON output", function (this: ClientWorld) {
  const url = new URL(this.lastUrl)
  assert.equal(url.searchParams.get("f"), "json")
})

Then("the response is a GeoJSON FeatureCollection", function (this: ClientWorld) {
  const res = this.result as { type: string }
  assert.equal(res.type, "FeatureCollection")
})

Given("a bounding box covering central New Mexico", function (this: ClientWorld) {
  this.result = [-107, 34, -106, 35]
})

When("the client requests items within that bounding box", async function (this: ClientWorld) {
  const bbox = this.result as [number, number, number, number]
  this.result = await this.features.getItems("water_levels_summary", { bbox })
})

Then('the request URL includes a "bbox" parameter with four coordinates', function (this: ClientWorld) {
  const url = new URL(this.lastUrl)
  const bbox = url.searchParams.get("bbox")
  assert.ok(bbox, "bbox param missing")
  assert.equal(bbox!.split(",").length, 4)
})

When("the client requests items with a limit of {int} and an offset of {int}", async function (this: ClientWorld, limit: number, offset: number) {
  this.result = await this.features.getItems("water_levels_summary", { limit, offset })
})

When("the client requests feature {string} from collection {string}", async function (this: ClientWorld, featureId: string, collectionId: string) {
  this.result = await this.features.getItem(collectionId, featureId)
})

Given("the pygeoapi endpoint returns a {int} status", function (this: ClientWorld, status: number) {
  this.failStatus = status
})

When("the client requests items for a collection", async function (this: ClientWorld) {
  try {
    this.result = await this.features.getItems("water_levels_summary")
  } catch (e) {
    this.error = e as Error
  }
})

Then("the client throws an error describing the failed Features request", function (this: ClientWorld) {
  assert.ok(this.error, "expected an error")
  assert.match(this.error!.message, /Features request failed/)
})

function fc(ids: string[]) {
  return {
    type: "FeatureCollection",
    numberMatched: 3,
    numberReturned: ids.length,
    features: ids.map((id) => ({ type: "Feature", id, geometry: null, properties: { id } })),
  }
}

Given(
  "the endpoint returns a full page of 2 then a short final page of 1",
  function (this: ClientWorld) {
    this.responseQueue = [fc(["a", "b"]), fc(["c"])]
  }
)

When(
  "the client requests all items for collection {string} with a page size of {int}",
  async function (this: ClientWorld, collectionId: string, pageSize: number) {
    this.result = await this.features.getAllItems(collectionId, undefined, pageSize)
  }
)

Then("all {int} items across the pages are returned", function (this: ClientWorld, n: number) {
  const res = this.result as { features: unknown[] }
  assert.equal(res.features.length, n)
})

Then("the requests advance the offset from {int} to {int}", function (this: ClientWorld, a: number, b: number) {
  const offsets = this.requestedUrls.map((u) => new URL(u).searchParams.get("offset"))
  assert.ok(offsets.includes(String(a)), `expected an offset=${a} request`)
  assert.ok(offsets.includes(String(b)), `expected an offset=${b} request`)
})
