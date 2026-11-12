@frontend
Feature: Download modal
  A "Download" button opens a modal where the user exports the filtered site summary
  as CSV or GeoJSON, built in the browser from the sites on the map, or hands
  off to the full time-series download for the dataset.

  Background:
    Given the user has opened the app

  @smoke
  Scenario: Opening the download modal
    When the user clicks the "Download" button
    Then a download modal opens
    And it offers site summary and time series exports
    And it shows how many sites are selected

  Scenario: The download modal points to the Desktop GIS integration
    When the user opens the download modal
    Then the modal suggests the Desktop GIS integration
    When the user follows the Desktop GIS link
    Then the Desktop GIS help section is shown

  Scenario: The selection summary reflects filters
    Given "filter to map view" is enabled
    When the user pans to a smaller area
    And the user opens the download modal
    Then the selected count matches the sites in the current extent

  Scenario: A drawn shape attributes the selection to drawing
    Given the user has drawn a selection around some points
    When the user opens the download modal
    Then the summary shows the count contributed by the drawing
    And the filters contribute nothing while a shape restricts the selection

  @smoke
  Scenario: Downloading the filtered site summary as CSV
    When the user opens the download modal
    And the user chooses the CSV format
    And the user clicks download
    Then a CSV file download is triggered
    And the file name begins with "weaver-water-levels-sites-"
    And the CSV has as many rows as the selected count

  Scenario: Downloading the filtered site summary as GeoJSON
    When the user opens the download modal
    And the user chooses the GeoJSON format
    And the user clicks download
    Then a GeoJSON file download is triggered
    And the file name begins with "weaver-water-levels-sites-"

  Scenario: Time series hands off to the full dataset download
    When the user opens the download modal
    And the user chooses the time series export
    And the user continues to the time series download
    Then the dataset download shows 882,280 rows in 89 requests
    And the large download warning is shown and download is disabled

  Scenario: Nothing selected disables download
    Given the user filters sites by the text "zzzzzznomatch"
    When the user opens the download modal
    Then the download action is disabled
    And the modal explains that the selection is empty
