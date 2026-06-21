@frontend
Feature: Layer catalog and toggles
  The layer catalog is a config-driven registry of the datasets shown on the
  map. Each entry declares its source (OGC API Features or STA) and style.
  Users turn layers on and off; the list is driven entirely by the catalog, so
  a new dataset appears here without UI changes. Layers are grouped into
  collapsible sections (STA, Ocotillo).

  Background:
    Given the user has opened the app

  @smoke
  Scenario: Catalog lists every configured layer
    Then the user sees a layer for each catalog entry
    And each layer shows its title and description

  Scenario: Layers are grouped into named sections
    Then the catalog shows a "STA" layer group
    And the catalog shows a "Ocotillo" layer group

  Scenario: Default layers are visible on load
    Then the "City of Albuquerque (CABQ)" layer is toggled on
    And the "Springs" layer is toggled off
    And the "Latest TDS (Wells)" layer is toggled off

  Scenario: User turns a layer on
    Given the "Springs" layer is toggled off
    When the user toggles the "Springs" layer on
    Then the "Springs" features render on the map

  Scenario: User turns a layer off
    Given the "City of Albuquerque (CABQ)" layer is toggled on
    When the user toggles the "City of Albuquerque (CABQ)" layer off
    Then no monitoring-location points render on the map

  Scenario: A visible layer exposes an opacity control
    Given the "City of Albuquerque (CABQ)" layer is toggled on
    Then the "City of Albuquerque (CABQ)" layer has an opacity slider

  Scenario Outline: Layer groups describe themselves on hover
    When the user hovers over the "<group>" layer group
    Then a tooltip explains the "<group>" group

    Examples:
      | group    |
      | STA      |
      | Ocotillo |

  Scenario: Layer groups collapse and expand
    When the user collapses the "STA" layer group
    Then the "City of Albuquerque (CABQ)" layer toggle is hidden
    When the user expands the "STA" layer group
    Then the "City of Albuquerque (CABQ)" layer toggle is visible

  Scenario: Toggling a layer shows a loading indicator while data loads
    When the user toggles the "Latest TDS (Wells)" layer on
    Then the "Latest TDS (Wells)" layer shows a loading indicator
    And the "Latest TDS (Wells)" loading indicator clears once data has loaded

  @smoke
  Scenario Outline: Each v1 dataset is reachable from the catalog
    Then the catalog contains a "<title>" layer sourced from "<source>"

    Examples:
      | title                      | source   |
      | City of Albuquerque (CABQ) | sta      |
      | Springs                    | features |
      | Latest TDS (Wells)         | features |
