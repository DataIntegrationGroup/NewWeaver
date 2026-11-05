import { When, Then } from "@cucumber/cucumber"

import type { BrowserWorld } from "./support/world"

When("the user visits the legacy URL {string}", async function (this: BrowserWorld, path: string) {
  await this.goto(path)
})

Then("the user lands on {string}", async function (this: BrowserWorld, path: string) {
  await this.page.waitForFunction((want) => window.location.pathname === want, path)
})

Then("the URL selects site {string}", async function (this: BrowserWorld, featureId: string) {
  await this.page.waitForFunction(
    (want) => new URLSearchParams(window.location.search).get("sel") === want,
    `water-levels~${featureId}`
  )
})
