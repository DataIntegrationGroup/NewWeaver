@frontend
Feature: Interactive basemap
  The app opens on an interactive MapLibre map of New Mexico water data using a
  token-free open basemap. Pan, zoom, and default extent are the foundation
  every other map behaviour builds on.

  Background:
    Given the user has opened the app

  @smoke
  Scenario: Map loads centered on New Mexico
    Then the user sees an interactive map
    And the map is centered on New Mexico
    And the basemap renders without requiring an API key

  Scenario: User pans the map
    When the user drags the map east
    Then the visible extent shifts east
    And the map does not reload the page

  Scenario: User zooms in with the navigation control
    When the user clicks the zoom-in control
    Then the map zoom level increases by one
    And more detail is visible

  Scenario: Scale bar reflects the current zoom
    When the user zooms in
    Then the scale bar updates to a smaller distance

  # Clustering is disabled for now (points render individually). The MapLibre
  # cluster behaviour can be re-introduced with its own scenarios later.
  Scenario: Monitoring points render individually
    Given the monitoring-locations layer is visible
    Then each monitoring point renders as its own marker
    And no cluster counts are shown
