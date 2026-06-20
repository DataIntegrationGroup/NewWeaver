import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"
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

Then(
  "it offers time series, latest observation, and features exports",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("export-kind-timeseries").waitFor()
    await this.page.getByTestId("export-kind-latest").waitFor()
    await this.page.getByTestId("export-kind-features").waitFor()
  }
)

Then("it shows how many locations are selected", async function (this: BrowserWorld) {
  const txt = (await this.page.getByTestId("export-summary").textContent()) ?? ""
  assert.match(txt, /monitoring locations selected/)
})

When("the user pans to a smaller area", async function (this: BrowserWorld) {
  await this.page.evaluate(
    () => (window as unknown as { __weaverMap: MapSeam }).__weaverMap.jumpTo(-106.62, 35.08, 11)
  )
})

Then(
  "the selected count matches the locations in the current extent",
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

Then("the selected count includes the drawn points", async function (this: BrowserWorld) {
  assert.ok((await selectionCounts(this)).drawn >= 1)
})

When("the user chooses the time series export", async function (this: BrowserWorld) {
  await openModal(this)
  await this.page.getByTestId("export-kind-timeseries").click()
})

When("the user chooses the features export", async function (this: BrowserWorld) {
  await openModal(this)
  await this.page.getByTestId("export-kind-features").click()
})

When("the user chooses the time series export with no time range", async function (this: BrowserWorld) {
  await openModal(this)
  await this.page.getByTestId("export-kind-timeseries").click()
})

When("the user clicks download", async function (this: World) {
  const [download] = await Promise.all([
    this.page.waitForEvent("download"),
    this.page.getByTestId("export-download").click(),
  ])
  this.download = download
})

Then("a CSV file download is triggered", function (this: World) {
  assert.ok(this.download, "expected a download")
  assert.match(this.download!.suggestedFilename(), /\.csv$/)
})

Then("a GeoJSON file download is triggered", function (this: World) {
  assert.ok(this.download, "expected a download")
  assert.match(this.download!.suggestedFilename(), /\.geojson$/)
})

Then("the file name begins with {string}", function (this: World, prefix: string) {
  assert.ok(this.download!.suggestedFilename().startsWith(prefix))
})

Then("the user can set a from and to date", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-from").waitFor()
  await this.page.getByTestId("export-to").waitFor()
})

Then("no time range inputs are shown", async function (this: BrowserWorld) {
  assert.equal(await this.page.getByTestId("export-from").count(), 0)
})

Given("no monitoring locations are in the current selection", async function (this: BrowserWorld) {
  const sw = this.page.getByTestId("layer-toggle-st2-cabq")
  if ((await sw.getAttribute("data-state")) === "checked") await sw.click()
})

Then("the download action is disabled", async function (this: BrowserWorld) {
  await openModal(this)
  assert.ok(await this.page.getByTestId("export-download").isDisabled())
})

Then("the modal explains that the selection is empty", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-empty").waitFor()
})

Given("the selection contains many continuous datastreams", async function (this: BrowserWorld) {
  // Bernalillo agency returns 30 locations (> the large-export threshold).
  const sw = this.page.getByTestId("layer-toggle-st2-bernco")
  if ((await sw.getAttribute("data-state")) !== "checked") await sw.click()
})

Then("the modal warns that the export may be large", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-large-warning").waitFor()
})

Then("the user must confirm before the download proceeds", async function (this: BrowserWorld) {
  const download = this.page.getByTestId("export-download")
  assert.ok(await download.isDisabled(), "download should be blocked until confirmed")
  await this.page.getByTestId("export-large-warning").getByRole("checkbox").click()
  await download.waitFor()
  assert.ok(!(await download.isDisabled()), "download should be enabled after confirming")
})
