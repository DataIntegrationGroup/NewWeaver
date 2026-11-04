@frontend
Feature: Look up one well on the map (W10-485)
  In the field or on a public call, staff find one well by name or ID and
  open its details.

  Background:
    Given the site panel's data is served
    And the user has opened the app

  Scenario: Find a well by name and open it
    When the user filters sites by the text "Yale"
    And the user opens the attribute table
    Then the table shows 1 row
    When the user clicks a table row
    Then the site panel is titled "Yale Well"

  Scenario: Find a well by its ID
    When the user filters sites by the text "WL-0004"
    And the user opens the attribute table
    Then the table shows 1 row
    When the user clicks a table row
    Then the site panel is titled "Farmington Well"

  Scenario: Selecting a well on the map opens its details
    When the user selects a site on the map
    Then the site panel is titled "Yale Well"

  Scenario: A search that matches no well says so
    When the user filters sites by the text "zzzzzznomatch"
    Then the map shows an empty-filter message
