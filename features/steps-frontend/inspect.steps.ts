import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

const LAYER = "ocotillo-springs"

async function clickFeature(world: BrowserWorld, id: string) {
  await world.selectFeature(LAYER, id)
  await world.page.getByTestId("inspect-panel").waitFor()
}

When("the user clicks a vector feature", async function (this: BrowserWorld) {
  await clickFeature(this, "wl-1")
})
Given("the user has clicked a vector feature", async function (this: BrowserWorld) {
  await clickFeature(this, "wl-1")
})

Then("an inspect panel opens", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-panel").waitFor()
})

Then("the panel lists the feature's attribute names and values", async function (this: BrowserWorld) {
  const text = await this.page.getByTestId("attribute-list").textContent()
  assert.ok(text?.includes("name"))
  assert.ok(text?.includes("Summary 1"))
})

When("the user clicks a different vector feature", async function (this: BrowserWorld) {
  await this.selectFeature(LAYER, "wl-2")
  await this.page.getByTestId("attribute-list").getByText("Summary 2").waitFor()
})

Then("the inspect panel updates to the newly selected feature", async function (this: BrowserWorld) {
  const text = await this.page.getByTestId("attribute-list").textContent()
  assert.ok(text?.includes("Summary 2"))
  assert.ok(!text?.includes("Summary 1 "))
})

When("the user closes the inspect panel", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-close").click()
})

Then("the inspect panel is no longer visible", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-panel").waitFor({ state: "detached" })
})

Then("the feature is no longer highlighted", async function (this: BrowserWorld) {
  assert.ok(!this.page.url().includes("sel="))
})

When("the user clicks an empty area of the map", async function (this: BrowserWorld) {
  await this.page.evaluate(() =>
    (window as unknown as { __weaver: { clearSelection: () => void } }).__weaver.clearSelection()
  )
})

Then("the inspect panel closes", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-panel").waitFor({ state: "detached" })
})
