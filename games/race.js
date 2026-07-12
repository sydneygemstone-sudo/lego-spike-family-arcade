/* games/race.js — 4. 避障接力 (teaching-redesign-v2 §「race 避障接力」)
 * 首屏即可见 trackScene（跑道 + 红/绿瓷砖）+ roverTop 停在起点。
 * 规则设置区改为两张 if-then 积木卡（橙色 IF 头 + 条件色块 + 动作槽，点开动作槽弹窗选择，
 * 含干扰项）。跑起来后 roverTop 沿格平移，到瓷砖处暂停弹规则问答，答对执行动作动画
 * （红：等 1 秒原地转圈；绿：加速冲 2 格），答错打滑（api.fail）。
 * 星级按答对率：100% =3 星，≥50% =2 星，其余完成 =1 星。
 */

import { trackScene, trackCellX, roverTop } from '../assets/art.js';

const TRACK_MIN = 7, TRACK_MAX = 9; // 7-9 格随机
const COLORED_MIN = 2, COLORED_MAX = 4; // 2-4 块红/绿瓷砖
const MOVE_MS = 480;
const ZOOM_MS = 260; // 双倍速冲刺，动画更快
// 与 assets/art.js#trackScene 内部常量保持一致，用于把 viewBox 坐标换算成 % 布局
const SEG = 84, TX = 90, TAIL = 130;

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
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trackWidth(len) { return TX + len * SEG + TAIL; }

function generateTrack() {
  const length = TRACK_MIN + randInt(TRACK_MAX - TRACK_MIN + 1);
  const tiles = new Array(length).fill(null);
  const coloredCount = Math.min(length, COLORED_MIN + randInt(COLORED_MAX - COLORED_MIN + 1));
  const indices = shuffle([...Array(length).keys()]);
  const chosen = indices.slice(0, coloredCount);
  chosen.forEach((idx) => { tiles[idx] = Math.random() < 0.5 ? 'red' : 'green'; });
  if (!tiles.includes('red')) tiles[chosen[0]] = 'red';
  if (!tiles.includes('green')) tiles[chosen[1] !== undefined ? chosen[1] : chosen[0]] = 'green';
  return tiles;
}

/* --------------------------------------------------------------------------
 * 一次性注入本关专属样式
 * -------------------------------------------------------------------------- */
let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .race-stage-card { display:flex; flex-direction:column; }
    .race-scene-outer {
      flex:1; max-height:53vh; position:relative; border-radius: var(--radius-md); overflow:hidden;
      display:flex; align-items:center; justify-content:center;
      background: linear-gradient(180deg, #FFF7E8 0%, #EAF3DE 48%, #CBE6C4 100%);
      padding: 4px 0;
    }
    .race-scene-inner { position:relative; width:100%; }
    .race-scene-inner svg { width:100%; height:auto; display:block; }
    .race-rover-pos {
      position:absolute; top:50%; width: 9%; aspect-ratio: 108/120;
      transform: translate(-50%,-50%);
      transition: left ${MOVE_MS}ms ease;
      pointer-events:none;
      filter: drop-shadow(0 4px 5px rgba(0,0,0,.3));
    }
    .race-rover-rot { width:100%; height:100%; transition: transform .45s ease-in-out; }
    .race-rover-rot svg { width:100%; height:100%; display:block; }

    .race-rule-card { position:relative; border-radius:14px; background:#fff; box-shadow: var(--shadow-card); overflow:hidden; }
    .race-rule-head { display:flex; align-items:center; gap:10px; padding:7px 14px; font-weight:800; color:#fff; }
    .race-rule-head--red { background: linear-gradient(160deg, var(--lego-orange), var(--lego-orange-dark)); }
    .race-rule-head--green { background: linear-gradient(160deg, var(--lego-orange), var(--lego-orange-dark)); }
    .race-if-badge { background:#fff; color: var(--lego-orange-dark); border-radius:8px; padding:2px 10px; font-weight:900; font-size:13px; letter-spacing:.5px; }
    .race-cond-chip { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.28); border-radius:999px; padding:3px 12px; font-weight:700; font-size:14px; }
    .race-cond-dot { width:13px; height:13px; border-radius:50%; border:2px solid rgba(255,255,255,.8); }
    .race-rule-body { padding:10px 14px 10px; display:flex; flex-direction:column; gap:6px; }
    .race-then-label { font-size: var(--font-small); font-weight:800; color: var(--ink-500); letter-spacing:.5px; }
    .race-action-slot {
      display:flex; align-items:center; justify-content:space-between; gap:8px;
      border:2.5px dashed var(--ink-300); border-radius:12px; padding:12px 14px;
      background: var(--paper-50); font-weight:700; text-align:left; width:100%;
      min-height: var(--tap-min);
    }
    .race-action-slot .slot-hint { color: var(--ink-500); }
    .race-action-slot.is-solved { border-style:solid; border-color: var(--lego-green); background:#EAF7EC; color: var(--lego-green-dark); }
    .race-rule-row { display:flex; flex-direction:column; gap:10px; }
    @media (min-width: 620px) { .race-rule-row { flex-direction:row; } .race-rule-row > * { flex:1; } }
  `;
  document.head.appendChild(style);
}

/* ---- 模块级状态 ---- */
let apiRef = null;
let containerRef = null;
let tiles = [];
let solvedRed = false, solvedGreen = false;
let pos = -1; // -1 = 起跑线之前
let correctCount = 0, totalPrompts = 0;
let destroyed = false;
let roverPosEl = null, roverRotEl = null;
let spinExtraDeg = 0;

function xPercent(p) {
  const w = trackWidth(tiles.length);
  const x = p < 0 ? TX * 0.4 : trackCellX(p);
  return (x / w) * 100;
}

function placeRoverInstant(p) {
  roverPosEl.style.transition = 'none';
  roverPosEl.style.left = `${xPercent(p)}%`;
  void roverPosEl.offsetWidth;
  roverPosEl.style.transition = '';
}

function moveRoverTo(p, ms) {
  return new Promise((resolve) => {
    roverPosEl.style.transitionDuration = `${ms}ms`;
    roverPosEl.style.left = `${xPercent(p)}%`;
    setTimeout(resolve, ms);
  });
}

function setRoverFace(face) {
  if (roverRotEl) roverRotEl.innerHTML = roverTop({ face });
  applyRoverRotation();
}

function applyRoverRotation() {
  if (roverRotEl) roverRotEl.style.transform = `rotate(${90 + spinExtraDeg}deg)`;
}

async function spinFlourish() {
  applyRoverRotation();
  await wait(20);
  spinExtraDeg = 360;
  applyRoverRotation();
  await wait(520);
  if (destroyed) return;
  roverRotEl.style.transition = 'none';
  spinExtraDeg = 0;
  applyRoverRotation();
  void roverRotEl.offsetWidth;
  roverRotEl.style.transition = '';
}

function showRuleQuiz(tileColor) {
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

async function runTrack(statusEl) {
  while (pos < tiles.length - 1 && !destroyed) {
    const next = pos + 1;
    await moveRoverTo(next, MOVE_MS);
    pos = next;
    if (destroyed) return;
    const color = tiles[pos];
    if (color) {
      totalPrompts++;
      statusEl.textContent = '想一想，该用哪条规则？';
      const picked = await showRuleQuiz(color);
      if (destroyed) return;
      if (picked === color) {
        correctCount++;
        apiRef.sfx.success();
        apiRef.mascot.say('答对了！', 'happy', 900);
      } else {
        apiRef.fail('wrong-rule-pick');
        setRoverFace('oops');
      }
      statusEl.textContent = '机器人出发咯，看它怎么应对彩色瓷砖！';
      if (color === 'red') {
        await wait(1000);
        if (destroyed) return;
        await spinFlourish();
      } else {
        const skipTarget = Math.min(tiles.length - 1, pos + 2);
        await moveRoverTo(skipTarget, ZOOM_MS);
        pos = skipTarget;
      }
      if (destroyed) return;
      setRoverFace('happy');
    }
  }
  if (destroyed) return;
  setRoverFace('happy');
  apiRef.sfx.success();
  const accuracy = totalPrompts > 0 ? correctCount / totalPrompts : 1;
  const stars = accuracy >= 1 ? 3 : accuracy >= 0.5 ? 2 : 1;
  apiRef.mascot.say(`到终点啦！答对 ${correctCount}/${totalPrompts}`, 'cheer');
  await wait(700);
  if (destroyed) return;
  apiRef.complete(stars);
}

function checkBothSolved(container) {
  const startBtn = container.querySelector('#race-start-btn');
  if (solvedRed && solvedGreen) {
    startBtn.disabled = false;
    apiRef.mascot.say('两条规则都配置好啦，出发！', 'cheer');
  }
}

function openActionPicker(container, ruleKey, slotBtn) {
  const rule = RULES[ruleKey];
  const root = container.querySelector('#race-modal-root');
  const options = shuffle([
    { text: rule.label, correct: true },
    ...rule.wrong.map((w) => ({ text: w, correct: false })),
  ]);
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-card">
        <h2 class="title-lg">${ruleKey === 'red' ? '🔴 如果踩到红色瓷砖' : '🟢 如果踩到绿色瓷砖'}</h2>
        <p class="text-muted">选一个该执行的动作：</p>
        <div class="flex-col gap-3" id="race-action-options" style="margin-top:12px;"></div>
      </div>
    </div>
  `;
  const wrap = root.querySelector('#race-action-options');
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'brick-btn brick-btn--blue';
    btn.style.cssText = 'width:100%; justify-content:flex-start; text-align:left;';
    btn.textContent = opt.text;
    btn.addEventListener('click', () => {
      if (opt.correct) {
        apiRef.sfx.success();
        root.innerHTML = '';
        slotBtn.classList.add('is-solved');
        slotBtn.innerHTML = `<span>✅ ${opt.text}</span>`;
        if (ruleKey === 'red') solvedRed = true; else solvedGreen = true;
        checkBothSolved(container);
      } else {
        apiRef.fail('wrong-rule-setup');
      }
    });
    wrap.appendChild(btn);
  });
}

function buildDOM(container, tilesData) {
  const sceneSvg = trackScene({ tiles: tilesData });
  container.innerHTML = `
    <div class="flex-col gap-3">
      <div class="brick-card brick-card--cat-race race-stage-card">
        <div class="flex-between flex-wrap gap-2" style="margin-bottom:2px;">
          <h2 class="title-md" style="margin:0;">🏁 避障接力</h2>
          <div class="text-muted title-sm" id="race-status">先配置两条规则，机器人才敢出发！</div>
        </div>
        <div class="race-scene-outer">
          <div class="race-scene-inner" id="race-scene-inner">
            ${sceneSvg}
            <div class="race-rover-pos" id="race-rover-pos">
              <div class="race-rover-rot" id="race-rover-rot">${roverTop({ face: 'happy' })}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="race-rule-row">
        <div class="race-rule-card" id="race-rule-red">
          <div class="race-rule-head race-rule-head--red">
            <span class="race-if-badge">IF</span>
            <span class="race-cond-chip"><span class="race-cond-dot" style="background:#D01012;"></span>红色瓷砖</span>
          </div>
          <div class="race-rule-body">
            <div class="race-then-label">THEN 该做什么？</div>
            <button class="race-action-slot" id="race-slot-red"><span class="slot-hint">点一下，选动作 →</span></button>
          </div>
        </div>
        <div class="race-rule-card" id="race-rule-green">
          <div class="race-rule-head race-rule-head--green">
            <span class="race-if-badge">IF</span>
            <span class="race-cond-chip"><span class="race-cond-dot" style="background:#57B84E;"></span>绿色瓷砖</span>
          </div>
          <div class="race-rule-body">
            <div class="race-then-label">THEN 该做什么？</div>
            <button class="race-action-slot" id="race-slot-green"><span class="slot-hint">点一下，选动作 →</span></button>
          </div>
        </div>
      </div>
      <div class="flex-center">
        <button id="race-start-btn" class="brick-btn brick-btn--green" disabled>🚦 开始比赛</button>
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
    injectStylesOnce();
    destroyed = false;
    apiRef = api;
    containerRef = container;
    tiles = generateTrack();
    solvedRed = false; solvedGreen = false;
    pos = -1; correctCount = 0; totalPrompts = 0;
    spinExtraDeg = 0;

    buildDOM(container, tiles);
    roverPosEl = container.querySelector('#race-rover-pos');
    roverRotEl = container.querySelector('#race-rover-rot');
    applyRoverRotation();
    placeRoverInstant(pos);

    container.querySelector('#race-slot-red').addEventListener('click', (e) => {
      if (solvedRed) return;
      apiRef.sfx.click();
      openActionPicker(container, 'red', e.currentTarget);
    });
    container.querySelector('#race-slot-green').addEventListener('click', (e) => {
      if (solvedGreen) return;
      apiRef.sfx.click();
      openActionPicker(container, 'green', e.currentTarget);
    });

    container.querySelector('#race-start-btn').addEventListener('click', () => {
      apiRef.sfx.click();
      container.querySelector('#race-start-btn').style.display = 'none';
      container.querySelectorAll('.race-rule-card').forEach((c) => { c.style.opacity = '.6'; c.style.pointerEvents = 'none'; });
      const statusEl = container.querySelector('#race-status');
      statusEl.textContent = '机器人出发咯，看它怎么应对彩色瓷砖！';
      runTrack(statusEl);
    });

    apiRef.mascot.say('先配置好两条规则，机器人才敢出发！', 'idle');
  },

  destroy() {
    destroyed = true;
    roverPosEl = null;
    roverRotEl = null;
  },
};
