/**
 * Region-of-interest data access: list the named regions of a kind and fetch
 * one region's geometry.
 */
import type { Feature, MultiPolygon, Polygon } from "geojson"
import { REGION_CATALOG, type RegionKind } from "@/catalog/regions"
import { arcgisClient } from "@/clients/arcGisRest"

export interface RegionOption {
  id: string
  name: string
}

/** Corrections for region names the upstream ArcGIS services publish mangled.
 *  OSE's Counties layer serves "Do0a Ana" — the ñ dropped to a "0" at the
 *  source. Fix on read so every display point (suggestions, chips) is right. */
const REGION_NAME_FIXES: Record<string, string> = {
  "Do0a Ana": "Doña Ana",
}

/** Restore a mangled region name from the upstream service, else pass through. */
export function cleanRegionName(name: string): string {
  return REGION_NAME_FIXES[name] ?? name
}

/** Every named region of a kind (id + name only — no geometry). */
export async function fetchRegionOptions(kind: RegionKind): Promise<RegionOption[]> {
  const entry = REGION_CATALOG[kind]
  const client = arcgisClient(entry.serviceUrl)
  const fc = await client.getAllFeatures({
    outFields: `${entry.nameField},${entry.idField}`,
  })
  const options = fc.features
    .map((f) => ({
      id: String(f.properties?.[entry.idField] ?? f.id ?? ""),
      name: cleanRegionName(String(f.properties?.[entry.nameField] ?? "").trim()),
    }))
    .filter((o) => o.id && o.name)
  options.sort((a, b) => a.name.localeCompare(b.name))
  return options
}

/** Full geometry + attributes for one region. */
export function fetchRegionFeature(
  kind: RegionKind,
  id: string
): Promise<Feature | undefined> {
  const entry = REGION_CATALOG[kind]
  return arcgisClient(entry.serviceUrl).getFeature(id, entry.idField)
}

/** Split a Polygon/MultiPolygon into one Polygon per ring set — the same shape
 *  the drawn-selection path (DrawControls/selection.ts) already expects. */
export function regionPolygons(f: Feature): Polygon[] {
  const g = f.geometry
  if (!g) return []
  if (g.type === "Polygon") return [g]
  if (g.type === "MultiPolygon") {
    return (g as MultiPolygon).coordinates.map((coordinates) => ({
      type: "Polygon" as const,
      coordinates,
    }))
  }
  return []
}

/** Bounding box across one or more polygons, [minX, minY, maxX, maxY]. */
export function polygonsBbox(
  polys: Polygon[]
): [number, number, number, number] | undefined {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of polys) {
    for (const ring of p.coordinates) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : undefined
}
