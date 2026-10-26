import { readFile } from "node:fs/promises"
import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"
import type { Download } from "playwright"

import type { BrowserWorld } from "./support/world"
import { DIE_COLLECTIONS } from "./support/fixtures"

const DIE_DATASETS = DIE_COLLECTIONS.collections

/** Strip thousands separators so the count assertion is locale-agnostic. */
function digits(s: string | null): string {
  return (s ?? "").replace(/\D/g, "")
}

const ROWS = '[data-testid^="datasets-row-"]'

Given("the user opens the datasets page", async function (this: BrowserWorld) {
  await this.goto("/datasets")
  await this.page.getByTestId("datasets-page").waitFor()
})

Given(
  "the user opens a datasets deep link to {string}",
  async function (this: BrowserWorld, id: string) {
    await this.goto(`/datasets?dataset=${id}`)
    await this.page.getByTestId("datasets-page").waitFor()
  }
)

Given("the user opens {string}", async function (this: BrowserWorld, path: string) {
  await this.goto(path)
})

Then("the dashboard shows the data counts", async function (this: BrowserWorld) {
  await this.page.getByTestId("home-dashboard").scrollIntoViewIfNeeded()
  await this.page
    .getByTestId("dashboard-stat-datasets")
    .getByText(String(DIE_DATASETS.length), { exact: true })
    .waitFor()
  const services = await this.page.getByTestId("dashboard-stat-services").textContent()
  assert.ok(digits(services).length > 0, `services tile: ${services}`)
})

Then(
  "the datasets page lists every integrated product",
  async function (this: BrowserWorld) {
    const rows = this.page.locator(ROWS)
    await rows.first().waitFor()
    assert.equal(await rows.count(), DIE_DATASETS.length)
  }
)

When(
  "the user selects the {string} dataset",
  async function (this: BrowserWorld, id: string) {
    await this.page.getByTestId(`datasets-row-${id}`).click()
  }
)

Then(
  "the dataset details link to the map with the {string} layer",
  async function (this: BrowserWorld, id: string) {
    const href = await this.page.getByTestId("datasets-detail-map").getAttribute("href")
    assert.ok(href?.startsWith("/map"), `href: ${href}`)
    assert.ok(href?.includes(id), `href should reference layer ${id}: ${href}`)
  }
)

Then("the dataset details have no map link", async function (this: BrowserWorld) {
  await this.page.getByTestId("datasets-detail").waitFor()
  assert.equal(await this.page.getByTestId("datasets-detail-map").count(), 0)
})

Then("the dataset details list its fields", async function (this: BrowserWorld) {
  const fields = (await this.page.getByTestId("datasets-detail-fields").textContent()) ?? ""
  assert.match(fields, /trend_category/)
  assert.doesNotMatch(fields, /geometry/)
})

When("the user shares the selected dataset", async function (this: BrowserWorld) {
  await this.page.getByTestId("datasets-detail-share").click()
})

Then(
  "the clipboard holds a datasets deep link to {string}",
  async function (this: BrowserWorld, id: string) {
    const text = await this.page.evaluate(() => navigator.clipboard.readText())
    assert.match(text, new RegExp(`/datasets\\?dataset=${id}`))
  }
)

When(
  "the user searches datasets for {string}",
  async function (this: BrowserWorld, q: string) {
    await this.page.getByTestId("datasets-search").fill(q)
  }
)

Then(
  "the datasets page lists fewer datasets than the full set",
  async function (this: BrowserWorld) {
    await this.page.waitForFunction(
      ([sel, total]) => document.querySelectorAll(sel as string).length < (total as number),
      [ROWS, DIE_DATASETS.length]
    )
  }
)

Then(
  "the {string} dataset is listed",
  async function (this: BrowserWorld, id: string) {
    await this.page.getByTestId(`datasets-row-${id}`).waitFor()
  }
)

Then(
  "the {string} dataset is selected",
  async function (this: BrowserWorld, id: string) {
    const row = this.page.getByTestId(`datasets-row-${id}`)
    await row.waitFor()
    assert.equal(await row.getAttribute("aria-current"), "true")
    const title = DIE_DATASETS.find((d) => d.id === id)!.title
    const detail = (await this.page.getByTestId("datasets-detail").textContent()) ?? ""
    assert.ok(detail.includes(title), `detail should show ${title}: ${detail}`)
  }
)

Then(
  "the datasets page shows a no-results message",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("datasets-empty").waitFor()
  }
)

Then(
  "the datasets page is shown with the search {string}",
  async function (this: BrowserWorld, q: string) {
    await this.page.getByTestId("datasets-page").waitFor()
    await this.page.waitForURL((url) => url.pathname === "/datasets")
    assert.equal(await this.page.getByTestId("datasets-search").inputValue(), q)
  }
)

type DownloadWorld = BrowserWorld & { download?: Download }

When("the user opens the dataset download", async function (this: BrowserWorld) {
  await this.page.getByTestId("datasets-detail-download").click()
  await this.page.getByTestId("dataset-download-dialog").waitFor()
})

Then(
  "the dataset download shows {int},{int} rows in {int} requests",
  async function (this: BrowserWorld, thousands: number, rest: number, requests: number) {
    const rows = thousands * 1000 + rest
    const summary = this.page.getByTestId("dataset-download-summary")
    await summary.getByText(rows.toLocaleString()).waitFor()
    assert.match((await summary.textContent()) ?? "", new RegExp(`${requests} requests`))
  }
)

When("the user downloads the dataset as CSV", async function (this: DownloadWorld) {
  await this.page.getByTestId("dataset-download-format-csv").click()
  const [download] = await Promise.all([
    this.page.waitForEvent("download"),
    this.page.getByTestId("dataset-download-start").click(),
  ])
  this.download = download
})

Then(
  "the downloaded CSV has one header and the rows from every page",
  async function (this: DownloadWorld) {
    assert.match(this.download!.suggestedFilename(), /^weaver-nm_arsenic_summary-.*\.csv$/)
    const text = await readFile((await this.download!.path())!, "utf8")
    const lines = text.split(/\r?\n/).filter(Boolean)
    assert.deepEqual(lines, ["id,name", "row-0,Well", "row-10000,Well", "row-20000,Well"])
  }
)

Then(
  "the large download warning is shown and download is disabled",
  async function (this: BrowserWorld) {
    await this.page.getByTestId("export-large-warning").waitFor()
    assert.ok(await this.page.getByTestId("dataset-download-start").isDisabled())
  }
)

Then("the dataset download is flagged as a large dataset", async function (this: BrowserWorld) {
  const notice = this.page.getByTestId("export-large-notice")
  await notice.getByText("Large dataset").waitFor()
  assert.equal(await this.page.getByTestId("export-large-warning").count(), 0)
})

When("the user confirms the large download", async function (this: BrowserWorld) {
  await this.page.getByTestId("export-large-warning").getByRole("checkbox").click()
})

Then("the dataset download can start", async function (this: BrowserWorld) {
  assert.ok(await this.page.getByTestId("dataset-download-start").isEnabled())
})
