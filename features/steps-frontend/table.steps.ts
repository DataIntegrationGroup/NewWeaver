import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

async function openTable(world: BrowserWorld) {
  if ((await world.page.getByTestId("attribute-table").count()) === 0) {
    await world.page.getByTestId("toggle-table").click()
  }
  await world.page.getByTestId("attribute-table").waitFor()
}

async function firstRowId(world: BrowserWorld): Promise<string | null> {
  return world.page.getByTestId("table-row").first().getAttribute("data-feature-id")
}

When("the user opens the attribute table", async function (this: BrowserWorld) {
  await openTable(this)
})
Given("the attribute table is open", async function (this: BrowserWorld) {
  await openTable(this)
})

Given("the active layer has more features than one page", async function () {
  // Fixture has 15 features (> pageSize 10); nothing to set up.
})

Then("the table shows one row per feature in the layer", async function (this: BrowserWorld) {
  const count = await this.page.getByTestId("table-count").textContent()
  assert.match(count ?? "", /15 features/)
})

Then("the columns match the layer's attribute fields", async function (this: BrowserWorld) {
  const headers = await this.page.locator('[data-testid="attribute-table"] th').allTextContents()
  const joined = headers.join(" ")
  for (const field of ["name", "count", "depth_ft", "id"]) {
    assert.ok(joined.includes(field), `missing column ${field}`)
  }
})

async function columnHeaders(world: BrowserWorld): Promise<string[]> {
  return world.page.locator('[data-testid="attribute-table"] th').allTextContents()
}

Then("the attribute table columns include {string}", async function (this: BrowserWorld, field: string) {
  const headers = await columnHeaders(this)
  assert.ok(headers.some((h) => h.includes(field)), `expected a "${field}" column in ${headers.join(", ")}`)
})

Then("the attribute table columns exclude {string}", async function (this: BrowserWorld, field: string) {
  const headers = await columnHeaders(this)
  assert.ok(!headers.some((h) => h.trim() === field), `did not expect a "${field}" column in ${headers.join(", ")}`)
})

Then("the table shows the first page of rows", async function (this: BrowserWorld) {
  assert.equal(await this.page.getByTestId("table-row").count(), 10)
})

Then("the user can advance to the next page", async function (this: BrowserWorld) {
  await this.page.getByTestId("table-next").click()
  assert.equal(await this.page.getByTestId("table-row").count(), 5)
})

When("the user sorts by a column", async function (this: BrowserWorld) {
  ;(this as unknown as { rowBefore: string | null }).rowBefore = await firstRowId(this)
  await this.page.locator('[data-testid="attribute-table"] th', { hasText: "count" }).click()
})

Then("the rows reorder by that column's values", async function (this: BrowserWorld) {
  const before = (this as unknown as { rowBefore: string | null }).rowBefore
  await this.page.waitForFunction(
    (b) =>
      document
        .querySelector('[data-testid="table-row"]')
        ?.getAttribute("data-feature-id") !== b,
    before
  )
})

When("the user clicks a table row", async function (this: BrowserWorld) {
  const id = await firstRowId(this)
  ;(this as unknown as { clickedRow: string | null }).clickedRow = id
  await this.page.getByTestId("table-row").first().click()
})

Then("the corresponding feature is highlighted on the map", async function (this: BrowserWorld) {
  const id = (this as unknown as { clickedRow: string | null }).clickedRow
  await this.page.waitForFunction((fid) => /[?&]sel=/.test(window.location.search) && window.location.href.includes(String(fid)), id)
  assert.ok(this.page.url().includes("ocotillo-springs"))
})

Then("the inspect panel shows that feature's attributes", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-panel").waitFor()
  await this.page.getByTestId("attribute-list").waitFor()
})

When("the user clicks a feature on the map", async function (this: BrowserWorld) {
  await this.selectFeature("ocotillo-springs", "wl-3")
})

Then("the matching row is highlighted in the table", async function (this: BrowserWorld) {
  const row = this.page.locator('[data-testid="table-row"][data-feature-id="wl-3"]')
  await row.waitFor()
  assert.equal(await row.getAttribute("data-selected"), "true")
})
