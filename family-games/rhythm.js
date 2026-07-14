/* family-games/rhythm.js
 * 节奏程序（节奏天国概念）—— 真人互动分类第 3 关。
 * iPad 显示一个 4 步动作循环（如 拍手-拍腿-拍手-跺脚），跟着节拍执行；每完成一轮
 * 循环速度 +10%，连续坚持 4 轮就过关。教学点：loop（循环结构）+ 节奏工作记忆。
 * 协议：export default { id, title, icon, howto, init(container, api), destroy() }。
 */

const LOOP_KEYS = ['clap', 'patlegs', 'touchear', 'raisehand', 'freeze'];
const LOOP_LABEL = {
  clap: '拍手', patlegs: '拍腿', touchear: '摸耳', raisehand: '举手', freeze: '双手停住',
};

const START_BPM = 76;
const SPEED_UP = 1.1;
const TOTAL_LOOPS = 4;
const LOOP_LEN = 4;

function buildLoop(rand) {
  // AB 交替型循环（更容易跟拍），偶尔全随机增加变化——保证每次重开都不一样。
  if (rand.int(0, 1) === 0) {
    const a = rand.pick(LOOP_KEYS);
    let b = rand.pick(LOOP_KEYS);
    while (b === a) b = rand.pick(LOOP_KEYS);
    return [a, b, a, b];
  }
  const picks = rand.shuffle(LOOP_KEYS).slice(0, LOOP_LEN);
  return picks;
}

function render(container, api) {
  let cancelled = false;
  const { Art, rand, sfx, mascot, countdownRing, beat, completeRound, emitFeedback, glyph } = api;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-race family-brief-card">
      <p class="title-sm" style="margin:0;">跟着节拍循环做这 4 个动作，每跑完一轮会变快，坚持 4 轮就过关。</p>
    </div>

    <div class="brick-card brick-card--cat-race" id="rh-sheet">
      <p class="title-sm" style="margin:0 0 8px;">本轮动作循环 · 从左到右循环播放</p>
      <div class="family-card-row" id="rh-sheet-row"></div>
    </div>

    <div class="family-stage" id="rh-stage" style="min-height:0;"></div>

    <div class="flex-center" id="rh-beatdot"><div class="family-beat-dot"></div></div>

    <div class="brick-card brick-card--cat-race text-center" id="rh-progress-card">
      <span class="title-sm">第 <span id="rh-loop-num">0</span> / ${TOTAL_LOOPS} 轮 · 当前速度 <span id="rh-bpm-num">${START_BPM}</span> BPM</span>
    </div>

    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap;">
      <button class="brick-btn brick-btn--blue brick-btn--lg" id="rh-start-btn">开始跟拍</button>
      <button class="brick-btn brick-btn--gray brick-btn--lg" id="rh-stop-btn" style="display:none;">停止</button>
      <button class="brick-btn brick-btn--purple" id="rh-shuffle-btn">更换动作</button>
    </div>
    <div class="family-judge-panel" id="rh-judge-row" style="display:none;">
      <strong>主持人判定：四轮都踩在节拍上了吗？</strong>
      <div class="flex-row gap-3" style="justify-content:center;flex-wrap:wrap;">
        <button class="brick-btn brick-btn--green brick-btn--lg" id="rh-pass-btn">全部跟上</button>
        <button class="brick-btn brick-btn--red brick-btn--lg" id="rh-fail-btn">有人掉拍</button>
      </div>
    </div>
  `;

  const sheetRow = container.querySelector('#rh-sheet-row');
  const stage = container.querySelector('#rh-stage');
  const beatDot = container.querySelector('.family-beat-dot');
  const loopNumEl = container.querySelector('#rh-loop-num');
  const bpmNumEl = container.querySelector('#rh-bpm-num');
  const startBtn = container.querySelector('#rh-start-btn');
  const stopBtn = container.querySelector('#rh-stop-btn');
  const shuffleBtn = container.querySelector('#rh-shuffle-btn');
  const judgeRow = container.querySelector('#rh-judge-row');
  const passBtn = container.querySelector('#rh-pass-btn');
  const failBtn = container.querySelector('#rh-fail-btn');

  let loopKeys = [];
  let beatHandle = null;
  let loopsDone = 0;
  let running = false;
  let completed = false;

  function renderSheet() {
    sheetRow.innerHTML = loopKeys.map((k, i) => `
      <div class="family-card-item" data-i="${i}">
        <div style="width:64px;height:64px;">${Art.actionIcons[k]()}</div>
        <div class="family-card-sub">${LOOP_LABEL[k]}</div>
      </div>
    `).join('');
  }

  function highlightSheet(beatCount) {
    const i = (beatCount - 1) % loopKeys.length;
    Array.from(sheetRow.children).forEach((el, idx) => {
      el.style.transform = idx === i ? 'scale(1.22)' : 'scale(1)';
      el.style.transition = 'transform .15s ease';
    });
  }

  function renderStageIdle() {
    stage.innerHTML = `
      <div class="family-card-icon">${glyph('ready')}</div>
      <div class="family-card-text">准备好了吗？</div>
      <div class="family-card-sub">点「开始跟拍」，3 秒后节拍器启动</div>
    `;
  }

  function renderStageAction(key) {
    stage.innerHTML = '';
    const view = document.createElement('div');
    view.className = 'rh-action-view';
    view.innerHTML = `
      <div class="family-card-icon anim-pop-in">${Art.actionIcons[key]()}</div>
      <div class="family-card-text">${LOOP_LABEL[key]}</div>
    `;
    stage.appendChild(view);
  }

  function resetProgress() {
    loopsDone = 0;
    loopNumEl.textContent = '0';
    bpmNumEl.textContent = String(START_BPM);
  }

  function newRound() {
    if (beatHandle) beatHandle.stop();
    running = false;
    completed = false;
    loopKeys = buildLoop(rand);
    renderSheet();
    resetProgress();
    renderStageIdle();
    startBtn.style.display = '';
    startBtn.textContent = '开始跟拍';
    stopBtn.style.display = 'none';
    judgeRow.style.display = 'none';
  }

  function requestJudgement() {
    running = false;
    if (beatHandle) beatHandle.stop();
    stage.innerHTML = `
      <div class="family-card-icon">${glyph('target')}</div>
      <div class="family-card-text">判定时间！</div>
      <div class="family-card-sub">只有四轮都跟上节拍，才算真正过关</div>
    `;
    stopBtn.style.display = 'none';
    judgeRow.style.display = 'grid';
    emitFeedback('round', { label: '四轮结束 · 等待主持人判定' });
  }

  function startRun() {
    startBtn.style.display = 'none';
    stopBtn.style.display = '';
    let bpm = START_BPM;
    bpmNumEl.textContent = String(Math.round(bpm));
    const readyRing = document.createElement('div');
    stage.innerHTML = '';
    stage.appendChild(readyRing);
    mascot.say('准备……', 'think', 0);
    const ring = countdownRing(readyRing, 3, {
      onDone() {
        ring.el.remove();
        mascot.hideBubble();
        running = true;
        beatHandle = beat({
          bpm,
          dotEl: beatDot,
          onBeat(count) {
            if (!running) return;
            const i = (count - 1) % loopKeys.length;
            highlightSheet(count);
            renderStageAction(loopKeys[i]);
            if (count % loopKeys.length === 0) {
              loopsDone += 1;
              loopNumEl.textContent = String(loopsDone);
              if (loopsDone >= TOTAL_LOOPS) {
                requestJudgement();
                return;
              }
              bpm = bpm * SPEED_UP;
              bpmNumEl.textContent = String(Math.round(bpm));
              beatHandle.setBpm(bpm);
            }
          },
        });
        beatHandle.start();
      },
    });
    ring.start();
  }

  startBtn.addEventListener('click', () => {
    sfx.click();
    if (completed) newRound();
    startRun();
  });
  stopBtn.addEventListener('click', () => {
    sfx.click();
    running = false;
    if (beatHandle) beatHandle.stop();
    newRound();
  });
  shuffleBtn.addEventListener('click', () => {
    sfx.click();
    newRound();
  });

  passBtn.addEventListener('click', () => {
    judgeRow.style.display = 'none';
    sfx.success();
    stage.innerHTML = `
      <div class="family-card-icon">${glyph('trophy')}</div>
      <div class="family-card-text">节奏通关！</div>
      <div class="family-card-sub">四轮加速全部命中</div>
    `;
    mascot.say('判定通过，四轮节拍都完成了！', 'cheer');
    completed = true;
    startBtn.textContent = '再玩一次';
    startBtn.style.display = '';
    completeRound();
  });
  failBtn.addEventListener('click', () => {
    sfx.fail();
    emitFeedback('miss', { label: '掉拍 · 本轮不打卡' });
    mascot.say('没关系，换慢一点再来一轮！', 'oops');
    newRound();
  });

  newRound();

  return {
    destroy() {
      cancelled = true;
      running = false;
      if (beatHandle) beatHandle.stop();
    },
  };
}

let activeHandle = null;

export default {
  id: 'rhythm',
  title: '节奏程序',
  icon: '🥁',
  howto: '坐着跟节拍做拍手、拍腿、摸耳和举手的循环，完成 4 轮后由主持人判定。',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
