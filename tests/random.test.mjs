import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRandomContext, createSeededRandom, hashSeed, nextVariant, normalizeVariant,
} from '../js/random.js';
import { buildClawLevel } from '../games/claw.js';
import { generateLevel } from '../games/race.js';
import { getBridgeMission } from '../games/bridge-engine.js';

test('same seed recreates the same sequence while forks stay independent', () => {
  const a = createSeededRandom('session|game|level:2|variant:4');
  const b = createSeededRandom('session|game|level:2|variant:4');
  assert.deepEqual(Array.from({ length: 20 }, () => a.int(1, 99)), Array.from({ length: 20 }, () => b.int(1, 99)));
  assert.notEqual(hashSeed('variant:4'), hashSeed('variant:5'));
});

test('layout and UI streams are isolated and layout can be rebuilt for retry', () => {
  const context = createRandomContext(
    new URLSearchParams('seed=retry-proof&v=4'),
    'game:claw:mission:10',
  );
  const first = context.createStream('layout');
  const expected = Array.from({ length: 16 }, () => first.int(1, 99));

  for (let i = 0; i < 40; i += 1) context.uiRand.next();
  const retry = context.createStream('layout');
  assert.deepEqual(Array.from({ length: 16 }, () => retry.int(1, 99)), expected);
  assert.notEqual(context.createStream('layout').seed, context.createStream('ui').seed);
});

test('variant normalization is bounded and wraps after ten', () => {
  assert.equal(normalizeVariant('10'), 10);
  assert.equal(normalizeVariant('11'), 1);
  assert.equal(nextVariant(10), 1);
  assert.equal(nextVariant(4), 5);
});

test('procedural missions are reproducible from seed and differ across variants', () => {
  const builders = [
    (rand) => buildClawLevel(10, rand),
    (rand) => generateLevel(10, rand),
    (rand) => getBridgeMission(10, { variant: 10, rand }),
  ];
  builders.forEach((build) => {
    const first = build(createSeededRandom('qa|variant:10'));
    const replay = build(createSeededRandom('qa|variant:10'));
    assert.deepEqual(replay, first);
  });
  assert.notDeepEqual(
    buildClawLevel(10, createSeededRandom('qa|variant:1')),
    buildClawLevel(10, createSeededRandom('qa|variant:2')),
  );
});
