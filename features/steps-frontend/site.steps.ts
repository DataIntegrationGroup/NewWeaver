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

Then("the user sees a link to the map", async function (this: BrowserWorld) {
  await this.page.getByTestId("nav-map").waitFor()
})

When("the user clicks the link to the map", async function (this: BrowserWorld) {
  await this.page.getByTestId("nav-map").click()
})

Then("the interactive map is shown", async function (this: BrowserWorld) {
  await this.page.getByTestId("map").waitFor()
})

Then("the user sees the documentation and help page", async function (this: BrowserWorld) {
  await this.page.getByTestId("help-page").waitFor()
  const text = await this.page.getByTestId("help-page").textContent()
  assert.ok(text?.includes("Documentation"))
})

Then("the help page includes a data disclaimer", async function (this: BrowserWorld) {
  await this.page.getByRole("tab", { name: "Disclaimer" }).click()
  await this.page.getByText(/No warranty expressed or implied/).waitFor()
})

When("the user opens the help link", async function (this: BrowserWorld) {
  const link = this.page.getByTestId("nav-help")
  await link.scrollIntoViewIfNeeded()
  await link.click()
  await this.page.waitForURL(/\/help/)
  await this.page.getByTestId("help-page").waitFor()
})
