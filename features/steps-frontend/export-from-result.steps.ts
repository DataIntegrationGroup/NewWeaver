import { When, Then } from "@cucumber/cucumber"

import type { BrowserWorld } from "./support/world"

Then(
  "the coverage panel offers a download path",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("coverage-export").waitFor()
  }
)

When(
  "the user follows the coverage download path",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("coverage-export").click()
  }
)

Then(
  "the attribute table offers a download path",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("table-export").waitFor()
  }
)

When(
  "the user follows the table download path",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("table-export").click()
  }
)

Then("the export dialog opens", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-dialog").waitFor()
})
