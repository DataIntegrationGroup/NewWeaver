import { Given, When, Then, type DataTable } from "@cucumber/cucumber"
import assert from "node:assert/strict"
import type { Feature, FeatureCollection } from "geojson"
import { expression } from "@maplibre/maplibre-gl-style-spec"

import { OVERRIDES, datasetForCollection, datasetsFromCollections } from "@/catalog/mapDatasets"
import { normalizeDieProps, joinByFeatureId } from "@/lib/dieProps"
import {
  NO_VALUE,
  binIndex,
  binKey,
  facetCounts,
  facetStyle,
  quantileBins,
  type Bin,
  type Facet,
} from "@/lib/facets"
import { filterFeatures } from "@/lib/filterFeatures"
import type { ClientWorld } from "./support/world"

function site(properties: Record<string, unknown>): Feature {
  return { type: "Feature", geometry: { type: "Point", coordinates: [-106, 34] }, properties }
}

/** A dataset's fixed-bin facet by id (quantile/category facets need data). */
function facet(datasetId: string, facetId: string): Facet {
  const spec = OVERRIDES.find((d) => d.id === datasetId)?.facets.find((f) => f.id === facetId)
  assert.ok(spec && "bins" in spec, `${datasetId} has no fixed-bin facet "${facetId}"`)
  return spec
}

function binLabel(f: Feature, fc: Facet): string {
  const i = binIndex(f, fc)
  return i === NO_VALUE ? "No value" : fc.bins[i].label
}

/** Parse a feature-table cell: "null", numbers, else the raw string. */
function cell(v: string): unknown {
  if (v === "null") return null
  return Number.isFinite(Number(v)) ? Number(v) : v
}

function isoYearsAgo(n: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d.toISOString().slice(0, 10)
}

// ── Bins ────────────────────────────────────────────────────────────────

Given(
  "a {string} site with {string} = {}",
  function (this: ClientWorld, ds: string, field: string, raw: string) {
    this.mapDataset = ds
    this.sites = [site({ [field]: cell(raw.replace(/^"|"$/g, "")) })]
  }
)

Given(
  "a {string} site last measured {}",
  function (this: ClientWorld, ds: string, when: string) {
    const date =
      when === "today"
        ? isoYearsAgo(0)
        : when.startsWith("on ")
          ? when.slice(3)
          : isoYearsAgo(Number(when.split(" ")[0]))
    this.mapDataset = ds
    this.sites = [site({ latest_date: date })]
  }
)

Then("it falls in the {string} bin {string}", function (this: ClientWorld, id: string, bin: string) {
  assert.equal(binLabel(this.sites[0], facet(this.mapDataset, id)), bin)
})

// ── MapLibre parity ─────────────────────────────────────────────────────

/** Values on and just inside each bin's edges, plus missing/wrong-typed. */
function probes(bins: Bin[]): unknown[] {
  const out: unknown[] = [null, undefined]
  for (const b of bins) {
    if (b.value !== undefined) out.push(b.value)
    for (const edge of [b.min, b.max]) {
      if (typeof edge === "number") out.push(edge, edge - 0.001, edge + 0.001)
      if (typeof edge === "string") out.push(edge, `${edge}T12:00:00Z`)
    }
  }
  out.push("not a value", 0, -1)
  return out
}

When(
  "every fixed-bin facet is checked at its bin edges and with missing values",
  function (this: ClientWorld) {
    this.parityCases = []
    const analyte = datasetsFromCollections([{ id: "nm_arsenic_summary", links: [] }])
    for (const d of [...OVERRIDES, ...analyte]) {
      for (const spec of d.facets) {
        if (!("bins" in spec)) continue
        for (const v of probes(spec.bins)) {
          this.parityCases.push({ facet: spec, site: site({ [spec.field]: v }), label: `${d.id}/${spec.id}=${String(v)}` })
        }
      }
    }
    assert.ok(this.parityCases.length > 100)
  }
)

Then("the MapLibre color of each site is its bin's color", function (this: ClientWorld) {
  for (const { facet: fc, site: f, label } of this.parityCases) {
    // No property spec: evaluate as a plain value (the hex string), not a Color.
    const compiled = expression.createExpression(
      facetStyle(fc).color,
      "layers[0].paint.circle-color"
    )
    assert.equal(compiled.result, "success", label)
    if (compiled.result !== "success") continue
    const drawn = compiled.value.evaluate({ zoom: 0 }, {
      type: 1,
      properties: f.properties ?? {},
    } as never)
    const i = binIndex(f, fc)
    const expected = i === NO_VALUE ? "#9ca3af" : fc.bins[i].color
    assert.equal(String(drawn), expected, label)
  }
})

// ── Quantiles ───────────────────────────────────────────────────────────

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

Given("concentrations from {int} to {int} mg\\/L", function (this: ClientWorld, a: number, b: number) {
  this.values = range(a, b)
})

Given(
  "{int} sites at 0 mg\\/L and concentrations from {int} to {int} mg\\/L",
  function (this: ClientWorld, zeros: number, a: number, b: number) {
    this.values = [...new Array<number>(zeros).fill(0), ...range(a, b)]
  }
)

When("they are split into {int} quantile bins", function (this: ClientWorld, n: number) {
  this.bins = quantileBins(this.values, n, ["#1", "#2", "#3", "#4", "#5"], "mg/L")
})

Then("the bin labels are {string}", function (this: ClientWorld, labels: string) {
  assert.deepEqual(
    this.bins.map((b) => b.label),
    labels.split(";").map((s) => s.trim())
  )
})

Then("the URL keys of the bins are {string}", function (this: ClientWorld, keys: string) {
  const fc: Facet = { id: "conc", label: "Concentration", field: "latest_value", bins: this.bins }
  assert.deepEqual(
    this.bins.map((_, i) => binKey(fc, i)),
    keys.split(";").map((s) => s.trim())
  )
})

// ── Datasets from /collections ─────────────────────────────────────────

Given("DIE lists these collections:", function (this: ClientWorld, table: DataTable) {
  this.collections = table.hashes().map((r) => ({
    id: r.id,
    title: r.title || undefined,
    keywords: r.keywords ? r.keywords.split(",").map((k) => k.trim()) : undefined,
    links: [],
  }))
})

When("the map builds its datasets", function (this: ClientWorld) {
  this.mapDatasets = datasetsFromCollections(this.collections)
})

Then("the picker offers:", function (this: ClientWorld, table: DataTable) {
  assert.deepEqual(
    this.mapDatasets.map((d) => ({ group: d.group, id: d.id, label: d.label })),
    table.hashes()
  )
})

Then("{string} reads its time series from {string}", function (this: ClientWorld, id: string, c: string) {
  assert.equal(this.mapDatasets.find((d) => d.id === id)?.detail?.timeseries, c)
})

Then("{string} has no time series", function (this: ClientWorld, id: string) {
  assert.equal(this.mapDatasets.find((d) => d.id === id)?.detail?.timeseries, undefined)
})

Then("collection {string} opens map dataset {string}", function (c: string, id: string) {
  assert.equal(datasetForCollection(c), id === "none" ? undefined : id)
})

// ── Counts ──────────────────────────────────────────────────────────────

Given("these {string} sites:", function (this: ClientWorld, ds: string, table: DataTable) {
  this.mapDataset = ds
  this.sites = table.hashes().map((row) =>
    site(Object.fromEntries(Object.entries(row).map(([k, v]) => [k, cell(v)])))
  )
})

When(
  "only the {string} bin {string} is ticked",
  function (this: ClientWorld, id: string, bin: string) {
    const i = facet(this.mapDataset, id).bins.findIndex((b) => b.label === bin)
    assert.ok(i >= 0)
    this.selections = { [id]: [i] }
  }
)

Then("{string} counts are {string}", function (this: ClientWorld, id: string, expected: string) {
  const facets = [facet(this.mapDataset, "span"), facet(this.mapDataset, "readings")]
  const k = facets.findIndex((f) => f.id === id)
  const counts = facetCounts(this.sites, facets, this.selections).counts[k]
  const actual = facets[k].bins.map((b, i) => `${b.label}: ${counts[i]}`).join(", ")
  assert.equal(actual, expected)
})

Then("{int} sites pass the filters", function (this: ClientWorld, n: number) {
  const facets = [facet(this.mapDataset, "span"), facet(this.mapDataset, "readings")]
  const fc: FeatureCollection = { type: "FeatureCollection", features: this.sites }
  const out = filterFeatures(fc, { facets: { facets, selections: this.selections } })
  assert.equal(out.features.length, n)
})

// ── Typing and joins ────────────────────────────────────────────────────

Given("a DIE row with:", function (this: ClientWorld, table: DataTable) {
  this.dieRow = Object.fromEntries(table.hashes().map((r) => [r.key, r.value]))
})

When("it is loaded", function (this: ClientWorld) {
  this.dieRow = normalizeDieProps(this.dieRow)
})

Then("{string} is the string {string}", function (this: ClientWorld, k: string, v: string) {
  assert.equal(this.dieRow[k], v)
})

Then("{string} is the number {float}", function (this: ClientWorld, k: string, v: number) {
  assert.equal(this.dieRow[k], v)
})

Then("{string} is null", function (this: ClientWorld, k: string) {
  assert.equal(this.dieRow[k], null)
})

Given("major chemistry sites {string}", function (this: ClientWorld, ids: string) {
  this.sites = ids.split(",").map((id) => site({ feature_id: id.trim() }))
})

Given(
  "a hardness row for {string} with class {string}",
  function (this: ClientWorld, id: string, cls: string) {
    this.joinRows = [site({ feature_id: id, hardness_class: cls })]
  }
)

When("hardness is joined by feature id", function (this: ClientWorld) {
  const base: FeatureCollection = { type: "FeatureCollection", features: this.sites }
  const fc: FeatureCollection = { type: "FeatureCollection", features: this.joinRows }
  this.sites = joinByFeatureId(base, [{ fc, fields: ["hardness_class"] }]).features
})

Then("site {string} has hardness {string}", function (this: ClientWorld, id: string, cls: string) {
  assert.equal(this.sites.find((f) => f.properties?.feature_id === id)?.properties?.hardness_class, cls)
})

Then("site {string} has hardness null", function (this: ClientWorld, id: string) {
  assert.equal(this.sites.find((f) => f.properties?.feature_id === id)?.properties?.hardness_class, null)
})
