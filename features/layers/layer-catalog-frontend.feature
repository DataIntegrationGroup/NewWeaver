@frontend
Feature: Layer catalog and toggles
  The layer catalog is a config-driven registry of the datasets shown on the
  map. Each entry declares its source (OGC API Features or STA) and style.
  Users turn layers on and off; the list is driven entirely by the catalog, so
  a new dataset appears here without UI changes.

  Background:
    Given the user has opened the app

  @smoke
  Scenario: Catalog lists every configured layer
    Then the user sees a layer for each catalog entry
    And each layer shows its title and description

  Scenario: Default layers are visible on load
    Then the "Monitoring locations" layer is toggled on
    And the "Water-levels summary" layer is toggled off
    And the "Latest TDS" layer is toggled off

  Scenario: User turns a layer on
    Given the "Water-levels summary" layer is toggled off
    When the user toggles the "Water-levels summary" layer on
    Then the "Water-levels summary" features render on the map

  Scenario: User turns a layer off
    Given the "Monitoring locations" layer is toggled on
    When the user toggles the "Monitoring locations" layer off
    Then no monitoring-location points render on the map

  @smoke
  Scenario Outline: Each v1 dataset is reachable from the catalog
    Then the catalog contains a "<title>" layer sourced from "<source>"

    Examples:
      | title                | source   |
      | Monitoring locations | sta      |
      | Water-levels summary | features |
      | Latest TDS           | features |
