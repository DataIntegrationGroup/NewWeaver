import { Given, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

/** Interface-mechanics phrases that must not appear in self-explaining copy. */
const MECHANICS = [
  /click a (monitoring )?point/i,
  /click a (vector )?feature/i,
  /click a point to (view|open)/i,
]

Given("the user opens the about page", async function (this: BrowserWorld) {
  await this.goto("/about")
  await this.page.getByTestId("about-page").waitFor()
})

Then(
  "the about page does not narrate click mechanics",
  async function (this: BrowserWorld) {
    const text = (await this.page.getByTestId("about-page").textContent()) ?? ""
    for (const re of MECHANICS) {
      assert.ok(!re.test(text), `About should not contain mechanics copy: ${re}`)
    }
  }
)

Then(
  "the help page does not narrate click mechanics",
  async function (this: BrowserWorld) {
    const text = (await this.page.getByTestId("help-page").textContent()) ?? ""
    for (const re of MECHANICS) {
      assert.ok(!re.test(text), `Help should not contain mechanics copy: ${re}`)
    }
  }
)

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
