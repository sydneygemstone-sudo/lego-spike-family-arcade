import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.env.SPIKE_BASE_URL || 'http://127.0.0.1:8766';
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const gameRoutes = [
  ...Array.from({ length: 10 }, (_, index) => `game.html?g=hunt&l=${index + 1}`),
  ...['claw', 'macro', 'race', 'sort', 'bridge'].flatMap((game) =>
    [1, 2, 3].map((level) => `game.html?g=${game}&l=${level}`)),
];
const familyRoutes = ['humanrobot', 'livinghunt', 'rhythm', 'macrospell', 'ifthen', 'humanbelt']
  .map((game) => `family.html?f=${game}`);
const routes = ['index.html', 'flashcards.html', 'parents.html', ...gameRoutes, ...familyRoutes];
const viewports = [
  { name: 'ipad-landscape', width: 1024, height: 768 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
  { name: 'ipad-air-landscape', width: 1180, height: 820 },
  { name: 'ipad-split', width: 667, height: 1024 },
];

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const failures = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const route of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    try {
      const response = await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(160);
      assert.equal(response?.status(), 200);
      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        bodyText: document.body.innerText,
      }));
      assert.ok(layout.scrollWidth <= layout.innerWidth + 1, `horizontal overflow ${layout.scrollWidth}/${layout.innerWidth}`);
      assert.ok(layout.bodyText.trim().length > 10, 'empty page');
      assert.deepEqual(errors, [], errors.join(' | '));
    } catch (error) {
      failures.push(`${viewport.name} ${route}: ${error.message}`);
    } finally {
      await page.close();
    }
  }
  await context.close();
}

await browser.close();

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS ${routes.length} routes × ${viewports.length} iPad viewports`);
}
