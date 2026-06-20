@frontend
Feature: Download modal
  A "Download" button opens a modal where the user picks what to export and how.
  The modal resolves the current selection, lets the user choose the export
  kind and options, and triggers a client-side file download.

  Background:
    Given the user has opened the app
    And the "City of Albuquerque (CABQ)" layer is toggled on

  @smoke
  Scenario: Opening the download modal
    When the user clicks the "Download" button
    Then a download modal opens
    And it offers time series, latest observation, and features exports
    And it shows how many locations are selected

  Scenario: The selection summary reflects filters
    Given "filter to map view" is enabled
    When the user pans to a smaller area
    And the user opens the download modal
    Then the selected count matches the locations in the current extent

  Scenario: The selection summary breaks down draw vs filter sources
    Given the user has drawn a selection around some points
    When the user opens the download modal
    Then the summary shows the count contributed by the drawing
    And the summary shows the count contributed by the filters

  @smoke
  Scenario: Downloading a time-series CSV
    When the user opens the download modal
    And the user chooses the time series export
    And the user clicks download
    Then a CSV file download is triggered
    And the file name begins with "weaver-timeseries-"

  Scenario: Downloading features as GeoJSON
    When the user opens the download modal
    And the user chooses the features export
    And the user clicks download
    Then a GeoJSON file download is triggered
    And the file name begins with "weaver-features-"

  Scenario: Time range is offered only for time-series exports
    When the user opens the download modal
    And the user chooses the time series export
    Then the user can set a from and to date
    When the user chooses the features export
    Then no time range inputs are shown

  Scenario: Nothing selected disables download
    Given no monitoring locations are in the current selection
    When the user opens the download modal
    Then the download action is disabled
    And the modal explains that the selection is empty

  Scenario: A large time-series export warns before fetching
    Given the selection contains many continuous datastreams
    When the user opens the download modal
    And the user chooses the time series export with no time range
    Then the modal warns that the export may be large
    And the user must confirm before the download proceeds
