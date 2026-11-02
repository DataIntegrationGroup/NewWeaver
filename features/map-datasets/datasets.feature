@client
Feature: Map datasets come from the DIE API
  The dataset picker lists what DIE's /collections serves, so a product added,
  retitled or retired upstream shows up on the map without a Weaver change.
  Every `nm_<analyte>_summary` is an analyte dataset; only products with their
  own layout or hand-tuned bins are written out in Weaver.

  Scenario: Summaries become datasets, grouped by the major chemistry keywords
    Given DIE lists these collections:
      | id                       | title                     | keywords                       |
      | nm_waterlevels_summary   | NM Unified Water Levels   |                                |
      | nm_arsenic_summary       | NM Arsenic Summary        |                                |
      | nm_arsenic_timeseries    | NM Arsenic Time Series    |                                |
      | nm_major_chemistry       | NM Major Chemistry        | major chemistry, sulfate, sodium |
      | nm_sulfate_summary       | NM Sulfate Summary        |                                |
      | nm_tds_summary           | NM TDS Summary            |                                |
      | nm_manganese_summary     | NM Manganese Summary      |                                |
      | nm_mcl_exceedance        | NM MCL Exceedances        |                                |
    When the map builds its datasets
    Then the picker offers:
      | group                        | id              | label                  |
      | Water levels                 | water-levels    | Water Levels           |
      | Major ions                   | major-chemistry | Major Chemistry        |
      | Major ions                   | tds             | Total Dissolved Solids |
      | Major ions                   | sulfate         | Sulfate                |
      | Minor and trace constituents | arsenic         | Arsenic                |
      | Minor and trace constituents | manganese       | Manganese              |
    And "arsenic" reads its time series from "nm_arsenic_timeseries"
    And "manganese" has no time series

  Scenario: A hand-tuned dataset DIE no longer serves isn't offered
    Given DIE lists these collections:
      | id                 | title              | keywords |
      | nm_arsenic_summary | NM Arsenic Summary |          |
    When the map builds its datasets
    Then the picker offers:
      | group                        | id      | label   |
      | Minor and trace constituents | arsenic | Arsenic |

  Scenario Outline: Collections link to the map dataset that shows them
    Then collection "<collection>" opens map dataset "<dataset>"

    Examples:
      | collection               | dataset         |
      | nm_waterlevels_summary   | water-levels    |
      | nm_waterlevel_trends     | water-levels    |
      | nm_monitoring_recency    | water-levels    |
      | nm_hardness              | major-chemistry |
      | nm_nitrate_summary       | nitrate         |
      | nm_nitrate_timeseries    | nitrate         |
      | nm_well_density_by_basin | none            |
