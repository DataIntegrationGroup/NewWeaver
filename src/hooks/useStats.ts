/**
 * Read the nightly DIE stats JSON for the home dashboard (SPEC §T.T11b).
 * Disabled when no source is configured, so dev/CI never depend on a live file;
 * a fetch/parse failure leaves `data` undefined and the dashboard falls back
 * gracefully (§V.V13, §V.V14). The query is keyed "stats" so queryClient knows
 * to stay silent rather than toast on failure.
 */
import { useQuery } from "@tanstack/react-query"
import { fetchStats, statsConfigured, type WeaverStats } from "@/lib/stats"

export function useStats() {
  return useQuery<WeaverStats>({
    queryKey: ["stats"],
    queryFn: fetchStats,
    enabled: statsConfigured,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })
}
