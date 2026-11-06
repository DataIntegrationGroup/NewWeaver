@frontend @tour
Feature: Onboarding tour
  A first visit to the map walks through finding an area, choosing data,
  coloring and filtering, opening a site, and sharing or downloading. Once
  dismissed it stays dismissed in that browser.

  Scenario: A first visit steps through the tour, then never sees it again
    Given the user has opened the app
    Then the tour shows step 1 of 5, "Find your area"
    When the user steps through to the end of the tour
    Then the tour is not shown
    When the user reloads the map
    Then the tour is not shown

  Scenario: Escape dismisses the tour
    Given the user has opened the app
    And the tour shows step 1 of 5, "Find your area"
    When the user presses Escape
    Then the tour is not shown

  Scenario: The sidebar link brings the tour back
    Given the user has opened the app
    And the user presses Escape
    When the user takes the tour again
    Then the tour shows step 1 of 5, "Find your area"

  Scenario: The sidebar actions fit the narrowest sidebar
    Given the user has opened the app
    And the user presses Escape
    When the user narrows the sidebar as far as it goes
    Then every sidebar action fits inside its button
