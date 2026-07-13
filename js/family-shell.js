/* js/family-shell.js
 * 「一起玩」真人互动游戏的通用主持人容器——family.html 唯一入口脚本。
 * 读取 ?f=<id>，动态 import('../family-games/<id>.js')，注入 api，统一负责：
 * 顶部栏（返回/吉祥物/标题）、一句话玩法说明横幅（家长 10 秒看懂怎么主持）、
 * 完成打卡（localStorage 独立 key，不碰 js/store.js）。
 *
 * 真人游戏模块协议（family-games/<id>.js）——与 js/shell.js 的六关协议类似但更简单：
 *   export default { id, title, icon, howto, init(container, api), destroy() }
 * 或具名导出同名字段。没有星级/level 概念（真人游戏不计星，只打卡计次）。
 *
 * api 提供「主持人框架」的四个共享组件（大字卡展示区是纯 CSS 类名，见 css/family.css
 * 的 .family-stage/.family-card-icon/.family-card-text，不需要 JS 封装）：
 *   flipCard(container, opts)      —— 翻面对答案
 *   countdownRing(container, s, opts) —— 圆形倒计时
 *   beat(opts)                     —— 节拍器（复用 sfx.click/snap 当 tick，不改 sfx.js）
 *   roleSwap(container, opts)      —— 角色互换
 * 以及 sfx / mascot / Art（assets/art.js，含 actionIcons）/ rand 工具。
 */

import { sfx } from './sfx.js';
import { createMascot } from './mascot.js';
import * as Art from '../assets/art.js';

const STORAGE_KEY = 'lsfa_family_v1';
const FAMILY_IDS = ['humanrobot', 'livinghunt', 'rhythm', 'macrospell', 'ifthen', 'humanbelt'];

const CHECKIN_LINES = [
  '太棒了，又一起玩了一轮！',
  '打卡成功！全家配合得真默契！',
  '记下啦！下次还要一起玩哦！',
];

/* -------------------------------------------------------------------------- 独立存档（不碰 js/store.js） -------------------------------------------------------------------------- */
function loadFamilyData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, plays: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.plays !== 'object' || !parsed.plays) {
      return { version: 1, plays: {} };
    }
    return parsed;
  } catch (e) {
    return { version: 1, plays: {} };
  }
}
function persistFamilyData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* 隐私模式等，静默忽略 */ }
}
function getPlays(id) {
  const data = loadFamilyData();
  const n = data.plays[id];
  return typeof n === 'number' && n > 0 ? Math.floor(n) : 0;
}
function bumpPlays(id) {
  const data = loadFamilyData();
  data.plays[id] = getPlays(id) + 1;
  persistFamilyData(data);
  return data.plays[id];
}

/* -------------------------------------------------------------------------- 随机工具 -------------------------------------------------------------------------- */
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* -------------------------------------------------------------------------- 共享组件：翻面对答案 -------------------------------------------------------------------------- */
function flipCard(container, { front = '', back = '', flipped = false } = {}) {
  container.innerHTML = `
    <div class="family-flipcard${flipped ? ' is-flipped' : ''}">
      <div class="family-flipcard-inner">
        <div class="family-flip-face family-flip-face--front">${front}</div>
        <div class="family-flip-face family-flip-face--back">${back}</div>
      </div>
    </div>
  `;
  const el = container.querySelector('.family-flipcard');
  const frontEl = el.querySelector('.family-flip-face--front');
  const backEl = el.querySelector('.family-flip-face--back');
  return {
    el,
    toFront() { el.classList.remove('is-flipped'); },
    toBack() { el.classList.add('is-flipped'); },
    toggle() { el.classList.toggle('is-flipped'); },
    isBack() { return el.classList.contains('is-flipped'); },
    setFront(html) { frontEl.innerHTML = html; },
    setBack(html) { backEl.innerHTML = html; },
  };
}

/* -------------------------------------------------------------------------- 共享组件：圆形倒计时 -------------------------------------------------------------------------- */
function countdownRing(container, seconds, opts = {}) {
  const { onTick, onDone, size = 128 } = opts;
  const r = size / 2 - 10;
  const C = 2 * Math.PI * r;
  container.innerHTML = `
    <div class="family-countdown" style="width:${size}px;height:${size}px;">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle class="fcd-bg" cx="${size / 2}" cy="${size / 2}" r="${r}"></circle>
        <circle class="fcd-fg" cx="${size / 2}" cy="${size / 2}" r="${r}"
          stroke-dasharray="${C}" stroke-dashoffset="0"></circle>
      </svg>
      <div class="family-countdown-num">${Math.ceil(seconds)}</div>
    </div>
  `;
  const fg = container.querySelector('.fcd-fg');
  const numEl = container.querySelector('.family-countdown-num');
  let timer = null;
  let startTime = null;
  let doneFired = false;

  function start() {
    doneFired = false;
    numEl.textContent = String(Math.ceil(seconds));
    fg.style.transition = 'none';
    fg.style.strokeDashoffset = '0';
    void fg.getBoundingClientRect(); // 强制回流
    fg.style.transition = `stroke-dashoffset ${seconds}s linear`;
    fg.style.strokeDashoffset = String(C);
    startTime = Date.now();
    timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, seconds - elapsed);
      numEl.textContent = String(Math.ceil(remaining));
      if (onTick) onTick(remaining);
      if (remaining <= 0.05 && !doneFired) {
        doneFired = true;
        clearInterval(timer);
        if (onDone) onDone();
      }
    }, 100);
  }
  function stop() { if (timer) clearInterval(timer); }
  return { el: container.querySelector('.family-countdown'), start, stop };
}

/* -------------------------------------------------------------------------- 共享组件：节拍器 -------------------------------------------------------------------------- */
function beat(opts = {}) {
  const { bpm = 100, onBeat, accentEvery = 0, dotEl = null } = opts;
  let currentBpm = bpm;
  let running = false;
  let timer = null;
  let count = 0;

  function tick() {
    count += 1;
    const isAccent = accentEvery > 0 && count % accentEvery === 0;
    if (isAccent) sfx.snap(); else sfx.click();
    if (dotEl) {
      dotEl.classList.remove('family-beat-dot--pulse');
      void dotEl.offsetWidth;
      dotEl.classList.add('family-beat-dot--pulse');
    }
    if (onBeat) onBeat(count, isAccent);
  }
  function scheduleNext() {
    const intervalMs = 60000 / currentBpm;
    timer = setTimeout(() => {
      if (!running) return;
      tick();
      if (running) scheduleNext();
    }, intervalMs);
  }
  function start() {
    if (running) return;
    running = true;
    count = 0;
    scheduleNext();
  }
  function stop() {
    running = false;
    if (timer) clearTimeout(timer);
    timer = null;
  }
  function setBpm(v) { currentBpm = Math.max(20, v); }
  return { start, stop, setBpm, isRunning: () => running, getCount: () => count };
}

/* -------------------------------------------------------------------------- 共享组件：角色互换 -------------------------------------------------------------------------- */
function roleSwap(container, { roles, initial = 0, onSwap } = {}) {
  let idx = initial;
  container.innerHTML = `
    <div class="family-roleswap">
      <div class="family-role-current" id="role-current">${roles[idx]}</div>
      <button class="brick-btn brick-btn--purple" id="role-swap-btn">🔄 角色互换</button>
    </div>
  `;
  const label = container.querySelector('#role-current');
  const btn = container.querySelector('#role-swap-btn');
  btn.addEventListener('click', () => {
    sfx.click();
    idx = (idx + 1) % roles.length;
    label.textContent = roles[idx];
    if (onSwap) onSwap(idx, roles[idx]);
  });
  return {
    el: container.querySelector('.family-roleswap'),
    current: () => roles[idx],
    currentIndex: () => idx,
    swap() { btn.click(); },
  };
}

/* -------------------------------------------------------------------------- 骨架 / 加载 -------------------------------------------------------------------------- */
function qs(sel, root = document) { return root.querySelector(sel); }

function buildSkeleton(root) {
  root.innerHTML = `
    <div class="family-page">
      <header class="family-topbar">
        <button id="btn-home" class="brick-btn brick-btn--gray brick-btn--sm" aria-label="返回首页">← 首页</button>
        <div class="family-topbar-mascot" id="mascot-slot"></div>
        <div class="family-topbar-title">
          <h1 id="family-title" class="title-md">加载中…</h1>
        </div>
        <div class="family-checkin">
          <span id="family-playcount" class="family-playcount"></span>
          <button id="family-checkin-btn" class="brick-btn brick-btn--green brick-btn--sm">✅ 打卡</button>
        </div>
      </header>
      <div class="family-howto" id="family-howto">加载中…</div>
      <main id="family-root" class="family-root"></main>
    </div>
  `;
}

async function loadFamilyModule(gameId) {
  // 带时间戳查询串强制绕过浏览器/中间层缓存——多个 session 并行改 family-games/*.js
  // 时，缓存住的旧模块会让人怎么改都"看不出效果"，边追查边怀疑自己。
  const mod = await import(`../family-games/${gameId}.js?v=${Date.now()}`);
  const candidate = mod.default && typeof mod.default.init === 'function' ? mod.default : mod;
  if (typeof candidate.init !== 'function') {
    throw new Error('真人游戏模块未导出 init(container, api)');
  }
  return candidate;
}

function showErrorState(root, mascot, message) {
  mascot.say(message, 'oops', 0);
  qs('#family-title', root).textContent = '出错了';
  qs('#family-howto', root).textContent = '💡 回首页选一个真人游戏吧！';
  qs('#family-root', root).innerHTML = `
    <div class="flex-center" style="min-height:40vh;">
      <button class="brick-btn brick-btn--yellow" id="btn-home-err">返回首页</button>
    </div>
  `;
  const errBtn = qs('#btn-home-err', root);
  if (errBtn) errBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
}

export async function startFamilyShell(root = document.getElementById('app')) {
  buildSkeleton(root);

  const params = new URLSearchParams(window.location.search);
  const raw = params.get('f') || '';
  const gameId = /^[a-zA-Z0-9_]+$/.test(raw) && FAMILY_IDS.includes(raw) ? raw : null;

  const mascotSlot = qs('#mascot-slot', root);
  const mascot = createMascot(mascotSlot, { emotion: 'happy' });

  let currentGame = null;

  qs('#btn-home', root).addEventListener('click', () => {
    if (currentGame && typeof currentGame.destroy === 'function') {
      try { currentGame.destroy(); } catch (e) { /* noop */ }
    }
    window.location.href = 'index.html';
  });

  if (!gameId) {
    showErrorState(root, mascot, '找不到这个真人游戏，回首页选一个吧！');
    return;
  }

  const familyRoot = qs('#family-root', root);
  const titleEl = qs('#family-title', root);
  const howtoEl = qs('#family-howto', root);
  const playcountEl = qs('#family-playcount', root);
  const checkinBtn = qs('#family-checkin-btn', root);

  function refreshPlaycount() {
    const n = getPlays(gameId);
    playcountEl.textContent = n > 0 ? `已经一起玩了 ${n} 次` : '还没打过卡';
  }
  refreshPlaycount();

  // 打卡防刷：必须先完整玩完一轮（游戏侧调用 api.completeRound()）才解锁一次打卡，
  // 打完立刻重新锁上，逼着下一轮真的玩完才能再打——不然可以对着按钮猛点刷次数。
  checkinBtn.disabled = true;
  checkinBtn.title = '先和家人完整玩完一轮，再来打卡吧！';

  checkinBtn.addEventListener('click', () => {
    if (checkinBtn.disabled) return;
    sfx.success();
    bumpPlays(gameId);
    refreshPlaycount();
    mascot.say(pick(CHECKIN_LINES), 'cheer');
    checkinBtn.classList.remove('anim-pop-in');
    void checkinBtn.offsetWidth;
    checkinBtn.classList.add('anim-pop-in');
    checkinBtn.disabled = true;
  });

  let mod;
  try {
    mod = await loadFamilyModule(gameId);
  } catch (err) {
    console.error(err);
    showErrorState(root, mascot, '这个真人游戏还没准备好，回首页看看别的吧！');
    return;
  }
  currentGame = mod;
  titleEl.textContent = `${mod.icon || '🎉'} ${mod.title || gameId}`;
  howtoEl.textContent = `💡 ${mod.howto || '和家人一起玩吧！'}`;
  mascot.say('准备好就一起开始吧！', 'happy');

  function makeApi() {
    return {
      sfx,
      mascot,
      Art,
      rand: { int: randInt, pick, shuffle },
      flipCard,
      countdownRing,
      beat,
      roleSwap,
      setHowTo(text) { howtoEl.textContent = `💡 ${text}`; },
      // 游戏侧在"完整玩完一轮"的那一刻调用它，解锁一次打卡（配合上面的防刷锁）。
      completeRound() { checkinBtn.disabled = false; },
    };
  }

  try {
    currentGame.init(familyRoot, makeApi());
  } catch (err) {
    console.error('family game init failed', err);
    showErrorState(root, mascot, '这个真人游戏出了点小状况，回首页看看别的吧！');
  }
}

startFamilyShell();
