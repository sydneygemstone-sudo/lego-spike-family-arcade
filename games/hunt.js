/* games/hunt.js — 1. 网格寻宝 (spec §3.1 / teaching-redesign-v2 §「hunt 网格寻宝」)
 * 机制不变（5x5 网格拖积木编程，已验证可玩）。本次只换美术：
 * 地块用 assets/art.js 的 tiles.grass/rock/gem/flag，机器人用 roverTop（DOM/SVG 图层
 * 平移+旋转补间，弃用旧 Canvas 渲染器 games/_rover-renderer.js —— 该文件保留不删，只是
 * 这一关不再 import 它）。
 * 星级：3=最优步数，2=多≤3步，1=完成（"步数"=实际用到 Grab 为止消耗的指令数，
 * 与 BFS 算出的最短指令数——含转向——比较）。
 */

import { createTray, createSequence } from '../js/blocks-ui.js';
import { roverTop, tiles } from '../assets/art.js';

const GRID_SIZE = 5;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left（facing 0-3）
const MOVE_MS = 380;
const TURN_MS = 260;
const STEP_GAP_MS = 150;
const BUMP_MS = 260;

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

/* --------------------------------------------------------------------------
 * 一次性注入本关专属样式（网格地块 + roverTop 图层的 transform 接口）
 * -------------------------------------------------------------------------- */
let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .hunt-stage-card { min-height: 54vh; display:flex; flex-direction:column; }
    .hunt-grid-outer { flex:1; display:flex; align-items:center; justify-content:center; padding: 6px 0; }
    .hunt-grid {
      position: relative;
      display: grid;
      grid-template-columns: repeat(${GRID_SIZE}, 1fr);
      grid-template-rows: repeat(${GRID_SIZE}, 1fr);
      width: min(74vw, 58vh);
      aspect-ratio: 1 / 1;
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: inset 0 0 0 2.5px rgba(35,39,46,.14);
    }
    .hunt-cell { width:100%; height:100%; line-height:0; }
    .hunt-cell svg { width:100%; height:100%; display:block; }
    .hunt-rover-pos {
      position: absolute; left:0; top:0;
      width: ${100 / GRID_SIZE}%; height: ${100 / GRID_SIZE}%;
      display:flex; align-items:center; justify-content:center;
      transition: left ${MOVE_MS}ms ease, top ${MOVE_MS}ms ease;
      pointer-events:none;
      filter: drop-shadow(0 4px 4px rgba(0,0,0,.28));
    }
    .hunt-rover-rot {
      width:80%; height:80%;
      transition: transform ${TURN_MS}ms cubic-bezier(.34,1.2,.4,1);
    }
    .hunt-rover-rot svg { width:100%; height:100%; display:block; }
    .hunt-rover-squash { width:100%; height:100%; }
    .hunt-rover-squash.hunt-bump { animation: hunt-bump ${BUMP_MS}ms ease; }
    @keyframes hunt-bump {
      0%, 100% { transform: scale(1,1); }
      45% { transform: scale(1.22, 0.8); }
      70% { transform: scale(0.92, 1.1); }
    }
    .hunt-idle-bob { animation: hunt-idle-bob 2.1s ease-in-out infinite; }
    @keyframes hunt-idle-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3%); }
    }
  `;
  document.head.appendChild(style);
}

/* ---- 模块级状态（单例关卡，同一时刻只会有一个 hunt 实例挂载） ---- */
let apiRef = null;
let level = null;
let gridEl = null;
let seq = null;
let seqUnsub = null;
let running = false;
let destroyed = false;
let logicalCol = 0, logicalRow = 0, logicalFacing = 0, grabbed = false;
let angleDeg = 0; // 连续角度（不取模），保证转向动画走最短路径
let roverPosEl = null, roverRotEl = null, roverSquashEl = null;

function cellPercent(col, row) {
  return { left: (col * 100) / GRID_SIZE, top: (row * 100) / GRID_SIZE };
}

function setRoverExpression(face) {
  if (roverSquashEl) roverSquashEl.innerHTML = roverTop({ face });
}

function placeRoverInstant(col, row, angle) {
  const { left, top } = cellPercent(col, row);
  roverPosEl.style.transition = 'none';
  roverRotEl.style.transition = 'none';
  roverPosEl.style.left = `${left}%`;
  roverPosEl.style.top = `${top}%`;
  roverRotEl.style.transform = `rotate(${angle}deg)`;
  // 强制 reflow 后恢复过渡，避免下一次动画瞬移
  void roverPosEl.offsetWidth;
  roverPosEl.style.transition = '';
  roverRotEl.style.transition = '';
}

function moveRoverTo(col, row) {
  const { left, top } = cellPercent(col, row);
  roverPosEl.style.left = `${left}%`;
  roverPosEl.style.top = `${top}%`;
}

function rotateRoverTo(deg) {
  roverRotEl.style.transform = `rotate(${deg}deg)`;
}

function bumpRover() {
  roverSquashEl.classList.remove('hunt-bump');
  void roverSquashEl.offsetWidth;
  roverSquashEl.classList.add('hunt-bump');
  setTimeout(() => { if (roverSquashEl) roverSquashEl.classList.remove('hunt-bump'); }, BUMP_MS);
}

function resetLogicalState() {
  logicalCol = level.start.col;
  logicalRow = level.start.row;
  logicalFacing = level.facing;
  angleDeg = logicalFacing * 90;
  grabbed = false;
}

function cellKind(col, row) {
  const key = `${col},${row}`;
  if (level.obstacles.has(key)) return 'rock';
  if (!grabbed && col === level.treasure.col && row === level.treasure.row) return 'gem';
  if (col === level.start.col && row === level.start.row) return 'flag';
  return 'grass';
}

function renderGrid() {
  let html = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const kind = cellKind(c, r);
      html += `<div class="hunt-cell" data-col="${c}" data-row="${r}">${tiles[kind]()}</div>`;
    }
  }
  html += `
    <div class="hunt-rover-pos" id="hunt-rover-pos">
      <div class="hunt-rover-rot" id="hunt-rover-rot">${roverTop({ face: 'happy' })}</div>
    </div>`;
  gridEl.innerHTML = html;
  roverPosEl = gridEl.querySelector('#hunt-rover-pos');
  roverRotEl = gridEl.querySelector('#hunt-rover-rot');
  // squash 层包一层，避免和旋转的 transform 打架
  roverSquashEl = document.createElement('div');
  roverSquashEl.className = 'hunt-rover-squash hunt-idle-bob';
  while (roverRotEl.firstChild) roverSquashEl.appendChild(roverRotEl.firstChild);
  roverRotEl.appendChild(roverSquashEl);
}

/** 只重绘"是否已拾取宝藏"这一格（挖到宝藏后清掉 gem 贴图），避免整网格重绘打断动画层。 */
function refreshTreasureCell() {
  const cell = gridEl.querySelector(`.hunt-cell[data-col="${level.treasure.col}"][data-row="${level.treasure.row}"]`);
  if (cell) cell.innerHTML = tiles[cellKind(level.treasure.col, level.treasure.row)]();
}

async function runInstruction(block, index) {
  if (destroyed) return { ok: false };

  if (block.type === 'left' || block.type === 'right') {
    const dir = block.type === 'left' ? -1 : 1;
    logicalFacing = (logicalFacing + dir + 4) % 4;
    angleDeg += dir * 90;
    rotateRoverTo(angleDeg);
    apiRef.sfx.click();
    await wait(TURN_MS);
    return { ok: true };
  }

  if (block.type === 'fwd') {
    const [dc, dr] = DIRS[logicalFacing];
    const nc = logicalCol + dc, nr = logicalRow + dr;
    const outOfBounds = nc < 0 || nc >= GRID_SIZE || nr < 0 || nr >= GRID_SIZE;
    const hitObstacle = !outOfBounds && level.obstacles.has(`${nc},${nr}`);
    if (outOfBounds || hitObstacle) {
      setRoverExpression('oops');
      apiRef.fail(outOfBounds ? 'out-of-bounds' : 'hit-obstacle');
      bumpRover();
      await wait(BUMP_MS);
      if (destroyed) return { ok: false };
      await resetRobotToStart();
      return { ok: false };
    }
    moveRoverTo(nc, nr);
    await wait(MOVE_MS);
    if (destroyed) return { ok: false };
    logicalCol = nc; logicalRow = nr;
    return { ok: true };
  }

  if (block.type === 'grab') {
    if (logicalCol === level.treasure.col && logicalRow === level.treasure.row && !grabbed) {
      grabbed = true;
      setRoverExpression('happy');
      refreshTreasureCell();
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
    setRoverExpression('oops');
    apiRef.fail('grab-empty-cell');
    bumpRover();
    await wait(BUMP_MS);
    if (destroyed) return { ok: false };
    await resetRobotToStart();
    return { ok: false };
  }

  return { ok: true };
}

async function resetRobotToStart() {
  grabbed = false;
  refreshTreasureCell();
  logicalCol = level.start.col; logicalRow = level.start.row; logicalFacing = level.facing;
  // 转回起始朝向：走"最短角度差"而不是硬拉回 0，避免视觉上转一大圈
  const targetBase = logicalFacing * 90;
  const diff = ((targetBase - angleDeg) % 360 + 540) % 360 - 180;
  angleDeg += diff;
  setRoverExpression('happy'); // roverTop 只有 happy/oops 两态，复位即恢复常态
  moveRoverTo(logicalCol, logicalRow);
  rotateRoverTo(angleDeg);
  await wait(MOVE_MS);
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
    await wait(STEP_GAP_MS);
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
      <div class="brick-card brick-card--cat-hunt hunt-stage-card">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:4px;">
          <h2 class="title-md" style="margin:0;">🗺️ 网格寻宝</h2>
          <div class="text-muted title-sm" id="hunt-status">拖积木规划路线，带机器人找到宝藏！</div>
        </div>
        <div class="hunt-grid-outer">
          <div class="hunt-grid" id="hunt-grid"></div>
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
    injectStylesOnce();
    destroyed = false;
    running = false;
    apiRef = api;
    level = generateLevel();

    buildDOM(container);
    gridEl = container.querySelector('#hunt-grid');
    resetLogicalState();
    renderGrid();
    placeRoverInstant(logicalCol, logicalRow, angleDeg);

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

    // 网格/机器人图层全部走百分比布局（CSS grid + %-based transform），随窗口自适应，无需 JS 重算尺寸。

    apiRef.mascot.say('拖积木、按 ▶ 带我去找宝藏吧！', 'idle');
  },

  destroy() {
    destroyed = true;
    running = false;
    if (seqUnsub) { seqUnsub(); seqUnsub = null; }
    if (seq) { seq.destroy(); seq = null; }
    gridEl = null;
    roverPosEl = null; roverRotEl = null; roverSquashEl = null;
  },
};
