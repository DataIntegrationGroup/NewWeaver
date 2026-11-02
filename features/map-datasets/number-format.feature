@client
Feature: Numbers in the site panel
  Site numbers are rounded for reading, not shown at full float precision:
  large values as whole numbers, mid-range to one decimal, small ones to two
  significant figures. The unit sits with the value.

  Scenario Outline: Numbers round by size
    Then <value> formats as "<text>"

    Examples:
      | value           | text   |
      | 37251           | 37,251 |
      | 474.7648751     | 475    |
      | 54.93           | 54.9   |
      | 1               | 1      |
      | 0.0010000000474 | 0.001  |
      | 0.0456          | 0.046  |
      | 0               | 0      |

  Scenario: A unit is attached to the value
    Then 160 with unit "ft" formats as "160 ft"
