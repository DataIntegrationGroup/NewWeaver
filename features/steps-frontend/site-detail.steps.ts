import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"
import type { Route } from "playwright"

import * as fx from "./support/fixtures"
import type { BrowserWorld } from "./support/world"

/** Panel fixtures by DIE collection id (support/fixtures). */
const ITEMS: Record<string, { features: { properties: Record<string, unknown> }[] }> = {
  nm_waterlevels_timeseries: fx.DIE_WL_TIMESERIES,
  nm_arsenic_summary: fx.DIE_ARSENIC,
  nm_arsenic_timeseries: fx.DIE_ARSENIC_TIMESERIES,
  nm_major_chemistry: fx.DIE_MAJOR_CHEMISTRY,
  nm_water_type: fx.DIE_WATER_TYPE,
  nm_hardness: fx.DIE_HARDNESS,
}

function panel(world: BrowserWorld) {
  return world.page.getByTestId("site-detail")
}

async function text(locator: { textContent: () => Promise<string | null> }) {
  return ((await locator.textContent()) ?? "").replace(/\s+/g, " ").trim()
}

Given("the site panel's data is served", async function (this: BrowserWorld) {
  // Page routes run before the shared mocks; anything not listed falls through.
  await this.page.route(/die-pygeoapi-[^/]*\.run\.app/, async (route: Route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
      })
    if (/\/collections\/?$/.test(url.pathname)) return json(fx.SITE_PANEL_COLLECTIONS)
    const items = /\/collections\/([^/]+)\/items/.exec(url.pathname)
    const fixture = items && ITEMS[items[1]]
    if (!fixture) return route.fallback()
    // Time series are fetched per site by bare id.
    const id = url.searchParams.get("id")
    const features = id ? fixture.features.filter((f) => f.properties.id === id) : fixture.features
    return json({ ...fixture, features, numberMatched: features.length, numberReturned: features.length })
  })
})

When(
  "the user opens site {string} in the {string} dataset",
  async function (this: BrowserWorld, featureId: string, datasetId: string) {
    // Start away from the sites so zooming is observable.
    const params = new URLSearchParams({
      ds: datasetId,
      sel: `${datasetId}~${featureId}`,
      lng: "-104",
      lat: "33",
      z: "6",
    })
    await this.open(`?${params}`)
    await panel(this).waitFor()
  }
)

Then("the site panel is titled {string}", async function (this: BrowserWorld, title: string) {
  // Shows the raw id until the dataset loads.
  const heading = this.page.getByTestId("site-detail-title")
  await heading.filter({ hasText: title }).waitFor().catch(() => {})
  assert.equal(await text(heading), title)
})

Then("the site panel's subtitle reads {string}", async function (this: BrowserWorld, subtitle: string) {
  await panel(this).locator("header p").filter({ hasText: subtitle }).waitFor()
})

Then("the site panel's headline shows {string}", async function (this: BrowserWorld, value: string) {
  const stats = await text(panel(this).getByTestId("site-stats"))
  assert.ok(stats.includes(value), `headline numbers: ${stats}`)
})

Then("the site panel has the tabs {string}", async function (this: BrowserWorld, list: string) {
  const tabs = await panel(this).getByRole("tab").allTextContents()
  assert.deepEqual(
    tabs.map((t) => t.trim()),
    list.split(",").map((t) => t.trim())
  )
})

When("the user opens the {string} tab", async function (this: BrowserWorld, name: string) {
  await panel(this).getByRole("tab", { name, exact: true }).click()
})

Then("the site panel shows a chart", async function (this: BrowserWorld) {
  await panel(this).getByTestId("time-series-chart").locator("canvas").first().waitFor()
})

Then("the site panel says {string}", async function (this: BrowserWorld, message: string) {
  await panel(this).getByText(message, { exact: true }).waitFor()
})

Then("the site panel's takeaway reads {string}", async function (this: BrowserWorld, takeaway: string) {
  assert.equal(await text(panel(this).getByTestId("site-takeaway")), takeaway)
})

Then("the site panel lists {string} as {string}", async function (this: BrowserWorld, label: string, value: string) {
  const dd = panel(this).locator(`dt:text-is("${label}") + dd`)
  await dd.waitFor()
  assert.equal(await text(dd), value)
})

Then("the samples table lists {int} results", async function (this: BrowserWorld, n: number) {
  const rows = panel(this).getByTestId("site-samples").locator("tbody tr")
  await rows.first().waitFor()
  assert.equal(await rows.count(), n)
})

Then("the samples table shows the result {string}", async function (this: BrowserWorld, result: string) {
  await panel(this).getByTestId("site-samples").getByRole("cell", { name: result, exact: true }).waitFor()
})

When("the user closes the site panel", async function (this: BrowserWorld) {
  await this.page.getByTestId("site-detail-close").click()
})

When("the user presses Escape", async function (this: BrowserWorld) {
  await this.page.keyboard.press("Escape")
})

Then("the site panel closes and the selection clears", async function (this: BrowserWorld) {
  await panel(this).waitFor({ state: "detached" })
  await this.page.waitForFunction(() => !/[?&]sel=/.test(window.location.search))
})

When("the user zooms to the site", async function (this: BrowserWorld) {
  await this.page.getByTestId("site-detail-zoom").click()
})

Then("the map centers on {float}, {float}", async function (this: BrowserWorld, lng: number, lat: number) {
  await this.page.waitForFunction(
    ([x, y]) => {
      const c = (
        window as unknown as { __weaverMap: { getCenter: () => { lng: number; lat: number } } }
      ).__weaverMap.getCenter()
      return Math.abs(c.lng - x) < 0.2 && Math.abs(c.lat - y) < 0.2
    },
    [lng, lat]
  )
})

When("the user copies the site ID", async function (this: BrowserWorld) {
  await panel(this).getByRole("button", { name: "Copy site ID" }).click()
})

Then("the clipboard holds {string}", async function (this: BrowserWorld, expected: string) {
  await this.page.waitForFunction(
    async (want) => (await navigator.clipboard.readText()) === want,
    expected
  )
})
