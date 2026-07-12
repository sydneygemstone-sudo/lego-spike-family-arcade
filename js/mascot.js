/* js/mascot.js
 * SPIKE Hub 吉祥物组件——黄色 Hub 机身 + 白色面板 + 5x5 点阵屏表情。
 * 呼应闪卡里的 "show matrix" 积木卡。纯 SVG + CSS 动画，无第三方依赖。
 *
 * 用法：
 *   import { createMascot } from './mascot.js';
 *   const mascot = createMascot(document.getElementById('mascot-slot'));
 *   mascot.setEmotion('happy');
 *   mascot.say('拖积木试试看！', 'idle');
 *   mascot.bounce();
 *
 * API 详见项目根目录 API.md。
 */

const EMOTIONS = ['idle', 'happy', 'think', 'cheer', 'oops'];

// 5x5 点阵表情图案，行优先，1=点亮 0=熄灭。呼应 SPIKE App 的 show matrix 积木。
const MATRIX_PATTERNS = {
  idle: [
    0, 1, 0, 1, 0,
    0, 1, 0, 1, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 1, 1, 1, 0,
  ],
  happy: [
    1, 0, 0, 0, 1,
    0, 1, 0, 1, 0,
    0, 0, 0, 0, 0,
    1, 0, 0, 0, 1,
    0, 1, 1, 1, 0,
  ],
  think: [
    0, 0, 0, 0, 1,
    0, 1, 0, 0, 0,
    0, 0, 0, 1, 0,
    0, 0, 0, 0, 0,
    0, 1, 1, 0, 0,
  ],
  cheer: [
    1, 0, 0, 0, 1,
    1, 1, 0, 1, 1,
    0, 0, 0, 0, 0,
    0, 1, 1, 1, 0,
    1, 1, 1, 1, 1,
  ],
  oops: [
    1, 0, 0, 0, 1,
    0, 1, 0, 1, 0,
    1, 0, 0, 0, 1,
    0, 0, 0, 0, 0,
    0, 1, 0, 1, 0,
  ],
};

const EMOTION_ANIM_CLASS = {
  idle: 'mascot--idle',
  happy: 'mascot--happy',
  think: 'mascot--think',
  cheer: 'mascot--cheer',
  oops: 'mascot--oops',
};

let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .spike-mascot-wrap {
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      width: fit-content;
    }
    .spike-mascot { width: 128px; height: auto; display: block; transition: transform .2s ease; }
    .spike-mascot .m-dot {
      transition: fill .18s ease, opacity .18s ease;
    }
    .mascot--idle .spike-mascot { animation: mascot-breathe 2.6s ease-in-out infinite; }
    .mascot--happy .spike-mascot { animation: mascot-bounce-happy .7s ease-in-out infinite; }
    .mascot--think .spike-mascot { animation: mascot-tilt-think 1.8s ease-in-out infinite; }
    .mascot--cheer .spike-mascot { animation: mascot-cheer-jump .55s cubic-bezier(.34,1.56,.64,1) infinite; }
    .mascot--oops .spike-mascot { animation: mascot-shake-oops .5s ease; }

    @keyframes mascot-breathe {
      0%, 100% { transform: translateY(0) scale(1); }
      50%      { transform: translateY(-3px) scale(1.015); }
    }
    @keyframes mascot-bounce-happy {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50%      { transform: translateY(-9px) rotate(-3deg); }
    }
    @keyframes mascot-tilt-think {
      0%, 100% { transform: rotate(0deg); }
      50%      { transform: rotate(4deg); }
    }
    @keyframes mascot-cheer-jump {
      0%, 100%  { transform: translateY(0) rotate(0deg); }
      35%       { transform: translateY(-16px) rotate(6deg); }
      65%       { transform: translateY(-4px) rotate(-4deg); }
    }
    @keyframes mascot-shake-oops {
      0%, 100% { transform: translateX(0) rotate(0deg); }
      20%      { transform: translateX(-6px) rotate(-4deg); }
      40%      { transform: translateX(6px) rotate(4deg); }
      60%      { transform: translateX(-4px) rotate(-2deg); }
      80%      { transform: translateX(4px) rotate(2deg); }
    }
    .spike-mascot-wrap .mascot-bubble {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      min-width: 140px;
      text-align: center;
      z-index: 5;
      white-space: normal;
    }
    .spike-mascot-wrap .mascot-bubble::after { left: 50%; margin-left: -8px; }
    .spike-mascot-wrap .mascot-bubble::before { left: 50%; margin-left: -6px; }
    /* 当吉祥物贴着视口顶部（比如页头）时气泡会被裁切，说话时会动态测量并翻到下方 */
    .spike-mascot-wrap .mascot-bubble--below {
      bottom: auto;
      top: calc(100% + 6px);
    }
    .spike-mascot-wrap .mascot-bubble--below::after {
      bottom: auto; top: -16px;
      border-top-color: transparent;
      border-bottom-color: var(--ink-900, #23272E);
    }
    .spike-mascot-wrap .mascot-bubble--below::before {
      bottom: auto; top: -9px;
      border-top-color: transparent;
      border-bottom-color: var(--paper-0, #fff);
    }
  `;
  document.head.appendChild(style);
}

function buildMatrixSVG(pattern, litColor) {
  const dots = [];
  const startX = 34;
  const startY = 54;
  const gap = 12.4;
  const r = 4.3;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const idx = row * 5 + col;
      const lit = pattern[idx] === 1;
      const cx = startX + col * gap;
      const cy = startY + row * gap;
      dots.push(
        `<circle class="m-dot" data-idx="${idx}" cx="${cx}" cy="${cy}" r="${r}" fill="${lit ? litColor : '#D7DCE1'}" opacity="${lit ? 1 : 0.55}"/>`
      );
    }
  }
  return dots.join('');
}

function buildHubSVG(pattern) {
  const litColor = '#E8380D';
  return `
<svg class="spike-mascot no-select" viewBox="0 0 160 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SPIKE Hub 吉祥物">
  <!-- 机身阴影 -->
  <ellipse cx="80" cy="180" rx="52" ry="8" fill="rgba(0,0,0,.15)"/>

  <!-- 黄色 Hub 机身（圆角方形，带乐高质感高光） -->
  <rect x="10" y="14" width="140" height="150" rx="26" fill="#F5C518"/>
  <rect x="10" y="14" width="140" height="150" rx="26" fill="url(#mascotBodyShine)"/>
  <rect x="10" y="14" width="140" height="150" rx="26" fill="none" stroke="#B8890A" stroke-width="3"/>

  <!-- 顶部两颗装饰凸粒（呼应积木质感） -->
  <circle cx="52" cy="26" r="7" fill="#FFE066" stroke="#B8890A" stroke-width="2"/>
  <circle cx="108" cy="26" r="7" fill="#FFE066" stroke="#B8890A" stroke-width="2"/>

  <!-- 左右两个圆形侧按钮 -->
  <circle cx="22" cy="96" r="9" fill="#D01012" stroke="#8E0B0D" stroke-width="2"/>
  <circle cx="138" cy="96" r="9" fill="#0055BF" stroke="#003580" stroke-width="2"/>

  <!-- 白色面板（5x5 点阵屏所在） -->
  <rect x="26" y="42" width="108" height="84" rx="16" fill="#FFFFFF" stroke="#D9DEE3" stroke-width="2"/>

  <!-- 5x5 点阵屏 -->
  <g>${buildMatrixSVG(pattern, litColor)}</g>

  <!-- 底部中央大圆按钮（蓝牙配对键） -->
  <circle cx="80" cy="144" r="12" fill="#ECEFF1" stroke="#B0B8BE" stroke-width="2.5"/>
  <circle cx="80" cy="144" r="5" fill="#0AA3B5"/>

  <defs>
    <linearGradient id="mascotBodyShine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".35"/>
      <stop offset=".5" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>
</svg>`;
}

/**
 * 创建一个吉祥物实例并挂载到 container 里。
 * @param {HTMLElement} container
 * @param {{emotion?: string}} opts
 */
export function createMascot(container, opts = {}) {
  injectStylesOnce();

  const wrap = document.createElement('div');
  wrap.className = 'spike-mascot-wrap';
  container.appendChild(wrap);

  let currentEmotion = EMOTIONS.includes(opts.emotion) ? opts.emotion : 'idle';
  let bubbleEl = null;
  let bubbleTimer = null;

  function render() {
    wrap.innerHTML = buildHubSVG(MATRIX_PATTERNS[currentEmotion]);
    wrap.className = `spike-mascot-wrap ${EMOTION_ANIM_CLASS[currentEmotion]}`;
    if (bubbleEl) wrap.appendChild(bubbleEl);
  }

  function setEmotion(name) {
    if (!EMOTIONS.includes(name)) name = 'idle';
    currentEmotion = name;
    render();
  }

  function bounce() {
    const svg = wrap.querySelector('.spike-mascot');
    if (!svg) return;
    svg.style.animation = 'none';
    // 强制回流后重新触发一次当前情绪的动画
    void svg.offsetWidth;
    svg.style.animation = '';
  }

  /**
   * say(text, emotion) —— 弹出气泡说一句话，同时切换表情。
   * ms<=0 表示常驻不自动消失（例如 shell 结算页），默认 3200ms 后自动淡出。
   */
  function say(text, emotion, ms = 3200) {
    if (emotion) setEmotion(emotion);
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null; }
    if (!bubbleEl) {
      bubbleEl = document.createElement('div');
      bubbleEl.className = 'mascot-bubble anim-pop-in';
      wrap.appendChild(bubbleEl);
    }
    bubbleEl.textContent = text;
    bubbleEl.style.display = '';
    // 动态判断上方空间是否够放气泡，不够就翻到下方。
    // 参照物优先取最近的卡片/弹窗边界（.modal-card / .brick-card），而不是整个视口——
    // 吉祥物常被塞进结算弹窗顶部这种"卡片内空间很紧"但"离视口顶部很远"的场景，
    // 只看视口会误判空间足够，导致气泡顶穿卡片边界糊在遮罩层上。
    const boundaryEl = wrap.closest('.modal-card, .brick-card');
    const spaceAbove = boundaryEl
      ? wrap.getBoundingClientRect().top - boundaryEl.getBoundingClientRect().top
      : wrap.getBoundingClientRect().top;
    const bubbleHeight = bubbleEl.offsetHeight;
    // wrap 所在的祖先链里如果有 display:none（比如闪卡页 quiz 面板首次挂载时还没切到那个
    // tab），offsetParent 会是 null，此时 getBoundingClientRect() 全部读数为 0——
    // spaceAbove/bubbleHeight 都是假的 0，会被误判"空间不够"从而翻到下方，等 tab 真正
    // 切换可见后这个错误状态却不会重新计算，导致气泡长期糊住下面的文字。这里只在
    // 元素确实已经参与渲染（offsetParent 非 null）时才信任这次测量结果。
    const isRendered = wrap.offsetParent !== null;
    if (isRendered && spaceAbove < bubbleHeight + 16) {
      bubbleEl.classList.add('mascot-bubble--below');
      // 气泡翻到下方是 position:absolute，不占文档流；如果不给 wrap 留出
      // 等高的 margin-bottom，气泡会直接盖住吉祥物下面的兄弟内容（比如结算
      // 弹窗里紧跟着的"关卡完成!"标题和星级行）。这里动态撑开这块空间。
      wrap.style.marginBottom = (bubbleHeight + 14) + 'px';
    } else {
      bubbleEl.classList.remove('mascot-bubble--below');
      wrap.style.marginBottom = '';
    }
    if (ms > 0) {
      bubbleTimer = setTimeout(() => {
        if (bubbleEl) bubbleEl.style.display = 'none';
        wrap.style.marginBottom = '';
      }, ms);
    }
  }

  function hideBubble() {
    if (bubbleEl) bubbleEl.style.display = 'none';
    wrap.style.marginBottom = '';
  }

  function destroy() {
    if (bubbleTimer) clearTimeout(bubbleTimer);
    wrap.remove();
  }

  render();

  return { el: wrap, setEmotion, say, hideBubble, bounce, destroy };
}
