/* games/race.js — 2. 机关轨道 (docs/superpowers/specs/2026-07-13-games-v3-redesign.md §二)
 * 彻底重做:机器人自己不会走!轨道每格可放一块指令块(供应有限=资源约束),
 * 机器人落在格 i 就执行格 i 的块 → 位移 → 落格执行新格的块……链式接力,直到落在
 * 目标格(绿色对勾格)胜利;落空格=停机失败;>15步未到=死循环("程序转圈圈啦")。
 * 关卡生成用随机构造+BFS 权威验证(状态=位置+剩余供应+已访问格位掩码,禁止同格
 * 二次占用两种不同的块,物理上一格只能放一块),保证有解且最优解块数>=2。
 * Level:L1 5-6格 2种块(前进2/前进3)目标在尾部;L2 6-8格加跳过块+干扰空格;
 * L3 8-10格加后退块(可造循环)+目标在中途(需冲过头再退回来)。
 * 星级:最优块数3★ / 多1块2★ / 完成1★。
 * 拖块交互:自实现 Pointer Events 拖放(参照 js/blocks-ui.js 的手势模式,但落点是
 * 轨道格而非线性序列)+ 轻点选中→轻点格子放置的兜底交互(触屏友好)。
 */

import { trackScene, trackCellX, roverTop } from '../assets/art.js';

/* -------------------------------------------------------------------------
 * 常量(与 assets/art.js#trackScene 内部布局常量保持一致,用于把 viewBox 坐标
 * 换算成 %布局,supplied by trackCellX 已导出,其余几何常量需要镜像)
 * ------------------------------------------------------------------------- */
const SEG = 84, TX = 90, TAIL = 130, TY = 60, TH = 110, VBH = 230;
const MAX_HOPS = 15;
const DRAG_THRESHOLD = 8;
const EXEC_HIGHLIGHT_MS = 360;
const STEP_GAP_MS = 180;

/* 指令块目录:语义图标用纯 Unicode 箭头(非 emoji)。delta = 位移格数(正=前进,负=后退)。 */
const BLOCK_DEFS = {
  fwd2: { delta: 2, label: '前进 2 格', icon: '→', color: 'blue' },
  fwd3: { delta: 3, label: '前进 3 格', icon: '⇒', color: 'cyan' },
  skip: { delta: 2, label: '跳跃 2 格', icon: '↷', color: 'purple' },
  back1: { delta: -1, label: '后退 1 格', icon: '←', color: 'pink' },
};

const LEVEL_CONFIG = {
  1: { lenMin: 5, lenMax: 6, types: ['fwd2', 'fwd3'], targetMode: 'tail', requireType: null, minDecoys: 0, noBaselineExtras: false, noForwardShortcut: false },
  2: { lenMin: 6, lenMax: 8, types: ['fwd2', 'fwd3', 'skip'], targetMode: 'tail', requireType: 'skip', minDecoys: 1, noBaselineExtras: false, noForwardShortcut: false },
  // noForwardShortcut:目标必须真的"需要冲过头再退回来"——如果仅用前进类块(不含 back1)也能
  // 用同样或更少块数抵达,那这一局并没有教到"回退"概念,判定失败并重新生成。
  // noBaselineExtras:不给未用到的前进块类型白送 1 个保底供应(那正是制造"意外近道"的元凶)。
  3: { lenMin: 8, lenMax: 10, types: ['fwd2', 'fwd3', 'skip', 'back1'], targetMode: 'mid', requireType: 'back1', minDecoys: 1, noBaselineExtras: true, noForwardShortcut: true },
};

const FALLBACK_LEVELS = {
  1: { length: 5, target: 4, types: ['fwd2', 'fwd3'], supply: { fwd2: 3, fwd3: 1 } },
  2: { length: 7, target: 6, types: ['fwd2', 'fwd3', 'skip'], supply: { fwd2: 2, fwd3: 1, skip: 1 } },
  3: { length: 9, target: 5, types: ['fwd2', 'fwd3', 'skip', 'back1'], supply: { fwd2: 0, fwd3: 2, skip: 0, back1: 1 } },
};

function randInt(n) { return Math.floor(Math.random() * n); }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trackWidth(length) { return TX + length * SEG + TAIL; }
function pct(x, w) { return (x / w) * 100; }

/* -------------------------------------------------------------------------
 * 关卡生成:随机构造一条"意图解"(simple path,不重复占用同一格),
 * 再用 BFS(状态=位置+剩余供应计数+已访问格位掩码)算出权威最优块数,
 * 验证确实 >=2 块且的确可达 —— 这就是 spec 要求的"BFS/DFS 验证有解"。
 * ------------------------------------------------------------------------- */
function buildSolutionChain(target, length, types, requireOvershoot) {
  const maxChainLen = 6;
  function dfs(cur, visited, chain, overshot) {
    if (cur === target) {
      return (!requireOvershoot || overshot) ? chain.slice() : null;
    }
    if (chain.length >= maxChainLen) return null;
    for (const t of shuffle(types)) {
      const delta = BLOCK_DEFS[t].delta;
      const nxt = cur + delta;
      if (nxt < 0 || nxt >= length || visited.has(nxt)) continue;
      visited.add(nxt);
      chain.push({ index: cur, type: t });
      const res = dfs(nxt, visited, chain, overshot || nxt > target);
      if (res) return res;
      chain.pop();
      visited.delete(nxt);
    }
    return null;
  }
  return dfs(0, new Set([0]), [], false);
}

/** 权威 BFS:状态 = 位置+各类型剩余数量+已落格掩码(禁止同一格被要求装两种不同块)。 */
function bfsOptimalHops(length, target, supply, types) {
  const startCounts = types.map((t) => supply[t] || 0);
  const key = (pos, counts, visited) => pos + '|' + counts.join(',') + '|' + visited;
  const startKey = key(0, startCounts, 1);
  const seen = new Set([startKey]);
  const queue = [{ pos: 0, counts: startCounts, visited: 1, hops: 0 }];
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    if (cur.pos === target) return cur.hops;
    if (cur.hops >= MAX_HOPS) continue;
    for (let ti = 0; ti < types.length; ti++) {
      if (cur.counts[ti] <= 0) continue;
      const delta = BLOCK_DEFS[types[ti]].delta;
      const nxt = cur.pos + delta;
      if (nxt < 0 || nxt >= length) continue;
      const bit = 1 << nxt;
      if (nxt !== target && (cur.visited & bit)) continue;
      const nc = cur.counts.slice(); nc[ti]--;
      const nv = cur.visited | bit;
      const k = key(nxt, nc, nv);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ pos: nxt, counts: nc, visited: nv, hops: cur.hops + 1 });
    }
  }
  return null;
}

function buildSupply(solution, availableTypes, noBaselineExtras) {
  const supply = {};
  availableTypes.forEach((t) => { supply[t] = 0; });
  solution.forEach((s) => { supply[s.type]++; });
  const usedTypes = availableTypes.filter((t) => supply[t] > 0);
  if (usedTypes.length) {
    const smallest = usedTypes.reduce((a, b) => (Math.abs(BLOCK_DEFS[a].delta) <= Math.abs(BLOCK_DEFS[b].delta) ? a : b));
    supply[smallest] += 1;
  }
  // 给未用到的类型送 1 个保底供应,方便探索/制造多解 —— 但 L3 关掉这条(见 noForwardShortcut 注释),
  // 否则送出去的额外前进块常常意外拼出"不用后退也能到达"的近道,削弱"冲过头再退回"的教学点。
  if (!noBaselineExtras) availableTypes.forEach((t) => { if (supply[t] === 0) supply[t] = 1; });
  return supply;
}

function cloneFallback(levelNum) {
  const f = FALLBACK_LEVELS[levelNum] || FALLBACK_LEVELS[1];
  const supply = { ...f.supply };
  const optimalHops = bfsOptimalHops(f.length, f.target, supply, f.types) ?? 2;
  return { length: f.length, target: f.target, types: f.types.slice(), supply, optimalHops };
}

function generateLevel(levelNum) {
  const cfg = LEVEL_CONFIG[levelNum] || LEVEL_CONFIG[1];
  for (let attempt = 0; attempt < 300; attempt++) {
    const length = cfg.lenMin + randInt(cfg.lenMax - cfg.lenMin + 1);
    let target;
    if (cfg.targetMode === 'mid') {
      const minT = 3, maxT = length - 4;
      if (maxT < minT) continue;
      target = minT + randInt(maxT - minT + 1);
    } else {
      target = length - 1;
    }
    const solution = buildSolutionChain(target, length, cfg.types, cfg.targetMode === 'mid');
    if (!solution || solution.length < 2) continue;
    if (cfg.requireType && !solution.some((s) => s.type === cfg.requireType)) continue;
    const usedCells = new Set(solution.map((s) => s.index));
    const decoys = length - usedCells.size - 1;
    if (decoys < cfg.minDecoys) continue;
    const supply = buildSupply(solution, cfg.types, cfg.noBaselineExtras);
    const optimalHops = bfsOptimalHops(length, target, supply, cfg.types);
    if (optimalHops == null || optimalHops < 2 || optimalHops > MAX_HOPS) continue;
    if (cfg.noForwardShortcut) {
      // 只用正向位移块(排除 back1)算一遍最短块数;如果它能追平或超过"完整方案"的最优块数,
      // 说明这一局根本不需要后退+冲过头也能拿到满星,没体现出 L3 的教学点,重新生成。
      const fwdTypes = cfg.types.filter((t) => BLOCK_DEFS[t].delta > 0);
      const fwdOnlyHops = bfsOptimalHops(length, target, supply, fwdTypes);
      if (fwdOnlyHops != null && fwdOnlyHops <= optimalHops) continue;
    }
    return { length, target, types: cfg.types.slice(), supply, optimalHops };
  }
  return cloneFallback(levelNum);
}

/* -------------------------------------------------------------------------
 * 一次性注入本关专属样式
 * ------------------------------------------------------------------------- */
let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .race-stage-card { display:flex; flex-direction:column; }
    .race-scene-outer {
      flex:1; max-height:46vh; position:relative; border-radius: var(--radius-md); overflow:hidden;
      display:flex; align-items:center; justify-content:center;
      background: linear-gradient(180deg, #FFF7E8 0%, #EAF3DE 48%, #CBE6C4 100%);
      padding: 22px 0 6px;
    }
    .race-scene-inner { position:relative; width:100%; }
    .race-scene-inner > svg:first-child { width:100%; height:auto; display:block; position:relative; z-index:0; }
    .race-trail-svg { position:absolute; inset:0; width:100%; height:100%; z-index:1; pointer-events:none; }
    .race-trail-path { fill:none; stroke:#F5C518; stroke-width:4; stroke-dasharray:2 10; stroke-linecap:round; opacity:0; animation: race-trail-fade-in .3s ease forwards; }
    @keyframes race-trail-fade-in { to { opacity:.85; } }

    .race-flag-label {
      position:absolute; z-index:3; top:1%; transform:translateX(-50%);
      font-size:11px; font-weight:800; background:#fff; border:2px solid var(--ink-900);
      border-radius:999px; padding:1px 8px; white-space:nowrap; pointer-events:none;
    }

    .race-cell-slot {
      position:absolute; z-index:2; display:flex; flex-direction:column; align-items:center;
      justify-content:flex-start; padding-top:2px; gap:3px;
    }
    .race-cell-slot--active { cursor:pointer; touch-action:none; }
    .race-cell-slot--drop-ok { background: rgba(87,184,78,.22); border-radius:12px; }
    .race-cell-slot--reject-hover { background: rgba(208,16,18,.16); border-radius:12px; }
    .race-cell-slot--reject-anim .race-block-chip,
    .race-cell-slot--reject-anim .race-cell-empty { animation: race-reject-shake .32s ease; }
    @keyframes race-reject-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    .race-cell-badge {
      font-size:11px; font-weight:800; color: var(--ink-700); background:rgba(255,255,255,.8);
      border-radius:6px; padding:0 5px; line-height:1.5; pointer-events:none;
    }
    .race-cell-empty { width:68%; height:50%; border:2.5px dashed var(--ink-300); border-radius:10px; }
    .race-block-chip {
      width:80%; height:60%; border-radius:10px; display:flex; flex-direction:column;
      align-items:center; justify-content:center; color:#fff; font-weight:800;
      box-shadow: 0 3px 0 rgba(0,0,0,.22); touch-action:none; cursor:grab; position:relative;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .race-block-chip .chip-icon { font-size:19px; line-height:1; }
    .race-block-chip .chip-delta { font-size:11px; margin-top:1px; }
    .race-block-chip--armed {
      box-shadow: 0 0 0 3px #fff, 0 0 14px 4px rgba(255,213,79,.9);
      animation: race-armed-pulse 1s ease-in-out infinite;
    }
    @keyframes race-armed-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    .race-block-chip--executing {
      box-shadow: 0 0 0 4px rgba(255,235,59,.95), 0 0 18px 6px rgba(255,235,59,.85);
    }
    .race-chip-hidden { opacity: .25; }
    .race-delete-x {
      position:absolute; top:-8px; right:-8px; width:22px; height:22px; border-radius:50%;
      background: var(--lego-red); color:#fff; font-weight:900; font-size:13px;
      display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,.3);
      touch-action:none;
    }

    .race-rover-pos {
      position:absolute; z-index:4; top:50%; width: 8.2%; aspect-ratio: 108/120;
      transform: translate(-50%,-50%);
      transition: left 420ms ease;
      pointer-events:none;
      filter: drop-shadow(0 4px 5px rgba(0,0,0,.3));
    }
    .race-rover-rot { width:100%; height:100%; transition: transform .4s ease; }
    .race-rover-rot svg { width:100%; height:100%; display:block; }

    .race-tray { display:flex; flex-wrap:wrap; gap:10px; padding:6px 2px; }
    .race-tray-chip {
      position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:2px; min-width:80px; min-height:66px; padding:8px 10px; border-radius:14px; color:#fff;
      font-weight:800; font-size:11.5px; text-align:center; line-height:1.2;
      box-shadow: 0 4px 0 rgba(0,0,0,.2); cursor:grab; touch-action:none;
    }
    .race-tray-chip .chip-icon { font-size:19px; }
    .race-tray-chip .chip-count {
      position:absolute; top:-8px; right:-8px; background:#fff; color: var(--ink-900);
      border-radius:999px; min-width:22px; height:22px; display:flex; align-items:center;
      justify-content:center; font-size:12px; font-weight:900; box-shadow:0 2px 4px rgba(0,0,0,.25);
    }
    .race-tray-chip--empty { opacity:.35; cursor:not-allowed; filter: grayscale(1); }
    .race-tray-chip--armed { box-shadow: 0 0 0 3px #fff, 0 0 14px 4px rgba(255,213,79,.9); }

    .race-ghost { position:fixed; z-index:600; pointer-events:none; opacity:.95; transform: scale(1.12); }
  `;
  document.head.appendChild(style);
}

/* ---- 模块级状态(单例关卡,同一时刻只会有一个 race 实例挂载) ---- */
let apiRef = null;
let containerRef = null;
let level = null;
let cellBlocks = [];
let cellSlotEls = [];
let armed = null; // null | {kind:'tray', type} | {kind:'cell', index, type}
let drag = null;  // 当前拖拽会话
let running = false;
let destroyed = false;
let angleDeg = 90;
let roverPosEl = null, roverRotEl = null, trailSvgEl = null;

function xPercent(index) { return pct(trackCellX(index), trackWidth(level.length)); }

/* -------------------------------------------------------------------------
 * DOM 构建
 * ------------------------------------------------------------------------- */
function buildDOM(container) {
  container.innerHTML = `
    <div class="flex-col gap-3">
      <div class="brick-card brick-card--cat-race race-stage-card">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:2px;">
          <h2 class="title-md" style="margin:0;">🏁 机关轨道</h2>
          <div class="text-muted title-sm" id="race-status">把指令块拖到轨道格上，接力带机器人到目标！</div>
        </div>
        <div class="race-scene-outer">
          <div class="race-scene-inner" id="race-scene-inner"></div>
        </div>
      </div>
      <div class="brick-card brick-card--blue race-tray-card">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:4px;">
          <div class="title-sm">积木仓库（数量有限，用完就没啦）</div>
          <div class="text-muted" style="font-size:11.5px;">落空格=停机 · 落目标=胜利 · &gt;15步=打转</div>
        </div>
        <div class="race-tray" id="race-tray"></div>
      </div>
      <div class="flex-center">
        <button id="race-run-btn" class="brick-btn brick-btn--green brick-btn--lg">▶ 运行程序</button>
      </div>
    </div>
  `;
}

function renderScene() {
  const sceneEl = containerRef.querySelector('#race-scene-inner');
  const tilesArr = new Array(level.length).fill(null);
  tilesArr[level.target] = 'green';
  const W = trackWidth(level.length);
  sceneEl.innerHTML = `
    ${trackScene({ tiles: tilesArr })}
    <svg class="race-trail-svg" id="race-trail-svg" viewBox="0 0 ${W} ${VBH}" xmlns="http://www.w3.org/2000/svg"></svg>
    <div class="race-flag-label" style="left:${pct(trackCellX(0), W)}%;">🚩 起点</div>
    <div class="race-flag-label" style="left:${pct(trackCellX(level.target), W)}%;">🎯 目标</div>
    <div class="race-rover-pos" id="race-rover-pos" style="left:${pct(trackCellX(0), W)}%;">
      <div class="race-rover-rot" id="race-rover-rot">${roverTop({ face: 'happy' })}</div>
    </div>
  `;
  trailSvgEl = sceneEl.querySelector('#race-trail-svg');
  roverPosEl = sceneEl.querySelector('#race-rover-pos');
  roverRotEl = sceneEl.querySelector('#race-rover-rot');

  cellSlotEls = new Array(level.length).fill(null);
  for (let i = 0; i < level.length; i++) {
    const slot = document.createElement('div');
    const isTarget = i === level.target;
    slot.className = 'race-cell-slot no-select' + (isTarget ? '' : ' race-cell-slot--active');
    slot.style.left = pct(TX + i * SEG, W) + '%';
    slot.style.width = pct(SEG - 3, W) + '%';
    slot.style.top = pct(TY, VBH) + '%';
    slot.style.height = pct(TH, VBH) + '%';
    slot.dataset.index = String(i);
    slot.addEventListener('pointerdown', (ev) => {
      if (running || isTarget) return;
      if (ev.target.closest('.race-delete-x')) return;
      const type = cellBlocks[i];
      if (type) {
        const chipEl = slot.querySelector('.race-block-chip');
        if (!chipEl) return;
        beginDrag(ev, { kind: 'cell', index: i, type, sourceEl: chipEl });
      } else {
        beginDrag(ev, { kind: 'cell-empty', index: i });
      }
    });
    sceneEl.appendChild(slot);
    cellSlotEls[i] = slot;
  }
  renderCells();
}

function renderTray() {
  const trayEl = containerRef.querySelector('#race-tray');
  if (!trayEl) return;
  trayEl.innerHTML = '';
  level.types.forEach((type) => {
    const def = BLOCK_DEFS[type];
    const count = level.supply[type];
    const isArmed = !!(armed && armed.kind === 'tray' && armed.type === type);
    const chip = document.createElement('div');
    chip.className = 'race-tray-chip no-select' + (count <= 0 ? ' race-tray-chip--empty' : '') + (isArmed ? ' race-tray-chip--armed' : '');
    chip.style.background = `var(--lego-${def.color})`;
    chip.style.boxShadow = `0 4px 0 var(--lego-${def.color}-dark)`;
    chip.innerHTML = `<span class="chip-icon">${def.icon}</span><span>${def.label}</span><span class="chip-count">×${count}</span>`;
    chip.addEventListener('pointerdown', (ev) => {
      if (running || count <= 0) return;
      beginDrag(ev, { kind: 'tray', type, sourceEl: chip });
    });
    trayEl.appendChild(chip);
  });
}

function renderCells() {
  for (let i = 0; i < level.length; i++) {
    const slot = cellSlotEls[i];
    if (!slot) continue;
    slot.innerHTML = `<span class="race-cell-badge">${i}</span>`;
    if (i === level.target) continue;
    const type = cellBlocks[i];
    if (type) {
      const def = BLOCK_DEFS[type];
      const isArmed = !!(armed && armed.kind === 'cell' && armed.index === i);
      const chip = document.createElement('div');
      chip.className = 'race-block-chip no-select' + (isArmed ? ' race-block-chip--armed' : '');
      chip.style.background = `var(--lego-${def.color})`;
      chip.style.boxShadow = `0 3px 0 var(--lego-${def.color}-dark)`;
      chip.innerHTML = `<span class="chip-icon">${def.icon}</span><span class="chip-delta">${def.delta > 0 ? '+' : ''}${def.delta}</span>`;
      if (isArmed) {
        const del = document.createElement('div');
        del.className = 'race-delete-x no-select';
        del.textContent = '×';
        del.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        del.addEventListener('pointerup', (ev) => { ev.stopPropagation(); removeBlockAt(i); });
        chip.appendChild(del);
      }
      slot.appendChild(chip);
    } else {
      const hint = document.createElement('div');
      hint.className = 'race-cell-empty';
      slot.appendChild(hint);
    }
  }
}

/* -------------------------------------------------------------------------
 * 编辑阶段的状态变更(放置/移除/拾起) —— 由拖拽与轻点两套交互共用
 * ------------------------------------------------------------------------- */
function placeArmedAt(index) {
  if (!armed) return;
  if (index === level.target) return;
  if (cellBlocks[index]) { rejectShake(index); return; }
  if (armed.kind === 'tray') {
    if (level.supply[armed.type] <= 0) { armed = null; refreshUI(); return; }
    level.supply[armed.type] -= 1;
    cellBlocks[index] = armed.type;
  } else if (armed.kind === 'cell') {
    cellBlocks[armed.index] = null;
    cellBlocks[index] = armed.type;
  }
  apiRef.sfx.snap();
  armed = null;
  refreshUI();
}

function removeBlockAt(index) {
  const type = cellBlocks[index];
  if (!type) return;
  cellBlocks[index] = null;
  level.supply[type] += 1;
  if (armed && armed.kind === 'cell' && armed.index === index) armed = null;
  apiRef.sfx.click();
  refreshUI();
}

function handleTrayTap(type) {
  if (level.supply[type] <= 0) return;
  if (armed && armed.kind === 'tray' && armed.type === type) { armed = null; refreshUI(); return; }
  armed = { kind: 'tray', type };
  refreshUI();
}

function handleOccupiedTap(index) {
  if (armed && armed.kind === 'cell' && armed.index === index) { armed = null; refreshUI(); return; }
  if (armed) { rejectShake(index); return; }
  armed = { kind: 'cell', index, type: cellBlocks[index] };
  refreshUI();
}

function rejectShake(index) {
  const slot = cellSlotEls[index];
  if (!slot) return;
  slot.classList.remove('race-cell-slot--reject-anim');
  void slot.offsetWidth;
  slot.classList.add('race-cell-slot--reject-anim');
  setTimeout(() => { if (slot) slot.classList.remove('race-cell-slot--reject-anim'); }, 340);
}

/* -------------------------------------------------------------------------
 * 拖拽状态机(Pointer Events,自实现,参照 js/blocks-ui.js 的手势模式,
 * 落点判定改为轨道格而非线性序列)
 * ------------------------------------------------------------------------- */
function beginDrag(ev, seed) {
  if (running) return;
  if (ev.button !== undefined && ev.button !== 0) return;
  cleanupDrag();
  // 拿起一块新积木(托盘或已放置的格子)会取代之前"轻点选中"的状态;但落在空格上是
  // "使用当前已选中的积木"这个动作本身,绝不能在这里把 armed 提前清空,否则轻点兜底交互失效。
  if (seed.kind !== 'cell-empty') armed = null;
  drag = { ...seed, startX: ev.clientX, startY: ev.clientY, dragStarted: false, ghostEl: null, pointerId: ev.pointerId, hoveredIndex: null };
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
}

function promoteToDrag(ev) {
  drag.dragStarted = true;
  const def = BLOCK_DEFS[drag.type];
  const ghost = document.createElement('div');
  ghost.className = (drag.kind === 'tray' ? 'race-tray-chip' : 'race-block-chip') + ' race-ghost';
  ghost.style.background = `var(--lego-${def.color})`;
  ghost.innerHTML = `<span class="chip-icon">${def.icon}</span>`;
  const r = drag.sourceEl.getBoundingClientRect();
  ghost.style.width = r.width + 'px';
  ghost.style.height = r.height + 'px';
  ghost.style.left = (ev.clientX - r.width / 2) + 'px';
  ghost.style.top = (ev.clientY - r.height / 2) + 'px';
  document.body.appendChild(ghost);
  drag.ghostEl = ghost;
  if (drag.kind === 'cell') drag.sourceEl.classList.add('race-chip-hidden');
}

function findHoveredSlot(x, y) {
  for (let i = 0; i < cellSlotEls.length; i++) {
    const s = cellSlotEls[i];
    if (!s) continue;
    const r = s.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
  }
  return null;
}

function onPointerMove(ev) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  if (drag.kind === 'cell-empty') return; // 空格没有可拖拽的东西
  const dx = ev.clientX - drag.startX, dy = ev.clientY - drag.startY;
  if (!drag.dragStarted) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    promoteToDrag(ev);
  }
  ev.preventDefault();
  const w = drag.ghostEl.offsetWidth, h = drag.ghostEl.offsetHeight;
  drag.ghostEl.style.left = (ev.clientX - w / 2) + 'px';
  drag.ghostEl.style.top = (ev.clientY - h / 2) + 'px';

  const hovered = findHoveredSlot(ev.clientX, ev.clientY);
  cellSlotEls.forEach((s) => { if (s) s.classList.remove('race-cell-slot--drop-ok', 'race-cell-slot--reject-hover'); });
  drag.hoveredIndex = hovered;
  if (hovered != null) {
    const occupied = hovered === level.target || (!!cellBlocks[hovered] && !(drag.kind === 'cell' && drag.index === hovered));
    const slot = cellSlotEls[hovered];
    if (slot) slot.classList.add(occupied ? 'race-cell-slot--reject-hover' : 'race-cell-slot--drop-ok');
  }
}

function resolveDrop(session, hoveredIndex) {
  if (hoveredIndex == null) {
    if (session.kind === 'cell') {
      cellBlocks[session.index] = null;
      level.supply[session.type] += 1;
      apiRef.sfx.click();
    }
    return;
  }
  if (hoveredIndex === level.target) { rejectShake(hoveredIndex); return; }
  const occupied = !!cellBlocks[hoveredIndex] && !(session.kind === 'cell' && session.index === hoveredIndex);
  if (occupied) { rejectShake(hoveredIndex); return; }
  if (session.kind === 'tray') {
    if (level.supply[session.type] <= 0) return;
    level.supply[session.type] -= 1;
    cellBlocks[hoveredIndex] = session.type;
  } else if (session.kind === 'cell') {
    cellBlocks[session.index] = null;
    cellBlocks[hoveredIndex] = session.type;
  }
  apiRef.sfx.snap();
}

function onPointerUp(ev) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  const session = drag;
  if (!session.dragStarted) {
    cleanupDrag();
    if (session.kind === 'tray') handleTrayTap(session.type);
    else if (session.kind === 'cell') handleOccupiedTap(session.index);
    else if (session.kind === 'cell-empty') { if (armed) placeArmedAt(session.index); }
    return;
  }
  const hoveredIndex = session.hoveredIndex;
  cleanupDrag();
  resolveDrop(session, hoveredIndex);
  refreshUI();
}

function onPointerCancel(ev) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  cleanupDrag();
}

function cleanupDrag() {
  if (!drag) return;
  if (drag.ghostEl) drag.ghostEl.remove();
  if (drag.kind === 'cell' && drag.sourceEl) drag.sourceEl.classList.remove('race-chip-hidden');
  cellSlotEls.forEach((s) => { if (s) s.classList.remove('race-cell-slot--drop-ok', 'race-cell-slot--reject-hover'); });
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerCancel);
  drag = null;
}

/* -------------------------------------------------------------------------
 * UI 刷新
 * ------------------------------------------------------------------------- */
function updateRunButtonState() {
  const btn = containerRef && containerRef.querySelector('#race-run-btn');
  if (!btn) return;
  btn.disabled = running || !cellBlocks[0];
}

function updateStatusHint() {
  if (running) return;
  const statusEl = containerRef && containerRef.querySelector('#race-status');
  if (!statusEl) return;
  if (armed) {
    statusEl.textContent = armed.kind === 'tray'
      ? `已选中【${BLOCK_DEFS[armed.type].label}】，点一个空格放置它吧！`
      : '已拿起这块指令，点一个空格移动它，或点 × 收回仓库。';
  } else if (!cellBlocks[0]) {
    statusEl.textContent = '把指令块拖到轨道格上，先从起点格开始试试！';
  } else {
    statusEl.textContent = '按 ▶ 运行，看看机器人怎么接力！';
  }
}

/** 编辑阶段(非运行中)状态变更后的统一刷新:重绘托盘/格子内容 + 按钮态 + 提示文案。 */
function refreshUI() {
  renderTray();
  renderCells();
  updateRunButtonState();
  updateStatusHint();
}

/** 运行阶段用:只刷新托盘/格子/按钮态与可交互性,不覆盖运行过程里设置的状态文案。 */
function renderInteractive() {
  renderTray();
  renderCells();
  updateRunButtonState();
  const trayEl = containerRef && containerRef.querySelector('#race-tray');
  if (trayEl) { trayEl.style.opacity = running ? '.5' : ''; trayEl.style.pointerEvents = running ? 'none' : ''; }
  cellSlotEls.forEach((s) => { if (s) s.style.pointerEvents = running ? 'none' : ''; });
}

/* -------------------------------------------------------------------------
 * 执行可视化:roverTop 逐格跳动 + 当前执行块高亮 + 走过的轨迹画弧线
 * ------------------------------------------------------------------------- */
function setRoverFace(face) {
  if (roverRotEl) roverRotEl.innerHTML = roverTop({ face });
}

function applyRoverAngle(instant) {
  if (!roverRotEl) return;
  if (instant) roverRotEl.style.transition = 'none';
  roverRotEl.style.transform = `rotate(${angleDeg}deg)`;
  if (instant) { void roverRotEl.offsetWidth; roverRotEl.style.transition = ''; }
}

function turnRoverTowards(delta) {
  const targetBase = delta >= 0 ? 90 : -90;
  const diff = ((targetBase - angleDeg) % 360 + 540) % 360 - 180;
  angleDeg += diff;
  applyRoverAngle();
}

function placeRoverInstant(index) {
  if (!roverPosEl) return;
  roverPosEl.style.transition = 'none';
  roverPosEl.style.left = `${xPercent(index)}%`;
  void roverPosEl.offsetWidth;
  roverPosEl.style.transition = '';
}

function moveRoverHop(fromIdx, toIdx) {
  return new Promise((resolve) => {
    const ms = 260 + Math.abs(toIdx - fromIdx) * 130;
    roverPosEl.style.transitionDuration = `${ms}ms`;
    roverPosEl.style.left = `${xPercent(toIdx)}%`;
    setTimeout(resolve, ms);
  });
}

function appendTrailArc(fromIdx, toIdx) {
  if (!trailSvgEl) return;
  const x0 = trackCellX(fromIdx), x1 = trackCellX(toIdx);
  const y = TY + TH / 2;
  const midX = (x0 + x1) / 2;
  const arcHeight = Math.min(46, 16 + Math.abs(toIdx - fromIdx) * 8);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M ${x0} ${y} Q ${midX} ${y - arcHeight} ${x1} ${y}`);
  path.setAttribute('class', 'race-trail-path');
  trailSvgEl.appendChild(path);
}

function setExecutingHighlight(index, on) {
  const slot = cellSlotEls[index];
  if (!slot) return;
  const chip = slot.querySelector('.race-block-chip');
  if (!chip) return;
  chip.classList.toggle('race-block-chip--executing', on);
}

async function spinDizzy() {
  if (!roverRotEl) return;
  const base = angleDeg;
  angleDeg = base + 360;
  applyRoverAngle();
  await wait(560);
  if (destroyed || !roverRotEl) return;
  angleDeg = base;
  applyRoverAngle(true);
}

/* -------------------------------------------------------------------------
 * 执行规则:落格 i 执行格 i 的块 → 位移 → 落格执行新格的块……
 * 落空格(非目标)= 停机失败;越出轨道边界 = 停机失败;>15 步未到 = 死循环。
 * ------------------------------------------------------------------------- */
async function runProgram() {
  if (running || destroyed) return;
  if (!cellBlocks[0]) { apiRef.mascot.say('先在起点格放一块指令块吧！', 'think'); return; }
  running = true;
  armed = null;
  renderInteractive();
  if (trailSvgEl) trailSvgEl.innerHTML = '';
  placeRoverInstant(0);
  setRoverFace('happy');
  angleDeg = 90;
  applyRoverAngle(true);
  const statusEl = containerRef.querySelector('#race-status');
  statusEl.textContent = '出发咯，一格接一格地执行指令！';
  await wait(220);

  let pos = 0, hops = 0;
  while (!destroyed) {
    const type = cellBlocks[pos];
    if (!type) break; // 安全兜底,理论上只会发生在起点未配置时(已在函数开头拦截)
    setExecutingHighlight(pos, true);
    await wait(EXEC_HIGHLIGHT_MS);
    if (destroyed) return;
    setExecutingHighlight(pos, false);

    const delta = BLOCK_DEFS[type].delta;
    const nextPos = pos + delta;
    hops++;

    if (nextPos < 0 || nextPos >= level.length) {
      setRoverFace('oops');
      statusEl.textContent = '指令想把机器人送出轨道外，程序停机了！调整一下指令块，再试试。';
      apiRef.fail('off-track');
      break;
    }

    turnRoverTowards(delta);
    await moveRoverHop(pos, nextPos);
    if (destroyed) return;
    appendTrailArc(pos, nextPos);
    pos = nextPos;

    if (pos === level.target) {
      setRoverFace('happy');
      apiRef.sfx.success();
      const diff = hops - level.optimalHops;
      const stars = diff <= 0 ? 3 : diff === 1 ? 2 : 1;
      statusEl.textContent = `到达目标啦！一共接力了 ${hops} 块指令。`;
      apiRef.mascot.say('抵达目标啦！', 'cheer');
      await wait(650);
      if (destroyed) return;
      apiRef.complete(stars);
      running = false;
      renderInteractive();
      return;
    }

    if (!cellBlocks[pos]) {
      setRoverFace('oops');
      statusEl.textContent = '落在了空格上，程序停机了！调整一下指令块，再试试。';
      apiRef.fail('empty-cell-stop');
      break;
    }

    if (hops >= MAX_HOPS) {
      setRoverFace('oops');
      statusEl.textContent = '程序转圈圈啦！是不是有指令块让它一直来回走？';
      apiRef.fail('infinite-loop');
      await spinDizzy();
      break;
    }

    await wait(STEP_GAP_MS);
  }
  running = false;
  renderInteractive();
}

export default {
  id: 'race',
  title: '机关轨道',
  icon: '🏁',

  init(container, api) {
    injectStylesOnce();
    destroyed = false;
    running = false;
    apiRef = api;
    containerRef = container;
    armed = null;
    drag = null;

    const lvl = (api.level === 2 || api.level === 3) ? api.level : 1;
    level = generateLevel(lvl);
    cellBlocks = new Array(level.length).fill(null);
    angleDeg = 90;

    buildDOM(container);
    renderScene();
    refreshUI();

    container.querySelector('#race-run-btn').addEventListener('click', () => {
      apiRef.sfx.click();
      runProgram();
    });

    apiRef.mascot.say('把指令块拖到轨道格上，先从起点格开始试试！', 'idle');

    // 测试专用只读/操作钩子：仅在 window.__LSFA_TEST__ 显式为 true 时挂载，生产环境不受影响，
    // 供自动化自查脚本读取关卡布局、直接摆放指令块、触发运行，不改变任何正常玩法逻辑。
    if (typeof window !== 'undefined' && window.__LSFA_TEST__) {
      window.__lsfaRace = {
        get level() { return level; },
        get cellBlocks() { return cellBlocks; },
        placeAt(index, type) { cellBlocks[index] = type; level.supply[type] = Math.max(0, level.supply[type] - 1); refreshUI(); },
        run() { return runProgram(); },
      };
    }
  },

  destroy() {
    destroyed = true;
    running = false;
    cleanupDrag();
    containerRef = null;
    apiRef = null;
    roverPosEl = null; roverRotEl = null; trailSvgEl = null;
    cellSlotEls = [];
    level = null; cellBlocks = [];
    armed = null;
  },
};
