/* games/sort.js
 * 仓库分拣 —— 设定 Repeat N 循环（N=3-5 随机），机器人沿传送带走，每到震动点屏幕晃动+音效，
 * 1.5 秒内点"卸货"。跑到第 k 个震动点（k 在 2..N-1 随机）之后，传送带暂停，弹出
 * "现在还剩几次卸货？"四选一问答（正确答案 = N-k，考的是孩子有没有在心里维护循环
 * 剩余次数，而不是等跑完全部 N 次再问——那样正确答案永远是 0，玩两次就能背答案）。
 * 答完继续跑完剩下的循环。
 * 星级：卸货全中+答对=3星 / 卸货全中但答错，或漏 1 次=2星 / 其余完成=1星。
 * 协议见 API.md：export default {id,title,icon,init,destroy}。
 */

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

let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .sort-setup-card { display:flex; flex-direction:column; gap:10px; align-items:center; text-align:center; }
    .sort-stepper { display:flex; align-items:center; gap:14px; }
    .sort-stepper .val { font-size:40px; font-weight:900; min-width:64px; text-align:center; color: var(--cat-sort,#6B2FA0); }
    .sort-belt-wrap { position:relative; width:100%; height:110px; border-radius:20px; margin: 10px 0;
      background: repeating-linear-gradient(45deg, #D9A441 0px, #D9A441 18px, #C48B26 18px, #C48B26 36px);
      box-shadow: inset 0 4px 10px rgba(0,0,0,.25);
      overflow:hidden;
    }
    .sort-belt-marker { position:absolute; top:50%; transform:translate(-50%,-50%); font-size:26px; filter: drop-shadow(0 2px 2px rgba(0,0,0,.3)); }
    .sort-belt-warehouse { position:absolute; right:6px; top:50%; transform:translateY(-50%); font-size:38px; }
    .sort-belt-robot { position:absolute; top:50%; left:0%; transform:translate(-50%,-50%); font-size:38px; transition:left .7s ease; z-index:3; }
    .sort-unload-zone { display:flex; flex-direction:column; align-items:center; gap:8px; min-height:120px; justify-content:center; }
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
    .sort-progress-label { font-size:13px; color:var(--ink-500); }
  `;
  document.head.appendChild(style);
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  const N = randInt(3, 5);
  const quizAt = randInt(2, N - 1); // 跑完第几个震动点后暂停问答（2..N-1，保证跑完前+跑完后都还有段落）
  let stepperVal = 1;
  let confirmed = false;
  let hits = 0;
  let misses = 0;
  let quizCorrect = null;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-sort sort-setup-card" id="sort-setup-card">
      <p class="title-sm" style="margin:0;">🔁 数一数传送带上有几个 ⚡ 震动点，设定 Repeat 次数！</p>
      <div class="sort-belt-wrap" id="sort-belt"></div>
      <div class="sort-stepper">
        <button class="brick-btn brick-btn--gray brick-btn--icon" id="sort-minus-btn" aria-label="减少">−</button>
        <span class="val" id="sort-stepper-val">1</span>
        <button class="brick-btn brick-btn--gray brick-btn--icon" id="sort-plus-btn" aria-label="增加">＋</button>
      </div>
      <p class="text-muted" style="margin:0;">🔁 Repeat <strong id="sort-repeat-label">1</strong> 次</p>
      <button class="brick-btn brick-btn--purple brick-btn--lg" id="sort-confirm-btn">确认次数</button>
    </div>

    <div class="brick-card brick-card--cat-sort" id="sort-run-card" style="display:none; margin-top:16px;">
      <div class="flex-between">
        <p class="title-sm" style="margin:0;">🚚 机器人出发咯，每到 ⚡ 点赶紧卸货！</p>
        <button class="brick-btn brick-btn--green" id="sort-start-btn">▶ 出发</button>
      </div>
      <div class="sort-belt-wrap" id="sort-belt-run" style="margin-top:12px;"></div>
      <div class="sort-unload-zone">
        <button class="brick-btn brick-btn--red sort-unload-btn" id="sort-unload-btn" style="display:none;">📦 卸货！</button>
        <div class="sort-countdown-track" id="sort-countdown-track" style="display:none;"><div class="sort-countdown-fill" id="sort-countdown-fill"></div></div>
        <div class="sort-result-tag" id="sort-result-tag"></div>
      </div>
      <p class="sort-progress-label" id="sort-progress-label"></p>
    </div>
  `;

  const setupCard = container.querySelector('#sort-setup-card');
  const beltSetup = container.querySelector('#sort-belt');
  const stepperVal_el = container.querySelector('#sort-stepper-val');
  const repeatLabel = container.querySelector('#sort-repeat-label');
  const minusBtn = container.querySelector('#sort-minus-btn');
  const plusBtn = container.querySelector('#sort-plus-btn');
  const confirmBtn = container.querySelector('#sort-confirm-btn');

  const runCard = container.querySelector('#sort-run-card');
  const beltRun = container.querySelector('#sort-belt-run');
  const startBtn = container.querySelector('#sort-start-btn');
  const unloadBtn = container.querySelector('#sort-unload-btn');
  const countdownTrack = container.querySelector('#sort-countdown-track');
  const countdownFill = container.querySelector('#sort-countdown-fill');
  const resultTag = container.querySelector('#sort-result-tag');
  const progressLabel = container.querySelector('#sort-progress-label');

  // 传送带上震动点的位置（百分比，避开两端）
  const markerPositions = Array.from({ length: N }, (_, i) => ((i + 1) / (N + 1)) * 100);

  function buildBeltHTML(withRobot) {
    return `
      ${markerPositions.map((p) => `<div class="sort-belt-marker" style="left:${p}%;">⚡</div>`).join('')}
      <div class="sort-belt-warehouse">🏭</div>
      ${withRobot ? '<div class="sort-belt-robot" id="__ROBOT_ID__" style="left:0%;">🤖</div>' : ''}
    `;
  }

  beltSetup.innerHTML = buildBeltHTML(true).replace('__ROBOT_ID__', 'sort-robot-setup');
  beltRun.innerHTML = buildBeltHTML(true).replace('__ROBOT_ID__', 'sort-robot-run');
  const robotRunEl = container.querySelector('#sort-robot-run');

  function updateStepperLabel() {
    stepperVal_el.textContent = String(stepperVal);
    repeatLabel.textContent = String(stepperVal);
  }

  minusBtn.addEventListener('click', () => {
    api.sfx.click();
    stepperVal = Math.max(1, stepperVal - 1);
    updateStepperLabel();
  });
  plusBtn.addEventListener('click', () => {
    api.sfx.click();
    stepperVal = Math.min(8, stepperVal + 1);
    updateStepperLabel();
  });

  confirmBtn.addEventListener('click', () => {
    if (confirmed) return;
    if (stepperVal !== N) {
      api.fail('wrong-repeat-count');
      api.mascot.say('再数一数震动点，调整一下次数吧！', 'oops');
      return;
    }
    confirmed = true;
    api.sfx.success();
    minusBtn.disabled = true;
    plusBtn.disabled = true;
    confirmBtn.disabled = true;
    api.mascot.say('设对啦！准备出发！', 'cheer');
    setupCard.style.opacity = '.55';
    runCard.style.display = 'block';
  });

  startBtn.addEventListener('click', () => {
    api.sfx.click();
    startBtn.disabled = true;
    runConveyor();
  });

  async function runConveyor() {
    progressLabel.textContent = '';
    for (let i = 0; i < N; i++) {
      if (cancelled) return;
      progressLabel.textContent = `传送带运行中…`;
      robotRunEl.style.left = `${markerPositions[i]}%`;
      await wait(750, timers);
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
      await wait(280, timers);
      if (cancelled) return;

      const doneCount = i + 1; // 已经跑完的震动点数量（1-based）
      if (doneCount === quizAt) {
        progressLabel.textContent = '传送带暂停一下…';
        api.mascot.say('先别急着走，想一想！', 'think');
        quizCorrect = await showQuiz(N - doneCount);
        if (cancelled) return;
      }
    }

    if (cancelled) return;
    robotRunEl.style.left = '97%';
    progressLabel.textContent = '到达仓库！';
    api.mascot.say('到仓库啦！', 'happy');
    await wait(800, timers);
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
      // 强制回流后再加过渡类，触发从 100% 收缩到 0% 的动画
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
        resultTag.textContent = '卸货成功！📦';
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

  /** 构造四选一选项：正确答案 + N-k±1、N 三个干扰项，去重后不足 4 个再补别的非负数兜底。 */
  function buildQuizOptions(correct, total) {
    const pool = new Set([correct]);
    [correct + 1, correct - 1, total].forEach((v) => {
      if (v >= 0) pool.add(v);
    });
    let filler = 0;
    while (pool.size < 4 && filler <= total + 5) {
      if (filler !== correct) pool.add(filler);
      filler += 1;
    }
    return shuffle([...pool]);
  }

  /** 弹出"还剩几次卸货？"问答，返回 Promise<boolean>（答对与否）。correctAnswer = N - 已完成次数。 */
  function showQuiz(correctAnswer) {
    return new Promise((resolve) => {
      const options = buildQuizOptions(correctAnswer, N);
      const modalRoot = document.createElement('div');
      modalRoot.className = 'modal-overlay';
      modalRoot.innerHTML = `
        <div class="modal-card">
          <h2 class="title-lg" style="margin-bottom:6px;">🤔 小测验</h2>
          <p class="text-muted">传送带先暂停一下——现在还剩几次卸货？</p>
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
  api.mascot.say('先数一数传送带上的震动点，设好 Repeat 次数吧！', 'idle', 4200);

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
