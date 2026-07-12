/* games/sort.js
 * 仓库分拣 —— 美术全部来自 assets/art.js 的 beltScene（编号可数的包裹 + 真实滚轮传送带 +
 * 仓库门）与 roverSide（侧视机器人，随行驶轮辐转动）。设定 Repeat = 包裹数（算式
 * `N 个包裹 = Repeat N 次`），运行时给包裹区盖一层纯 CSS 的半透明"质检暗箱"（唯一允许
 * worker 自制的遮罩，其余场景图形一律来自 art.js，不新画、不用 emoji）。
 *
 * 教学环：
 *   ① 目标可视化 —— 设定阶段传送带完全可见，包裹编号 1..N 可数
 *   ② 单位显性化 —— 每个包裹 = 1 次卸货（Repeat 的一个单位）
 *   ③ 算式显性化 —— 拨 Repeat 数时大字实时显示 `N 个包裹 = Repeat N 次`
 *   ④ 演练不计分 —— 「再数一次」高亮逐个包裹，不计分，可反复；确认次数后才进入计分的正式运行
 *
 * 到震动点屏幕晃动 + 1.5s 内点"卸货"；运行时暗箱盖住包裹区，孩子看不到剩几个，
 * 中途随机点暂停问"暗箱里还剩几个包裹？"（正确答案 = 剩余数）。
 * 星级：卸货全中+答对=3星 / 全中但答错，或漏1次=2星 / 其余完成=1星。
 * 协议见 API.md：export default {id,title,icon,init,destroy}。
 */

import * as Art from '../assets/art.js';

/* beltScene 内部几何常量（必须与 art.js 保持一致，用于精确定位机器人 overlay 与暗箱遮罩） */
const BELT_SEG = 92;
const BELT_BX = 150;
const BELT_BY = 130;
const BELT_VIEW_H = 220;

const UNLOAD_WINDOW_MS = 1500;

function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function wait(ms, timers) {
  return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); });
}

function beltWidth(n) { return BELT_BX + n * BELT_SEG + 180; }
/** 第 i 个包裹（0-based）在传送带整体宽度中的横向百分比 */
function parcelPercent(i, n) { return ((BELT_BX + i * BELT_SEG + BELT_SEG / 2) / beltWidth(n)) * 100; }
/** 暗箱遮罩应覆盖的横向百分比区间（包裹活动区，仓库门左侧为止） */
function maskPercent(n) {
  const w = beltWidth(n);
  return { left: (BELT_BX / w) * 100, right: ((BELT_BX + n * BELT_SEG) / w) * 100 };
}
const ROBOT_TOP_PCT = (BELT_BY / BELT_VIEW_H) * 100;

let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .sort-stage-card { padding-top:22px; }
    .sort-stage { max-height:56vh; display:flex; background:var(--paper-50); border-radius:14px; overflow:hidden; }
    .sort-stage-inner { position:relative; flex:1 1 0; min-width:0; display:flex; }
    .sort-stage-inner svg { width:100%; height:auto; display:block; }
    .sort-parcel-hl { transform-box:fill-box; transform-origin:center; transform:scale(1.22); transition:transform .16s ease; filter:drop-shadow(0 0 8px rgba(245,197,24,.95)); }
    .sort-run-robot { position:absolute; width:15%; min-width:56px; max-width:96px; height:auto; top:${ROBOT_TOP_PCT}%; transform:translate(-50%,-100%); transition:left .7s ease; pointer-events:none; z-index:5; }
    .sort-mask { position:absolute; top:14%; bottom:30%; background:rgba(24,26,32,.74); border-radius:16px; z-index:4;
      display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:13px; text-align:center; }
    .sort-controls { margin-top:14px; display:flex; flex-direction:column; gap:12px; align-items:center; text-align:center; }
    .sort-stepper { display:flex; align-items:center; gap:14px; }
    .sort-stepper .val { font-size:34px; font-weight:900; min-width:56px; text-align:center; color: var(--cat-sort,#6B2FA0); }
    .sort-formula { font-size: clamp(20px, 3.6vw, 28px); font-weight:900; color: var(--cat-sort,#6B2FA0); margin:0; }
    .sort-buttons-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
    .sort-unload-zone { display:flex; flex-direction:column; align-items:center; gap:8px; min-height:110px; justify-content:center; margin-top:10px; }
    .sort-unload-btn { font-size:22px; min-height:84px; min-width:220px; }
    .sort-countdown-track { width:220px; height:14px; border-radius:999px; background:var(--paper-100); overflow:hidden; box-shadow:inset 0 2px 4px rgba(0,0,0,.15); }
    .sort-countdown-fill { height:100%; background: linear-gradient(90deg, var(--lego-green,#237841), var(--lego-yellow,#F5C518)); width:100%; }
    .sort-countdown-fill--run { transition: width ${UNLOAD_WINDOW_MS}ms linear; width:0%; }
    .sort-result-tag { font-size:15px; font-weight:800; }
    .sort-result-tag--hit { color: var(--lego-green,#237841); }
    .sort-result-tag--miss { color: var(--lego-red,#D01012); }
    .sort-quiz-btn { min-width: 90px; }
    .sort-quiz-btn--correct { background: var(--lego-green,#237841) !important; }
    .sort-quiz-btn--wrong { background: var(--lego-red,#D01012) !important; }
    .sort-progress-label { font-size:13px; color:var(--ink-500); min-height:1.4em; }
  `;
  document.head.appendChild(style);
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  const N = randInt(3, 5);
  const quizAt = randInt(2, N - 1); // 跑完第几个震动点后暂停问答
  let stepperVal = 0;
  let confirmed = false;
  let hits = 0;
  let misses = 0;
  let quizCorrect = null;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-sort sort-stage-card" id="sort-setup-card">
      <p class="title-sm" style="margin:0 0 8px;">🔁 数一数传送带上有几个包裹，设定 Repeat 次数！</p>
      <div class="sort-stage"><div class="sort-stage-inner" id="sort-belt-setup"></div></div>
      <div class="sort-controls">
        <div class="sort-stepper">
          <button class="brick-btn brick-btn--gray brick-btn--icon" id="sort-minus-btn" aria-label="减少">−</button>
          <span class="val" id="sort-stepper-val">0</span>
          <button class="brick-btn brick-btn--gray brick-btn--icon" id="sort-plus-btn" aria-label="增加">＋</button>
        </div>
        <p class="sort-formula" id="sort-formula-text">0 个包裹 = Repeat 0 次</p>
        <div class="sort-buttons-row">
          <button class="brick-btn brick-btn--gray" id="sort-recount-btn">🔍 再数一次（试一试）</button>
          <button class="brick-btn brick-btn--purple brick-btn--lg" id="sort-confirm-btn">✅ 确认次数</button>
        </div>
      </div>
    </div>

    <div class="brick-card brick-card--cat-sort sort-stage-card" id="sort-run-card" style="display:none; margin-top:16px;">
      <div class="flex-between">
        <p class="title-sm" style="margin:0;">🚚 机器人出发咯，每到震动点赶紧卸货！</p>
        <button class="brick-btn brick-btn--green" id="sort-start-btn">▶ 出发</button>
      </div>
      <div class="sort-stage" style="margin-top:10px;"><div class="sort-stage-inner" id="sort-belt-run"></div></div>
      <div class="sort-unload-zone">
        <button class="brick-btn brick-btn--red sort-unload-btn" id="sort-unload-btn" style="display:none;">📦 卸货！</button>
        <div class="sort-countdown-track" id="sort-countdown-track" style="display:none;"><div class="sort-countdown-fill" id="sort-countdown-fill"></div></div>
        <div class="sort-result-tag" id="sort-result-tag"></div>
      </div>
      <p class="sort-progress-label" id="sort-progress-label"></p>
    </div>
  `;

  const setupCard = container.querySelector('#sort-setup-card');
  const beltSetupBox = container.querySelector('#sort-belt-setup');
  const stepperValEl = container.querySelector('#sort-stepper-val');
  const formulaText = container.querySelector('#sort-formula-text');
  const minusBtn = container.querySelector('#sort-minus-btn');
  const plusBtn = container.querySelector('#sort-plus-btn');
  const recountBtn = container.querySelector('#sort-recount-btn');
  const confirmBtn = container.querySelector('#sort-confirm-btn');

  const runCard = container.querySelector('#sort-run-card');
  const beltRunBox = container.querySelector('#sort-belt-run');
  const startBtn = container.querySelector('#sort-start-btn');
  const unloadBtn = container.querySelector('#sort-unload-btn');
  const countdownTrack = container.querySelector('#sort-countdown-track');
  const countdownFill = container.querySelector('#sort-countdown-fill');
  const resultTag = container.querySelector('#sort-result-tag');
  const progressLabel = container.querySelector('#sort-progress-label');

  beltSetupBox.innerHTML = Art.beltScene({ n: N });
  beltRunBox.innerHTML = Art.beltScene({ n: N });

  // 机器人 overlay（run belt 专用，side 视角，随行驶轮辐转动）
  const robotWrap = document.createElement('div');
  robotWrap.className = 'sort-run-robot';
  robotWrap.style.left = `${parcelPercent(-1, N) > 0 ? parcelPercent(-1, N) : 2}%`;
  robotWrap.innerHTML = Art.roverSide({ wheelAngle: 0, face: 'happy' });
  beltRunBox.appendChild(robotWrap);

  // 质检暗箱遮罩（唯一允许的纯 CSS 场景遮罩），运行开始后才显示
  const maskPct = maskPercent(N);
  const maskEl = document.createElement('div');
  maskEl.className = 'sort-mask';
  maskEl.style.left = `${maskPct.left}%`;
  maskEl.style.width = `${maskPct.right - maskPct.left}%`;
  maskEl.style.display = 'none';
  maskEl.textContent = '暗箱';
  beltRunBox.appendChild(maskEl);

  function updateFormula() {
    formulaText.textContent = `${stepperVal} 个包裹 = Repeat ${stepperVal} 次`;
  }
  function updateStepperLabel() {
    stepperValEl.textContent = String(stepperVal);
    updateFormula();
  }

  minusBtn.addEventListener('click', () => {
    api.sfx.click();
    stepperVal = Math.max(0, stepperVal - 1);
    updateStepperLabel();
  });
  plusBtn.addEventListener('click', () => {
    api.sfx.click();
    stepperVal = Math.min(8, stepperVal + 1);
    updateStepperLabel();
  });

  /* 演练：逐个高亮包裹，帮助数数，不计分，可反复按 */
  let recounting = false;
  recountBtn.addEventListener('click', async () => {
    if (recounting) return;
    recounting = true;
    api.sfx.click();
    const svgEl = beltSetupBox.querySelector('svg');
    const groups = svgEl ? Array.from(svgEl.querySelectorAll(':scope > g')) : [];
    for (const g of groups) {
      if (cancelled) break;
      g.classList.add('sort-parcel-hl');
      api.sfx.click();
      await wait(260, timers);
      if (cancelled) break;
      g.classList.remove('sort-parcel-hl');
    }
    recounting = false;
  });

  confirmBtn.addEventListener('click', () => {
    if (confirmed) return;
    if (stepperVal !== N) {
      api.fail('wrong-repeat-count');
      api.mascot.say('再数一数包裹，调整一下次数吧！', 'oops');
      return;
    }
    confirmed = true;
    api.sfx.success();
    api.mascot.say('设对啦！准备出发！', 'cheer');
    setupCard.style.display = 'none';
    runCard.style.display = 'block';
  });

  startBtn.addEventListener('click', () => {
    api.sfx.click();
    startBtn.disabled = true;
    maskEl.style.display = 'flex';
    runConveyor();
  });

  /* 用 setTimeout 驱动补间，不用 requestAnimationFrame——已用无头浏览器实测确认 rAF 在标签页
   * 被切到后台/隐藏时会完全暂停触发，若用它驱动这里的补间，传送带运行到一半就会卡死不再
   * 响应；setTimeout 在后台最多只是被节流，仍会继续推进，不会卡死。 */
  function tweenWheel(fromDeg, toDeg, ms, face) {
    return new Promise((resolve) => {
      if (cancelled) { resolve(); return; }
      const t0 = performance.now();
      const STEP_MS = 30;
      function step() {
        if (cancelled) { resolve(); return; }
        const p = Math.min(1, (performance.now() - t0) / ms);
        const deg = fromDeg + (toDeg - fromDeg) * p;
        robotWrap.innerHTML = Art.roverSide({ wheelAngle: deg, face });
        if (p < 1) { timers.push(setTimeout(step, STEP_MS)); } else resolve();
      }
      step();
    });
  }

  async function runConveyor() {
    progressLabel.textContent = '';
    let wheelDeg = 0;
    for (let i = 0; i < N; i++) {
      if (cancelled) return;
      progressLabel.textContent = '传送带运行中…';
      robotWrap.style.left = `${parcelPercent(i, N)}%`;
      await tweenWheel(wheelDeg, wheelDeg + 260, 720, 'effort');
      wheelDeg += 260;
      if (cancelled) return;

      // 到达震动点：屏幕晃动 + 音效
      container.classList.remove('anim-shake');
      void container.offsetWidth;
      container.classList.add('anim-shake');
      api.sfx.snap();
      await wait(120, timers);
      if (cancelled) return;

      const hit = await handleUnloadWindow();
      if (cancelled) return;
      if (hit) { hits += 1; } else { misses += 1; }
      robotWrap.innerHTML = Art.roverSide({ wheelAngle: wheelDeg, face: hit ? 'happy' : 'oops' });
      await wait(280, timers);
      if (cancelled) return;

      const doneCount = i + 1;
      if (doneCount === quizAt) {
        progressLabel.textContent = '传送带暂停一下…';
        api.mascot.say('先别急着走，想一想！', 'think');
        quizCorrect = await showQuiz(N - doneCount);
        if (cancelled) return;
      }
    }

    if (cancelled) return;
    robotWrap.style.left = '96%';
    await tweenWheel(wheelDeg, wheelDeg + 200, 500, 'happy');
    progressLabel.textContent = '到达仓库！';
    api.mascot.say('到仓库啦！', 'happy');
    await wait(700, timers);
    if (cancelled) return;
    finish(quizCorrect);
  }

  function handleUnloadWindow() {
    return new Promise((resolve) => {
      unloadBtn.style.display = 'inline-flex';
      unloadBtn.disabled = false;
      countdownTrack.style.display = 'block';
      resultTag.textContent = '';
      countdownFill.className = 'sort-countdown-fill';
      countdownFill.style.width = '100%';
      void countdownFill.offsetWidth;
      countdownFill.classList.add('sort-countdown-fill--run');
      countdownFill.style.width = '0%';

      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        api.sfx.fail();
        api.fail('missed-unload');
        resultTag.textContent = '慢了一点，没接住…';
        resultTag.className = 'sort-result-tag sort-result-tag--miss';
        resolve(false);
      }, UNLOAD_WINDOW_MS);
      timers.push(timeoutId);

      function onClick() {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        cleanup();
        api.sfx.success();
        resultTag.textContent = '卸货成功！';
        resultTag.className = 'sort-result-tag sort-result-tag--hit';
        resolve(true);
      }
      unloadBtn.addEventListener('click', onClick);

      function cleanup() {
        unloadBtn.removeEventListener('click', onClick);
        unloadBtn.style.display = 'none';
        countdownTrack.style.display = 'none';
      }
    });
  }

  function buildQuizOptions(correct, total) {
    const pool = new Set([correct]);
    [correct + 1, correct - 1, total].forEach((v) => { if (v >= 0) pool.add(v); });
    let filler = 0;
    while (pool.size < 4 && filler <= total + 5) {
      if (filler !== correct) pool.add(filler);
      filler += 1;
    }
    return shuffle([...pool]);
  }

  function showQuiz(correctAnswer) {
    return new Promise((resolve) => {
      const options = buildQuizOptions(correctAnswer, N);
      const modalRoot = document.createElement('div');
      modalRoot.className = 'modal-overlay';
      modalRoot.innerHTML = `
        <div class="modal-card">
          <h2 class="title-lg" style="margin-bottom:6px;">🤔 小测验</h2>
          <p class="text-muted">传送带先暂停一下——暗箱里还剩几个包裹？</p>
          <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap; margin-top:14px;">
            ${options.map((v) => `<button class="brick-btn brick-btn--yellow sort-quiz-btn" data-v="${v}">${v}</button>`).join('')}
          </div>
        </div>
      `;
      container.appendChild(modalRoot);
      let answered = false;
      modalRoot.querySelectorAll('.sort-quiz-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          const val = Number(btn.dataset.v);
          const correct = val === correctAnswer;
          modalRoot.querySelectorAll('.sort-quiz-btn').forEach((b) => { b.disabled = true; });
          if (correct) {
            btn.classList.add('sort-quiz-btn--correct');
            api.sfx.success();
          } else {
            btn.classList.add('sort-quiz-btn--wrong');
            const rightBtn = modalRoot.querySelector(`[data-v="${correctAnswer}"]`);
            if (rightBtn) rightBtn.classList.add('sort-quiz-btn--correct');
            api.sfx.fail();
          }
          timers.push(setTimeout(() => {
            modalRoot.remove();
            resolve(correct);
          }, 1200));
        });
      });
    });
  }

  function finish(isQuizCorrect) {
    const allHits = misses === 0;
    let stars;
    if (allHits && isQuizCorrect) stars = 3;
    else if ((allHits && !isQuizCorrect) || misses === 1) stars = 2;
    else stars = 1;
    api.mascot.say(stars === 3 ? '完美！全部卸货成功还答对啦！' : '任务完成啦！', stars === 3 ? 'cheer' : 'happy');
    api.complete(stars);
  }

  updateStepperLabel();
  api.mascot.say('先数一数传送带上的包裹，设好 Repeat 次数吧！', 'idle', 4200);

  return {
    destroy() {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    },
  };
}

let activeHandle = null;

export default {
  id: 'sort',
  title: '仓库分拣',
  icon: '📦',
  init(container, api) {
    injectStylesOnce();
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
