/**
 * Live per-layer load progress. Big layers (OSE PODs ~278k, NWIS) page in over
 * several seconds; the data clients report how many features have arrived so
 * far via this tiny external store, and the layer list shows the running count.
 *
 * Kept outside React (a plain store + useSyncExternalStore) so the data hooks
 * can push progress from inside their queryFn without re-render gymnastics.
 */
import { useSyncExternalStore } from "react"

const counts = new Map<string, number>()
const listeners = new Set<() => void>()
let snapshot: Record<string, number> = {}

function emit() {
  snapshot = Object.fromEntries(counts)
  for (const l of listeners) l()
}

/** Report how many features a layer has loaded so far. */
export function setLoadProgress(id: string, loaded: number) {
  counts.set(id, loaded)
  emit()
}

/** Clear a layer's progress once its load settles. */
export function clearLoadProgress(id: string) {
  if (counts.delete(id)) emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Map of layer id → features loaded so far, for in-flight layers. */
export function useLoadProgress(): Record<string, number> {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}
