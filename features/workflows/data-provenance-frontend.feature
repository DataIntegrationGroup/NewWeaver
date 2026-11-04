@frontend
Feature: Show where the data came from (W10-488)
  Every site names the agency that collected it, the map counts sites by
  source, and each dataset lists its sources.

  Scenario: A site names its source agency
    Given the site panel's data is served
    When the user opens site "NMBGMR:WL-0001" in the "water-levels" dataset
    Then the site panel's subtitle reads "NM Bureau of Geology (NMBGMR) · Water Levels"

  Scenario: The legend counts sites by source
    Given the user has opened the app
    When the user colors the map by "Source"
    Then the legend counts 2 sites from "NM Bureau of Geology (NMBGMR)"
    And the legend counts 2 sites from "USGS (NWIS)"
    And the legend counts 1 site from "Elephant Butte Irrigation District"

  Scenario: A dataset lists its sources
    Given the user opens the datasets page
    When the user selects the "nm_arsenic_summary" dataset
    Then the dataset details list the sources "NMBGMR, WQP, USBR"
