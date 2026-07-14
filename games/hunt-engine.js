/* Pure game rules for Grid Quest. No DOM, timers or randomness live here. */

export const HUNT_COMMANDS = Object.freeze({
  fwd:   { id: 'fwd', label: '前进', color: 'blue', icon: '↑' },
  back:  { id: 'back', label: '后退', color: 'cyan', icon: '↓' },
  left:  { id: 'left', label: '左转', color: 'green', icon: '↶' },
  right: { id: 'right', label: '右转', color: 'purple', icon: '↷' },
  jump:  { id: 'jump', label: '跳跃', color: 'yellow', icon: '⌃' },
  push:  { id: 'push', label: '推箱', color: 'red', icon: '⇥' },
  pull:  { id: 'pull', label: '拉箱', color: 'pink', icon: '⇤' },
  grab:  { id: 'grab', label: '取核心', color: 'orange', icon: '◇' },
});

export const DIRS = Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);

const MISSIONS = [
  {
    title: '启动探险', brief: '用前进积木走到宝石，再拿起它。', size: 5,
    start: [0, 4], facing: 0, treasure: [0, 1], rocks: [[2, 2], [3, 3]],
    commands: ['fwd', 'left', 'right', 'grab'], maxBlocks: 7, teaching: '先在脑中数格子：每个「前进」只走一格。',
  },
  {
    title: '转弯峡谷', brief: '岩壁挡住直线，先转向，再绕到地图右上角。', size: 5,
    start: [0, 4], facing: 1, treasure: [4, 0], rocks: [[2, 4], [2, 3], [2, 2], [1, 1]],
    commands: ['fwd', 'left', 'right', 'grab'], maxBlocks: 13, teaching: '机器人永远按自己的朝向前进，不是按屏幕上方前进。',
  },
  {
    title: '倒车入库', brief: '宝石就在身后。不要绕圈，试试后退。', size: 5,
    start: [2, 1], facing: 0, treasure: [2, 3], rocks: [[1, 2], [3, 2]],
    commands: ['fwd', 'back', 'left', 'right', 'grab'], maxBlocks: 6, teaching: '「后退」不会改变机器人朝向。',
  },
  {
    title: '紫蓝传送门', brief: '走进紫门会从蓝门出来，朝向保持不变。', size: 6,
    start: [0, 5], facing: 0, treasure: [5, 0], rocks: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5]],
    portals: [[0, 3], [5, 2]], commands: ['fwd', 'back', 'left', 'right', 'grab'], maxBlocks: 8,
    teaching: '门的颜色是一对：进入任意一扇，都会从另一扇出来。传送只算一步。',
  },
  {
    title: '跳过裂谷', brief: '普通前进会掉进裂谷；跳跃能跨过一格障碍。', size: 5,
    start: [2, 4], facing: 0, treasure: [2, 2], pits: [[2, 3]],
    commands: ['fwd', 'back', 'left', 'right', 'jump', 'grab'], maxBlocks: 5,
    teaching: '跳跃一次跨两格：中间必须有裂谷或岩石，落点必须安全。',
  },
  {
    title: '压力机关', brief: '把箱子推到黄色压力板，宝石防护罩才会打开。', size: 5,
    start: [0, 3], facing: 1, treasure: [4, 1], crates: [[1, 3]], switches: [[3, 3]],
    rocks: [[1, 2], [3, 2]], commands: ['fwd', 'back', 'left', 'right', 'push', 'grab'], maxBlocks: 14,
    teaching: '推箱时机器人也会向前一格；箱子后面必须有空位。',
  },
  {
    title: '磁力回收', brief: '一边后退一边拉箱，把箱子放到身后的压力板。', size: 5,
    start: [2, 2], facing: 1, treasure: [0, 0], crates: [[3, 2]], switches: [[1, 2]],
    rocks: [[1, 1], [1, 3], [3, 1], [3, 3]], commands: ['fwd', 'back', 'left', 'right', 'pull', 'grab'], maxBlocks: 9,
    teaching: '拉箱时：箱子要在面前，机器人身后也必须有空位。',
  },
  {
    title: '跃迁组合', brief: '先跳过裂谷进入传送门，再保持方向冲向宝石。', size: 6,
    start: [0, 5], facing: 0, treasure: [5, 0], pits: [[0, 4]], portals: [[0, 3], [5, 2]],
    rocks: [[2, 1], [3, 1], [4, 1]], commands: ['fwd', 'back', 'left', 'right', 'jump', 'grab'], maxBlocks: 7,
    teaching: '跳跃的落点也是传送门时，会立即完成传送。先预测最终落点。',
  },
  {
    title: '运货返航', brief: '把箱子推到压力板，再倒车回起点收取宝石。', size: 5,
    start: [0, 4], facing: 1, treasure: [0, 4], crates: [[1, 4]], switches: [[3, 4]],
    rocks: [[0, 3], [1, 3], [2, 3], [3, 3]], commands: ['fwd', 'back', 'left', 'right', 'push', 'pull', 'grab'], maxBlocks: 8,
    teaching: '宝石就在起点，但压力板未启动。运货后不必转身，直接倒车。',
  },
  {
    title: '遗迹总决赛', brief: '裂谷、传送门和压力机关同时启动。用最短程序取回核心。', size: 6,
    start: [0, 5], facing: 0, treasure: [3, 0], pits: [[0, 4]], portals: [[0, 3], [5, 4]],
    crates: [[5, 3]], switches: [[5, 1]], rocks: [[1, 2], [2, 2], [4, 2]],
    commands: ['fwd', 'back', 'left', 'right', 'jump', 'push', 'pull', 'grab'], maxBlocks: 16,
    teaching: '先分段规划：跨裂谷 → 传送 → 启动压力板 → 绕开岩壁 → 取核心。',
  },
];

function key(col, row) { return `${col},${row}`; }
function pair(p) { return { col: p[0], row: p[1] }; }
function pairSet(items = []) { return new Set(items.map(([c, r]) => key(c, r))); }

function transformPoint(input, size, symmetry) {
  let [col, row] = input;
  const rotations = symmetry % 4;
  for (let i = 0; i < rotations; i += 1) [col, row] = [size - 1 - row, col];
  if (symmetry >= 4) col = size - 1 - col;
  return [col, row];
}

function transformFacing(facing, symmetry) {
  let result = (facing + (symmetry % 4)) % 4;
  if (symmetry >= 4) result = [0, 3, 2, 1][result];
  return result;
}

export function getHuntMission(requestedLevel = 1, requestedVariant = 1) {
  const number = Math.max(1, Math.min(10, Number(requestedLevel) || 1));
  const variant = Math.max(1, Math.min(10, Number(requestedVariant) || 1));
  const raw = MISSIONS[number - 1];
  const symmetry = (variant - 1) % 8;
  const point = (value) => transformPoint(value, raw.size, symmetry);
  const points = (values = []) => values.map(point);
  const mission = {
    number, variant, title: raw.title, brief: raw.brief, teaching: raw.teaching, size: raw.size,
    start: pair(point(raw.start)), facing: transformFacing(raw.facing, symmetry), treasure: pair(point(raw.treasure)),
    rocks: pairSet(points(raw.rocks)), pits: pairSet(points(raw.pits)), crates: pairSet(points(raw.crates)), switches: pairSet(points(raw.switches)),
    portals: raw.portals ? { a: pair(point(raw.portals[0])), b: pair(point(raw.portals[1])) } : null,
    commands: [...raw.commands], maxBlocks: raw.maxBlocks,
  };
  let solution = solveHuntMission(mission);
  if (!solution) throw new Error(`Hunt mission ${number} has no solution`);
  // D4 symmetry gives eight rule-equivalent layouts. Variants 9/10 add one
  // solver-verified decoy rock, producing ten static, repeatable combinations.
  if (variant >= 9) {
    const occupied = new Set([
      key(mission.start.col, mission.start.row), key(mission.treasure.col, mission.treasure.row),
      ...mission.rocks, ...mission.pits, ...mission.crates, ...mission.switches,
    ]);
    if (mission.portals) { occupied.add(key(mission.portals.a.col, mission.portals.a.row)); occupied.add(key(mission.portals.b.col, mission.portals.b.row)); }
    const candidates = [];
    for (let row = 0; row < mission.size; row += 1) for (let col = 0; col < mission.size; col += 1) {
      if (!occupied.has(key(col, row))) candidates.push(key(col, row));
    }
    const offset = variant === 10 ? Math.floor(candidates.length / 2) : 0;
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[(i + offset) % candidates.length];
      mission.rocks.add(candidate);
      const verified = solveHuntMission(mission);
      if (verified) { solution = verified; break; }
      mission.rocks.delete(candidate);
    }
  }
  mission.optimalProgram = solution;
  mission.optimalSteps = solution.length;
  mission.maxBlocks = Math.max(mission.maxBlocks, mission.optimalSteps + 2);
  return mission;
}

export function createHuntState(mission) {
  return {
    col: mission.start.col, row: mission.start.row, facing: mission.facing,
    crates: new Set(mission.crates), grabbed: false, steps: 0,
  };
}

export function switchesActive(mission, state) {
  for (const cell of mission.switches) if (!state.crates.has(cell)) return false;
  return true;
}

export function huntStateKey(state) {
  return `${state.col},${state.row},${state.facing}|${[...state.crates].sort().join(';')}`;
}

function cloneState(state) { return { ...state, crates: new Set(state.crates) }; }
function inBounds(mission, col, row) { return col >= 0 && col < mission.size && row >= 0 && row < mission.size; }
function portalExit(mission, col, row) {
  if (!mission.portals) return null;
  if (col === mission.portals.a.col && row === mission.portals.a.row) return mission.portals.b;
  if (col === mission.portals.b.col && row === mission.portals.b.row) return mission.portals.a;
  return null;
}
function blocked(mission, state, col, row, { allowPit = false } = {}) {
  if (!inBounds(mission, col, row)) return 'edge';
  const cell = key(col, row);
  if (mission.rocks.has(cell)) return 'rock';
  if (!allowPit && mission.pits.has(cell)) return 'pit';
  if (state.crates.has(cell)) return 'crate';
  return null;
}
function land(state, mission, col, row, event) {
  const exit = portalExit(mission, col, row);
  if (exit && !blocked(mission, state, exit.col, exit.row)) {
    state.col = exit.col; state.row = exit.row;
    return { event: 'portal', entered: { col, row }, exited: { ...exit } };
  }
  state.col = col; state.row = row;
  return { event };
}

export function stepHunt(mission, inputState, command) {
  const state = cloneState(inputState);
  state.steps += 1;
  if (!mission.commands.includes(command)) return { ok: false, state, reason: 'command-locked', event: 'bump' };

  if (command === 'left' || command === 'right') {
    state.facing = (state.facing + (command === 'left' ? 3 : 1)) % 4;
    return { ok: true, state, event: 'turn' };
  }

  if (command === 'grab') {
    if (state.col !== mission.treasure.col || state.row !== mission.treasure.row) {
      return { ok: false, state, reason: 'empty-grab', event: 'bump' };
    }
    if (!switchesActive(mission, state)) return { ok: false, state, reason: 'treasure-locked', event: 'locked' };
    state.grabbed = true;
    return { ok: true, done: true, state, event: 'grab' };
  }

  const [dc, dr] = DIRS[state.facing];
  if (command === 'fwd' || command === 'back') {
    const sign = command === 'fwd' ? 1 : -1;
    const col = state.col + dc * sign, row = state.row + dr * sign;
    const reason = blocked(mission, state, col, row);
    if (reason) return { ok: false, state, reason, event: 'bump' };
    const movement = land(state, mission, col, row, command);
    return { ok: true, state, ...movement };
  }

  if (command === 'jump') {
    const midCol = state.col + dc, midRow = state.row + dr;
    const col = state.col + dc * 2, row = state.row + dr * 2;
    const middle = key(midCol, midRow);
    const hasJumpTarget = mission.rocks.has(middle) || mission.pits.has(middle);
    if (!hasJumpTarget) return { ok: false, state, reason: 'nothing-to-jump', event: 'bump' };
    const reason = blocked(mission, state, col, row);
    if (reason) return { ok: false, state, reason: `bad-landing-${reason}`, event: 'bump' };
    const movement = land(state, mission, col, row, 'jump');
    return { ok: true, state, ...movement };
  }

  if (command === 'push') {
    const crateCol = state.col + dc, crateRow = state.row + dr;
    if (!state.crates.has(key(crateCol, crateRow))) return { ok: false, state, reason: 'no-crate-to-push', event: 'bump' };
    const destCol = crateCol + dc, destRow = crateRow + dr;
    const reason = blocked(mission, state, destCol, destRow);
    if (reason) return { ok: false, state, reason: `crate-${reason}`, event: 'bump' };
    state.crates.delete(key(crateCol, crateRow)); state.crates.add(key(destCol, destRow));
    state.col = crateCol; state.row = crateRow;
    return { ok: true, state, event: 'push', crateFrom: { col: crateCol, row: crateRow }, crateTo: { col: destCol, row: destRow } };
  }

  if (command === 'pull') {
    const crateCol = state.col + dc, crateRow = state.row + dr;
    if (!state.crates.has(key(crateCol, crateRow))) return { ok: false, state, reason: 'no-crate-to-pull', event: 'bump' };
    const destCol = state.col - dc, destRow = state.row - dr;
    const reason = blocked(mission, state, destCol, destRow);
    if (reason) return { ok: false, state, reason: `robot-${reason}`, event: 'bump' };
    state.crates.delete(key(crateCol, crateRow)); state.crates.add(key(state.col, state.row));
    const oldRobot = { col: state.col, row: state.row };
    state.col = destCol; state.row = destRow;
    return { ok: true, state, event: 'pull', crateFrom: { col: crateCol, row: crateRow }, crateTo: oldRobot };
  }

  return { ok: false, state, reason: 'unknown-command', event: 'bump' };
}

export function simulateHuntProgram(mission, program) {
  let state = createHuntState(mission);
  const trace = [];
  for (const command of program) {
    const result = stepHunt(mission, state, command);
    trace.push({ command, ...result });
    state = result.state;
    if (!result.ok || result.done) return { ...result, state, trace };
  }
  return { ok: true, done: false, state, trace, reason: 'program-ended' };
}

export function solveHuntMission(mission) {
  const start = createHuntState(mission);
  const queue = [{ state: start, path: [] }];
  const seen = new Set([huntStateKey(start)]);
  const commands = mission.commands.filter((c) => c !== 'grab');
  let cursor = 0;
  while (cursor < queue.length && queue.length < 120000) {
    const current = queue[cursor++];
    if (current.state.col === mission.treasure.col && current.state.row === mission.treasure.row && switchesActive(mission, current.state)) {
      return [...current.path, 'grab'];
    }
    for (const command of commands) {
      const result = stepHunt(mission, current.state, command);
      if (!result.ok) continue;
      const stateKey = huntStateKey(result.state);
      if (seen.has(stateKey)) continue;
      seen.add(stateKey);
      queue.push({ state: result.state, path: [...current.path, command] });
    }
  }
  return null;
}

export function scoreHuntRun(mission, usedSteps) {
  const delta = usedSteps - mission.optimalSteps;
  return delta <= 0 ? 3 : delta <= 3 ? 2 : 1;
}

export function allHuntMissions() { return MISSIONS.map((_, index) => getHuntMission(index + 1)); }
