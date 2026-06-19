# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Weaver. The app already had `posthog-js` installed and a bare initialization in `src/main.tsx`; the wizard extended it with a reverse proxy, automatic exception capture, and 9 targeted event captures across 4 components. A `.env` file was created with the PostHog key and host, and `vite.config.ts` was updated to proxy PostHog ingestion through `/ingest` so events aren't blocked by ad-blockers.

| Event name | Description | File |
|---|---|---|
| `layer_toggled` | User turns a data layer on or off in the layer panel. | `src/components/app/AppShell.tsx` |
| `feature_selected` | User clicks a map feature to open the inspect panel. | `src/components/app/AppShell.tsx` |
| `filter_to_extent_toggled` | User enables or disables the "filter to map view" spatial filter. | `src/components/app/AppShell.tsx` |
| `attribute_table_opened` | User opens the attribute table panel. | `src/components/app/AppShell.tsx` |
| `export_started` | User clicks Download to begin an export (format + location count captured). | `src/components/app/ExportDialog.tsx` |
| `export_completed` | An export download finishes successfully. | `src/components/app/ExportDialog.tsx` |
| `export_failed` | An export download fails with an error. | `src/components/app/ExportDialog.tsx` |
| `draw_shape_completed` | User finishes drawing a rectangle or polygon selection on the map. | `src/components/app/DrawControls.tsx` |
| `datastream_selected` | User picks a datastream to view its time-series chart in the inspect panel. | `src/components/app/InspectPanel.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior:

- [Analytics basics (wizard) — dashboard](https://us.posthog.com/project/478050/dashboard/1737169)
- [Export downloads over time](https://us.posthog.com/project/478050/insights/e04rboG5)
- [Export funnel: dialog opened → download started → completed](https://us.posthog.com/project/478050/insights/g7Ecpks2)
- [Layer toggle activity](https://us.posthog.com/project/478050/insights/bjWWDDkN)
- [Feature engagement: key actions](https://us.posthog.com/project/478050/insights/kUXVrnVg)
- [Export failures vs successes](https://us.posthog.com/project/478050/insights/AdGFrEDF)

## Verify before merging

- [ ] Run a full production build (`pnpm build`) and fix any lint or type errors introduced by the generated code. Note: `pnpm lint` currently fails the supply-chain age policy for `posthog-js@1.391.2` (published < 24 h ago); re-run once the package ages past the policy window.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` to `.env.example` (or your equivalent bootstrap docs) so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or a Vite upload plugin) into CI so production stack traces de-minify. This matters because `capture_exceptions: true` was enabled and Vite minifies the production bundle.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-react-tanstack-router-code-based/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
