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

/** 30 locations (> the 25 large-export threshold) for the Bernalillo agency. */
export const LOCATIONS_MANY = {
  value: Array.from({ length: 30 }, (_, i) => ({
    "@iot.id": 100 + i,
    name: `BERN-${i + 1}`,
    description: `Bernalillo well ${i + 1}`,
    encodingType: "application/vnd.geo+json",
    location: { type: "Point", coordinates: [-106.6 + i * 0.01, 35.1] },
    properties: { agency: "BernCo" },
  })),
}

/** Locations(:id)/Things?$expand=Datastreams */
export const THINGS_WITH_DATASTREAMS = {
  value: [
    {
      "@iot.id": 11,
      name: "Water Well",
      properties: {
        well_depth_ft: 120,
        aquifer: "Santa Fe Group",
        agency: "CABQ",
      },
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

export const OCOTILLO_COLLECTIONS = {
  collections: [
    { id: "springs", title: "Springs", links: [{ href: "x", rel: "self" }] },
    {
      id: "latest_tds_wells",
      title: "Latest TDS (Wells)",
      links: [{ href: "x", rel: "self" }],
    },
  ],
  links: [],
}

/**
 * OSE Aquifer Test Wells — ArcGIS REST f=geojson page. Carries a few display
 * columns plus the raw PLSS pieces, so the layer's mapProperties can combine
 * them into a single `PLSS` field.
 */
export const OSE_AQUIFER_FC = {
  type: "FeatureCollection",
  exceededTransferLimit: false,
  features: [
    {
      type: "Feature",
      id: 501,
      geometry: { type: "Point", coordinates: [-106.6, 35.1] },
      properties: {
        objectid: 501,
        OSE_POD_ID: "OSE-501",
        COUNTY: "SIERRA",
        BASIN: "RG",
        WELL_DEPTH_FT_BGL: 120,
        URL_REFERENCE: "https://example.org/report.pdf",
        TWS: "11S",
        RNG: "05W",
        SEC: 26,
        qtr_4th: "NW (1)",
        qtr_16th: "NE (2)",
        qtr_64th: null,
        qtr_256th: null,
      },
    },
    {
      type: "Feature",
      id: 502,
      geometry: { type: "Point", coordinates: [-104.5, 33.4] },
      properties: {
        objectid: 502,
        OSE_POD_ID: "OSE-502",
        COUNTY: "LINCOLN",
        BASIN: "RG",
        WELL_DEPTH_FT_BGL: 80,
        TWS: "14S",
        RNG: "04W",
        SEC: 19,
        qtr_4th: "SW (3)",
        qtr_16th: "SE (4)",
        qtr_64th: "SW (3)",
        qtr_256th: null,
      },
    },
  ],
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
