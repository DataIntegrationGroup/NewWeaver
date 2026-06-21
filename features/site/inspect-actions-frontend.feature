@frontend
Feature: Map and inspect-panel actions
  Quality-of-life actions around feature selection: dismiss with the keyboard,
  recenter the map on a feature, copy attribute values, and share the current
  view as a link.

  Background:
    Given the user has opened the app
    And the "Springs" layer is toggled on

  Scenario: Escape clears the selection
    Given the user has clicked a vector feature
    When the user presses Escape
    Then the inspect panel is no longer visible

  Scenario: Zoom to the selected feature
    Given the user has clicked a vector feature
    When the user zooms to the selected feature
    Then the map centers on the selected feature

  Scenario: Inspect values can be copied
    Given the user has clicked a vector feature
    Then the inspect panel offers a copy button for its values

  Scenario: Share the current view
    When the user shares the current view
    Then a "Link copied" confirmation appears
