@client
Feature: Per-layer field display
  The hover popup, the multi-record attribute table, and the single-record
  inspect panel all show a layer's feature properties. By default every field
  is shown, in its natural order. A layer narrows this by declaring at most one
  of an `include` allow-list (which also sets the order) or an `exclude`
  deny-list. All three surfaces resolve the visible fields the same way, so a
  layer's field config drives them identically.

  Background:
    Given a feature with the fields "name, status, depth_well, log_file_d, id"

  Scenario: All fields show by default
    When the layer declares no field config
    Then the displayed fields are "name, status, depth_well, log_file_d, id"

  Scenario: Include is an allow-list that also sets the order
    When the layer includes the fields "status, name"
    Then the displayed fields are "status, name"

  Scenario: Exclude is a deny-list over the remaining fields
    When the layer excludes the fields "id"
    Then the displayed fields are "name, status, depth_well, log_file_d"

  Scenario: Include then exclude combine
    When the layer includes the fields "name, status, id" and excludes "id"
    Then the displayed fields are "name, status"

  Scenario: Included fields the feature lacks are skipped
    When the layer includes the fields "name, county, status"
    Then the displayed fields are "name, status"
