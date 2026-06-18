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
      // Brief delay so the chart's loading state is observable.
      await new Promise((r) => setTimeout(r, 300))
      return json(/Datastreams\(103\)/.test(url) ? fx.OBSERVATIONS_EMPTY : fx.OBSERVATIONS_101).then(() => true)
    }
    if (/\/Locations\([^)]+\)\/Things/.test(url)) return json(fx.THINGS_WITH_DATASTREAMS).then(() => true)
    if (/\/Locations/.test(url)) return json(fx.LOCATIONS).then(() => true)
    return json({ value: [] }).then(() => true)
  }

  if (/features\.newmexicowaterdata/.test(url)) {
    if (/\/collections\/water_levels_summary\/items/.test(url)) return json(fx.WATER_LEVELS_ITEMS).then(() => true)
    if (/\/collections\/[^/]+\/items/.test(url)) return json({ type: "FeatureCollection", features: [] }).then(() => true)
    if (/\/collections/.test(url)) return json(fx.COLLECTIONS).then(() => true)
    return json({}).then(() => true)
  }

  return false
}

export class BrowserWorld extends World {
  context!: BrowserContext
  page!: Page

  get baseURL() {
    return baseURL
  }

  /** Open the map app (default) at an optional search string. */
  async open(search = "") {
    await this.page.goto(`${baseURL}/map${search}`)
    await this.page.getByTestId("map").waitFor()
  }

  /** Navigate to an arbitrary path (e.g. "/", "/help"). */
  async goto(path: string) {
    await this.page.goto(`${baseURL}${path}`)
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
  this.context = await browser.newContext()
  this.page = await this.context.newPage()
  // Mock upstream APIs; let everything else (basemap tiles, app assets) through.
  await this.context.route("**/*", async (route) => {
    if (!(await mockApi(route))) await route.continue()
  })
})

After(async function (this: BrowserWorld) {
  await this.context?.close()
})
