import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import { LAYER_CATALOG } from "@/catalog/layers"
import type { BrowserWorld } from "./support/world"
import { layerIdByTitle } from "./common.steps"

type MapSeam = { queryRendered: (layerId: string) => unknown[] }

function renderLayerIdFor(title: string): string {
  const layer = LAYER_CATALOG.find((l) => l.title === title)!
  return layer.source === "sta" ? `${layer.id}-points` : `${layer.id}-render`
}

Then("the user sees a layer for each catalog entry", async function (this: BrowserWorld) {
  const count = await this.page.locator('[data-testid^="layer-row-"]').count()
  assert.equal(count, LAYER_CATALOG.length)
})

Then("each layer shows its title and description", async function (this: BrowserWorld) {
  for (const layer of LAYER_CATALOG) {
    const row = this.page.getByTestId(`layer-row-${layer.id}`)
    assert.ok((await row.textContent())?.includes(layer.title), layer.title)
  }
})

When("the user toggles the {string} layer on", async function (this: BrowserWorld, title: string) {
  const sw = this.page.getByTestId(`layer-toggle-${layerIdByTitle(title)}`)
  if ((await sw.getAttribute("data-state")) !== "checked") await sw.click()
})

When("the user toggles the {string} layer off", async function (this: BrowserWorld, title: string) {
  const sw = this.page.getByTestId(`layer-toggle-${layerIdByTitle(title)}`)
  if ((await sw.getAttribute("data-state")) === "checked") await sw.click()
})

Then("the {string} features render on the map", async function (this: BrowserWorld, title: string) {
  const layerId = renderLayerIdFor(title)
  await this.page.waitForFunction(
    (id) => (window as unknown as { __weaverMap: MapSeam }).__weaverMap.queryRendered(id).length > 0,
    layerId
  )
})

Then("no monitoring-location points render on the map", async function (this: BrowserWorld) {
  const props = await this.page.evaluate(() =>
    (window as unknown as { __weaverMap: MapSeam }).__weaverMap.queryRendered("st2-cabq-points")
  )
  assert.equal(props.length, 0)
})

Then("the catalog shows a {string} layer group", async function (this: BrowserWorld, name: string) {
  await this.page.getByRole("button", { name, exact: true }).waitFor()
})

Then("the {string} layer has an opacity slider", async function (this: BrowserWorld, title: string) {
  await this.page.getByTestId(`layer-opacity-${layerIdByTitle(title)}`).waitFor()
})

When("the user hovers over the {string} layer group", async function (this: BrowserWorld, name: string) {
  // Move away first so re-hovering a second group reliably re-opens the tooltip.
  await this.page.mouse.move(0, 0)
  await this.page.getByRole("button", { name, exact: true }).hover()
})

Then("a tooltip explains the {string} group", async function (this: BrowserWorld, name: string) {
  const tip = this.page.getByTestId(`layer-group-tooltip-${name}`).first()
  await tip.waitFor()
  assert.ok(((await tip.textContent()) ?? "").length > 20, "expected descriptive tooltip text")
})

When("the user collapses the {string} layer group", async function (this: BrowserWorld, name: string) {
  const trigger = this.page.getByRole("button", { name, exact: true })
  if ((await trigger.getAttribute("aria-expanded")) === "true") await trigger.click()
})

When("the user expands the {string} layer group", async function (this: BrowserWorld, name: string) {
  const trigger = this.page.getByRole("button", { name, exact: true })
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click()
})

Then("the {string} layer toggle is hidden", async function (this: BrowserWorld, title: string) {
  await this.page.getByTestId(`layer-toggle-${layerIdByTitle(title)}`).waitFor({ state: "hidden" })
})

Then("the {string} layer toggle is visible", async function (this: BrowserWorld, title: string) {
  await this.page.getByTestId(`layer-toggle-${layerIdByTitle(title)}`).waitFor({ state: "visible" })
})

Then("the {string} layer shows a loading indicator", async function (this: BrowserWorld, title: string) {
  await this.page.getByTestId(`layer-loading-${layerIdByTitle(title)}`).waitFor()
})

Then(
  "the {string} loading indicator clears once data has loaded",
  async function (this: BrowserWorld, title: string) {
    await this.page
      .getByTestId(`layer-loading-${layerIdByTitle(title)}`)
      .waitFor({ state: "detached" })
  }
)

Then(
  "the catalog contains a {string} layer sourced from {string}",
  async function (this: BrowserWorld, title: string, source: string) {
    const layer = LAYER_CATALOG.find((l) => l.title === title)
    assert.ok(layer, `no layer titled "${title}"`)
    assert.equal(layer!.source, source)
  }
)
