import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import { DATASET_CATALOG } from "@/catalog/datasets"
import type { BrowserWorld } from "./support/world"

/** Strip thousands separators so the count assertion is locale-agnostic. */
function digits(s: string | null): string {
  return (s ?? "").replace(/\D/g, "")
}

Given("the user opens the data catalog", async function (this: BrowserWorld) {
  await this.goto("/catalog")
  await this.page.getByTestId("catalog-page").waitFor()
})

Given(
  "the user opens a catalog deep link to {string}",
  async function (this: BrowserWorld, id: string) {
    await this.goto(`/catalog?dataset=${id}`)
    await this.page.getByTestId("catalog-page").waitFor()
  }
)

Then("the dashboard shows the data counts", async function (this: BrowserWorld) {
  await this.page.getByTestId("home-dashboard").scrollIntoViewIfNeeded()
  const services = await this.page.getByTestId("dashboard-stat-services").textContent()
  const datasets = await this.page.getByTestId("dashboard-stat-datasets").textContent()
  const sites = await this.page.getByTestId("dashboard-stat-sites").textContent()
  // Values from the WEAVER_STATS fixture (services 5, datasets 41, sites 12345).
  assert.ok(digits(services).includes("5"), `services tile: ${services}`)
  assert.ok(digits(datasets).includes("41"), `datasets tile: ${datasets}`)
  assert.equal(digits(sites), "12345", `sites tile: ${sites}`)
})

Then(
  "the dashboard shows when it was last updated",
  async function (this: BrowserWorld) {
    const text = (await this.page.getByTestId("dashboard-updated").textContent()) ?? ""
    assert.match(text, /Updated/)
  }
)

Then(
  "the activity feed lists recent source updates",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("home-activity-feed").scrollIntoViewIfNeeded()
    const events = this.page.locator('[data-testid="activity-event"]')
    await events.first().waitFor()
    assert.ok((await events.count()) >= 1)
    const feed = (await this.page.getByTestId("home-activity-feed").textContent()) ?? ""
    assert.match(feed, /USGS/)
  }
)

Then(
  "the catalog shows a card for every dataset",
  async function (this: BrowserWorld) {
    const cards = this.page.locator('[data-testid="catalog-grid"] > div')
    await cards.first().waitFor()
    assert.equal(await cards.count(), DATASET_CATALOG.length)
  }
)

Then(
  "the {string} card links to the map with its layer",
  async function (this: BrowserWorld, id: string) {
    const href = await this.page
      .getByTestId(`catalog-card-map-${id}`)
      .getAttribute("href")
    assert.ok(href?.startsWith("/map"), `href: ${href}`)
    assert.ok(href?.includes(id), `href should reference layer ${id}: ${href}`)
  }
)

When(
  "the user shares the {string} card",
  async function (this: BrowserWorld, id: string) {
    await this.page.getByTestId(`catalog-card-share-${id}`).click()
  }
)

Then(
  "the clipboard holds a catalog deep link to {string}",
  async function (this: BrowserWorld, id: string) {
    const text = await this.page.evaluate(() => navigator.clipboard.readText())
    assert.match(text, new RegExp(`/catalog\\?dataset=${id}`))
  }
)

When(
  "the user searches the catalog for {string}",
  async function (this: BrowserWorld, q: string) {
    await this.page.getByTestId("catalog-search").fill(q)
  }
)

Then(
  "the catalog shows fewer datasets than the full set",
  async function (this: BrowserWorld) {
    const cards = this.page.locator('[data-testid="catalog-grid"] > div')
    await this.page.waitForFunction(
      (total) =>
        document.querySelectorAll('[data-testid="catalog-grid"] > div').length <
        total,
      DATASET_CATALOG.length
    )
    assert.ok((await cards.count()) < DATASET_CATALOG.length)
  }
)

Then(
  "the {string} card is shown",
  async function (this: BrowserWorld, id: string) {
    await this.page.getByTestId(`catalog-card-${id}`).waitFor()
  }
)

Then(
  "the catalog shows a no-results message",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("catalog-empty").waitFor()
  }
)
