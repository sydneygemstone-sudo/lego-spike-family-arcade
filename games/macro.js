/* games/macro.js
 * 口诀大师 —— 先定义一个 My Block（3-5 个动作 + 命名），再用它（+基础积木）拼出一条
 * 含重复片段的长路径。两个 blocks-ui 序列区：定义区 + 主程序区（合同 §6 支持多序列区）。
 * 场景美术全部来自 assets/art.js：底部执行步道用 trackScene（无瓷砖简化版）+ roverTop
 * （俯视机器人，nested-svg 叠加 + CSS transform 补间走位/转向）。目标路径条本身是文字线索
 * 卡片（非场景美术），用纯 Unicode 箭头（非 emoji）标注方向，重复片段同色描边框分组。
 * 协议见 API.md：export default {id,title,icon,init,destroy}。
 */

import { createTray, createSequence } from '../js/blocks-ui.js';
import * as Art from '../assets/art.js';

const ACTIONS = ['fwd', 'left', 'right'];
const ACTION_META = {
  fwd: { label: 'Move Forward', icon: '⬆️', color: 'blue' },
  left: { label: 'Turn Left', icon: '⬅️', color: 'green' },
  right: { label: 'Turn Right', icon: '➡️', color: 'orange' },
};
// 目标路径条用的方向符号——普通 Unicode 箭头，不是 emoji，场景/线索区都能安全使用。
const TRAIL_ICON = { fwd: '↑', left: '←', right: '→' };
const MACRO_NAME_PRESETS = [
  { name: '火箭步', icon: '🚀' },
  { name: '兔子跳', icon: '🐇' },
  { name: '忍者踏', icon: '🥷' },
  { name: '超级招式', icon: '⭐' },
];

function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function baseBlockDefs() {
  return ACTIONS.map((id) => ({ id, label: ACTION_META[id].label, icon: ACTION_META[id].icon, color: ACTION_META[id].color }));
}

function buildLevelPlan() {
  const unitLen = randInt(3, 5);
  const unit = Array.from({ length: unitLen }, () => pick(ACTIONS));
  const repeatCount = randInt(3, 4);
  const prefixLen = randInt(0, 2);
  const suffixLen = randInt(0, 2);
  const prefix = Array.from({ length: prefixLen }, () => pick(ACTIONS));
  const suffix = Array.from({ length: suffixLen }, () => pick(ACTIONS));

  const target = [];
  prefix.forEach((t) => target.push({ type: t, segment: 'prefix' }));
  for (let k = 0; k < repeatCount; k++) {
    unit.forEach((t) => target.push({ type: t, segment: 'repeat', groupIndex: k }));
  }
  suffix.forEach((t) => target.push({ type: t, segment: 'suffix' }));

  const optimalCount = prefixLen + repeatCount + suffixLen;
  return { target, optimalCount };
}

/* -------------------------------------------------------------------------- 执行步道几何 --------------------------------------------------------------------------
 * 复用 art.js 的 trackScene（tiles 全传 null 即为无瓷砖简化跑道）+ trackCellX 定位 +
 * roverTop 俯视机器人。roverTop 默认朝北（north），跑道是水平方向，所以基准角要
 * 加 90°（朝东）；每次 left/right 指令在基准角上叠加 ∓90° 做原地转向的补间演示。
 * -------------------------------------------------------------------------- */
const TRACK_CELL_CENTER_Y = 60 + 110 / 2; // trackScene 内 ty=60, th=110
const ROVER_BASE_DEG = 90;

function buildStageMarkup(cellCount) {
  const tiles = Array(cellCount).fill(null);
  const base = Art.trackScene({ tiles });
  const startX = Art.trackCellX(0);
  const roverInner = Art.roverTop({ face: 'idle' })
    .replace('<svg ', `<svg x="${(startX - 32).toFixed(1)}" y="${(TRACK_CELL_CENTER_Y - 35).toFixed(1)}" width="64" height="71" `);
  const wrapped = `<g id="macro-rover-nest" style="transform-origin:${startX}px ${TRACK_CELL_CENTER_Y}px; transition: transform .4s ease;">${roverInner}</g>`;
  return base.replace('</svg>', `${wrapped}</svg>`);
}

/* -------------------------------------------------------------------------- 样式（只注入一次） -------------------------------------------------------------------------- */
let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .macro-stage-card { padding-top:22px; }
    .macro-stage { max-height:56vh; display:flex; background:var(--paper-50); border-radius:14px; overflow:hidden; }
    .macro-stage svg { width:100%; height:auto; display:block; }
    .macro-section { margin-top: 16px; }
    .macro-section--dim { opacity:.45; pointer-events:none; filter: grayscale(.4); }
    .macro-trail-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; padding: 6px 2px 10px; }
    .macro-trail { display:flex; align-items:center; gap:6px; width:max-content; padding: 4px 2px; }
    .macro-repeat-group {
      display:flex; gap:4px; padding:5px; margin:0 3px; border-radius:12px;
      border:3px solid var(--cat-macro,#E0218A); background: rgba(224,33,138,.08);
    }
    .macro-trail-cell {
      position:relative; width:36px; height:36px; border-radius:10px;
      display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800;
      background: var(--paper-100); border:2px solid var(--ink-300); color: var(--ink-900);
      transition: background .2s ease, transform .2s ease, border-color .2s ease;
    }
    .macro-trail-cell--active { transform: scale(1.18); border-color: var(--cat-macro,#E0218A); background:#FFD9EC; }
    .macro-trail-cell--done { border-color: var(--lego-green,#237841); background:#DFF3E5; }
    .macro-trail-cell--bad { border-color: var(--lego-red,#D01012); background:#FFE0E0; }
    .macro-name-picker { display:flex; gap:10px; flex-wrap:wrap; margin-top:8px; }
    .macro-name-btn {
      display:flex; flex-direction:column; align-items:center; gap:2px; min-width:76px;
    }
    .macro-name-btn .n-icon { font-size:26px; }
    .macro-def-summary { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .macro-def-summary .badge-hex { width:52px; height:60px; font-size:22px; }
    .macro-def-actions { display:flex; gap:4px; font-size:20px; }
    .brick-block--flip { animation: macro-flip .5s ease; }
    @keyframes macro-flip {
      0%   { transform: scale(1) rotateY(0deg); }
      45%  { transform: scale(1.12) rotateY(180deg); box-shadow: 0 0 0 4px var(--lego-yellow,#F5C518); }
      100% { transform: scale(1) rotateY(360deg); }
    }
    .macro-expand-stage {
      display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-height:44px;
      padding:8px 12px; border-radius:12px; background:#FFF3DA; border:2px dashed var(--cat-macro,#E0218A);
      margin-top:8px;
    }
    .macro-expand-stage .exp-icon { font-size:22px; opacity:.25; transition: opacity .18s ease, transform .18s ease; }
    .macro-expand-stage .exp-icon--lit { opacity:1; transform: scale(1.2); }
    .macro-locked { pointer-events:none; opacity:.7; }
  `;
  document.head.appendChild(style);
}

function wait(ms, timers) {
  return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); });
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  const plan = buildLevelPlan();
  const stageCellCount = plan.target.length + 1;
  let macroDef = null; // {name, icon, actions:[type,...]}
  let defineTray = null;
  let defineSeq = null;
  let mainTray = null;
  let mainSeq = null;
  let running = false;
  let stageIndex = 0;
  let stageTurnDeg = 0;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-macro macro-section">
      <p class="title-sm" style="margin:0 0 8px;">🔍 找一找重复的一组！</p>
      <div class="macro-trail-wrap"><div class="macro-trail" id="macro-target-trail"></div></div>
    </div>

    <div class="brick-card brick-card--cat-macro macro-stage-card">
      <p class="title-sm" style="margin:0 0 8px;">🤖 运行时看机器人怎么按你的程序走位！</p>
      <div class="macro-stage" id="macro-stage-box"></div>
    </div>

    <div class="brick-card brick-card--pink macro-section" id="macro-define-card">
      <p class="title-sm" style="margin:0;">① 拖 3-5 个动作，定义你的 My Block</p>
      <div id="macro-define-tray"></div>
      <div id="macro-define-seq"></div>
      <button class="brick-btn brick-btn--purple" id="macro-confirm-btn" disabled>✅ 确认宏</button>
      <div class="macro-name-picker" id="macro-name-picker" style="display:none;"></div>
      <div class="macro-def-summary" id="macro-def-summary" style="display:none; margin-top:10px;"></div>
    </div>

    <div class="brick-card brick-card--cat-macro macro-section macro-section--dim" id="macro-main-card">
      <p class="title-sm" style="margin:0;">② 用积木铺路，闯关！（善用 My Block 能少摆很多张卡）</p>
      <div id="macro-main-tray"></div>
      <div id="macro-main-seq"></div>
      <div class="macro-expand-stage" id="macro-expand-stage" style="display:none;"></div>
      <div class="flex-row gap-3" style="margin-top:10px;">
        <button class="brick-btn brick-btn--blue brick-btn--lg" id="macro-run-btn" disabled>▶ 运行</button>
        <button class="brick-btn brick-btn--gray brick-btn--sm" id="macro-clear-btn">清空</button>
      </div>
    </div>
  `;

  const stageBox = container.querySelector('#macro-stage-box');
  const targetTrailEl = container.querySelector('#macro-target-trail');
  const defineCard = container.querySelector('#macro-define-card');
  const confirmBtn = container.querySelector('#macro-confirm-btn');
  const namePicker = container.querySelector('#macro-name-picker');
  const defSummary = container.querySelector('#macro-def-summary');
  const mainCard = container.querySelector('#macro-main-card');
  const expandStage = container.querySelector('#macro-expand-stage');
  const runBtn = container.querySelector('#macro-run-btn');
  const clearBtn = container.querySelector('#macro-clear-btn');

  // ---- 执行步道（场景）----
  stageBox.innerHTML = buildStageMarkup(stageCellCount);
  const roverNestEl = stageBox.querySelector('#macro-rover-nest');
  function resetStage() {
    stageIndex = 0;
    stageTurnDeg = 0;
    roverNestEl.style.transition = 'none';
    roverNestEl.style.transform = `rotate(${ROVER_BASE_DEG}deg)`;
    // 强制回流后恢复过渡，避免下一次真正移动时也被 transition:none 吃掉
    void roverNestEl.getBoundingClientRect();
    roverNestEl.style.transition = 'transform .4s ease';
  }
  function advanceStage(actionType) {
    stageIndex += 1;
    if (actionType === 'left') stageTurnDeg -= 90;
    else if (actionType === 'right') stageTurnDeg += 90;
    const dx = Art.trackCellX(stageIndex) - Art.trackCellX(0);
    roverNestEl.style.transform = `translate(${dx}px, 0) rotate(${ROVER_BASE_DEG + stageTurnDeg}deg)`;
  }
  resetStage();

  // ---- 目标路径展示（重复片段同色描边框分组）----
  function cellHTML(item, idx) {
    return `<div class="macro-trail-cell" data-i="${idx}">${TRAIL_ICON[item.type]}</div>`;
  }
  function renderTargetTrail() {
    const html = [];
    let i = 0;
    while (i < plan.target.length) {
      const item = plan.target[i];
      if (item.segment === 'repeat') {
        const gIdx = item.groupIndex;
        const startI = i;
        const groupCells = [];
        while (i < plan.target.length && plan.target[i].segment === 'repeat' && plan.target[i].groupIndex === gIdx) {
          groupCells.push(plan.target[i]);
          i += 1;
        }
        html.push(`<div class="macro-repeat-group">${groupCells.map((c, ci) => cellHTML(c, startI + ci)).join('')}</div>`);
      } else {
        html.push(cellHTML(item, i));
        i += 1;
      }
    }
    targetTrailEl.innerHTML = html.join('');
  }
  renderTargetTrail();

  // ---- 阶段①：定义 My Block ----
  defineTray = createTray(container.querySelector('#macro-define-tray'), baseBlockDefs());
  defineSeq = createSequence(container.querySelector('#macro-define-seq'), { maxSlots: 5, emptyText: '把动作积木拖到这里，摆 3-5 个 →' });
  defineSeq.onChange((list) => {
    confirmBtn.disabled = !(list.length >= 3 && list.length <= 5);
  });

  // 测试专用只读钩子（同 games/hunt.js 的约定）：仅在 window.__LSFA_TEST__ 显式为 true 时挂载，
  // 生产环境不受影响。暴露目标路径 plan 与两个序列区 handle，供自动化脚本跳过真实拖拽直接
  // 调用 addBlock/setSequence 驱动关卡。
  if (typeof window !== 'undefined' && window.__LSFA_TEST__) {
    window.__lsfaMacro = { plan, defineSeq };
  }

  confirmBtn.addEventListener('click', () => {
    if (confirmBtn.disabled) return;
    api.sfx.click();
    namePicker.style.display = 'flex';
    namePicker.innerHTML = MACRO_NAME_PRESETS.map((p, i) => `
      <button class="brick-btn brick-btn--yellow macro-name-btn" data-i="${i}">
        <span class="n-icon">${p.icon}</span><span>${p.name}</span>
      </button>
    `).join('');
    confirmBtn.disabled = true;
    namePicker.querySelectorAll('.macro-name-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = MACRO_NAME_PRESETS[Number(btn.dataset.i)];
        finalizeMacro(preset);
      });
    });
    api.mascot.say('给它取个名字吧！', 'happy');
  });

  function finalizeMacro(preset) {
    const seqSnapshot = defineSeq.getSequence();
    macroDef = { name: preset.name, icon: preset.icon, actions: seqSnapshot.map((b) => b.type) };
    api.sfx.success();
    namePicker.style.display = 'none';
    defSummary.style.display = 'flex';
    defSummary.innerHTML = `
      <div class="badge-hex" style="--badge-color: var(--cat-macro);">${macroDef.icon}</div>
      <div>
        <div class="title-sm">${macroDef.name}</div>
        <div class="macro-def-actions">${macroDef.actions.map((t) => ACTION_META[t].icon).join('')}</div>
      </div>
      <button class="brick-btn brick-btn--gray brick-btn--sm" id="macro-redefine-btn">🔄 重新定义</button>
    `;
    container.querySelector('#macro-redefine-btn').addEventListener('click', resetToDefinePhase);

    // 定义区变成只读展示
    container.querySelector('#macro-define-tray').style.display = 'none';
    container.querySelector('#macro-define-seq').style.display = 'none';
    confirmBtn.style.display = 'none';

    mainCard.classList.remove('macro-section--dim');
    setupMainPhase();
    api.mascot.say('太棒了！现在用它去闯关吧！', 'cheer');
  }

  function resetToDefinePhase() {
    api.sfx.click();
    macroDef = null;
    if (mainSeq) { mainSeq.destroy(); mainSeq = null; }
    mainCard.classList.add('macro-section--dim');
    container.querySelector('#macro-main-tray').innerHTML = '';
    container.querySelector('#macro-main-seq').innerHTML = '';
    runBtn.disabled = true;
    expandStage.style.display = 'none';
    resetStage();

    container.querySelector('#macro-define-tray').style.display = '';
    container.querySelector('#macro-define-seq').style.display = '';
    confirmBtn.style.display = '';
    confirmBtn.disabled = true;
    defSummary.style.display = 'none';
    defineSeq.clear();
    api.mascot.say('重新拖几个动作定义 My Block 吧！', 'idle');
  }

  // ---- 阶段②：主程序 ----
  function setupMainPhase() {
    const trayEl = container.querySelector('#macro-main-tray');
    const seqEl = container.querySelector('#macro-main-seq');
    trayEl.innerHTML = '';
    seqEl.innerHTML = '';
    const defs = [...baseBlockDefs(), { id: 'myblock', label: macroDef.name, icon: macroDef.icon, color: 'pink' }];
    mainTray = createTray(trayEl, defs);
    mainSeq = createSequence(seqEl, { maxSlots: 30, emptyText: '拼出完整路径吧（可以用 My Block 省很多张卡）→' });
    mainSeq.onChange((list) => {
      runBtn.disabled = running || list.length === 0;
    });

    if (typeof window !== 'undefined' && window.__LSFA_TEST__ && window.__lsfaMacro) {
      window.__lsfaMacro.mainSeq = mainSeq;
      window.__lsfaMacro.macroDef = macroDef;
    }
  }

  function expandSequence(list) {
    const flat = [];
    list.forEach((item) => {
      if (item.type === 'myblock' && macroDef) flat.push(...macroDef.actions);
      else flat.push(item.type);
    });
    return flat;
  }

  function sequencesEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  async function flashTrailBad() {
    const cells = Array.from(targetTrailEl.querySelectorAll('.macro-trail-cell'));
    cells.forEach((c) => c.classList.add('macro-trail-cell--bad'));
    await wait(500, timers);
    if (cancelled) return;
    cells.forEach((c) => c.classList.remove('macro-trail-cell--bad'));
  }

  async function runProgram() {
    if (running) return;
    const list = mainSeq.getSequence();
    if (list.length === 0) return;
    const flat = expandSequence(list);
    const targetTypes = plan.target.map((t) => t.type);

    if (!sequencesEqual(flat, targetTypes)) {
      api.fail('sequence-mismatch');
      api.mascot.say('顺序不太对，再检查一下吧！', 'oops');
      flashTrailBad();
      return;
    }

    running = true;
    runBtn.disabled = true;
    container.querySelector('#macro-main-tray').classList.add('macro-locked');
    resetStage();
    api.mascot.say('运行中……', 'think', 1400);

    const cells = Array.from(targetTrailEl.querySelectorAll('.macro-trail-cell'));
    let trailIndex = 0;

    async function highlightOne(actionType) {
      const cell = cells[trailIndex];
      if (cell) {
        cell.classList.add('macro-trail-cell--active');
        api.sfx.click();
      }
      advanceStage(actionType);
      await wait(230, timers);
      if (cancelled) return;
      if (cell) {
        cell.classList.remove('macro-trail-cell--active');
        cell.classList.add('macro-trail-cell--done');
      }
      trailIndex += 1;
    }

    const mainSeqEl = container.querySelector('#macro-main-seq');
    for (const item of list) {
      if (cancelled) return;
      if (item.type === 'myblock') {
        const tile = mainSeqEl.querySelector(`[data-uid="${item.uid}"]`);
        if (tile) tile.classList.add('brick-block--flip');
        expandStage.style.display = 'flex';
        expandStage.innerHTML = `<strong>${macroDef.icon} ${macroDef.name} 展开：</strong>` +
          macroDef.actions.map((t) => `<span class="exp-icon">${ACTION_META[t].icon}</span>`).join('');
        const expIcons = Array.from(expandStage.querySelectorAll('.exp-icon'));
        for (let i = 0; i < macroDef.actions.length; i++) {
          if (cancelled) return;
          expIcons[i].classList.add('exp-icon--lit');
          await highlightOne(macroDef.actions[i]);
          if (cancelled) return;
        }
        await wait(260, timers);
        if (cancelled) return;
        expandStage.style.display = 'none';
        if (tile) tile.classList.remove('brick-block--flip');
      } else {
        await highlightOne(item.type);
        if (cancelled) return;
      }
    }

    await wait(300, timers);
    if (cancelled) return;

    const usedMacro = list.some((it) => it.type === 'myblock');
    const usedCount = list.length;
    const diff = usedCount - plan.optimalCount;
    const stars = usedMacro && diff <= 0 ? 3 : diff <= 3 ? 2 : 1;

    api.mascot.say('闯关成功！', 'cheer');
    api.complete(stars);
  }

  runBtn.addEventListener('click', () => { api.sfx.click(); runProgram(); });
  clearBtn.addEventListener('click', () => {
    if (running) return;
    api.sfx.click();
    if (mainSeq) mainSeq.clear();
    resetStage();
    const cells = Array.from(targetTrailEl.querySelectorAll('.macro-trail-cell'));
    cells.forEach((c) => c.classList.remove('macro-trail-cell--done', 'macro-trail-cell--active', 'macro-trail-cell--bad'));
  });

  api.mascot.say('先看看目标路径有没有重复的一组，再定义 My Block 吧！', 'idle', 4500);

  return {
    destroy() {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
      if (defineSeq) defineSeq.destroy();
      if (mainSeq) mainSeq.destroy();
    },
  };
}

let activeHandle = null;

export default {
  id: 'macro',
  title: '口诀大师',
  icon: '📜',
  init(container, api) {
    injectStylesOnce();
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
