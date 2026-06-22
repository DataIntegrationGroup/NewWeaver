import { useEffect, useState } from "react"
import { useIsFetching } from "@tanstack/react-query"

/**
 * A thin indeterminate progress bar pinned to the top of the viewport while any
 * data query is in flight (layer loads, datastreams, observations). Lingers
 * briefly after the last fetch so quick loads still register, then fades out.
 */
export function TopLoadingBar() {
  const fetching = useIsFetching()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (fetching > 0) {
      setVisible(true)
      return
    }
    const t = setTimeout(() => setVisible(false), 400)
    return () => clearTimeout(t)
  }, [fetching])

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
