@frontend
Feature: Shareable URL state
  The view lives in the URL: visible layers, map extent (bbox/zoom), and the
  current selection are encoded as route state. Any view can be copied as a
  link and reopened exactly as it was.

  Background:
    Given the user has opened the app

  @smoke
  Scenario: Layer toggles are reflected in the URL
    When the user toggles the "Water-levels summary" layer on
    Then the URL records "Water-levels summary" as a visible layer

  Scenario: Map extent is reflected in the URL
    When the user pans and zooms the map
    Then the URL records the current map extent

  Scenario: Selecting a feature is reflected in the URL
    Given the "Monitoring locations" layer is toggled on
    When the user clicks a monitoring point
    Then the URL records the selected feature

  @smoke
  Scenario: Opening a shared URL restores the exact view
    Given a URL that encodes visible layers, a map extent, and a selected feature
    When the user opens that URL
    Then the recorded layers are visible
    And the map opens at the recorded extent
    And the recorded feature is selected with its detail shown

  Scenario: Back navigation restores the previous view
    Given the user has changed layers and extent
    When the user navigates back
    Then the previous view is restored from the URL
