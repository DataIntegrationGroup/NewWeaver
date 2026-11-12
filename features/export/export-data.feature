@client
Feature: Export file generation
  The map's download turns the selected sites into a CSV or GeoJSON file. These
  scenarios pin the file contents independent of the UI, so the shape of the
  export holds regardless of how the modal drives it.

  Background:
    Given a selection of map sites

  @smoke
  Scenario: Sites export as one CSV row per site
    When the user exports the sites as CSV
    Then the CSV header begins with "feature_id,name,longitude,latitude"
    And the CSV has one row per selected site
    And each row carries the site's longitude and latitude

  Scenario: The CSV covers every property across the sites
    When the user exports the sites as CSV
    Then the CSV has a column for every site property
    And it has no internal "id" column

  Scenario: Nested values are JSON-encoded in the CSV
    When the user exports the sites as CSV
    Then a nested property value appears as JSON in its cell

  @smoke
  Scenario: Sites export as GeoJSON keeps geometry and drops the internal id
    When the user exports the sites as GeoJSON
    Then a GeoJSON FeatureCollection is produced
    And it contains one feature per selected site
    And each feature keeps its original geometry
    And no feature carries an internal "id" property
