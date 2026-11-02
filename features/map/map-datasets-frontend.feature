@frontend
Feature: One dataset at a time, colored and filtered
  The map shows one DIE dataset at a time, picked in the sidebar. The legend
  colors its sites by one facet and every facet filters them; each active
  filter shows as a removable chip over the map. The fixture's Water Levels
  has five sites, one per "Last measured" bin plus one with no date.

  Background:
    Given the user has opened the app

  @smoke
  Scenario: Water Levels is shown by default
    Then the dataset picker shows "Water Levels"
    And the legend counts 5 sites
    And the sites render on the map

  Scenario: Picking a dataset shows it on the map
    When the user picks the "Arsenic" dataset
    Then the dataset picker shows "Arsenic"
    And the URL records the "arsenic" dataset

  Scenario: Coloring by another facet
    When the user colors the map by "Depth to water"
    Then the legend lists the "Under 50 ft" bin
    And the URL records color by "dtw"

  Scenario: Unticking a legend bin filters the sites
    When the user unticks the "Within 2 years" bin
    Then the legend counts 4 sites
    And a filter chip reads "Last measured: excluding Within 2 years"

  Scenario: Removing a filter chip clears that filter
    Given the user has unticked the "Within 2 years" bin
    When the user removes the "Last measured" filter chip
    Then the legend counts 5 sites
    And no filter chips are shown

  Scenario: Clear filters resets every filter
    Given the user has unticked the "Within 2 years" bin
    And the user filters sites by the text "Well"
    When the user clears the filters
    Then the legend counts 5 sites
    And no filter chips are shown

  Scenario: Switching dataset resets its filters
    Given the user has unticked the "Within 2 years" bin
    When the user picks the "Arsenic" dataset
    Then no filter chips are shown
