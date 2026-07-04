import { useEffect, useState } from "react"

interface TopLoadingBarProps {
  /** Whether work is in flight. Wire this to your data layer, e.g.
   *  `active={useIsFetching() > 0}` with TanStack Query. */
  active: boolean
  /** How long the bar lingers after `active` goes false, in ms. Default 400. */
  lingerMs?: number
}

/**
 * A thin indeterminate progress bar pinned to the top of the viewport while
 * `active` is true. Lingers briefly after the last activity so quick loads
 * still register, then hides. Presentational — the consumer owns what
 * "active" means (a fetch count, a route transition, etc.).
 *
 * Requires an `animate-loadingbar` keyframe in your CSS.
 */
export function TopLoadingBar({ active, lingerMs = 400 }: TopLoadingBarProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      // Intentional sync: show immediately while work is in flight. The
      // trailing hide is deferred to the timeout below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true)
      return
    }
    const t = setTimeout(() => setVisible(false), lingerMs)
    return () => clearTimeout(t)
  }, [active, lingerMs])

  if (!visible) return null
  return (
    <div
      data-testid="top-loading-bar"
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
    >
      <div className="animate-loadingbar h-full w-2/5 bg-primary" />
    </div>
  )
}
