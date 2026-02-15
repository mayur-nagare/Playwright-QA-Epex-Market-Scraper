# Playwright-QA-Epex-Market-Scraper

**QA Automation Practical Task** — Playwright automation that visits [EPEX SPOT Market Results](https://www.epexspot.com/en/market-results), scrapes the first four data columns (Low, High, Last, Weight Avg), and writes them to a CSV file.

---

## Task Overview

This project implements the following requirements:

| Requirement | Implementation |
|-------------|----------------|
| Visit the EPEX SPOT Market Results website | Playwright navigates to the market results page with appropriate filters (GB, Continuous, table view). |
| Scrape the first 4 data columns: **Low**, **High**, **Last**, **Weight Avg** | Table is located by header text; column indices are resolved dynamically; all data rows are scraped for these four columns. |
| Write data into a CSV file | CSV is written with proper escaping (commas, quotes, newlines); output path: `output/epex_market_results_<date>.csv`. |
| Handle “no data” / link errors | Delivery date is set to **yesterday** in ISO format (`delivery_date=YYYY-MM-DD`) so the URL always targets available data. |

The solution emphasises **reusable**, **robust**, and **clean** code with **sensible error handling** and **clear comments**, as requested in the task.

---

## Tech Stack

- **Playwright** — browser automation and DOM interaction  
- **TypeScript** — type safety and maintainability  
- **Node.js** — runtime (fs/promises for file writing)

---

## Prerequisites

- **Node.js** 18 or higher  
- **npm**

---

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers (Chromium, Firefox, WebKit)
npx playwright install
```

---

## How to Run

```bash
# Run the EPEX market results test
npm run test:epex
```

Or directly:

```bash
npx playwright test tests/epex-spot-market-results.spec.ts
```

**Output:** The test generates a CSV file at `output/epex_market_results_<YYYY-MM-DD>.csv`, where the date is yesterday in ISO format. The file contains a header row (`Low,High,Last,Weight Avg`) followed by one row per table data row.

**If the site returns 403 (e.g. bot detection):** run with a visible browser:

```bash
npx playwright test tests/epex-spot-market-results.spec.ts --headed
```

---

## Project Structure

```
Playwright-QA-Epex-Market-Scraper/
├── tests/
│   └── epex-spot-market-results.spec.ts   # Main test + helpers (URL, CSV, table scraping)
├── output/                                 # Generated CSV files (gitignored)
├── playwright.config.ts                    # Playwright config (timeouts, user agent, etc.)
├── tsconfig.json                           # TypeScript config
├── package.json                            # Scripts and dependencies
├── .gitignore
└── README.md
```

---

## Design & Implementation Notes

- **Reusability:** Helpers are split into clear functions: `getYesterdayIsoDate`, `buildMarketResultsUrl`, `csvEscape`, `writeCsvFile`, `findResultsTable`, `getColumnIndices`, `scrapeFourColumns`. They can be reused or extended for other markets/dates.
- **Robustness:**  
  - Waits for `networkidle` and for table headers before scraping.  
  - Column indices are derived from header text (regex for “Low”, “High”, “Last”, “Weight Avg” / “Weighted Avg”), so column order changes on the site do not break the test.  
  - Rows with too few cells are skipped.  
  - Explicit checks for 403 and empty tables with clear error messages.
- **Error handling:** 403 detection with a hint to run `--headed`; missing columns or empty table throw descriptive errors.
- **Code quality:** JSDoc-style comments on functions; consistent naming and structure; CSV output follows standard escaping (quoted fields, doubled quotes).
- **Market configuration:** The script uses **GB** market area, **Continuous** modality, **30-minute** product, and **yesterday’s** delivery date so the requested columns (Low, High, Last, Weight Avg) are present and the URL remains valid.

---

## Task Reference

This implementation corresponds to the **QA Automation Practical Task (PD Dec 2025)** — EPEX SPOT Market Results scraping and CSV export.
