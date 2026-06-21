import { Given, Then, DataTable } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import {
  OSE_FILTER_DEFAULTS,
  matchesOseFilter,
  type OseFilter,
} from "@/lib/oseFilter"
import type { ClientWorld } from "./support/world"

function filter(world: ClientWorld): OseFilter {
  return world.oseFilter as OseFilter
}

/** Split a "A, B" cell into trimmed codes. */
function codes(list: string): string[] {
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

Given("an OSE filter at its defaults", function (this: ClientWorld) {
  // Deep-copy so per-scenario mutations don't leak through the shared defaults.
  this.oseFilter = {
    ...OSE_FILTER_DEFAULTS,
    statuses: [],
    podStatuses: [],
    useCodes: [],
    wellDepthRange: [...OSE_FILTER_DEFAULTS.wellDepthRange],
    depthRange: [...OSE_FILTER_DEFAULTS.depthRange],
  }
})

Given("the filter statuses are {string}", function (this: ClientWorld, list: string) {
  filter(this).statuses = codes(list)
})

Given("the filter pod statuses are {string}", function (this: ClientWorld, list: string) {
  filter(this).podStatuses = codes(list)
})

Given("the filter use codes are {string}", function (this: ClientWorld, list: string) {
  filter(this).useCodes = codes(list)
})

Given("the filter well depth range is {int} to {int}", function (this: ClientWorld, min: number, max: number) {
  filter(this).wellDepthRange = [min, max]
})

Given("the filter depth to water range is {int} to {int}", function (this: ClientWorld, min: number, max: number) {
  filter(this).depthRange = [min, max]
})

Given("the filter requires a well log file date", function (this: ClientWorld) {
  filter(this).hasWellLogFileDate = true
})

Given("a POD with properties:", function (this: ClientWorld, table: DataTable) {
  const props: Record<string, unknown> = {}
  for (const [key, value] of table.raw()) props[key] = value
  this.osePod = props
})

Then("the POD passes the filter", function (this: ClientWorld) {
  assert.equal(matchesOseFilter(this.osePod, filter(this)), true)
})

Then("the POD is filtered out", function (this: ClientWorld) {
  assert.equal(matchesOseFilter(this.osePod, filter(this)), false)
})
