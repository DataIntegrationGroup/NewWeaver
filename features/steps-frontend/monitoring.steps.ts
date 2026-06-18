import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

const POINT = { layerId: "monitoring-locations", featureId: "1" }

async function clickPoint(world: BrowserWorld) {
  await world.selectFeature(POINT.layerId, POINT.featureId)
  await world.page.getByTestId("inspect-panel").waitFor()
}

async function openDatastreams(world: BrowserWorld) {
  await world.page.getByTestId("datastream-select").click()
  await world.page.getByRole("option").first().waitFor()
}

async function selectDatastream(world: BrowserWorld, name: string | RegExp) {
  await world.page.getByTestId("datastream-select").click()
  await world.page.getByRole("option", { name }).click()
}

When("the user clicks a monitoring point", clickPoint)
When("the user clicks a monitoring point with water-level data", clickPoint)
Given("the user has clicked a monitoring point", clickPoint)

Then("a panel opens showing the location name", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-panel").waitFor()
  const title = await this.page.getByTestId("inspect-title").textContent()
  assert.equal(title?.trim(), "YALE1")
})

Then("the panel lists the datastreams available for that point", async function (this: BrowserWorld) {
  await openDatastreams(this)
  assert.ok((await this.page.getByRole("option").count()) > 0)
})

Then("the datastream list includes manual water-level measurements", async function (this: BrowserWorld) {
  await openDatastreams(this)
  await this.page.getByRole("option", { name: /Manual Water Level/ }).waitFor()
})

Then("the datastream list includes continuous water-level measurements", async function (this: BrowserWorld) {
  // The list is already open from the previous step.
  await this.page.getByRole("option", { name: /Continuous Water Level/ }).waitFor()
})

When("the user selects a datastream", async function (this: BrowserWorld) {
  await selectDatastream(this, /Continuous Water Level/)
})

Given(
  "the user has selected a continuous water-level datastream with many observations",
  async function (this: BrowserWorld) {
    await clickPoint(this)
    await selectDatastream(this, /Continuous Water Level/)
  }
)

When("the user selects a datastream with no observations", async function (this: BrowserWorld) {
  await selectDatastream(this, /Empty Series/)
})

Then("a time-series chart plots its observations over time", async function (this: BrowserWorld) {
  await this.page.getByTestId("datastream-chart").waitFor()
})

Then("the y axis is titled with the unit of measurement", async function (this: BrowserWorld) {
  const chart = this.page.getByTestId("datastream-chart")
  const title = await chart.getAttribute("data-y-title")
  assert.ok(title?.includes("ft"), `expected unit in y title "${title}"`)
})

Then("the y axis is inverted so zero is at the top", async function (this: BrowserWorld) {
  const chart = this.page.getByTestId("datastream-chart")
  assert.equal(await chart.getAttribute("data-y-inverse"), "true")
})

Then("the y axis is scaled to the data", async function (this: BrowserWorld) {
  const chart = this.page.getByTestId("datastream-chart")
  assert.equal(await chart.getAttribute("data-y-scale"), "true")
})

Then("the chart shows a loading indicator while observations are fetched", async function (this: BrowserWorld) {
  await this.page.getByTestId("chart-loading").waitFor()
})

Then("the chart renders once observations have loaded", async function (this: BrowserWorld) {
  await this.page.getByTestId("datastream-chart").waitFor()
})

Then('the chart area shows a "no observations" message', async function (this: BrowserWorld) {
  await this.page.getByTestId("chart-empty").waitFor()
})

Then("no chart is drawn", async function (this: BrowserWorld) {
  assert.equal(await this.page.getByTestId("datastream-chart").count(), 0)
})

When("the user closes the detail panel", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-close").click()
})

Then("the panel is no longer visible", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-panel").waitFor({ state: "detached" })
})

Then("the point is no longer highlighted on the map", async function (this: BrowserWorld) {
  assert.ok(!this.page.url().includes("sel="))
})
