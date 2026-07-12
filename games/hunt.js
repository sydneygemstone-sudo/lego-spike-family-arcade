/* games/hunt.js — 1. 网格寻宝 (spec §3.1)
 * 5x5 网格，随机起点/宝藏/2-3 个障碍。拖积木（Move Forward / Turn Left / Turn Right / Grab）
 * 排出程序 → 按 ▶ 运行 → 机器人按序走格。撞障碍/出界=失败重试。
 * 星级：3=最优步数，2=多≤3步，1=完成（"步数"=实际用到 Grab 为止消耗的指令数，
 * 与 BFS 算出的最短指令数——含转向——比较）。
 */

import { createTray, createSequence } from '../js/blocks-ui.js';
import { setupHiDPICanvas, drawRover, createTicker, animate, Easing } from './_rover-renderer.js';

const GRID_SIZE = 5;
const CANVAS_PAD = 10; // 给最外圈格子的机器人轮子留出空间，避免贴边裁切
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left（facing 0-3）
const MOVE_DURATION = 380;
const TURN_DURATION = 260;
const STEP_GAP = 140;

function randInt(n) { return Math.floor(Math.random() * n); }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

/** BFS：从 (start,facing) 到 treasure 所在格（任意朝向）的最短指令数（forward/left/right 各计 1 步）。 */
function bfsOptimalSteps(start, facing, treasure, obstacles, size) {
  const startKey = `${start.col},${start.row},${facing}`;
  const dist = new Map([[startKey, 0]]);
  const queue = [{ col: start.col, row: start.row, facing, d: 0 }];
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    if (cur.col === treasure.col && cur.row === treasure.row) return cur.d;
    const candidates = [
      { col: cur.col, row: cur.row, facing: (cur.facing + 3) % 4 },
      { col: cur.col, row: cur.row, facing: (cur.facing + 1) % 4 },
    ];
    const [dc, dr] = DIRS[cur.facing];
    const nc = cur.col + dc, nr = cur.row + dr;
    if (nc >= 0 && nc < size && nr >= 0 && nr < size && !obstacles.has(`${nc},${nr}`)) {
      candidates.push({ col: nc, row: nr, facing: cur.facing });
    }
    for (const m of candidates) {
      const key = `${m.col},${m.row},${m.facing}`;
      if (!dist.has(key)) {
        dist.set(key, cur.d + 1);
        queue.push({ ...m, d: cur.d + 1 });
      }
    }
  }
  return null; // 不可达
}

function generateLevel() {
  const size = GRID_SIZE;
  for (let attempt = 0; attempt < 80; attempt++) {
    const start = { col: randInt(size), row: randInt(size) };
    let treasure;
    do { treasure = { col: randInt(size), row: randInt(size) }; }
    while (treasure.col === start.col && treasure.row === start.row);
    const obstacleCount = 2 + randInt(2); // 2-3
    const obstacles = new Set();
    let tries = 0;
    while (obstacles.size < obstacleCount && tries < 300) {
      tries++;
      const c = randInt(size), r = randInt(size);
      if ((c === start.col && r === start.row) || (c === treasure.col && r === treasure.row)) continue;
      obstacles.add(`${c},${r}`);
    }
    const facing = randInt(4);
    const dist = bfsOptimalSteps(start, facing, treasure, obstacles, size);
    if (dist != null) {
      return { size, start, facing, treasure, obstacles, optimalSteps: dist + 1 }; // +1 = 最后的 Grab
    }
  }
  // 兜底（理论上不会走到）：清空障碍，保证可达
  return {
    size, start: { col: 0, row: 0 }, facing: 1,
    treasure: { col: size - 1, row: size - 1 }, obstacles: new Set(),
    optimalSteps: (size - 1) * 2 + 1,
  };
}

/* ---- 模块级状态（单例关卡，同一时刻只会有一个 hunt 实例挂载） ---- */
let apiRef = null;
let level = null;
let canvas = null;
let ctx = null;
let cellSize = 60;
let seq = null;
let seqUnsub = null;
let ticker = null;
let currentAnimation = null;
let resizeHandler = null;
let running = false;
let destroyed = false;
let logicalCol = 0, logicalRow = 0, logicalFacing = 0, grabbed = false;
let robot = null;

function cellCenter(col, row) {
  return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
}

function resetLogicalState() {
  logicalCol = level.start.col;
  logicalRow = level.start.row;
  logicalFacing = level.facing;
  grabbed = false;
  const c = cellCenter(logicalCol, logicalRow);
  robot = { x: c.x, y: c.y, angle: logicalFacing * (Math.PI / 2), squash: 1, expression: 'idle' };
}

function sizeCanvas(container) {
  const wrap = container.querySelector('#hunt-canvas-wrap');
  const availW = Math.min(Math.max(wrap.clientWidth || 320, 220), 420);
  cellSize = (availW - CANVAS_PAD * 2) / GRID_SIZE;
  ctx = setupHiDPICanvas(canvas, availW, availW);
}

function drawScene(bob) {
  if (!ctx) return;
  const size = GRID_SIZE * cellSize;
  const full = size + CANVAS_PAD * 2;
  ctx.clearRect(0, 0, full, full);
  ctx.save();
  ctx.translate(CANVAS_PAD, CANVAS_PAD);
  ctx.fillStyle = '#EAF5EC';
  ctx.fillRect(0, 0, size, size);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.strokeStyle = 'rgba(35,39,46,.14)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  level.obstacles.forEach((key) => {
    const [c, r] = key.split(',').map(Number);
    const { x, y } = cellCenter(c, r);
    ctx.font = `${Math.round(cellSize * 0.55)}px sans-serif`;
    ctx.fillText('🪨', x, y + 2);
  });
  if (!grabbed) {
    const { x, y } = cellCenter(level.treasure.col, level.treasure.row);
    ctx.font = `${Math.round(cellSize * 0.6)}px sans-serif`;
    ctx.fillText('💎', x, y + 2);
  }
  drawRover(ctx, {
    x: robot.x, y: robot.y + bob, angle: robot.angle,
    scale: cellSize / 34, squash: robot.squash, expression: robot.expression,
  });
  ctx.restore();
}

function animatePromise(opts) {
  return new Promise((resolve) => {
    currentAnimation = animate({ ...opts, onComplete: () => { currentAnimation = null; resolve(); } });
  });
}

async function bumpAnimation() {
  await animatePromise({
    duration: 240, easing: Easing.easeOutCubic,
    onUpdate: (t) => { robot.squash = 1 + Math.sin(t * Math.PI) * 0.22; },
  });
  robot.squash = 1;
}

async function resetRobotToStart() {
  const fromX = robot.x, fromY = robot.y, fromAngle = robot.angle;
  logicalCol = level.start.col; logicalRow = level.start.row; logicalFacing = level.facing;
  const target = cellCenter(logicalCol, logicalRow);
  const targetAngle = logicalFacing * (Math.PI / 2);
  robot.expression = 'idle';
  await animatePromise({
    duration: 420, easing: Easing.easeInOutQuad,
    onUpdate: (t) => {
      robot.x = fromX + (target.x - fromX) * t;
      robot.y = fromY + (target.y - fromY) * t;
      robot.angle = fromAngle + (targetAngle - fromAngle) * t;
    },
  });
  robot.angle = targetAngle;
  robot.squash = 1;
  grabbed = false;
}

/** 执行单条指令，返回 {ok, done} —— ok=false 表示失败已处理（已 fail+复位），done=true 表示抓到宝藏已结算。 */
async function runInstruction(block, index) {
  if (destroyed) return { ok: false };

  if (block.type === 'left' || block.type === 'right') {
    const dir = block.type === 'left' ? -1 : 1;
    const newFacing = (logicalFacing + dir + 4) % 4;
    const fromAngle = robot.angle;
    const toAngle = fromAngle + dir * (Math.PI / 2);
    await animatePromise({
      duration: TURN_DURATION, easing: Easing.easeOutBack,
      onUpdate: (t) => { robot.angle = fromAngle + (toAngle - fromAngle) * t; },
    });
    if (destroyed) return { ok: false };
    logicalFacing = newFacing;
    robot.angle = newFacing * (Math.PI / 2);
    apiRef.sfx.click();
    return { ok: true };
  }

  if (block.type === 'fwd') {
    const [dc, dr] = DIRS[logicalFacing];
    const nc = logicalCol + dc, nr = logicalRow + dr;
    const outOfBounds = nc < 0 || nc >= GRID_SIZE || nr < 0 || nr >= GRID_SIZE;
    const hitObstacle = !outOfBounds && level.obstacles.has(`${nc},${nr}`);
    if (outOfBounds || hitObstacle) {
      robot.expression = 'oops';
      apiRef.fail(outOfBounds ? 'out-of-bounds' : 'hit-obstacle');
      await bumpAnimation();
      if (destroyed) return { ok: false };
      await resetRobotToStart();
      return { ok: false };
    }
    const from = cellCenter(logicalCol, logicalRow);
    const to = cellCenter(nc, nr);
    await animatePromise({
      duration: MOVE_DURATION,
      onUpdate: (t) => {
        robot.x = from.x + (to.x - from.x) * t;
        robot.y = from.y + (to.y - from.y) * t;
        robot.squash = 1 - Math.sin(t * Math.PI) * 0.12;
      },
    });
    if (destroyed) return { ok: false };
    robot.squash = 1;
    logicalCol = nc; logicalRow = nr;
    return { ok: true };
  }

  if (block.type === 'grab') {
    if (logicalCol === level.treasure.col && logicalRow === level.treasure.row && !grabbed) {
      grabbed = true;
      robot.expression = 'happy';
      apiRef.sfx.success();
      apiRef.mascot.say('挖到宝藏啦！', 'cheer');
      const usedSteps = index + 1;
      const diff = usedSteps - level.optimalSteps;
      const stars = diff <= 0 ? 3 : diff <= 3 ? 2 : 1;
      await wait(500);
      if (destroyed) return { ok: false };
      apiRef.complete(stars);
      return { ok: true, done: true };
    }
    robot.expression = 'oops';
    apiRef.fail('grab-empty-cell');
    await bumpAnimation();
    if (destroyed) return { ok: false };
    await resetRobotToStart();
    return { ok: false };
  }

  return { ok: true };
}

async function runProgram(program, container) {
  running = true;
  setControlsEnabled(container, false);
  for (let i = 0; i < program.length; i++) {
    if (destroyed) return;
    const result = await runInstruction(program[i], i);
    if (destroyed) return;
    if (result.done) { running = false; setControlsEnabled(container, true); return; }
    if (!result.ok) { running = false; setControlsEnabled(container, true); return; }
    await wait(STEP_GAP);
  }
  // 指令跑完了但没抓到宝藏
  if (destroyed) return;
  apiRef.fail('sequence-incomplete');
  await resetRobotToStart();
  running = false;
  setControlsEnabled(container, true);
}

function setControlsEnabled(container, enabled) {
  const runBtn = container.querySelector('#hunt-run');
  const clearBtn = container.querySelector('#hunt-clear');
  if (runBtn) runBtn.disabled = !enabled;
  if (clearBtn) clearBtn.disabled = !enabled;
  const trayEl = container.querySelector('#hunt-tray');
  const seqEl = container.querySelector('#hunt-seq');
  [trayEl, seqEl].forEach((el) => {
    if (!el) return;
    el.style.pointerEvents = enabled ? '' : 'none';
    el.style.opacity = enabled ? '' : '.55';
  });
}

function buildDOM(container) {
  container.innerHTML = `
    <div class="flex-col gap-4">
      <div class="brick-card brick-card--cat-hunt">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:8px;">
          <h2 class="title-md" style="margin:0;">🗺️ 网格寻宝</h2>
          <div class="text-muted title-sm" id="hunt-status">拖积木规划路线，带机器人找到宝藏！</div>
        </div>
        <div class="flex-center" id="hunt-canvas-wrap" style="width:100%;">
          <canvas id="hunt-canvas"></canvas>
        </div>
      </div>
      <div class="brick-card brick-card--blue">
        <div class="title-sm" style="margin-bottom:4px;">积木托盘</div>
        <div id="hunt-tray"></div>
      </div>
      <div class="brick-card brick-card--yellow">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:4px;">
          <div class="title-sm">你的程序</div>
          <div class="flex-row gap-2">
            <button id="hunt-clear" class="brick-btn brick-btn--gray brick-btn--sm">清空</button>
            <button id="hunt-run" class="brick-btn brick-btn--green brick-btn--lg">▶ 运行</button>
          </div>
        </div>
        <div id="hunt-seq"></div>
      </div>
    </div>
  `;
}

export default {
  id: 'hunt',
  title: '网格寻宝',
  icon: '🗺️',

  init(container, api) {
    destroyed = false;
    running = false;
    currentAnimation = null;
    apiRef = api;
    level = generateLevel();

    buildDOM(container);
    canvas = container.querySelector('#hunt-canvas');
    sizeCanvas(container);
    resetLogicalState();

    const trayEl = container.querySelector('#hunt-tray');
    const seqEl = container.querySelector('#hunt-seq');
    const statusEl = container.querySelector('#hunt-status');

    createTray(trayEl, [
      { id: 'fwd', label: 'Move Forward', color: 'blue', icon: '⬆️' },
      { id: 'left', label: 'Turn Left', color: 'green', icon: '⬅️' },
      { id: 'right', label: 'Turn Right', color: 'purple', icon: '➡️' },
      { id: 'grab', label: 'Grab', color: 'orange', icon: '✋' },
    ]);

    seq = createSequence(seqEl, { maxSlots: 20, emptyText: '把积木拖到这里，规划路线 →' });
    seqUnsub = seq.onChange((list) => {
      statusEl.textContent = list.length
        ? `当前程序：${list.length} 块积木 · 按 ▶ 试试看！`
        : '拖积木规划路线，带机器人找到宝藏！';
    });

    // 测试专用只读钩子：仅在 window.__LSFA_TEST__ 显式为 true 时挂载，生产环境不受影响，
    // 供自动化自查脚本读取关卡布局/程序化设置指令序列，不改变任何正常玩法逻辑。
    if (typeof window !== 'undefined' && window.__LSFA_TEST__) {
      window.__lsfaHunt = { level, seq };
    }

    container.querySelector('#hunt-run').addEventListener('click', () => {
      if (running) return;
      const program = seq.getSequence().map((b) => ({ type: b.type }));
      if (program.length === 0) {
        apiRef.mascot.say('先拖几块积木到程序里吧！', 'think');
        return;
      }
      apiRef.sfx.click();
      apiRef.mascot.say('出发！', 'happy', 1200);
      runProgram(program, container);
    });

    container.querySelector('#hunt-clear').addEventListener('click', () => {
      if (running) return;
      apiRef.sfx.click();
      seq.clear();
    });

    resizeHandler = () => {
      sizeCanvas(container);
    };
    window.addEventListener('resize', resizeHandler);

    ticker = createTicker(() => {
      const bob = running ? 0 : Math.sin(performance.now() / 500) * 1.2;
      drawScene(bob);
    });
    ticker.start();

    apiRef.mascot.say('拖积木、按 ▶ 带我去找宝藏吧！', 'idle');
  },

  destroy() {
    destroyed = true;
    running = false;
    if (currentAnimation) { currentAnimation.cancel(); currentAnimation = null; }
    if (ticker) { ticker.stop(); ticker = null; }
    if (seqUnsub) { seqUnsub(); seqUnsub = null; }
    if (seq) { seq.destroy(); seq = null; }
    if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
    ctx = null;
    canvas = null;
  },
};
