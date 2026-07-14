/* js/shell.js
 * 通用关卡容器——game.html 唯一的入口脚本。
 * 读取 ?g=<id>&l=<1..10>，动态 import('./games/<id>.js')，注入 api{complete,fail,sfx,mascot,store,level,seed,variant,rand}，
 * 统一负责：顶部栏（返回/吉祥物/标题/当前 level 星级）、结算弹窗（3 星动画+音效+难度徽标+下一难度入口）、
 * 重试/返回首页。
 *
 * 关卡模块协议（games/<id>.js）——支持两种导出形式，任选其一：
 *   export default { id, title, icon, init(container, api), destroy() }
 *   或直接具名导出同名字段（export const id/title/icon; export function init/destroy）
 *
 * level 向后兼容：URL 缺省 `l` 或非法值一律当作 1；游戏模块完全可以不读 api.level，
 * 照样等价于跑 L1，不会报错（现有六关在下一波才会真正用到 api.level）。
 */

import { sfx } from './sfx.js';
import { createMascot } from './mascot.js';
import { store } from './store.js';
import { badgeRewardLine, getLevelCount, levelLabel } from './game-config.js';
import { createRandomContext, nextVariant } from './random.js';

const FAIL_LINES = [
  '没关系，再试一次！',
  '哎呀，差一点点～',
  '咱们再想想办法！',
  'Debug 一下，马上就好！',
];

const COMPLETE_LINES = {
  3: ['完美通关！你是最棒的小小工程师！', '满星！简直是编程小天才！'],
  2: ['很不错！再挑战一次说不定能拿满星～', '不错哦！还差一点点就满星啦！'],
  1: ['完成啦！再试试能不能做得更好！', '过关了！再来一次挑战更高分！'],
  0: ['勇敢的尝试！再来一次一定可以！', '别灰心，再试一次就会啦！'],
};

function qs(sel, root = document) { return root.querySelector(sel); }

// URL level is validated against the selected game's campaign size.
function parseLevel(params, gameId) {
  const n = Number(params.get('l'));
  return Number.isInteger(n) && n >= 1 && n <= getLevelCount(gameId) ? n : 1;
}

function buildSkeleton(root) {
  root.innerHTML = `
    <div class="game-page">
      <header class="game-topbar">
        <button id="btn-home" class="brick-btn brick-btn--gray brick-btn--sm" aria-label="返回首页">← 首页</button>
        <div class="game-topbar-mascot" id="mascot-slot"></div>
        <div class="game-topbar-title">
          <div class="flex-row gap-2" style="align-items:center;">
            <h1 id="game-title" class="title-md" style="margin:0;">加载中…</h1>
            <span class="level-chip" id="level-chip"></span>
          </div>
          <div class="star-rating star-rating--sm" id="current-stars"></div>
        </div>
      </header>
      <main id="game-root" class="game-root"></main>
    </div>
    <div id="modal-root"></div>
  `;
}

function renderStars(container, count, size = 'normal') {
  container.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const s = document.createElement('span');
    s.className = 'star' + (size === 'sm' ? ' star--sm' : '');
    s.dataset.i = String(i);
    s.textContent = '★';
    if (i <= count) s.classList.add('star--filled');
    container.appendChild(s);
  }
}

async function loadGameModule(gameId) {
  const mod = await import(`../games/${gameId}.js`);
  const candidate = mod.default && typeof mod.default.init === 'function' ? mod.default : mod;
  if (typeof candidate.init !== 'function') {
    throw new Error('关卡模块未导出 init(container, api)');
  }
  return candidate;
}

function showErrorState(root, message) {
  buildSkeleton(root);
  const mascotSlot = qs('#mascot-slot', root);
  const mascot = createMascot(mascotSlot);
  mascot.say(message, 'oops', 0);
  qs('#game-title', root).textContent = '出错了';
  qs('#game-root', root).innerHTML = `
    <div class="flex-center" style="min-height:40vh;">
      <button class="brick-btn brick-btn--yellow" id="btn-home-err">返回首页</button>
    </div>
  `;
  qs('#btn-home-err', root).addEventListener('click', () => { window.location.href = 'index.html'; });
  qs('#btn-home', root).addEventListener('click', () => { window.location.href = 'index.html'; });
}

export async function startShell(root = document.getElementById('app')) {
  buildSkeleton(root);

  const params = new URLSearchParams(window.location.search);
  const raw = params.get('g') || '';
  const gameId = /^[a-zA-Z0-9_]+$/.test(raw) ? raw : null;
  const level = parseLevel(params, gameId);
  const random = createRandomContext(params, `game:${gameId || 'unknown'}:mission:${level}`);
  const uiRand = random.createStream('ui');

  const mascotSlot = qs('#mascot-slot', root);
  const mascot = createMascot(mascotSlot, { emotion: 'idle' });

  qs('#btn-home', root).addEventListener('click', () => {
    if (currentGame && typeof currentGame.destroy === 'function') {
      try { currentGame.destroy(); } catch (e) { /* noop */ }
    }
    window.location.href = 'index.html';
  });

  if (!gameId) {
    showErrorState(root, '找不到这一关，回首页选一关吧！');
    return;
  }

  let currentGame = null;
  const gameRoot = qs('#game-root', root);
  const titleEl = qs('#game-title', root);
  const currentStarsEl = qs('#current-stars', root);
  const levelChipEl = qs('#level-chip', root);

  levelChipEl.textContent = `${levelLabel(gameId, level)} · 组合 ${String(random.variant).padStart(2, '0')}/10`;
  renderStars(currentStarsEl, store.getStars(gameId, level), 'sm');

  let mod;
  try {
    mod = await loadGameModule(gameId);
  } catch (err) {
    console.error(err);
    showErrorState(root, '这一关还没准备好，回首页看看别的关卡吧！');
    return;
  }
  currentGame = mod;
  titleEl.textContent = `${mod.icon || '🧱'} ${mod.title || gameId}`;
  mascot.say('拖积木、按 ▶ 试试看！', 'idle');

  function makeApi() {
    return {
      complete(stars) { onComplete(stars); },
      fail(reason) { onFail(reason); },
      sfx,
      mascot,
      store,
      level,
      seed: random.seed,
      variant: random.variant,
      // Rebuild the layout stream for every init so an in-page retry recreates
      // the exact same mission even after UI copy has consumed randomness.
      rand: random.createStream('layout'),
    };
  }

  function runInit() {
    gameRoot.innerHTML = '';
    try {
      currentGame.init(gameRoot, makeApi());
    } catch (err) {
      console.error('game init failed', err);
      showErrorState(root, '这一关出了点小状况，回首页看看别的关卡吧！');
    }
  }

  function onFail(reason) {
    sfx.fail();
    mascot.say(uiRand.pick(FAIL_LINES), 'oops');
    gameRoot.classList.remove('anim-shake');
    void gameRoot.offsetWidth;
    gameRoot.classList.add('anim-shake');
    if (reason) console.debug('[shell] level fail reason:', reason);
  }

  function onComplete(rawStars) {
    const stars = Math.max(0, Math.min(3, Math.round(rawStars)));
    const result = store.setStars(gameId, level, stars);
    renderStars(currentStarsEl, result.best, 'sm');
    showResultModal(stars, result);
  }

  function showResultModal(stars, result) {
    const modalRoot = qs('#modal-root', root);
    const hasNextLevel = stars >= 1 && level < getLevelCount(gameId);
    modalRoot.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card">
          <div id="modal-mascot-slot" class="flex-center" style="margin-bottom:8px;"></div>
          <h2 class="title-lg">关卡完成！</h2>
          <span class="level-chip level-chip--modal">${levelLabel(gameId, level)}</span>
          <div class="star-rating" id="modal-stars">
            <span class="star" data-i="1">★</span>
            <span class="star" data-i="2">★</span>
            <span class="star" data-i="3">★</span>
          </div>
          <p class="text-muted" id="modal-msg" style="min-height:1.4em;"></p>
          <div id="modal-badge" class="flex-col gap-2" style="align-items:center; margin: 8px 0 4px;"></div>
          <div class="flex-row gap-3" style="justify-content:center; margin-top: 18px; flex-wrap: wrap;">
            ${hasNextLevel ? `<button class="brick-btn brick-btn--green" id="btn-next-level">挑战下一难度 →</button>` : ''}
            <button class="brick-btn brick-btn--blue" id="btn-new-variant">换一套随机关卡</button>
            <button class="brick-btn brick-btn--gray" id="btn-retry">重试</button>
            <button class="brick-btn brick-btn--yellow" id="btn-home2">返回首页</button>
          </div>
        </div>
      </div>
    `;

    const modalMascot = createMascot(qs('#modal-mascot-slot', modalRoot));
    const emotion = stars >= 2 ? 'cheer' : stars === 1 ? 'happy' : 'think';
    modalMascot.say(uiRand.pick(COMPLETE_LINES[stars] || COMPLETE_LINES[0]), emotion, 0);
    qs('#modal-msg', modalRoot).textContent = `本次获得 ${stars} 星 · 本次会话最佳 ${result.best} 星`;

    if (result.badgeUnlocked) {
      const badgeBox = qs('#modal-badge', modalRoot);
      const badgeIcon = result.badgeTier === 'gold' ? '🌟' : '🏅';
      const badgeLine = badgeRewardLine(result.badgeUnlocked, result.badgeTier);
      badgeBox.innerHTML = `
        <div class="badge-hex${result.badgeTier === 'gold' ? ' badge-hex--gold' : ''}" style="--badge-color: var(--cat-${result.badgeUnlocked}, var(--lego-yellow));">${badgeIcon}</div>
        <div class="title-sm">${badgeLine}</div>
      `;
    }

    // 逐颗弹出已获得的星星 + star 音效
    const starEls = Array.from(modalRoot.querySelectorAll('#modal-stars .star'));
    starEls.forEach((s, i) => {
      setTimeout(() => {
        if (i < stars) {
          s.classList.add('star--filled');
          sfx.star();
        }
      }, 260 + i * 380);
    });

    if (hasNextLevel) {
      qs('#btn-next-level', modalRoot).addEventListener('click', () => {
        if (typeof currentGame.destroy === 'function') {
          try { currentGame.destroy(); } catch (e) { /* noop */ }
        }
        window.location.href = `game.html?g=${encodeURIComponent(gameId)}&l=${level + 1}&seed=${encodeURIComponent(random.seed)}&v=1`;
      });
    }

    qs('#btn-new-variant', modalRoot).addEventListener('click', () => {
      if (typeof currentGame.destroy === 'function') {
        try { currentGame.destroy(); } catch (e) { /* noop */ }
      }
      const variant = nextVariant(random.variant, random.variantCount);
      window.location.href = `game.html?g=${encodeURIComponent(gameId)}&l=${level}&seed=${encodeURIComponent(random.seed)}&v=${variant}`;
    });

    qs('#btn-retry', modalRoot).addEventListener('click', () => {
      modalMascot.destroy();
      modalRoot.innerHTML = '';
      if (typeof currentGame.destroy === 'function') {
        try { currentGame.destroy(); } catch (e) { /* noop */ }
      }
      mascot.say('加油，再来一次！', 'idle');
      runInit();
    });
    qs('#btn-home2', modalRoot).addEventListener('click', () => {
      if (typeof currentGame.destroy === 'function') {
        try { currentGame.destroy(); } catch (e) { /* noop */ }
      }
      window.location.href = 'index.html';
    });
  }

  if (typeof window !== 'undefined' && window.__LSFA_TEST__) {
    window.__lsfaShell = { complete: onComplete };
  }

  runInit();
}

startShell();
