/* 客厅寻宝：在 iPad 安全网格上逐步模拟，不让孩子闭眼在房间里移动。 */

const SIZE = 5;
const DIRS = [
  { key: 'N', dr: -1, dc: 0, glyph: '↑', label: '向上' },
  { key: 'E', dr: 0, dc: 1, glyph: '→', label: '向右' },
  { key: 'S', dr: 1, dc: 0, glyph: '↓', label: '向下' },
  { key: 'W', dr: 0, dc: -1, glyph: '←', label: '向左' },
];

const MAPS = [
  {
    name: '星港 A',
    path: [[4, 0], [3, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [0, 4]],
    obstacles: [[4, 2], [3, 2], [3, 4], [1, 0], [1, 4]],
  },
  {
    name: '星港 B',
    path: [[4, 4], [4, 3], [3, 3], [2, 3], [2, 2], [1, 2], [1, 1], [0, 1]],
    obstacles: [[4, 1], [3, 1], [3, 4], [1, 4], [0, 3]],
  },
  {
    name: '星港 C',
    path: [[3, 0], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 4]],
    obstacles: [[4, 1], [2, 0], [2, 2], [2, 4], [0, 3]],
  },
];

function sameCell(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function directionFor(a, b) {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  return DIRS.findIndex((dir) => dir.dr === dr && dir.dc === dc);
}

export function commandsForPath(path, startDirection = 0) {
  const commands = [];
  let direction = startDirection;
  for (let i = 1; i < path.length; i += 1) {
    const targetDirection = directionFor(path[i - 1], path[i]);
    if (targetDirection < 0) throw new Error('Path contains a non-adjacent step');
    const clockwise = (targetDirection - direction + 4) % 4;
    if (clockwise === 1) commands.push({ kind: 'right', label: '右转' });
    if (clockwise === 2) commands.push({ kind: 'right', label: '右转' }, { kind: 'right', label: '右转' });
    if (clockwise === 3) commands.push({ kind: 'left', label: '左转' });
    commands.push({ kind: 'forward', label: '前进一格' });
    direction = targetDirection;
  }
  return commands;
}

function render(container, api) {
  let cancelled = false;
  const { rand, sfx, mascot, roleSwap, completeRound, emitFeedback, glyph } = api;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-hunt family-brief-card">
      <p class="title-sm" style="margin:0;">全程看屏幕、坐着操作。先读程序，再让网格里的机器人逐步移动到宝藏。</p>
    </div>
    <div class="livinghunt-layout">
      <section class="brick-card livinghunt-board-card" aria-labelledby="lh-map-title">
        <div class="livinghunt-heading"><div><small>安全模拟网格</small><h2 id="lh-map-title">载入地图…</h2></div><span id="lh-facing">朝向 ↑</span></div>
        <div class="livinghunt-grid" id="lh-grid" role="grid" aria-label="五乘五寻宝网格"></div>
        <div class="livinghunt-legend"><span><i class="is-start"></i>起点</span><span><i class="is-obstacle"></i>障碍</span><span><i class="is-goal"></i>宝藏</span></div>
      </section>
      <section class="brick-card livinghunt-console" aria-labelledby="lh-program-title">
        <small>逐步模拟</small><h2 id="lh-program-title">程序卡</h2>
        <div class="livinghunt-program" id="lh-program" aria-label="程序指令序列"></div>
        <div class="livinghunt-status" id="lh-status" role="status" aria-live="polite">先预测机器人会走到哪里，再执行第一步。</div>
        <div class="livinghunt-actions">
          <button class="brick-btn brick-btn--blue brick-btn--lg" id="lh-step-btn">执行下一步</button>
          <button class="brick-btn brick-btn--gray" id="lh-reset-btn">从起点重来</button>
          <button class="brick-btn brick-btn--purple" id="lh-map-btn">更换地图</button>
        </div>
      </section>
    </div>
    <div class="brick-card brick-card--cat-hunt" id="lh-role-card"></div>
  `;

  const grid = container.querySelector('#lh-grid');
  const mapTitle = container.querySelector('#lh-map-title');
  const facing = container.querySelector('#lh-facing');
  const programEl = container.querySelector('#lh-program');
  const statusEl = container.querySelector('#lh-status');
  const stepBtn = container.querySelector('#lh-step-btn');
  const resetBtn = container.querySelector('#lh-reset-btn');
  const mapBtn = container.querySelector('#lh-map-btn');
  const roleCard = container.querySelector('#lh-role-card');

  roleSwap(roleCard, { roles: ['我是路线设计师', '我是模拟员', '我是检查员'] });

  let map = null;
  let commands = [];
  let commandIndex = 0;
  let position = [0, 0];
  let direction = 0;
  let finished = false;

  function cellLabel(r, c) {
    const here = [r, c];
    if (sameCell(here, position)) return `机器人在第 ${r + 1} 行第 ${c + 1} 列，朝${DIRS[direction].label}`;
    if (sameCell(here, map.path[0])) return '起点';
    if (sameCell(here, map.path.at(-1))) return '宝藏终点';
    if (map.obstacles.some((item) => sameCell(item, here))) return '障碍物';
    return `第 ${r + 1} 行第 ${c + 1} 列，空地`;
  }

  function renderBoard() {
    grid.innerHTML = '';
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const here = [r, c];
        const cell = document.createElement('div');
        const isStart = sameCell(here, map.path[0]);
        const isGoal = sameCell(here, map.path.at(-1));
        const isObstacle = map.obstacles.some((item) => sameCell(item, here));
        const isRobot = sameCell(here, position);
        cell.className = `livinghunt-cell${isStart ? ' is-start' : ''}${isGoal ? ' is-goal' : ''}${isObstacle ? ' is-obstacle' : ''}${isRobot ? ' is-robot' : ''}`;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', cellLabel(r, c));
        cell.innerHTML = `${isStart ? '<small>S</small>' : ''}${isGoal ? '<b>★</b>' : ''}${isObstacle ? '<span></span>' : ''}${isRobot ? `<i style="--robot-turn:${direction * 90}deg">↑</i>` : ''}`;
        grid.appendChild(cell);
      }
    }
    facing.textContent = `朝向 ${DIRS[direction].glyph}`;
  }

  function renderProgram() {
    programEl.innerHTML = commands.map((command, index) => `
      <span class="livinghunt-command${index < commandIndex ? ' is-done' : ''}${index === commandIndex && !finished ? ' is-current' : ''}">
        <b>${index + 1}</b>${command.label}
      </span>
    `).join('');
  }

  function resetSimulation() {
    commandIndex = 0;
    direction = 0;
    position = [...map.path[0]];
    finished = false;
    stepBtn.disabled = false;
    stepBtn.textContent = '执行下一步';
    statusEl.textContent = '先预测机器人会走到哪里，再执行第一步。';
    renderBoard();
    renderProgram();
    emitFeedback('ready', { label: '安全网格已就绪' });
  }

  function finish() {
    finished = true;
    stepBtn.disabled = true;
    statusEl.innerHTML = `<span class="livinghunt-success">${glyph('trophy')}<strong>到达宝藏！程序逐步模拟完成。</strong></span>`;
    renderProgram();
    sfx.success();
    mascot.say('每一步都检查过了，机器人安全到达宝藏！', 'cheer');
    emitFeedback('success', { label: '逐步模拟完成 · 到达宝藏' });
    completeRound();
  }

  function executeStep() {
    if (cancelled || finished) return;
    const command = commands[commandIndex];
    if (!command) {
      finish();
      return;
    }
    if (command.kind === 'left') direction = (direction + 3) % 4;
    if (command.kind === 'right') direction = (direction + 1) % 4;
    if (command.kind === 'forward') {
      const dir = DIRS[direction];
      const next = [position[0] + dir.dr, position[1] + dir.dc];
      const blocked = next[0] < 0 || next[0] >= SIZE || next[1] < 0 || next[1] >= SIZE || map.obstacles.some((item) => sameCell(item, next));
      if (blocked) {
        statusEl.textContent = '前方是边界或障碍。这一步不能执行，请从起点检查程序。';
        sfx.fail();
        emitFeedback('miss', { label: '发现碰撞 · 请重置模拟' });
        stepBtn.disabled = true;
        return;
      }
      position = next;
    }
    commandIndex += 1;
    statusEl.textContent = `第 ${commandIndex} 步：${command.label}。机器人现在在第 ${position[0] + 1} 行、第 ${position[1] + 1} 列。`;
    sfx.click();
    renderBoard();
    renderProgram();
    if (commandIndex >= commands.length) {
      if (sameCell(position, map.path.at(-1))) finish();
      else {
        statusEl.textContent = '程序结束了，但还没到宝藏。请从起点重新检查。';
        stepBtn.disabled = true;
      }
    }
  }

  function chooseMap() {
    const candidates = MAPS.filter((candidate) => candidate !== map);
    map = rand.pick(candidates.length ? candidates : MAPS);
    commands = commandsForPath(map.path);
    mapTitle.textContent = map.name;
    resetSimulation();
    mascot.say('先看起点、障碍和宝藏，再逐步模拟程序。', 'think');
  }

  stepBtn.addEventListener('click', executeStep);
  resetBtn.addEventListener('click', () => { sfx.click(); resetSimulation(); });
  mapBtn.addEventListener('click', () => { sfx.click(); chooseMap(); });
  chooseMap();

  return {
    destroy() { cancelled = true; },
  };
}

let activeHandle = null;

export default {
  id: 'livinghunt',
  title: '客厅寻宝',
  icon: '🧭',
  howto: '不在房间里闭眼走动：全家坐着看五乘五安全网格，逐条执行程序，检查机器人能否避开障碍到达宝藏。',
  init(container, api) { activeHandle = render(container, api); },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
