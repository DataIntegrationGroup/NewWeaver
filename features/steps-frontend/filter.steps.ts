import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"
import { renderLayer } from "./common.steps"

type MapSeam = {
  jumpTo: (lng: number, lat: number, zoom: number) => void
  queryRendered: (layerId: string) => unknown[]
}

async function ensureTableOpen(world: BrowserWorld) {
  if ((await world.page.getByTestId("attribute-table").count()) === 0) {
    await world.page.getByTestId("toggle-table").click()
    await world.page.getByTestId("attribute-table").waitFor()
  }
}

async function tableCount(world: BrowserWorld): Promise<number> {
  const text = (await world.page.getByTestId("table-count").textContent()) ?? ""
  return Number(text.match(/(\d+)/)?.[1] ?? "-1")
}

async function setSwitch(world: BrowserWorld, on: boolean) {
  await world.openSiteSearch()
  const sw = world.page.locator('[data-testid="filter-bbox"]:visible')
  if (((await sw.getAttribute("aria-checked")) === "true") !== on) await sw.click()
}

When('the user enables "filter to map view"', async function (this: BrowserWorld) {
  await setSwitch(this, true)
})

Given('"filter to map view" is enabled', async function (this: BrowserWorld) {
  await setSwitch(this, true)
})

When('the user disables "filter to map view"', async function (this: BrowserWorld) {
  await setSwitch(this, false)
})

When("the user pans to a new area", async function (this: BrowserWorld) {
  await this.page.evaluate(() =>
    (window as unknown as { __weaverMap: MapSeam }).__weaverMap.jumpTo(-106.62, 35.08, 12)
  )
})

Then("only data within the current map extent is shown", async function (this: BrowserWorld) {
  await this.page.waitForFunction(
    (id) => (window as unknown as { __weaverMap: MapSeam }).__weaverMap.queryRendered(id).length === 1,
    renderLayer()
  )
})

Then("the displayed counts update to match the extent", async function (this: BrowserWorld) {
  await ensureTableOpen(this)
  await this.page.waitForFunction(() => {
    const t = document.querySelector('[data-testid="table-count"]')?.textContent ?? ""
    return /\b1\b/.test(t)
  })
  assert.equal(await tableCount(this), 1)
})

Then("data outside the current extent is shown again", async function (this: BrowserWorld) {
  await ensureTableOpen(this)
  await this.page.waitForFunction(() => {
    const t = document.querySelector('[data-testid="table-count"]')?.textContent ?? ""
    return /\b5\b/.test(t)
  })
  assert.equal(await tableCount(this), 5)
})

When("the user types a search term into the feature filter", async function (this: BrowserWorld) {
  await ensureTableOpen(this)
  await this.openSiteSearch()
  ;(this as unknown as { totalBefore: number }).totalBefore = await tableCount(this)
  await this.page.locator('[data-testid="filter-text"]:visible').fill("Yale")
})

Then("only features whose attributes match the term remain visible", async function (this: BrowserWorld) {
  const before = (this as unknown as { totalBefore: number }).totalBefore
  await this.page.waitForFunction(
    (b) => {
      const t = document.querySelector('[data-testid="table-count"]')?.textContent ?? ""
      const n = Number(t.match(/(\d+)/)?.[1] ?? "-1")
      return n > 0 && n < b
    },
    before
  )
})

When("the user types a search term that matches no features", async function (this: BrowserWorld) {
  await ensureTableOpen(this)
  await this.openSiteSearch()
  await this.page.locator('[data-testid="filter-text"]:visible').fill("zzzzzznomatch")
})

Then('the user sees a "no results" message', async function (this: BrowserWorld) {
  await this.page.getByTestId("no-results").waitFor()
})

Then("the map shows no features for that layer", async function (this: BrowserWorld) {
  await this.page.waitForFunction(
    (id) => (window as unknown as { __weaverMap: MapSeam }).__weaverMap.queryRendered(id).length === 0,
    renderLayer()
  )
})

Then("the map shows an empty-filter message", async function (this: BrowserWorld) {
  await this.page.getByTestId("empty-filter").waitFor()
})

When("the user focuses the filter info button", async function (this: BrowserWorld) {
  await this.openSiteSearch()
  // Base UI tooltips open on keyboard focus (:focus-visible) only; opening the
  // section was a mouse click, so press a key first to switch input modality.
  await this.page.keyboard.press("Shift")
  await this.page.locator('[data-testid="filter-info"]:visible').focus()
})

Then("a tooltip explains what filtering does", async function (this: BrowserWorld) {
  // Base UI tooltip popups carry no role="tooltip", so match the shadcn slot.
  await this.page
    .locator('[data-slot="tooltip-content"]', { hasText: /limits data to the current map extent/ })
    .first()
    .waitFor()
})
