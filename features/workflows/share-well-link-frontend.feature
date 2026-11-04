@frontend
Feature: Share a well's hydrograph link (W10-484)
  Staff send a well owner or requester a link to one well. The link opens
  straight onto that well's panel and hydrograph, on a desktop or a phone.

  Background:
    Given the site panel's data is served

  Scenario: A shared link opens the well and its hydrograph
    When the user opens site "NMBGMR:WL-0001" in the "water-levels" dataset
    Then the site panel is titled "Yale Well"
    And the site panel shows a chart

  Scenario: Sharing a selected well copies a link that reopens it
    When the user opens site "NMBGMR:WL-0001" in the "water-levels" dataset
    And the user shares the current view
    Then a "Link copied" confirmation appears
    When the user opens the copied link
    Then the site panel is titled "Yale Well"

  Scenario: A link to a site that isn't in the dataset says so
    When the user opens site "NMBGMR:NO-SUCH-WELL" in the "water-levels" dataset
    Then the site panel says "This site isn’t in Water Levels."

  Scenario: A shared link fills the screen on a phone
    When the user opens site "NMBGMR:WL-0001" in the "water-levels" dataset
    And the screen is phone-sized
    Then the site panel fills the screen width
