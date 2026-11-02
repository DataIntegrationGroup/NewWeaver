@frontend
Feature: Feature attribute table
  The selected dataset can be viewed as an attribute table (TanStack Table)
  alongside the map. The table lists the dataset's filtered sites and stays in
  sync with map selection.

  Background:
    Given the user has opened the app

  @smoke
  Scenario: Table lists the dataset's sites
    When the user opens the attribute table
    Then the table shows one row per site
    And the columns match the dataset's attribute fields

  Scenario: A drawn selection scopes the table to enclosed features
    Given the attribute table is open
    When the user draws a selection around a single site
    Then the table shows 1 row

  Scenario: Sorting by a column
    Given the attribute table is open
    When the user sorts by a column
    Then the rows reorder by that column's values

  Scenario: Selecting a row highlights the feature on the map
    Given the attribute table is open
    When the user clicks a table row
    Then the corresponding site is selected on the map

  Scenario: Selecting a feature on the map highlights its row
    Given the attribute table is open
    When the user selects a site on the map
    Then the matching row is highlighted in the table
