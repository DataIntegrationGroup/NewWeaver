@client
Feature: Export file generation
  The download feature turns the selected STA / Features data into files. These
  scenarios pin the file contents — independent of the UI — against mocked STA
  responses, so the transforms (CSV shape, GeoJSON contents, latest-observation
  reduction) are guaranteed regardless of how the modal drives them.

  Background:
    Given a selection of monitoring locations with datastreams and observations

  # --- Time series: combined long / tidy CSV --------------------------------

  @smoke
  Scenario: Time series exports as one combined long-format CSV
    When the user exports the selection as time series
    Then a single CSV file is produced
    And its header is "location_id,location_name,longitude,latitude,datastream_id,datastream_name,unit,phenomenon_time,result"
    And every observation across all selected datastreams appears as its own row
    And rows from different datastreams share the one file

  Scenario: Each time-series row carries its own unit and timestamp
    When the user exports the selection as time series
    Then each row's "unit" matches its datastream's unit of measurement
    And each row's "phenomenon_time" is an ISO 8601 instant

  Scenario: A time range filters the exported observations
    Given the export is configured with a time range
    When the user exports the selection as time series
    Then only observations whose phenomenon time is within the range are included
    And observations outside the range are excluded

  Scenario: Datastreams with no observations contribute no rows
    Given one selected datastream has no observations
    When the user exports the selection as time series
    Then that datastream produces no rows
    And the other datastreams' rows are still present

  # --- Latest observation: snapshot CSV -------------------------------------

  @smoke
  Scenario: Latest observation exports one newest row per datastream
    When the user exports the selection as latest observation
    Then a single CSV file is produced
    And it contains exactly one row per selected datastream
    And each row holds that datastream's most recent observation

  Scenario: Latest observation includes location coordinates and result time
    When the user exports the selection as latest observation
    Then each row includes the location longitude and latitude
    And each row includes the observation result time

  # --- Features: GeoJSON inventory ------------------------------------------

  @smoke
  Scenario: Features export is GeoJSON of the selected things only
    When the user exports the selection as features
    Then a GeoJSON FeatureCollection is produced
    And it contains one feature per selected thing
    And each feature's geometry is its location point
    And each feature lists its datastreams in properties
    And no observations are included in the GeoJSON

  Scenario: OGC Features layers pass through unchanged in a features export
    Given the selection includes vector features from an OGC API Features layer
    When the user exports the selection as features
    Then those features appear in the GeoJSON with their original geometry and properties
