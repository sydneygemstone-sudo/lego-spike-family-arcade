import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.env.SPIKE_BASE_URL || 'http://127.0.0.1:8766';
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath: chromePath });

const games = [
  { id: 'hunt', layout: '.hunt-page', children: ['.hunt-stage-card', '.hunt-console'] },
  { id: 'claw', layout: '.claw-layout', children: ['.claw-stage-card', '.claw-controls'] },
  { id: 'macro', layout: '.macro-page', children: ['.macro-left', '.macro-right'] },
  { id: 'race', layout: '.race-layout', children: ['.race-stage-card', '.race-controls'] },
  { id: 'sort', layout: '.sort-page', children: ['.sort-belt-card', '.sort-program-card'] },
  { id: 'bridge', layout: '.bridge-page', children: ['.bridge-stage-card', '.bridge-console-card'] },
];

const viewports = [
  { name: 'ipad-mini-portrait', width: 768, height: 1024 },
  { name: 'ipad-mini-landscape', width: 1024, height: 768 },
  { name: 'ipad-10-portrait', width: 820, height: 1180 },
  { name: 'ipad-10-landscape', width: 1180, height: 820 },
  { name: 'ipad-air-portrait', width: 834, height: 1194 },
  { name: 'ipad-air-landscape', width: 1194, height: 834 },
  { name: 'ipad-pro-portrait', width: 1024, height: 1366 },
  { name: 'ipad-pro-landscape', width: 1366, height: 1024 },
];

const failures = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const game of games) {
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });
    const response = await page.goto(`${base}/game.html?g=${game.id}&l=1&seed=ipad-qa&v=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(game.layout);

    if (game.id === 'claw') {
      await page.locator('.claw-force-section').scrollIntoViewIfNeeded();
    }

    const audit = await page.evaluate(({ layoutSelector, childSelectors, portrait }) => {
      const rect = (element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      };
      const layout = document.querySelector(layoutSelector);
      const layoutRect = rect(layout);
      const childRects = childSelectors.map((selector) => ({ selector, ...rect(document.querySelector(selector)) }));
      const overlaps = [];
      for (let left = 0; left < childRects.length; left += 1) {
        for (let right = left + 1; right < childRects.length; right += 1) {
          const a = childRects[left];
          const b = childRects[right];
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
            && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) {
            overlaps.push(`${a.selector}×${b.selector}`);
          }
        }
      }
      const outside = childRects
        .filter((child) => child.left < layoutRect.left - 1 || child.right > layoutRect.right + 1)
        .map((child) => child.selector);
      const dockPositions = [...document.querySelectorAll('.game-action-dock')]
        .map((dock) => getComputedStyle(dock).position);

      let claw = null;
      const forceSection = document.querySelector('.claw-force-section');
      if (forceSection) {
        const panel = document.querySelector('.claw-inspection-panel');
        const force = document.querySelector('.claw-force-console');
        const panelRect = rect(panel);
        const forceRect = rect(force);
        const buttons = [...panel.querySelectorAll('.claw-classify-btn')].map((button) => {
          const buttonRect = rect(button);
          const x = buttonRect.left + buttonRect.width / 2;
          const y = buttonRect.top + buttonRect.height / 2;
          const inViewport = x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight;
          const hit = inViewport ? document.elementFromPoint(x, y) : null;
          return {
            label: button.textContent.trim(),
            inside: buttonRect.left >= panelRect.left - 1 && buttonRect.right <= panelRect.right + 1
              && buttonRect.top >= panelRect.top - 1 && buttonRect.bottom <= panelRect.bottom + 1,
            hitSelf: !inViewport || hit === button || button.contains(hit),
          };
        });
        claw = {
          panelsOverlap: Math.min(panelRect.right, forceRect.right) - Math.max(panelRect.left, forceRect.left) > 1
            && Math.min(panelRect.bottom, forceRect.bottom) - Math.max(panelRect.top, forceRect.top) > 1,
          buttons,
        };
      }

      return {
        viewport: { width: innerWidth, height: innerHeight, portrait },
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        overlaps,
        outside,
        dockPositions,
        claw,
      };
    }, {
      layoutSelector: game.layout,
      childSelectors: game.children,
      portrait: viewport.height > viewport.width,
    });

    try {
      assert.equal(response?.status(), 200);
      assert.deepEqual(runtimeErrors, []);
      assert.equal(audit.horizontalOverflow, false);
      assert.deepEqual(audit.overlaps, []);
      assert.deepEqual(audit.outside, []);
      if (viewport.height > viewport.width) {
        assert.equal(audit.dockPositions.some((position) => ['fixed', 'sticky'].includes(position)), false);
      }
      if (audit.claw) {
        assert.equal(audit.claw.panelsOverlap, false);
        assert.equal(audit.claw.buttons.length, 5);
        audit.claw.buttons.forEach((button) => assert.deepEqual(button, {
          label: button.label,
          inside: true,
          hitSelf: true,
        }));
      }
    } catch (error) {
      failures.push({ viewport: viewport.name, game: game.id, audit, runtimeErrors, error: error.message });
    }
    await page.close();
  }
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 } });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: ({ files }) => files?.[0]?.type === 'application/pdf' });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async ({ files, title }) => { window.__printKitShare = { name: files?.[0]?.name, type: files?.[0]?.type, title }; },
    });
  });
  const page = await context.newPage();
  await page.goto(`${base}/print-kit.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#pdf-frame');
  const startUrl = page.url();
  await page.locator('#share-pdf').click();
  await page.waitForFunction(() => window.__printKitShare?.type === 'application/pdf');
  const printAudit = await page.evaluate(() => ({
    url: location.href,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    frameSrc: document.querySelector('#pdf-frame')?.src,
    downloadHref: document.querySelector('#download-pdf')?.href,
    backHref: document.querySelector('.print-kit-back')?.href,
    share: window.__printKitShare,
    status: document.querySelector('#print-kit-status')?.textContent,
  }));
  assert.equal(printAudit.url, startUrl);
  assert.equal(printAudit.overflow, false);
  assert.match(printAudit.frameSrc, /Lego_Spike_Prime_Flashcards_And_Games\.pdf/);
  assert.match(printAudit.downloadHref, /Lego_Spike_Prime_Flashcards_And_Games\.pdf/);
  assert.match(printAudit.backHref, /index\.html$/);
  assert.equal(printAudit.share.type, 'application/pdf');
  assert.match(printAudit.status, /系统分享面板/);
  await context.close();
}

await browser.close();

if (failures.length) {
  console.error(JSON.stringify({ checked: games.length * viewports.length, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS iPad layout matrix: ${games.length * viewports.length} game views + print/share shell`);
}
