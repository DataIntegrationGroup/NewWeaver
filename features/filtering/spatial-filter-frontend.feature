@frontend
Feature: Spatial and text filtering
  Users narrow what they see by area and by text. Spatial filtering ties the
  visible data to the current map extent; text filtering searches feature
  attributes. Both work against the two data sources without per-source code.

  Background:
    Given the user has opened the app
    And the "City of Albuquerque (CABQ)" layer is toggled on

  @smoke
  Scenario: Filter data to the current map extent
    When the user enables "filter to map view"
    And the user pans to a new area
    Then only data within the current map extent is shown
    And the displayed counts update to match the extent

  Scenario: Clearing the spatial filter restores full extent
    Given "filter to map view" is enabled
    When the user disables "filter to map view"
    Then data outside the current extent is shown again

  Scenario: Filter features by attribute text
    Given the "Springs" layer is toggled on
    When the user types a search term into the feature filter
    Then only features whose attributes match the term remain visible

  Scenario: No matches shows an empty state
    When the user types a search term that matches no features
    Then the user sees a "no results" message
    And the map shows no features for that layer
    And the map shows an empty-filter message
