/* family-games/humanbelt.js
 * 人体传送带（真人版 sort）—— 真人互动分类第 6 关。
 * 孩子背着 N 块"积木"（真实数量家长自己准备）沿地垫走，iPad 每隔不定节拍"叮"一声
 * 就代表放下一块，全程心里默数；传送带随机停止后，iPad 问"包里还剩几块？"，
 * 输入数字对照。教学点：循环计数 + 工作记忆刷新（每次"叮"都要更新脑内计数器）。
 * 协议：export default { id, title, icon, howto, init(container, api), destroy() }。
 */

// 待机屏原来只有一个默认字号的 🎒，大白卡里显得空荡荡；这里把图标放大，
// 再垫一条黄黑警示纹"传送带"当背景装饰，别让白板空着。
const BELT_PATH_HTML = `
  <div style="width:100%;max-width:280px;height:16px;margin:6px auto 0;border-radius:8px;
    background:repeating-linear-gradient(45deg, var(--lego-yellow) 0 12px, var(--ink-900) 12px 24px);
    box-shadow:inset 0 2px 4px rgba(0,0,0,.25);"></div>
`;
function bigIconStyle() {
  // .family-card-icon 默认按 clamp(120px,26vw,220px) 撑盒子——只放大字号不够，
  // 盒子本身也要一起缩到跟字号匹配，否则字大了盒子还是那么大，四周照样空一圈。
  return 'width:clamp(64px,14vw,140px);height:clamp(64px,14vw,140px);display:flex;align-items:center;justify-content:center;font-size:clamp(48px,11vw,110px);line-height:1;';
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  const { rand, sfx, mascot, countdownRing, completeRound } = api;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-sort">
      <p class="title-sm" style="margin:0 0 8px;">📦 背包里先放几块积木？（家长实际准备好这些积木哦）</p>
      <div class="flex-row gap-3" style="justify-content:center; align-items:center;">
        <button class="brick-btn brick-btn--gray brick-btn--icon" id="hb-minus">−</button>
        <div class="family-card-text" id="hb-total-num" style="min-width:80px;">8</div>
        <button class="brick-btn brick-btn--gray brick-btn--icon" id="hb-plus">+</button>
      </div>
    </div>

    <div class="family-stage" id="hb-stage">
      <div class="family-card-icon" style="${bigIconStyle()}">🎒</div>
      <div class="family-card-text">准备好了吗？</div>
      <div class="family-card-sub">点「开始传送」，背好积木沿地垫走，听到"叮"就放下一块</div>
      ${BELT_PATH_HTML}
    </div>

    <div class="flex-center" id="hb-beatdot"><div class="family-beat-dot"></div></div>

    <div class="flex-row gap-3" style="justify-content:center;" id="hb-start-row">
      <button class="brick-btn brick-btn--blue brick-btn--lg" id="hb-start-btn">▶ 开始传送</button>
    </div>

    <div class="brick-card brick-card--cat-sort" id="hb-answer-card" style="display:none;">
      <p class="title-sm" style="margin:0 0 8px;">🤔 传送带停了！包里还剩几块？</p>
      <div class="family-card-row" id="hb-answer-row"></div>
      <div class="flex-row gap-3" style="justify-content:center; margin-top:12px;">
        <button class="brick-btn brick-btn--green brick-btn--lg" id="hb-submit-btn" disabled>✅ 确认答案</button>
      </div>
      <p class="text-center" id="hb-answer-result" style="min-height:1.4em; font-weight:800;"></p>
    </div>
  `;

  const minusBtn = container.querySelector('#hb-minus');
  const plusBtn = container.querySelector('#hb-plus');
  const totalNumEl = container.querySelector('#hb-total-num');
  const stage = container.querySelector('#hb-stage');
  const beatDot = container.querySelector('.family-beat-dot');
  const startRow = container.querySelector('#hb-start-row');
  const startBtn = container.querySelector('#hb-start-btn');
  const answerCard = container.querySelector('#hb-answer-card');
  const answerRow = container.querySelector('#hb-answer-row');
  const submitBtn = container.querySelector('#hb-submit-btn');
  const answerResult = container.querySelector('#hb-answer-result');

  function wait(ms) { return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); }); }

  let total = 8;
  let dropped = 0;
  let running = false;
  let chosenAnswer = null;

  function clampTotal(n) { return Math.max(4, Math.min(14, n)); }
  function renderTotal() { totalNumEl.textContent = String(total); }

  minusBtn.addEventListener('click', () => { if (running) return; sfx.click(); total = clampTotal(total - 1); renderTotal(); });
  plusBtn.addEventListener('click', () => { if (running) return; sfx.click(); total = clampTotal(total + 1); renderTotal(); });

  function newRoundReset() {
    running = false;
    dropped = 0;
    answerCard.style.display = 'none';
    startRow.style.display = 'flex';
    startBtn.textContent = '▶ 开始传送';
    stage.innerHTML = `
      <div class="family-card-icon" style="${bigIconStyle()}">🎒</div>
      <div class="family-card-text">准备好了吗？</div>
      <div class="family-card-sub">背好 ${total} 块积木，点「开始传送」出发</div>
      ${BELT_PATH_HTML}
    `;
  }

  async function runBelt() {
    running = true;
    startRow.style.display = 'none';
    stage.innerHTML = `
      <div class="family-card-icon" style="${bigIconStyle()}">🚶</div>
      <div class="family-card-text">传送带启动……</div>
      <div class="family-card-sub">心里默数，听到"叮"就放下一块</div>
      ${BELT_PATH_HTML}
    `;
    const maxDrops = rand.int(3, Math.max(3, total - 1));
    for (let i = 0; i < maxDrops; i++) {
      if (cancelled) return;
      const gap = rand.int(700, 1700);
      await wait(gap);
      if (cancelled) return;
      dropped += 1;
      sfx.star();
      beatDot.classList.remove('family-beat-dot--pulse');
      void beatDot.offsetWidth;
      beatDot.classList.add('family-beat-dot--pulse');
    }
    if (cancelled) return;
    stopBelt();
  }

  function stopBelt() {
    running = false;
    stage.innerHTML = `
      <div class="family-card-icon" style="${bigIconStyle()}">🛑</div>
      <div class="family-card-text">传送带停了！</div>
      <div class="family-card-sub">一共背了 ${total} 块，你觉得包里还剩几块？</div>
    `;
    mascot.say('先别看包，自己心算一下再选答案！', 'think');
    answerCard.style.display = '';
    answerRow.innerHTML = '';
    chosenAnswer = null;
    submitBtn.disabled = true;
    answerResult.textContent = '';
    for (let n = 0; n <= total; n++) {
      const btn = document.createElement('button');
      btn.className = 'brick-btn brick-btn--yellow';
      btn.style.minWidth = '60px';
      btn.textContent = String(n);
      btn.dataset.n = String(n);
      btn.addEventListener('click', () => {
        sfx.click();
        Array.from(answerRow.children).forEach((c) => c.classList.remove('brick-btn--green'));
        Array.from(answerRow.children).forEach((c) => c.classList.add('brick-btn--yellow'));
        btn.classList.remove('brick-btn--yellow');
        btn.classList.add('brick-btn--green');
        chosenAnswer = n;
        submitBtn.disabled = false;
      });
      answerRow.appendChild(btn);
    }
  }

  submitBtn.addEventListener('click', () => {
    if (chosenAnswer === null) return;
    const correct = total - dropped;
    if (chosenAnswer === correct) {
      sfx.success();
      answerResult.style.color = 'var(--lego-green)';
      answerResult.textContent = `✅ 答对啦！${total} − ${dropped} = ${correct} 块`;
      mascot.say('工作记忆满分，算得又快又准！', 'cheer');
    } else {
      sfx.fail();
      answerResult.style.color = 'var(--lego-red)';
      answerResult.textContent = `❌ 差一点，正确答案是 ${total} − ${dropped} = ${correct} 块`;
      mascot.say('没关系，再试一次，专心数"叮"的次数！', 'oops');
    }
    submitBtn.disabled = true;
    completeRound();
    timers.push(setTimeout(() => { if (!cancelled) newRoundReset(); }, 2400));
  });

  startBtn.addEventListener('click', () => {
    sfx.click();
    stage.innerHTML = '';
    const ring = countdownRing(stage, 3, { onDone() { runBelt(); } });
    ring.start();
  });

  renderTotal();
  newRoundReset();

  return {
    destroy() {
      cancelled = true;
      running = false;
      timers.forEach((t) => clearTimeout(t));
    },
  };
}

let activeHandle = null;

export default {
  id: 'humanbelt',
  title: '人体传送带',
  icon: '🎒',
  howto: '孩子背 N 块积木沿地垫走，听到"叮"就放下一块，最后猜猜包里还剩几块，考验心算记忆！',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
