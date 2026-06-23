@frontend
Feature: Browse by what's measured
  A researcher thinks in measurements, not producing networks. The measurement
  facet turns "show me all water quality data in New Mexico" into one click:
  selecting a category enables every matching layer across all networks at once
  and zooms to their extent (SPEC §T.T4, §V.V4).

  Background:
    Given the user has opened the app

  Scenario: A category enables every matching layer at once
    When the user browses by what's measured for "Water quality"
    Then the "Latest TDS (Wells)" layer shows as enabled
    And the "Average TDS (Wells)" layer shows as enabled
    And the "Major Chemistry (Wells)" layer shows as enabled

  Scenario: A category spans producing networks
    When the user browses by what's measured for "Water levels"
    Then the "City of Albuquerque (CABQ)" layer shows as enabled
    And the "Latest Depth to Water (Wells)" layer shows as enabled
