/* family-games/ifthen.js
 * 如果就（条件反射）—— 真人互动分类第 5 关。
 * 先约定规则：红屏→双手停住 / 绿屏→举手 / 铃声→拍腿。iPad 随机全屏亮色或播提示音，
 * 间隔越来越短，一共触发 10 次；没对上可以看一遍规则再重新开始。
 * 教学点：if-then（条件分支）与等待启动信号。
 * 协议：export default { id, title, icon, howto, init(container, api), destroy() }。
 */

const TOTAL_ROUNDS = 10;
const START_INTERVAL = 2800;
const MIN_INTERVAL = 1200;
const INTERVAL_STEP = 160;
const FLASH_MS = 900;

const RULES = [
  { key: 'red', color: '#E8443F', label: '红屏', action: 'freeze', actionLabel: '双手停住' },
  { key: 'green', color: '#57B84E', label: '绿屏', action: 'raisehand', actionLabel: '举起双手' },
  { key: 'bell', color: '#3D7BD9', label: '铃声', action: 'patlegs', actionLabel: '拍两下腿' },
];

// 待机屏原来只放一个默认字号的 🚦 emoji，在一整块大白卡里显得又小又空。
// 换成一个真的"三灯"插画（用设计系统自带的红/黄/绿色块画），更醒目也更贴题。
function trafficLightHTML() {
  const dot = (color) => `<div style="width:40px;height:40px;border-radius:50%;background:${color};box-shadow:inset 0 -6px 10px rgba(0,0,0,.28), 0 2px 3px rgba(0,0,0,.2);"></div>`;
  return `
    <div style="display:inline-flex;flex-direction:column;align-items:center;gap:12px;padding:16px 20px;background:var(--ink-900);border-radius:20px;box-shadow:0 6px 0 rgba(0,0,0,.25);">
      ${dot('var(--lego-red)')}
      ${dot('var(--lego-yellow)')}
      ${dot('var(--lego-green)')}
    </div>
  `;
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  const { Art, rand, sfx, mascot, countdownRing, completeRound, emitFeedback, glyph } = api;

  function wait(ms) { return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); }); }

  container.innerHTML = `
    <div class="brick-card brick-card--cat-claw">
      <p class="title-sm" style="margin:0 0 8px;">先约定规则 · 看好了再开始</p>
      <div class="flex-row gap-4" style="flex-wrap:wrap; justify-content:center;">
        ${RULES.map((r) => `
          <div class="family-card-item">
            <div style="width:64px;height:64px;">${Art.actionIcons[r.action]()}</div>
            <div class="title-sm" style="margin:0;">${r.label} → ${r.actionLabel}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="family-stage" id="it-stage">
      <div class="family-card-icon" style="display:flex;align-items:center;justify-content:center;">${trafficLightHTML()}</div>
      <div class="family-card-text">准备好了吗？</div>
      <div class="family-card-sub">点「开始挑战」，一共要闯 ${TOTAL_ROUNDS} 次！</div>
    </div>

    <div class="brick-card brick-card--cat-claw text-center">
      <span class="title-sm">进度：<span id="it-progress">0</span> / ${TOTAL_ROUNDS}</span>
    </div>

    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap;">
      <button class="brick-btn brick-btn--blue brick-btn--lg" id="it-start-btn">开始挑战</button>
    </div>

    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap; display:none;" id="it-judge-row">
      <button class="brick-btn brick-btn--green brick-btn--lg" id="it-ok-btn">做对了</button>
      <button class="brick-btn brick-btn--red brick-btn--lg" id="it-miss-btn">没对上 · 重新开始</button>
    </div>
  `;

  const stage = container.querySelector('#it-stage');
  const progressEl = container.querySelector('#it-progress');
  const startBtn = container.querySelector('#it-start-btn');
  const judgeRow = container.querySelector('#it-judge-row');
  const okBtn = container.querySelector('#it-ok-btn');
  const missBtn = container.querySelector('#it-miss-btn');

  const overlay = document.createElement('div');
  overlay.className = 'family-flash-overlay';
  document.body.appendChild(overlay);

  let running = false;
  let roundIndex = 0;
  let currentRule = null;

  function flash(rule) {
    overlay.style.background = rule.color;
    overlay.innerHTML = `<div class="fo-label">${rule.label}</div>`;
    overlay.classList.add('is-on');
    if (rule.key === 'bell') sfx.star(); else sfx.click();
    emitFeedback('action', { label: `${rule.label} → ${rule.actionLabel}` });
  }
  function unflash() {
    overlay.classList.remove('is-on');
  }

  function updateStageWaiting() {
    stage.innerHTML = `
      <div class="family-card-icon">${glyph('hidden')}</div>
      <div class="family-card-text">等待触发……</div>
      <div class="family-card-sub">盯紧屏幕/竖起耳朵，第 ${roundIndex + 1} / ${TOTAL_ROUNDS} 次</div>
    `;
  }

  async function runLoop() {
    running = true;
    startBtn.style.display = 'none';
    judgeRow.style.display = 'none';
    while (roundIndex < TOTAL_ROUNDS) {
      if (cancelled) return;
      updateStageWaiting();
      const intervalMs = Math.max(MIN_INTERVAL, START_INTERVAL - roundIndex * INTERVAL_STEP);
      await wait(intervalMs);
      if (cancelled) return;
      currentRule = rand.pick(RULES);
      flash(currentRule);
      stage.innerHTML = `
        <div class="family-card-icon">${Art.actionIcons[currentRule.action]()}</div>
        <div class="family-card-text">${currentRule.actionLabel}！</div>
      `;
      await wait(FLASH_MS);
      if (cancelled) return;
      unflash();
      judgeRow.style.display = 'flex';
      return; // 等待家长评判后再继续下一轮（见 okBtn/missBtn）
    }
    finishSuccess();
  }

  function finishSuccess() {
    running = false;
    stage.innerHTML = `
      <div class="family-card-icon">${glyph('trophy')}</div>
      <div class="family-card-text">挑战成功！</div>
      <div class="family-card-sub">连续通过了 ${TOTAL_ROUNDS} 次反应考验！</div>
    `;
    sfx.success();
    mascot.say('十次规则都完成了，配合得很认真！', 'cheer');
    startBtn.textContent = '再挑战一次';
    startBtn.style.display = '';
    completeRound();
  }

  function resetAll(message, emotion) {
    roundIndex = 0;
    progressEl.textContent = '0';
    running = false;
    judgeRow.style.display = 'none';
    stage.innerHTML = `
      <div class="family-card-icon" style="display:flex;align-items:center;justify-content:center;">${trafficLightHTML()}</div>
      <div class="family-card-text">${message}</div>
      <div class="family-card-sub">点「开始挑战」，一共要闯 ${TOTAL_ROUNDS} 次！</div>
    `;
    startBtn.textContent = '开始挑战';
    startBtn.style.display = '';
    if (emotion) mascot.say(message, emotion);
  }

  okBtn.addEventListener('click', () => {
    if (!running) return;
    sfx.success();
    roundIndex += 1;
    progressEl.textContent = String(roundIndex);
    judgeRow.style.display = 'none';
    if (roundIndex >= TOTAL_ROUNDS) {
      finishSuccess();
    } else {
      mascot.say('反应真快！', 'happy', 1200);
      runLoop();
    }
  });
  missBtn.addEventListener('click', () => {
    sfx.fail();
    emitFeedback('miss', { label: `第 ${roundIndex + 1} 次没对上 · 重新开始` });
    resetAll('这次没对上，先看一遍规则，再重新开始。', 'oops');
  });

  startBtn.addEventListener('click', () => {
    sfx.click();
    roundIndex = 0;
    progressEl.textContent = '0';
    stage.innerHTML = '';
    const ring = countdownRing(stage, 3, {
      onDone() {
        runLoop();
      },
    });
    ring.start();
  });

  return {
    destroy() {
      cancelled = true;
      running = false;
      timers.forEach((t) => clearTimeout(t));
      overlay.remove();
    },
  };
}

let activeHandle = null;

export default {
  id: 'ifthen',
  title: '如果就',
  icon: '🚦',
  howto: '先约定：红屏双手停住/绿屏举手/铃声拍腿；坐着也能完成，没对上就看规则再重来。',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
