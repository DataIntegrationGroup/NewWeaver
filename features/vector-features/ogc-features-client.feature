@client
Feature: OGC API Features client contract
  OgcFeaturesClient is the only adapter for vector / integrated data. It reads
  DIE's pygeoapi over OGC API Features and handles collection discovery, bbox +
  limit/offset paging, and errors. Upstream is mocked in CI.

  Background:
    Given an OGC API Features client pointed at the DIE pygeoapi endpoint

  @smoke
  Scenario: List available collections
    When the client requests the collections list
    Then the response contains a "collections" array
    And each collection has an id and links

  Scenario: Fetch items as GeoJSON
    When the client requests items for collection "water_levels_summary"
    Then the request asks for JSON output
    And the response is a GeoJSON FeatureCollection

  Scenario: Filter items by bounding box
    Given a bounding box covering central New Mexico
    When the client requests items within that bounding box
    Then the request URL includes a "bbox" parameter with four coordinates

  Scenario: Page through items with limit and offset
    When the client requests items with a limit of 100 and an offset of 200
    Then the request URL includes "limit=100"
    And the request URL includes "offset=200"

  Scenario: Fetch a single feature by id
    When the client requests feature "abc123" from collection "latest_tds"
    Then the request targets "collections/latest_tds/items/abc123"

  Scenario: Surface upstream errors
    Given the pygeoapi endpoint returns a 500 status
    When the client requests items for a collection
    Then the client throws an error describing the failed Features request
