@frontend
Feature: Vector feature inspection
  Vector / integrated layers come from DIE's OGC API Features. Clicking a
  feature opens an inspect panel showing its attributes, so users can read the
  data behind any shape on the map.

  Background:
    Given the user has opened the app
    And the "Springs" layer is toggled on

  @smoke
  Scenario: Clicking a vector feature shows its attributes
    When the user clicks a vector feature
    Then an inspect panel opens
    And the panel lists the feature's attribute names and values

  Scenario: Inspect panel reflects the selected feature
    Given the user has clicked a vector feature
    When the user clicks a different vector feature
    Then the inspect panel updates to the newly selected feature

  Scenario: Closing the inspect panel clears the selection
    Given the user has clicked a vector feature
    When the user closes the inspect panel
    Then the inspect panel is no longer visible
    And the feature is no longer highlighted

  Scenario: Clicking empty map space clears the selection
    Given the user has clicked a vector feature
    When the user clicks an empty area of the map
    Then the inspect panel closes
