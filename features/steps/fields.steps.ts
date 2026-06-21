import { Given, When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import { selectFields } from "@/lib/fields"
import type { ClientWorld } from "./support/world"

/** Split a "a, b, c" cell into trimmed field names. */
function names(list: string): string[] {
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

Given("a feature with the fields {string}", function (this: ClientWorld, list: string) {
  this.fieldKeys = names(list)
})

When("the layer declares no field config", function (this: ClientWorld) {
  this.result = selectFields(this.fieldKeys)
})

When("the layer includes the fields {string}", function (this: ClientWorld, include: string) {
  this.result = selectFields(this.fieldKeys, { include: names(include) })
})

When("the layer excludes the fields {string}", function (this: ClientWorld, exclude: string) {
  this.result = selectFields(this.fieldKeys, { exclude: names(exclude) })
})

When(
  "the layer includes the fields {string} and excludes {string}",
  function (this: ClientWorld, include: string, exclude: string) {
    this.result = selectFields(this.fieldKeys, {
      include: names(include),
      exclude: names(exclude),
    })
  }
)

Then("the displayed fields are {string}", function (this: ClientWorld, expected: string) {
  assert.deepEqual(this.result, names(expected))
})
