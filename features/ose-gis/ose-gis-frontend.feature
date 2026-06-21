@frontend
Feature: OSE GIS layers in the catalog
  The OSE Points of Diversion and Aquifer Test Wells are ArcGIS REST layers,
  grouped under their own "OSE GIS" section in the layer list. They are dense
  statewide point layers, so they cluster on the map and start hidden. This
  spec covers their presence and grouping; clustering and the ArcGIS request
  shape are covered by the @client ArcGIS REST client contract.

  Background:
    Given the user has opened the app

  @smoke
  Scenario: OSE GIS section appears in the layer list
    Then the catalog shows a "OSE GIS" layer group

  Scenario Outline: OSE GIS datasets are ArcGIS-sourced
    Then the catalog contains a "<title>" layer sourced from "arcgis"

    Examples:
      | title                    |
      | OSE Points of Diversion  |
      | OSE Aquifer Test Wells   |

  Scenario: OSE GIS layers start hidden
    Then the "OSE Points of Diversion" layer is toggled off
    And the "OSE Aquifer Test Wells" layer is toggled off

  Scenario: The OSE GIS group describes itself on hover
    When the user hovers over the "OSE GIS" layer group
    Then a tooltip explains the "OSE GIS" group
