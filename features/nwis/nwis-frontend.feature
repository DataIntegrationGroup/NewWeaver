@frontend
Feature: NWIS layers in the catalog
  USGS NWIS sites come from the modern Water Data for the Nation OGC API, read
  through the same OGC API Features client as the Ocotillo layers. They live in
  their own "NWIS" section. The first dataset is New Mexico groundwater sites
  (monitoring-locations filtered to site_type_code=GW); it is dense, so it
  clusters and starts hidden.

  Background:
    Given the user has opened the app

  @smoke
  Scenario: NWIS section appears in the layer list
    Then the catalog shows a "NWIS" layer group

  Scenario: Groundwater sites are an OGC API Features layer
    Then the catalog contains a "Groundwater Sites" layer sourced from "features"

  Scenario: NWIS groundwater starts hidden
    Then the "Groundwater Sites" layer is toggled off

  Scenario: The NWIS group describes itself on hover
    When the user hovers over the "NWIS" layer group
    Then a tooltip explains the "NWIS" group
