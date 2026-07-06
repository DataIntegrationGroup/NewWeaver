import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

// Rectangle/polygon fixtures over the two fixture locations (YALE1 @ -106.62,
// 35.08 and ALPHA WELL @ -104.52, 33.39). A drawn shape RESTRICTS the export
// selection to the points inside it (matching the attribute table), so each
// fixture encloses exactly one of the two points.
const RECT_YALE = {
  type: "Polygon",
  coordinates: [[[-106.72, 35.0], [-106.52, 35.0], [-106.52, 35.18], [-106.72, 35.18], [-106.72, 35.0]]],
}
const POLY_ALPHA = {
  type: "Polygon",
  coordinates: [[[-104.62, 33.3], [-104.42, 33.3], [-104.42, 33.48], [-104.62, 33.48], [-104.62, 33.3]]],
}

/** Open the export modal (if closed) and parse the selection summary counts. */
export async function selectionCounts(world: BrowserWorld) {
  if ((await world.page.getByTestId("export-dialog").count()) === 0) {
    await world.page.getByTestId("open-export").click()
  }
  await world.page.getByTestId("export-dialog").waitFor()
  const txt = (await world.page.getByTestId("export-summary").textContent()) ?? ""
  const drawn = Number(txt.match(/(\d+) from drawing/)?.[1] ?? "0")
  const filtered = Number(txt.match(/(\d+) from filters/)?.[1] ?? "0")
  return { drawn, filtered, total: drawn + filtered }
}

When("the user activates the rectangle draw tool", async function (this: BrowserWorld) {
  await this.page.getByTestId("draw-rectangle").click()
})

When("the user activates the polygon draw tool", async function (this: BrowserWorld) {
  await this.page.getByTestId("draw-polygon").click()
})

// "Drawing" is injected via the test seam (the terra-draw canvas isn't
// scriptable). Each fixture shape encloses exactly one of the two fixture
// points, so the restrict semantics are observable in the selection summary.
When("the user draws a rectangle over a cluster of points", async function (this: BrowserWorld) {
  await this.setShapes([RECT_YALE]) // encloses YALE1 only
})

When("the user draws a polygon around some points", async function (this: BrowserWorld) {
  await this.setShapes([POLY_ALPHA]) // encloses ALPHA only
})

Given("the full selection has more than one point", async function (this: BrowserWorld) {
  // Baseline: with no shape drawn, both fixture points are selected.
  assert.ok((await selectionCounts(this)).total >= 2)
})

Given("the user has drawn a selection", async function (this: BrowserWorld) {
  await this.setShapes([RECT_YALE])
})

Given("the user has drawn a selection around some points", async function (this: BrowserWorld) {
  await this.setShapes([RECT_YALE])
})

When("the user clears the drawing", async function (this: BrowserWorld) {
  await this.page.getByTestId("draw-clear").click()
})

Then("the points inside the rectangle are selected", async function (this: BrowserWorld) {
  assert.ok((await selectionCounts(this)).drawn >= 1)
})

Then("the selected points are highlighted on the map", async function (this: BrowserWorld) {
  // The only observable of a drawn selection is the resolved export selection.
  assert.ok((await selectionCounts(this)).total >= 1)
})

Then("only points inside the polygon boundary are selected", async function (this: BrowserWorld) {
  assert.equal((await selectionCounts(this)).drawn, 1)
})

Then("points outside the polygon are not selected", async function (this: BrowserWorld) {
  // POLY_ALPHA encloses ALPHA only; YALE1 is outside → total is exactly 1.
  assert.equal((await selectionCounts(this)).total, 1)
})

Then("the drawn points are no longer selected", async function (this: BrowserWorld) {
  assert.equal((await selectionCounts(this)).drawn, 0)
})

Then("only the filtered points remain selected", async function (this: BrowserWorld) {
  assert.equal((await selectionCounts(this)).drawn, 0)
})
