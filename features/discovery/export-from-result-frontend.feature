@frontend
Feature: Download is discoverable from a result
  "I want to download X" must be visible from the data itself, not only the top
  toolbar. Once a user narrows to a set of features — a location result or a
  layer's table — a clear path to take the data is right there (SPEC §T.T5, §V.V9).

  Background:
    Given the user has opened the app

  Scenario: A location result offers a download path
    # Coverage (and its download path) needs a nearby-data layer visible.
    Given the monitoring-locations layer is visible
    When the user searches for the location "100 Yale Blvd, Albuquerque"
    Then the coverage panel offers a download path
    When the user follows the coverage download path
    Then the export dialog opens

  Scenario: The attribute table offers a download path
    Given the "Springs" layer is toggled on
    When the user opens the attribute table
    Then the attribute table offers a download path
    When the user follows the table download path
    Then the export dialog opens
