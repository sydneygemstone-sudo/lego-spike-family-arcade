/* family-games/livinghunt.js
 * 客厅寻宝（真人版 hunt）—— 真人互动分类第 2 关。
 * iPad 生成一串指令（前进 N 步 / 左转 / 右转 / 蹲下捡起 / 举手欢呼），孩子当"机器人"
 * 在客厅里执行，家长当"编译器"逐条核对。进阶「预言模式」：先看完整指令，口头预言
 * 终点位置再执行验证——这就是工作记忆预演，编程规划能力的核心训练。
 * 协议：export default { id, title, icon, howto, init(container, api), destroy() }。
 */

const STEP_BUILDERS = [
  () => ({ kind: 'forward', n: 1 }),
  () => ({ kind: 'forward', n: 2 }),
  () => ({ kind: 'forward', n: 3 }),
  () => ({ kind: 'left' }),
  () => ({ kind: 'right' }),
  () => ({ kind: 'squat' }),
];

function stepGlyph(step) {
  switch (step.kind) {
    case 'forward': return '↑';
    case 'left': return '↺';
    case 'right': return '↻';
    case 'squat': return '⬇';
    default: return '•';
  }
}
function stepLabel(step) {
  switch (step.kind) {
    case 'forward': return `前进 ${step.n} 步`;
    case 'left': return '向左转';
    case 'right': return '向右转';
    case 'squat': return '蹲下捡起东西';
    default: return '';
  }
}
function stepIconHTML(Art, step, size = 'lg') {
  if (step.kind === 'squat') return Art.actionIcons.squat();
  const fontSize = size === 'sm' ? 'clamp(28px,7vw,40px)' : 'clamp(60px,14vw,140px)';
  return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:${fontSize};font-weight:900;color:var(--lego-cyan);line-height:1;">${stepGlyph(step)}</div>`;
}

function buildSequence(rand) {
  const len = rand.int(5, 8);
  const steps = [];
  for (let i = 0; i < len; i++) {
    steps.push(rand.pick(STEP_BUILDERS)());
  }
  return steps;
}

function render(container, api) {
  let cancelled = false;
  const { Art, rand, sfx, mascot, countdownRing, roleSwap } = api;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-hunt">
      <p class="title-sm" style="margin:0;">🗺️ 家长核对每一步做得对不对；「预言模式」要先想再做！</p>
      <div class="flex-row gap-3" style="margin-top:8px;">
        <button class="brick-btn brick-btn--green brick-btn--sm" id="lh-mode-normal">📋 普通模式</button>
        <button class="brick-btn brick-btn--gray brick-btn--sm" id="lh-mode-predict">🔮 预言模式</button>
      </div>
    </div>

    <div class="brick-card brick-card--cat-hunt" id="lh-overview-card" style="display:none;">
      <p class="title-sm" style="margin:0 0 8px;">🔮 先看完整指令，全家一起说出终点预言！</p>
      <div class="family-card-row" id="lh-overview-row"></div>
      <div class="flex-center" id="lh-predict-timer" style="margin-top:12px;"></div>
      <div class="flex-center" style="margin-top:12px;">
        <button class="brick-btn brick-btn--orange brick-btn--lg" id="lh-predict-start" disabled>🚀 说完预言，开始验证</button>
      </div>
    </div>

    <div class="family-stage" id="lh-stage" style="display:none;"></div>

    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap;" id="lh-nav-row">
      <button class="brick-btn brick-btn--blue brick-btn--lg" id="lh-next-btn">下一步 →</button>
    </div>

    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap; display:none;" id="lh-check-row">
      <button class="brick-btn brick-btn--green brick-btn--lg" id="lh-guess-yes">😄 猜对啦</button>
      <button class="brick-btn brick-btn--gray brick-btn--lg" id="lh-guess-no">🤔 猜偏了</button>
    </div>

    <div class="flex-row gap-3" style="justify-content:center;">
      <button class="brick-btn brick-btn--purple" id="lh-shuffle-btn">🎲 换一组指令</button>
    </div>
    <div class="brick-card brick-card--cat-hunt" id="lh-role-card"></div>
  `;

  const modeNormalBtn = container.querySelector('#lh-mode-normal');
  const modePredictBtn = container.querySelector('#lh-mode-predict');
  const overviewCard = container.querySelector('#lh-overview-card');
  const overviewRow = container.querySelector('#lh-overview-row');
  const predictTimerBox = container.querySelector('#lh-predict-timer');
  const predictStartBtn = container.querySelector('#lh-predict-start');
  const stage = container.querySelector('#lh-stage');
  const navRow = container.querySelector('#lh-nav-row');
  const nextBtn = container.querySelector('#lh-next-btn');
  const checkRow = container.querySelector('#lh-check-row');
  const guessYesBtn = container.querySelector('#lh-guess-yes');
  const guessNoBtn = container.querySelector('#lh-guess-no');
  const shuffleBtn = container.querySelector('#lh-shuffle-btn');
  const roleCard = container.querySelector('#lh-role-card');

  roleSwap(roleCard, { roles: ['🤖 我是机器人', '🧑‍💻 我是编译器'] });

  let sequence = [];
  let idx = 0;
  let predictMode = false;

  function setMode(predict) {
    predictMode = predict;
    modeNormalBtn.classList.toggle('brick-btn--green', !predict);
    modeNormalBtn.classList.toggle('brick-btn--gray', predict);
    modePredictBtn.classList.toggle('brick-btn--orange', predict);
    modePredictBtn.classList.toggle('brick-btn--gray', !predict);
    newRound();
  }

  function renderStageStep() {
    const step = sequence[idx];
    if (!step) {
      stage.innerHTML = `
        <div class="family-card-icon">🏁</div>
        <div class="family-card-text">到达啦！</div>
        <div class="family-card-sub">全部 ${sequence.length} 步都做完了</div>
      `;
      navRow.style.display = 'none';
      checkRow.style.display = predictMode ? 'flex' : 'none';
      if (!predictMode) {
        mascot.say('编译器核对完了吗？全对就打卡吧！', 'cheer');
      }
      return;
    }
    stage.innerHTML = `
      <div class="family-card-sub">第 ${idx + 1} / ${sequence.length} 步</div>
      <div class="family-card-icon">${stepIconHTML(Art, step)}</div>
      <div class="family-card-text">${stepLabel(step)}</div>
    `;
    navRow.style.display = 'flex';
    checkRow.style.display = 'none';
  }

  function newRound() {
    sequence = buildSequence(rand);
    idx = 0;
    stage.style.display = 'none';
    navRow.style.display = 'none';
    checkRow.style.display = 'none';
    if (predictMode) {
      overviewCard.style.display = '';
      overviewRow.innerHTML = sequence.map((s, i) => `
        <div class="family-card-item">
          <div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:var(--paper-100);border-radius:12px;">${stepIconHTML(Art, s, 'sm')}</div>
          <div class="family-card-sub" style="font-size:12px;">${i + 1}.${stepLabel(s)}</div>
        </div>
      `).join('');
      predictStartBtn.disabled = true;
      predictTimerBox.innerHTML = '';
      const ring = countdownRing(predictTimerBox, 6, {
        onDone() { predictStartBtn.disabled = false; mascot.say('时间到！说出你的预言，开始验证吧！', 'idle'); },
      });
      mascot.say('全家一起看，想 6 秒，猜猜最后会停在哪里！', 'think', 3800);
      ring.start();
    } else {
      overviewCard.style.display = 'none';
      stage.style.display = 'flex';
      renderStageStep();
      mascot.say('机器人准备好，编译器盯紧每一步！', 'idle');
    }
  }

  predictStartBtn.addEventListener('click', () => {
    if (predictStartBtn.disabled) return;
    sfx.click();
    overviewCard.style.display = 'none';
    stage.style.display = 'flex';
    idx = 0;
    renderStageStep();
  });

  nextBtn.addEventListener('click', () => {
    sfx.snap();
    idx += 1;
    renderStageStep();
  });

  guessYesBtn.addEventListener('click', () => {
    sfx.success();
    mascot.say('预言成功！工作记忆满分！', 'cheer');
    checkRow.style.display = 'none';
  });
  guessNoBtn.addEventListener('click', () => {
    sfx.fail();
    mascot.say('猜偏了也没关系，多玩几次就会越来越准！', 'oops');
    checkRow.style.display = 'none';
  });

  shuffleBtn.addEventListener('click', () => {
    sfx.click();
    newRound();
  });

  modeNormalBtn.addEventListener('click', () => { if (predictMode) { sfx.click(); setMode(false); } });
  modePredictBtn.addEventListener('click', () => { if (!predictMode) { sfx.click(); setMode(true); } });

  setMode(false);

  return {
    destroy() { cancelled = true; },
  };
}

let activeHandle = null;

export default {
  id: 'livinghunt',
  title: '客厅寻宝',
  icon: '🧭',
  howto: '孩子当机器人按指令在客厅走，家长当编译器核对；试试「预言模式」先猜终点再验证！',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
