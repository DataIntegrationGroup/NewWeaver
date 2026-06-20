import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

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

// Filter controls render twice (header at lg+, sidebar below lg); target the
// visible instance so the locator is unambiguous.
async function setSwitch(world: BrowserWorld, on: boolean) {
  const sw = world.page.locator('[data-testid="filter-bbox"]:visible')
  if (((await sw.getAttribute("data-state")) === "checked") !== on) await sw.click()
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
    () =>
      (window as unknown as { __weaverMap: MapSeam }).__weaverMap.queryRendered(
        "st2-cabq-points"
      ).length === 1
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
    return /\b2\b/.test(t)
  })
  assert.equal(await tableCount(this), 2)
})

When("the user types a search term into the feature filter", async function (this: BrowserWorld) {
  await ensureTableOpen(this)
  ;(this as unknown as { totalBefore: number }).totalBefore = await tableCount(this)
  await this.page.locator('[data-testid="filter-text"]:visible').fill("Summary 1")
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
  await this.page.locator('[data-testid="filter-text"]:visible').fill("zzzzzznomatch")
})

Then('the user sees a "no results" message', async function (this: BrowserWorld) {
  await this.page.getByTestId("no-results").waitFor()
})

Then("the map shows no features for that layer", async function (this: BrowserWorld) {
  await this.page.waitForFunction(
    () =>
      (window as unknown as { __weaverMap: MapSeam }).__weaverMap.queryRendered(
        "st2-cabq-points"
      ).length === 0
  )
})
