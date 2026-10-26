import { Button } from "@/components/ui/button"

/** Topic facet: one choice at a time, each with its count for the current search. */
export function DatasetFilters({
  topics,
  topic,
  total,
  counts,
  onTopic,
}: {
  topics: string[]
  topic?: string
  total: number
  counts: Map<string, number>
  onTopic: (topic: string | undefined) => void
}) {
  const options = [
    { value: undefined, label: "All topics", count: total },
    ...topics.map((t) => ({ value: t as string | undefined, label: t, count: counts.get(t) ?? 0 })),
  ]

  return (
    <nav aria-label="Topic" className="flex flex-col gap-2">
      <h2 className="px-2 text-sm font-medium">Topic</h2>
      <div className="flex flex-wrap gap-1 lg:flex-col">
        {options.map((o) => (
          <Button
            key={o.label}
            variant="ghost"
            size="sm"
            aria-pressed={o.value === topic}
            onClick={() => onTopic(o.value)}
            data-testid={`datasets-topic-${o.value ?? "all"}`}
            className="justify-between gap-3 capitalize aria-pressed:bg-muted"
          >
            {o.label}
            <span className="font-normal text-muted-foreground tabular-nums">{o.count}</span>
          </Button>
        ))}
      </div>
    </nav>
  )
}
