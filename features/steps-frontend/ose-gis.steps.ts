import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

When("the user selects OSE aquifer feature {string}", async function (this: BrowserWorld, id: string) {
  await this.selectFeature("ose-aquifer-tests", id)
  // Waiting for the attribute list confirms the feature was actually found
  // (a missing feature renders a "Feature not found" message instead).
  await this.page.getByTestId("attribute-list").waitFor()
})

async function inspectFields(world: BrowserWorld): Promise<string[]> {
  return world.page.locator('[data-testid="attribute-list"] dt').allTextContents()
}

Then("the inspect panel lists the field {string}", async function (this: BrowserWorld, field: string) {
  const fields = await inspectFields(this)
  assert.ok(fields.includes(field), `expected field "${field}" in ${fields.join(", ")}`)
})

Then("the inspect panel does not list the field {string}", async function (this: BrowserWorld, field: string) {
  const fields = await inspectFields(this)
  assert.ok(!fields.includes(field), `did not expect field "${field}" in ${fields.join(", ")}`)
})

Then("the inspect panel shows the value {string}", async function (this: BrowserWorld, value: string) {
  const text = (await this.page.getByTestId("attribute-list").textContent()) ?? ""
  assert.ok(text.includes(value), `expected value "${value}" in the panel`)
})

Then("the inspect panel has a link to {string}", async function (this: BrowserWorld, href: string) {
  await this.page.locator(`[data-testid="attribute-list"] a[href="${href}"]`).waitFor()
})
