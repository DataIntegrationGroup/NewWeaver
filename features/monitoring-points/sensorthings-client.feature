@client
Feature: SensorThings client contract
  SensorThingsClient is the only adapter for time-series and monitoring-point
  data. It reads FROST over the SensorThings API and handles paging, expansion,
  and errors so the rest of the app never speaks STA directly. Upstream is
  mocked in CI.

  Background:
    Given a SensorThings client pointed at the FROST endpoint

  @smoke
  Scenario: List monitoring locations
    When the client requests Locations
    Then the response contains a "value" array of locations
    And each location has a GeoJSON geometry in EPSG:4326

  Scenario: Follow nextLink paging
    Given a Locations response with an "@iot.nextLink"
    When the client requests the next page
    Then it fetches the nextLink URL
    And it returns the next batch of locations

  Scenario: Fetch datastreams for a Thing
    Given a Thing with id 42
    When the client requests datastreams for that Thing
    Then the request targets "Things(42)/Datastreams"

  Scenario: Fetch observations newest-first
    Given a datastream with id 7
    When the client requests its observations without an order
    Then the request orders observations by "phenomenonTime desc"
    And the request targets "Datastreams(7)/Observations"

  Scenario Outline: Pass through query options
    When the client lists "<entity>" with option "<option>"
    Then the request URL includes "<option>"

    Examples:
      | entity      | option            |
      | Locations   | $top=1000         |
      | Datastreams | $expand=Thing     |
      | Observations| $filter=result gt 0 |

  Scenario: Surface upstream errors
    Given the FROST endpoint returns a 503 status
    When the client requests Locations
    Then the client throws an error describing the failed STA request
