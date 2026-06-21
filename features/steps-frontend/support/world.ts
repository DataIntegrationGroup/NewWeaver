import {
  setWorldConstructor,
  World,
  Before,
  After,
  BeforeAll,
  AfterAll,
  setDefaultTimeout,
} from "@cucumber/cucumber"
import { chromium, type Browser, type BrowserContext, type Page, type Route } from "playwright"
import { createServer, type ViteDevServer } from "vite"

import * as fx from "./fixtures"

setDefaultTimeout(60_000)

let server: ViteDevServer
let browser: Browser
let baseURL: string

BeforeAll(async function () {
  server = await createServer({
    configFile: "vite.config.ts",
    server: { port: 5180, strictPort: true },
    logLevel: "warn",
  })
  await server.listen()
  baseURL = `http://localhost:5180`
  browser = await chromium.launch()
})

AfterAll(async function () {
  await browser?.close()
  await server?.close()
})

// 1x1 transparent PNG — stubbed for satellite raster tiles so tests never hit
// the real Esri service.
const TILE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
)

/** Fulfill an upstream API request from fixtures; returns false if unmatched. */
async function mockApi(route: Route): Promise<boolean> {
  const url = route.request().url()
  const json = (body: unknown) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    })

  if (/sta\.newmexicowaterdata|st2\.newmexicowaterdata/.test(url)) {
    if (/\/Datastreams\([^)]+\)\/Observations/.test(url)) {
      // Delay so the chart's loading state is reliably observable.
      await new Promise((r) => setTimeout(r, 600))
      return json(/Datastreams\(103\)/.test(url) ? fx.OBSERVATIONS_EMPTY : fx.OBSERVATIONS_101).then(() => true)
    }
    if (/\/Locations\([^)]+\)\/Things/.test(url)) return json(fx.THINGS_WITH_DATASTREAMS).then(() => true)
    // Bernalillo agency returns a large set (> large-export threshold).
    if (/\/Locations/.test(url) && /BernCo/.test(url)) return json(fx.LOCATIONS_MANY).then(() => true)
    if (/\/Locations/.test(url)) return json(fx.LOCATIONS).then(() => true)
    return json({ value: [] }).then(() => true)
  }

  if (/features\.newmexicowaterdata/.test(url)) {
    if (/\/collections\/water_levels_summary\/items/.test(url)) return json(fx.WATER_LEVELS_ITEMS).then(() => true)
    if (/\/collections\/[^/]+\/items/.test(url)) return json({ type: "FeatureCollection", features: [] }).then(() => true)
    if (/\/collections/.test(url)) return json(fx.COLLECTIONS).then(() => true)
    return json({}).then(() => true)
  }

  // Ocotillo OGC API Features — springs carries the shared vector fixture and
  // resolves immediately (table/inspect specs read it synchronously). The
  // latest_tds_wells collection is delayed so the per-layer loading spinner is
  // observable when that layer is toggled on.
  if (/ocotillo-api\.newmexicowaterdata/.test(url)) {
    if (/\/collections\/springs\/items/.test(url)) return json(fx.WATER_LEVELS_ITEMS).then(() => true)
    if (/\/collections\/latest_tds_wells\/items/.test(url)) {
      await new Promise((r) => setTimeout(r, 400))
      return json({ type: "FeatureCollection", features: [] }).then(() => true)
    }
    if (/\/collections\/[^/]+\/items/.test(url)) return json({ type: "FeatureCollection", features: [] }).then(() => true)
    if (/\/collections/.test(url)) return json(fx.OCOTILLO_COLLECTIONS).then(() => true)
    return json({}).then(() => true)
  }

  // OSE GIS — ArcGIS REST FeatureServer. Answer the count probe, then serve
  // the aquifer-test fixture page for the actual feature query.
  if (/services2\.arcgis\.com/.test(url)) {
    if (/returnCountOnly=true/.test(url)) return json({ count: 2 }).then(() => true)
    return json(fx.OSE_AQUIFER_FC).then(() => true)
  }

  // Esri satellite raster tiles — stub so the satellite basemap renders without
  // a real network call.
  if (/arcgisonline\.com/.test(url)) {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      body: TILE_PNG,
    })
    return true
  }

  return false
}

export class BrowserWorld extends World {
  context!: BrowserContext
  page!: Page
  /** Every URL the page requested — lets steps assert tiles/APIs were hit. */
  requestedUrls: string[] = []

  get baseURL() {
    return baseURL
  }

  /** Open the map app (default) at an optional search string. */
  async open(search = "") {
    await this.page.goto(`${baseURL}/map${search}`)
    await this.page.getByTestId("map").waitFor()
    // Wait for the map's load event to attach the test seam, so map steps
    // never race the WebGL init.
    await this.page.waitForFunction(
      () => typeof (window as unknown as { __weaverMap?: unknown }).__weaverMap !== "undefined"
    )
  }

  /** Navigate to an arbitrary path (e.g. "/", "/help"). */
  async goto(path: string) {
    await this.page.goto(`${baseURL}${path}`)
  }

  /** Inject drawn shapes via the app's test seam (no terra-draw canvas). */
  async setShapes(polygons: unknown[]) {
    await this.page.evaluate(
      (p) =>
        (window as unknown as { __weaver: { setShapes: (s: unknown[]) => void } }).__weaver.setShapes(p),
      polygons
    )
  }

  /** Select a feature via the app's test seam (deterministic, no canvas click). */
  async selectFeature(layerId: string, featureId: string) {
    await this.page.evaluate(
      ([l, f]) =>
        (window as unknown as { __weaver: { select: (s: { layerId: string; featureId: string }) => void } }).__weaver.select(
          { layerId: l, featureId: f }
        ),
      [layerId, featureId]
    )
  }
}

setWorldConstructor(BrowserWorld)

Before(async function (this: BrowserWorld) {
  this.context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  })
  this.page = await this.context.newPage()
  // Mock upstream APIs; let everything else (basemap tiles, app assets) through.
  await this.context.route("**/*", async (route) => {
    this.requestedUrls.push(route.request().url())
    if (!(await mockApi(route))) await route.continue()
  })
})

After(async function (this: BrowserWorld) {
  await this.context?.close()
})
