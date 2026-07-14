import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.env.SPIKE_BASE_URL || 'http://127.0.0.1:8766';
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const routes = [
  'index.html', 'flashcards.html', 'parents.html',
  ...['hunt', 'claw', 'macro', 'race', 'sort', 'bridge'].flatMap((id) => Array.from({ length: 10 }, (_, i) => `game.html?g=${id}&l=${i + 1}&seed=qa-seed&v=10`)),
  ...['humanrobot', 'livinghunt', 'rhythm', 'macrospell', 'ifthen', 'humanbelt'].flatMap((id) => Array.from({ length: 10 }, (_, i) => `family.html?f=${id}&r=${i + 1}&seed=qa-seed&v=10`)),
];
const viewports = [
  { name: 'ipad-landscape', width: 1024, height: 768 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
];

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const findings = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const route of routes) {
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
    const response = await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(180);
    const audit = await page.evaluate(() => {
      const visible = (el) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
      };
      const duplicateIds = Object.entries([...document.querySelectorAll('[id]')]
        .reduce((map, el) => ((map[el.id] = (map[el.id] || 0) + 1), map), {}))
        .filter(([, count]) => count > 1)
        .map(([id, count]) => `${id}×${count}`);
      const unnamedControls = [...document.querySelectorAll('button,a[href],input,select')]
        .filter(visible)
        .filter((el) => !((el.getAttribute('aria-label') || el.textContent || el.value || '').trim()))
        .map((el) => el.id || el.className || el.tagName);
      const tinyTargets = [...document.querySelectorAll('button,a[href],input,select')]
        .filter(visible)
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width < 42 || box.height < 42)
        .map(({ el, box }) => `${el.id || el.className || el.tagName}:${Math.round(box.width)}×${Math.round(box.height)}`);
      const invalidSvgs = [...document.querySelectorAll('svg')]
        .filter(visible)
        .filter((svg) => !svg.getAttribute('viewBox') || svg.getBoundingClientRect().width < 1 || svg.getBoundingClientRect().height < 1)
        .map((svg) => svg.id || svg.getAttribute('class') || 'svg');
      const clippedText = [...document.querySelectorAll('p,h1,h2,h3,h4,span,strong,button')]
        .filter(visible)
        .filter((el) => {
          const style = getComputedStyle(el);
          if (!['hidden', 'clip'].includes(style.overflow) && !['hidden', 'clip'].includes(style.overflowX) && !['hidden', 'clip'].includes(style.overflowY)) return false;
          if (style.textOverflow === 'ellipsis') return false;
          return el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2;
        })
        .map((el) => el.id || el.className || `${el.tagName}:${(el.textContent || '').trim().slice(0, 24)}`);
      return {
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        duplicateIds, unnamedControls, tinyTargets, invalidSvgs, clippedText,
      };
    });
    if (response?.status() !== 200 || runtimeErrors.length || audit.horizontalOverflow || audit.duplicateIds.length || audit.unnamedControls.length || audit.invalidSvgs.length || audit.clippedText.length) {
      findings.push({ viewport: viewport.name, route, status: response?.status(), runtimeErrors, ...audit });
    }
    if (audit.tinyTargets.length) findings.push({ viewport: viewport.name, route, severity: 'tap-target', tinyTargets: audit.tinyTargets });
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log(JSON.stringify({ checked: routes.length * viewports.length, findings }, null, 2));
if (findings.some((finding) => finding.severity !== 'tap-target')) process.exitCode = 1;
