@frontend
Feature: Shareable URL state
  The view lives in the URL: the dataset, its color-by and filters, the map
  extent, and the selected site are encoded as route state. Any view can be
  copied as a link and reopened exactly as it was.

  Background:
    Given the user has opened the app

  @smoke
  Scenario: The dataset is reflected in the URL
    When the user picks the "Arsenic" dataset
    Then the URL records the "arsenic" dataset

  Scenario: Map extent is reflected in the URL
    When the user pans and zooms the map
    Then the URL records the current map extent

  Scenario: Selecting a site is reflected in the URL
    When the user selects a site on the map
    Then the URL records the selected feature

  @smoke
  Scenario: Opening a shared URL restores the exact view
    Given a URL that encodes a dataset, a filter, a map extent, and a selected site
    When the user opens that URL
    Then the dataset picker shows "Water Levels"
    And the legend counts 4 sites
    And the map opens at the recorded extent
    And the recorded feature is selected with its detail shown

  Scenario: Back navigation restores the previous view
    Given the user has picked the "Arsenic" dataset
    When the user navigates back
    Then the dataset picker shows "Water Levels"

  Scenario: Share the current view
    When the user shares the current view
    Then a "Link copied" confirmation appears
