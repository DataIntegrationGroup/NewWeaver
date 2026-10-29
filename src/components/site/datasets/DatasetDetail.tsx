import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Download, ExternalLink, Share2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { datasetMapSearch } from "@/catalog/datasets"
import { useDieFields } from "@/hooks/useDieCollections"
import type { Dataset } from "./collections"
import { DatasetDownloadDialog } from "./DatasetDownloadDialog"
import { DatasetPreview } from "./DatasetPreview"
import { cn } from "@/lib/utils"

function shareUrl(id: string): string {
  return `${window.location.origin}/datasets?dataset=${encodeURIComponent(id)}`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  )
}

/** The collection's property names, fetched when it's selected. */
function Fields({ id }: { id: string }) {
  const { data, isPending, isError } = useDieFields(id)
  if (isError) return null
  return (
    <Section title={data ? `Fields (${data.length})` : "Fields"}>
      {isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <div className="flex flex-wrap gap-1" data-testid="datasets-detail-fields">
          {data.map((f) => (
            <Badge key={f} variant="outline" className="font-mono">
              {f}
            </Badge>
          ))}
        </div>
      )}
    </Section>
  )
}

const OUTLINE = cn(buttonVariants({ variant: "outline" }))

/**
 * Everything about one dataset and the ways to get it. Rendered in the sticky
 * side card on wide screens and in a Sheet on narrow ones.
 */
export function DatasetDetail({ d, className }: { d: Dataset; className?: string }) {
  const [downloadOpen, setDownloadOpen] = useState(false)

  async function copyShare() {
    const url = shareUrl(d.id)
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied", { description: url })
    } catch {
      toast.error("Couldn't copy link", { description: url })
    }
  }

  return (
    <div data-testid="datasets-detail" className={cn("flex flex-col gap-6 text-sm", className)}>
      <DatasetPreview d={d} />

      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{d.title}</h2>
        {d.description && <p className="text-muted-foreground">{d.description}</p>}
        {d.tags.length > 0 && (
          <div className="flex flex-wrap gap-1" data-testid="datasets-detail-tags">
            {d.tags.map((t) => (
              <Badge key={t} variant="outline" className="font-normal text-muted-foreground">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {d.sources.length > 0 && (
        <Section title="Sources">
          <div className="flex flex-wrap gap-1" data-testid="datasets-detail-sources">
            {d.sources.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      <Fields id={d.id} />

      <Section title="Get this data">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setDownloadOpen(true)}
            data-testid="datasets-detail-download"
          >
            <Download data-icon="inline-start" /> Download
          </Button>
          <a
            href={d.apiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={OUTLINE}
            data-testid="datasets-detail-api"
          >
            <ExternalLink data-icon="inline-start" /> Weaver API
          </a>
          <Button variant="outline" onClick={copyShare} data-testid="datasets-detail-share">
            <Share2 data-icon="inline-start" /> Share
          </Button>
        </div>
      </Section>

      <DatasetDownloadDialog
        key={d.id}
        dataset={d}
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
      />

      {d.mapLayerId && (
        <Link
          to="/map"
          search={datasetMapSearch(d.mapLayerId)}
          className={buttonVariants({ className: "w-full" })}
          data-testid="datasets-detail-map"
        >
          View on the map <ArrowRight data-icon="inline-end" />
        </Link>
      )}
    </div>
  )
}
