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
    (window as unknown as { __weaverMap: MapSeam }).__weaverMap.queryRendered("monitoring-locations-points")
  )
  assert.equal(props.length, 0)
})

Then(
  "the catalog contains a {string} layer sourced from {string}",
  async function (this: BrowserWorld, title: string, source: string) {
    const layer = LAYER_CATALOG.find((l) => l.title === title)
    assert.ok(layer, `no layer titled "${title}"`)
    assert.equal(layer!.source, source)
  }
)
