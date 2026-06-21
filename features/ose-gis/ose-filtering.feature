@client
Feature: OSE Points of Diversion attribute filtering
  The OSE filter narrows Points of Diversion by the same six attributes the
  original Weaver application filtered on. Each filter is independent and
  AND-combined: an empty multi-select or a full-span range imposes no
  constraint, and the well-log flag is opt-in. Codes and ranges match Weaver's
  oseFilterWorker.

  Background:
    Given an OSE filter at its defaults

  Scenario: Defaults keep every POD
    Given a POD with properties:
      | status     | LIC |
      | pod_status | ACT |
      | use_       | IRR |
      | depth_well | 200 |
      | depth_wate | 30  |
    Then the POD passes the filter

  Scenario: Status multi-select keeps only matching water-right statuses
    Given the filter statuses are "ADJ, LIC"
    Given a POD with properties:
      | status | LIC |
    Then the POD passes the filter
    Given a POD with properties:
      | status | CAN |
    Then the POD is filtered out

  Scenario: POD status multi-select
    Given the filter pod statuses are "ACT"
    Given a POD with properties:
      | pod_status | ACT |
    Then the POD passes the filter
    Given a POD with properties:
      | pod_status | PLG |
    Then the POD is filtered out

  Scenario: Use code multi-select matches the use_ property
    Given the filter use codes are "IRR, DOM"
    Given a POD with properties:
      | use_ | DOM |
    Then the POD passes the filter
    Given a POD with properties:
      | use_ | STK |
    Then the POD is filtered out

  Scenario: Well-depth range keeps PODs inside the window
    Given the filter well depth range is 100 to 500
    Given a POD with properties:
      | depth_well | 250 |
    Then the POD passes the filter
    Given a POD with properties:
      | depth_well | 900 |
    Then the POD is filtered out

  Scenario: Depth-to-water range keeps PODs inside the window
    Given the filter depth to water range is 0 to 50
    Given a POD with properties:
      | depth_wate | 20 |
    Then the POD passes the filter
    Given a POD with properties:
      | depth_wate | 80 |
    Then the POD is filtered out

  Scenario: Well-log flag keeps only PODs with a log file date
    Given the filter requires a well log file date
    Given a POD with properties:
      | log_file_d | 2019-05-01 |
    Then the POD passes the filter
    Given a POD with properties:
      | log_file_d |  |
    Then the POD is filtered out

  Scenario: Filters AND together
    Given the filter statuses are "LIC"
    Given the filter well depth range is 100 to 500
    Given a POD with properties:
      | status     | LIC |
      | depth_well | 250 |
    Then the POD passes the filter
    Given a POD with properties:
      | status     | LIC |
      | depth_well | 900 |
    Then the POD is filtered out
