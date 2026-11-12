@frontend
Feature: Export data for a well or a selection (W10-486)
  A user narrows the map to one well or a filtered set and downloads it, or
  takes a whole dataset as CSV from the Datasets page.

  Scenario: Download one well
    Given the user has opened the app
    When the user draws a selection around a single site
    And the user opens the download modal
    Then the download covers 1 site
    When the user chooses the CSV format
    And the user clicks download
    Then a CSV file download is triggered
    And the CSV has as many rows as the selected count

  Scenario: Download a filtered selection
    Given the user has opened the app
    And the user has unticked the "Within 2 years" bin
    When the user opens the download modal
    Then the download covers 4 sites
    When the user chooses the CSV format
    And the user clicks download
    Then a CSV file download is triggered
    And the CSV has as many rows as the selected count

  Scenario: Download a whole dataset as CSV
    Given the user opens the datasets page
    When the user selects the "nm_arsenic_summary" dataset
    And the user opens the dataset download
    And the user downloads the dataset as CSV
    Then the downloaded CSV has one header and the rows from every page
