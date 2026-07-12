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
 * 教学四步（对齐 hunt 黄金标准四要素）：
 *   ① 目标可视化 —— 奖品图标常驻显示在它所在的编号格上
 *   ② 单位显性化 —— 拨圈数拨轮每 +1/-1，爪车立刻沿导轨滑一格 + 齿轮转一圈（实时预览，教学核心）
 *   ③ 算式显性化 —— 拨圈数时大字实时显示 `N 圈 × 每圈格数 = 第 N 格`（L3 换成相对起点的算式）
 *   ④ 演练不计分 ——「演练」按钮走完整趟出发抓取动画链但不计入尝试次数、不影响星级，
 *      可无限次重来；「出发抓取！」才是正式，计入尝试次数、决定星级
 *
 * Level（api.level）：
 *   L1 每圈 = 1 格（数格即圈数）
 *   L2 每圈 = 2 格（奖品必在偶数格，算式变成 N 圈 × 2 格/圈）
 *   L3 每圈 = 2 格 + 起点不在 0（爪车起始停在第 2 或 4 格，要算相对位移，允许负方向=反转圈数往回移）
 *
 * 协议见 API.md：export default {id,title,icon,init,destroy}。
 */

import * as Art from '../assets/art.js';

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

const PRIZE_POOL = [
  { kind: 'glass', name: '玻璃杯', fragile: true, forceMin: 3, forceMax: 5 },
  { kind: 'egg', name: '鸡蛋', fragile: true, forceMin: 3, forceMax: 5 },
  { kind: 'brick', name: '积木块', fragile: false, forceMin: 6, forceMax: 8 },
  { kind: 'plush', name: '小玩偶', fragile: false, forceMin: 6, forceMax: 8 },
];

function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

/** 位置格 → 齿轮旋转角度：转的"圈数"= 距家(0位)的格数 / 每圈格数，1 圈 = 360°，
 * 与"N 圈 × 每圈格数 = N*每圈格数 格"严格对应，即便 unitsPerTurn=2 也是整数圈。 */
function gearDegFor(pos, unitsPerTurn) { return (pos / unitsPerTurn) * 360; }

function buildLevel(apiLevel) {
  const level = (apiLevel === 2 || apiLevel === 3) ? apiLevel : 1;
  const unitsPerTurn = level === 1 ? 1 : 2;
  const startGrid = level === 3 ? pick([2, 4]) : 0;
  const dialMin = Math.ceil((0 - startGrid) / unitsPerTurn);
  const dialMax = Math.floor((GRID_COUNT - startGrid) / unitsPerTurn);

  let targetGrid;
  if (level === 1) {
    targetGrid = randInt(1, GRID_COUNT);
  } else {
    const evenGrids = [];
    for (let g = 2; g <= GRID_COUNT; g += 2) evenGrids.push(g);
    const candidates = evenGrids.filter((g) => g !== startGrid);
    targetGrid = pick(candidates);
  }
  const targetTurns = (targetGrid - startGrid) / unitsPerTurn;
  const prize = pick(PRIZE_POOL);
  return { level, unitsPerTurn, startGrid, dialMin, dialMax, targetGrid, targetTurns, prize };
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
      display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap;
      background: var(--paper-100); border-radius:16px; padding:6px 14px;
    }
    .claw-force-gauge-box { width:clamp(110px,22vw,160px); flex-shrink:0; }
    .claw-force-gauge-box svg { width:100%; height:auto; display:block; }
    .claw-force-stepper-col { display:flex; flex-direction:column; align-items:center; gap:4px; min-width:150px; }
    .claw-param-label { font-weight:800; font-size:13px; }
    .claw-stepper { display:flex; align-items:center; gap:10px; }
    .claw-stepper .val { font-size:22px; font-weight:900; min-width:36px; text-align:center; color: var(--cat-claw,#0055BF); }
    .claw-fragile-hint { font-size:12px; color:var(--ink-700); text-align:center; margin:0; max-width:220px; }

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
      .claw-force-section { padding:4px 10px; gap:8px; }
      .claw-force-gauge-box { width: clamp(84px,14vw,110px); }
      .claw-force-stepper-col { min-width:100px; gap:2px; }
      .claw-param-label { font-size:11px; }
      .claw-stepper .val { font-size:17px; min-width:26px; }
      .claw-fragile-hint { font-size:10.5px; max-width:160px; }
      .claw-result-text { font-size:11.5px; min-height:1.2em; }
      .claw-buttons-row { gap:8px; }
      .claw-buttons-row .brick-btn { min-height:42px; padding:6px 12px; font-size:13.5px; }
      .claw-attempts { font-size:10.5px; }
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
  if (lvl.level === 1) return `${turnsN} 圈 × 1 格/圈 = 第 ${pos} 格`;
  if (lvl.level === 2) return `${turnsN} 圈 × 2 格/圈 = 第 ${pos} 格`;
  const signed = turnsN === 0 ? '0' : (turnsN > 0 ? `+${turnsN}` : `${turnsN}`);
  return `第${lvl.startGrid}格 ${signed}圈×2格/圈 = 第${pos}格`;
}

function subtitleFor(lvl) {
  if (lvl.level === 1) return '🎯 数一数奖品停在第几格，拨对圈数，稳稳抓回家！（每圈 = 1 格）';
  if (lvl.level === 2) return '🎯 这次每转 1 圈会横移 2 格！算一算要拨几圈？';
  return `🎯 爪车这次从第 ${lvl.startGrid} 格出发（不是 0 位）！算一算要拨几圈，可以是负数哦～`;
}

/* -------------------------------------------------------------------------- 主渲染 -------------------------------------------------------------------------- */
function render(container, api) {
  let cancelled = false;
  const timers = [];
  const lvl = buildLevel(api.level);
  let turnsN = 0;
  let forceVal = 5;
  let attempts = 0;
  let running = false;
  let revealHidden = false; // true = 力度安全带隐藏（正式抓取过程中，靠记忆）

  container.innerHTML = `
    <div class="claw-layout">
      <div class="brick-card brick-card--cat-claw claw-stage-card">
        <p class="title-sm" id="claw-subtitle" style="margin:0 0 8px;">${subtitleFor(lvl)}</p>
        <div class="claw-scene-outer"><div id="claw-scene-inner"></div></div>
      </div>
      <div class="brick-card brick-card--yellow claw-controls">
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
          <div class="claw-force-gauge-box" id="claw-force-box"></div>
          <div class="claw-force-stepper-col">
            <span class="claw-param-label">🤏 夹爪力(N)</span>
            <div class="claw-stepper">
              <button class="brick-btn brick-btn--gray brick-btn--icon" id="claw-force-minus" aria-label="减少力度">−</button>
              <span class="val" id="claw-force-val">5</span>
              <button class="brick-btn brick-btn--gray brick-btn--icon" id="claw-force-plus" aria-label="增加力度">＋</button>
            </div>
            <p class="claw-fragile-hint" id="claw-fragile-hint"></p>
          </div>
        </div>

        <p class="claw-result-text" id="claw-result-text">拨好圈数、核对算式，先演练一次看看会发生什么！</p>

        <div class="claw-buttons-row">
          <button class="brick-btn brick-btn--gray brick-btn--lg" id="claw-rehearse-btn">🔄 演练（不计分）</button>
          <button class="brick-btn brick-btn--blue brick-btn--lg" id="claw-formal-btn">🤏 出发抓取！</button>
        </div>
        <div class="claw-attempts" id="claw-attempts-label">已正式尝试 0 次</div>
      </div>
    </div>
  `;

  const sceneInner = container.querySelector('#claw-scene-inner');
  const forceBox = container.querySelector('#claw-force-box');
  const turnsReadout = container.querySelector('#claw-turns-readout');
  const forceValEl = container.querySelector('#claw-force-val');
  const formulaEl = container.querySelector('#claw-formula-text');
  const fragileHintEl = container.querySelector('#claw-fragile-hint');
  const resultTextEl = container.querySelector('#claw-result-text');
  const rehearseBtn = container.querySelector('#claw-rehearse-btn');
  const formalBtn = container.querySelector('#claw-formal-btn');
  const attemptsLabel = container.querySelector('#claw-attempts-label');
  const turnsUpBtn = container.querySelector('#claw-turns-up');
  const turnsDownBtn = container.querySelector('#claw-turns-down');
  const forceMinusBtn = container.querySelector('#claw-force-minus');
  const forcePlusBtn = container.querySelector('#claw-force-plus');

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

  function renderForceGauge(valuePreview) {
    const min = revealHidden ? valuePreview : lvl.prize.forceMin;
    const max = revealHidden ? valuePreview : lvl.prize.forceMax;
    forceBox.innerHTML = Art.forceGauge({ value: valuePreview, min, max });
  }
  renderForceGauge(forceVal);

  function updateFormula() { formulaEl.textContent = formulaTextFor(lvl, turnsN); }
  function updateFragileHint() {
    if (revealHidden) { fragileHintEl.textContent = '正式抓取中，安全带先藏起来啦，靠刚才记的数～'; return; }
    const { name, fragile, forceMin, forceMax } = lvl.prize;
    fragileHintEl.textContent = fragile
      ? `${name}很脆弱，力道要刚刚好（${forceMin}-${forceMax}N）～`
      : `${name}结结实实，可以抓紧一点（${forceMin}-${forceMax}N）！`;
  }
  updateFormula();
  updateFragileHint();

  function setControlsDisabled(disabled) {
    [turnsUpBtn, turnsDownBtn, forceMinusBtn, forcePlusBtn, rehearseBtn, formalBtn]
      .forEach((btn) => { btn.disabled = disabled; });
  }

  function currentPos() { return lvl.startGrid + turnsN * lvl.unitsPerTurn; }

  turnsUpBtn.addEventListener('click', () => {
    if (running) return;
    const next = Math.min(lvl.dialMax, turnsN + 1);
    if (next === turnsN) return;
    turnsN = next;
    turnsReadout.textContent = String(turnsN);
    updateFormula();
    setTrolleyAnimated(currentPos(), 320);
    api.sfx.snap();
  });
  turnsDownBtn.addEventListener('click', () => {
    if (running) return;
    const next = Math.max(lvl.dialMin, turnsN - 1);
    if (next === turnsN) return;
    turnsN = next;
    turnsReadout.textContent = String(turnsN);
    updateFormula();
    setTrolleyAnimated(currentPos(), 320);
    api.sfx.snap();
  });
  forceMinusBtn.addEventListener('click', () => {
    if (running) return;
    api.sfx.click();
    forceVal = Math.max(1, forceVal - 1);
    forceValEl.textContent = String(forceVal);
    renderForceGauge(forceVal);
  });
  forcePlusBtn.addEventListener('click', () => {
    if (running) return;
    api.sfx.click();
    forceVal = Math.min(10, forceVal + 1);
    forceValEl.textContent = String(forceVal);
    renderForceGauge(forceVal);
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

  async function runAttempt(isRehearsal) {
    if (running) return;
    running = true;
    setControlsDisabled(true);
    api.sfx.click();

    if (!isRehearsal) {
      attempts += 1;
      attemptsLabel.textContent = `已正式尝试 ${attempts} 次`;
      revealHidden = true;
      renderForceGauge(forceVal);
      updateFragileHint();
    }

    const pos = currentPos();
    const distFromStart = Math.abs(pos - lvl.startGrid);
    const moveMs = 280 + distFromStart * 70;

    resultTextEl.textContent = isRehearsal ? '演练中……看看会发生什么！' : '抓取中……';
    api.mascot.say(isRehearsal ? '先演练一下……' : '出发！', 'think', 1400);

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

      if (isRehearsal) {
        resultTextEl.textContent = '演练成功！这次是练习，去正式抓取吧～';
        api.mascot.say('演练成功！去试试正式抓取吧～', 'cheer');
        await wait(500, timers);
        if (cancelled) return;
        resetPrizeVisual();
        setTrolleyAnimated(lvl.startGrid, 480);
        await wait(520, timers);
      } else {
        resultTextEl.textContent = '抓进出奖口啦！';
        api.mascot.say('抓进篮子啦！', 'cheer');
        const stars = attempts === 1 ? 3 : (attempts <= 3 ? 2 : 1);
        await wait(300, timers);
        if (cancelled) return;
        api.complete(stars);
        return; // 关卡结束，不恢复控件
      }
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
      resultTextEl.textContent = (isRehearsal ? '演练：' : '') + msg;
      api.mascot.say(msg, 'oops');
      if (!isRehearsal) {
        api.fail(outcome === 'miss' ? 'wrong-position' : (outcome === 'crush' ? 'force-too-much' : 'force-too-little'));
      }
    }

    if (!isRehearsal) {
      revealHidden = false;
      renderForceGauge(forceVal);
      updateFragileHint();
    }
    setControlsDisabled(false);
    running = false;
  }

  rehearseBtn.addEventListener('click', () => runAttempt(true));
  formalBtn.addEventListener('click', () => runAttempt(false));

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
  icon: '🕹️',
  init(container, api) {
    injectStylesOnce();
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
