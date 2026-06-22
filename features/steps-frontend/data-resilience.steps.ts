import { Given, Then } from "@cucumber/cucumber"

import type { BrowserWorld } from "./support/world"

Given("the {string} data source returns an error", async function (this: BrowserWorld, _title: string) {
  // Page routes take precedence over the context-level fixture mock, so this
  // forces the Springs collection's items request to fail.
  await this.page.route("**/collections/springs/items**", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
  )
})

Then("a {string} message appears", async function (this: BrowserWorld, text: string) {
  await this.page.getByText(text, { exact: false }).first().waitFor()
})

Then("the message offers a Retry action", async function (this: BrowserWorld) {
  await this.page.getByRole("button", { name: "Retry" }).waitFor()
})
