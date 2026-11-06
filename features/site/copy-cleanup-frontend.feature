@frontend
Feature: Help keeps its reference sections
  The help page keeps the data source, API and desktop GIS documentation that
  developers and GIS users link into (SPEC §T.T10, §V.V7, §C.C4).

  Scenario: Help keeps the developer docs
    Given the user opens the help page
    Then the help page still documents the data sources
    And the help page still documents the API endpoints
    And the help page still documents connecting a desktop GIS
