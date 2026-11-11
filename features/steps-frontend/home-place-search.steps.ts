import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

When(
  "the user types {string} into the home place search",
  async function (this: BrowserWorld, text: string) {
    await this.page.getByTestId("home-place-input").fill(text)
  }
)

When(
  "the user searches the home page for {string}",
  async function (this: BrowserWorld, text: string) {
    await this.page.getByTestId("home-place-input").fill(text)
    await this.page.getByTestId("home-place-submit").click()
  }
)

Then("the home page reports that the place could not be found", async function (this: BrowserWorld) {
  await this.page.getByTestId("home-place-notfound").waitFor()
  assert.equal(new URL(this.page.url()).pathname, "/")
})

Then("the location search shows the searched place", async function (this: BrowserWorld) {
  const input = this.page.getByTestId("location-search-input")
  await input.waitFor()
  // The geocoder's label for the match, not necessarily the typed text.
  assert.notEqual(await input.inputValue(), "")
})
