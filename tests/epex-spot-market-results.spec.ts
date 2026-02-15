import { test, expect, Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const BASE_URL = 'https://www.epexspot.com/en/market-results';

// --- Helpers: URL + date ----------------------------------------------------

/**
 * Returns yesterday's date in ISO format yyyy-mm-dd (e.g. "2025-12-02").
 */
function getYesterdayIsoDate(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const d = String(yesterday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Builds the Market Results URL for the continuous intraday table.
 * For GB: uses sub_modality=Continuous and product=30 (30-min intervals).
 */
function buildMarketResultsUrl(deliveryDate: string): string {
  const params = new URLSearchParams({
    modality: 'Continuous',
    sub_modality: 'Continuous',
    data_mode: 'table',
    delivery_date: deliveryDate,
    market_area: 'GB',
    product: '30',
  });

  return `${BASE_URL}?${params.toString()}`;
}

// --- Helpers: CSV -----------------------------------------------------------

/**
 * Escapes a single CSV field.
 */
function csvEscape(value: string): string {
  if (value == null) return '';
  const needsQuotes = /[",\n\r]/.test(value);
  let escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Writes rows to a CSV file.
 */
async function writeCsvFile(filePath: string, rows: string[][]): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const lines = rows.map(row => row.map(csvEscape).join(','));
  const content = lines.join('\n') + '\n';
  await fs.writeFile(filePath, content, 'utf8');
}

// --- Helpers: table scraping ------------------------------------------------

/**
 * Locates the market results table that contains a 'Low' header.
 * Waits for loading to finish and for the table to appear (handles slow/reCAPTCHA flow).
 */
async function findResultsTable(page: Page) {
  // Wait for main content: either "Loading..." gone or a results table visible
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForSelector('table thead th', { timeout: 45_000 }).catch(() => {});
  const table = page.locator('table:has(th:has-text("Low"))').first();
  await expect(table, 'Expected a results table with a Low column').toBeVisible({
    timeout: 30_000,
  });
  return table;
}

/**
 * Returns indices of Low / High / Last / Weight Avg columns.
 */
async function getColumnIndices(table: ReturnType<Page['locator']>) {
  const headerCells = table.locator('thead tr th');
  const headerTexts = (await headerCells.allInnerTexts()).map(h => h.trim());

  const findIndex = (re: RegExp, label: string) => {
    const idx = headerTexts.findIndex(text => re.test(text));
    if (idx === -1) {
      throw new Error(`Could not find "${label}" column in headers: [${headerTexts.join(' | ')}]`);
    }
    return idx;
  };

  const lowIdx = findIndex(/low/i, 'Low');
  const highIdx = findIndex(/high/i, 'High');
  const lastIdx = findIndex(/last/i, 'Last');
  const weightAvgIdx = findIndex(/weight\s*(ed)?\s*avg/i, 'Weight Avg');

  return { lowIdx, highIdx, lastIdx, weightAvgIdx };
}

/**
 * Scrapes [Low, High, Last, Weight Avg] for each data row.
 */
async function scrapeFourColumns(
  table: ReturnType<Page['locator']>,
  indices: { lowIdx: number; highIdx: number; lastIdx: number; weightAvgIdx: number },
): Promise<string[][]> {
  const bodyRows = table.locator('tbody tr');
  const rowCount = await bodyRows.count();

  if (rowCount === 0) {
    throw new Error('Results table has no data rows (tbody tr).');
  }

  const result: string[][] = [];

  for (let i = 0; i < rowCount; i++) {
    const row = bodyRows.nth(i);
    const cells = row.locator('td');
    const cellCount = await cells.count();

    const minIndex = Math.max(
      indices.lowIdx,
      indices.highIdx,
      indices.lastIdx,
      indices.weightAvgIdx,
    );
    if (cellCount <= minIndex) {
      continue;
    }

    const low = (await cells.nth(indices.lowIdx).innerText()).trim();
    const high = (await cells.nth(indices.highIdx).innerText()).trim();
    const last = (await cells.nth(indices.lastIdx).innerText()).trim();
    const weightAvg = (await cells.nth(indices.weightAvgIdx).innerText()).trim();

    result.push([low, high, last, weightAvg]);
  }

  if (result.length === 0) {
    throw new Error('No valid data rows could be scraped from the table.');
  }

  return result;
}

// --- The Playwright test ----------------------------------------------------

test('scrape EPEX SPOT Low / High / Last / Weight Avg into CSV', async ({ page }) => {
  const deliveryDate = getYesterdayIsoDate();
  const url = buildMarketResultsUrl(deliveryDate);

  console.log(`Navigating to: ${url}`);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  // If the site returns 403, run with: npx playwright test --headed
  const title = await page.title();
  if (title.includes('403') || (await page.locator('body').textContent())?.includes('403 Forbidden')) {
    throw new Error('Page returned 403 Forbidden. Try running with: npx playwright test --headed');
  }

  const table = await findResultsTable(page);
  const indices = await getColumnIndices(table);
  const dataRows = await scrapeFourColumns(table, indices);

  const csvRows: string[][] = [
    ['Low', 'High', 'Last', 'Weight Avg'],
    ...dataRows,
  ];

  const outputPath = path.resolve('output', `epex_market_results_${deliveryDate}.csv`);
  await writeCsvFile(outputPath, csvRows);

  console.log(`Wrote ${dataRows.length} data rows to CSV: ${outputPath}`);
});
