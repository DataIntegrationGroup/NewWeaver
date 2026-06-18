import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { LAYER_CATALOG } from "@/catalog/layers"

interface LayerListProps {
  /** Ids of currently-visible layers. */
  visible: string[]
  onToggle: (id: string) => void
}

/**
 * LayerList — renders a toggle per catalog entry. Driven entirely by
 * LAYER_CATALOG, so a new dataset shows up here without UI changes.
 */
export function LayerList({ visible, onToggle }: LayerListProps) {
  return (
    <div className="space-y-4">
      <h2 className="!text-base !font-semibold uppercase tracking-wide text-muted-foreground">
        Layers
      </h2>
      <ul className="space-y-3">
        {LAYER_CATALOG.map((layer) => (
          <li key={layer.id} className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor={`layer-${layer.id}`} className="cursor-pointer">
                {layer.title}
              </Label>
              {layer.description && (
                <p className="text-xs text-muted-foreground">
                  {layer.description}
                </p>
              )}
            </div>
            <Switch
              id={`layer-${layer.id}`}
              checked={visible.includes(layer.id)}
              onCheckedChange={() => onToggle(layer.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
