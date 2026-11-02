@frontend
Feature: Site detail panel
  Selecting a site opens a panel on the right: the site's name and source,
  a few headline numbers, then tabs with the detail. Each dataset kind has
  its own layout. Scenarios open the site from a URL (the selection lives in
  `sel`), so they don't depend on clicking the canvas.

  Background:
    Given the site panel's data is served

  Scenario: A well leads with its headline numbers and its hydrograph
    When the user opens site "NMBGMR:WL-0001" in the "water-levels" dataset
    Then the site panel is titled "Yale Well"
    And the site panel's subtitle reads "NM Bureau of Geology (NMBGMR) · Water Levels"
    And the site panel's headline shows "40 ft"
    And the site panel's headline shows "150"
    And the site panel has the tabs "Chart, Details, Readings"
    And the site panel shows a chart

  Scenario: An analyte site says where it ranks and charts its numeric samples
    When the user opens site "WQP:AS-1" in the "arsenic" dataset
    Then the site panel is titled "Corrales Well"
    And the site panel's headline shows "0.012 mg/L"
    And the site panel's headline shows "0.0081–0.012"
    And the site panel's headline shows "410 ft"
    And the site panel's takeaway reads "Latest arsenic is higher than 33% of sites with arsenic results."
    And the site panel has the tabs "Chart, Details, Samples"
    And the site panel shows a chart

  Scenario: The samples tab lists every result, text results as reported
    When the user opens site "WQP:AS-1" in the "arsenic" dataset
    And the user opens the "Samples" tab
    Then the samples table lists 3 results
    And the samples table shows the result "0.012 mg/L"
    And the samples table shows the result "< MRL 0.001 MG/L"

  Scenario: A site with only text results has nothing to chart
    When the user opens site "WQP:AS-3" in the "arsenic" dataset
    Then the site panel says "No numeric results to chart."

  Scenario: Major ions read like the other chemistry results
    When the user opens site "NMBGMR:MC-1" in the "major-chemistry" dataset
    Then the site panel is titled "Yale Chemistry Well"
    And the site panel lists "Calcium" as "54.9 mg/L"
    And the site panel lists "Bicarbonate" as "180 mg/L"
    And the site panel lists "Hardness" as "Hard (187 mg/L as CaCO₃)"
    And the site panel lists "Dominant cation" as "Calcium"

  Scenario: The close button clears the selection
    When the user opens site "WQP:AS-1" in the "arsenic" dataset
    And the user closes the site panel
    Then the site panel closes and the selection clears

  Scenario: Escape clears the selection
    When the user opens site "WQP:AS-1" in the "arsenic" dataset
    And the user presses Escape
    Then the site panel closes and the selection clears

  Scenario: Zoom to the site and copy its ID
    When the user opens site "WQP:AS-1" in the "arsenic" dataset
    And the user zooms to the site
    Then the map centers on -106.65, 35.1
    When the user copies the site ID
    Then the clipboard holds "WQP:AS-1"
