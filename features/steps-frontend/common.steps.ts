import { Given } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import { LAYER_CATALOG } from "@/catalog/layers"
import type { BrowserWorld } from "./support/world"

export function layerIdByTitle(title: string): string {
  const layer = LAYER_CATALOG.find((l) => l.title === title)
  if (!layer) throw new Error(`No catalog layer titled "${title}"`)
  return layer.id
}

async function switchState(world: BrowserWorld, id: string): Promise<boolean> {
  const sw = world.page.getByTestId(`layer-toggle-${id}`)
  return (await sw.getAttribute("data-state")) === "checked"
}

async function setLayer(world: BrowserWorld, id: string, want: boolean) {
  if ((await switchState(world, id)) !== want) {
    await world.page.getByTestId(`layer-toggle-${id}`).click()
  }
  assert.equal(await switchState(world, id), want)
}

Given("the user has opened the app", async function (this: BrowserWorld) {
  await this.open()
})

// Used as both precondition (Given) and assertion (Then). Ensures the target
// state, then asserts it — idempotent either way.
Given("the {string} layer is toggled on", async function (this: BrowserWorld, title: string) {
  await setLayer(this, layerIdByTitle(title), true)
})

Given("the {string} layer is toggled off", async function (this: BrowserWorld, title: string) {
  await setLayer(this, layerIdByTitle(title), false)
})

Given("the monitoring-locations layer is visible", async function (this: BrowserWorld) {
  await setLayer(this, "st2-cabq", true)
})
