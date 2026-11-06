import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

Then(
  "the tour shows step {int} of {int}, {string}",
  async function (this: BrowserWorld, step: number, total: number, title: string) {
    const card = this.page.getByTestId("onboarding-tour")
    await card.waitFor()
    const text = ((await card.textContent()) ?? "").replace(/\s+/g, " ")
    assert.ok(text.includes(`${step}/${total}`), `expected step ${step}/${total}, got "${text}"`)
    assert.equal(await card.getByRole("heading").textContent(), title)
  }
)

When("the user steps through to the end of the tour", async function (this: BrowserWorld) {
  const next = this.page.getByTestId("tour-next")
  while (await next.isVisible()) await next.click()
  await this.page.getByTestId("tour-done").click()
})

When("the user takes the tour again", async function (this: BrowserWorld) {
  await this.page.getByTestId("onboarding-tour").waitFor({ state: "detached" })
  await this.page.getByTestId("restart-tour").click()
})

When("the user reloads the map", async function (this: BrowserWorld) {
  await this.page.reload()
  await this.page.getByTestId("dataset-legend").waitFor()
})

Then("the tour is not shown", async function (this: BrowserWorld) {
  assert.equal(await this.page.getByTestId("onboarding-tour").count(), 0)
})

When("the user narrows the sidebar as far as it goes", async function (this: BrowserWorld) {
  const box = await this.page.getByTestId("sidebar-resize").boundingBox()
  assert.ok(box, "sidebar resize handle not found")
  await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await this.page.mouse.down()
  await this.page.mouse.move(0, box.y + box.height / 2, { steps: 5 })
  await this.page.mouse.up()
})

Then("every sidebar action fits inside its button", async function (this: BrowserWorld) {
  const overflowing = await this.page
    .locator("[data-tour='view-actions'] button")
    .evaluateAll((els) =>
      els.filter((el) => el.scrollWidth > el.clientWidth).map((el) => el.textContent?.trim())
    )
  assert.deepEqual(overflowing, [])
})
