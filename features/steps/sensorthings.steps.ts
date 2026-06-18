import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import { SensorThingsClient } from "@/clients/sensorThings"
import type { ClientWorld } from "./support/world"

const FROST = "https://sta.example.org/FROST/v1.1"

Given("a SensorThings client pointed at the FROST endpoint", function (this: ClientWorld) {
  this.sta = new SensorThingsClient(FROST)
})

When("the client requests Locations", async function (this: ClientWorld) {
  try {
    this.result = await this.sta.listLocations()
  } catch (e) {
    this.error = e as Error
  }
})

Then('the response contains a "value" array of locations', function (this: ClientWorld) {
  const res = this.result as { value: unknown[] }
  assert.ok(Array.isArray(res.value), "expected a value array")
})

Then("each location has a GeoJSON geometry in EPSG:4326", function (this: ClientWorld) {
  const res = this.result as { value: { location: { type: string; coordinates: number[] } }[] }
  for (const loc of res.value) {
    assert.ok(loc.location, "location geometry missing")
    assert.equal(loc.location.type, "Point")
    assert.equal(loc.location.coordinates.length, 2)
  }
})

Given('a Locations response with an "@iot.nextLink"', async function (this: ClientWorld) {
  const nextLink = `${FROST}/Locations?$skip=1`
  this.responseQueue.push({ value: [{ "@iot.id": 1, name: "L1", location: { type: "Point", coordinates: [-106, 34] } }], "@iot.nextLink": nextLink })
  this.result = await this.sta.listLocations()
})

When("the client requests the next page", async function (this: ClientWorld) {
  const first = this.result as { "@iot.nextLink": string }
  this.responseQueue.push({ value: [{ "@iot.id": 2, name: "L2", location: { type: "Point", coordinates: [-105, 35] } }] })
  this.result = await this.sta.nextPage(first["@iot.nextLink"])
})

Then("it fetches the nextLink URL", function (this: ClientWorld) {
  assert.match(this.lastUrl, /\$skip=1/)
})

Then("it returns the next batch of locations", function (this: ClientWorld) {
  const res = this.result as { value: { "@iot.id": number }[] }
  assert.equal(res.value[0]["@iot.id"], 2)
})

Given("a Thing with id {int}", function (this: ClientWorld, id: number) {
  this.result = id
})

When("the client requests datastreams for that Thing", async function (this: ClientWorld) {
  const id = this.result as number
  this.result = await this.sta.datastreamsForThing(id)
})

Then("the request targets {string}", function (this: ClientWorld, path: string) {
  assert.ok(
    this.lastUrl.includes(path),
    `expected ${this.lastUrl} to include ${path}`
  )
})

Given("a datastream with id {int}", function (this: ClientWorld, id: number) {
  this.result = id
})

When("the client requests its observations without an order", async function (this: ClientWorld) {
  const id = this.result as number
  this.result = await this.sta.observationsForDatastream(id)
})

Then("the request orders observations by {string}", function (this: ClientWorld, order: string) {
  const url = new URL(this.lastUrl)
  assert.equal(url.searchParams.get("$orderby"), order)
})

When("the client lists {string} with option {string}", async function (this: ClientWorld, entity: string, option: string) {
  const [key, value] = option.split(/=(.*)/s)
  this.result = await this.sta.listCollection(entity, { [key]: value })
})

Then("the request URL includes {string}", function (this: ClientWorld, option: string) {
  const [key, value] = option.split(/=(.*)/s)
  const url = new URL(this.lastUrl)
  assert.equal(url.searchParams.get(key), value, `param ${key} mismatch in ${this.lastUrl}`)
})

Given("the FROST endpoint returns a {int} status", function (this: ClientWorld, status: number) {
  this.failStatus = status
})

Then("the client throws an error describing the failed STA request", function (this: ClientWorld) {
  assert.ok(this.error, "expected an error")
  assert.match(this.error!.message, /STA request failed/)
})
