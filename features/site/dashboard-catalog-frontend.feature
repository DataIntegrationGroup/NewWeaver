@frontend
Feature: Home dashboard and datasets
  The home page summarises how much data Weaver brings together, and a Datasets
  page lets a visitor browse, search, and share every integrated product, or
  open one straight on the map.

  # SPEC §T.T11 — dataset and site counts come live from DIE, not magic numbers.
  Scenario: Home dashboard shows data counts
    Given the user opens the home page
    Then the dashboard shows the data counts

  # SPEC §T.T13 / §V.V18 — a row for every collection the DIE pygeoapi serves.
  Scenario: Datasets lists every integrated product
    Given the user opens the datasets page
    Then the datasets page lists every integrated product

  # SPEC §T.T14 / §V.V15 — view-on-map opens the dataset's own layer.
  Scenario: A selected dataset opens on the map
    Given the user opens the datasets page
    When the user selects the "nm_arsenic_trend" dataset
    Then the dataset details link to the map with the "wfs-nm-arsenic-trend" layer

  # Only collections Weaver draws as a map layer offer "View on the map".
  Scenario: A dataset with no map layer has no map link
    Given the user opens the datasets page
    When the user selects the "nm_fluoride_trend" dataset
    Then the dataset details have no map link

  # SPEC §T.T14 / §V.V16 — a copyable, shareable deep link.
  Scenario: A selected dataset shares a deep link
    Given the user opens the datasets page
    When the user selects the "nm_arsenic_trend" dataset
    And the user shares the selected dataset
    Then the clipboard holds a datasets deep link to "nm_arsenic_trend"

  # SPEC §T.T15 / §V.V17 — search across all displayed metadata.
  Scenario: Searching datasets narrows the results
    Given the user opens the datasets page
    When the user searches datasets for "arsenic"
    Then the datasets page lists fewer datasets than the full set
    And the "nm_arsenic_trend" dataset is listed

  # Sources come from the end of each collection's description.
  Scenario: Filtering datasets by source
    Given the user opens the datasets page
    When the user filters datasets by the "CABQ" source
    Then only datasets from "CABQ" are listed
    And the datasets are filtered by the "CABQ" source

  Scenario: A selected dataset lists its sources
    Given the user opens the datasets page
    When the user selects the "nm_arsenic_summary" dataset
    Then the dataset details list the sources "NMBGMR, WQP, USBR"

  # SPEC §T.T15 / §V.V17 — an explicit empty state, never a blank page.
  Scenario: Searching for nothing shows an empty message
    Given the user opens the datasets page
    When the user searches datasets for "zzzznomatch"
    Then the datasets page shows a no-results message

  # SPEC §V.V16 — a dataset deep link selects it.
  Scenario: A dataset deep link selects the dataset
    Given the user opens a datasets deep link to "nm_arsenic_trend"
    Then the "nm_arsenic_trend" dataset is selected
    And the dataset details list its fields

  # The page used to be the Data Catalog; old links keep working.
  Scenario: Old catalog links redirect to datasets
    Given the user opens "/catalog?q=arsenic"
    Then the datasets page is shown with the search "arsenic"

  # The API returns at most 10,000 rows per request; a download fetches every
  # page and joins them into one file with a single header row.
  Scenario: Downloading a dataset joins every page into one CSV
    Given the user opens the datasets page
    When the user selects the "nm_arsenic_summary" dataset
    And the user opens the dataset download
    Then the dataset download shows 25,000 rows in 3 requests
    When the user downloads the dataset as CSV
    Then the downloaded CSV has one header and the rows from every page

  # Datasets over 30,000 rows are flagged as large, without blocking the download.
  Scenario: A large dataset download is flagged
    Given the user opens the datasets page
    When the user selects the "nm_waterlevels_summary" dataset
    And the user opens the dataset download
    Then the dataset download is flagged as a large dataset
    And the dataset download can start

  # Very large datasets warn first and need an explicit confirmation.
  Scenario: A very large dataset download must be confirmed
    Given the user opens the datasets page
    When the user selects the "nm_waterlevels_timeseries" dataset
    And the user opens the dataset download
    Then the large download warning is shown and download is disabled
    When the user confirms the large download
    Then the dataset download can start
