import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

When("the screen is phone-sized", async function (this: BrowserWorld) {
  await this.page.setViewportSize({ width: 390, height: 844 })
})

Then("the site panel fills the screen width", async function (this: BrowserWorld) {
  const width = this.page.viewportSize()?.width
  await this.page.waitForFunction(
    (w) => Math.round(document.querySelector('[data-testid="site-detail"]')?.getBoundingClientRect().width ?? 0) === w,
    width
  )
})

When("the user opens the copied link", async function (this: BrowserWorld) {
  const link = await this.page.evaluate(() => navigator.clipboard.readText())
  await this.page.goto("about:blank")
  await this.page.goto(link)
  await this.page.getByTestId("site-stats").waitFor()
})

Then("the download covers {int} site(s)", async function (this: BrowserWorld, n: number) {
  const summary = (await this.page.getByTestId("export-summary").textContent()) ?? ""
  assert.match(summary, new RegExp(`^${n} features selected`))
})
