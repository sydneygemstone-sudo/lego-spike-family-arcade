/* games/bridge.js — 6. 精准渡桥 (spec §3.6)
 * 窄桥俯视图。轮周长=1步，桥长=N步（随机 4-8）。孩子拨数字轮选"前进 X 圈"，
 * 多走掉下去（掉落动画+水花），少走停桥中间可补拨一次。
 * 星级：一次精准（第一次拨轮就正好走到对岸）=3 星；本回合（没掉过水）用了第二次
 * 补拨才精准到岸=2 星；掉过水后才最终到岸，或用了 3 次及以上才到岸=1 星。
 */

import { setupHiDPICanvas, drawRover, createTicker, animate, Easing } from './_rover-renderer.js';

const BASE_ANGLE = Math.PI / 2; // 机器人始终朝右过桥
const CANVAS_H = 130;
const LANE_Y = CANVAS_H / 2;
const BANK_W = 44;
const OVERSHOOT_ZONE = 56;
const DIAL_MIN = 1, DIAL_MAX = 10;

function randInt(n) { return Math.floor(Math.random() * n); }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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
let canvas = null, ctx = null;
let plankW = 30;
let ticker = null;
let currentAnimation = null;
let resizeHandler = null;
let robot = null;
let splashActive = false, splashStart = 0;
let fallX = 0;

function xFor(p) { return BANK_W + p * plankW; }

function sizeCanvas() {
  const wrap = containerRef.querySelector('#bridge-canvas-wrap');
  const availW = Math.min(Math.max(wrap.clientWidth || 360, 280), 560);
  const bridgeW = Math.max(80, availW - BANK_W * 2 - OVERSHOOT_ZONE);
  plankW = Math.max(24, bridgeW / N);
  fallX = BANK_W + N * plankW + BANK_W + OVERSHOOT_ZONE * 0.5;
  ctx = setupHiDPICanvas(canvas, availW, CANVAS_H);
  canvas._cssW = availW;
  canvas._cssH = CANVAS_H;
}

function animatePromise(opts) {
  return new Promise((resolve) => {
    currentAnimation = animate({ ...opts, onComplete: () => { currentAnimation = null; resolve(); } });
  });
}

function drawScene(bob, ts) {
  if (!ctx) return;
  const w = canvas._cssW, h = canvas._cssH;
  ctx.clearRect(0, 0, w, h);

  // 水
  ctx.fillStyle = '#BFE8EE';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const yy = 26 + i * 32 + Math.sin((x + ts / 200) / 16) * 2;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // 起点岸
  ctx.fillStyle = '#57B87C';
  ctx.fillRect(0, 8, BANK_W, h - 16);

  // 桥板
  for (let i = 0; i < N; i++) {
    const px = BANK_W + i * plankW;
    ctx.fillStyle = i % 2 === 0 ? '#D9A15C' : '#C68A44';
    ctx.fillRect(px + 1, 34, plankW - 2, h - 68);
  }
  // 桥板分隔线（方便数格子）
  ctx.strokeStyle = 'rgba(74,81,87,.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= N; i++) {
    const px = BANK_W + i * plankW;
    ctx.beginPath();
    ctx.moveTo(px, 34);
    ctx.lineTo(px, h - 34);
    ctx.stroke();
  }

  // 终点岸 + 旗子
  const bank2X = BANK_W + N * plankW;
  ctx.fillStyle = '#57B87C';
  ctx.fillRect(bank2X, 8, BANK_W, h - 16);
  ctx.font = `${Math.round(plankW * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚩', bank2X + BANK_W / 2, LANE_Y - 26);

  // 水花
  if (splashActive) {
    const t = Math.min(1, (ts - splashStart) / 550);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    [0, 1, 2].forEach((i) => {
      const rr = 6 + t * 22 + i * 7;
      ctx.beginPath();
      ctx.arc(fallX, LANE_Y + 16, rr, 0, Math.PI * 2);
      ctx.strokeStyle = '#0AA3B5';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.restore();
  }

  // 机器人
  ctx.save();
  ctx.globalAlpha = robot.opacity != null ? robot.opacity : 1;
  drawRover(ctx, {
    x: robot.x, y: robot.y + bob, angle: robot.angle,
    scale: Math.min(1.4, plankW / 30), squash: robot.squash,
    expression: robot.expression, wheelSpin: robot.wheelSpin || 0,
  });
  ctx.restore();
}

async function moveTo(targetPos) {
  const fromX = robot.x;
  const toX = xFor(targetPos);
  const dur = 340 + Math.min(600, Math.abs(targetPos - position) * 90);
  await animatePromise({
    duration: dur,
    onUpdate: (eased, raw) => {
      robot.x = fromX + (toX - fromX) * eased;
      robot.squash = 1 - Math.sin(raw * Math.PI) * 0.12;
      robot.wheelSpin = raw * Math.PI * 6;
    },
  });
  if (destroyed) return;
  robot.squash = 1;
}

async function fallOffBridge() {
  robot.expression = 'oops';
  apiRef.fail('overshoot-fell');
  const fromX = robot.x;
  await animatePromise({
    duration: 340,
    onUpdate: (eased) => { robot.x = fromX + (fallX - fromX) * eased; robot.wheelSpin += 0.4; },
  });
  if (destroyed) return;
  await animatePromise({
    duration: 480, easing: Easing.easeInOutQuad,
    onUpdate: (eased) => {
      robot.y = LANE_Y + eased * 34;
      robot.squash = 1 - eased * 0.5;
      robot.opacity = 1 - eased;
    },
  });
  if (destroyed) return;
  splashActive = true; splashStart = performance.now();
  await wait(550);
  if (destroyed) return;
  splashActive = false;
  position = 0; attempts = 0; fellAtLeastOnce = true;
  robot.x = xFor(0); robot.y = LANE_Y; robot.opacity = 1; robot.squash = 1;
  robot.angle = BASE_ANGLE; robot.expression = 'idle';
}

function setControlsEnabled(enabled) {
  ['#bridge-minus', '#bridge-plus', '#bridge-go'].forEach((sel) => {
    const el = containerRef.querySelector(sel);
    if (el) el.disabled = !enabled;
  });
}

async function handleGo() {
  if (busy) return;
  busy = true;
  setControlsEnabled(false);
  apiRef.sfx.click();
  const statusEl = containerRef.querySelector('#bridge-status');
  const X = dialValue;
  attempts += 1;
  const target = position + X;

  if (target > N) {
    statusEl.textContent = '拨太多了，冲过桥掉进水里啦！';
    await fallOffBridge();
    if (!destroyed) statusEl.textContent = `扑通！回到起点重新拨吧～（桥长 ${N} 步）`;
  } else if (target === N) {
    await moveTo(target);
    if (!destroyed) {
      position = target;
      robot.expression = 'cheer';
      apiRef.sfx.success();
      const stars = fellAtLeastOnce ? 1 : (attempts === 1 ? 3 : attempts === 2 ? 2 : 1);
      apiRef.mascot.say('稳稳落地，过桥成功！', 'cheer');
      statusEl.textContent = '过桥成功！';
      await wait(650);
      if (!destroyed) apiRef.complete(stars);
    }
  } else {
    await moveTo(target);
    if (!destroyed) {
      position = target;
      statusEl.textContent = `停在桥上啦，已经前进 ${position} 步（桥长 ${N} 步），再拨一次试试！`;
      apiRef.mascot.say('差一点点，再拨一次！', 'think');
    }
  }

  if (!destroyed) {
    dialValue = 1;
    const dv = containerRef.querySelector('#bridge-dial-value');
    if (dv) dv.textContent = '1';
    busy = false;
    setControlsEnabled(true);
  }
}

function buildDOM(container) {
  container.innerHTML = `
    <div class="flex-col gap-4">
      <div class="brick-card brick-card--cat-bridge">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:8px;">
          <h2 class="title-md" style="margin:0;">🌉 精准渡桥</h2>
          <div class="text-muted title-sm" id="bridge-info">桥长 · 步</div>
        </div>
        <div class="flex-center" id="bridge-canvas-wrap" style="width:100%;">
          <canvas id="bridge-canvas"></canvas>
        </div>
      </div>
      <div class="brick-card brick-card--yellow">
        <div class="text-center title-sm" id="bridge-status" style="margin-bottom:10px;">拨好圈数，按"前进"试试看！</div>
        <div class="flex-center gap-4" style="margin-bottom:14px;">
          <button id="bridge-minus" class="brick-btn brick-btn--gray brick-btn--icon brick-btn--lg" aria-label="减少一圈">−</button>
          <div class="title-hero" id="bridge-dial-value" style="min-width:80px; text-align:center;">1</div>
          <button id="bridge-plus" class="brick-btn brick-btn--gray brick-btn--icon brick-btn--lg" aria-label="增加一圈">+</button>
        </div>
        <div class="flex-center">
          <button id="bridge-go" class="brick-btn brick-btn--green brick-btn--lg">🚀 前进</button>
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
    destroyed = false;
    busy = false;
    apiRef = api;
    containerRef = container;
    N = 4 + randInt(5); // 4-8
    position = 0; attempts = 0; fellAtLeastOnce = false; dialValue = 1; splashActive = false;

    buildDOM(container);
    container.querySelector('#bridge-info').textContent = `桥长 ${N} 步 · 轮子转一圈 = 前进 1 步`;

    canvas = container.querySelector('#bridge-canvas');
    sizeCanvas();
    robot = { x: xFor(0), y: LANE_Y, angle: BASE_ANGLE, squash: 1, expression: 'idle', opacity: 1, wheelSpin: 0 };

    container.querySelector('#bridge-minus').addEventListener('click', () => {
      if (busy) return;
      dialValue = Math.max(DIAL_MIN, dialValue - 1);
      container.querySelector('#bridge-dial-value').textContent = String(dialValue);
      apiRef.sfx.click();
    });
    container.querySelector('#bridge-plus').addEventListener('click', () => {
      if (busy) return;
      dialValue = Math.min(DIAL_MAX, dialValue + 1);
      container.querySelector('#bridge-dial-value').textContent = String(dialValue);
      apiRef.sfx.click();
    });
    container.querySelector('#bridge-go').addEventListener('click', handleGo);

    resizeHandler = () => {
      sizeCanvas();
      if (!busy && robot) robot.x = xFor(position);
    };
    window.addEventListener('resize', resizeHandler);

    ticker = createTicker((ts) => {
      const bob = busy ? 0 : Math.sin(ts / 450) * 1.1;
      drawScene(bob, ts);
    });
    ticker.start();

    apiRef.mascot.say(`桥长 ${N} 步，拨好圈数别多也别少哦！`, 'idle');
  },

  destroy() {
    destroyed = true;
    if (currentAnimation) { currentAnimation.cancel(); currentAnimation = null; }
    if (ticker) { ticker.stop(); ticker = null; }
    if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
    ctx = null;
    canvas = null;
  },
};
