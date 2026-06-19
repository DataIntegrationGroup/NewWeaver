import { useEffect, useRef, useState } from "react"
import { Hexagon, Square, Trash2 } from "lucide-react"
import {
  TerraDraw,
  TerraDrawRectangleMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from "terra-draw"
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter"
import type { Map as MaplibreMap } from "maplibre-gl"
import type { Polygon } from "geojson"
import { usePostHog } from "posthog-js/react"

import { Button } from "@/components/ui/button"

type DrawMode = "rectangle" | "polygon"

interface DrawControlsProps {
  /** The underlying MapLibre map, once loaded. */
  map: MaplibreMap | null
  /** Reports the current set of drawn polygons (rectangles included). */
  onShapesChange: (shapes: Polygon[]) => void
}

/**
 * DrawControls — a small toolbar to draw rectangle / polygon selections on the
 * map (terra-draw). Drawn polygons are reported up so the export selection can
 * include the points inside them. See features/export/design.md.
 */
export function DrawControls({ map, onShapesChange }: DrawControlsProps) {
  const posthog = usePostHog()
  const drawRef = useRef<TerraDraw | null>(null)
  const [mode, setMode] = useState<DrawMode | null>(null)

  useEffect(() => {
    if (!map) return
    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [
        new TerraDrawRectangleMode(),
        new TerraDrawPolygonMode(),
        new TerraDrawSelectMode(),
      ],
    })
    draw.start()
    drawRef.current = draw

    const emit = () => {
      const polys = draw
        .getSnapshot()
        .map((f) => f.geometry)
        .filter((g): g is Polygon => g.type === "Polygon")
      onShapesChange(polys)
    }
    const onFinish = () => {
      const polys = draw
        .getSnapshot()
        .map((f) => f.geometry)
        .filter((g): g is Polygon => g.type === "Polygon")
      posthog.capture("draw_shape_completed", { shape_count: polys.length })
      onShapesChange(polys)
    }
    draw.on("finish", onFinish)
    draw.on("change", emit)

    return () => {
      draw.stop()
      drawRef.current = null
    }
  }, [map, onShapesChange, posthog])

  const toggle = (m: DrawMode) => {
    const draw = drawRef.current
    if (!draw) return
    if (mode === m) {
      draw.setMode("select")
      setMode(null)
    } else {
      draw.setMode(m)
      setMode(m)
    }
  }

  const clear = () => {
    drawRef.current?.clear()
    setMode(null)
    onShapesChange([])
  }

  if (!map) return null

  return (
    <div className="flex flex-col gap-1 rounded-md border bg-card p-1 shadow-sm">
      <Button
        variant={mode === "rectangle" ? "default" : "ghost"}
        size="icon-sm"
        aria-label="Draw rectangle selection"
        aria-pressed={mode === "rectangle"}
        data-testid="draw-rectangle"
        onClick={() => toggle("rectangle")}
      >
        <Square />
      </Button>
      <Button
        variant={mode === "polygon" ? "default" : "ghost"}
        size="icon-sm"
        aria-label="Draw polygon selection"
        aria-pressed={mode === "polygon"}
        data-testid="draw-polygon"
        onClick={() => toggle("polygon")}
      >
        <Hexagon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear drawn selection"
        data-testid="draw-clear"
        onClick={clear}
      >
        <Trash2 />
      </Button>
    </div>
  )
}
