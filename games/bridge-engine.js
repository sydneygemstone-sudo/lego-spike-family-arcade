/* Pure engineering rules for Precision Bridge. */

export const BRIDGE_WHEELS = Object.freeze({
  precision: { id: 'precision', label: '精准轮', stepsPerRev: 1, energyPerRev: 1, color: '#0AA3B5', scale: 0.92 },
  power: { id: 'power', label: '动力轮', stepsPerRev: 2, energyPerRev: 1, color: '#E8710A', scale: 1.35 },
  turbo: { id: 'turbo', label: '越野轮', stepsPerRev: 3, energyPerRev: 2, color: '#6B2FA0', scale: 1.55 },
});

const MISSIONS = [
  {
    title: '补给站首航', length: 7, checkpoints: [3], battery: 6, wheels: ['precision', 'power'], maxChanges: 1,
    brief: '必须在第 3 格补给站精准停车，再抵达第 7 格终点。电量不能超标。',
  },
  {
    title: '三站校准线', length: 12, checkpoints: [4, 8], battery: 8, wheels: ['precision', 'power', 'turbo'], maxChanges: 2,
    brief: '依次停靠第 4、8 格，再到第 12 格。每段只能装一种轮子。',
  },
  {
    title: '动力分配入门', length: 15, checkpoints: [3, 9], battery: 12, wheels: ['precision', 'power', 'turbo'], maxChanges: 2,
    brief: '三段距离不同，选择轮子时要同时计算圈数与电量。',
  },
  {
    title: '双站物资线', length: 16, checkpoints: [4, 10], battery: 12, wheels: ['precision', 'power', 'turbo'], maxChanges: 2,
    brief: '依次停靠第 4、10 格，再到第 16 格，不能冲过检查点。',
  },
  {
    title: '奇数格救援', length: 17, checkpoints: [5, 11], battery: 15, wheels: ['precision', 'power', 'turbo'], maxChanges: 2,
    brief: '第一段是奇数距离；先精准停靠，再切换高效轮组。',
  },
  {
    title: '四段工程线', length: 24, checkpoints: [6, 12, 18], battery: 18, wheels: ['precision', 'power', 'turbo'], maxChanges: 2,
    brief: '连续四段运输，合理复用同一轮组可以减少换轮。',
  },
  {
    title: '山谷补给网', length: 24, checkpoints: [5, 12, 18], battery: 22, wheels: ['precision', 'power', 'turbo'], maxChanges: 3,
    brief: '奇数与偶数路段交替出现，不能只靠一种轮子。',
  },
  {
    title: '远征校验线', length: 24, checkpoints: [6, 13, 19], battery: 22, wheels: ['precision', 'power', 'turbo'], maxChanges: 3,
    brief: '检查点间距不断变化，逐段计算后再发车。',
  },
  {
    title: '风暴工程挑战', length: 29, checkpoints: [6, 14, 23], battery: 21, wheels: ['precision', 'power', 'turbo'], maxChanges: 3,
    brief: '长距离运输中兼顾电量、圈数与换轮次数。',
  },
  {
    title: '精准渡桥总决赛', length: 30, checkpoints: [6, 15, 24], battery: 22, wheels: ['precision', 'power', 'turbo'], maxChanges: 2,
    brief: '四段最终任务：每次停车都要精准，同时压低总耗电。',
  },
];

export function getBridgeMission(requestedLevel = 1, options = {}) {
  const level = Math.max(1, Math.min(10, Number(requestedLevel) || 1));
  const variant = Math.max(1, Math.min(10, Number(options.variant) || 1));
  const raw = MISSIONS[level - 1];
  const wheels = options.rand?.shuffle ? options.rand.shuffle(raw.wheels) : [...raw.wheels];
  const mission = { level, variant, ...raw, checkpoints: [...raw.checkpoints], wheels };
  mission.targets = [...mission.checkpoints, mission.length];
  mission.optimalPlan = solveBridgeMission(mission);
  mission.optimalEnergy = planMetrics(mission.optimalPlan).energy;
  mission.optimalChanges = planMetrics(mission.optimalPlan).changes;
  // Ten deterministic calibrations vary the available margin without ever
  // invalidating the solver-proven optimal route.
  mission.battery = Math.max(mission.optimalEnergy + 1 + ((variant - 1) % 3), raw.battery - ((variant - 1) % 2));
  mission.maxChanges = Math.max(mission.optimalChanges, raw.maxChanges - ((variant - 1) % 2));
  mission.optimalPlan = solveBridgeMission(mission);
  mission.optimalEnergy = planMetrics(mission.optimalPlan).energy;
  mission.optimalChanges = planMetrics(mission.optimalPlan).changes;
  return mission;
}

export function planMetrics(plan) {
  let energy = 0;
  let changes = 0;
  let previous = null;
  for (const segment of plan) {
    const wheel = BRIDGE_WHEELS[segment.wheel];
    if (!wheel) continue;
    energy += Math.max(0, Number(segment.revs) || 0) * wheel.energyPerRev;
    if (previous && previous !== segment.wheel) changes += 1;
    previous = segment.wheel;
  }
  return { energy, changes };
}

export function evaluateBridgePlan(mission, plan) {
  const trace = [];
  let position = 0;
  let energy = 0;
  let changes = 0;
  let previous = null;
  for (let index = 0; index < mission.targets.length; index++) {
    const target = mission.targets[index];
    const segment = plan[index];
    if (!segment || !BRIDGE_WHEELS[segment.wheel] || !mission.wheels.includes(segment.wheel)) {
      return { ok: false, reason: 'invalid-wheel', failedLeg: index, position, energy, changes, trace };
    }
    const revs = Math.max(0, Math.floor(Number(segment.revs) || 0));
    const wheel = BRIDGE_WHEELS[segment.wheel];
    const from = position;
    position += revs * wheel.stepsPerRev;
    energy += revs * wheel.energyPerRev;
    if (previous && previous !== segment.wheel) changes += 1;
    previous = segment.wheel;
    const leg = { index, from, to: position, target, wheel: segment.wheel, revs, energy, changes };
    trace.push(leg);
    if (energy > mission.battery) return { ok: false, reason: 'battery', failedLeg: index, position, energy, changes, trace };
    if (position > target) return { ok: false, reason: target === mission.length ? 'overshoot-finish' : 'overshoot-checkpoint', failedLeg: index, position, target, energy, changes, trace };
    if (position < target) return { ok: false, reason: target === mission.length ? 'undershoot-finish' : 'undershoot-checkpoint', failedLeg: index, position, target, energy, changes, trace };
  }
  if (changes > mission.maxChanges) return { ok: false, reason: 'too-many-changes', position, energy, changes, trace };
  return { ok: true, reason: null, position, energy, changes, trace };
}

export function solveBridgeMission(mission) {
  const choicesByLeg = mission.targets.map((target, index) => {
    const from = index === 0 ? 0 : mission.targets[index - 1];
    const distance = target - from;
    return mission.wheels.flatMap((wheelId) => {
      const wheel = BRIDGE_WHEELS[wheelId];
      if (distance % wheel.stepsPerRev !== 0) return [];
      return [{ wheel: wheelId, revs: distance / wheel.stepsPerRev }];
    });
  });
  let best = null;
  function visit(index, plan) {
    if (index === choicesByLeg.length) {
      const result = evaluateBridgePlan(mission, plan);
      if (!result.ok) return;
      const metric = planMetrics(plan);
      const rank = metric.energy * 100 + metric.changes * 10 + plan.reduce((sum, p) => sum + p.revs, 0);
      if (!best || rank < best.rank) best = { rank, plan: plan.map((p) => ({ ...p })) };
      return;
    }
    choicesByLeg[index].forEach((choice) => visit(index + 1, [...plan, choice]));
  }
  visit(0, []);
  if (!best) throw new Error(`Bridge mission ${mission.level || '?'} has no feasible plan`);
  return best.plan;
}

export function scoreBridgePlan(mission, result) {
  if (!result.ok) return 0;
  if (result.energy <= mission.optimalEnergy && result.changes <= mission.optimalChanges) return 3;
  if (result.energy <= mission.battery && result.changes <= mission.maxChanges) return 2;
  return 1;
}

export function allBridgeMissions() { return MISSIONS.map((_, index) => getBridgeMission(index + 1)); }
