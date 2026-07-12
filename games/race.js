/* games/race.js — 4. 避障接力 (spec §3.4)
 * 横向跑道随机铺红/绿色块。先让孩子配置两条 if 规则
 * （If Red→Wait 1s+Turn；If Green→Double Speed 2 steps），
 * 机器人自动跑，到色块处暂停问"该执行哪条规则？"，点选正确继续，错则打滑（api.fail）。
 * 星级按答对率：100% =3 星，≥50% =2 星，其余完成 =1 星。
 */

import { setupHiDPICanvas, drawRover, createTicker, animate, Easing } from './_rover-renderer.js';

const TRACK_LENGTH = 8;
const BASE_ANGLE = Math.PI / 2; // 机器人在跑道上始终朝右
const MOVE_DURATION = 480;
const ZOOM_DURATION = 260; // 双倍速冲刺，动画更快

const RULES = {
  red: {
    key: 'red',
    label: '⏸️ 等待 1 秒，然后原地转个圈',
    wrong: ['↩️ 立刻掉头往回走', '🎤 停下来唱首歌庆祝'],
  },
  green: {
    key: 'green',
    label: '⚡ 两倍速冲刺 2 步',
    wrong: ['🛑 停下来等一等', '⬅️ 后退 1 步'],
  },
};

function randInt(n) { return Math.floor(Math.random() * n); }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateTrack() {
  const tiles = new Array(TRACK_LENGTH).fill(null);
  const coloredCount = 4 + randInt(2); // 4-5 个彩色格
  const indices = shuffle([...Array(TRACK_LENGTH).keys()]);
  const chosen = indices.slice(0, coloredCount);
  chosen.forEach((idx) => { tiles[idx] = Math.random() < 0.5 ? 'red' : 'green'; });
  if (!tiles.includes('red')) tiles[chosen[0]] = 'red';
  if (!tiles.includes('green')) tiles[chosen[1] !== undefined ? chosen[1] : chosen[0]] = 'green';
  return tiles;
}

/* ---- 模块级状态 ---- */
let apiRef = null;
let containerRef = null;
let tiles = [];
let solvedRed = false, solvedGreen = false;
let canvas = null, ctx = null, tileWidth = 60;
let ticker = null;
let currentAnimation = null;
let resizeHandler = null;
let destroyed = false;
let robot = null;
let pos = -1; // -1 = 起跑线之前
let correctCount = 0, totalPrompts = 0;

function tileCenterX(p) {
  return (p + 0.5) * tileWidth + tileWidth * 0.6; // 留出起跑线空间
}
const LANE_Y = 60;

function sizeCanvas() {
  const wrap = containerRef.querySelector('#race-canvas-wrap');
  const availW = Math.min(Math.max(wrap.clientWidth || 360, 260), 640);
  tileWidth = Math.max(36, availW / (TRACK_LENGTH + 0.8));
  const h = 130;
  ctx = setupHiDPICanvas(canvas, availW, h);
  canvas._cssW = availW;
  canvas._cssH = h;
}

function drawScene(bob) {
  if (!ctx) return;
  const w = canvas._cssW, h = canvas._cssH;
  ctx.clearRect(0, 0, w, h);
  // 跑道底色
  ctx.fillStyle = '#FFF3DA';
  ctx.fillRect(0, 0, w, h);
  // 起跑线
  ctx.fillStyle = '#4A5157';
  ctx.fillRect(tileWidth * 0.5, 20, 4, 80);
  // 瓷砖
  for (let i = 0; i < TRACK_LENGTH; i++) {
    const cx = tileCenterX(i);
    const color = tiles[i];
    ctx.fillStyle = color === 'red' ? 'rgba(208,16,18,.28)' : color === 'green' ? 'rgba(35,120,65,.28)' : 'rgba(122,130,138,.14)';
    const tw = tileWidth * 0.86;
    roundRect(ctx, cx - tw / 2, 20, tw, 80, 10);
    ctx.fill();
    if (color) {
      ctx.strokeStyle = color === 'red' ? '#8E0B0D' : '#14502A';
      ctx.lineWidth = 2;
      roundRect(ctx, cx - tw / 2, 20, tw, 80, 10);
      ctx.stroke();
    }
  }
  // 终点旗
  ctx.font = `${Math.round(tileWidth * 0.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏁', tileCenterX(TRACK_LENGTH - 1) + tileWidth * 0.65, LANE_Y);

  drawRover(ctx, {
    x: robot.x, y: LANE_Y + bob, angle: robot.angle,
    scale: Math.min(1.5, tileWidth / 26), squash: robot.squash,
    expression: robot.expression, wheelSpin: robot.wheelSpin || 0,
  });
}

function roundRect(ctx2, x, y, w, h, r) {
  ctx2.beginPath();
  ctx2.moveTo(x + r, y);
  ctx2.arcTo(x + w, y, x + w, y + h, r);
  ctx2.arcTo(x + w, y + h, x, y + h, r);
  ctx2.arcTo(x, y + h, x, y, r);
  ctx2.arcTo(x, y, x + w, y, r);
  ctx2.closePath();
}

function animatePromise(opts) {
  return new Promise((resolve) => {
    currentAnimation = animate({ ...opts, onComplete: () => { currentAnimation = null; resolve(); } });
  });
}

async function moveTo(targetPos, duration) {
  const fromX = robot.x;
  const toX = tileCenterX(targetPos);
  await animatePromise({
    duration,
    onUpdate: (eased, raw) => {
      robot.x = fromX + (toX - fromX) * eased;
      robot.squash = 1 - Math.sin(raw * Math.PI) * 0.1;
      robot.wheelSpin = raw * Math.PI * 8;
    },
  });
  if (destroyed) return;
  robot.squash = 1;
  pos = targetPos;
}

async function spinFlourish() {
  const from = BASE_ANGLE;
  await animatePromise({
    duration: 520, easing: Easing.easeInOutQuad,
    onUpdate: (eased) => { robot.angle = from + eased * Math.PI * 2; },
  });
  if (destroyed) return;
  robot.angle = BASE_ANGLE;
}

function showPrompt(tileColor) {
  return new Promise((resolve) => {
    const root = containerRef.querySelector('#race-modal-root');
    const options = shuffle([
      { key: 'red', label: RULES.red.label },
      { key: 'green', label: RULES.green.label },
    ]);
    root.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card">
          <h2 class="title-lg">${tileColor === 'red' ? '🔴' : '🟢'} 踩到${tileColor === 'red' ? '红色' : '绿色'}瓷砖啦！</h2>
          <p class="text-muted">该执行哪条规则？</p>
          <div class="flex-col gap-3" id="race-prompt-options" style="margin-top:12px;"></div>
        </div>
      </div>
    `;
    const optWrap = root.querySelector('#race-prompt-options');
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'brick-btn brick-btn--blue';
      btn.style.width = '100%';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        root.innerHTML = '';
        resolve(opt.key);
      });
      optWrap.appendChild(btn);
    });
  });
}

async function runTrack() {
  const statusEl = containerRef.querySelector('#race-status');
  while (pos < TRACK_LENGTH - 1 && !destroyed) {
    const next = pos + 1;
    await moveTo(next, MOVE_DURATION);
    if (destroyed) return;
    const color = tiles[pos];
    if (color) {
      totalPrompts++;
      statusEl.textContent = '想一想，该用哪条规则？';
      const picked = await showPrompt(color);
      if (destroyed) return;
      if (picked === color) {
        correctCount++;
        apiRef.sfx.success();
        apiRef.mascot.say('答对了！', 'happy', 900);
      } else {
        apiRef.fail('wrong-rule-pick');
        robot.expression = 'oops';
      }
      statusEl.textContent = '机器人出发咯，看它怎么应对彩色瓷砖！';
      if (color === 'red') {
        await wait(1000);
        if (destroyed) return;
        await spinFlourish();
      } else {
        const skipTarget = Math.min(TRACK_LENGTH - 1, pos + 2);
        await moveTo(skipTarget, ZOOM_DURATION);
      }
      if (destroyed) return;
      robot.expression = 'idle';
    }
  }
  if (destroyed) return;
  robot.expression = 'cheer';
  apiRef.sfx.success();
  const accuracy = totalPrompts > 0 ? correctCount / totalPrompts : 1;
  const stars = accuracy >= 1 ? 3 : accuracy >= 0.5 ? 2 : 1;
  apiRef.mascot.say(`到终点啦！答对 ${correctCount}/${totalPrompts}`, 'cheer');
  await wait(700);
  if (destroyed) return;
  apiRef.complete(stars);
}

function renderRuleOptions(container, ruleKey) {
  const rule = RULES[ruleKey];
  const options = shuffle([
    { text: rule.label, correct: true },
    ...rule.wrong.map((w) => ({ text: w, correct: false })),
  ]);
  const wrap = container.querySelector(`#race-${ruleKey}-options`);
  wrap.innerHTML = '';
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'brick-btn brick-btn--blue';
    btn.style.cssText = 'width:100%; justify-content:flex-start; text-align:left;';
    btn.textContent = opt.text;
    btn.addEventListener('click', () => {
      if (opt.correct) {
        apiRef.sfx.success();
        Array.from(wrap.children).forEach((c) => { c.disabled = true; });
        btn.classList.remove('brick-btn--blue');
        btn.classList.add('brick-btn--green');
        btn.textContent = '✅ ' + opt.text;
        if (ruleKey === 'red') solvedRed = true; else solvedGreen = true;
        checkBothSolved(container);
      } else {
        apiRef.fail('wrong-rule-setup');
      }
    });
    wrap.appendChild(btn);
  });
}

function checkBothSolved(container) {
  const startBtn = container.querySelector('#race-start-btn');
  if (solvedRed && solvedGreen) {
    startBtn.disabled = false;
    apiRef.mascot.say('两条规则都配置好啦，出发！', 'cheer');
  }
}

function buildDOM(container) {
  container.innerHTML = `
    <div class="flex-col gap-4" id="race-setup">
      <div class="brick-card brick-card--cat-race">
        <h2 class="title-md" style="margin:0 0 6px;">🏁 避障接力</h2>
        <p class="text-muted" style="margin:0;">先帮机器人定好两条规则，等会儿踩到彩色瓷砖就靠它们判断！</p>
      </div>
      <div class="brick-card brick-card--red" id="race-rule-red">
        <div class="title-sm" style="margin-bottom:8px;">🔴 如果踩到红色瓷砖，该怎么办？</div>
        <div class="flex-col gap-2" id="race-red-options"></div>
      </div>
      <div class="brick-card brick-card--green" id="race-rule-green">
        <div class="title-sm" style="margin-bottom:8px;">🟢 如果踩到绿色瓷砖，该怎么办？</div>
        <div class="flex-col gap-2" id="race-green-options"></div>
      </div>
      <div class="flex-center">
        <button id="race-start-btn" class="brick-btn brick-btn--green brick-btn--lg" disabled>🚦 开始比赛</button>
      </div>
    </div>
    <div class="flex-col gap-4" id="race-run" style="display:none;">
      <div class="brick-card brick-card--cat-race">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:8px;">
          <h2 class="title-md" style="margin:0;">🏁 避障接力</h2>
          <div class="text-muted title-sm" id="race-status">机器人出发咯，看它怎么应对彩色瓷砖！</div>
        </div>
        <div class="flex-center" id="race-canvas-wrap" style="width:100%;">
          <canvas id="race-canvas"></canvas>
        </div>
      </div>
    </div>
    <div id="race-modal-root"></div>
  `;
}

export default {
  id: 'race',
  title: '避障接力',
  icon: '🏁',

  init(container, api) {
    destroyed = false;
    apiRef = api;
    containerRef = container;
    tiles = generateTrack();
    solvedRed = false; solvedGreen = false;
    pos = -1; correctCount = 0; totalPrompts = 0;

    buildDOM(container);
    renderRuleOptions(container, 'red');
    renderRuleOptions(container, 'green');

    container.querySelector('#race-start-btn').addEventListener('click', () => {
      apiRef.sfx.click();
      container.querySelector('#race-setup').style.display = 'none';
      container.querySelector('#race-run').style.display = '';
      canvas = container.querySelector('#race-canvas');
      sizeCanvas();
      robot = { x: tileCenterX(-1) - tileWidth * 0.5, y: LANE_Y, angle: BASE_ANGLE, squash: 1, expression: 'idle', wheelSpin: 0 };

      resizeHandler = () => { sizeCanvas(); };
      window.addEventListener('resize', resizeHandler);

      ticker = createTicker(() => {
        const bob = Math.sin(performance.now() / 450) * 1.1;
        drawScene(bob);
      });
      ticker.start();

      runTrack();
    });

    apiRef.mascot.say('先答对两道规则题，机器人才敢出发！', 'idle');
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
