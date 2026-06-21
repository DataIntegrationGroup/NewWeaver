import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { usePostHog } from "posthog-js/react"

import type { LayerConfig, FeaturesLayer, StaLayer, ArcGisLayer } from "@/catalog/layers"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
  useDatastreams,
} from "@/hooks/useLayerData"
import { selectFields, type FieldDisplay } from "@/lib/fields"
import { DatastreamChart } from "./DatastreamChart"
import { FieldValue } from "./FieldValue"

interface InspectPanelProps {
  layer: LayerConfig
  featureId: string
  onClose: () => void
}

function PanelShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <aside
      data-testid="inspect-panel"
      className="flex h-full w-96 shrink-0 flex-col overflow-y-auto border-l bg-card"
    >
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="!text-lg !leading-tight" data-testid="inspect-title">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close panel"
          data-testid="inspect-close"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>
      <div className="flex-1 p-4">{children}</div>
    </aside>
  )
}

/** Shared attribute-list panel for vector features (OGC Features + ArcGIS). */
function AttributeInspect({
  title,
  fc,
  featureId,
  fields,
  format = (_k, v) => String(v ?? ""),
  onClose,
}: {
  title: string
  fc: { features: { id?: string | number; properties: Record<string, unknown> | null }[] } | undefined
  featureId: string
  fields?: FieldDisplay
  format?: (key: string, value: unknown) => string
  onClose: () => void
}) {
  const feature = fc?.features.find(
    (f) => String(f.id ?? f.properties?.id) === featureId
  )
  const props = feature?.properties ?? {}
  // Same field rules as the hover popup and the multi-record attribute table.
  const keys = selectFields(Object.keys(props), fields)

  return (
    <PanelShell title={title} onClose={onClose}>
      {!feature ? (
        <p className="text-sm text-muted-foreground">Feature not found.</p>
      ) : (
        <dl data-testid="attribute-list" className="grid grid-cols-1 gap-2 text-sm">
          {keys.map((k) => (
            <div key={k} className="grid grid-cols-[40%_60%] gap-2 border-b py-1">
              <dt className="font-medium text-muted-foreground">{k}</dt>
              <dd className="break-words">
                <FieldValue value={format(k, props[k])} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </PanelShell>
  )
}

/** Attribute list for a vector feature from OGC API Features. */
function FeatureInspect({ layer, featureId, onClose }: { layer: FeaturesLayer } & Omit<InspectPanelProps, "layer">) {
  const { data } = useFeaturesLayer(layer)
  return <AttributeInspect title={layer.title} fc={data} featureId={featureId} fields={layer.fields} format={layer.formatValue} onClose={onClose} />
}

/** Attribute list for an OSE GIS feature from ArcGIS REST. */
function ArcGisInspect({ layer, featureId, onClose }: { layer: ArcGisLayer } & Omit<InspectPanelProps, "layer">) {
  const { data } = useArcGisLayer(layer)
  return <AttributeInspect title={layer.title} fc={data} featureId={featureId} fields={layer.fields} format={layer.formatValue} onClose={onClose} />
}

/** Monitoring location → datastreams → time-series chart. */
function StaInspect({ layer, featureId, onClose }: { layer: StaLayer } & Omit<InspectPanelProps, "layer">) {
  const posthog = usePostHog()
  const { data: fc } = useStaLayer(layer)
  const location = fc?.features.find((f) => String(f.properties?.id) === featureId)
  const name = (location?.properties?.name as string) ?? `Location ${featureId}`

  const { data: datastreams, isLoading } = useDatastreams(featureId, layer.staBaseUrl)
  const [dsId, setDsId] = useState<string | undefined>(undefined)

  // Auto-select the first datastream when a location's datastreams load.
  useEffect(() => {
    if (datastreams && datastreams.length > 0) {
      setDsId(String(datastreams[0]["@iot.id"]))
    }
  }, [datastreams])

  const selected = datastreams?.find((d) => String(d["@iot.id"]) === dsId)

  return (
    <PanelShell title={name} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Datastream
          </label>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading datastreams…</p>
          ) : !datastreams || datastreams.length === 0 ? (
            <p data-testid="no-datastreams" className="text-sm text-muted-foreground">
              No datastreams for this location.
            </p>
          ) : (
            <Select
              value={dsId}
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

export function InspectPanel({ layer, featureId, onClose }: InspectPanelProps) {
  if (layer.source === "sta")
    return <StaInspect layer={layer} featureId={featureId} onClose={onClose} />
  if (layer.source === "arcgis")
    return <ArcGisInspect layer={layer} featureId={featureId} onClose={onClose} />
  return <FeatureInspect layer={layer} featureId={featureId} onClose={onClose} />
}
