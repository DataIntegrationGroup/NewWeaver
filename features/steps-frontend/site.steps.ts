import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

Given("the user opens the home page", async function (this: BrowserWorld) {
  await this.goto("/")
  await this.page.getByTestId("home-hero").waitFor()
})

Given("the user opens the help page", async function (this: BrowserWorld) {
  await this.goto("/help")
  await this.page.getByTestId("help-page").waitFor()
})

Then("the user sees the Weaver hero", async function (this: BrowserWorld) {
  const text = await this.page.getByTestId("home-hero").textContent()
  assert.ok(text?.includes("Weaver"))
})

Then("the hero shows the Weaver image", async function (this: BrowserWorld) {
  const img = this.page.getByTestId("home-hero-image")
  await img.waitFor()
  assert.match((await img.getAttribute("src")) ?? "", /weaver-home-hero/)
})

Then("the user sees a link to the map", async function (this: BrowserWorld) {
  await this.page.getByTestId("nav-map").waitFor()
})

Then("the user sees the data partners carousel", async function (this: BrowserWorld) {
  await this.page.getByTestId("data-source-carousel").waitFor()
})

Then("the page title contains {string}", async function (this: BrowserWorld, text: string) {
  await this.page.waitForFunction((t) => document.title.includes(t), text)
})

Then("the carousel shows an agency logo for each partner", async function (this: BrowserWorld) {
  const { DATA_SOURCES } = await import("@/catalog/dataSources")
  const imgs = this.page.locator('[data-testid="data-source-carousel"] img')
  await imgs.first().waitFor()
  // The track duplicates the list for the seamless loop, so at least one logo
  // per partner is present.
  assert.ok((await imgs.count()) >= DATA_SOURCES.length)
})

When("the user clicks the link to the map", async function (this: BrowserWorld) {
  await this.page.getByTestId("nav-map").click()
})

Then("the interactive map is shown", async function (this: BrowserWorld) {
  await this.page.getByTestId("map").waitFor()
})

Then(
  "the user sees question-based entry doorways",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("home-doorways").waitFor()
    for (const hash of ["find", "measure", "gis", "api"]) {
      await this.page.getByTestId(`doorway-${hash}`).waitFor()
    }
  }
)

Then(
  "no doorway is labelled {string}",
  async function (this: BrowserWorld, label: string) {
    const text = (await this.page.getByTestId("home-doorways").textContent()) ?? ""
    assert.ok(!text.includes(label), `doorways should not mention "${label}"`)
  }
)

Then(
  "the user sees a one-line coverage statement",
  async function (this: BrowserWorld) {
    const text = (await this.page.getByTestId("home-orientation").textContent()) ?? ""
    assert.ok(text.trim().length > 0)
  }
)

When(
  "the user opens the {string} doorway",
  async function (this: BrowserWorld, _label: string) {
    await this.page.getByTestId("doorway-find").click()
  }
)

Then("the location search is ready", async function (this: BrowserWorld) {
  await this.page.getByTestId("location-search-input").waitFor()
})

Then("the user sees the documentation and help page", async function (this: BrowserWorld) {
  await this.page.getByTestId("help-page").waitFor()
  const text = await this.page.getByTestId("help-page").textContent()
  assert.ok(text?.includes("Documentation"))
})

Then("the help page includes a data disclaimer", async function (this: BrowserWorld) {
  await this.page
    .getByRole("link", { name: "Disclaimer", exact: true })
    .click()
  await this.page.getByText(/No warranty expressed or implied/).waitFor()
})

When("the user opens the {string} help section", async function (this: BrowserWorld, name: string) {
  // Scope to the exact TOC link — inline prose links (e.g. "desktop GIS") share
  // the same target and would otherwise trip strict mode.
  await this.page.getByRole("link", { name, exact: true }).click()
})

Then("the help page shows the OGC API landing page URL", async function (this: BrowserWorld) {
  const text = (await this.page.getByTestId("help-gis").textContent()) ?? ""
  assert.match(text, /\/ogcapi/)
})

Then("it explains connecting ArcGIS Pro and QGIS", async function (this: BrowserWorld) {
  const text = (await this.page.getByTestId("help-gis").textContent()) ?? ""
  assert.match(text, /ArcGIS Pro/)
  assert.match(text, /QGIS/)
})

When("the user opens the help link", async function (this: BrowserWorld) {
  const link = this.page.getByTestId("nav-help")
  await link.scrollIntoViewIfNeeded()
  await link.click()
  await this.page.waitForURL(/\/help/)
  await this.page.getByTestId("help-page").waitFor()
})
