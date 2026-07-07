import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Check, Copy, Crosshair, X } from "lucide-react"
import type { Feature, Position } from "geojson"
import { usePostHog } from "posthog-js/react"

import type { LayerConfig, FeaturesLayer, StaLayer, ArcGisLayer, WfsLayer } from "@/catalog/layers"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useFeaturesLayer,
  useStaLayer,
  useArcGisLayer,
  useWfsLayer,
  useStaThings,
} from "@/hooks/useLayerData"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { selectFields, roundedFieldValue, type FieldDisplay } from "@/lib/fields"
import { DatastreamChart } from "./DatastreamChart"
import { Hydrograph } from "./Hydrograph"
import { FieldValue } from "@/components/ui/field-value"

interface InspectPanelProps {
  layer: LayerConfig
  featureId: string
  onClose: () => void
  /** Center the map on a coordinate (the panel's "Zoom to" action). */
  onZoomTo?: (lng: number, lat: number) => void
}

const PANEL_MIN = 300
const PANEL_MAX = 680
const PANEL_DEFAULT = 384
const PANEL_WIDTH_KEY = "weaver-inspect-width"

/** First [lng, lat] of a feature, regardless of geometry nesting. */
function firstPosition(f: Feature | undefined): Position | undefined {
  const g = f?.geometry
  if (!g || g.type === "GeometryCollection") return undefined
  let cur: unknown = (g as { coordinates: unknown }).coordinates
  while (Array.isArray(cur) && Array.isArray(cur[0])) cur = cur[0]
  return Array.isArray(cur) ? (cur as Position) : undefined
}

/** Copy-to-clipboard button; shows a check briefly after copying. */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <button
      type="button"
      aria-label="Copy value"
      title="Copy"
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        } catch {
          // clipboard unavailable — value is still selectable
        }
      }}
      className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover/row:opacity-100"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function PanelShell({
  title,
  onClose,
  onZoomTo,
  children,
}: {
  title: string
  onClose: () => void
  onZoomTo?: () => void
  children: React.ReactNode
}) {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(PANEL_WIDTH_KEY))
    return saved >= PANEL_MIN && saved <= PANEL_MAX ? saved : PANEL_DEFAULT
  })

  // Drag the left edge to resize. Moving left (smaller clientX) widens the panel.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const onMove = (ev: PointerEvent) =>
      setWidth(Math.min(PANEL_MAX, Math.max(PANEL_MIN, startW + (startX - ev.clientX))))
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      // Remember the chosen width for next time.
      setWidth((w) => {
        localStorage.setItem(PANEL_WIDTH_KEY, String(Math.round(w)))
        return w
      })
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  return (
    <aside
      data-testid="inspect-panel"
      style={{ width }}
      className={cn(
        "relative flex h-full shrink-0 flex-col border-l bg-card",
        // Mobile: cover the map as a full-width overlay instead of squishing it.
        "max-lg:absolute max-lg:inset-0 max-lg:z-40 max-lg:border-l-0 max-lg:!w-full"
      )}
    >
      {/* Resize handle on the left edge — desktop only (pointer drag). */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        data-testid="inspect-resize"
        onPointerDown={startResize}
        className="absolute left-0 top-0 z-20 hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40 lg:block"
      />
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="!text-lg !leading-tight" data-testid="inspect-title">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          {onZoomTo && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Zoom to feature"
                    data-testid="inspect-zoom"
                    onClick={onZoomTo}
                  >
                    <Crosshair />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Zoom to feature</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close panel"
            data-testid="inspect-close"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  )
}

/** Shared attribute-list panel for vector features (OGC Features + ArcGIS). */
/**
 * Stringify an attribute value for display. Scalars cast directly; object
 * values (e.g. STA `{ value, unit }` or nested metadata) get a readable form
 * instead of "[object Object]".
 */
function defaultFormat(key: string, value: unknown): string {
  const rounded = roundedFieldValue(key, value)
  if (rounded !== undefined) return rounded
  if (value === null || value === undefined) return ""
  if (typeof value === "object") {
    const o = value as Record<string, unknown>
    if ("value" in o) return o.unit ? `${o.value} ${o.unit}` : String(o.value)
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * Two-column property table: field name + value, with a per-row copy button.
 * Shared by the vector inspect panels and the STA Thing-properties section.
 */
function AttributeList({
  properties,
  fields,
  format = defaultFormat,
}: {
  properties: Record<string, unknown>
  fields?: FieldDisplay
  format?: (key: string, value: unknown) => string
}) {
  const keys = selectFields(Object.keys(properties), fields)
  if (keys.length === 0) return null
  return (
    <dl data-testid="attribute-list" className="grid grid-cols-1 gap-2 text-sm">
      {keys.map((k) => (
        <div key={k} className="group/row grid grid-cols-[40%_60%] gap-3 border-b py-1">
          <dt className="min-w-0 break-words font-medium text-muted-foreground">{k}</dt>
          <dd className="flex min-w-0 items-start gap-1.5 break-words">
            <span className="min-w-0 break-words"><FieldValue value={format(k, properties[k])} /></span>
            <CopyButton value={format(k, properties[k])} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Who operates / publishes this layer, in plain language (SPEC §V.V6). */
function whoMeasures(layer: LayerConfig): string {
  if (layer.source === "sta") return layer.title
  if (layer.source === "arcgis") return "the NM Office of the State Engineer"
  if (layer.section === "Groundwater levels" || layer.section === "Groundwater Chemistry")
    return "New Mexico Water Data (integrated products)"
  if (layer.section === "NWIS") return "the U.S. Geological Survey (USGS)"
  return "the NM Bureau of Geology & Mineral Resources"
}

/** What kind of thing this feature is, in plain language (SPEC §V.V6). */
function whatIsIt(layer: LayerConfig): string {
  if (layer.source === "sta") return "Monitoring location"
  switch (layer.measurementType) {
    case "surface_water":
      return "Surface-water feature"
    case "water_quality":
      return "Water-quality sampling point"
    case "water_level":
    case "wells":
      return "Well / monitoring point"
    case "weather":
      return "Weather station"
    case "geochemistry":
      return "Sample location"
    default:
      return "Mapped feature"
  }
}

/** One plain-language sentence leading the panel: what it is, who measures it. */
function PlainLead({ layer }: { layer: LayerConfig }) {
  return (
    <p data-testid="inspect-summary" className="text-sm text-muted-foreground">
      {whatIsIt(layer)} — from{" "}
      <span className="font-medium text-foreground">{whoMeasures(layer)}</span>.
    </p>
  )
}

function AttributeInspect({
  title,
  lead,
  fc,
  featureId,
  fields,
  format,
  onClose,
  onZoomTo,
}: {
  title: string
  lead?: ReactNode
  fc: { features: Feature[] } | undefined
  featureId: string
  fields?: FieldDisplay
  format?: (key: string, value: unknown) => string
  onClose: () => void
  onZoomTo?: (lng: number, lat: number) => void
}) {
  const feature = fc?.features.find(
    (f) => String(f.properties?.id ?? f.id) === featureId
  )
  const pos = firstPosition(feature)

  return (
    <PanelShell
      title={title}
      onClose={onClose}
      onZoomTo={pos && onZoomTo ? () => onZoomTo(pos[0], pos[1]) : undefined}
    >
      {!feature ? (
        <p className="text-sm text-muted-foreground">Feature not found.</p>
      ) : (
        <div className="space-y-4">
          {/* Plain-language summary leads; technical attributes follow (V6). */}
          {lead}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </p>
            <AttributeList properties={feature.properties ?? {}} fields={fields} format={format} />
          </div>
        </div>
      )}
    </PanelShell>
  )
}

/** Attribute list for a vector feature from OGC API Features. */
function FeatureInspect({ layer, featureId, onClose, onZoomTo }: { layer: FeaturesLayer } & Omit<InspectPanelProps, "layer">) {
  const { data } = useFeaturesLayer(layer)
  return <AttributeInspect title={layer.title} lead={<PlainLead layer={layer} />} fc={data} featureId={featureId} fields={layer.fields} format={layer.formatValue} onClose={onClose} onZoomTo={onZoomTo} />
}

/** Feature-layer inspector that leads with the well's water-level hydrograph
 *  (depth to water over time), then its site metadata. Used for layers flagged
 *  `hydrograph` (e.g. die:nm_waterlevel_status), whose feature `id` keys the
 *  timeseries fetch. */
function HydrographInspect({ layer, featureId, onClose, onZoomTo }: { layer: FeaturesLayer } & Omit<InspectPanelProps, "layer">) {
  const { data } = useFeaturesLayer(layer)
  const feature = data?.features.find((f) => String(f.id ?? f.properties?.id) === featureId)
  const pos = firstPosition(feature)
  const props = (feature?.properties ?? {}) as Record<string, unknown>
  const wellId = String(props.id ?? feature?.id ?? "")
  const name = (props.name as string) ?? `Well ${wellId}`

  return (
    <PanelShell
      title={name}
      onClose={onClose}
      onZoomTo={pos && onZoomTo ? () => onZoomTo(pos[0], pos[1]) : undefined}
    >
      {!feature ? (
        <p className="text-sm text-muted-foreground">Feature not found.</p>
      ) : (
        <div className="space-y-4">
          <PlainLead layer={layer} />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hydrograph
            </p>
            {wellId ? (
              <Hydrograph wellId={wellId} name={name} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No well id on this feature — cannot load a hydrograph.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </p>
            <AttributeList properties={props} fields={layer.fields} format={layer.formatValue} />
          </div>
        </div>
      )}
    </PanelShell>
  )
}

/** Attribute list for an OSE GIS feature from ArcGIS REST. */
function ArcGisInspect({ layer, featureId, onClose, onZoomTo }: { layer: ArcGisLayer } & Omit<InspectPanelProps, "layer">) {
  const { data } = useArcGisLayer(layer)
  return <AttributeInspect title={layer.title} lead={<PlainLead layer={layer} />} fc={data} featureId={featureId} fields={layer.fields} format={layer.formatValue} onClose={onClose} onZoomTo={onZoomTo} />
}

/** Attribute list for a GeoServer WFS feature. */
function WfsInspect({ layer, featureId, onClose, onZoomTo }: { layer: WfsLayer } & Omit<InspectPanelProps, "layer">) {
  const { data } = useWfsLayer(layer)
  return <AttributeInspect title={layer.title} lead={<PlainLead layer={layer} />} fc={data} featureId={featureId} fields={layer.fields} format={layer.formatValue} onClose={onClose} onZoomTo={onZoomTo} />
}

/** Monitoring location → datastreams → time-series chart. */
function StaInspect({ layer, featureId, onClose, onZoomTo }: { layer: StaLayer } & Omit<InspectPanelProps, "layer">) {
  const posthog = usePostHog()
  const { data: fc } = useStaLayer(layer)
  const location = fc?.features.find((f) => String(f.properties?.id) === featureId)
  const name = (location?.properties?.name as string) ?? `Location ${featureId}`
  const pos = firstPosition(location)

  const { data: things, isLoading } = useStaThings(featureId, layer.staBaseUrl)
  // Memoize so the reference is stable across renders — otherwise the
  // auto-select effect below would re-run every render and clobber the user's
  // datastream choice on the next paint.
  const datastreams = useMemo(
    () => things?.flatMap((t) => t.Datastreams ?? []),
    [things]
  )
  // Merge the properties of the location's Things (usually one) into one table.
  const thingProps = Object.assign({}, ...(things ?? []).map((t) => t.properties ?? {}))
  const [dsId, setDsId] = useState<string | undefined>(undefined)

  // Default to the first datastream once they load, and recover if the current
  // selection isn't in the list (e.g. after switching locations) — but keep a
  // valid user choice untouched.
  useEffect(() => {
    if (!datastreams || datastreams.length === 0) return
    const ids = datastreams.map((d) => String(d["@iot.id"]))
    setDsId((cur) => (cur && ids.includes(cur) ? cur : ids[0]))
  }, [datastreams])

  const selected = datastreams?.find((d) => String(d["@iot.id"]) === dsId)

  return (
    <PanelShell
      title={name}
      onClose={onClose}
      onZoomTo={pos && onZoomTo ? () => onZoomTo(pos[0], pos[1]) : undefined}
    >
      <div className="space-y-4">
        {/* Plain-language summary leads; technical terms follow (SPEC §V.V6). */}
        <PlainLead layer={layer} />
        {Object.keys(thingProps).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </p>
            <AttributeList properties={thingProps} />
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Measurements
          </label>
          {isLoading ? (
            <div data-testid="datastream-skeleton" className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !datastreams || datastreams.length === 0 ? (
            <p data-testid="no-datastreams" className="text-sm text-muted-foreground">
              No measurements recorded at this location.
            </p>
          ) : (
            <Select
              value={dsId ?? ""}
              onValueChange={(id) => {
                const ds = datastreams.find((d) => String(d["@iot.id"]) === id)
                posthog.capture("datastream_selected", {
                  datastream_id: id,
                  datastream_name: ds?.name,
                  location_id: featureId,
                  layer_id: layer.id,
                })
                setDsId(id)
              }}
            >
              <SelectTrigger data-testid="datastream-select">
                <SelectValue placeholder="Select a datastream" />
              </SelectTrigger>
              <SelectContent>
                {datastreams.map((d) => (
                  <SelectItem key={String(d["@iot.id"])} value={String(d["@iot.id"])}>
                    {d.name}
                    {d.unitOfMeasurement?.symbol ? ` (${d.unitOfMeasurement.symbol})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selected && (
          <>
            <Separator />
            <DatastreamChart datastream={selected} staBaseUrl={layer.staBaseUrl} />
          </>
        )}
      </div>
    </PanelShell>
  )
}

export function InspectPanel({ layer, featureId, onClose, onZoomTo }: InspectPanelProps) {
  if (layer.source === "features" && layer.hydrograph)
    return <HydrographInspect layer={layer} featureId={featureId} onClose={onClose} onZoomTo={onZoomTo} />
  if (layer.source === "sta")
    return <StaInspect layer={layer} featureId={featureId} onClose={onClose} onZoomTo={onZoomTo} />
  if (layer.source === "arcgis")
    return <ArcGisInspect layer={layer} featureId={featureId} onClose={onClose} onZoomTo={onZoomTo} />
  if (layer.source === "wfs")
    return <WfsInspect layer={layer} featureId={featureId} onClose={onClose} onZoomTo={onZoomTo} />
  return <FeatureInspect layer={layer} featureId={featureId} onClose={onClose} onZoomTo={onZoomTo} />
}
