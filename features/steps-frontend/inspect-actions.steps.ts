import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

When("the user presses Escape", async function (this: BrowserWorld) {
  await this.page.keyboard.press("Escape")
})

When("the user zooms to the selected feature", async function (this: BrowserWorld) {
  await this.page.getByTestId("inspect-zoom").click()
})

Then("the map centers on the selected feature", async function (this: BrowserWorld) {
  // The "Springs" fixture's wl-1 sits at [-106.62, 35.08].
  await this.page.waitForFunction(() => {
    const c = (
      window as unknown as { __weaverMap: { getCenter: () => { lng: number; lat: number } } }
    ).__weaverMap.getCenter()
    return Math.abs(c.lng + 106.62) < 0.2 && Math.abs(c.lat - 35.08) < 0.2
  })
})

Then("the inspect panel offers a copy button for its values", async function (this: BrowserWorld) {
  const copies = this.page.locator('[data-testid="attribute-list"] button[aria-label="Copy value"]')
  assert.ok((await copies.count()) > 0, "expected at least one copy button")
})

When("the user shares the current view", async function (this: BrowserWorld) {
  await this.page.getByTestId("share-view").click()
})

Then("a {string} confirmation appears", async function (this: BrowserWorld, text: string) {
  await this.page.getByText(text).waitFor()
})
