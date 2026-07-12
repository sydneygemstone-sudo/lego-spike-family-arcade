/* games/bridge.js — 4. 精准渡桥 v3 (docs/superpowers/specs/2026-07-13-games-v3-redesign.md §四)
 * 保留 L1 现有机制（小轮 1圈=1步 + 试转一圈教学），L2/L3 升级为"轮子组合的线性方程"：
 *
 *   L1：小轮 1圈=1步，桥长 N 步 → N 圈（现状不变）。
 *   L2：双轮换装——出发前配置两段行程（每段各选 大轮1圈=2步 / 小轮1圈=1步 + 圈数），
 *       `圈1×步1 + 圈2×步2 = 桥长` 才能过桥，多解（纯小轮也行），星级奖励"总圈数最少"的解。
 *   L3：往返任务——去程/回程各配置一段（轮型由关卡指定，去大回小或反之，不可选），
 *       一次性预设两段圈数、出发后不可中改；到对岸拿旗动画后原路换轮返回。
 *
 * 美术：assets/art.js 的 bridgeScene/bridgeRoverX（桥面几何不变）+ roverSideWheeled
 * （wheelScale 1=小轮/1.45=大轮，Fable 5 亲绘）+ dialFrame（L1 拨轮沿用）。
 * 换轮音效复用 api.sfx.snap()（本来就是"乐高积木咔哒声"，语义对得上"咔嚓"）。
 *
 * 星级：
 *   L1：一次精准 3★ / 补拨 2★ / 掉水后过 1★（不变）。
 *   L2：掉水过一次封顶 1★；否则总圈数=理论最少(⌈N/2⌉) → 3★，达标但非最少 → 2★（教优化）。
 *   L3：掉水过一次封顶 1★；否则第 1 次就双段全对 3★ / 2 次内 2★ / 3 次及以上 1★。
 * 协议见 API.md：export default {id,title,icon,init,destroy}，api.level 决定关卡生成。
 */

import { bridgeScene, bridgeRoverX, roverSideWheeled, dialFrame } from '../assets/art.js';

const DIAL_MIN = 1, DIAL_MAX = 10; // L1 拨轮范围
const SEG_MIN = 0, SEG_MAX = 10; // L2/L3 分段圈数范围（0=该段不用）
const GO_MS_PER_STEP = 90, GO_MS_BASE = 340;
const TRIAL_MS = 420;
const SWAP_MS = 420;
// 与 assets/art.js#bridgeScene 内部常量保持一致，用于把 viewBox 坐标换算成 % 布局
const BX = 120, BW = 64, BY = 150;
const DECK_TOP_PCT = ((BY + 13) / 260) * 100; // 桥板纵向中心
const WATER_TOP_PCT = 92; // 掉水后下沉到的位置（水面可视区域内）

function randInt(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[randInt(arr.length)]; }
function wait(ms) { return new Promise((resolve) => { pendingTimers.push(setTimeout(resolve, ms)); }); }
function sceneWidth(steps) { return BX + steps * BW + 130; }
const SCENE_TARGET_H = 230; // px：桥面舞台固定目标高度，桥短（横纵比更"方"）时也不会把卡片撑高
/** 按固定目标高度反算舞台宽度上限，与 games/sort.js 的传送带舞台同一手法：不管桥有多短，
 * 卡片高度都稳定，避免小 N 时桥面相对更"方"、按 100% 宽度铺满反而把整卡撑得很高。 */
function capSceneWidth(container, steps) {
  const outer = container.querySelector('.bridge-scene-outer');
  const inner = container.querySelector('.bridge-scene-inner');
  if (!outer || !inner) return;
  const availW = outer.getBoundingClientRect().width || 700;
  const aspect = sceneWidth(steps) / 260;
  inner.style.maxWidth = `${Math.min(availW, SCENE_TARGET_H * aspect)}px`;
}
function stepsPerRevOf(wheel) { return wheel === 'big' ? 2 : 1; }
function wheelScaleOf(wheel) { return wheel === 'big' ? 1.45 : 1; }
function wheelLabel(wheel) { return wheel === 'big' ? '大轮' : '小轮'; }

/* --------------------------------------------------------------------------
 * 一次性注入本关专属样式
 * -------------------------------------------------------------------------- */
let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .bridge-stage-card { display:flex; flex-direction:column; }
    .bridge-scene-outer {
      flex:1; max-height:42vh; position:relative; border-radius: var(--radius-md); overflow:hidden;
      display:flex; align-items:center; justify-content:center;
      background: linear-gradient(180deg, #FFF7E8 0%, #DCF1F5 55%, #BEE3F0 100%);
      padding: 4px 0;
    }
    .bridge-scene-inner { position:relative; width:100%; }
    .bridge-scene-inner svg { width:100%; height:auto; display:block; }
    .bridge-rover-pos {
      position:absolute; left:0; top:${DECK_TOP_PCT}%;
      width: 16%; aspect-ratio: 150/110;
      transform: translate(-50%,-50%);
      transition: top .5s ease, opacity .4s ease;
      pointer-events:none;
      filter: drop-shadow(0 4px 5px rgba(0,0,0,.28));
    }
    .bridge-rover-pos.bridge-rover-flip { transform: translate(-50%,-50%) scaleX(-1); }
    .bridge-rover-pos svg { width:100%; height:100%; display:block; }
    .bridge-rover-pos.bridge-wheel-swap-pulse { animation: bridge-swap-flash ${SWAP_MS}ms ease; }
    @keyframes bridge-swap-flash { 0%,100% { filter: drop-shadow(0 4px 5px rgba(0,0,0,.28)); } 50% { filter: drop-shadow(0 0 12px rgba(245,197,24,.9)) brightness(1.25); } }
    .bridge-splash {
      position:absolute; left:0; top:0; width:16%; aspect-ratio:1;
      transform:translate(-50%,-50%); pointer-events:none; opacity:0;
    }
    .bridge-splash::before, .bridge-splash::after {
      content:""; position:absolute; inset:0; border-radius:50%;
      border: 3px solid rgba(10,163,181,.7); opacity:0;
    }
    .bridge-splash.show::before { animation: bridge-splash-pop .6s ease-out; }
    .bridge-splash.show::after { animation: bridge-splash-pop .6s ease-out .14s; }
    @keyframes bridge-splash-pop {
      0% { opacity:1; transform: scale(.25); }
      100% { opacity:0; transform: scale(1.8); }
    }

    .bridge-stage-card.brick-card, .bridge-trial-card.brick-card, .bridge-formula-card.brick-card, .bridge-config-card.brick-card { padding: 20px var(--space-4) 8px; }
    .bridge-page { display:flex; flex-direction:column; gap:16px; }
    .bridge-lower-row { display:flex; flex-direction:column; gap:10px; }
    .bridge-trial-card { display:flex; align-items:center; }
    .bridge-trial-row { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .bridge-trial-hint { color: var(--ink-500); font-size: var(--font-small); font-weight:700; }

    /* 横屏短视口（如 1024×768）：竖排（桥面场景 + 下方配置卡）叠加会超出 768 高，改成
     * 场景左 · 配置区右两栏（参照 games/claw.js 同一断点的做法）。L1 的 lower-row 原本在
     * 这个断点会自己横向拆成"试转|算式"两栏——但那是假设桥面场景仍在最上方占满整行；
     * 现在桥面场景挪去左栏了，lower-row 变成右栏内容，改回纵向堆叠（试转卡在上，算式卡在下），
     * 不再跟外层的左右分栏抢横向空间。L2/L3 的 config-card 整卡挪到右栏，本来就没有这层
     * 二次拆分，直接跟着变窄即可（内部 seg-row/leg-row 仍有自己独立的 ≥600px 横排规则）。 */
    @media (min-width: 700px) and (max-height: 840px) {
      .bridge-page { flex-direction:row; align-items:stretch; gap:14px; }
      .bridge-stage-card { flex:1.1 1 0; min-width:0; padding-top:10px; }
      .bridge-scene-outer { flex:1 1 auto; max-height:none; height:auto; min-height:0; }
      .bridge-lower-row, .bridge-config-card { flex:1 1 0; min-width:0; }
      .bridge-lower-row { flex-direction:column; justify-content:center; gap:8px; }
      .bridge-trial-card.brick-card, .bridge-formula-card.brick-card { padding: 10px 12px 6px; }
      .bridge-config-card.brick-card { padding: 22px 12px 6px; }
      .bridge-trial-row { gap:8px; }
      .bridge-trial-hint { font-size:10.5px; }
      .bridge-formula-big { font-size: clamp(13px,2vw,17px); margin-bottom:0; }
      .bridge-dial-outer { width: clamp(64px,9vw,80px); margin:2px auto 0; }
      .bridge-dial-readout { font-size: clamp(16px,3vw,22px); }
      .bridge-config-card .flex-center .brick-btn--lg,
      .bridge-formula-card .flex-center .brick-btn--lg { min-height:42px; padding:8px 18px; font-size:13.5px; margin-top:4px; }
      .bridge-status2, .bridge-status { font-size:10.5px; margin-top:4px; }
      .bridge-seg-row, .bridge-leg-row { gap:6px; }
      .bridge-seg, .bridge-leg-box { padding:6px; gap:4px; }
      .bridge-wheel-btn { min-width:60px; min-height:48px; padding:5px 7px; font-size:9.5px; }
      .bridge-wheel-btn .bwd { font-size:16px !important; }
      .bridge-seg-stepper { gap:6px; }
      .bridge-seg-val { font-size:19px; min-width:26px; }
      .bridge-hint2 { margin:1px 0 3px; font-size:10.5px; }
      .bridge-leg-wheel { font-size: clamp(11px,1.8vw,13px); }
    }

    .bridge-formula-big {
      text-align:center; font-weight:800;
      font-size: clamp(16px, 3.2vw, 24px);
      color: var(--ink-900);
      margin-bottom: 4px;
    }
    .bridge-formula-answer {
      font-size: clamp(24px, 5.4vw, 38px);
      font-weight:900;
      color: var(--cat-bridge-dark, #036B77);
      display:inline-block;
      transition: transform .18s cubic-bezier(.34,1.56,.64,1);
    }
    .bridge-formula-answer.pop { transform: scale(1.28); }

    .bridge-dial-outer {
      position:relative; width:clamp(92px,22vw,132px); aspect-ratio:150/190; margin:4px auto 2px;
    }
    .bridge-dial-outer svg { width:100%; height:100%; display:block; }
    .bridge-dial-hit { position:absolute; left:0; right:0; background:transparent; border:none; }
    .bridge-dial-hit--up { top:0; height:40%; }
    .bridge-dial-hit--down { bottom:0; height:40%; }
    .bridge-dial-readout {
      position:absolute; left:50%; top:51%; transform:translate(-50%,-50%);
      font-size: clamp(22px,5vw,32px); font-weight:900; color:var(--ink-900); pointer-events:none;
    }

    /* ---- L2/L3 分段配置卡 ---- */
    .bridge-seg-row, .bridge-leg-row { display:flex; flex-direction:column; gap:12px; }
    @media (min-width: 600px) {
      .bridge-seg-row, .bridge-leg-row { flex-direction:row; }
    }
    .bridge-seg, .bridge-leg-box {
      flex:1; display:flex; flex-direction:column; align-items:center; gap:8px;
      padding:10px; border-radius:14px; background:var(--paper-50); border:2px solid var(--ink-200,#DDE3E9);
    }
    .bridge-seg-title, .bridge-leg-title { font-weight:800; font-size: var(--font-small); color: var(--ink-700); margin:0; }
    .bridge-leg-wheel { font-weight:900; font-size: clamp(14px,2.6vw,17px); color: var(--cat-bridge-dark,#036B77); }
    .bridge-wheel-toggle { display:flex; gap:8px; }
    .bridge-wheel-btn {
      display:flex; flex-direction:column; align-items:center; gap:2px; min-width:74px; padding:8px 10px;
      border-radius:12px; border:3px solid var(--ink-300); background:var(--paper-0); font-size:11px; font-weight:800;
      color:var(--ink-700); min-height:64px; line-height:1.25;
    }
    .bridge-wheel-btn .bwd { line-height:1; }
    .bridge-wheel-btn--active { border-color: var(--cat-bridge, #0AA3B5); background:#DFF7FA; color:var(--cat-bridge-dark,#036B77); }
    .bridge-seg-stepper { display:flex; align-items:center; gap:10px; }
    .bridge-seg-val { font-size:26px; font-weight:900; min-width:34px; text-align:center; color:var(--ink-900); }
    .bridge-hint2 { text-align:center; font-size: var(--font-small); font-weight:800; margin: 2px 0 6px; }
    .bridge-hint2--ok { color: var(--lego-green,#237841); }
    .bridge-hint2--bad { color: var(--lego-orange,#E8710A); }
    .bridge-status2 { text-align:center; font-size: var(--font-small); font-weight:700; color:var(--ink-700); min-height:1.4em; margin-top:6px; }
    .bridge-locked { opacity:.55; pointer-events:none; }
  `;
  document.head.appendChild(style);
}

/* ---- 模块级状态（单例关卡，同一时刻只会有一个 bridge 实例挂载） ---- */
let apiRef = null;
let level = 1;
let N = 6;
let position = 0;
let attempts = 0;
let fellAtLeastOnce = false;
let busy = false;
let destroyed = false;
let roverPosEl = null, splashEl = null;
let pendingTimers = [];
let currentWheelDeg = 0;
let currentWheelScale = 1;

// L1
let dialValue = 1;
// L2
let seg1Wheel = 'big', seg1Rev = 0, seg2Wheel = 'small', seg2Rev = 0;
// L3
let goWheel = 'big', returnWheel = 'small', revGo = 0, revReturn = 0;

function xPercent(step) { return (bridgeRoverX(step, N) / sceneWidth(N)) * 100; }

/** roverSideWheeled 的参数是烘焙进 SVG 字符串的静态值（不是可 CSS 过渡的属性），
 * 按铁律①"用 JS 更新参数重渲染"逐帧调用，才能看到轮子真的转动/换装，而不是瞬跳。 */
function paintRover(face, wheelDeg, wheelScale = currentWheelScale) {
  currentWheelDeg = wheelDeg;
  currentWheelScale = wheelScale;
  if (roverPosEl) roverPosEl.innerHTML = roverSideWheeled({ face, wheelAngle: wheelDeg, wheelScale });
}

function placeRoverInstant(step) {
  if (!roverPosEl) return;
  roverPosEl.style.transition = 'none';
  roverPosEl.style.left = `${xPercent(step)}%`;
  roverPosEl.style.top = `${DECK_TOP_PCT}%`;
  roverPosEl.style.opacity = '1';
  void roverPosEl.offsetWidth;
  roverPosEl.style.transition = '';
}

/** 逐帧补间：位置（left%）+ 轮子转动角度同时更新。stepsPerRev 决定"这段行程"每转一圈
 * 对应的步数（大轮 2 / 小轮 1），转动圈数 = 实际走的步数 ÷ stepsPerRev。
 * 用 setTimeout 驱动补间，不用 requestAnimationFrame——已用无头浏览器实测确认 rAF 在标签页
 * 被切到后台/隐藏时会完全暂停触发，L2/L3 一次 Go 里要连续跑两段+换轮好几个补间，若用 rAF
 * 驱动，孩子切出 App 再切回来就会卡死不再响应；setTimeout 在后台最多只是被节流，仍会继续
 * 推进，不会卡死（同样的教训见 games/sort.js 的 tweenWheel 注释）。 */
function animateMove(fromStep, toStep, ms, { spin = false, face = 'effort', wheelScale = currentWheelScale, stepsPerRev = 1 } = {}) {
  return new Promise((resolve) => {
    if (destroyed || !roverPosEl) { resolve(); return; }
    const t0 = performance.now();
    const dist = Math.abs(toStep - fromStep) || 1;
    const totalWheelDeg = spin ? 360 * (dist / stepsPerRev) : 0;
    const STEP_MS = 30;
    function tick() {
      if (destroyed) { resolve(); return; }
      const raw = ms <= 0 ? 1 : Math.min(1, (performance.now() - t0) / ms);
      const step = fromStep + (toStep - fromStep) * raw;
      roverPosEl.style.left = `${xPercent(step)}%`;
      paintRover(face, spin ? (raw * totalWheelDeg) % 360 : currentWheelDeg, wheelScale);
      if (raw < 1) pendingTimers.push(setTimeout(tick, STEP_MS));
      else resolve();
    }
    tick();
  });
}

async function swapWheelAnim(newWheel) {
  const scale = wheelScaleOf(newWheel);
  if (Math.abs(scale - currentWheelScale) < 0.01) return; // 两段轮型相同，不用换
  apiRef.sfx.snap();
  if (roverPosEl) {
    roverPosEl.classList.remove('bridge-wheel-swap-pulse');
    void roverPosEl.offsetWidth;
    roverPosEl.classList.add('bridge-wheel-swap-pulse');
  }
  paintRover('effort', currentWheelDeg, scale);
  await wait(SWAP_MS);
  if (destroyed) return;
  paintRover('happy', currentWheelDeg, scale);
  if (roverPosEl) roverPosEl.classList.remove('bridge-wheel-swap-pulse');
}

async function fallOffBridge(reasonMsg) {
  apiRef.fail('overshoot-fell');
  const overStep = N + 1; // bridgeRoverX 对 step>steps 会给出"越过对岸"的坐标
  await animateMove(position, overStep, 420, { spin: true, face: 'oops' });
  if (destroyed) return;
  paintRover('oops', currentWheelDeg);
  roverPosEl.style.top = `${WATER_TOP_PCT}%`;
  roverPosEl.style.opacity = '0.15';
  roverPosEl.classList.remove('bridge-rover-flip');
  if (splashEl) {
    splashEl.style.left = roverPosEl.style.left;
    splashEl.style.top = `${WATER_TOP_PCT}%`;
    splashEl.classList.remove('show');
    void splashEl.offsetWidth;
    splashEl.classList.add('show');
  }
  await wait(520);
  if (destroyed) return;
  position = 0; attempts = 0; fellAtLeastOnce = true;
  placeRoverInstant(0);
  paintRover('happy', 0);
}

/* ============================================================================
 * L1 —— 小轮 1圈=1步（现状机制，试转一圈教学环保留）
 * ========================================================================== */
function updateFormulaL1(container) {
  const labelEl = container.querySelector('#bridge-formula-label');
  const answerEl = container.querySelector('#bridge-formula-answer');
  if (!labelEl || !answerEl) return;
  const remaining = N - position;
  labelEl.textContent = position === 0 ? `桥长 ${N} 步` : `剩下 ${remaining} 步`;
  answerEl.textContent = String(dialValue);
}

function bumpFormula(container) {
  const answerEl = container.querySelector('#bridge-formula-answer');
  if (!answerEl) return;
  answerEl.classList.remove('pop');
  void answerEl.offsetWidth;
  answerEl.classList.add('pop');
}

function setControlsEnabledL1(container, enabled) {
  ['#bridge-trial-btn', '#bridge-dial-up', '#bridge-dial-down', '#bridge-go'].forEach((sel) => {
    const el = container.querySelector(sel);
    if (el) el.disabled = !enabled;
  });
}

/** 教学环④：演练一次不计分——原地演示"转一圈=走一步"，动画结束后退回当前真实进度。 */
async function handleTrial(container) {
  if (busy) return;
  busy = true;
  setControlsEnabledL1(container, false);
  apiRef.sfx.click();
  const statusEl = container.querySelector('#bridge-status');
  statusEl.textContent = '看仔细：轮子转一圈，机器人正好走 1 步！';

  const demoTarget = Math.min(N, position + 1);
  await animateMove(position, demoTarget, TRIAL_MS, { spin: true, face: 'effort', wheelScale: 1, stepsPerRev: 1 });
  if (destroyed) return;
  paintRover('happy', 0, 1);
  await wait(550);
  if (destroyed) return;
  apiRef.mascot.say('1 圈 = 1 步，数好几圈就能到！', 'think', 1800);

  await animateMove(demoTarget, position, TRIAL_MS, { spin: false, face: 'happy', wheelScale: 1 });
  if (destroyed) return;
  paintRover('happy', 0, 1);
  statusEl.textContent = position === 0
    ? '试转随便玩，正式前进按下面的"前进"按钮！'
    : `刚才只是演练，你还停在第 ${position} 步～`;

  if (!destroyed) { setControlsEnabledL1(container, true); busy = false; }
}

async function handleGoL1(container) {
  if (busy) return;
  busy = true;
  setControlsEnabledL1(container, false);
  apiRef.sfx.click();
  const statusEl = container.querySelector('#bridge-status');
  const X = dialValue;
  attempts += 1;
  const target = position + X;

  if (target > N) {
    statusEl.textContent = '拨太多了，冲过桥掉进水里啦！';
    await fallOffBridge();
    if (!destroyed) statusEl.textContent = `扑通！回到起点重新拨吧～（桥长 ${N} 步）`;
  } else if (target === N) {
    const ms = GO_MS_BASE + X * GO_MS_PER_STEP;
    await animateMove(position, target, ms, { spin: true, face: 'effort', wheelScale: 1, stepsPerRev: 1 });
    if (!destroyed) {
      position = target;
      paintRover('happy', currentWheelDeg, 1);
      apiRef.sfx.success();
      const stars = fellAtLeastOnce ? 1 : (attempts === 1 ? 3 : attempts === 2 ? 2 : 1);
      apiRef.mascot.say('稳稳落地，过桥成功！', 'cheer');
      statusEl.textContent = '过桥成功！';
      await wait(650);
      if (!destroyed) apiRef.complete(stars);
    }
  } else {
    const ms = GO_MS_BASE + X * GO_MS_PER_STEP;
    await animateMove(position, target, ms, { spin: true, face: 'effort', wheelScale: 1, stepsPerRev: 1 });
    if (!destroyed) {
      position = target;
      paintRover('happy', currentWheelDeg, 1);
      statusEl.textContent = `停在桥上啦，已经前进 ${position} 步（还剩 ${N - position} 步），再拨一次试试！`;
      apiRef.mascot.say('差一点点，再拨一次！', 'think');
    }
  }

  if (!destroyed) {
    dialValue = 1;
    container.querySelector('#bridge-dial-value').textContent = '1';
    updateFormulaL1(container);
    busy = false;
    setControlsEnabledL1(container, true);
  }
}

function buildDOM_L1(container, steps) {
  container.innerHTML = `
    <div class="bridge-page">
      <div class="brick-card brick-card--cat-bridge bridge-stage-card">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:6px;">
          <h2 class="title-md" style="margin:0;">🌉 精准渡桥</h2>
          <div class="text-muted title-sm" id="bridge-info">桥长 ${steps} 步 · 轮子转一圈 = 前进 1 步</div>
        </div>
        <div class="bridge-scene-outer">
          <div class="bridge-scene-inner" id="bridge-scene-inner">
            ${bridgeScene({ steps })}
            <div class="bridge-rover-pos" id="bridge-rover-pos"></div>
            <div class="bridge-splash" id="bridge-splash"></div>
          </div>
        </div>
      </div>

      <div class="bridge-lower-row">
        <div class="brick-card brick-card--cyan bridge-trial-card">
          <div class="bridge-trial-row">
            <button id="bridge-trial-btn" class="brick-btn" style="--btn-face:var(--lego-cyan); --btn-face-light:var(--lego-cyan-light); --btn-face-dark:var(--lego-cyan-dark);">🔄 试转一圈</button>
            <div class="bridge-trial-hint">不计分，可以多试几次，看看"1 圈 = 1 步"！</div>
          </div>
        </div>

        <div class="brick-card brick-card--yellow bridge-formula-card">
          <div class="bridge-formula-big">
            <span id="bridge-formula-label">桥长 ${steps} 步</span> × 1 圈/步 =
            <span class="bridge-formula-answer" id="bridge-formula-answer">1</span> 圈
          </div>
          <div class="bridge-dial-outer" id="bridge-dial-outer">
            ${dialFrame({ label: '圈数' })}
            <button class="bridge-dial-hit bridge-dial-hit--up" id="bridge-dial-up" aria-label="拨多一圈"></button>
            <button class="bridge-dial-hit bridge-dial-hit--down" id="bridge-dial-down" aria-label="拨少一圈"></button>
            <div class="bridge-dial-readout" id="bridge-dial-value">1</div>
          </div>
          <div class="flex-center" style="margin-top:6px;">
            <button id="bridge-go" class="brick-btn brick-btn--green brick-btn--lg">🚀 就这样，前进！</button>
          </div>
          <div class="text-center title-sm" id="bridge-status" style="margin-top:10px;">拨好圈数，核对算式，按"前进"试试看！</div>
        </div>
      </div>
    </div>
  `;
}

function initL1(container, api) {
  N = 4 + randInt(5); // 4-8
  position = 0; attempts = 0; fellAtLeastOnce = false; dialValue = 1;

  buildDOM_L1(container, N);
  capSceneWidth(container, N);
  roverPosEl = container.querySelector('#bridge-rover-pos');
  splashEl = container.querySelector('#bridge-splash');
  paintRover('happy', 0, 1);
  placeRoverInstant(0);
  updateFormulaL1(container);

  container.querySelector('#bridge-trial-btn').addEventListener('click', () => handleTrial(container));

  container.querySelector('#bridge-dial-up').addEventListener('click', () => {
    if (busy) return;
    dialValue = Math.min(DIAL_MAX, dialValue + 1);
    container.querySelector('#bridge-dial-value').textContent = String(dialValue);
    updateFormulaL1(container);
    bumpFormula(container);
    api.sfx.click();
  });
  container.querySelector('#bridge-dial-down').addEventListener('click', () => {
    if (busy) return;
    dialValue = Math.max(DIAL_MIN, dialValue - 1);
    container.querySelector('#bridge-dial-value').textContent = String(dialValue);
    updateFormulaL1(container);
    bumpFormula(container);
    api.sfx.click();
  });
  container.querySelector('#bridge-go').addEventListener('click', () => handleGoL1(container));

  api.mascot.say(`桥长 ${N} 步，数好格子拨对圈数！`, 'idle');
}

/* ============================================================================
 * L2 —— 双轮换装：两段行程（各选轮型 + 圈数），圈1×步1+圈2×步2=桥长才能过桥，
 * 星级奖励"总圈数最少"的解（教优化思想）。
 * ========================================================================== */
function optimalTotalRevs(n) { return Math.ceil(n / 2); }

function buildDOM_L2(container, steps) {
  container.innerHTML = `
    <div class="bridge-page">
      <div class="brick-card brick-card--cat-bridge bridge-stage-card">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:6px;">
          <h2 class="title-md" style="margin:0;">🌉 精准渡桥 · 双轮换装</h2>
          <div class="text-muted title-sm">桥长 ${steps} 步</div>
        </div>
        <div class="bridge-scene-outer">
          <div class="bridge-scene-inner" id="bridge-scene-inner">
            ${bridgeScene({ steps })}
            <div class="bridge-rover-pos" id="bridge-rover-pos"></div>
            <div class="bridge-splash" id="bridge-splash"></div>
          </div>
        </div>
      </div>

      <div class="brick-card brick-card--yellow bridge-config-card">
        <p class="title-sm" style="margin:0 0 8px;">配两段行程，圈数×每圈步数加起来正好凑够 ${steps} 步！</p>
        <div class="bridge-seg-row">
          <div class="bridge-seg" data-seg="1">
            <p class="bridge-seg-title">第①段</p>
            <div class="bridge-wheel-toggle" data-seg="1">
              <button class="bridge-wheel-btn" data-seg="1" data-wheel="big"><span class="bwd" style="font-size:24px;">⚫</span><span>大轮<br>1圈=2步</span></button>
              <button class="bridge-wheel-btn" data-seg="1" data-wheel="small"><span class="bwd" style="font-size:12px;">⚫</span><span>小轮<br>1圈=1步</span></button>
            </div>
            <div class="bridge-seg-stepper">
              <button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-seg="1" data-dir="-1" aria-label="减少圈数">−</button>
              <span class="bridge-seg-val" data-seg="1">0</span>
              <button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-seg="1" data-dir="1" aria-label="增加圈数">＋</button>
            </div>
          </div>
          <div class="bridge-seg" data-seg="2">
            <p class="bridge-seg-title">第②段（换轮后）</p>
            <div class="bridge-wheel-toggle" data-seg="2">
              <button class="bridge-wheel-btn" data-seg="2" data-wheel="big"><span class="bwd" style="font-size:24px;">⚫</span><span>大轮<br>1圈=2步</span></button>
              <button class="bridge-wheel-btn" data-seg="2" data-wheel="small"><span class="bwd" style="font-size:12px;">⚫</span><span>小轮<br>1圈=1步</span></button>
            </div>
            <div class="bridge-seg-stepper">
              <button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-seg="2" data-dir="-1" aria-label="减少圈数">−</button>
              <span class="bridge-seg-val" data-seg="2">0</span>
              <button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-seg="2" data-dir="1" aria-label="增加圈数">＋</button>
            </div>
          </div>
        </div>
        <p class="bridge-formula-big" id="bridge-formula2"></p>
        <p class="bridge-hint2" id="bridge-formula2-hint"></p>
        <div class="flex-center">
          <button id="bridge-go2" class="brick-btn brick-btn--green brick-btn--lg">🚀 出发！</button>
        </div>
        <p class="bridge-status2" id="bridge-status2">配好两段轮型和圈数，按"出发"试试看！</p>
      </div>
    </div>
  `;
}

function updateWheelBtnActive(container) {
  container.querySelectorAll('.bridge-wheel-btn').forEach((btn) => {
    const seg = btn.dataset.seg;
    const active = (seg === '1' ? seg1Wheel : seg2Wheel) === btn.dataset.wheel;
    btn.classList.toggle('bridge-wheel-btn--active', active);
  });
}

function updateFormulaL2(container) {
  const step1 = stepsPerRevOf(seg1Wheel), step2 = stepsPerRevOf(seg2Wheel);
  const dist1 = seg1Rev * step1, dist2 = seg2Rev * step2;
  const total = dist1 + dist2;
  const formulaEl = container.querySelector('#bridge-formula2');
  const hintEl = container.querySelector('#bridge-formula2-hint');
  formulaEl.innerHTML = `${seg1Rev}圈×${step1}步(${wheelLabel(seg1Wheel)}) + ${seg2Rev}圈×${step2}步(${wheelLabel(seg2Wheel)}) = <span class="bridge-formula-answer">${total}</span> 步`;
  if (total === N) {
    hintEl.textContent = `✅ 正好 ${N} 步！`;
    hintEl.className = 'bridge-hint2 bridge-hint2--ok';
  } else {
    hintEl.textContent = total < N ? `还差 ${N - total} 步没到对岸` : `多了 ${total - N} 步，冲过头会掉水里！`;
    hintEl.className = 'bridge-hint2 bridge-hint2--bad';
  }
}

function setControlsEnabledL2(container, enabled) {
  container.querySelectorAll('.bridge-wheel-btn, .bridge-seg-stepper button, #bridge-go2').forEach((el) => { el.disabled = !enabled; });
}

async function handleGoL2(container) {
  if (busy) return;
  busy = true;
  setControlsEnabledL2(container, false);
  apiRef.sfx.click();
  const statusEl = container.querySelector('#bridge-status2');
  attempts += 1;

  const step1 = stepsPerRevOf(seg1Wheel), step2 = stepsPerRevOf(seg2Wheel);
  const dist1 = seg1Rev * step1;
  const dist2 = seg2Rev * step2;
  const totalRevsUsed = seg1Rev + seg2Rev;

  position = 0; placeRoverInstant(0); paintRover('happy', 0, wheelScaleOf(seg1Wheel));
  statusEl.textContent = '出发！第①段行程…';

  // 第①段
  const target1 = position + dist1;
  if (target1 > N) {
    statusEl.textContent = '第①段就冲过头了，掉水里啦！';
    await fallOffBridge();
    if (!destroyed) statusEl.textContent = `扑通！回到起点重新配两段行程吧～（桥长 ${N} 步）`;
    finishAttemptL2(container, false);
    return;
  }
  if (dist1 > 0) {
    const ms1 = GO_MS_BASE + dist1 * GO_MS_PER_STEP;
    await animateMove(position, target1, ms1, { spin: true, face: 'effort', wheelScale: wheelScaleOf(seg1Wheel), stepsPerRev: step1 });
    if (destroyed) return;
    position = target1;
    paintRover('happy', currentWheelDeg, wheelScaleOf(seg1Wheel));
  }

  // 换轮
  if (seg1Wheel !== seg2Wheel) {
    statusEl.textContent = '咔嚓！换轮子…';
    apiRef.mascot.say('换轮子啦！', 'think', 1400);
    await swapWheelAnim(seg2Wheel);
    if (destroyed) return;
  }

  // 第②段
  statusEl.textContent = '第②段行程…';
  const target2 = position + dist2;
  if (target2 > N) {
    await fallOffBridge();
    if (!destroyed) statusEl.textContent = `第②段冲过头，扑通掉水里！回到起点重新配吧～（桥长 ${N} 步）`;
    finishAttemptL2(container, false);
    return;
  }
  if (dist2 > 0) {
    const ms2 = GO_MS_BASE + dist2 * GO_MS_PER_STEP;
    await animateMove(position, target2, ms2, { spin: true, face: 'effort', wheelScale: wheelScaleOf(seg2Wheel), stepsPerRev: step2 });
    if (destroyed) return;
    position = target2;
    paintRover('happy', currentWheelDeg, wheelScaleOf(seg2Wheel));
  }

  if (position === N) {
    apiRef.sfx.success();
    const stars = fellAtLeastOnce ? 1 : (totalRevsUsed === optimalTotalRevs(N) ? 3 : 2);
    apiRef.mascot.say(stars === 3 ? '总圈数最少，完美方案！' : '过桥成功！', 'cheer');
    statusEl.textContent = '过桥成功！';
    await wait(650);
    if (!destroyed) apiRef.complete(stars);
    return;
  }

  // 未到岸（两段都不冲水但没走够）
  apiRef.fail('undershoot');
  statusEl.textContent = `还差 ${N - position} 步没到对岸，回到起点重新配两段行程吧！`;
  apiRef.mascot.say('总步数不够，再算一次！', 'think');
  await wait(700);
  if (destroyed) return;
  position = 0; placeRoverInstant(0); paintRover('happy', 0, wheelScaleOf(seg1Wheel));
  finishAttemptL2(container, false);
}

function finishAttemptL2(container, success) {
  if (destroyed) return;
  if (!success) {
    busy = false;
    setControlsEnabledL2(container, true);
    updateFormulaL2(container);
  }
}

function initL2(container, api) {
  N = pick([5, 7, 9]); // 奇数步长，保证存在混合最优解
  position = 0; attempts = 0; fellAtLeastOnce = false;
  seg1Wheel = 'big'; seg1Rev = 0; seg2Wheel = 'small'; seg2Rev = 0;

  buildDOM_L2(container, N);
  capSceneWidth(container, N);
  roverPosEl = container.querySelector('#bridge-rover-pos');
  splashEl = container.querySelector('#bridge-splash');
  paintRover('happy', 0, wheelScaleOf(seg1Wheel));
  placeRoverInstant(0);
  updateWheelBtnActive(container);
  updateFormulaL2(container);

  container.querySelectorAll('.bridge-wheel-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (busy) return;
      const seg = btn.dataset.seg;
      const wheel = btn.dataset.wheel;
      if (seg === '1') { seg1Wheel = wheel; if (position === 0) paintRover('happy', 0, wheelScaleOf(wheel)); }
      else seg2Wheel = wheel;
      api.sfx.click();
      updateWheelBtnActive(container);
      updateFormulaL2(container);
    });
  });
  container.querySelectorAll('.bridge-seg-stepper button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (busy) return;
      const seg = btn.dataset.seg;
      const dir = Number(btn.dataset.dir);
      if (seg === '1') seg1Rev = Math.max(SEG_MIN, Math.min(SEG_MAX, seg1Rev + dir));
      else seg2Rev = Math.max(SEG_MIN, Math.min(SEG_MAX, seg2Rev + dir));
      container.querySelector(`.bridge-seg-val[data-seg="${seg}"]`).textContent = String(seg === '1' ? seg1Rev : seg2Rev);
      api.sfx.click();
      updateFormulaL2(container);
    });
  });
  container.querySelector('#bridge-go2').addEventListener('click', () => handleGoL2(container));

  api.mascot.say(`桥长 ${N} 步，两段轮子配合起来正好走够！`, 'idle');
}

/* ============================================================================
 * L3 —— 往返任务：去程/回程各一段（轮型由关卡指定，不可选），一次性预设两段圈数，
 * 出发后不可中改；到对岸拿旗动画后换轮返回。
 * ========================================================================== */
function buildDOM_L3(container, steps) {
  const goStep = stepsPerRevOf(goWheel), retStep = stepsPerRevOf(returnWheel);
  container.innerHTML = `
    <div class="bridge-page">
      <div class="brick-card brick-card--cat-bridge bridge-stage-card">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:6px;">
          <h2 class="title-md" style="margin:0;">🌉 精准渡桥 · 往返任务</h2>
          <div class="text-muted title-sm">桥长 ${steps} 步（去、回都一样）</div>
        </div>
        <div class="bridge-scene-outer">
          <div class="bridge-scene-inner" id="bridge-scene-inner">
            ${bridgeScene({ steps })}
            <div class="bridge-rover-pos" id="bridge-rover-pos"></div>
            <div class="bridge-splash" id="bridge-splash"></div>
          </div>
        </div>
      </div>

      <div class="brick-card brick-card--yellow bridge-config-card">
        <p class="title-sm" style="margin:0 0 8px;">去程用${wheelLabel(goWheel)}、回程用${wheelLabel(returnWheel)}——一次性想好两段圈数，出发后中途不能改哦！</p>
        <div class="bridge-leg-row">
          <div class="bridge-leg-box">
            <p class="bridge-leg-title">🚩 去程 → 拿旗</p>
            <div class="bridge-leg-wheel">${wheelLabel(goWheel)}（1圈=${goStep}步）</div>
            <div class="bridge-seg-stepper">
              <button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-leg="go" data-dir="-1" aria-label="减少圈数">−</button>
              <span class="bridge-seg-val" data-leg="go">0</span>
              <button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-leg="go" data-dir="1" aria-label="增加圈数">＋</button>
            </div>
          </div>
          <div class="bridge-leg-box">
            <p class="bridge-leg-title">🏠 回程 → 回起点</p>
            <div class="bridge-leg-wheel">${wheelLabel(returnWheel)}（1圈=${retStep}步）</div>
            <div class="bridge-seg-stepper">
              <button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-leg="return" data-dir="-1" aria-label="减少圈数">−</button>
              <span class="bridge-seg-val" data-leg="return">0</span>
              <button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-leg="return" data-dir="1" aria-label="增加圈数">＋</button>
            </div>
          </div>
        </div>
        <p class="bridge-formula-big" id="bridge-formula3"></p>
        <p class="bridge-hint2" id="bridge-formula3-hint"></p>
        <div class="flex-center">
          <button id="bridge-go3" class="brick-btn brick-btn--green brick-btn--lg">🚀 出发（去程 + 回程）！</button>
        </div>
        <p class="bridge-status2" id="bridge-status3">配好去程、回程的圈数，按"出发"一次性完成往返！</p>
      </div>
    </div>
  `;
}

function updateFormulaL3(container) {
  const goStep = stepsPerRevOf(goWheel), retStep = stepsPerRevOf(returnWheel);
  const goDist = revGo * goStep, retDist = revReturn * retStep;
  const formulaEl = container.querySelector('#bridge-formula3');
  const hintEl = container.querySelector('#bridge-formula3-hint');
  formulaEl.innerHTML = `去 ${revGo}圈×${goStep}步 = <span class="bridge-formula-answer">${goDist}</span> 步　回 ${revReturn}圈×${retStep}步 = <span class="bridge-formula-answer">${retDist}</span> 步`;
  const goOk = goDist === N, retOk = retDist === N;
  if (goOk && retOk) {
    hintEl.textContent = `✅ 去、回都正好 ${N} 步！`;
    hintEl.className = 'bridge-hint2 bridge-hint2--ok';
  } else {
    hintEl.textContent = `桥长 ${N} 步：去程${goOk ? '✓' : (goDist < N ? '还差' + (N - goDist) + '步' : '多' + (goDist - N) + '步')}　回程${retOk ? '✓' : (retDist < N ? '还差' + (N - retDist) + '步' : '多' + (retDist - N) + '步')}`;
    hintEl.className = 'bridge-hint2 bridge-hint2--bad';
  }
}

function setControlsEnabledL3(container, enabled) {
  container.querySelectorAll('.bridge-seg-stepper button, #bridge-go3').forEach((el) => { el.disabled = !enabled; });
}

async function handleGoL3(container) {
  if (busy) return;
  busy = true;
  setControlsEnabledL3(container, false);
  apiRef.sfx.click();
  const statusEl = container.querySelector('#bridge-status3');
  attempts += 1;

  const goStep = stepsPerRevOf(goWheel), retStep = stepsPerRevOf(returnWheel);
  const goDist = revGo * goStep;
  const retDist = revReturn * retStep;

  position = 0; placeRoverInstant(0); paintRover('happy', 0, wheelScaleOf(goWheel));
  roverPosEl.classList.remove('bridge-rover-flip');
  statusEl.textContent = '出发去对岸拿旗！';

  const goTarget = goDist;
  if (goTarget > N) {
    statusEl.textContent = '去程就冲过头了，掉水里啦！';
    await fallOffBridge();
    resetAfterFailL3(container);
    return;
  }
  if (goDist > 0) {
    const ms = GO_MS_BASE + goDist * GO_MS_PER_STEP;
    await animateMove(position, goTarget, ms, { spin: true, face: 'effort', wheelScale: wheelScaleOf(goWheel), stepsPerRev: goStep });
    if (destroyed) return;
  }
  position = goTarget;

  if (position !== N) {
    apiRef.fail('undershoot-go');
    paintRover('oops', currentWheelDeg, wheelScaleOf(goWheel));
    statusEl.textContent = `去程没到对岸（差 ${N - position} 步），回到起点重新想两段圈数吧！`;
    apiRef.mascot.say('去程步数不对，再算一次！', 'think');
    await wait(700);
    if (destroyed) return;
    position = 0; placeRoverInstant(0); paintRover('happy', 0, wheelScaleOf(goWheel));
    resetAfterFailL3(container);
    return;
  }

  // 到对岸，拿旗！
  paintRover('happy', currentWheelDeg, wheelScaleOf(goWheel));
  statusEl.textContent = '拿到旗子啦！准备返程…';
  apiRef.sfx.success();
  apiRef.mascot.say('拿到旗子啦！准备返程！', 'cheer', 1800);
  await wait(650);
  if (destroyed) return;

  if (goWheel !== returnWheel) {
    statusEl.textContent = '咔嚓！换轮子准备返程…';
    await swapWheelAnim(returnWheel);
    if (destroyed) return;
  }

  roverPosEl.classList.add('bridge-rover-flip');
  statusEl.textContent = '返程中…';
  const retTarget = position - retDist;
  if (retTarget < 0) {
    // 回程冲过头（越过起点这一侧）——没有对应的落水美术，做温和失败处理
    await animateMove(position, 0, GO_MS_BASE + retDist * GO_MS_PER_STEP, { spin: true, face: 'oops', wheelScale: wheelScaleOf(returnWheel), stepsPerRev: retStep });
    if (destroyed) return;
    roverPosEl.classList.remove('bridge-rover-flip');
    apiRef.fail('overshoot-return');
    statusEl.textContent = '回程圈数太多，冲过起点了！回去重新想两段圈数吧～';
    apiRef.mascot.say('回程走过头啦，再想想！', 'oops');
    await wait(700);
    if (destroyed) return;
    position = 0; placeRoverInstant(0); paintRover('happy', 0, wheelScaleOf(goWheel));
    resetAfterFailL3(container);
    return;
  }
  if (retDist > 0) {
    const ms = GO_MS_BASE + retDist * GO_MS_PER_STEP;
    await animateMove(position, retTarget, ms, { spin: true, face: 'effort', wheelScale: wheelScaleOf(returnWheel), stepsPerRev: retStep });
    if (destroyed) return;
  }
  position = retTarget;
  roverPosEl.classList.remove('bridge-rover-flip');

  if (position === 0) {
    paintRover('happy', currentWheelDeg, wheelScaleOf(returnWheel));
    apiRef.sfx.success();
    const stars = fellAtLeastOnce ? 1 : (attempts === 1 ? 3 : attempts === 2 ? 2 : 1);
    apiRef.mascot.say('往返成功，安全到家！', 'cheer');
    statusEl.textContent = '往返成功！';
    await wait(650);
    if (!destroyed) apiRef.complete(stars);
    return;
  }

  apiRef.fail('undershoot-return');
  paintRover('oops', currentWheelDeg, wheelScaleOf(returnWheel));
  statusEl.textContent = `回程没到起点（差 ${position} 步），重新想两段圈数吧！`;
  apiRef.mascot.say('回程步数不够，再算一次！', 'think');
  await wait(700);
  if (destroyed) return;
  position = 0; placeRoverInstant(0); paintRover('happy', 0, wheelScaleOf(goWheel));
  resetAfterFailL3(container);
}

function resetAfterFailL3(container) {
  if (destroyed) return;
  busy = false;
  setControlsEnabledL3(container, true);
  updateFormulaL3(container);
}

function initL3(container, api) {
  N = pick([4, 6, 8, 10]); // 偶数步长，保证大轮那一段也能整除
  position = 0; attempts = 0; fellAtLeastOnce = false;
  const goIsBig = Math.random() < 0.5;
  goWheel = goIsBig ? 'big' : 'small';
  returnWheel = goIsBig ? 'small' : 'big';
  revGo = 0; revReturn = 0;

  buildDOM_L3(container, N);
  capSceneWidth(container, N);
  roverPosEl = container.querySelector('#bridge-rover-pos');
  splashEl = container.querySelector('#bridge-splash');
  paintRover('happy', 0, wheelScaleOf(goWheel));
  placeRoverInstant(0);
  updateFormulaL3(container);

  container.querySelectorAll('.bridge-seg-stepper button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (busy) return;
      const leg = btn.dataset.leg;
      const dir = Number(btn.dataset.dir);
      if (leg === 'go') revGo = Math.max(SEG_MIN, Math.min(SEG_MAX, revGo + dir));
      else revReturn = Math.max(SEG_MIN, Math.min(SEG_MAX, revReturn + dir));
      container.querySelector(`.bridge-seg-val[data-leg="${leg}"]`).textContent = String(leg === 'go' ? revGo : revReturn);
      api.sfx.click();
      updateFormulaL3(container);
    });
  });
  container.querySelector('#bridge-go3').addEventListener('click', () => handleGoL3(container));

  api.mascot.say(`桥长 ${N} 步，去程${wheelLabel(goWheel)}、回程${wheelLabel(returnWheel)}，想好两段圈数再出发！`, 'idle');
}

/* ============================================================================
 * 导出
 * ========================================================================== */
export default {
  id: 'bridge',
  title: '精准渡桥',
  icon: '🌉',

  init(container, api) {
    injectStylesOnce();
    destroyed = false;
    busy = false;
    pendingTimers = [];
    apiRef = api;
    level = api.level;

    if (level === 2) initL2(container, api);
    else if (level === 3) initL3(container, api);
    else initL1(container, api);
  },

  destroy() {
    destroyed = true;
    pendingTimers.forEach((t) => clearTimeout(t));
    pendingTimers = [];
    roverPosEl = null;
    splashEl = null;
  },
};
