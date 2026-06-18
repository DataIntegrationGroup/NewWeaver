import { setWorldConstructor, World, Before, After } from "@cucumber/cucumber"

import { SensorThingsClient } from "@/clients/sensorThings"
import { OgcFeaturesClient } from "@/clients/ogcFeatures"

/**
 * Custom World for @client specs. Installs a fake `fetch` so the two data
 * adapters can be exercised without a network: it records every requested URL
 * and serves responses from a queue (falling back to per-path defaults).
 */
export class ClientWorld extends World {
  sta!: SensorThingsClient
  features!: OgcFeaturesClient

  requestedUrls: string[] = []
  /** Queued JSON bodies, consumed FIFO; defaults used when empty. */
  responseQueue: unknown[] = []
  /** When set, fetch resolves to a non-ok response with this status. */
  failStatus: number | null = null

  result: unknown
  error: Error | null = null

  get lastUrl(): string {
    return this.requestedUrls[this.requestedUrls.length - 1] ?? ""
  }

  /** Body the fake fetch returns for a URL when the queue is empty. */
  private defaultBody(url: string): unknown {
    if (url.includes("/Observations"))
      return { value: [{ "@iot.id": 1, phenomenonTime: "2020-01-01T00:00:00Z", result: 1.2 }] }
    if (url.includes("/Datastreams"))
      return { value: [{ "@iot.id": 1, name: "ds", unitOfMeasurement: { name: "m", symbol: "m" } }] }
    if (url.includes("/Locations"))
      return {
        value: [
          {
            "@iot.id": 1,
            name: "Loc 1",
            encodingType: "application/geo+json",
            location: { type: "Point", coordinates: [-106, 34] },
          },
        ],
      }
    if (url.includes("/Things"))
      return { value: [{ "@iot.id": 1, name: "thing" }] }
    if (url.includes("/collections/") && /\/items\/[^/?]+/.test(url))
      return { type: "Feature", id: "abc123", geometry: null, properties: {} }
    if (url.includes("/items"))
      return { type: "FeatureCollection", features: [], numberMatched: 0 }
    if (url.includes("/collections"))
      return { collections: [{ id: "c1", links: [{ href: "x", rel: "self" }] }], links: [] }
    return {}
  }

  installFetch() {
    const self = this
    const fake = async (input: string | URL): Promise<Response> => {
      const url = String(input)
      self.requestedUrls.push(url)
      if (self.failStatus) {
        return {
          ok: false,
          status: self.failStatus,
          statusText: "Error",
          json: async () => ({}),
        } as Response
      }
      const body = self.responseQueue.length
        ? self.responseQueue.shift()
        : self.defaultBody(url)
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => body,
      } as Response
    }
    ;(globalThis as { fetch: typeof fetch }).fetch = fake as typeof fetch
  }
}

setWorldConstructor(ClientWorld)

let originalFetch: typeof fetch | undefined

Before(function (this: ClientWorld) {
  originalFetch = globalThis.fetch
  this.installFetch()
})

After(function () {
  if (originalFetch) globalThis.fetch = originalFetch
})
