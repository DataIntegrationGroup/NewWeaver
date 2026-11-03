import { When, Then } from "@cucumber/cucumber"

import type { BrowserWorld } from "./support/world"

When(
  "the user searches for the location {string}",
  async function (this: BrowserWorld, address: string) {
    await this.page.getByTestId("location-search-input").fill(address)
    await this.page.getByTestId("location-search-submit").click()
  }
)

When(
  "the user types {string} into the location search",
  async function (this: BrowserWorld, text: string) {
    await this.page.getByTestId("location-search-input").fill(text)
  }
)

Then(
  "location suggestions are shown",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("location-search-suggestions").waitFor()
  }
)

When(
  "the user picks the first suggestion",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("location-search-suggestion").first().click()
  }
)

Then(
  "a pin is dropped at the searched location",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("search-marker").waitFor()
  }
)

Then(
  "the coverage panel lists nearby monitored data",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("coverage-list").waitFor()
  }
)

Then(
  "the coverage panel states that nothing is monitored nearby",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("coverage-empty").waitFor()
  }
)

Then(
  "the search reports that the address could not be found",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("location-search-notfound").waitFor()
  }
)
