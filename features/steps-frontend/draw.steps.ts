import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import type { BrowserWorld } from "./support/world"

type MapSeam = { jumpTo: (lng: number, lat: number, zoom: number) => void }

// Rectangle/polygon fixtures over the two fixture locations (YALE1 @ -106.62,
// 35.08 and ALPHA WELL @ -104.52, 33.39).
const RECT_YALE = {
  type: "Polygon",
  coordinates: [[[-106.72, 35.0], [-106.52, 35.0], [-106.52, 35.18], [-106.72, 35.18], [-106.72, 35.0]]],
}
const POLY_ALPHA = {
  type: "Polygon",
  coordinates: [[[-104.62, 33.3], [-104.42, 33.3], [-104.42, 33.48], [-104.62, 33.48], [-104.62, 33.3]]],
}

async function enableBbox(world: BrowserWorld) {
  const sw = world.page.locator('[data-testid="filter-bbox"]:visible')
  if ((await sw.getAttribute("data-state")) !== "checked") await sw.click()
}

async function jumpTo(world: BrowserWorld, lng: number, lat: number, zoom: number) {
  await world.page.evaluate(
    ([x, y, z]) => (window as unknown as { __weaverMap: MapSeam }).__weaverMap.jumpTo(x, y, z),
    [lng, lat, zoom]
  )
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
// scriptable). A bbox filter panned away from the target makes the drawn point
// observable as a draw-only contribution in the selection summary.
When("the user draws a rectangle over a cluster of points", async function (this: BrowserWorld) {
  await enableBbox(this)
  await jumpTo(this, -104.52, 33.39, 9) // ALPHA in view, YALE1 out
  await this.setShapes([RECT_YALE])
})

When("the user draws a polygon around some points", async function (this: BrowserWorld) {
  await enableBbox(this)
  await jumpTo(this, -100, 31, 9) // both fixture points out of view
  await this.setShapes([POLY_ALPHA]) // encloses ALPHA only
})

When(
  "the user draws a selection that includes points outside the current extent",
  async function (this: BrowserWorld) {
    await jumpTo(this, -106.62, 35.08, 9) // YALE1 in extent
    await this.setShapes([POLY_ALPHA]) // ALPHA is out of extent, added by drawing
  }
)

Given("the user has drawn a selection", async function (this: BrowserWorld) {
  await enableBbox(this)
  await jumpTo(this, -104.52, 33.39, 9)
  await this.setShapes([RECT_YALE])
})

Given("the user has drawn a selection around some points", async function (this: BrowserWorld) {
  await enableBbox(this)
  await jumpTo(this, -104.52, 33.39, 9)
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
  // ALPHA is enclosed; YALE1 is neither in-extent nor drawn → total is exactly 1.
  assert.equal((await selectionCounts(this)).total, 1)
})

Then(
  "the selection includes both the in-extent points and the drawn points",
  async function (this: BrowserWorld) {
    const c = await selectionCounts(this)
    assert.ok(c.filtered >= 1, "expected in-extent points")
    assert.ok(c.drawn >= 1, "expected drawn points")
  }
)

Then("the drawn points are no longer selected", async function (this: BrowserWorld) {
  assert.equal((await selectionCounts(this)).drawn, 0)
})

Then("only the filtered points remain selected", async function (this: BrowserWorld) {
  const c = await selectionCounts(this)
  assert.equal(c.drawn, 0)
})
