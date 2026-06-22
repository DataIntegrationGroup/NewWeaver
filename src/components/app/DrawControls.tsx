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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
        // Select mode lets a finished shape be edited: drag the whole shape to
        // reposition, drag a vertex to move it, click a midpoint to add a
        // vertex, or click a vertex to delete it. Enabled for both shape kinds.
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
            rectangle: {
              feature: {
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
          },
        }),
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
      // Drop into select mode so the shape can be edited right away.
      draw.setMode("select")
      setMode(null)
    }
    draw.on("finish", onFinish)
    draw.on("change", emit)

    return () => {
      // On route change the MapLibre map may be torn down before this cleanup
      // runs; terra-draw's stop() then throws calling getSource/removeLayer on
      // a dead map. Swallow it so unmount can't blank the app (e.g. map→/help).
      try {
        draw.stop()
      } catch {
        // map already destroyed — nothing to tear down
      }
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
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side="right">
          Draw a rectangle to select features for export
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side="right">
          Draw a polygon to select features for export
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Clear drawn selection"
            data-testid="draw-clear"
            onClick={clear}
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Clear the drawn selection</TooltipContent>
      </Tooltip>
    </div>
  )
}
