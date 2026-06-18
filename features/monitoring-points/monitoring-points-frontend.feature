@frontend
Feature: Monitoring points to time-series chart
  Monitoring points come from STA Locations on FROST. Clicking a point reveals
  its datastreams; choosing a datastream plots its observations as a time-series
  chart. This is the core "see the data behind a point" flow.

  Background:
    Given the user has opened the app
    And the "Monitoring locations" layer is toggled on

  @smoke
  Scenario: Clicking a monitoring point opens its detail
    When the user clicks a monitoring point
    Then a panel opens showing the location name
    And the panel lists the datastreams available for that point

  Scenario: A monitoring point exposes water-level datastreams
    When the user clicks a monitoring point with water-level data
    Then the datastream list includes manual water-level measurements
    And the datastream list includes continuous water-level measurements

  @smoke
  Scenario: Selecting a datastream plots its observations
    Given the user has clicked a monitoring point
    When the user selects a datastream
    Then a time-series chart plots its observations over time
    And the y axis is titled with the unit of measurement
    And the y axis is inverted so zero is at the top
    And the y axis is scaled to the data

  Scenario: Long observation series loads progressively
    Given the user has selected a continuous water-level datastream with many observations
    Then the chart shows a loading indicator while observations are fetched
    And the chart renders once observations have loaded

  Scenario: Empty datastream shows a clear message
    Given the user has clicked a monitoring point
    When the user selects a datastream with no observations
    Then the chart area shows a "no observations" message
    And no chart is drawn

  Scenario: Closing the panel deselects the point
    Given the user has clicked a monitoring point
    When the user closes the detail panel
    Then the panel is no longer visible
    And the point is no longer highlighted on the map
