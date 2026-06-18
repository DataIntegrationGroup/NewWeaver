// cucumber-js config.
//
// `default` runs the @client specs — the two data-adapter contracts, which
// run headless against a mocked fetch. The @frontend specs drive the real UI
// and need a browser harness (Playwright), wired in Phase 3; run them via the
// `all` profile once that exists.

const common = {
  paths: ["features/**/*.feature"],
  import: ["features/steps/**/*.ts"],
}

export default {
  ...common,
  tags: "@client",
}

export const all = {
  ...common,
}
