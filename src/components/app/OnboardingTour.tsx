import { useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SEEN_KEY = "weaver-tour-seen"

const STEPS = [
  {
    title: "Browse the layers",
    body: "Toggle data layers on and off in the sidebar — monitoring networks, OSE GIS, and USGS NWIS. Use the search box to find one fast.",
  },
  {
    title: "Inspect a point",
    body: "Click any point on the map to open its details — attributes, and for monitoring sites, a time-series chart of its observations.",
  },
  {
    title: "Share your view",
    body: "The page URL captures your exact map — visible layers, extent, and selection. Hit Share to copy a link to it.",
  },
]

/**
 * A small, dismissible getting-started tour shown once per browser (tracked in
 * localStorage). Three steps covering the core flow: layers → inspect → share.
 */
export function OnboardingTour() {
  const [open, setOpen] = useState(() => !localStorage.getItem(SEEN_KEY))
  const [step, setStep] = useState(0)

  if (!open) return null
  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, "1")
    setOpen(false)
  }
  const last = step === STEPS.length - 1

  return (
    <div
      data-testid="onboarding-tour"
      className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border bg-card p-4 shadow-lg"
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
        {STEPS[step].title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{STEPS[step].body}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-1.5 rounded-full",
                i === step ? "bg-primary" : "bg-border"
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
  )
}
