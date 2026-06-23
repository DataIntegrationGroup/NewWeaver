@frontend
Feature: Home dashboard and data catalog
  The home page summarises how much data Weaver brings together — counts and
  recent source updates — and a Data Catalog page lets a visitor browse, search,
  and share every dataset, or open one straight on the map.

  # SPEC §T.T11 / §V.V13 — counts come from the nightly stats JSON, not magic numbers.
  Scenario: Home dashboard shows data counts
    Given the user opens the home page
    Then the dashboard shows the data counts
    And the dashboard shows when it was last updated

  # SPEC §T.T12 / §V.V14 — the activity feed renders published update events.
  Scenario: Home dashboard lists recent source updates
    Given the user opens the home page
    Then the activity feed lists recent source updates

  # SPEC §T.T13 / §V.V18 — a card for every dataset, from one source of truth.
  Scenario: Catalog lists every dataset
    Given the user opens the data catalog
    Then the catalog shows a card for every dataset

  # SPEC §T.T14 / §V.V15 — view-on-map opens the dataset's own layer.
  Scenario: A catalog card opens the dataset on the map
    Given the user opens the data catalog
    Then the "ocotillo-springs" card links to the map with its layer

  # SPEC §T.T14 / §V.V16 — a copyable, shareable deep link.
  Scenario: A catalog card shares a deep link
    Given the user opens the data catalog
    When the user shares the "ocotillo-springs" card
    Then the clipboard holds a catalog deep link to "ocotillo-springs"

  # SPEC §T.T15 / §V.V17 — search across all displayed metadata.
  Scenario: Searching the catalog narrows the results
    Given the user opens the data catalog
    When the user searches the catalog for "springs"
    Then the catalog shows fewer datasets than the full set
    And the "ocotillo-springs" card is shown

  # SPEC §T.T15 / §V.V17 — an explicit empty state, never a blank page.
  Scenario: Searching for nothing shows an empty message
    Given the user opens the data catalog
    When the user searches the catalog for "zzzznomatch"
    Then the catalog shows a no-results message

  # SPEC §V.V16 — a dataset deep link surfaces its card.
  Scenario: A dataset deep link surfaces its card
    Given the user opens a catalog deep link to "ocotillo-springs"
    Then the "ocotillo-springs" card is shown
