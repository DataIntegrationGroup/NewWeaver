/** Export selection: the filtered features, narrowed to drawn shapes like the attribute table. */
import type { Feature, Polygon } from "geojson"

import { pointInAnyShape } from "@/lib/geo"

export interface Selection {
  features: Feature[]
  counts: { filtered: number; drawn: number }
}

/** The filtered features, narrowed to drawn shapes when there are any. */
export function resolveSelection(filtered: Feature[], shapes: Polygon[]): Selection {
  if (!shapes.length) return { features: filtered, counts: { filtered: filtered.length, drawn: 0 } }
  const features = filtered.filter((f) => pointInAnyShape(f, shapes))
  return { features, counts: { filtered: 0, drawn: features.length } }
}
