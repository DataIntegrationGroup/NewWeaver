@client
Feature: Map dataset facets
  The map shows one DIE dataset at a time. Each dataset splits its sites into
  facets: a property cut into ordered bins. A facet filters (tick the bins to
  keep) and, when it's the "color by", is the legend. The same bin rules run
  in JS (filters, counts) and as a MapLibre expression (point colors), so a
  site is always counted in the bin it's drawn in.

  Scenario Outline: Numeric bins include their lower bound and exclude their upper bound
    Given a "water-levels" site with "span_years" = <value>
    Then it falls in the "span" bin "<bin>"

    Examples:
      | value | bin          |
      | 25    | 25+ years    |
      | 24.9  | 10–25 years  |
      | 1     | 1–10 years   |
      | 0.5   | Under 1 year |
      | null  | No value     |

  Scenario: A missing value isn't treated as zero
    Given a "water-levels" site with "latest_value" = null
    Then it falls in the "dtw" bin "No value"

  Scenario Outline: Date bins compare ISO dates
    Given a "water-levels" site last measured <when>
    Then it falls in the "last" bin "<bin>"

    Examples:
      | when           | bin               |
      | today          | Within 2 years    |
      | 5 years ago    | 2–10 years ago    |
      | 20 years ago   | 10–30 years ago   |
      | on 1950-06-01  | Over 30 years ago |

  Scenario Outline: Categorical bins match exactly
    Given a "major-chemistry" site with "hardness_class" = "<value>"
    Then it falls in the "hardness" bin "<bin>"

    Examples:
      | value        | bin       |
      | very hard    | Very hard |
      | soft         | Soft      |
      | insufficient | No value  |

  Scenario: Map colors agree with the bins for every dataset
    When every fixed-bin facet is checked at its bin edges and with missing values
    Then the MapLibre color of each site is its bin's color

  Scenario: Quantile bins split the data into five readable bins
    Given concentrations from 1 to 100 mg/L
    When they are split into 5 quantile bins
    Then the bin labels are "Under 21 mg/L; 21–41 mg/L; 41–61 mg/L; 61–81 mg/L; 81 mg/L and over"

  Scenario: Repeated quantile edges collapse into fewer bins
    Given 50 sites at 0 mg/L and concentrations from 1 to 50 mg/L
    When they are split into 5 quantile bins
    Then the bin labels are "Under 11 mg/L; 11–31 mg/L; 31 mg/L and over"

  Scenario: Quantile bins are keyed in the URL by their edges
    A monthly refresh moves the edges, so a shared link names a range, not a
    position that could start meaning a different one.
    Given concentrations from 1 to 100 mg/L
    When they are split into 5 quantile bins
    Then the URL keys of the bins are "~21; 21~41; 41~61; 61~81; 81~"

  Scenario: Each facet is counted without its own selection
    Given these "water-levels" sites:
      | span_years | nrecords |
      | 30         | 150      |
      | 30         | 5        |
      | 5          | 150      |
      | 0.2        | 1        |
    When only the "span" bin "25+ years" is ticked
    Then "span" counts are "25+ years: 2, 10–25 years: 0, 1–10 years: 1, Under 1 year: 1"
    And "readings" counts are "100+: 1, 10–99: 0, 2–9: 1, 1: 0"
    And 2 sites pass the filters

  Scenario: Missing DIE values become null on load
    Given a DIE row with:
      | key            | value       |
      | id             | 10493       |
      | usgs_site_id   |             |
      | well_depth     | None        |
      | earliest_date  | 2004-04-08  |
      | latest_date    | 2024-04-08  |
      | source         | ST2/BernCo  |
    When it is loaded
    Then "id" is the string "10493"
    And "usgs_site_id" is null
    And "well_depth" is null
    And "latest_date" is the string "2024-04-08"
    And "span_years" is the number 20

  Scenario: Joined fields are null for sites missing from the join
    Given major chemistry sites "A:1, B:2"
    And a hardness row for "A:1" with class "hard"
    When hardness is joined by feature id
    Then site "A:1" has hardness "hard"
    And site "B:2" has hardness null
