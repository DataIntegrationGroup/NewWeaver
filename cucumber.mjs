// cucumber-js config — two independent profiles with different Worlds:
//
//  default ("@client") — the two data-adapter contracts, headless against a
//    mocked fetch. No browser. Runs anywhere Node runs (`pnpm test:bdd`).
//
//  "frontend" ("@frontend") — drives the real UI in Chromium via Playwright,
//    with STA/Features network calls mocked from fixtures. Requires
//    `playwright` + a browser (`pnpm exec playwright install chromium`).
//    Run with `pnpm test:bdd:frontend`.
//
// The profiles import disjoint step/support dirs so the client run never loads
// Playwright (and vice-versa) — each profile registers its own World.

const featurePaths = ["features/**/*.feature"]

export default {
  paths: featurePaths,
  import: ["features/steps/**/*.ts"],
  tags: "@client",
}

export const frontend = {
  paths: featurePaths,
  import: ["features/steps-frontend/**/*.ts"],
  tags: "@frontend and not @skip",
}
