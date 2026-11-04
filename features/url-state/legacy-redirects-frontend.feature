@frontend
Feature: Legacy URL redirects
  NewWeaver serves the old Weaver app's domain. Bookmarks and links into the
  old app land on the closest page here: the groundwater dashboard goes to
  the map, the other dashboards and tools go to the home page, the docs go to
  Help, and a location page opens that site on the map. Redirects replace the history entry, so Back never returns to an old
  URL. The old app's query strings mean nothing here and are dropped.

  Scenario Outline: Old dashboards and tools land on the home page
    When the user visits the legacy URL "<path>"
    Then the user lands on "/"
    And the user sees the Weaver hero

    Examples:
      | path            |
      | /st             |
      | /hv             |
      | /die            |
      | /surfacewater   |
      | /pvacd          |
      | /collabnet      |
      | /pws            |
      | /site_cross_ref |

  Scenario Outline: Old paths match regardless of case, trailing slash, or query
    When the user visits the legacy URL "<path>"
    Then the user lands on "<target>"

    Examples:
      | path             | target |
      | /HV              | /      |
      | /groundwater/    | /map   |
      | /pvacd?tab=wells | /      |
      | /Docs/           | /help  |

  Scenario: About keeps its URL
    When the user visits the legacy URL "/about"
    Then the user lands on "/about"

  Scenario: The old docs page lands on Help
    When the user visits the legacy URL "/docs"
    Then the user lands on "/help"

  Scenario: The old groundwater dashboard lands on the map
    When the user visits the legacy URL "/groundwater"
    Then the user lands on "/map"
    And the URL records the "water-levels" dataset

  @smoke
  Scenario: An old location page opens that site on the map
    When the user visits the legacy URL "/location/WL-0001"
    Then the user lands on "/map"
    And the URL records the "water-levels" dataset
    And the URL selects site "NMBGMR:WL-0001"
    And the site panel is titled "Yale Well"
    And a filter chip reads "Search: WL-0001"
    And the legend counts 1 site

  Scenario: A location ID that already names its source is kept as is
    When the user visits the legacy URL "/location/NMBGMR:WL-0004"
    Then the URL selects site "NMBGMR:WL-0004"
    And the site panel is titled "Farmington Well"
    And a filter chip reads "Search: WL-0004"

  Scenario: Back after a redirect skips the old URL
    Given the user opens the about page
    When the user visits the legacy URL "/docs"
    And the user navigates back
    Then the user lands on "/about"
