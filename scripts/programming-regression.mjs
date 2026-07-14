import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.env.SPIKE_BASE_URL || 'http://127.0.0.1:8766';
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath: chromePath });

async function pageWithTestHook(viewport = { width: 1024, height: 768 }) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => { window.__LSFA_TEST__ = true; });
  const page = await context.newPage();
  return { context, page };
}

async function assertClawClassificationHitTargets(page) {
  const results = await page.evaluate(() => {
    const panel = document.querySelector('.claw-inspection-panel');
    const panelRect = panel.getBoundingClientRect();
    return [...panel.querySelectorAll('.claw-classify-btn')].map((button) => {
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(x, y);
      return {
        label: button.textContent.trim(),
        inside: rect.left >= panelRect.left && rect.right <= panelRect.right
          && rect.top >= panelRect.top && rect.bottom <= panelRect.bottom,
        hitSelf: hit === button || button.contains(hit),
        visible: rect.width >= 42 && rect.height >= 42,
      };
    });
  });
  assert.equal(results.length, 5);
  results.forEach((result) => assert.deepEqual(result, {
    label: result.label,
    inside: true,
    hitSelf: true,
    visible: true,
  }));
}

try {
  {
    const { context, page } = await pageWithTestHook();
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.mission-card', { state: 'attached' });
    const initial = await page.evaluate(() => [...document.querySelectorAll('.mission-card')].map((card) => ({
      active: card.querySelectorAll('.mission-level-link[href]').length,
      locked: card.querySelectorAll('.mission-level-link.is-locked').length,
    })));
    assert.equal(initial.length, 5);
    initial.forEach((card) => assert.deepEqual(card, { active: 1, locked: 9 }));

    await page.evaluate(async () => {
      const { store } = await import('./js/store.js');
      ['claw', 'macro', 'race', 'sort', 'bridge'].forEach((id) => store.setStars(id, 1, 1));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const afterL1 = await page.evaluate(() => [...document.querySelectorAll('.mission-card')].map((card) => ({
      active: card.querySelectorAll('.mission-level-link[href]').length,
      locked: card.querySelectorAll('.mission-level-link.is-locked').length,
    })));
    afterL1.forEach((card) => assert.deepEqual(card, { active: 2, locked: 8 }));
    await context.close();
  }

  {
    const { context, page } = await pageWithTestHook();
    await page.goto(`${base}/game.html?g=claw&l=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#claw-formal-btn');
    await assertClawClassificationHitTargets(page);
    assert.equal(await page.locator('#claw-rehearse-btn').count(), 0);
    const trolleyAtStart = await page.locator('#claw-trolley').evaluate((el) => el.style.transform);
    await page.locator('#claw-turns-up').click();
    await page.waitForTimeout(380);
    assert.equal(await page.locator('#claw-trolley').evaluate((el) => el.style.transform), trolleyAtStart);
    assert.equal(await page.locator('#claw-force-val').textContent(), '锁');
    assert.equal(await page.locator('#claw-formal-btn').isDisabled(), true);
    const prize = await page.evaluate(() => window.__lsfaClaw.lvl.prize);
    await page.locator(`[data-classify="weight"][data-value="${prize.weight}"]`).click();
    await page.locator(`[data-classify="firmness"][data-value="${prize.firmness}"]`).click();
    assert.equal(await page.locator('#claw-force-val').textContent(), '—');
    await page.locator('#claw-force-plus').click();
    assert.equal(await page.locator('#claw-force-val').textContent(), '5');
    assert.equal(await page.locator('#claw-formal-btn').isEnabled(), true);
    await page.locator('#claw-formal-btn').click();
    assert.equal(await page.locator('#claw-attempts-label').textContent(), '已尝试 1 次');
    await page.waitForFunction((start) => document.querySelector('#claw-trolley')?.style.transform !== start, trolleyAtStart);
    await context.close();
  }

  {
    const { context, page } = await pageWithTestHook({ width: 768, height: 1024 });
    await page.goto(`${base}/game.html?g=claw&l=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#claw-formal-btn');
    await assertClawClassificationHitTargets(page);
    await context.close();
  }

  {
    const { context, page } = await pageWithTestHook();
    await page.goto(`${base}/game.html?g=claw&l=10&seed=retry-proof&v=4`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__lsfaClaw?.lvl && window.__lsfaShell?.complete);
    const before = await page.evaluate(() => structuredClone(window.__lsfaClaw.lvl));
    await page.evaluate(() => window.__lsfaShell.complete(1));
    await page.waitForSelector('#btn-retry');
    await page.locator('#btn-retry').click();
    await page.waitForFunction((expected) => {
      const current = window.__lsfaClaw?.lvl;
      return current && JSON.stringify(current) === expected;
    }, JSON.stringify(before));
    assert.deepEqual(await page.evaluate(() => structuredClone(window.__lsfaClaw.lvl)), before);
    await context.close();
  }

  {
    const { context, page } = await pageWithTestHook();
    await page.goto(`${base}/game.html?g=sort&l=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__lsfaSort?.plan);
    await page.evaluate(() => {
      const { plan, bodySeqs } = window.__lsfaSort;
      bodySeqs.forEach((seq, index) => seq.setSequence(plan.segments[index].body.map((type) => ({ type, label: type, color: type }))));
    });
    const segments = await page.evaluate(() => window.__lsfaSort.plan.segments.map((segment) => segment.reps));
    for (let index = 0; index < segments.length; index += 1) {
      while (Number(await page.locator(`[data-dial-value="${index}"]`).textContent()) < segments[index]) {
        await page.locator(`[data-dial-up="${index}"]`).click();
      }
    }
    assert.equal(await page.locator('#sort-run-btn').isEnabled(), true);
    assert.equal(await page.locator('#sort-formula-text').evaluate((el) => el.classList.contains('sort-formula--ok')), true);
    await page.locator('#sort-recount-btn').click();
    await page.waitForTimeout(40);
    assert.equal(await page.locator('#sort-run-btn').isDisabled(), true);
    assert.equal(await page.locator('#sort-recount-btn').textContent(), '停止扫描');
    await page.locator('#sort-recount-btn').click();
    assert.equal(await page.locator('#sort-run-btn').isEnabled(), true);
    assert.equal(await page.locator('[data-dial-value="0"]').textContent().then(Number) >= 2, true);
    await context.close();
  }

  {
    const { context, page } = await pageWithTestHook();
    await page.goto(`${base}/game.html?g=race&l=10&seed=qa-seed&v=10`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__lsfaRace?.level?.optimalPath);
    const pitDrop = await page.evaluate(() => {
      const hook = window.__lsfaRace;
      const type = 'jump3';
      const before = hook.level.supply[type];
      const accepted = hook.placeAt(hook.level.pits[0], type);
      return { accepted, before, after: hook.level.supply[type] };
    });
    assert.equal(pitDrop.accepted, false);
    assert.equal(pitDrop.after, pitDrop.before);
    const usesBack = await page.evaluate(() => {
      const hook = window.__lsfaRace;
      hook.level.optimalPath.forEach(({ index, action }) => hook.placeAt(index, action));
      return hook.level.optimalPath.some(({ action }) => action === 'back1');
    });
    assert.equal(usesBack, true);
    await page.evaluate(() => window.__lsfaRace.run());
    await page.waitForSelector('.modal-overlay');
    assert.match(await page.locator('#modal-msg').textContent(), /本次获得 3 星/);
    await context.close();
  }

  {
    const { context, page } = await pageWithTestHook({ width: 667, height: 1024 });
    for (const game of ['claw', 'macro', 'race', 'sort']) {
      await page.goto(`${base}/game.html?g=${game}&l=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.game-action-dock');
      assert.equal(await page.locator('.game-action-dock').first().evaluate((el) => getComputedStyle(el).position), 'static');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    }
    await context.close();
  }

  console.log('PASS programming adversarial regressions');
} finally {
  await browser.close();
}
