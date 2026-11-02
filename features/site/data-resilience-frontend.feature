@frontend
Feature: Resilient data loading
  When an upstream service fails, Weaver surfaces it instead of silently leaving
  the map blank — a toast names the failure and offers a one-click retry.

  Scenario: A failed dataset load shows a retry toast
    Given the Water Levels data source returns an error
    When the user opens the app
    Then a "Couldn't load" message appears
    And the message offers a Retry action
