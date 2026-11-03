import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

/** The MapLibre layer the selected dataset renders as (MapLayers renderLayerId). */
export function renderLayer(datasetId = "water-levels"): string {
  return `${datasetId}-render`
}

/** The legend's site count. */
export async function legendTotal(world: BrowserWorld): Promise<number> {
  const text = (await world.page.getByTestId("dataset-total").textContent()) ?? ""
  return Number(text.replace(/,/g, ""))
}

/** One of the legend's bins, by label. */
function legendBin(world: BrowserWorld, label: string) {
  return world.page
    .getByTestId("dataset-legend")
    .locator('[data-testid*="-bin-"]', { hasText: label })
}

async function pickDataset(world: BrowserWorld, label: string) {
  await world.page.getByTestId("dataset-select").click()
  await world.page.getByRole("option", { name: label, exact: true }).click()
  await world.page.getByTestId("dataset-select").filter({ hasText: label }).waitFor()
}

async function untickBin(world: BrowserWorld, label: string) {
  const checkbox = legendBin(world, label).getByRole("checkbox")
  await checkbox.click()
  await world.page.waitForFunction(
    (el) => el?.getAttribute("aria-checked") === "false",
    await checkbox.elementHandle()
  )
}

Given("the user has opened the app", async function (this: BrowserWorld) {
  await this.open()
})

When("the user picks the {string} dataset", async function (this: BrowserWorld, label: string) {
  await pickDataset(this, label)
})
Given("the user has picked the {string} dataset", async function (this: BrowserWorld, label: string) {
  await pickDataset(this, label)
})

Then("the dataset picker shows {string}", async function (this: BrowserWorld, label: string) {
  await this.page.getByTestId("dataset-select").filter({ hasText: label }).waitFor()
})

Then("the legend counts {int} site(s)", async function (this: BrowserWorld, n: number) {
  await this.page.waitForFunction(
    (want) => document.querySelector('[data-testid="dataset-total"]')?.textContent === String(want),
    n
  )
  assert.equal(await legendTotal(this), n)
})

When("the user colors the map by {string}", async function (this: BrowserWorld, label: string) {
  await this.page.getByTestId("color-by-select").click()
  await this.page.getByRole("option", { name: label, exact: true }).click()
})

Then("the legend lists the {string} bin", async function (this: BrowserWorld, label: string) {
  await legendBin(this, label).waitFor()
})

When("the user unticks the {string} bin", async function (this: BrowserWorld, label: string) {
  await untickBin(this, label)
})
Given("the user has unticked the {string} bin", async function (this: BrowserWorld, label: string) {
  await untickBin(this, label)
})

Then("a filter chip reads {string}", async function (this: BrowserWorld, text: string) {
  await this.page.getByTestId("filter-chips").getByText(text, { exact: true }).waitFor()
})

When("the user removes the {string} filter chip", async function (this: BrowserWorld, label: string) {
  await this.page
    .getByTestId("filter-chips")
    .getByRole("button", { name: new RegExp(`^Remove filter: ${label}`) })
    .click()
})

Then("no filter chips are shown", async function (this: BrowserWorld) {
  await this.page.locator('[data-testid^="filter-chip-"]').first().waitFor({ state: "detached" })
})

When("the user clears the filters", async function (this: BrowserWorld) {
  await this.page.getByTestId("clear-filters").click()
})

Given("the user filters sites by the text {string}", async function (this: BrowserWorld, text: string) {
  await this.openSiteSearch()
  await this.page.locator('[data-testid="filter-text"]:visible').fill(text)
})

Then("the sites render on the map", async function (this: BrowserWorld) {
  await this.page.waitForFunction(
    (id) =>
      (
        window as unknown as { __weaverMap: { queryRendered: (id: string) => unknown[] } }
      ).__weaverMap.queryRendered(id).length > 0,
    renderLayer()
  )
})

Then("the URL records the {string} dataset", async function (this: BrowserWorld, id: string) {
  await this.page.waitForFunction(
    (want) => new URLSearchParams(window.location.search).get("ds") === want,
    id
  )
})

Then("the URL records color by {string}", async function (this: BrowserWorld, facetId: string) {
  await this.page.waitForFunction(
    (want) => new URLSearchParams(window.location.search).get("color") === want,
    facetId
  )
})
