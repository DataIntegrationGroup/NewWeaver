import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

type MapSeam = {
  jumpTo: (lng: number, lat: number, zoom: number) => void
  getCenter: () => { lng: number; lat: number }
}

async function switchOn(world: BrowserWorld, id: string): Promise<boolean> {
  return (
    (await world.page.getByTestId(`layer-toggle-${id}`).getAttribute("data-state")) === "checked"
  )
}

Then('the URL records "Springs" as a visible layer', async function (this: BrowserWorld) {
  assert.ok(this.page.url().includes("ocotillo-springs"))
})

When("the user pans and zooms the map", async function (this: BrowserWorld) {
  await this.page.evaluate(() =>
    (window as unknown as { __weaverMap: MapSeam }).__weaverMap.jumpTo(-105, 34, 8)
  )
})

Then("the URL records the current map extent", async function (this: BrowserWorld) {
  await this.page.waitForFunction(() => /[?&]z=/.test(window.location.search))
})

Then("the URL records the selected feature", async function (this: BrowserWorld) {
  await this.page.waitForFunction(() => /[?&]sel=/.test(window.location.search))
})

Given(
  "a URL that encodes visible layers, a map extent, and a selected feature",
  function (this: BrowserWorld) {
    ;(this as unknown as { shared: string }).shared =
      "?layers=st2-cabq,ocotillo-springs&lng=-105&lat=34&z=7&sel=ocotillo-springs~wl-1"
  }
)

When("the user opens that URL", async function (this: BrowserWorld) {
  await this.open((this as unknown as { shared: string }).shared)
})

Then("the recorded layers are visible", async function (this: BrowserWorld) {
  assert.ok(await switchOn(this, "st2-cabq"))
  assert.ok(await switchOn(this, "ocotillo-springs"))
})

Then("the map opens at the recorded extent", async function (this: BrowserWorld) {
  const center = await this.page.evaluate(
    () => (window as unknown as { __weaverMap: MapSeam }).__weaverMap.getCenter()
  )
  assert.ok(Math.abs(center.lng + 105) < 2, `lng ${center.lng}`)
  assert.ok(Math.abs(center.lat - 34) < 2, `lat ${center.lat}`)
})

Then("the recorded feature is selected with its detail shown", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-panel").waitFor()
})

Given("the user has changed layers and extent", async function (this: BrowserWorld) {
  await this.page.getByTestId("layer-toggle-ocotillo-latest-tds-wells").click()
  await this.page.waitForFunction(() =>
    /ocotillo-latest-tds-wells/.test(window.location.search)
  )
})

When("the user navigates back", async function (this: BrowserWorld) {
  await this.page.goBack()
})

Then("the previous view is restored from the URL", async function (this: BrowserWorld) {
  await this.page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="layer-toggle-ocotillo-latest-tds-wells"]')
        ?.getAttribute("data-state") !== "checked"
  )
})
