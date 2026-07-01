/**
 * Region-of-interest catalog — named boundary sets a user can pick instead of
 * hand-drawing a shape (counties, public water systems, hydrologic basins).
 * Each entry is an ArcGIS REST FeatureServer layer on OSE's Esri org (the same
 * host the OSE GIS layers already read from — see catalog/layers.ts), read via
 * the shared ArcGisRestClient. Picking a region resolves to one or more GeoJSON
 * Polygons, which slot into the same drawn-shape filtering/export path as a
 * hand-drawn rectangle or polygon (lib/selection.ts `pointInAnyShape`).
 */
import { OSE_ARCGIS_BASE_URL } from "@/config"

export type RegionKind = "county" | "pws" | "basin"

export interface RegionCatalogEntry {
  kind: RegionKind
  /** Singular display label, e.g. "County". */
  label: string
  description: string
  /** Full FeatureServer layer URL (…/FeatureServer/0). */
  serviceUrl: string
  /** Field holding the row's stable numeric id. */
  idField: string
  /** Field holding the region's display name. */
  nameField: string
}

export const REGION_CATALOG: Record<RegionKind, RegionCatalogEntry> = {
  county: {
    kind: "county",
    label: "County",
    description: "New Mexico county boundaries.",
    serviceUrl: `${OSE_ARCGIS_BASE_URL}/Counties/FeatureServer/0`,
    idField: "OBJECTID",
    nameField: "NAME10",
  },
  pws: {
    kind: "pws",
    label: "Public Water System",
    description: "Public water system service-area boundaries (OSE WATERS database).",
    serviceUrl: `${OSE_ARCGIS_BASE_URL}/New_Mexico_Public_Water_Systems/FeatureServer/0`,
    idField: "OBJECTID",
    nameField: "PublicSystemName",
  },
  basin: {
    kind: "basin",
    label: "Hydrologic Basin",
    description: "OSE declared groundwater basin boundaries.",
    serviceUrl: `${OSE_ARCGIS_BASE_URL}/DeclaredGroundwaterBasins/FeatureServer/0`,
    idField: "OBJECTID_1",
    nameField: "Basin",
  },
}

export const REGION_KINDS: RegionKind[] = ["county", "pws", "basin"]
