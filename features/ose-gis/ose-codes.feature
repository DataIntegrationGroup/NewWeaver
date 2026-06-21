@client
Feature: OSE coded-value labels
  OSE Points of Diversion store status, POD status, and use as short codes. The
  table, hover popup, and inspect panel render them as "CODE: Label" via a
  display formatter, while the raw codes stay in the data so the OSE filter
  still matches on them. Labels come from the original Weaver OSE filter.

  Scenario Outline: Coded fields expand to "CODE: Label"
    When the OSE value formatter runs on field "<field>" with "<code>"
    Then the formatted value is "<text>"

    Examples:
      | field      | code | text                                   |
      | use_       | IRR  | IRR: Irrigation                        |
      | use_       | DOM  | DOM: 72-12-1 domestic one household    |
      | status     | PMT  | PMT: Permit                            |
      | status     | LIC  | LIC: Licensed                          |
      | pod_status | ACT  | ACT: Active                            |

  Scenario: Unknown codes pass through unchanged
    When the OSE value formatter runs on field "status" with "ZZZ"
    Then the formatted value is "ZZZ"

  Scenario: Blank codes render empty
    When the OSE value formatter runs on field "pod_status" with " "
    Then the formatted value is ""

  Scenario: Non-coded fields are left alone
    When the OSE value formatter runs on field "pod_file" with "SJ-01206"
    Then the formatted value is "SJ-01206"
