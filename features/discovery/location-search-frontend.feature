@frontend
Feature: Location search and coverage
  A well owner arrives asking "is there data about my place?" The Map page lets
  them search an address; Weaver geocodes it client-side, drops a pin, and
  reports what's monitored nearby — or says plainly when nothing is, so they
  always know whether they're in the right place (SPEC §T.T3, §V.V3).

  Background:
    # Coverage summarises the selected dataset's sites (lib/coverage.ts); the
    # Water Levels fixture has a site by the Yale geocode and none near
    # "Remote Mesa".
    Given the user has opened the app

  Scenario: Searching an address drops a pin and reports nearby data
    When the user searches for the location "100 Yale Blvd, Albuquerque"
    Then a pin is dropped at the searched location
    And the coverage panel lists nearby monitored data

  Scenario: Searching a place with no nearby data says so plainly
    When the user searches for the location "Remote Mesa"
    Then a pin is dropped at the searched location
    And the coverage panel states that nothing is monitored nearby

  Scenario: An address that can't be found is reported, not silent
    When the user searches for the location "xyzzy no such place"
    Then the search reports that the address could not be found

  Scenario: Type-ahead suggestions appear and can be picked
    When the user types "Yale" into the location search
    Then location suggestions are shown
    When the user picks the first suggestion
    Then a pin is dropped at the searched location
    And the coverage panel lists nearby monitored data

  Scenario: The searched place is kept in the URL
    When the user searches for the location "100 Yale Blvd, Albuquerque"
    Then a pin is dropped at the searched location
    When the user reloads the page
    Then a pin is dropped at the searched location
    And the coverage panel lists nearby monitored data
