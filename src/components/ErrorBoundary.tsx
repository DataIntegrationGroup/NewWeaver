import { Component, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Catches render-time crashes anywhere below it and shows a friendly recovery
 * card instead of a blank white screen. Data-fetch failures are handled
 * separately (toast + retry); this is the last resort for unexpected errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("Unhandled error:", error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div
        data-testid="error-boundary"
        className="flex h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center"
      >
        <div className="max-w-md space-y-2">
          <h1 className="!text-2xl text-primary">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            Weaver hit an unexpected error. Reloading usually clears it.
          </p>
          {error.message && (
            <p className="break-words rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {error.message}
            </p>
          )}
        </div>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    )
  }
}
