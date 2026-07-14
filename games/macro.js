/* games/macro.js
 * 口诀大师 —— 先定义 My Block（3-5 个动作 + 命名），再用它（+基础积木）拼出一条
 * 含重复片段的长路径。blocks-ui 序列区支持多个独立实例（合同 §6），L3 用两个定义槽。
 * 场景美术全部来自 assets/art.js：底部执行步道用 trackScene（无瓷砖简化版）+ roverTop
 * （俯视机器人，nested-svg 叠加 + CSS transform 补间走位/转向）。目标路径条本身是文字线索
 * 卡片（非场景美术），用纯 Unicode 箭头（非 emoji）标注方向，统一平铺展示、不做重复片段
 * 分组视觉提示——找规律是留给孩子自己琢磨的认知训练，不在题面上剧透答案。
 * 协议见 API.md：export default {id,title,icon,init,destroy}。
 *
 * v3 加 Level（games-v3-redesign §六）：
 *   L1 现状（周期明显，unitLen 3-5 × 3-4 次 + 0-2 前后缀装饰）。
 *   L2 更长序列（14-18 步）、周期固定 4、前后缀变成"干扰"（各 1-3 步，必现不再是装饰）。
 *   L3 双宏：两个 My Block 定义槽（各自命名），目标路径含两种不同重复模式段交错
 *      （AABB 段：motifA×2+motifB×2；CDC 段：motifA·motifB·motifA 交错），最优解需要两个
 *      宏都用上。星级：双宏且卡数≤最优 3★ / 单宏或多卡 2★ / 完成 1★。
 */

import { createTray, createSequence } from '../js/blocks-ui.js';
import { advanceMacroPose, judgeMacroProgram, scoreMacroProgram } from '../js/program-ast.js';
import * as Art from './mission-art.js';

const ACTIONS = ['fwd', 'left', 'right'];
const ACTION_META = {
  fwd: { label: 'Move Forward', icon: '↑', color: 'blue' },
  left: { label: 'Turn Left', icon: '←', color: 'green' },
  right: { label: 'Turn Right', icon: '→', color: 'orange' },
};
// 目标路径条用的方向符号——普通 Unicode 箭头，不是 emoji，场景/线索区都能安全使用。
const TRAIL_ICON = { fwd: '↑', left: '←', right: '→' };
const MACRO_NAME_PRESETS = [
  { name: '向量 A', icon: 'A' },
  { name: '向量 B', icon: 'B' },
  { name: '序列 X', icon: 'X' },
  { name: '序列 Y', icon: 'Y' },
];

let randSource = null;
function randInt(a, b) { return randSource?.int ? randSource.int(a, b) : a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return randSource?.pick ? randSource.pick(arr) : arr[randInt(0, arr.length - 1)]; }
function baseBlockDefs() {
  return ACTIONS.map((id) => ({ id, label: ACTION_META[id].label, icon: ACTION_META[id].icon, color: ACTION_META[id].color }));
}
function sameSeq(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/* -------------------------------------------------------------------------- L1：现状 -------------------------------------------------------------------------- */
function buildPlanL1() {
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
  return { target, optimalCount, topLevelBudget: optimalCount + 1, requiredMacroInvocations: repeatCount, macroSlotCount: 1 };
}

/* -------------------------------------------------------------------------- L2：更长序列、周期固定 4、干扰前后缀 --------------------------------------------------------------------------
 * 周期 4 单元重复 3 次（=12 步核心）+ 前后缀各 1-3 步干扰，总长恰好落在 14-18 步。 */
function buildPlanL2() {
  const unitLen = 4;
  const unit = Array.from({ length: unitLen }, () => pick(ACTIONS));
  const repeatCount = 3;
  const prefixLen = randInt(1, 3);
  const suffixLen = randInt(1, 3);
  const prefix = Array.from({ length: prefixLen }, () => pick(ACTIONS));
  const suffix = Array.from({ length: suffixLen }, () => pick(ACTIONS));

  const target = [];
  prefix.forEach((t) => target.push({ type: t, segment: 'prefix' }));
  for (let k = 0; k < repeatCount; k++) {
    unit.forEach((t) => target.push({ type: t, segment: 'repeat', groupIndex: k }));
  }
  suffix.forEach((t) => target.push({ type: t, segment: 'suffix' }));

  const optimalCount = prefixLen + repeatCount + suffixLen;
  return { target, optimalCount, topLevelBudget: optimalCount, requiredMacroInvocations: repeatCount, macroSlotCount: 1 };
}

/* -------------------------------------------------------------------------- L3：双宏，两种模式段交错 --------------------------------------------------------------------------
 * motifA/motifB 各 2-3 步、互不相同。
 * 段一（"AABB"）：motifA ×2 + motifB ×2；段二（"CDC"）：motifA · motifB · motifA 交错。
 * 最优解 = 定义两个 My Block（=motifA/motifB）分别用 2 次 + 2 次（段一）+ 1 次 + 1 次 + 1 次（段二）
 * = 7 张宏卡，比逐步摆放（4|A|+3|B| 个基础块）省很多张。 */
function buildPlanL3() {
  function makeMotif() {
    const len = randInt(2, 3);
    return Array.from({ length: len }, () => pick(ACTIONS));
  }
  let motifA = makeMotif();
  let motifB = makeMotif();
  let guard = 0;
  while (sameSeq(motifA, motifB) && guard < 12) { motifB = makeMotif(); guard++; }

  const target = [];
  const push = (arr, segment, groupIndex) => arr.forEach((t) => target.push({ type: t, segment, groupIndex }));
  push(motifA, 'AABB', 0); push(motifA, 'AABB', 1);
  push(motifB, 'AABB', 2); push(motifB, 'AABB', 3);
  push(motifA, 'CDC', 0); push(motifB, 'CDC', 1); push(motifA, 'CDC', 2);

  const optimalCount = 4 + 3; // 段一 4 张宏卡 + 段二 3 张宏卡（都用宏时的最省张数）
  return { target, optimalCount, topLevelBudget: optimalCount, requiredMacroInvocations: optimalCount, macroSlotCount: 2 };
}

export function buildMacroLevelPlan(level, suppliedRand = null) {
  randSource = suppliedRand;
  const mission = Math.max(1, Math.min(10, Number(level) || 1));
  const tier = mission <= 3 ? 1 : mission <= 6 ? 2 : 3;
  if (tier === 3) return { ...buildPlanL3(), mission, tier };
  if (tier === 2) return { ...buildPlanL2(), mission, tier };
  return { ...buildPlanL1(), mission, tier };
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
    .macro-section { margin-top: 0; }
    .macro-section--dim { opacity:.45; pointer-events:none; filter: grayscale(.4); }

    .macro-page { display:flex; flex-direction:column; gap:16px; }
    .macro-left, .macro-right { display:flex; flex-direction:column; gap:16px; }

    /* 横屏短视口（如 1024×768）：目标路径 + 场景 + 定义宏 + 主程序几张卡竖排叠加会大幅
     * 超出 768 高，改成"观察区"（目标路径+场景）左 · "操作区"（定义宏+主程序）右两栏，
     * 参照 games/claw.js 同一断点做法，两栏各自继续纵向堆叠、间距/字号收紧。 */
    @media (min-width: 700px) and (max-height: 840px) {
      .macro-page { flex-direction:row; align-items:stretch; gap:12px; }
      .macro-left, .macro-right { flex:1 1 0; min-width:0; gap:8px; }
      .macro-right { justify-content:center; }
      .macro-left .brick-card, .macro-right .brick-card { padding: 12px var(--space-3) 8px; }
      .macro-stage-card { padding-top:12px; }
      .macro-stage { max-height:26vh; }
      .macro-trail-cell { width:26px; height:26px; font-size:14px; }
      .macro-trail-wrap { padding:2px 2px 4px; }
      #macro-define-tray-0 .blocks-tray, #macro-define-tray-1 .blocks-tray, #macro-main-tray .blocks-tray { padding:4px 6px 6px; }
      #macro-define-tray-0 .brick-block, #macro-define-tray-1 .brick-block, #macro-main-tray .brick-block {
        min-width:44px; min-height:36px; padding:5px 7px 4px; font-size:10px; margin-top:5px;
      }
      #macro-define-tray-0 .brick-block .blk-icon, #macro-define-tray-1 .brick-block .blk-icon, #macro-main-tray .brick-block .blk-icon { font-size:13px; }
      #macro-define-seq-0 .blocks-seq, #macro-define-seq-1 .blocks-seq, #macro-main-seq .blocks-seq { min-height:38px; padding:5px 7px; }
      #macro-define-seq-0 .brick-block, #macro-define-seq-1 .brick-block, #macro-main-seq .brick-block {
        min-width:40px; min-height:34px; padding:4px 6px 3px; font-size:9.5px; margin-top:5px;
      }
      .macro-right .brick-btn { min-height:36px; padding:6px 14px; font-size:12.5px; margin-top:4px; }
      .macro-def-summary .badge-hex { width:38px; height:44px; font-size:16px; }
      .macro-name-picker { gap:6px; margin-top:4px; }
      .macro-name-btn { min-width:56px; }
      .macro-name-btn .n-icon { font-size:19px; }
      .macro-expand-stage { min-height:32px; padding:5px 8px; margin-top:5px; }
    }
    .macro-trail-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; padding: 6px 2px 10px; }
    .macro-trail { display:flex; align-items:center; gap:6px; width:max-content; padding: 4px 2px; }
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
    .macro-budget {
      margin:4px 0 0; padding:7px 10px; border-radius:10px; background:#FFF0F7;
      border:2px solid var(--cat-macro,#E0218A); color:#72134A; font-size:12px; font-weight:900;
    }
  `;
  document.head.appendChild(style);
}

function wait(ms, timers) {
  return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); });
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  const plan = buildMacroLevelPlan(api.level, api.rand);
  const macroSlotCount = plan.macroSlotCount; // 1（L1/L2）或 2（L3）
  const stageCellCount = plan.target.length + 1;
  const macroDefs = new Array(macroSlotCount).fill(null); // 每槽 {name, icon, actions:[type,...]} | null
  const defineSeqs = new Array(macroSlotCount).fill(null);
  let mainTray = null;
  let mainSeq = null;
  let running = false;
  let attempts = 0;
  let stageIndex = 0;
  let stageTurnDeg = 0;

  // 单宏（L1/L2）沿用原文案；双宏（L3）每槽独立标题+更短的动作数范围（2-5，比单宏 3-5 略宽松，
  // 方便孩子先试短一点的 motif）。
  const defMinLen = macroSlotCount > 1 ? 2 : 3;
  const defMaxLen = 5;

  const defineCardsHTML = Array.from({ length: macroSlotCount }, (_, i) => {
    const label = macroSlotCount > 1
      ? `① 定义 My Block ${i === 0 ? 'A' : 'B'}（拖 ${defMinLen}-${defMaxLen} 个动作）`
      : '① 拖 3-5 个动作，定义你的 My Block';
    const hideInitially = macroSlotCount > 1 && i > 0;
    return `
    <div class="brick-card brick-card--pink macro-section" id="macro-define-card-${i}"${hideInitially ? ' style="display:none;"' : ''}>
      <p class="title-sm" style="margin:0;">${label}</p>
      <div id="macro-define-tray-${i}"></div>
      <div id="macro-define-seq-${i}"></div>
      <button class="brick-btn brick-btn--purple" id="macro-confirm-btn-${i}" disabled>确认函数</button>
      <div class="macro-name-picker" id="macro-name-picker-${i}" style="display:none;"></div>
      <div class="macro-def-summary" id="macro-def-summary-${i}" style="display:none; margin-top:10px;"></div>
    </div>`;
  }).join('');

  const mainStepLabel = macroSlotCount > 1 ? '③' : '②';
  const mainHideInitially = macroSlotCount > 1; // 双宏：主程序区先整块隐藏，省垂直空间，等两个宏都定义完再出现

  container.innerHTML = `
    <div class="macro-page">
      <div class="macro-left">
        <div class="brick-card brick-card--cat-macro macro-section">
          <p class="title-sm" style="margin:0 0 8px;">PATTERN SCAN / 找出路径中的重复结构</p>
          <div class="macro-trail-wrap"><div class="macro-trail" id="macro-target-trail"></div></div>
        </div>

        <div class="brick-card brick-card--cat-macro macro-stage-card">
          <p class="title-sm" style="margin:0 0 8px;">EXECUTION VIEW / 观察程序展开后的行动</p>
          <div class="macro-stage" id="macro-stage-box"></div>
        </div>
      </div>

      <div class="macro-right">
        ${defineCardsHTML}

        <div class="brick-card brick-card--cat-macro macro-section${mainHideInitially ? '' : ' macro-section--dim'}" id="macro-main-card"${mainHideInitially ? ' style="display:none;"' : ''}>
          <p class="title-sm" style="margin:0;">${mainStepLabel} 用积木铺路，闯关！（善用 My Block 能少摆很多张卡）</p>
          <div id="macro-main-tray"></div>
          <div id="macro-main-seq"></div>
          <p class="macro-budget" id="macro-budget">压缩挑战：0 / ${plan.topLevelBudget} 张可拿满星；正确路线一定可以过关</p>
          <div class="macro-expand-stage" id="macro-expand-stage" style="display:none;"></div>
          <div class="flex-row gap-3 game-action-dock" style="margin-top:10px;">
            <button class="brick-btn brick-btn--blue brick-btn--lg" id="macro-run-btn" disabled>▶ 执行程序</button>
            <button class="brick-btn brick-btn--gray brick-btn--sm" id="macro-clear-btn">清空</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const stageBox = container.querySelector('#macro-stage-box');
  const targetTrailEl = container.querySelector('#macro-target-trail');
  const mainCard = container.querySelector('#macro-main-card');
  const expandStage = container.querySelector('#macro-expand-stage');
  const runBtn = container.querySelector('#macro-run-btn');
  const budgetEl = container.querySelector('#macro-budget');
  const clearBtn = container.querySelector('#macro-clear-btn');

  const confirmBtns = Array.from({ length: macroSlotCount }, (_, i) => container.querySelector(`#macro-confirm-btn-${i}`));
  const namePickers = Array.from({ length: macroSlotCount }, (_, i) => container.querySelector(`#macro-name-picker-${i}`));
  const defSummaries = Array.from({ length: macroSlotCount }, (_, i) => container.querySelector(`#macro-def-summary-${i}`));

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
    const pose = advanceMacroPose({ index: stageIndex, turnDeg: stageTurnDeg }, actionType);
    stageIndex = pose.index;
    stageTurnDeg = pose.turnDeg;
    const dx = Art.trackCellX(stageIndex) - Art.trackCellX(0);
    roverNestEl.style.transform = `translate(${dx}px, 0) rotate(${ROVER_BASE_DEG + stageTurnDeg}deg)`;
  }
  resetStage();

  // ---- 目标路径展示（统一平铺，不做重复片段分组提示——找规律留给孩子自己琢磨）----
  function cellHTML(item, idx) {
    return `<div class="macro-trail-cell" data-i="${idx}">${TRAIL_ICON[item.type]}</div>`;
  }
  function renderTargetTrail() {
    targetTrailEl.innerHTML = plan.target.map((item, idx) => cellHTML(item, idx)).join('');
  }
  renderTargetTrail();

  // ---- 阶段①：定义 My Block（1 或 2 个槽，槽 i+1 要等槽 i 确认完才出现）----
  // 注意：createSequence 的"轻点也能加入"兜底会把块加进"最近一次创建的 createSequence 实例"
  // （合同 §6），所以这里不能像最初写法那样把两个槽的 createTray/createSequence 一次性建完——
  // 那样后建的槽 1 会一直是"最近创建"的那个，槽 0 还在用的时候轻点反而会加到隐藏的槽 1 里。
  // 改成按需懒建：每个槽在真正变成"当前活跃步骤"时才 createTray/createSequence，同一时刻
  // "最近创建的序列"永远就是玩家正在填的那个槽，轻点兜底才会指哪打哪。
  function setupDefineSlot(i) {
    if (defineSeqs[i]) return; // 已建过（比如"重新定义"复用同一个槽），不重复 createSequence
    createTray(container.querySelector(`#macro-define-tray-${i}`), baseBlockDefs());
    const defSeq = createSequence(container.querySelector(`#macro-define-seq-${i}`), {
      maxSlots: defMaxLen,
      emptyText: `把动作积木拖到这里，摆 ${defMinLen}-${defMaxLen} 个 →`,
    });
    defineSeqs[i] = defSeq;
    defSeq.onChange((list) => {
      confirmBtns[i].disabled = !(list.length >= defMinLen && list.length <= defMaxLen);
    });
  }
  setupDefineSlot(0);

  // 测试专用只读钩子（同 games/hunt.js 的约定）：仅在 window.__LSFA_TEST__ 显式为 true 时挂载，
  // 生产环境不受影响。暴露目标路径 plan 与各定义槽序列 handle，供自动化脚本跳过真实拖拽直接
  // 调用 addBlock/setSequence 驱动关卡。
  if (typeof window !== 'undefined' && window.__LSFA_TEST__) {
    window.__lsfaMacro = { plan, macroSlotCount, defineSeqs, macroDefs };
  }

  function openNameStep(i) {
    if (confirmBtns[i].disabled) return;
    api.sfx.click();
    const usedNames = macroDefs.filter(Boolean).map((d) => d.name);
    const available = MACRO_NAME_PRESETS.filter((p) => !usedNames.includes(p.name));
    const presets = available.length ? available : MACRO_NAME_PRESETS;
    namePickers[i].style.display = 'flex';
    namePickers[i].innerHTML = presets.map((p) => `
      <button class="brick-btn brick-btn--yellow macro-name-btn" data-name="${p.name}" data-icon="${p.icon}">
        <span class="n-icon">${p.icon}</span><span>${p.name}</span>
      </button>
    `).join('');
    confirmBtns[i].disabled = true;
    namePickers[i].querySelectorAll('.macro-name-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        finalizeMacroSlot(i, { name: btn.dataset.name, icon: btn.dataset.icon });
      });
    });
    api.mascot.say('给它取个名字吧！', 'happy');
  }

  confirmBtns.forEach((btn, i) => btn.addEventListener('click', () => openNameStep(i)));

  function finalizeMacroSlot(i, preset) {
    const seqSnapshot = defineSeqs[i].getSequence();
    macroDefs[i] = { name: preset.name, icon: preset.icon, actions: seqSnapshot.map((b) => b.type) };
    api.sfx.success();
    namePickers[i].style.display = 'none';
    defSummaries[i].style.display = 'flex';
    defSummaries[i].innerHTML = `
      <div class="badge-hex" style="--badge-color: var(--cat-macro);">${macroDefs[i].icon}</div>
      <div>
        <div class="title-sm">${macroDefs[i].name}</div>
        <div class="macro-def-actions">${macroDefs[i].actions.map((t) => ACTION_META[t].icon).join('')}</div>
      </div>
      <button class="brick-btn brick-btn--gray brick-btn--sm" id="macro-redefine-btn-${i}">重新定义</button>
    `;
    container.querySelector(`#macro-redefine-btn-${i}`).addEventListener('click', () => resetDefineSlot(i));

    // 该槽的定义区变成只读展示
    container.querySelector(`#macro-define-tray-${i}`).style.display = 'none';
    container.querySelector(`#macro-define-seq-${i}`).style.display = 'none';
    confirmBtns[i].style.display = 'none';

    const nextUnconfirmed = macroDefs.findIndex((d) => d === null);
    if (nextUnconfirmed === -1) {
      // 所有槽都确认完了——解锁主程序阶段
      if (mainHideInitially) mainCard.style.display = '';
      mainCard.classList.remove('macro-section--dim');
      setupMainPhase();
      api.mascot.say(macroSlotCount > 1 ? '两个 My Block 都准备好了，去闯关吧！' : '太棒了！现在用它去闯关吧！', 'cheer');
    } else {
      const nextCard = container.querySelector(`#macro-define-card-${nextUnconfirmed}`);
      if (nextCard) nextCard.style.display = '';
      setupDefineSlot(nextUnconfirmed); // 懒建下一个槽的 tray/sequence，让它成为"最近创建"以接住轻点兜底
      api.mascot.say('太棒了！再定义下一个 My Block 吧！', 'happy');
    }
  }

  function resetMainPhase() {
    if (mainSeq) { mainSeq.destroy(); mainSeq = null; }
    container.querySelector('#macro-main-tray').innerHTML = '';
    container.querySelector('#macro-main-seq').innerHTML = '';
    runBtn.disabled = true;
    expandStage.style.display = 'none';
    resetStage();
    if (mainHideInitially) mainCard.style.display = 'none';
    mainCard.classList.add('macro-section--dim');
  }

  function resetDefineSlot(i) {
    api.sfx.click();
    macroDefs[i] = null;
    defSummaries[i].style.display = 'none';
    container.querySelector(`#macro-define-tray-${i}`).style.display = '';
    container.querySelector(`#macro-define-seq-${i}`).style.display = '';
    confirmBtns[i].style.display = '';
    confirmBtns[i].disabled = true;
    // 重建（而不是复用）这个槽的 tray/sequence：如果槽 1 或主程序区后来居上创建过，
    // "最近创建的序列"就不再是这个槽了，轻点兜底会指错地方。销毁重建让它重新变成"最近创建"。
    defineSeqs[i].destroy();
    defineSeqs[i] = null;
    container.querySelector(`#macro-define-tray-${i}`).innerHTML = '';
    container.querySelector(`#macro-define-seq-${i}`).innerHTML = '';
    setupDefineSlot(i);
    // 主程序阶段依赖全部宏定义，任一宏重新定义都要清空主程序、重新锁定（其余槽保持已确认状态不变）。
    resetMainPhase();
    api.mascot.say('重新拖几个动作定义 My Block 吧！', 'idle');
  }

  // ---- 阶段②/③：主程序 ----
  function setupMainPhase() {
    const trayEl = container.querySelector('#macro-main-tray');
    const seqEl = container.querySelector('#macro-main-seq');
    trayEl.innerHTML = '';
    seqEl.innerHTML = '';
    const macroTileDefs = macroDefs.map((def, i) => ({ id: `myblock${i}`, label: def.name, icon: def.icon, color: 'pink' }));
    const defs = [...baseBlockDefs(), ...macroTileDefs];
    mainTray = createTray(trayEl, defs);
    mainSeq = createSequence(seqEl, { maxSlots: plan.target.length, emptyText: `照着路线摆；用红色 My Block 压缩到 ${plan.topLevelBudget} 张可拿满星 →` });
    mainSeq.onChange((list) => {
      runBtn.disabled = running || list.length === 0;
      const macroCount = list.filter((item) => /^myblock\d+$/.test(item.type)).length;
      budgetEl.textContent = `压缩挑战：${list.length} 张（满星目标 ≤ ${plan.topLevelBudget}）；红色函数调用 ${macroCount} / ${plan.requiredMacroInvocations}`;
      budgetEl.style.borderColor = list.length <= plan.topLevelBudget && macroCount >= plan.requiredMacroInvocations ? 'var(--lego-green,#237841)' : '';
    });

    if (typeof window !== 'undefined' && window.__LSFA_TEST__ && window.__lsfaMacro) {
      window.__lsfaMacro.mainSeq = mainSeq;
      window.__lsfaMacro.macroDefs = macroDefs;
    }
  }

  function macroSlotOf(type) {
    const m = /^myblock(\d+)$/.exec(type);
    return m ? Number(m[1]) : -1;
  }

  function expandSequence(list) {
    const flat = [];
    list.forEach((item) => {
      const slot = macroSlotOf(item.type);
      if (slot >= 0 && macroDefs[slot]) flat.push(...macroDefs[slot].actions);
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
    attempts += 1;
    const targetTypes = plan.target.map((t) => t.type);
    const verdict = judgeMacroProgram({
      program: list.map((item) => item.type),
      definitions: macroDefs.map((def) => def.actions),
      target: targetTypes,
      topLevelBudget: plan.topLevelBudget,
      requiredMacroCount: plan.requiredMacroInvocations,
    });

    if (!verdict.ok) {
      api.fail(verdict.reason);
      const msg = verdict.reason === 'macro-required'
        ? `基础积木能走通，但不算过关：请调用红色 My Block 至少 ${plan.requiredMacroInvocations} 次！`
        : verdict.reason === 'budget-exceeded'
          ? `主程序只有 ${plan.topLevelBudget} 个位置，请把重复动作压进红色函数！`
          : '程序展开后和目标路径不一致，检查第一个出错位置吧！';
      api.mascot.say(msg, 'oops');
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
      const slot = macroSlotOf(item.type);
      if (slot >= 0 && macroDefs[slot]) {
        const def = macroDefs[slot];
        const tile = mainSeqEl.querySelector(`[data-uid="${item.uid}"]`);
        if (tile) tile.classList.add('brick-block--flip');
        expandStage.style.display = 'flex';
        expandStage.innerHTML = `<strong>${def.icon} ${def.name} 展开：</strong>` +
          def.actions.map((t) => `<span class="exp-icon">${ACTION_META[t].icon}</span>`).join('');
        const expIcons = Array.from(expandStage.querySelectorAll('.exp-icon'));
        for (let i = 0; i < def.actions.length; i++) {
          if (cancelled) return;
          expIcons[i].classList.add('exp-icon--lit');
          await highlightOne(def.actions[i]);
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

    const usedCount = list.length;
    const usedFlags = macroDefs.map((_, i) => list.some((it) => it.type === `myblock${i}`));
    const distinctMacros = usedFlags.filter(Boolean).length;
    const { stars } = scoreMacroProgram({
      attempts,
      topLevelCount: usedCount,
      targetLength: targetTypes.length,
      optimalCount: plan.optimalCount,
      distinctMacros,
      requiredDistinctMacros: macroSlotCount,
    });

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

  const introMsg = macroSlotCount > 1
    ? '仔细看这条路径，藏着两种不同的重复规律！自己琢磨出来，分别定义两个 My Block 吧！'
    : '仔细看这条路径，有没有藏着重复的规律？自己琢磨出来再定义你的 My Block！';
  api.mascot.say(introMsg, 'idle', 4500);

  return {
    destroy() {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
      defineSeqs.forEach((s) => { if (s) s.destroy(); });
      if (mainSeq) mainSeq.destroy();
    },
  };
}

let activeHandle = null;

export default {
  id: 'macro',
  title: '口诀大师',
  icon: '{ }',
  init(container, api) {
    injectStylesOnce();
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
