import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

type MapSeam = {
  jumpTo: (lng: number, lat: number, zoom: number) => void
  getCenter: () => { lng: number; lat: number }
}

/** A Water Levels fixture site (support/fixtures DIE_WATER_LEVELS). */
export const SITE = { layerId: "water-levels", featureId: "NMBGMR:WL-0001" }

When("the user pans and zooms the map", async function (this: BrowserWorld) {
  await this.page.evaluate(() =>
    (window as unknown as { __weaverMap: MapSeam }).__weaverMap.jumpTo(-105, 34, 8)
  )
})

Then("the URL records the current map extent", async function (this: BrowserWorld) {
  await this.page.waitForFunction(() => /[?&]z=/.test(window.location.search))
})

When("the user selects a site on the map", async function (this: BrowserWorld) {
  await this.selectFeature(SITE.layerId, SITE.featureId)
})

Then("the URL records the selected feature", async function (this: BrowserWorld) {
  await this.page.waitForFunction(() => /[?&]sel=/.test(window.location.search))
})

Given(
  "a URL that encodes a dataset, a filter, a map extent, and a selected site",
  function (this: BrowserWorld) {
    // Search values are JSON where they aren't plain strings (TanStack Router's
    // default search serializer). The filter keeps every "Last measured" bin
    // but "Within 2 years" (key 0), leaving 4 of the 5 fixture sites; the
    // selected site is one of the 4.
    const params = new URLSearchParams({
      ds: "water-levels",
      f: JSON.stringify({ last: ["1", "2", "3", "none"] }),
      lng: "-105",
      lat: "34",
      z: "7",
      sel: `${SITE.layerId}~USGS-NWIS:WL-0002`,
    })
    ;(this as unknown as { shared: string }).shared = `?${params}`
  }
)

When("the user opens that URL", async function (this: BrowserWorld) {
  await this.open((this as unknown as { shared: string }).shared)
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

When("the user navigates back", async function (this: BrowserWorld) {
  await this.page.goBack()
})
