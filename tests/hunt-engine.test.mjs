import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allHuntMissions, createHuntState, getHuntMission, simulateHuntProgram,
  solveHuntMission, stepHunt, switchesActive,
} from '../games/hunt-engine.js';

test('all ten handcrafted missions have a valid shortest solution', () => {
  const missions = allHuntMissions();
  assert.equal(missions.length, 10);
  missions.forEach((mission) => {
    const solution = solveHuntMission(mission);
    assert.ok(solution, `mission ${mission.number} should be solvable`);
    assert.equal(solution.length, mission.optimalSteps);
    const result = simulateHuntProgram(mission, solution);
    assert.equal(result.ok, true, `mission ${mission.number} solution should not fail`);
    assert.equal(result.done, true, `mission ${mission.number} solution should grab treasure`);
    assert.ok(solution.length <= mission.maxBlocks, `mission ${mission.number} should fit block budget`);
  });
});

test('all 100 level and variant combinations stay solver-valid', () => {
  for (let level = 1; level <= 10; level += 1) for (let variant = 1; variant <= 10; variant += 1) {
    const mission = getHuntMission(level, variant);
    const solution = solveHuntMission(mission);
    assert.ok(solution, `mission ${level} variant ${variant} should be solvable`);
    assert.equal(simulateHuntProgram(mission, solution).done, true);
  }
});

test('portal tutorial keeps heading and lands at the paired gate', () => {
  const mission = getHuntMission(4);
  let state = createHuntState(mission);
  state = stepHunt(mission, state, 'fwd').state;
  const result = stepHunt(mission, state, 'fwd');
  assert.equal(result.ok, true);
  assert.equal(result.event, 'portal');
  assert.deepEqual([result.state.col, result.state.row], [5, 2]);
  assert.equal(result.state.facing, 0);
});

test('jump crosses one pit while ordinary movement fails', () => {
  const mission = getHuntMission(5);
  const state = createHuntState(mission);
  assert.equal(stepHunt(mission, state, 'fwd').reason, 'pit');
  const jump = stepHunt(mission, state, 'jump');
  assert.equal(jump.ok, true);
  assert.deepEqual([jump.state.col, jump.state.row], [2, 2]);
});

test('push and pull move crates and activate pressure plates', () => {
  const pushMission = getHuntMission(6);
  let pushState = createHuntState(pushMission);
  pushState = stepHunt(pushMission, pushState, 'push').state;
  pushState = stepHunt(pushMission, pushState, 'push').state;
  assert.equal(switchesActive(pushMission, pushState), true);

  const pullMission = getHuntMission(7);
  let pullState = createHuntState(pullMission);
  pullState = stepHunt(pullMission, pullState, 'pull').state;
  pullState = stepHunt(pullMission, pullState, 'pull').state;
  assert.equal(switchesActive(pullMission, pullState), true);
  assert.ok(pullState.crates.has('1,2'));
});

test('locked treasure cannot be collected before its switch is active', () => {
  const mission = getHuntMission(9);
  const state = createHuntState(mission);
  const result = stepHunt(mission, state, 'grab');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'treasure-locked');
});
