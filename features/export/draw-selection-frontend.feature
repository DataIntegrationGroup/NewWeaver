@frontend
Feature: Draw to select points
  Beyond the map-view filter, the user can draw rectangles or polygons to pick
  monitoring points explicitly. Drawn selections add to the filtered points and
  feed straight into the download modal.

  Background:
    Given the user has opened the app
    And the "Monitoring locations" layer is toggled on

  @smoke
  Scenario: Drawing a rectangle selects the points inside it
    When the user activates the rectangle draw tool
    And the user draws a rectangle over a cluster of points
    Then the points inside the rectangle are selected
    And the selected points are highlighted on the map

  Scenario: Drawing a polygon selects only points within its boundary
    When the user activates the polygon draw tool
    And the user draws a polygon around some points
    Then only points inside the polygon boundary are selected
    And points outside the polygon are not selected

  Scenario: Drawn selection adds to the filtered points
    Given "filter to map view" is enabled
    When the user draws a selection that includes points outside the current extent
    Then the selection includes both the in-extent points and the drawn points

  Scenario: Clearing the drawing removes the drawn selection
    Given the user has drawn a selection
    When the user clears the drawing
    Then the drawn points are no longer selected
    And only the filtered points remain selected

  Scenario: A drawn selection feeds the download modal
    Given the user has drawn a selection around some points
    When the user opens the download modal
    Then the selected count includes the drawn points
