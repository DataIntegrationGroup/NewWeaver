@frontend
Feature: Copy communicates by affordance, not mechanics
  The interface should explain itself. Copy that narrates clicking mechanics
  ("click a point to view its datastreams") is removed; scope, coverage, and
  the developer/GIS documentation are kept and even strengthened
  (SPEC §T.T10, §V.V7, §C.C4).

  Scenario: The About page drops click-mechanics copy
    Given the user opens the about page
    Then the about page does not narrate click mechanics

  Scenario: Help drops map-mechanics but keeps the developer docs
    Given the user opens the help page
    Then the help page does not narrate click mechanics
    And the help page still documents the data sources
    And the help page still documents the API endpoints
    And the help page still documents connecting a desktop GIS
