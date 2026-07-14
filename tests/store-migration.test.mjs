import test from 'node:test';
import assert from 'node:assert/strict';

const saved = new Map();
globalThis.sessionStorage = {
  getItem(key) { return saved.has(key) ? saved.get(key) : null; },
  setItem(key, value) { saved.set(key, String(value)); },
  removeItem(key) { saved.delete(key); },
  clear() { saved.clear(); },
};
globalThis.localStorage = {
  getItem() { throw new Error('durable storage must not be read'); },
  setItem() { throw new Error('durable storage must not be written'); },
};

const { store, GAME_IDS } = await import('../js/store.js');
const { badgeRewardLine } = await import('../js/game-config.js');

test('all six programming games expose ten missions and 180 possible session stars', () => {
  assert.equal(store.maxStars(), 180);
  assert.equal(GAME_IDS.length, 6);
  GAME_IDS.forEach((id) => assert.equal(Object.keys(store.getAllStars()[id]).length, 10));
});

test('campaign progress writes only the tab-scoped session record', () => {
  const result = store.setStars('hunt', 10, 3);
  assert.equal(result.best, 3);
  assert.equal(store.getStars('hunt', 10), 3);
  assert.ok(saved.has('lsfa_session_v1'));
});

test('badge is collected once per session only after all ten missions', () => {
  for (let level = 1; level <= 9; level += 1) store.setStars('claw', level, 1);
  assert.equal(store.getBadgeTier('claw'), null);
  store.setStars('claw', 10, 1);
  assert.equal(store.getBadgeTier('claw'), 'bronze');
  for (let level = 1; level <= 10; level += 1) store.setStars('claw', level, 3);
  assert.equal(store.getBadgeTier('claw'), 'gold');
});

test('three-question quiz best is clamped to the session round size', () => {
  assert.deepEqual(store.setQuizBest(9), { best: 3, isNewBest: true });
  assert.equal(store.getQuizBest(), 3);
});

test('gold badge copy names all ten missions', () => {
  assert.equal(badgeRewardLine('hunt', 'gold'), '解锁金徽章！十个任务全部拿满星啦！');
  assert.equal(badgeRewardLine('race', 'gold'), '解锁金徽章！十个任务全部拿满星啦！');
});
