import { useId } from "react"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { GROUP_ORDER, type Dataset } from "@/catalog/mapDatasets"

/**
 * Pick the one dataset shown on the map, from the list DIE's /collections
 * gives (catalog/mapDatasets). A grouped Select keeps every dataset one click
 * away without taking the sidebar's height; the selected dataset's one-line
 * blurb sits underneath.
 */
export function DatasetPicker({
  datasets,
  dataset,
  onChange,
}: {
  datasets: Dataset[]
  /** Undefined while /collections loads. */
  dataset: Dataset | undefined
  onChange: (id: string) => void
}) {
  const id = useId()
  const groups = GROUP_ORDER.map((group) => ({
    group,
    datasets: datasets.filter((d) => d.group === group),
  })).filter((g) => g.datasets.length > 0)

  return (
    <Field data-testid="dataset-picker">
      <FieldLabel htmlFor={id}>Dataset</FieldLabel>
      {dataset ? (
        <Select
          items={datasets.map((d) => ({ value: d.id, label: d.label }))}
          value={dataset.id}
          onValueChange={(v) => v && v !== dataset.id && onChange(v)}
        >
          <SelectTrigger id={id} className="w-full" data-testid="dataset-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map(({ group, datasets }) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {datasets.map((d) => (
                  <SelectItem key={d.id} value={d.id} data-testid={`dataset-option-${d.id}`}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Skeleton className="h-8 w-full" data-testid="dataset-select-loading" />
      )}
      {dataset && <FieldDescription>{dataset.blurb}</FieldDescription>}
    </Field>
  )
}
