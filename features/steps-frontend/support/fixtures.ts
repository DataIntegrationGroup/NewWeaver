/** Deterministic API fixtures served to the browser via Playwright routing. */

export const LOCATIONS = {
  value: [
    {
      "@iot.id": 1,
      name: "YALE1",
      description: "Yale monitoring well 1",
      encodingType: "application/vnd.geo+json",
      location: { type: "Point", coordinates: [-106.62, 35.08] },
      properties: { agency: "CABQ" },
    },
    {
      "@iot.id": 2,
      name: "ALPHA WELL",
      description: "Alpha well",
      encodingType: "application/vnd.geo+json",
      location: { type: "Point", coordinates: [-104.52, 33.39] },
      properties: { agency: "CABQ" },
    },
  ],
}

/** Locations(:id)/Things?$expand=Datastreams */
export const THINGS_WITH_DATASTREAMS = {
  value: [
    {
      "@iot.id": 11,
      name: "Water Well",
      Datastreams: [
        {
          "@iot.id": 101,
          name: "Continuous Water Level",
          unitOfMeasurement: { name: "feet", symbol: "ft" },
        },
        {
          "@iot.id": 102,
          name: "Manual Water Level",
          unitOfMeasurement: { name: "feet", symbol: "ft" },
        },
        {
          "@iot.id": 103,
          name: "Empty Series",
          unitOfMeasurement: { name: "feet", symbol: "ft" },
        },
      ],
    },
  ],
}

export const OBSERVATIONS_101 = {
  value: [
    { "@iot.id": 1001, phenomenonTime: "2020-01-01T00:00:00Z", result: 12.4 },
    { "@iot.id": 1002, phenomenonTime: "2020-02-01T00:00:00Z", result: 12.1 },
    { "@iot.id": 1003, phenomenonTime: "2020-03-01T00:00:00Z", result: 11.8 },
  ],
}

export const OBSERVATIONS_EMPTY = { value: [] }

export const COLLECTIONS = {
  collections: [
    {
      id: "water_levels_summary",
      title: "Water-levels summary",
      links: [{ href: "x", rel: "self" }],
    },
  ],
  links: [],
}

// 15 features so pagination (pageSize 10) has a second page. Coordinates put
// wl-1 near Albuquerque and the rest near Roswell, so a tight extent around
// wl-1 isolates a single feature for the spatial-filter test.
export const WATER_LEVELS_ITEMS = {
  type: "FeatureCollection",
  numberMatched: 15,
  numberReturned: 15,
  features: Array.from({ length: 15 }, (_, i) => {
    const n = i + 1
    return {
      type: "Feature",
      id: `wl-${n}`,
      geometry: {
        type: "Point",
        coordinates: i === 0 ? [-106.62, 35.08] : [-104.52 + i * 0.01, 33.39],
      },
      properties: {
        id: `wl-${n}`,
        name: `Summary ${n}`,
        count: (n * 7) % 23,
        depth_ft: 50 + n,
      },
    }
  }),
}
