/**
 * "From the sources to your tools" diagram for the home page: partner networks
 * feed Weaver, which serves the map, the datasets, desktop GIS, and the API.
 * Beams are Magic UI AnimatedBeams drawn between the node refs; they re-path on
 * resize, so the row (md+) / column (mobile) switch is plain flex classes.
 */
import { createRef, useMemo, useRef, type Ref } from "react"
import { Code2, Droplet, Globe, Layers, Map as MapIcon, type LucideIcon } from "lucide-react"

import { AnimatedBeam } from "@/components/ui/animated-beam"
import { cn } from "@/lib/utils"
import nmwdiIcon from "@/assets/nmwdi-icon.png"

const SOURCES = ["EBID", "Estancia Basin", "NMBGMR", "USGS"]

const OUTPUTS: { icon: LucideIcon; label: string }[] = [
  { icon: MapIcon, label: "Interactive map" },
  { icon: Layers, label: "Datasets" },
  { icon: Globe, label: "ArcGIS Pro / QGIS" },
  { icon: Code2, label: "Open API" },
]

// NMWDI light teal → sand, fixed because the band is dark in both themes.
const BEAM_FROM = "#a6ccd6"
const BEAM_TO = "#e8bd86"

function Node({
  ref,
  icon: Icon,
  label,
  side,
}: {
  ref: Ref<HTMLDivElement>
  icon: LucideIcon
  label: string
  side: "start" | "end"
}) {
  return (
  <div
    className={cn(
      "flex flex-col items-center gap-2 md:gap-3",
      side === "start" ? "md:flex-row-reverse" : "md:flex-row"
    )}
  >
    <div
      ref={ref}
      className="z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-primary ring-1 ring-white/25"
    >
      <Icon className="size-5" />
    </div>
    <span className="text-center text-sm font-medium">
      {label}
    </span>
  </div>
  )
}

export function DataFlowBeam() {
  const containerRef = useRef<HTMLDivElement>(null)
  const hubRef = useRef<HTMLDivElement>(null)
  const sourceRefs = useMemo(() => SOURCES.map(() => createRef<HTMLDivElement>()), [])
  const outputRefs = useMemo(() => OUTPUTS.map(() => createRef<HTMLDivElement>()), [])

  // Hide the travelling gradient (the second path) for reduced motion, leaving
  // the static track.
  const beam = {
    containerRef,
    gradientStartColor: BEAM_FROM,
    gradientStopColor: BEAM_TO,
    pathColor: "white",
    pathOpacity: 0.16,
    ease: "linear" as const,
    duration: 4,
    className: "motion-reduce:[&>path:last-of-type]:hidden",
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Four data sources connect to Weaver, which connects to the map, datasets, GIS, and API"
      className="relative mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-16 md:flex-row md:gap-10"
    >
      <div className="flex w-full justify-between gap-2 md:w-auto md:flex-col md:items-end md:gap-8">
        {SOURCES.map((label, i) => (
          <Node key={label} ref={sourceRefs[i]} icon={Droplet} label={label} side="start" />
        ))}
      </div>

      <div
        ref={hubRef}
        className="z-10 flex size-25 shrink-0 flex-col items-center justify-center rounded-full bg-white ring-12 ring-white/10"
      >
        <img src={nmwdiIcon} alt="" className="h-11 w-auto" />
        <span className="font-heading text-base font-semibold text-brand-deep">
          Weaver
        </span>
      </div>

      <div className="flex w-full justify-between gap-2 md:w-auto md:flex-col md:items-start md:gap-8">
        {OUTPUTS.map((o, i) => (
          <Node key={o.label} ref={outputRefs[i]} icon={o.icon} label={o.label} side="end" />
        ))}
      </div>

      {sourceRefs.map((ref, i) => (
        <AnimatedBeam key={`s${i}`} {...beam} fromRef={ref} toRef={hubRef} />
      ))}
      {outputRefs.map((ref, i) => (
        <AnimatedBeam key={`o${i}`} {...beam} fromRef={hubRef} toRef={ref} />
      ))}
    </div>
  )
}
