import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allBridgeMissions, evaluateBridgePlan, getBridgeMission, planMetrics,
  scoreBridgePlan, solveBridgeMission,
} from '../games/bridge-engine.js';

test('all engineering missions have a feasible plan within resource limits', () => {
  allBridgeMissions().forEach((mission) => {
    const plan = solveBridgeMission(mission);
    const result = evaluateBridgePlan(mission, plan);
    assert.equal(result.ok, true, `mission ${mission.level} should be feasible`);
    assert.ok(result.energy <= mission.battery);
    assert.ok(result.changes <= mission.maxChanges);
    assert.equal(result.position, mission.length);
    assert.equal(scoreBridgePlan(mission, result), 3);
  });
});

test('mission one requires an exact checkpoint stop and a wheel strategy', () => {
  const mission = getBridgeMission(1);
  const short = evaluateBridgePlan(mission, [
    { wheel: 'precision', revs: 2 },
    { wheel: 'power', revs: 2 },
  ]);
  assert.equal(short.ok, false);
  assert.equal(short.reason, 'undershoot-checkpoint');

  const valid = evaluateBridgePlan(mission, [
    { wheel: 'precision', revs: 3 },
    { wheel: 'power', revs: 2 },
  ]);
  assert.equal(valid.ok, true);
  assert.deepEqual(planMetrics(valid.trace), { energy: 5, changes: 1 });
});

test('overshooting a checkpoint fails immediately instead of leaking an answer', () => {
  const mission = getBridgeMission(2);
  const result = evaluateBridgePlan(mission, [
    { wheel: 'turbo', revs: 2 },
    { wheel: 'precision', revs: 5 },
    { wheel: 'power', revs: 3 },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'overshoot-checkpoint');
  assert.equal(result.failedLeg, 0);
});

test('a mathematically exact route can still fail the battery constraint', () => {
  const mission = getBridgeMission(2);
  const result = evaluateBridgePlan(mission, [
    { wheel: 'precision', revs: 4 },
    { wheel: 'precision', revs: 5 },
    { wheel: 'precision', revs: 6 },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'battery');
});
