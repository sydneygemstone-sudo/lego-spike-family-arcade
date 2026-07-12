/* games/bridge.js — 6. 精准渡桥 (teaching-redesign-v2 §「bridge 精准渡桥」)
 * 完整教学环：
 *   ① 目标可视化：bridgeScene 自带对岸旗子（目标）
 *   ② 单位显性化：bridgeScene 每块桥板印着步数编号（格子可数）
 *   ③ 算式大字：桥长/剩余步数 × 1 圈/步 = 拨的圈数，实时大字显示
 *   ④ 演练不计分：「试转一圈」按钮可反复试，机器人原地演示"1 圈=1 步"再退回原位，
 *      不影响真实进度；正式前进才用 Go 按钮计入 attempts/星级。
 * 过头 = 掉水（roverSide face:oops + 水花圈，纯 CSS FX，非场景图形），
 * 不足停桥上可补拨一次。星级：一次精准 3★/补拨 2★/掉水后过 1★。
 */

import { bridgeScene, bridgeRoverX, roverSide, dialFrame } from '../assets/art.js';

const DIAL_MIN = 1, DIAL_MAX = 10;
const GO_MS_PER_STEP = 90, GO_MS_BASE = 340;
const TRIAL_MS = 420;
// 与 assets/art.js#bridgeScene 内部常量保持一致，用于把 viewBox 坐标换算成 % 布局
const BX = 120, BW = 64, BY = 150;
const DECK_TOP_PCT = ((BY + 13) / 260) * 100; // 桥板纵向中心
const WATER_TOP_PCT = 92; // 掉水后下沉到的位置（水面可视区域内）

function randInt(n) { return Math.floor(Math.random() * n); }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function sceneWidth(steps) { return BX + steps * BW + 130; }

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
      flex:1; max-height:54vh; position:relative; border-radius: var(--radius-md); overflow:hidden;
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
    .bridge-rover-pos svg { width:100%; height:100%; display:block; }
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

    .bridge-lower-row { display:flex; flex-direction:column; gap:16px; }
    .bridge-trial-card { display:flex; align-items:center; }
    .bridge-trial-row { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .bridge-trial-hint { color: var(--ink-500); font-size: var(--font-small); font-weight:700; }
    @media (min-width: 700px) and (max-height: 840px) {
      .bridge-lower-row { flex-direction:row; align-items:stretch; }
      .bridge-trial-card { flex:0 0 34%; }
      .bridge-formula-card { flex:1; }
      .bridge-trial-row { flex-direction:column; align-items:flex-start; gap:8px; }
    }

    .bridge-formula-big {
      text-align:center; font-weight:800;
      font-size: clamp(18px, 3.6vw, 26px);
      color: var(--ink-900);
      margin-bottom: 4px;
    }
    .bridge-formula-answer {
      font-size: clamp(26px, 6vw, 42px);
      font-weight:900;
      color: var(--cat-bridge-dark, #036B77);
      display:inline-block;
      transition: transform .18s cubic-bezier(.34,1.56,.64,1);
    }
    .bridge-formula-answer.pop { transform: scale(1.28); }

    .bridge-dial-outer {
      position:relative; width:clamp(108px,30vw,168px); aspect-ratio:150/190; margin:6px auto 2px;
    }
    .bridge-dial-outer svg { width:100%; height:100%; display:block; }
    .bridge-dial-hit { position:absolute; left:0; right:0; background:transparent; border:none; }
    .bridge-dial-hit--up { top:0; height:40%; }
    .bridge-dial-hit--down { bottom:0; height:40%; }
    .bridge-dial-readout {
      position:absolute; left:50%; top:51%; transform:translate(-50%,-50%);
      font-size: clamp(22px,5vw,32px); font-weight:900; color:var(--ink-900); pointer-events:none;
    }
  `;
  document.head.appendChild(style);
}

/* ---- 模块级状态 ---- */
let apiRef = null;
let containerRef = null;
let N = 6;
let position = 0;
let attempts = 0;
let fellAtLeastOnce = false;
let dialValue = 1;
let busy = false;
let destroyed = false;
let roverPosEl = null, splashEl = null;
let currentWheelDeg = 0;

function xPercent(step) { return (bridgeRoverX(step, N) / sceneWidth(N)) * 100; }

/** roverSide 的 wheelAngle 是烘焙进 SVG 字符串的静态参数（不是可 CSS 过渡的属性），
 * 按铁律①"用 JS 更新参数重渲染"逐帧调用，才能看到轮子真的转动，而不是从 0°瞬跳到 360°。 */
function paintRover(face, wheelDeg) {
  currentWheelDeg = wheelDeg;
  if (roverPosEl) roverPosEl.innerHTML = roverSide({ face, wheelAngle: wheelDeg });
}

function placeRoverInstant(step) {
  roverPosEl.style.transition = 'none';
  roverPosEl.style.left = `${xPercent(step)}%`;
  roverPosEl.style.top = `${DECK_TOP_PCT}%`;
  roverPosEl.style.opacity = '1';
  void roverPosEl.offsetWidth;
  roverPosEl.style.transition = '';
}

/** 逐帧补间：位置（left%）+ 轮子转动角度同时随 rAF 更新，spin=true 时每走 1 步轮子转 360°。 */
function animateMove(fromStep, toStep, ms, { spin = false, face = 'effort' } = {}) {
  return new Promise((resolve) => {
    if (destroyed || !roverPosEl) { resolve(); return; }
    const t0 = performance.now();
    const dist = Math.abs(toStep - fromStep) || 1;
    const totalWheelDeg = spin ? 360 * dist : 0;
    function tick(now) {
      if (destroyed) { resolve(); return; }
      const raw = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms);
      const step = fromStep + (toStep - fromStep) * raw;
      roverPosEl.style.left = `${xPercent(step)}%`;
      paintRover(face, spin ? (raw * totalWheelDeg) % 360 : currentWheelDeg);
      if (raw < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

function updateFormula(container) {
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

function setControlsEnabled(container, enabled) {
  ['#bridge-trial-btn', '#bridge-dial-up', '#bridge-dial-down', '#bridge-go'].forEach((sel) => {
    const el = container.querySelector(sel);
    if (el) el.disabled = !enabled;
  });
}

/** 教学环④：演练一次不计分——原地演示"转一圈=走一步"，动画结束后退回当前真实进度，
 * 不修改 position/attempts，可无限次重复。 */
async function handleTrial(container) {
  if (busy) return;
  busy = true;
  setControlsEnabled(container, false);
  apiRef.sfx.click();
  const statusEl = container.querySelector('#bridge-status');
  statusEl.textContent = '看仔细：轮子转一圈，机器人正好走 1 步！';

  const demoTarget = Math.min(N, position + 1);
  await animateMove(position, demoTarget, TRIAL_MS, { spin: true, face: 'effort' });
  if (destroyed) return;
  paintRover('happy', 0);
  await wait(550);
  if (destroyed) return;
  apiRef.mascot.say('1 圈 = 1 步，数好几圈就能到！', 'think', 1800);

  // 退回真实进度（演练不算数，不重复转轮，直接滑回）
  await animateMove(demoTarget, position, TRIAL_MS, { spin: false, face: 'happy' });
  if (destroyed) return;
  paintRover('happy', 0);
  statusEl.textContent = position === 0
    ? '试转随便玩，正式前进按下面的"前进"按钮！'
    : `刚才只是演练，你还停在第 ${position} 步～`;

  if (!destroyed) { setControlsEnabled(container, true); busy = false; }
}

async function fallOffBridge(container) {
  apiRef.fail('overshoot-fell');
  const overStep = N + 1; // bridgeRoverX 对 step>steps 会给出"越过对岸"的坐标
  await animateMove(position, overStep, 420, { spin: true, face: 'oops' });
  if (destroyed) return;
  paintRover('oops', currentWheelDeg);
  roverPosEl.style.top = `${WATER_TOP_PCT}%`;
  roverPosEl.style.opacity = '0.15';
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

async function handleGo(container) {
  if (busy) return;
  busy = true;
  setControlsEnabled(container, false);
  apiRef.sfx.click();
  const statusEl = container.querySelector('#bridge-status');
  const X = dialValue;
  attempts += 1;
  const target = position + X;

  if (target > N) {
    statusEl.textContent = '拨太多了，冲过桥掉进水里啦！';
    await fallOffBridge(container);
    if (!destroyed) statusEl.textContent = `扑通！回到起点重新拨吧～（桥长 ${N} 步）`;
  } else if (target === N) {
    const ms = GO_MS_BASE + X * GO_MS_PER_STEP;
    await animateMove(position, target, ms, { spin: true, face: 'effort' });
    if (!destroyed) {
      position = target;
      paintRover('happy', currentWheelDeg);
      apiRef.sfx.success();
      const stars = fellAtLeastOnce ? 1 : (attempts === 1 ? 3 : attempts === 2 ? 2 : 1);
      apiRef.mascot.say('稳稳落地，过桥成功！', 'cheer');
      statusEl.textContent = '过桥成功！';
      await wait(650);
      if (!destroyed) apiRef.complete(stars);
    }
  } else {
    const ms = GO_MS_BASE + X * GO_MS_PER_STEP;
    await animateMove(position, target, ms, { spin: true, face: 'effort' });
    if (!destroyed) {
      position = target;
      paintRover('happy', currentWheelDeg);
      statusEl.textContent = `停在桥上啦，已经前进 ${position} 步（还剩 ${N - position} 步），再拨一次试试！`;
      apiRef.mascot.say('差一点点，再拨一次！', 'think');
    }
  }

  if (!destroyed) {
    dialValue = 1;
    container.querySelector('#bridge-dial-value').textContent = '1';
    updateFormula(container);
    busy = false;
    setControlsEnabled(container, true);
  }
}

function buildDOM(container, steps) {
  container.innerHTML = `
    <div class="flex-col gap-4">
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

export default {
  id: 'bridge',
  title: '精准渡桥',
  icon: '🌉',

  init(container, api) {
    injectStylesOnce();
    destroyed = false;
    busy = false;
    apiRef = api;
    containerRef = container;
    N = 4 + randInt(5); // 4-8
    position = 0; attempts = 0; fellAtLeastOnce = false; dialValue = 1;

    buildDOM(container, N);
    roverPosEl = container.querySelector('#bridge-rover-pos');
    splashEl = container.querySelector('#bridge-splash');
    paintRover('happy', 0);
    placeRoverInstant(0);
    updateFormula(container);

    container.querySelector('#bridge-trial-btn').addEventListener('click', () => handleTrial(container));

    container.querySelector('#bridge-dial-up').addEventListener('click', () => {
      if (busy) return;
      dialValue = Math.min(DIAL_MAX, dialValue + 1);
      container.querySelector('#bridge-dial-value').textContent = String(dialValue);
      updateFormula(container);
      bumpFormula(container);
      apiRef.sfx.click();
    });
    container.querySelector('#bridge-dial-down').addEventListener('click', () => {
      if (busy) return;
      dialValue = Math.max(DIAL_MIN, dialValue - 1);
      container.querySelector('#bridge-dial-value').textContent = String(dialValue);
      updateFormula(container);
      bumpFormula(container);
      apiRef.sfx.click();
    });
    container.querySelector('#bridge-go').addEventListener('click', () => handleGo(container));

    apiRef.mascot.say(`桥长 ${N} 步，数好格子拨对圈数！`, 'idle');
  },

  destroy() {
    destroyed = true;
    roverPosEl = null;
    splashEl = null;
  },
};
