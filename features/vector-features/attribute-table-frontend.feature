@frontend
Feature: Feature attribute table
  Each Features collection can be viewed as an attribute table (TanStack Table)
  alongside the map. The table lists the features in the active layer and stays
  in sync with map selection.

  Background:
    Given the user has opened the app
    And the "Water-levels summary" layer is toggled on

  @smoke
  Scenario: Table lists features of the active layer
    When the user opens the attribute table
    Then the table shows one row per feature in the layer
    And the columns match the layer's attribute fields

  Scenario: Table paginates large collections
    Given the active layer has more features than one page
    When the user opens the attribute table
    Then the table shows the first page of rows
    And the user can advance to the next page

  Scenario: Sorting by a column
    Given the attribute table is open
    When the user sorts by a column
    Then the rows reorder by that column's values

  Scenario: Selecting a row highlights the feature on the map
    Given the attribute table is open
    When the user clicks a table row
    Then the corresponding feature is highlighted on the map
    And the inspect panel shows that feature's attributes

  Scenario: Selecting a feature on the map highlights its row
    Given the attribute table is open
    When the user clicks a feature on the map
    Then the matching row is highlighted in the table
