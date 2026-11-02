import { Given, When, Then } from "@cucumber/cucumber"

import type { BrowserWorld } from "./support/world"

Given("the Water Levels data source returns an error", async function (this: BrowserWorld) {
  // Page routes take precedence over the context-level fixture mock, so this
  // forces the default dataset's items request to fail.
  await this.page.route("**/collections/nm_waterlevels_summary/items**", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
  )
})

When("the user opens the app", async function (this: BrowserWorld) {
  // The dataset never loads, so don't wait for its legend.
  await this.open("", { waitForSites: false })
})

Then("a {string} message appears", async function (this: BrowserWorld, text: string) {
  await this.page.getByText(text, { exact: false }).first().waitFor()
})

Then("the message offers a Retry action", async function (this: BrowserWorld) {
  await this.page.getByRole("button", { name: "Retry" }).waitFor()
})
