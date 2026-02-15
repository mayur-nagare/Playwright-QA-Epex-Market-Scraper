# Playwright-QA-Epex-Market-Scraper

Playwright test that scrapes EPEX SPOT Market Results (Low, High, Last, Weight Avg) for GB continuous intraday and exports to CSV.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
npx playwright install
```

## Run the test

```bash
npm run test:epex
# or
npx playwright test tests/epex-spot-market-results.spec.ts
```

CSV output is written to `output/epex_market_results_<date>.csv` (date = yesterday in ISO format).

If the site returns 403, run with a visible browser:

```bash
npx playwright test tests/epex-spot-market-results.spec.ts --headed
```

## Project structure

- `tests/epex-spot-market-results.spec.ts` – Playwright test (visit EPEX SPOT, scrape table, write CSV)
- `playwright.config.ts` – Playwright config
- `tsconfig.json` – TypeScript config
- `output/` – Generated CSV files (gitignored)
