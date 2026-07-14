import test from 'node:test';
import assert from 'node:assert/strict';

import { buildClawLevel, judgePrizeClassification } from '../games/claw.js';
import { buildMacroLevelPlan } from '../games/macro.js';
import { buildSortLevelPlan } from '../games/sort.js';
import {
  evaluateBridgePlan,
  getBridgeMission,
  scoreBridgePlan,
  solveBridgeMission,
} from '../games/bridge-engine.js';
import { judgeLoopProgram, judgeMacroProgram } from '../js/program-ast.js';
import { createRandomContext } from '../js/random.js';

function gameContext(gameId, level, variant) {
  return createRandomContext(
    new URLSearchParams(`seed=property-grid&v=${variant}`),
    `game:${gameId}:mission:${level}`,
  );
}

function assertRetryStable(gameId, build, check) {
  for (let level = 1; level <= 10; level += 1) {
    for (let variant = 1; variant <= 10; variant += 1) {
      const context = gameContext(gameId, level, variant);
      const first = build({ context, level, variant, rand: context.createStream('layout') });

      // Shell copy and feedback are allowed to consume UI randomness without
      // changing the mission reconstructed by the in-page retry path.
      for (let i = 0; i < 12; i += 1) context.uiRand.next();
      const retry = build({ context, level, variant, rand: context.createStream('layout') });

      assert.deepEqual(retry, first, `${gameId} L${level} V${variant} retry drifted`);
      check(first, { level, variant });
    }
  }
}

function groupTypes(plan, segment, groupIndex) {
  return plan.target
    .filter((item) => item.segment === segment && item.groupIndex === groupIndex)
    .map((item) => item.type);
}

function assertMacroHasValidCompressedSolution(plan) {
  const target = plan.target.map((item) => item.type);
  let definitions;
  let program;

  if (plan.tier < 3) {
    const unit = groupTypes(plan, 'repeat', 0);
    const repeatGroups = new Set(
      plan.target.filter((item) => item.segment === 'repeat').map((item) => item.groupIndex),
    );
    const prefix = plan.target.filter((item) => item.segment === 'prefix').map((item) => item.type);
    const suffix = plan.target.filter((item) => item.segment === 'suffix').map((item) => item.type);
    definitions = [unit];
    program = [...prefix, ...Array.from(repeatGroups, () => 'myblock0'), ...suffix];
  } else {
    const motifA = groupTypes(plan, 'AABB', 0);
    const motifB = groupTypes(plan, 'AABB', 2);
    assert.deepEqual(groupTypes(plan, 'AABB', 1), motifA);
    assert.deepEqual(groupTypes(plan, 'AABB', 3), motifB);
    assert.deepEqual(groupTypes(plan, 'CDC', 0), motifA);
    assert.deepEqual(groupTypes(plan, 'CDC', 1), motifB);
    assert.deepEqual(groupTypes(plan, 'CDC', 2), motifA);
    definitions = [motifA, motifB];
    program = ['myblock0', 'myblock0', 'myblock1', 'myblock1', 'myblock0', 'myblock1', 'myblock0'];
  }

  const result = judgeMacroProgram({
    program,
    definitions,
    target,
    topLevelBudget: plan.topLevelBudget,
    requiredMacroCount: plan.requiredMacroInvocations,
  });
  assert.equal(result.ok, true);
  assert.equal(result.withinBudget, true);
  assert.equal(result.meetsMacroChallenge, true);
  assert.equal(program.length, plan.optimalCount);
}

test('claw: all 10×10 contexts are reachable, classifiable, and retry-stable', () => {
  assertRetryStable(
    'claw',
    ({ level, rand }) => buildClawLevel(level, rand),
    (mission) => {
      assert.equal(mission.startGrid + mission.targetTurns * mission.unitsPerTurn, mission.targetGrid);
      assert.ok(Number.isInteger(mission.targetTurns));
      assert.ok(mission.targetTurns >= mission.dialMin && mission.targetTurns <= mission.dialMax);
      assert.notEqual(mission.targetGrid, mission.startGrid);
      assert.ok(mission.prize.forceMin >= 1 && mission.prize.forceMin <= mission.prize.forceMax);
      assert.ok(mission.prize.forceMax <= 10);
      assert.equal(
        judgePrizeClassification(mission.prize, mission.prize.weight, mission.prize.firmness).correct,
        true,
      );
    },
  );
});

test('macro: all 10×10 contexts have a valid compressed solution and stable retry', () => {
  assertRetryStable(
    'macro',
    ({ level, rand }) => buildMacroLevelPlan(level, rand),
    (plan) => {
      assert.ok(plan.target.length > plan.optimalCount);
      assert.ok(plan.requiredMacroInvocations >= 3);
      assertMacroHasValidCompressedSolution(plan);
    },
  );
});

test('sort: all 10×10 contexts expand exactly and remain retry-stable', () => {
  assertRetryStable(
    'sort',
    ({ level, rand }) => buildSortLevelPlan(level, rand),
    (plan) => {
      const result = judgeLoopProgram({
        prefix: plan.prefix,
        segments: plan.segments.map((segment) => ({ body: segment.body, repeat: segment.reps })),
        target: plan.colors,
        minSegments: plan.segments.length,
      });
      assert.equal(result.ok, true);
      assert.equal(result.expanded.length, plan.N);
      assert.equal(new Set(plan.segments.map((segment) => segment.body.join('|'))).size, plan.segments.length);
    },
  );
});

test('bridge: all 10×10 contexts are solver-valid, three-star, and retry-stable', () => {
  assertRetryStable(
    'bridge',
    ({ level, variant, rand }) => getBridgeMission(level, { variant, rand }),
    (mission) => {
      const solution = solveBridgeMission(mission);
      const result = evaluateBridgePlan(mission, solution);
      assert.equal(result.ok, true);
      assert.equal(result.position, mission.length);
      assert.ok(result.energy <= mission.battery);
      assert.ok(result.changes <= mission.maxChanges);
      assert.equal(scoreBridgePlan(mission, result), 3);
    },
  );
});
