import { When, Then } from "@cucumber/cucumber"
import assert from "node:assert/strict"

import { formatOseValue } from "@/lib/oseCodes"
import type { ClientWorld } from "./support/world"

When(
  "the OSE value formatter runs on field {string} with {string}",
  function (this: ClientWorld, field: string, code: string) {
    this.result = formatOseValue(field, code)
  }
)

Then("the formatted value is {string}", function (this: ClientWorld, expected: string) {
  assert.equal(this.result, expected)
})
