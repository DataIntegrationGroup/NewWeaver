import { DATA_SOURCES, ckanOrgUrl, type DataSource } from "@/catalog/dataSources"

function Card({ s, duplicate }: { s: DataSource; duplicate?: boolean }) {
  return (
    <a
      href={ckanOrgUrl(s.org)}
      target="_blank"
      rel="noreferrer"
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
      data-testid={duplicate ? undefined : `data-source-${s.org}`}
      className="group/card mr-4 flex w-60 shrink-0 flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Logos vary in palette — sit them on white so transparent and light
          marks stay legible in both light and dark themes. */}
      <div className="flex h-20 items-center justify-center rounded-lg bg-white p-3 ring-1 ring-border">
        <img
          src={s.icon}
          alt={`${s.name} logo`}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <p className="mt-3 text-sm font-semibold leading-tight text-foreground group-hover/card:text-primary">
        {s.name}
      </p>
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
        {s.blurb}
      </p>
    </a>
  )
}

/**
 * A continuously scrolling carousel of the agencies whose data Weaver reads.
 * The track holds two copies of the list and translates -50% on a loop, so it
 * scrolls forever with no seam. Hovering pauses it; reduced-motion stops it.
 */
export function DataSourceCarousel() {
  return (
    <div
      className="group relative overflow-hidden"
      data-testid="data-source-carousel"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {DATA_SOURCES.map((s) => (
          <Card key={s.org} s={s} />
        ))}
        {DATA_SOURCES.map((s) => (
          <Card key={`dup-${s.org}`} s={s} duplicate />
        ))}
      </div>

      {/* Soft fade at the edges so cards slide in and out, not cut off. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
    </div>
  )
}
