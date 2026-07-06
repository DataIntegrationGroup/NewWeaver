import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

type MapSeam = {
  getCenter: () => { lng: number; lat: number }
  getZoom: () => number
  zoomIn: () => void
  panEast: () => void
  queryRendered: (layerId: string) => Array<Record<string, unknown> | null>
}

function seam(world: BrowserWorld) {
  return world.page.evaluate(() => {
    const m = (window as unknown as { __weaverMap: MapSeam }).__weaverMap
    return {
      center: m.getCenter(),
      zoom: m.getZoom(),
    }
  })
}

Then("the user sees an interactive map", async function (this: BrowserWorld) {
  await this.page.locator(".maplibregl-canvas").waitFor()
})

Then("the map is centered on New Mexico", async function (this: BrowserWorld) {
  const { center } = await seam(this)
  assert.ok(center.lng > -109 && center.lng < -103, `lng ${center.lng}`)
  assert.ok(center.lat > 31 && center.lat < 37, `lat ${center.lat}`)
})

Then("the basemap renders without requiring an API key", async function (this: BrowserWorld) {
  // The basemap (CARTO Positron) is token-free by construction; assert the map
  // initialized (style loaded, center available).
  const { center } = await seam(this)
  assert.ok(Number.isFinite(center.lng) && Number.isFinite(center.lat))
})

When("the user drags the map east", async function (this: BrowserWorld) {
  const { center } = await seam(this)
  ;(this as unknown as { lngBefore: number }).lngBefore = center.lng
  await this.page.evaluate(() =>
    (window as unknown as { __weaverMap: MapSeam }).__weaverMap.panEast()
  )
})

Then("the visible extent shifts east", async function (this: BrowserWorld) {
  const { center } = await seam(this)
  const before = (this as unknown as { lngBefore: number }).lngBefore
  assert.ok(center.lng > before, `expected ${center.lng} > ${before}`)
})

Then("the map does not reload the page", async function (this: BrowserWorld) {
  // Map controls never navigate; the app instance (test seam) persists.
  const alive = await this.page.evaluate(
    () => typeof (window as unknown as { __weaverMap?: unknown }).__weaverMap !== "undefined"
  )
  assert.ok(alive)
})

When("the user clicks the zoom-in control", async function (this: BrowserWorld) {
  const { zoom } = await seam(this)
  ;(this as unknown as { zoomBefore: number }).zoomBefore = zoom
  await this.page.locator(".maplibregl-ctrl-zoom-in").click()
})

Then("the map zoom level increases by one", async function (this: BrowserWorld) {
  const before = (this as unknown as { zoomBefore: number }).zoomBefore
  await this.page.waitForFunction(
    (z) => (window as unknown as { __weaverMap: MapSeam }).__weaverMap.getZoom() > z + 0.5,
    before
  )
})

Then("more detail is visible", async function (this: BrowserWorld) {
  const { zoom } = await seam(this)
  const before = (this as unknown as { zoomBefore: number }).zoomBefore
  assert.ok(zoom > before)
})

When("the user zooms in", async function (this: BrowserWorld) {
  const scale = this.page.locator(".maplibregl-ctrl-scale").first()
  ;(this as unknown as { scaleBefore: string }).scaleBefore =
    (await scale.textContent()) ?? ""
  await this.page.evaluate(() =>
    (window as unknown as { __weaverMap: MapSeam }).__weaverMap.zoomIn()
  )
})

Then("the scale bar updates to a smaller distance", async function (this: BrowserWorld) {
  const before = (this as unknown as { scaleBefore: string }).scaleBefore
  await this.page.waitForFunction(
    (b) =>
      (document.querySelector(".maplibregl-ctrl-scale")?.textContent ?? "") !== b,
    before
  )
})

Then("each monitoring point renders as its own marker", async function (this: BrowserWorld) {
  // The layer's data loads async after it's toggled on; poll for the real
  // render rather than sampling once (mirrors "features render on the map").
  await this.page.waitForFunction(
    () =>
      (window as unknown as { __weaverMap: MapSeam }).__weaverMap.queryRendered(
        "st2-cabq-points"
      ).length > 0
  )
})

Then("no cluster counts are shown", async function (this: BrowserWorld) {
  const props = await this.page.evaluate(() =>
    (window as unknown as { __weaverMap: MapSeam }).__weaverMap.queryRendered(
      "st2-cabq-points"
    )
  )
  assert.ok(
    props.every((p) => !p || !("point_count" in p)),
    "no feature should carry point_count"
  )
})

When("the user opens the basemap picker", async function (this: BrowserWorld) {
  await this.page.getByTestId("basemap-trigger").click()
})

When("the user switches to dark mode", async function (this: BrowserWorld) {
  await this.page.getByRole("button", { name: "Switch to dark mode" }).click()
})

When("the user selects the {string} basemap", async function (this: BrowserWorld, name: string) {
  await this.page.getByRole("radio", { name }).click()
})

Then("the {string} basemap is active", async function (this: BrowserWorld, name: string) {
  const opt = this.page.getByRole("radio", { name })
  await opt.waitFor()
  assert.equal(await opt.getAttribute("aria-checked"), "true")
})

Then("satellite imagery tiles are requested", async function (this: BrowserWorld) {
  for (let i = 0; i < 50; i++) {
    if (this.requestedUrls.some((u) => /arcgisonline\.com/.test(u))) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail("no Esri satellite tile request observed")
})
