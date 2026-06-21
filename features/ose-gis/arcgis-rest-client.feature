@client
Feature: ArcGIS REST client contract
  ArcGisRestClient is the adapter for the OSE GIS layers — Points of Diversion
  and Aquifer Test Wells — published as Esri ArcGIS REST Feature Services. It
  queries with f=geojson so the rest of the app never sees Esri shapes, and
  pages with resultOffset / resultRecordCount until the server stops setting
  exceededTransferLimit. Upstream is mocked in CI.

  Background:
    Given an ArcGIS REST client pointed at an OSE FeatureServer layer

  @smoke
  Scenario: Query features as GeoJSON
    When the client queries the layer
    Then the request asks for GeoJSON output
    And the response is a GeoJSON FeatureCollection

  Scenario: Default to every row and every field
    When the client queries the layer
    Then the request URL selects where "1=1"
    And the request URL selects all out fields

  Scenario: Filter features by bounding box
    Given a bounding box covering central New Mexico
    When the client queries the layer within that bounding box
    Then the request URL carries an envelope geometry with four coordinates
    And the request URL declares the geometry as an esri envelope

  Scenario: Page through features with offset and count
    When the client queries the layer with a count of 100 at offset 200
    Then the request URL includes "resultOffset=200"
    And the request URL includes "resultRecordCount=100"

  Scenario: Fetch every feature across pages
    Given the layer returns a full page of 2 with more available then a final page of 1
    When the client fetches all features with a page size of 2
    Then all 3 features across the pages are returned
    And the requests advance the result offset from 0 to 2

  Scenario: Fetch every feature in parallel using the server count
    Given the layer reports 3 features and returns pages of 2 then 1
    When the client fetches all features in parallel with a page size of 2
    Then all 3 features across the pages are returned

  Scenario: Fall back to serial paging when no count is available
    Given the layer will not report a count and returns 2 then a final page of 1
    When the client fetches all features in parallel with a page size of 2
    Then all 3 features across the pages are returned

  Scenario: Fetch a single feature by ObjectID
    When the client fetches the feature with ObjectID 4567
    Then the request URL selects where "objectid=4567"

  Scenario: Surface upstream errors
    Given the FeatureServer returns a 500 status
    When the client queries the layer and it fails
    Then the client throws an error describing the failed ArcGIS request
