import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import { MEASUREMENT_CATEGORIES, LAYER_CATALOG } from "@/catalog/layers"
import type { BrowserWorld } from "./support/world"
import { revealLayerCatalog } from "./common.steps"

When(
  "the user browses by what's measured for {string}",
  async function (this: BrowserWorld, label: string) {
    const cat = MEASUREMENT_CATEGORIES.find((c) => c.label === label)
    if (!cat) throw new Error(`No measurement category labelled "${label}"`)
    await this.openSearchSection("measure")
    await this.page.getByTestId(`facet-${cat.type}`).click()
  }
)

Then(
  "the {string} layer shows as enabled",
  async function (this: BrowserWorld, title: string) {
    const layer = LAYER_CATALOG.find((l) => l.title === title)
    if (!layer) throw new Error(`No catalog layer titled "${title}"`)
    await revealLayerCatalog(this)
    const sw = this.page.getByTestId(`layer-toggle-${layer.id}`)
    await sw.waitFor()
    assert.equal(await sw.getAttribute("data-state"), "checked")
  }
)
