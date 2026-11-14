@frontend
Feature: Find a place from the home page
  The home page's "Find a place" search geocodes the same way as the map's:
  type-ahead suggestions while typing, a full geocode on submit. Picking a
  result opens the map pinned on that place, with what's monitored nearby.

  Background:
    Given the user opens the home page

  Scenario: Picking a suggestion opens the map at that place
    When the user types "Yale" into the home place search
    Then location suggestions are shown
    When the user picks the first suggestion
    Then the interactive map is shown
    And a pin is dropped at the searched location
    And the coverage panel lists nearby monitored data

  Scenario: Submitting a place opens the map at that place
    When the user searches the home page for "100 Yale Blvd, Albuquerque"
    Then the interactive map is shown
    And a pin is dropped at the searched location
    And the location search shows the searched place
    And the coverage panel lists nearby monitored data

  Scenario: A place that can't be found is reported on the home page
    When the user searches the home page for "xyzzy no such place"
    Then the home page reports that the place could not be found
