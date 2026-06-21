@frontend
Feature: Home and help pages
  Beyond the map, Weaver has a landing page that introduces the project and a
  help page documenting how to use it and the terms the data is provided under.

  @smoke
  Scenario: Home page introduces the project and links to the map
    Given the user opens the home page
    Then the user sees the Weaver hero
    And the hero shows the Weaver image
    And the user sees a link to the map

  Scenario: Navigate from the home page to the map
    Given the user opens the home page
    When the user clicks the link to the map
    Then the interactive map is shown

  Scenario: Home page lists the data-source partners
    Given the user opens the home page
    Then the user sees the data partners carousel
    And the carousel shows an agency logo for each partner

  Scenario: Home page sets a descriptive browser title
    Given the user opens the home page
    Then the page title contains "New Mexico Water Data"

  Scenario: Help page sets a descriptive browser title
    Given the user opens the help page
    Then the page title contains "Help"

  @smoke
  Scenario: Help page documents usage and the data disclaimer
    Given the user opens the help page
    Then the user sees the documentation and help page
    And the help page includes a data disclaimer

  Scenario: Reach help from the map
    Given the user has opened the app
    When the user opens the help link
    Then the user sees the documentation and help page

  Scenario: Help documents connecting a desktop GIS to the OGC API
    Given the user opens the help page
    When the user opens the "Desktop GIS" help section
    Then the help page shows the OGC API landing page URL
    And it explains connecting ArcGIS Pro and QGIS
