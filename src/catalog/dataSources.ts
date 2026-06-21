/**
 * Data-source agencies shown in the home-page carousel. Each contributes data
 * that Weaver reads through one of its standards-based services (STA, OGC API
 * Features, ArcGIS REST, or USGS Water Data for the Nation).
 *
 * Logos are the agency organization icons from the New Mexico Water Data CKAN
 * catalog (catalog.newmexicowaterdata.org); `org` is the CKAN organization slug,
 * and `icon` is its resolved `image_display_url`. Embedding the resolved URLs
 * keeps the home page from depending on a live CKAN call at render time.
 */
export interface DataSource {
  /** Agency display name. */
  name: string
  /** CKAN organization slug (links to its catalog page). */
  org: string
  /** Agency logo URL (CKAN image_display_url). */
  icon: string
  /** What they contribute, and via which Weaver service. */
  blurb: string
}

/** CKAN organization page for a slug. */
export const ckanOrgUrl = (org: string) =>
  `https://catalog.newmexicowaterdata.org/organization/${org}`

export const DATA_SOURCES: DataSource[] = [
  {
    name: "NM Bureau of Geology & Mineral Resources",
    org: "nmbgmr",
    icon: "https://catalog.newmexicowaterdata.org/uploads/group/2019-12-04-170724.562774NM-Geology-logo-1.jpg",
    blurb: "Integrated New Mexico water datasets — wells, springs, surface water, and chemistry — via OGC API Features.",
  },
  {
    name: "US Geological Survey",
    org: "usgs",
    icon: "https://catalog.newmexicowaterdata.org/uploads/group/2020-04-13-221531.660725usgs.JPG",
    blurb: "Groundwater sites and observations from NWIS — the modern USGS Water Data for the Nation API.",
  },
  {
    name: "NM Office of the State Engineer & ISC",
    org: "nm-ose-isc",
    icon: "https://www.ose.nm.gov/images/ose-logo.png",
    blurb: "Statewide Points of Diversion and Aquifer Test Wells via ArcGIS REST, plus OSE monitoring networks.",
  },
  {
    name: "Albuquerque Bernalillo County Water Utility Authority",
    org: "abcwua",
    icon: "https://catalog.newmexicowaterdata.org/uploads/group/2020-07-07-215854.151050wuath.jpg",
    blurb: "City of Albuquerque groundwater monitoring locations and time series via SensorThings (STA).",
  },
  {
    name: "Bernalillo County",
    org: "bernalillo-county",
    icon: "https://catalog.newmexicowaterdata.org/uploads/group/2023-03-09-174513.615098Bernco-LogoColorRGB-01.png",
    blurb: "County groundwater monitoring locations and time series via SensorThings (STA).",
  },
  {
    name: "Pecos Valley Artesian Conservancy District",
    org: "pecos-valley-artesian-conservancy-district",
    icon: "https://catalog.newmexicowaterdata.org/uploads/group/2020-04-06-211628.443903pvacd.JPG",
    blurb: "Pecos Valley groundwater monitoring locations and time series via SensorThings (STA).",
  },
  {
    name: "Elephant Butte Irrigation District",
    org: "elephant-butte-irrigation-district",
    icon: "https://catalog.newmexicowaterdata.org/uploads/group/2020-11-02-232055.597207EBID.png",
    blurb: "Lower Rio Grande monitoring locations and time series via SensorThings (STA).",
  },
  {
    name: "Estancia Basin Water Planning Committee",
    org: "estancia-basin-water-planning-committee",
    icon: "https://catalog.newmexicowaterdata.org/uploads/group/2024-04-12-184023.002662EBWPClogo.png",
    blurb: "Estancia Basin groundwater monitoring locations and time series via SensorThings (STA).",
  },
]
