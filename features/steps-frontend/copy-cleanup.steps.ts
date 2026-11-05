import { Then } from "@cucumber/cucumber"

import type { BrowserWorld } from "./support/world"

Then(
  "the help page still documents the data sources",
  async function (this: BrowserWorld) {
    await this.page.locator("#sources").waitFor()
  }
)

Then(
  "the help page still documents the API endpoints",
  async function (this: BrowserWorld) {
    await this.page.locator("#api").waitFor()
  }
)

Then(
  "the help page still documents connecting a desktop GIS",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("help-gis").waitFor()
  }
)
