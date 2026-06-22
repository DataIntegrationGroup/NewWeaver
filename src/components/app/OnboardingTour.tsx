import { useEffect, useLayoutEffect, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SEEN_KEY = "weaver-tour-seen"

type Step = {
  title: string
  body: string
  /** CSS selector for the UI element this step points at. */
  target: string
  /** Which side of the target the card sits on. */
  place: "right" | "bottom" | "left"
}

const STEPS: Step[] = [
  {
    title: "Browse the layers",
    body: "Toggle data layers on and off in the sidebar — monitoring networks, OSE GIS, and USGS NWIS. Use the search box to find one fast.",
    target: "#layer-sidebar",
    place: "right",
  },
  {
    title: "Inspect a point",
    body: "Click any point on the map to open its details — attributes, and for monitoring sites, a time-series chart of its observations.",
    target: "#main-content",
    place: "bottom",
  },
  {
    title: "Share your view",
    body: "The page URL captures your exact map — visible layers, extent, and selection. Hit Share to copy a link to it.",
    target: "[data-testid='share-view']",
    place: "bottom",
  },
]

const CARD_W = 320
const GAP = 14 // space between target and card

type Rect = { top: number; left: number; width: number; height: number }

/** Find a step's target and read its viewport rect. */
function measure(selector: string): Rect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/** Clamp the card box into the viewport with an 8px margin. */
function clamp(v: number, size: number, max: number) {
  return Math.max(8, Math.min(v, max - size - 8))
}

/**
 * A dismissible getting-started tour shown once per browser (localStorage).
 * Each step spotlights its target element (dim backdrop with a cut-out) and
 * anchors an explanatory card beside it, so the copy points at the real UI.
 */
export function OnboardingTour() {
  const [open, setOpen] = useState(() => !localStorage.getItem(SEEN_KEY))
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)

  // Re-measure the current target whenever the step changes or the window
  // resizes — the sidebar is resizable and the layout is responsive.
  useLayoutEffect(() => {
    if (!open) return
    const update = () => setRect(measure(STEPS[step].target))
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, step])

  // Arrow keys advance / go back; Esc dismisses.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
      else if (e.key === "ArrowRight") setStep((s) => Math.min(STEPS.length - 1, s + 1))
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null
  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, "1")
    setOpen(false)
  }
  const last = step === STEPS.length - 1
  const s = STEPS[step]

  // Position the card relative to the measured target. Fall back to a
  // bottom-right corner card if the target can't be found.
  const vw = window.innerWidth
  const vh = window.innerHeight
  let cardStyle: React.CSSProperties
  let cutout: React.CSSProperties | null = null

  if (rect) {
    const pad = 6
    cutout = {
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    }
    if (s.place === "right") {
      cardStyle = {
        top: clamp(rect.top, 0, vh),
        left: clamp(rect.left + rect.width + GAP, CARD_W, vw),
      }
    } else if (s.place === "left") {
      cardStyle = {
        top: clamp(rect.top, 0, vh),
        left: clamp(rect.left - CARD_W - GAP, CARD_W, vw),
      }
    } else {
      // bottom
      cardStyle = {
        top: clamp(rect.top + rect.height + GAP, 0, vh),
        left: clamp(rect.left + rect.width / 2 - CARD_W / 2, CARD_W, vw),
      }
    }
  } else {
    cardStyle = { bottom: 16, right: 16 }
  }

  return (
    <>
      {/* Full-screen click-catcher: clicking the backdrop dismisses the tour. */}
      <div
        data-testid="tour-backdrop"
        onClick={dismiss}
        className={cn("fixed inset-0 z-40", !cutout && "bg-black/50")}
      />
      {cutout && (
        <>
          {/* Spotlight cut-out: a transparent box whose huge box-shadow dims
              everything around the target. Visual only. */}
          <div
            aria-hidden
            className="pointer-events-none fixed z-40 rounded-[10px]"
            style={{ ...cutout, boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
          />
          {/* Pulsing ring to draw the eye to the target. */}
          <div
            aria-hidden
            className="pointer-events-none fixed z-40 rounded-[10px] ring-2 ring-primary animate-pulse"
            style={cutout}
          />
        </>
      )}

      <div
        data-testid="onboarding-tour"
        style={{ position: "fixed", width: CARD_W, ...cardStyle }}
        className="z-50 rounded-xl border bg-card p-4 shadow-lg"
      >
        <button
          type="button"
          aria-label="Dismiss tour"
          data-testid="tour-dismiss"
          onClick={dismiss}
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Getting started · {step + 1}/{STEPS.length}
        </p>
        <h3 className="mt-1 !text-base font-semibold text-foreground">
          {s.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to step ${i + 1}`}
                onClick={() => setStep(i)}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  i === step ? "bg-primary" : "bg-border hover:bg-muted-foreground"
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            <Button
              size="sm"
              data-testid={last ? "tour-done" : "tour-next"}
              onClick={last ? dismiss : () => setStep((s) => s + 1)}
            >
              {last ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
