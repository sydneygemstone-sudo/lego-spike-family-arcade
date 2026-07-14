/* js/family-shell.js
 * 「一起玩」真人互动游戏的通用主持人容器——family.html 唯一入口脚本。
 * 读取 ?f=<id>，动态 import('../family-games/<id>.js')，注入 api，统一负责：
 * 顶部栏（返回/吉祥物/标题）、一句话玩法说明横幅（家长 10 秒看懂怎么主持）、
 * 完成 10 轮会话挑战（sessionStorage 独立 key，不碰 js/store.js）。
 *
 * 真人游戏模块协议（family-games/<id>.js）——与 js/shell.js 的六关协议类似但更简单：
 *   export default { id, title, icon, howto, init(container, api), destroy() }
 * 或具名导出同名字段。真人游戏不计星，但统一收到 api.round 1..10。
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
import { createFeedbackBus } from './feedback-events.js';
import { createRandomContext, nextVariant } from './random.js';

const STORAGE_KEY = 'lsfa_family_v1';
const FAMILY_IDS = ['humanrobot', 'livinghunt', 'rhythm', 'macrospell', 'ifthen', 'humanbelt'];

function familyGlyph(id) {
  const paths = {
    humanrobot: '<rect x="32" y="31" width="96" height="98" rx="22"/><path d="M80 31V13M56 72h48M56 96h48"/><circle cx="60" cy="57" r="6"/><circle cx="100" cy="57" r="6"/>',
    livinghunt: '<circle cx="80" cy="80" r="55"/><path d="m80 36 17 38-17 50-17-50Z"/><circle cx="80" cy="80" r="8"/>',
    rhythm: '<path d="M43 105c0-17 13-30 30-30s30 13 30 30-13 30-30 30-30-13-30-30Z"/><path d="M73 75V26l48-11v50"/><circle cx="121" cy="75" r="16"/>',
    macrospell: '<path d="m80 16 13 33 35 3-27 22 9 35-30-19-30 19 9-35-27-22 35-3Z"/>',
    ifthen: '<path d="M80 23v113M36 50h88M36 108h88"/><circle cx="57" cy="50" r="17"/><circle cx="103" cy="108" r="17"/>',
    humanbelt: '<path d="M24 103h112M37 103V63h86v40"/><circle cx="48" cy="111" r="13"/><circle cx="112" cy="111" r="13"/><path d="M61 63V42h38v21"/>',
  };
  return `<svg viewBox="0 0 160 160" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">${paths[id] || paths.humanrobot}</g></svg>`;
}

function stateGlyph(kind) {
  const paths = {
    ready: '<circle cx="80" cy="80" r="51"/><path d="M80 52v32l22 14"/>',
    pack: '<path d="M45 62h70v72H45zM59 62V43c0-13 9-22 21-22s21 9 21 22v19M57 87h46M63 112h34"/>',
    walk: '<circle cx="80" cy="27" r="13"/><path d="m80 42-15 42 27 17 18 35M72 64l32 20M65 84l-24 46"/>',
    stop: '<rect x="31" y="31" width="98" height="98" rx="26"/><path d="M56 56h48v48H56z"/>',
    target: '<circle cx="80" cy="80" r="55"/><circle cx="80" cy="80" r="31"/><circle cx="80" cy="80" r="8"/><path d="m110 50 31-31M117 19h24v24"/>',
    hidden: '<path d="M18 80s23-39 62-39 62 39 62 39-23 39-62 39S18 80 18 80Z"/><circle cx="80" cy="80" r="18"/><path d="M29 131 131 29"/>',
    success: '<circle cx="80" cy="80" r="55"/><path d="m50 80 20 21 42-46"/>',
    trophy: '<path d="M53 22h54v44c0 22-12 37-27 37S53 88 53 66Z"/><path d="M53 37H28v15c0 18 12 29 30 29M107 37h25v15c0 18-12 29-30 29M80 103v24M57 140h46"/>',
    broadcast: '<path d="M30 69h28l51-30v82L58 91H30zM58 91v38H39V91M123 57c15 13 15 33 0 46"/>',
    spark: '<path d="m80 18 14 36 38 3-29 24 9 38-32-20-32 20 9-38-29-24 38-3Z"/>',
  };
  return `<svg viewBox="0 0 160 160" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">${paths[kind] || paths.ready}</g></svg>`;
}

const CHECKIN_LINES = [
  '太棒了，又一起玩了一轮！',
  '打卡成功！全家配合得真默契！',
  '记下啦！下次还要一起玩哦！',
];

/* -------------------------------------------------------------------------- 独立存档（不碰 js/store.js） -------------------------------------------------------------------------- */
function loadFamilyData() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* 隐私模式等，静默忽略 */ }
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

/* -------------------------------------------------------------------------- 共享组件：翻面对答案 -------------------------------------------------------------------------- */
function flipCard(container, { front = '', back = '', flipped = false } = {}) {
  container.innerHTML = `
    <div class="family-flipcard${flipped ? ' is-flipped' : ''}">
      <div class="family-flipcard-inner">
        <div class="family-flip-face family-flip-face--front" aria-hidden="${flipped}">${front}</div>
        <div class="family-flip-face family-flip-face--back" aria-hidden="${!flipped}"${flipped ? '' : ' inert'}>${back}</div>
      </div>
    </div>
  `;
  const el = container.querySelector('.family-flipcard');
  const frontEl = el.querySelector('.family-flip-face--front');
  const backEl = el.querySelector('.family-flip-face--back');
  if (flipped) frontEl.setAttribute('inert', '');
  function syncFaces(isBack) {
    frontEl.setAttribute('aria-hidden', String(isBack));
    backEl.setAttribute('aria-hidden', String(!isBack));
    frontEl.toggleAttribute('inert', isBack);
    backEl.toggleAttribute('inert', !isBack);
  }
  return {
    el,
    toFront() { el.classList.remove('is-flipped'); syncFaces(false); },
    toBack() { el.classList.add('is-flipped'); syncFaces(true); },
    toggle() { const isBack = el.classList.toggle('is-flipped'); syncFaces(isBack); },
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
      <button class="brick-btn brick-btn--purple" id="role-swap-btn">角色互换</button>
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
        <button id="btn-home" class="family-home-btn" aria-label="返回首页"><span>←</span><b>任务地图</b></button>
        <div class="family-brand"><i></i><span>FAMILY MISSION CONTROL</span></div>
        <div class="family-topbar-title">
          <span class="family-title-icon" id="family-title-icon"></span>
          <div><small>当前家庭任务</small><h1 id="family-title">载入任务…</h1></div>
        </div>
        <div class="family-topbar-mascot" id="mascot-slot" aria-hidden="true"></div>
        <div class="family-checkin">
          <span id="family-playcount" class="family-playcount"></span>
          <button id="family-checkin-btn" class="family-checkin-btn">完成打卡</button>
        </div>
      </header>
      <div class="family-host-strip">
        <div class="family-howto"><span>主持提示</span><strong id="family-howto">正在建立任务连接…</strong></div>
        <div class="family-feedback" id="family-feedback" role="status" aria-live="polite">
          <span class="family-feedback-dot"></span><span id="family-feedback-text">等待开局</span>
        </div>
        <div class="family-safety-note" role="note">
          <strong>成人先清场</strong>
          <span>移开桌角、玩具和易滑物；不闭眼走动、不跑跳、不互相推拉。空间不足或身体不适时，全程坐着，用拍腿、举手或桌面小模型代替移动。</span>
        </div>
      </div>
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
  qs('#family-howto', root).textContent = '回到任务地图，重新选择一个家庭挑战。';
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
  const requestedRound = Number(params.get('r'));
  const round = Number.isInteger(requestedRound) && requestedRound >= 1 && requestedRound <= 10 ? requestedRound : 1;
  const randomParams = new URLSearchParams(params);
  randomParams.delete('r');
  const random = createRandomContext(randomParams, `family:${gameId || 'unknown'}:round:${round}`);

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
  const titleIconEl = qs('#family-title-icon', root);
  const howtoEl = qs('#family-howto', root);
  const playcountEl = qs('#family-playcount', root);
  const checkinBtn = qs('#family-checkin-btn', root);
  const feedbackEl = qs('#family-feedback', root);
  const feedbackTextEl = qs('#family-feedback-text', root);
  const feedbackBus = createFeedbackBus(document);
  let feedbackTimer = null;

  feedbackBus.on(({ type, detail }) => {
    const label = detail.label || ({ ready: '准备', action: '行动', hit: '命中', miss: '再试一次', round: '本轮完成', success: '挑战成功' }[type] || '进行中');
    feedbackEl.dataset.type = type;
    feedbackTextEl.textContent = label;
    feedbackEl.classList.remove('is-pulsing');
    void feedbackEl.offsetWidth;
    feedbackEl.classList.add('is-pulsing');
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => feedbackEl.classList.remove('is-pulsing'), 700);
  });

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
    mascot.say(random.rand.pick(CHECKIN_LINES), 'cheer');
    checkinBtn.classList.remove('anim-pop-in');
    void checkinBtn.offsetWidth;
    checkinBtn.classList.add('anim-pop-in');
    checkinBtn.disabled = true;
    const nextRound = round < 10 ? round + 1 : 1;
    const nextV = round < 10 ? random.variant : nextVariant(random.variant, random.variantCount);
    window.setTimeout(() => {
      window.location.href = `family.html?f=${encodeURIComponent(gameId)}&r=${nextRound}&seed=${encodeURIComponent(random.seed)}&v=${nextV}`;
    }, 420);
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
  titleEl.textContent = `${mod.title || gameId} · 第 ${round}/10 轮`;
  titleIconEl.innerHTML = familyGlyph(gameId);
  howtoEl.textContent = mod.howto || '和家人一起完成这次挑战。';
  mascot.say('准备好就一起开始吧！', 'happy');

  function makeApi() {
    return {
      sfx,
      mascot,
      Art,
      glyph: stateGlyph,
      round,
      seed: random.seed,
      variant: random.variant,
      rand: random.rand,
      flipCard,
      countdownRing,
      beat,
      roleSwap,
      feedback: feedbackBus,
      emitFeedback(type, detail) { return feedbackBus.emit(type, detail); },
      setHowTo(text) { howtoEl.textContent = text; },
      // 游戏侧在"完整玩完一轮"的那一刻调用它，解锁一次打卡（配合上面的防刷锁）。
      completeRound() {
        checkinBtn.disabled = false;
        checkinBtn.textContent = round < 10 ? `完成第 ${round} 轮 · 下一关` : '收集本次徽章 · 再开一局';
        feedbackBus.emit('success', { label: round < 10 ? `第 ${round}/10 轮完成` : '十轮挑战完成' });
      },
    };
  }

  try {
    feedbackBus.emit('ready', { label: '主持模式已就绪' });
    currentGame.init(familyRoot, makeApi());
  } catch (err) {
    console.error('family game init failed', err);
    showErrorState(root, mascot, '这个真人游戏出了点小状况，回首页看看别的吧！');
  }
}

startFamilyShell();
