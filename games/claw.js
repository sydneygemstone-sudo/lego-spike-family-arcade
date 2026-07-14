/* games/claw.js
 * 抓娃娃机 v3 —— 按 docs/superpowers/specs/2026-07-13-games-v3-redesign.md §一 彻底重做。
 * 核心概念：不再有角度/量角器。教学核心 = motor 转 N 圈 → 水平移动 N 个单位（move motor
 * for rotations 的位移语义）+ 夹爪力。
 *
 * 美术全部来自 assets/art.js：clawMachineScene（侧视机厢：导轨 + 齿轮爪车 + 编号位置格）+
 * dialFrame（圈数拨轮外壳，复用 bridge 关同款交互：上/下命中区叠在 SVG 上）+ forceGauge（力度仪表）+
 * prize（目标物图鉴）。本文件只负责逻辑接线 / DOM 更新 / CSS transform 动画，不新画任何场景图形，
 * 场景内不用 emoji（按钮文案/提示文案可以）。
 *
 * 动画接口（见 assets/art.js 里 clawMachineScene 上方注释）：
 *   #claw-trolley  沿导轨 translateX（clawGridX(i) 求目标 x，与"1 圈 = unitsPerTurn 格"换算）
 *   #claw-gear     随位移 rotate（转的圈数 = 目标格数 / 每圈格数，教学：转圈→位移）
 *   #claw-hoist    下降/提起 translateY（内含 #claw-cable，一起下降会让缆绳看起来"整体平移"，
 *                  这里额外反向补偿 #claw-cable 的 y1，让缆绳视觉上从固定的车身接口"伸长"下去，
 *                  而不是整根线跟着掉下来出现断层——这不算重新画图形，只是改现有元素的数值属性）
 *   #claw-fingers-l/r 开合 rotate（力度越大合拢角度越大，直观对应夹爪力设定）
 * 奖品（prize 资产）由本文件叠放在目标格坐标上（clawGridX(targetGrid) 换算），抓取成功时
 * 用 translate+scale+opacity 让它"飞回"出奖口，失败（捏碎/滑落）用 CSS keyframes 做区分。
 *
 * 教学三步（对齐 hunt 黄金标准四要素）：
 *   ① 目标可视化 —— 奖品图标常驻显示在它所在的编号格上
 *   ② 单位显性化 —— 拨圈数只更新程序参数与算式；爪车保持在起点，避免提前暴露执行落点
 *   ③ 算式显性化 —— 拨圈数时大字实时显示 `N 圈 × 每圈格数 = 第 N 格`（L3 换成相对起点的算式）
 *   ④ 单次正式执行 —— 只有「执行抓取」会移动爪车并揭示结果；每次执行都计入尝试与星级
 *
 * Level（api.level）：
 *   L1 每圈 = 1 格（数格即圈数）
 *   L2 每圈 = 2 格（奖品必在偶数格，算式变成 N 圈 × 2 格/圈）
 *   L3 每圈 = 2 格 + 起点不在 0（爪车起始停在第 2 或 4 格，要算相对位移，允许负方向=反转圈数往回移）
 *
 * 协议见 API.md：export default {id,title,icon,init,destroy}。
 */

import * as Art from './mission-art.js';
import { gripBand } from '../js/program-ast.js';

/* clawMachineScene 内部布局常量（art.js 硬编码，这里必须保持一致，用于计算奖品坐标 /
 * 缆绳补偿 / 手指旋转支点）。cell=66 与 Art.clawGridX 内部常量一致。 */
const X0 = 96;
const RAIL_Y = 78;
const CELL = 66;
const FLOOR_Y = 320;
const GRID_COUNT = 8;
const CABLE_Y1_BASE = RAIL_Y + 26; // #claw-cable 静态 y1（车身接口，下降时反向补偿这个值让缆绳"伸长"）
const HOIST_DOWN = 100; // 吊臂下降位移（让指尖大致落到底部位置格/奖品所在高度）
const FINGER_PIVOT_L = { x: X0 - 4, y: RAIL_Y + 90 };
const FINGER_PIVOT_R = { x: X0 + 4, y: RAIL_Y + 90 };
const PRIZE_SIZE = 52;
const PRIZE_Y = FLOOR_Y - 62;

export const PRIZE_POOL = [
  {
    kind: 'glass', name: '玻璃杯', weight: 'medium', firmness: 'hard', fragile: true,
    observations: ['一只手能拿起，但不是轻飘飘的', '轻按表面不会凹下去', '掉到地上可能会裂开'],
  },
  {
    kind: 'egg', name: '鸡蛋', weight: 'light', firmness: 'hard', fragile: true,
    observations: ['两根手指也能轻轻托住', '外壳按下去不会变形', '夹得太紧会破掉'],
  },
  {
    kind: 'brick', name: '大积木盒', weight: 'heavy', firmness: 'hard', fragile: false,
    observations: ['单手拿起会明显感觉沉', '表面坚固，按下不会变形', '不怕正常夹持，但太松会滑落'],
  },
  {
    kind: 'plush', name: '毛绒玩偶', weight: 'medium', firmness: 'soft', fragile: false,
    observations: ['一只手能拿起，有一点分量', '按下去会变形，松手会回弹', '表面柔软，夹太松容易滑走'],
  },
];

export function judgePrizeClassification(prize, weight, firmness) {
  return {
    complete: Boolean(weight && firmness),
    weightCorrect: weight === prize.weight,
    firmnessCorrect: firmness === prize.firmness,
    correct: weight === prize.weight && firmness === prize.firmness,
  };
}

function fallbackInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

/** 位置格 → 齿轮旋转角度：转的"圈数"= 距家(0位)的格数 / 每圈格数，1 圈 = 360°，
 * 与"N 圈 × 每圈格数 = N*每圈格数 格"严格对应，即便 unitsPerTurn=2 也是整数圈。 */
function gearDegFor(pos, unitsPerTurn) { return (pos / unitsPerTurn) * 360; }

export function buildClawLevel(apiLevel, suppliedRand = null) {
  const level = Math.max(1, Math.min(10, Number(apiLevel) || 1));
  const tier = level <= 3 ? 1 : level <= 6 ? 2 : 3;
  const int = suppliedRand?.int ? (a, b) => suppliedRand.int(a, b) : fallbackInt;
  const pick = suppliedRand?.pick ? (items) => suppliedRand.pick(items) : (items) => items[int(0, items.length - 1)];
  const unitsPerTurn = tier === 1 ? 1 : 2;
  const startGrid = tier === 3 ? pick([2, 4, 6]) : 0;
  const dialMin = Math.ceil((0 - startGrid) / unitsPerTurn);
  const dialMax = Math.floor((GRID_COUNT - startGrid) / unitsPerTurn);

  let targetGrid;
  if (tier === 1) {
    targetGrid = int(1, GRID_COUNT);
  } else {
    const evenGrids = [];
    for (let g = 2; g <= GRID_COUNT; g += 2) evenGrids.push(g);
    const candidates = evenGrids.filter((g) => g !== startGrid);
    targetGrid = pick(candidates);
  }
  const targetTurns = (targetGrid - startGrid) / unitsPerTurn;
  const rawPrize = pick(PRIZE_POOL);
  const band = gripBand(rawPrize);
  const prize = { ...rawPrize, forceMin: band.min, forceMax: band.max };
  return { level, tier, unitsPerTurn, startGrid, dialMin, dialMax, targetGrid, targetTurns, prize };
}

/* -------------------------------------------------------------------------- 样式 -------------------------------------------------------------------------- */
let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .claw-layout { display:flex; flex-direction:column; gap:12px; }
    .claw-stage-card { padding-top: 14px; }
    .claw-scene-outer {
      height: 29vh; border-radius:14px; overflow:hidden; background:var(--paper-50);
      display:flex; align-items:center; justify-content:center;
    }
    /* 场景用固定高度的盒子 + svg 的 preserveAspectRatio="xMidYMid meet"（clawMachineScene 默认值，
     * 未覆盖）整体缩放贴合，两侧留白也不裁切——不能用 width:100%+height:auto，那样高度超出
     * max-height 时 overflow:hidden 会把底部的编号格切掉（真人视觉路径要求编号格必须完整可见）。 */
    #claw-scene-inner { width:100%; height:100%; }
    #claw-scene-inner svg { width:100%; height:100%; display:block; }

    .claw-controls { margin-top:10px; display:flex; flex-direction:column; gap:8px; }
    .claw-dial-section { display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; }
    .claw-dial-outer { position:relative; width:clamp(92px,20vw,132px); aspect-ratio:150/190; }
    .claw-dial-outer svg { width:100%; height:100%; display:block; }
    .claw-dial-hit { position:absolute; left:0; right:0; background:transparent; border:none; padding:0; }
    .claw-dial-hit--up { top:0; height:40%; }
    .claw-dial-hit--down { bottom:0; height:40%; }
    .claw-dial-readout {
      position:absolute; left:50%; top:51%; transform:translate(-50%,-50%);
      font-size: clamp(20px,4.2vw,28px); font-weight:900; color:var(--ink-900); pointer-events:none;
    }
    .claw-formula {
      font-size: clamp(16px, 2.9vw, 24px); font-weight:900; color: var(--cat-claw,#0055BF);
      text-align:center; margin:0; letter-spacing:.3px;
    }

    .claw-force-section {
      display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr); gap:12px;
      background: var(--paper-100); border-radius:18px; padding:12px;
    }
    .claw-inspection-panel,
    .claw-force-console { min-width:0; border:1px solid #d6e2ec; border-radius:16px; background:#fff; padding:12px; }
    .claw-panel-kicker { color:#146ba6; font-size:9px; font-weight:950; letter-spacing:.12em; }
    .claw-inspection-panel h3,
    .claw-force-console h3 { margin:3px 0 8px; color:#193752 !important; opacity:1 !important; font-size:17px; }
    .claw-observations { display:grid; gap:5px; margin:0 0 9px; padding:0; list-style:none; }
    .claw-observations li { position:relative; padding-left:18px; color:#526a80; font-size:11px; font-weight:750; line-height:1.35; }
    .claw-observations li::before { content:'SCAN'; position:absolute; left:0; top:1px; color:#14a383; font-size:7px; font-weight:950; }
    .claw-classify-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    .claw-classify-group { min-width:0; padding:7px; border-radius:12px; background:#f2f7fb; }
    .claw-classify-group strong { display:block; margin-bottom:5px; color:#344f67; font-size:10px; }
    .claw-classify-options { display:flex; min-width:0; gap:4px; }
    .claw-classify-btn { flex:1 1 0; min-width:0; min-height:44px; padding:7px 5px; border:1px solid #c5d5e3; border-radius:9px; color:#466079; background:#fff; font-size:11px; font-weight:900; touch-action:manipulation; }
    .claw-classify-btn.is-selected { border-color:#257ac0; color:#fff; background:#257ac0; box-shadow:0 0 0 2px rgba(37,122,192,.14); }
    .claw-classify-btn.is-correct { border-color:#20a47d; color:#155a46; background:#e1f7ef; }
    .claw-classify-status { min-height:28px; margin:8px 0 0; color:#596f84; font-size:10px; font-weight:800; line-height:1.35; }
    .claw-classify-status.is-success { color:#147555; }
    .claw-force-console { display:grid; grid-template-columns:86px 1fr; gap:9px; align-items:center; }
    .claw-force-console .claw-dial-outer { width:86px; }
    .claw-force-ruler { display:grid; gap:5px; }
    .claw-force-ruler-row { display:grid; grid-template-columns:42px 1fr; gap:6px; align-items:center; }
    .claw-force-ruler-row b { color:#233f59; font-size:10px; }
    .claw-force-ruler-row span { height:9px; border-radius:999px; }
    .claw-force-ruler-row:nth-of-type(1) span { width:33%; background:#70efba; }
    .claw-force-ruler-row:nth-of-type(2) span { width:66%; background:#ffd45d; }
    .claw-force-ruler-row:nth-of-type(3) span { width:100%; background:#fa7b61; }
    .claw-force-rule { grid-column:1/-1; margin:0; color:#5e7285; font-size:9px; line-height:1.4; }
    .claw-phase-strip { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }
    .claw-phase-strip span { padding:6px; border-radius:9px; color:#718499; background:#edf3f8; font-size:9px; font-weight:900; text-align:center; }
    .claw-phase-strip span.is-active { color:#fff; background:#176ba7; }

    .claw-result-text { font-size:14px; font-weight:700; color:var(--ink-700); text-align:center; min-height:1.4em; margin:0; }
    .claw-buttons-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
    .claw-attempts { font-size:12px; color:var(--ink-500); text-align:center; }

    #claw-trolley, #claw-hoist { transform-box: view-box; }
    #claw-gear { transform-box: view-box; transform-origin: ${X0}px ${RAIL_Y + 14}px; }
    #claw-fingers-l { transform-box: view-box; transform-origin: ${FINGER_PIVOT_L.x}px ${FINGER_PIVOT_L.y}px; }
    #claw-fingers-r { transform-box: view-box; transform-origin: ${FINGER_PIVOT_R.x}px ${FINGER_PIVOT_R.y}px; }
    #claw-prize-wrap { transition: transform .5s ease, opacity .5s ease; transform-box: view-box; }
    .claw-fx-crush { animation: claw-fx-crush .5s ease forwards; }
    .claw-fx-drop { animation: claw-fx-drop .45s ease forwards; }
    @keyframes claw-fx-crush {
      0% { transform: scale(1) rotate(0deg); opacity:1; }
      35% { transform: scale(1.18) rotate(-9deg); opacity:1; }
      100% { transform: scale(0.1) rotate(20deg); opacity:0; }
    }
    @keyframes claw-fx-drop {
      0% { transform: translateY(0) rotate(0deg); opacity:1; }
      100% { transform: translateY(48px) rotate(16deg); opacity:0.1; }
    }

    /* 真实 iPad 竖屏必须把材料判断与夹力参考尺上下堆叠。不能只看 CSS 宽度：
     * 820/834/1024px 的竖屏 iPad 足以命中桌面宽度，却没有容纳两张卡的横向空间。 */
    @media (orientation: portrait) {
      .claw-force-section { grid-template-columns:minmax(0,1fr); }
      .claw-inspection-panel,
      .claw-force-console { width:100%; }
    }

    /* 横屏短视口（如 1024x768）：竖排会挤不下，改成场景左 · 控制右两栏，
     * 场景卡用 flex 撑满与控制卡等高的可用高度，而不是死磕一个 vh 值；控制栏窄了，
     * 拨轮/仪表/按钮都相应缩小一号，保证一屏内零滚动看到全部操作元素。 */
    @media (min-width: 700px) and (max-height: 840px) {
      .claw-layout { flex-direction: row; align-items: stretch; gap:12px; }
      .claw-stage-card { flex: 1.15 1 0; min-width:0; display:flex; flex-direction:column; }
      .claw-scene-outer { flex: 1 1 auto; height:auto; min-height:0; }
      .claw-controls { flex: 1 1 0; min-width:0; gap:5px; justify-content:center; }
      .claw-dial-section { gap:8px; }
      .claw-dial-outer { width: clamp(72px,13vw,96px); }
      .claw-formula { font-size: clamp(13px,1.7vw,17px); }
      .claw-force-section { padding:4px 7px; gap:6px; grid-template-columns:minmax(0,1.06fr) minmax(170px,.94fr); }
      .claw-inspection-panel,.claw-force-console { padding:8px; }
      .claw-inspection-panel h3 { font-size:13px; margin-bottom:5px; }
      .claw-force-console h3 { font-size:11px; margin-bottom:4px; }
      .claw-observations { gap:2px; margin-bottom:5px; }
      .claw-observations li { font-size:9px; }
      .claw-classify-grid { grid-template-columns:1fr; gap:4px; }
      .claw-classify-group { padding:5px; }
      .claw-classify-btn { min-height:44px; padding:6px 4px; }
      .claw-force-console { grid-template-columns:56px minmax(92px,1fr); gap:5px; }
      .claw-force-console .claw-dial-outer { width:56px; }
      .claw-force-ruler-row { grid-template-columns:34px 1fr; gap:4px; }
      .claw-force-ruler-row b { font-size:8px; }
      .claw-force-rule,.claw-classify-status { font-size:8px; }
      .claw-result-text { font-size:11.5px; min-height:1.2em; }
      .claw-buttons-row { gap:8px; }
      .claw-buttons-row .brick-btn { min-height:42px; padding:6px 12px; font-size:13.5px; }
      .claw-attempts { font-size:10.5px; }
    }
    @media (max-width: 620px) {
      .claw-force-section { grid-template-columns:1fr; }
      .claw-classify-grid { grid-template-columns:1fr; }
    }
  `;
  document.head.appendChild(style);
}

/* -------------------------------------------------------------------------- 场景拼装 -------------------------------------------------------------------------- */
/** 把 prize() 的小 SVG 以 nested-svg 方式叠进 clawMachineScene 返回的 SVG 字符串，
 * 定位到目标格坐标；不新画图形，只是拼装两个 art.js 资产（同旧版技法）。 */
function composeSceneMarkup(lvl) {
  const base = Art.clawMachineScene({ gridCount: GRID_COUNT });
  const px = (X0 + lvl.targetGrid * CELL - PRIZE_SIZE / 2).toFixed(1);
  const py = PRIZE_Y.toFixed(1);
  const prizeMarkup = Art.prize(lvl.prize.kind).replace('<svg ', `<svg x="${px}" y="${py}" width="${PRIZE_SIZE}" height="${PRIZE_SIZE}" `);
  return base.replace('</svg>', `<g id="claw-prize-wrap">${prizeMarkup}</g></svg>`);
}

/* -------------------------------------------------------------------------- 帮助函数 -------------------------------------------------------------------------- */
function wait(ms, timers) {
  return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); });
}

function formulaTextFor(lvl, turnsN) {
  const pos = lvl.startGrid + turnsN * lvl.unitsPerTurn;
  if (lvl.tier === 1) return `${turnsN} 圈 × 1 格/圈 = 第 ${pos} 格`;
  if (lvl.tier === 2) return `${turnsN} 圈 × 2 格/圈 = 第 ${pos} 格`;
  const signed = turnsN === 0 ? '0' : (turnsN > 0 ? `+${turnsN}` : `${turnsN}`);
  return `第${lvl.startGrid}格 ${signed}圈×2格/圈 = 第${pos}格`;
}

function subtitleFor(lvl) {
  if (lvl.tier === 1) return `MISSION ${lvl.level}/10 / 计算奖品坐标，设置移动圈数与夹持力度（每圈 = 1 格）`;
  if (lvl.tier === 2) return `MISSION ${lvl.level}/10 / 每转 1 圈横移 2 格，先计算再执行抓取`;
  return `MISSION / 爪车从第 ${lvl.startGrid} 格出发，允许反向圈数`;
}

/* -------------------------------------------------------------------------- 主渲染 -------------------------------------------------------------------------- */
function render(container, api) {
  let cancelled = false;
  const timers = [];
  const lvl = buildClawLevel(api.level, api.rand);
  let turnsN = 0;
  let forceVal = null;
  let selectedWeight = null;
  let selectedFirmness = null;
  let classificationPassed = false;
  let classificationMistakes = 0;
  let attempts = 0;
  let running = false;

  container.innerHTML = `
    <div class="claw-layout">
      <div class="brick-card brick-card--cat-claw claw-stage-card">
        <p class="title-sm" id="claw-subtitle" style="margin:0 0 8px;">${subtitleFor(lvl)}</p>
        <div class="claw-scene-outer"><div id="claw-scene-inner"></div></div>
      </div>
      <div class="brick-card brick-card--yellow claw-controls">
        <div class="claw-phase-strip" aria-label="任务阶段">
          <span class="is-active" id="claw-phase-scan">1 观察材质</span>
          <span id="claw-phase-program">2 设置程序</span>
          <span id="claw-phase-grab">3 执行抓取</span>
        </div>
        <div class="claw-dial-section">
          <div class="claw-dial-outer" id="claw-dial-outer">
            ${Art.dialFrame({ label: '移动圈数' })}
            <button class="claw-dial-hit claw-dial-hit--up" id="claw-turns-up" aria-label="增加圈数"></button>
            <button class="claw-dial-hit claw-dial-hit--down" id="claw-turns-down" aria-label="减少圈数"></button>
            <div class="claw-dial-readout" id="claw-turns-readout">0</div>
          </div>
          <p class="claw-formula" id="claw-formula-text"></p>
        </div>

        <div class="claw-force-section">
          <section class="claw-inspection-panel" aria-labelledby="claw-inspection-title">
            <span class="claw-panel-kicker">MATERIAL SCAN</span>
            <h3 id="claw-inspection-title">先判断 ${lvl.prize.name}</h3>
            <ul class="claw-observations">
              ${lvl.prize.observations.map((clue) => `<li>${clue}</li>`).join('')}
            </ul>
            <div class="claw-classify-grid">
              <div class="claw-classify-group">
                <strong>它有多重？</strong>
                <div class="claw-classify-options">
                  <button class="claw-classify-btn" data-classify="weight" data-value="light">轻</button>
                  <button class="claw-classify-btn" data-classify="weight" data-value="medium">中</button>
                  <button class="claw-classify-btn" data-classify="weight" data-value="heavy">重</button>
                </div>
              </div>
              <div class="claw-classify-group">
                <strong>它会变形吗？</strong>
                <div class="claw-classify-options">
                  <button class="claw-classify-btn" data-classify="firmness" data-value="soft">柔软</button>
                  <button class="claw-classify-btn" data-classify="firmness" data-value="hard">坚硬</button>
                </div>
              </div>
            </div>
            <p class="claw-classify-status" id="claw-classify-status">选完重量和触感，才能解锁夹力盘。</p>
          </section>

          <section class="claw-force-console" aria-labelledby="claw-force-title">
            <div class="claw-dial-outer" id="claw-force-dial">
              ${Art.dialFrame({ label: '夹爪力' })}
              <button class="claw-dial-hit claw-dial-hit--up" id="claw-force-plus" aria-label="增加力度" disabled></button>
              <button class="claw-dial-hit claw-dial-hit--down" id="claw-force-minus" aria-label="减少力度" disabled></button>
              <div class="claw-dial-readout" id="claw-force-val">锁</div>
            </div>
            <div class="claw-force-ruler">
              <span class="claw-panel-kicker">FORCE GUIDE</span>
              <h3 id="claw-force-title">夹力参考尺</h3>
              <div class="claw-force-ruler-row"><b>轻 1–3</b><span></span></div>
              <div class="claw-force-ruler-row"><b>中 4–6</b><span></span></div>
              <div class="claw-force-ruler-row"><b>重 7–10</b><span></span></div>
            </div>
            <p class="claw-force-rule">柔软易滑：从对应重量起点再加 1。易碎：只试安全区的低档，不要猛夹。参考尺给规则，不直接公布答案。</p>
          </section>
        </div>

        <p class="claw-result-text" id="claw-result-text">SYSTEM READY / 先根据观察描述判断重量和触感</p>

        <div class="claw-buttons-row game-action-dock">
          <button class="brick-btn brick-btn--blue brick-btn--lg" id="claw-formal-btn" disabled>正式执行（计入尝试）</button>
        </div>
        <div class="claw-attempts" id="claw-attempts-label">已尝试 0 次</div>
      </div>
    </div>
  `;

  const sceneInner = container.querySelector('#claw-scene-inner');
  const turnsReadout = container.querySelector('#claw-turns-readout');
  const forceValEl = container.querySelector('#claw-force-val');
  const formulaEl = container.querySelector('#claw-formula-text');
  const resultTextEl = container.querySelector('#claw-result-text');
  const formalBtn = container.querySelector('#claw-formal-btn');
  const attemptsLabel = container.querySelector('#claw-attempts-label');
  const turnsUpBtn = container.querySelector('#claw-turns-up');
  const turnsDownBtn = container.querySelector('#claw-turns-down');
  const forceMinusBtn = container.querySelector('#claw-force-minus');
  const forcePlusBtn = container.querySelector('#claw-force-plus');
  const classifyStatus = container.querySelector('#claw-classify-status');
  const classifyButtons = Array.from(container.querySelectorAll('.claw-classify-btn'));
  const phaseScan = container.querySelector('#claw-phase-scan');
  const phaseProgram = container.querySelector('#claw-phase-program');
  const phaseGrab = container.querySelector('#claw-phase-grab');

  sceneInner.innerHTML = composeSceneMarkup(lvl);
  const trolleyEl = sceneInner.querySelector('#claw-trolley');
  const gearEl = sceneInner.querySelector('#claw-gear');
  const hoistEl = sceneInner.querySelector('#claw-hoist');
  const cableEl = sceneInner.querySelector('#claw-cable');
  const fingersL = sceneInner.querySelector('#claw-fingers-l');
  const fingersR = sceneInner.querySelector('#claw-fingers-r');
  let prizeWrapEl = sceneInner.querySelector('#claw-prize-wrap');

  function setTrolleyInstant(pos) {
    trolleyEl.style.transition = 'none';
    gearEl.style.transition = 'none';
    trolleyEl.style.transform = `translateX(${Art.clawGridX(pos)}px)`;
    gearEl.style.transform = `rotate(${gearDegFor(pos, lvl.unitsPerTurn)}deg)`;
    void trolleyEl.offsetWidth;
    trolleyEl.style.transition = '';
    gearEl.style.transition = '';
  }
  function setTrolleyAnimated(pos, ms) {
    trolleyEl.style.transition = `transform ${ms}ms cubic-bezier(.3,1.1,.4,1)`;
    gearEl.style.transition = `transform ${ms}ms linear`;
    trolleyEl.style.transform = `translateX(${Art.clawGridX(pos)}px)`;
    gearEl.style.transform = `rotate(${gearDegFor(pos, lvl.unitsPerTurn)}deg)`;
  }
  function setFingers(deg) {
    fingersL.style.transition = 'transform .22s ease';
    fingersR.style.transition = 'transform .22s ease';
    fingersL.style.transform = `rotate(${deg}deg)`;
    fingersR.style.transform = `rotate(${-deg}deg)`;
  }
  setTrolleyInstant(lvl.startGrid);
  setFingers(0);

  /* 用 setTimeout 驱动补间（不用 requestAnimationFrame——rAF 在标签页被切到后台/隐藏时会
   * 完全暂停触发，已在旧版实测确认；setTimeout 在后台最多被节流，仍会推进，不会卡死）。
   * 这里只用来给 #claw-hoist 的下降/提起做补间，因为需要同步反向修正 #claw-cable 的 y1，
   * 让缆绳视觉上"伸长"而不是跟着车身整体平移出现断层——CSS transition 拿不到中间帧数值，
   * 没法做这个联动，所以这一步单独手动补间。 */
  function tweenNumber(from, to, ms, onUpdate) {
    return new Promise((resolve) => {
      if (cancelled) { resolve(); return; }
      const t0 = performance.now();
      const STEP_MS = 30;
      function step() {
        if (cancelled) { resolve(); return; }
        const p = ms <= 0 ? 1 : Math.min(1, (performance.now() - t0) / ms);
        onUpdate(from + (to - from) * p);
        if (p < 1) timers.push(setTimeout(step, STEP_MS));
        else resolve();
      }
      step();
    });
  }
  function setHoist(d) {
    hoistEl.style.transform = `translateY(${d}px)`;
    cableEl.setAttribute('y1', String(CABLE_Y1_BASE - d));
  }
  function lowerHoist() { return tweenNumber(0, HOIST_DOWN, 420, setHoist); }
  function raiseHoist() { return tweenNumber(HOIST_DOWN, 0, 380, setHoist); }

  function updateFormula() { formulaEl.textContent = formulaTextFor(lvl, turnsN); }
  updateFormula();

  function setControlsDisabled(disabled) {
    [turnsUpBtn, turnsDownBtn].forEach((btn) => { btn.disabled = disabled; });
    classifyButtons.forEach((btn) => { btn.disabled = disabled || classificationPassed; });
    forceMinusBtn.disabled = disabled || !classificationPassed;
    forcePlusBtn.disabled = disabled || !classificationPassed;
    formalBtn.disabled = disabled || !classificationPassed || forceVal == null;
  }

  function currentPos() { return lvl.startGrid + turnsN * lvl.unitsPerTurn; }

  turnsUpBtn.addEventListener('click', () => {
    if (running) return;
    const next = Math.min(lvl.dialMax, turnsN + 1);
    if (next === turnsN) return;
    turnsN = next;
    turnsReadout.textContent = String(turnsN);
    updateFormula();
    api.sfx.snap();
  });
  turnsDownBtn.addEventListener('click', () => {
    if (running) return;
    const next = Math.max(lvl.dialMin, turnsN - 1);
    if (next === turnsN) return;
    turnsN = next;
    turnsReadout.textContent = String(turnsN);
    updateFormula();
    api.sfx.snap();
  });
  classifyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (running || classificationPassed) return;
      const kind = button.dataset.classify;
      container.querySelectorAll(`[data-classify="${kind}"]`).forEach((item) => item.classList.remove('is-selected'));
      button.classList.add('is-selected');
      if (kind === 'weight') selectedWeight = button.dataset.value;
      else selectedFirmness = button.dataset.value;
      api.sfx.click();

      const classification = judgePrizeClassification(lvl.prize, selectedWeight, selectedFirmness);
      if (!classification.complete) {
        classifyStatus.textContent = '还差一个判断：重量和触感都要回答。';
        return;
      }
      if (!classification.correct) {
        classificationMistakes += 1;
        const missing = [
          classification.weightCorrect ? null : '再读一遍“拿起来”的描述',
          classification.firmnessCorrect ? null : '再读一遍“按下去”的描述',
        ].filter(Boolean).join('；');
        classifyStatus.textContent = `侦察还没对：${missing}。`;
        classifyStatus.classList.remove('is-success');
        api.sfx.fail();
        return;
      }

      classificationPassed = true;
      classifyButtons.forEach((item) => {
        item.disabled = true;
        const isAnswer = (item.dataset.classify === 'weight' && item.dataset.value === lvl.prize.weight)
          || (item.dataset.classify === 'firmness' && item.dataset.value === lvl.prize.firmness);
        item.classList.toggle('is-correct', isAnswer);
      });
      forceMinusBtn.disabled = false;
      forcePlusBtn.disabled = false;
      forceValEl.textContent = '—';
      classifyStatus.textContent = '侦察正确！夹力盘已解锁。根据参考尺选择力度。';
      classifyStatus.classList.add('is-success');
      resultTextEl.textContent = '材质判断完成 / 现在设置移动圈数与夹爪力';
      phaseScan.classList.remove('is-active');
      phaseProgram.classList.add('is-active');
      api.sfx.success();
    });
  });
  forceMinusBtn.addEventListener('click', () => {
    if (running || !classificationPassed) return;
    api.sfx.click();
    forceVal = forceVal == null ? 5 : Math.max(1, forceVal - 1);
    forceValEl.textContent = String(forceVal);
    formalBtn.disabled = false;
    resultTextEl.textContent = `已选择夹力 ${forceVal}，可执行正式抓取。`;
    phaseProgram.classList.add('is-active');
  });
  forcePlusBtn.addEventListener('click', () => {
    if (running || !classificationPassed) return;
    api.sfx.click();
    forceVal = forceVal == null ? 5 : Math.min(10, forceVal + 1);
    forceValEl.textContent = String(forceVal);
    formalBtn.disabled = false;
    resultTextEl.textContent = `已选择夹力 ${forceVal}，可执行正式抓取。`;
    phaseProgram.classList.add('is-active');
  });

  function playPrizeFx(kind) {
    prizeWrapEl.classList.remove('claw-fx-crush', 'claw-fx-drop');
    void prizeWrapEl.offsetWidth;
    prizeWrapEl.classList.add(kind === 'crush' ? 'claw-fx-crush' : 'claw-fx-drop');
  }
  function resetPrizeVisual() {
    prizeWrapEl.classList.remove('claw-fx-crush', 'claw-fx-drop');
    prizeWrapEl.style.transform = '';
    prizeWrapEl.style.opacity = '';
  }
  function flyPrizeToChute() {
    const chuteX = X0 - 56;
    const chuteY = FLOOR_Y - 20;
    const prizeCx = X0 + lvl.targetGrid * CELL;
    const prizeCy = PRIZE_Y + PRIZE_SIZE / 2;
    const dx = (chuteX - prizeCx).toFixed(1);
    const dy = (chuteY - prizeCy).toFixed(1);
    prizeWrapEl.style.transform = `translate(${dx}px, ${dy}px) scale(.3)`;
    prizeWrapEl.style.opacity = '0';
  }

  async function runAttempt() {
    if (running) return;
    if (!classificationPassed) {
      resultTextEl.textContent = '先完成重量和触感判断，才能执行正式抓取。';
      api.mascot.say('先读线索，判断它有多重、会不会变形。', 'think');
      return;
    }
    if (forceVal == null) {
      resultTextEl.textContent = '先用夹力拨盘明确选择 1–10 档，再执行正式抓取。';
      api.mascot.say('夹力还没选，先拨一下夹力盘！', 'think');
      return;
    }
    running = true;
    phaseProgram.classList.remove('is-active');
    phaseGrab.classList.add('is-active');
    setControlsDisabled(true);
    api.sfx.click();

    attempts += 1;
    attemptsLabel.textContent = `已尝试 ${attempts} 次`;

    const pos = currentPos();
    const distFromStart = Math.abs(pos - lvl.startGrid);
    const moveMs = 280 + distFromStart * 70;

    resultTextEl.textContent = '抓取中……';
    api.mascot.say('出发！', 'think', 1400);

    // ① 横移（齿轮转）
    setTrolleyAnimated(pos, moveMs);
    await wait(moveMs + 60, timers);
    if (cancelled) return;

    // ② 下降
    await lowerHoist();
    if (cancelled) return;
    await wait(100, timers);
    if (cancelled) return;

    const positionOk = pos === lvl.targetGrid;

    // ③ 夹（力度越大合拢角度越大）
    const closeDeg = 10 + forceVal * 2;
    setFingers(closeDeg);
    api.sfx.snap();
    await wait(300, timers);
    if (cancelled) return;

    let outcome = 'miss';
    if (positionOk) {
      const forceOk = forceVal >= lvl.prize.forceMin && forceVal <= lvl.prize.forceMax;
      outcome = forceOk ? 'success' : (forceVal > lvl.prize.forceMax ? 'crush' : 'drop');
    }

    if (outcome === 'success') {
      // ④ 提起 → 飞回出奖口 + 爪车滑回起点
      await raiseHoist();
      if (cancelled) return;
      flyPrizeToChute();
      setTrolleyAnimated(0, 480);
      api.sfx.success();
      await wait(560, timers);
      if (cancelled) return;
      setFingers(0);

      resultTextEl.textContent = '抓进出奖口啦！';
      api.mascot.say('抓进篮子啦！', 'cheer');
      const stars = attempts === 1 ? 3 : (attempts <= 3 ? 2 : 1);
      const materialStars = classificationMistakes === 0 ? stars : Math.min(stars, classificationMistakes === 1 ? 2 : 1);
      await wait(300, timers);
      if (cancelled) return;
      api.complete(materialStars);
      return; // 关卡结束，不恢复控件
    } else {
      if (outcome === 'crush') { playPrizeFx('crush'); api.sfx.fail(); }
      else if (outcome === 'drop') { playPrizeFx('drop'); api.sfx.fail(); }
      else { api.sfx.fail(); }
      await wait(outcome === 'miss' ? 260 : 480, timers);
      if (cancelled) return;

      setFingers(0);
      await raiseHoist();
      if (cancelled) return;
      setTrolleyAnimated(lvl.startGrid, moveMs);
      await wait(moveMs + 80, timers);
      if (cancelled) return;
      if (outcome !== 'miss') resetPrizeVisual();

      const diff = Math.abs(pos - lvl.targetGrid);
      const msg = outcome === 'miss'
        ? `差 ${diff} 格！再数一数奖品在第几格～`
        : outcome === 'crush'
          ? `${lvl.prize.name}被捏碎了……力道轻一点！`
          : `${lvl.prize.name}从爪子里溜走了……再抓紧一点！`;
      resultTextEl.textContent = msg;
      api.mascot.say(msg, 'oops');
      api.fail(outcome === 'miss' ? 'wrong-position' : (outcome === 'crush' ? 'force-too-much' : 'force-too-little'));
    }

    setControlsDisabled(false);
    phaseGrab.classList.remove('is-active');
    phaseProgram.classList.add('is-active');
    running = false;
  }

  formalBtn.addEventListener('click', runAttempt);

  if (typeof window !== 'undefined' && window.__LSFA_TEST__) {
    window.__lsfaClaw = {
      lvl,
      get turns() { return turnsN; },
      get force() { return forceVal; },
      get classification() { return { selectedWeight, selectedFirmness, classificationPassed, classificationMistakes }; },
    };
  }

  api.mascot.say(subtitleFor(lvl).replace(/^🎯 /, ''), 'idle', 4200);

  return {
    destroy() {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    },
  };
}

let activeHandle = null;

export default {
  id: 'claw',
  title: '抓娃娃机',
  icon: '◎',
  init(container, api) {
    injectStylesOnce();
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
