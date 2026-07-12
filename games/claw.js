/* games/claw.js
 * 抓娃娃机 —— 教学示范关（最高优先级）。
 * 美术全部来自 assets/art.js：clawTopScene(量角器俯视场景) + depthGauge(深度仪表) +
 * forceGauge(力度仪表) + prize(目标物)，本文件只负责逻辑接线 / DOM 更新 / 动画补间，
 * 不新画任何场景图形、场景内不用 emoji（按钮文案可以）。
 *
 * 教学四步（angle 格数拨轮是本关核心教学动作）：
 *   ① 目标可视化 —— clawTopScene 的 showTargetRay 常驻显示红色目标射线
 *   ② 单位显性化 —— clawTopScene 按 unitDeg 自动画出交替色扇区 + 每格度数刻度
 *   ③ 算式显性化 —— 拨格数 N 时大字实时显示 `N 格 × unitDeg° = N*unitDeg°`
 *   ④ 演练不计分 —— 「试一试」只转臂不降不夹、可反复；「正式抓取」才计入尝试次数
 *
 * 深度/力度是辅助参数：深度仪表目标箭头常驻可见（读表定圈数）；力度安全带只在
 * 演练阶段显示，进入「正式抓取」的过程中隐藏（靠记忆），松手后恢复演练态展示。
 *
 * 协议见 API.md：export default {id,title,icon,init,destroy}。
 */

import * as Art from '../assets/art.js';

/* clawTopScene 内部量角器圆心坐标（art.js 硬编码常量，这里必须保持一致，
 * 用于把臂旋转组的 CSS transform-origin 对齐到同一个圆心）。 */
const CX = 205;
const CY = 196;
const HOME_ARM_DEG = 90; // 停靠姿态：垂直朝上，避免与任意目标射线视觉重叠

const UNIT_CHOICES = [30, 45, 60];
const PRIZE_POOL = [
  { kind: 'glass', name: '玻璃杯', fragile: true, forceMin: 3, forceMax: 5 },
  { kind: 'egg', name: '鸡蛋', fragile: true, forceMin: 3, forceMax: 5 },
  { kind: 'brick', name: '积木块', fragile: false, forceMin: 6, forceMax: 8 },
  { kind: 'plush', name: '小玩偶', fragile: false, forceMin: 6, forceMax: 8 },
];

function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function buildLevel() {
  const unitDeg = pick(UNIT_CHOICES);
  const maxGrid = Math.floor(180 / unitDeg);
  const targetGrid = randInt(1, Math.max(1, maxGrid - 1));
  const targetDeg = targetGrid * unitDeg;
  const targetTurns = randInt(1, 4);
  const prize = pick(PRIZE_POOL);
  const slot = Art.clawTargetSlot(targetDeg);
  return { unitDeg, maxGrid, targetGrid, targetDeg, targetTurns, prize, slot };
}

/* -------------------------------------------------------------------------- 样式 -------------------------------------------------------------------------- */
let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .claw-stage-card { padding-top: 22px; }
    .claw-stage {
      display:flex; gap:12px; max-height:56vh; align-items:flex-start;
    }
    /* main:side = 3:1（不是视觉随意定的比例）—— clawTopScene(410x260) 与
     * depthGauge(170x210)+forceGauge(236x150) 堆叠后的自身宽高比换算出来的平衡点，
     * 让两侧内容各自按自身宽高比撑满时高度自然对齐，不必再互相拉伸/裁切出空白。 */
    .claw-stage-main { flex:3 1 0; min-width:0; background:var(--paper-50); border-radius:14px; display:flex; overflow:hidden; }
    .claw-stage-side { flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:10px; }
    .claw-stage-side > div { min-width:0; background:var(--paper-50); border-radius:14px; display:flex; overflow:hidden; }
    .claw-stage-main svg, .claw-stage-side svg { width:100%; height:auto; display:block; }
    .claw-controls { margin-top:14px; display:flex; flex-direction:column; gap:12px; }
    .claw-param-row {
      display:flex; align-items:center; gap:12px; flex-wrap:wrap; justify-content:center;
      background: var(--paper-100); border-radius:16px; padding:10px 14px;
    }
    .claw-param-label { font-weight:800; font-size:14px; min-width:96px; }
    .claw-stepper { display:flex; align-items:center; gap:10px; }
    .claw-stepper .val { font-size:26px; font-weight:900; min-width:44px; text-align:center; color: var(--cat-claw,#0055BF); }
    .claw-formula {
      font-size: clamp(20px, 3.6vw, 30px); font-weight:900; color: var(--cat-claw,#0055BF);
      text-align:center; letter-spacing:.5px;
    }
    .claw-unit-caption { font-size:13px; color:var(--ink-500); text-align:center; }
    .claw-hint-text { font-size:13px; color:var(--ink-700); text-align:center; min-height:1.4em; }
    .claw-buttons-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
    .claw-attempts { font-size:13px; color:var(--ink-500); text-align:center; }
    #claw-arm-rot { transform-box: view-box; }
  `;
  document.head.appendChild(style);
}

/* -------------------------------------------------------------------------- 帮助函数 -------------------------------------------------------------------------- */
function wait(ms, timers) {
  return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); });
}

/** 把 prize() 的小 SVG 以 nested-svg 的方式塞进 clawTopScene 返回的 SVG 字符串里，
 * 定位到目标格坐标；不新画图形，只是拼装两个 art.js 资产。 */
function composeSceneMarkup(level) {
  const base = Art.clawTopScene({ unitDeg: level.unitDeg, armDeg: HOME_ARM_DEG, showTargetRay: level.targetDeg });
  const px = (level.slot.x - 26).toFixed(1);
  const py = (level.slot.y - 26).toFixed(1);
  const prizeMarkup = Art.prize(level.prize.kind).replace('<svg ', `<svg x="${px}" y="${py}" width="52" height="52" `);
  return base.replace('</svg>', `<g id="claw-prize-wrap" style="transition: transform .6s ease, opacity .6s ease;">${prizeMarkup}</g></svg>`);
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  let level = buildLevel();
  let gridN = 0;
  let turnsN = 1;
  let forceVal = 5;
  let attempts = 0;
  let running = false;
  let revealHidden = false; // true = 力度安全带隐藏（正式抓取过程中）

  container.innerHTML = `
    <div class="brick-card brick-card--cat-claw claw-stage-card">
      <p class="title-sm" style="margin:0 0 8px;">🎯 数一数目标在第几格，拨对格数，稳稳抓住它！</p>
      <div class="claw-stage">
        <div class="claw-stage-main" id="claw-scene-box"></div>
        <div class="claw-stage-side">
          <div id="claw-depth-box"></div>
          <div id="claw-force-box"></div>
        </div>
      </div>
    </div>
    <div class="brick-card brick-card--yellow claw-controls">
      <div class="claw-param-row">
        <span class="claw-param-label">🎯 转向格数</span>
        <div class="claw-stepper">
          <button class="brick-btn brick-btn--gray brick-btn--icon" id="claw-grid-minus" aria-label="减少格数">−</button>
          <span class="val" id="claw-grid-val">0</span>
          <button class="brick-btn brick-btn--gray brick-btn--icon" id="claw-grid-plus" aria-label="增加格数">＋</button>
        </div>
      </div>
      <p class="claw-formula" id="claw-formula-text">0 格 × ${level.unitDeg}° = 0°</p>
      <p class="claw-unit-caption">每格 = ${level.unitDeg}°，数一数红色目标线在第几格</p>

      <div class="claw-param-row">
        <span class="claw-param-label">⬇️ 下降圈数</span>
        <div class="claw-stepper">
          <button class="brick-btn brick-btn--gray brick-btn--icon" id="claw-turns-minus" aria-label="减少圈数">−</button>
          <span class="val" id="claw-turns-val">1</span>
          <button class="brick-btn brick-btn--gray brick-btn--icon" id="claw-turns-plus" aria-label="增加圈数">＋</button>
        </div>
      </div>

      <div class="claw-param-row">
        <span class="claw-param-label">🤏 夹爪力(N)</span>
        <div class="claw-stepper">
          <button class="brick-btn brick-btn--gray brick-btn--icon" id="claw-force-minus" aria-label="减少力度">−</button>
          <span class="val" id="claw-force-val">5</span>
          <button class="brick-btn brick-btn--gray brick-btn--icon" id="claw-force-plus" aria-label="增加力度">＋</button>
        </div>
      </div>
      <p class="claw-hint-text" id="claw-hint-text"></p>

      <div class="claw-buttons-row">
        <button class="brick-btn brick-btn--gray brick-btn--lg" id="claw-rehearse-btn">🔄 试一试（不计分）</button>
        <button class="brick-btn brick-btn--blue brick-btn--lg" id="claw-formal-btn">🤏 正式抓取！</button>
      </div>
      <div class="claw-attempts" id="claw-attempts-label">已正式尝试 0 次</div>
    </div>
  `;

  const sceneBox = container.querySelector('#claw-scene-box');
  const depthBox = container.querySelector('#claw-depth-box');
  const forceBox = container.querySelector('#claw-force-box');
  const gridVal = container.querySelector('#claw-grid-val');
  const turnsVal = container.querySelector('#claw-turns-val');
  const forceValEl = container.querySelector('#claw-force-val');
  const formulaText = container.querySelector('#claw-formula-text');
  const hintText = container.querySelector('#claw-hint-text');
  const rehearseBtn = container.querySelector('#claw-rehearse-btn');
  const formalBtn = container.querySelector('#claw-formal-btn');
  const attemptsLabel = container.querySelector('#claw-attempts-label');

  sceneBox.innerHTML = composeSceneMarkup(level);
  const armRotEl = sceneBox.querySelector('#claw-arm-rot');
  const prizeWrapEl = sceneBox.querySelector('#claw-prize-wrap');

  function setArmVisual(deg, animate) {
    armRotEl.style.transformOrigin = `${CX}px ${CY}px`;
    armRotEl.style.transition = animate ? 'transform .6s cubic-bezier(.34,1.15,.4,1)' : 'none';
    armRotEl.style.transform = `rotate(${-deg}deg)`;
  }
  setArmVisual(HOME_ARM_DEG, false);

  function renderDepthGauge(turnsPreview) {
    depthBox.innerHTML = Art.depthGauge({ totalTurns: 4, turns: turnsPreview, targetTurns: level.targetTurns });
  }
  function renderForceGauge(valuePreview) {
    const min = revealHidden ? valuePreview : level.prize.forceMin;
    const max = revealHidden ? valuePreview : level.prize.forceMax;
    forceBox.innerHTML = Art.forceGauge({ value: valuePreview, min, max });
  }
  renderDepthGauge(turnsN);
  renderForceGauge(forceVal);

  function updateFormula() {
    formulaText.textContent = `${gridN} 格 × ${level.unitDeg}° = ${gridN * level.unitDeg}°`;
  }
  function updateHintText() {
    if (revealHidden) { hintText.textContent = '靠记忆～安全带先藏起来了！'; return; }
    const { name, fragile, forceMin, forceMax } = level.prize;
    hintText.textContent = fragile
      ? `${name}很脆弱，力道要刚刚好（${forceMin}-${forceMax}N）～`
      : `${name}结结实实，可以抓紧一点（${forceMin}-${forceMax}N）！`;
  }
  updateFormula();
  updateHintText();

  function setControlsDisabled(disabled) {
    [gridMinusBtn, gridPlusBtn, turnsMinusBtn, turnsPlusBtn, forceMinusBtn, forcePlusBtn, rehearseBtn, formalBtn]
      .forEach((btn) => { btn.disabled = disabled; });
  }

  const gridMinusBtn = container.querySelector('#claw-grid-minus');
  const gridPlusBtn = container.querySelector('#claw-grid-plus');
  const turnsMinusBtn = container.querySelector('#claw-turns-minus');
  const turnsPlusBtn = container.querySelector('#claw-turns-plus');
  const forceMinusBtn = container.querySelector('#claw-force-minus');
  const forcePlusBtn = container.querySelector('#claw-force-plus');

  gridMinusBtn.addEventListener('click', () => {
    if (running) return;
    api.sfx.click();
    gridN = Math.max(0, gridN - 1);
    gridVal.textContent = String(gridN);
    updateFormula();
  });
  gridPlusBtn.addEventListener('click', () => {
    if (running) return;
    api.sfx.click();
    gridN = Math.min(level.maxGrid, gridN + 1);
    gridVal.textContent = String(gridN);
    updateFormula();
  });
  turnsMinusBtn.addEventListener('click', () => {
    if (running) return;
    api.sfx.click();
    turnsN = Math.max(1, turnsN - 1);
    turnsVal.textContent = String(turnsN);
    renderDepthGauge(turnsN);
  });
  turnsPlusBtn.addEventListener('click', () => {
    if (running) return;
    api.sfx.click();
    turnsN = Math.min(4, turnsN + 1);
    turnsVal.textContent = String(turnsN);
    renderDepthGauge(turnsN);
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

  /* 演练：只转臂，不降不夹，不计入尝试次数，可反复按 */
  rehearseBtn.addEventListener('click', () => {
    if (running) return;
    api.sfx.click();
    setArmVisual(gridN * level.unitDeg, true);
    api.mascot.say('看看夹爪对准红色目标线了吗？', 'think', 2200);
  });

  /* 用 setTimeout 驱动补间，不用 requestAnimationFrame——rAF 在标签页被切到后台/隐藏时会
   * 完全暂停触发（已用无头浏览器实测确认），若用它驱动这里的补间，关卡会在正式抓取过程中
   * 卡死不再响应；setTimeout 在后台最多只是被节流，仍会继续推进，不会卡死。 */
  function tweenValue(from, to, ms, onUpdate) {
    return new Promise((resolve) => {
      if (cancelled) { resolve(); return; }
      const t0 = performance.now();
      const STEP_MS = 30;
      function step() {
        if (cancelled) { resolve(); return; }
        const p = ms <= 0 ? 1 : Math.min(1, (performance.now() - t0) / ms);
        onUpdate(from + (to - from) * p);
        if (p < 1) {
          timers.push(setTimeout(step, STEP_MS));
        } else {
          resolve();
        }
      }
      step();
    });
  }

  function buildFailMessage(angleOk, turnsOk, forceOk) {
    if (!angleOk) return '格数不对，再数一数目标在第几格！';
    if (!turnsOk) return '圈数不对，再看看深度仪表上的红箭头！';
    if (!forceOk) return level.prize.fragile ? '力道太大，捏碎了……轻一点！' : '力道不够，它从爪子里溜走了！';
    return '差一点点，再试一次！';
  }

  async function runFormalAttempt() {
    if (running) return;
    running = true;
    attempts += 1;
    attemptsLabel.textContent = `已正式尝试 ${attempts} 次`;
    setControlsDisabled(true);
    revealHidden = true;
    renderForceGauge(forceVal);
    updateHintText();

    api.mascot.say('抓取中……', 'think', 1600);

    // 阶段①：转臂到位
    setArmVisual(gridN * level.unitDeg, true);
    await wait(650, timers);
    if (cancelled) return;

    // 阶段②：下降（深度仪表联动补间）
    await tweenValue(0, turnsN, 500, (v) => renderDepthGauge(v));
    if (cancelled) return;
    await wait(120, timers);
    if (cancelled) return;

    // 阶段③：夹（力度仪表联动补间 + 咔哒声）
    await tweenValue(0, forceVal, 400, (v) => renderForceGauge(v));
    if (cancelled) return;
    api.sfx.snap();
    await wait(280, timers);
    if (cancelled) return;

    const angleOk = gridN === level.targetGrid;
    const turnsOk = turnsN === level.targetTurns;
    const forceOk = forceVal >= level.prize.forceMin && forceVal <= level.prize.forceMax;
    const success = angleOk && turnsOk && forceOk;

    if (success) {
      // 阶段④：升 + 抓到物品沿臂回到底座（转盘位置），淡出表示收进篮子
      await tweenValue(turnsN, 0, 400, (v) => renderDepthGauge(v));
      if (cancelled) return;
      prizeWrapEl.style.transform = `translate(${(CX - level.slot.x).toFixed(1)}px, ${(CY - level.slot.y).toFixed(1)}px) scale(.25)`;
      prizeWrapEl.style.opacity = '0';
      api.sfx.success();
      await wait(650, timers);
      if (cancelled) return;
      setArmVisual(HOME_ARM_DEG, true);
      api.mascot.say('抓进篮子啦！', 'cheer');
      const stars = attempts === 1 ? 3 : attempts <= 3 ? 2 : 1;
      api.complete(stars);
      return;
    }

    // 失败：回位，恢复演练态展示，允许再次尝试
    await tweenValue(turnsN, 0, 350, (v) => renderDepthGauge(v));
    if (cancelled) return;
    setArmVisual(HOME_ARM_DEG, true);
    await wait(200, timers);
    if (cancelled) return;

    revealHidden = false;
    renderForceGauge(forceVal);
    updateHintText();

    const reason = !angleOk ? 'wrong-grid' : !turnsOk ? 'wrong-turns' : 'wrong-force';
    api.fail(reason);
    api.mascot.say(buildFailMessage(angleOk, turnsOk, forceOk), 'oops');

    setControlsDisabled(false);
    running = false;
  }

  formalBtn.addEventListener('click', () => { api.sfx.click(); runFormalAttempt(); });

  api.mascot.say('数格子，拨角度，稳稳抓住它！', 'idle', 4200);

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
