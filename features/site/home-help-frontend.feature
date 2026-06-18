@frontend
Feature: Home and help pages
  Beyond the map, Weaver has a landing page that introduces the project and a
  help page documenting how to use it and the terms the data is provided under.

  @smoke
  Scenario: Home page introduces the project and links to the map
    Given the user opens the home page
    Then the user sees the Weaver hero
    And the user sees a link to the map

  Scenario: Navigate from the home page to the map
    Given the user opens the home page
    When the user clicks the link to the map
    Then the interactive map is shown

  @smoke
  Scenario: Help page documents usage and the data disclaimer
    Given the user opens the help page
    Then the user sees the documentation and help page
    And the help page includes a data disclaimer

  Scenario: Reach help from the map
    Given the user has opened the app
    When the user opens the help link
    Then the user sees the documentation and help page
