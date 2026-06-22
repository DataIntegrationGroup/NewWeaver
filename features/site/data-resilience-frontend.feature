@frontend
Feature: Resilient data loading
  When an upstream service fails, Weaver surfaces it instead of silently leaving
  a layer blank — a toast names the failure and offers a one-click retry.

  Background:
    Given the user has opened the app

  Scenario: A failed layer load shows a retry toast
    Given the "Springs" data source returns an error
    When the user toggles the "Springs" layer on
    Then a "Couldn't load" message appears
    And the message offers a Retry action
