import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceMacroPose, gripBand, judgeLoopProgram, judgeMacroProgram, judgeRaceMove,
  scoreMacroProgram, solveRaceRoute, tryPlaceRaceBlock, validateLoopStructure,
} from '../js/program-ast.js';
import { generateLevel } from '../games/race.js';
import { judgePrizeClassification } from '../games/claw.js';

test('a correct literal macro route completes but compression decides the reward', () => {
  const target = ['fwd', 'left', 'fwd', 'left'];
  assert.equal(judgeMacroProgram({ program: target, definitions: [], target, topLevelBudget: 3 }).ok, true);
  assert.equal(scoreMacroProgram({ attempts: 1, topLevelCount: 4, targetLength: 4, optimalCount: 2, distinctMacros: 0 }).stars, 1);
});

test('macro passes only when expanded program matches under budget', () => {
  const result = judgeMacroProgram({ program: ['myblock0', 'myblock0'], definitions: [['fwd', 'left']], target: ['fwd', 'left', 'fwd', 'left'], topLevelBudget: 2, requiredMacroCount: 2 });
  assert.equal(result.ok, true);
  assert.equal(scoreMacroProgram({ attempts: 1, topLevelCount: 2, targetLength: 4, optimalCount: 2, distinctMacros: 1 }).stars, 3);
  assert.equal(scoreMacroProgram({ attempts: 2, topLevelCount: 3, targetLength: 4, optimalCount: 2, distinctMacros: 1 }).stars, 2);
});

test('macro turn animation rotates in place and forward is the only translation', () => {
  assert.deepEqual(advanceMacroPose({ index: 3, turnDeg: 0 }, 'left'), { index: 3, turnDeg: -90 });
  assert.deepEqual(advanceMacroPose({ index: 3, turnDeg: 0 }, 'right'), { index: 3, turnDeg: 90 });
  assert.deepEqual(advanceMacroPose({ index: 3, turnDeg: 90 }, 'fwd'), { index: 4, turnDeg: 90 });
});

test('loop judge requires multiple meaningful segments and pinpoints mismatch', () => {
  assert.equal(judgeLoopProgram({ segments: [{ body: ['red', 'blue'], repeat: 4 }], target: [], minSegments: 2 }).reason, 'segments-required');
  const result = judgeLoopProgram({ segments: [{ body: ['red', 'blue'], repeat: 2 }, { body: ['yellow', 'red'], repeat: 2 }], target: ['red', 'blue', 'red', 'blue', 'yellow', 'red', 'yellow', 'red'] });
  assert.equal(result.ok, true);
});

test('repeat count one never becomes runnable/green even when coverage matches', () => {
  const weak = validateLoopStructure({
    segments: [{ body: ['red', 'blue'], repeat: 1 }, { body: ['red', 'blue'], repeat: 1 }],
    targetLength: 4,
    minSegments: 2,
  });
  assert.equal(weak.reason, 'weak-loop');
});

test('claw inference changes by object properties without exposing answer', () => {
  assert.deepEqual(gripBand({ weight: 'light', softness: 'hard', fragile: true }), { min: 2, max: 3 });
  assert.deepEqual(gripBand({ weight: 'medium', firmness: 'hard', fragile: true }), { min: 4, max: 5 });
  assert.deepEqual(gripBand({ weight: 'medium', firmness: 'soft' }), { min: 5, max: 7 });
  assert.deepEqual(gripBand({ weight: 'heavy', firmness: 'hard' }), { min: 7, max: 10 });
});

test('claw material classification must identify both weight and firmness', () => {
  const prize = { weight: 'medium', firmness: 'soft' };
  assert.deepEqual(judgePrizeClassification(prize, 'medium', null), {
    complete: false, weightCorrect: true, firmnessCorrect: false, correct: false,
  });
  assert.equal(judgePrizeClassification(prize, 'light', 'soft').correct, false);
  assert.equal(judgePrizeClassification(prize, 'medium', 'soft').correct, true);
});

test('jump crosses a pit but rolling does not', () => {
  assert.equal(judgeRaceMove({ action: 'fwd3', from: 0, length: 12, pits: [1] }).reason, 'pit-crossing');
  assert.deepEqual(judgeRaceMove({ action: 'jump3', from: 0, length: 12, pits: [1] }), { ok: true, to: 3, mode: 'jump' });
});

test('all ten race missions derive their optimum from the real solver and late missions require back1', () => {
  for (let levelNumber = 1; levelNumber <= 10; levelNumber += 1) {
    const mission = generateLevel(levelNumber);
    const solved = solveRaceRoute(mission);
    assert.ok(solved);
    assert.equal(mission.optimalHops, solved.hops);
  }
  for (const levelNumber of [7, 8, 9, 10]) {
    const mission = generateLevel(levelNumber);
    assert.ok(mission.optimalPath.some((step) => step.action === 'back1'));
    assert.equal(solveRaceRoute({ ...mission, types: mission.types.filter((type) => type !== 'back1'), requiredAction: null }), null);
  }
});

test('dropping on a pit is rejected without consuming inventory', () => {
  const cellBlocks = new Array(8).fill(null);
  const supply = { jump3: 2 };
  const rejected = tryPlaceRaceBlock({ cellBlocks, supply, index: 4, type: 'jump3', target: 7, pits: [4, 5] });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, 'blocked-cell');
  assert.deepEqual(rejected.cellBlocks, cellBlocks);
  assert.deepEqual(rejected.supply, supply);
});
