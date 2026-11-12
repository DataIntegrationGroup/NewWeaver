import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import type { Download } from "playwright"

import type { BrowserWorld } from "./support/world"
import { selectionCounts } from "./draw.steps"

type MapSeam = { jumpTo: (lng: number, lat: number, zoom: number) => void }
type World = BrowserWorld & { download?: Download }

async function openModal(world: BrowserWorld) {
  if ((await world.page.getByTestId("export-dialog").count()) === 0) {
    await world.page.getByTestId("open-export").click()
  }
  await world.page.getByTestId("export-dialog").waitFor()
}

When('the user clicks the "Download" button', async function (this: BrowserWorld) {
  await this.page.getByTestId("open-export").click()
})

When("the user opens the download modal", async function (this: BrowserWorld) {
  await openModal(this)
})

Then("a download modal opens", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-dialog").waitFor()
})

Then("the modal suggests the Desktop GIS integration", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-gis-banner").waitFor()
  await this.page.getByTestId("export-gis-link").waitFor()
})

When("the user follows the Desktop GIS link", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-gis-link").click()
  await this.page.waitForURL(/\/help/)
})

Then("the Desktop GIS help section is shown", async function (this: BrowserWorld) {
  await this.page.getByTestId("help-gis").waitFor()
})

Then("it offers site summary and time series exports", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-kind-sites").waitFor()
  await this.page.getByTestId("export-kind-timeseries").waitFor()
})

Then("it shows how many sites are selected", async function (this: BrowserWorld) {
  const txt = (await this.page.getByTestId("export-summary").textContent()) ?? ""
  assert.match(txt, /\b5 sites selected/)
  const note = (await this.page.getByTestId("export-sites-note").textContent()) ?? ""
  assert.match(note, /Water Levels summary/)
})

When("the user pans to a smaller area", async function (this: BrowserWorld) {
  await this.page.evaluate(
    () => (window as unknown as { __weaverMap: MapSeam }).__weaverMap.jumpTo(-106.62, 35.08, 11)
  )
})

Then(
  "the selected count matches the sites in the current extent",
  async function (this: BrowserWorld) {
    const c = await selectionCounts(this)
    assert.equal(c.filtered, 1)
  }
)

Then("the summary shows the count contributed by the drawing", async function (this: BrowserWorld) {
  assert.ok((await selectionCounts(this)).drawn >= 1)
})

Then("the summary shows the count contributed by the filters", async function (this: BrowserWorld) {
  assert.ok((await selectionCounts(this)).filtered >= 1)
})

Then(
  "the filters contribute nothing while a shape restricts the selection",
  async function (this: BrowserWorld) {
    // A drawn shape restricts (not widens) the selection, so the whole count is
    // attributed to drawing and the filter bucket is zero (src/lib/selection.ts).
    assert.equal((await selectionCounts(this)).filtered, 0)
  }
)

Then("the selected count includes the drawn points", async function (this: BrowserWorld) {
  assert.ok((await selectionCounts(this)).drawn >= 1)
})

When("the user chooses the time series export", async function (this: BrowserWorld) {
  await openModal(this)
  await this.page.getByTestId("export-kind-timeseries").click()
})

When("the user chooses the {word} format", async function (this: BrowserWorld, format: string) {
  await openModal(this)
  await this.page.getByTestId(`export-format-${format.toLowerCase()}`).click()
})

When("the user continues to the time series download", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-download").click()
  await this.page.getByTestId("dataset-download-dialog").waitFor()
  await this.page.getByTestId("export-dialog").waitFor({ state: "detached" })
})

When("the user clicks download", async function (this: World) {
  const [download] = await Promise.all([
    this.page.waitForEvent("download"),
    this.page.getByTestId("export-download").click(),
  ])
  this.download = download
})

Then("a GeoJSON file download is triggered", function (this: World) {
  assert.ok(this.download, "expected a download")
  assert.match(this.download!.suggestedFilename(), /\.geojson$/)
})

Then("a CSV file download is triggered", function (this: World) {
  assert.ok(this.download, "expected a download")
  assert.match(this.download!.suggestedFilename(), /\.csv$/)
})

Then("the CSV has as many rows as the selected count", async function (this: World) {
  const text = await readFile((await this.download!.path())!, "utf8")
  const rows = text.split(/\r?\n/).filter(Boolean).length - 1
  assert.equal(rows, (await selectionCounts(this)).total)
})

Then("the file name begins with {string}", function (this: World, prefix: string) {
  assert.ok(this.download!.suggestedFilename().startsWith(prefix))
})

Then("the download action is disabled", async function (this: BrowserWorld) {
  await openModal(this)
  assert.ok(await this.page.getByTestId("export-download").isDisabled())
})

Then("the modal explains that the selection is empty", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-empty").waitFor()
})
