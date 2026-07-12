/* family-games/rhythm.js
 * 节奏程序（节奏天国概念）—— 真人互动分类第 3 关。
 * iPad 显示一个 4 步动作循环（如 拍手-拍腿-拍手-跺脚），跟着节拍执行；每完成一轮
 * 循环速度 +10%，连续坚持 4 轮就过关。教学点：loop（循环结构）+ 节奏工作记忆。
 * 协议：export default { id, title, icon, howto, init(container, api), destroy() }。
 */

const LOOP_KEYS = ['clap', 'patlegs', 'stomp', 'jump', 'spin', 'touchear', 'raisehand', 'oneleg'];
const LOOP_LABEL = {
  clap: '拍手', patlegs: '拍腿', stomp: '跺脚', jump: '跳', spin: '转圈',
  touchear: '摸耳', raisehand: '举手', oneleg: '单脚站',
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
  const { Art, rand, sfx, mascot, countdownRing, beat } = api;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-race">
      <p class="title-sm" style="margin:0;">🎵 跟着节拍循环做这 4 个动作，每跑完一轮会变快，坚持 4 轮就过关！</p>
    </div>

    <div class="brick-card brick-card--cat-race" id="rh-sheet">
      <p class="title-sm" style="margin:0 0 8px;">🎼 本轮动作循环（从左到右，循环播放）</p>
      <div class="family-card-row" id="rh-sheet-row"></div>
    </div>

    <div class="family-stage" id="rh-stage"></div>

    <div class="flex-center" id="rh-beatdot"><div class="family-beat-dot"></div></div>

    <div class="brick-card brick-card--cat-race text-center" id="rh-progress-card">
      <span class="title-sm">第 <span id="rh-loop-num">0</span> / ${TOTAL_LOOPS} 轮 · 当前速度 <span id="rh-bpm-num">${START_BPM}</span> BPM</span>
    </div>

    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap;">
      <button class="brick-btn brick-btn--blue brick-btn--lg" id="rh-start-btn">▶ 开始跟拍</button>
      <button class="brick-btn brick-btn--gray brick-btn--lg" id="rh-stop-btn" style="display:none;">⏸ 停止</button>
      <button class="brick-btn brick-btn--purple" id="rh-shuffle-btn">🎲 换一套动作</button>
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

  let loopKeys = [];
  let beatHandle = null;
  let loopsDone = 0;
  let running = false;

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
      <div class="family-card-icon">🎧</div>
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
    loopKeys = buildLoop(rand);
    renderSheet();
    resetProgress();
    renderStageIdle();
    startBtn.style.display = '';
    stopBtn.style.display = 'none';
  }

  function finishSuccess() {
    running = false;
    if (beatHandle) beatHandle.stop();
    stage.innerHTML = `
      <div class="family-card-icon">🏆</div>
      <div class="family-card-text">挑战成功！</div>
      <div class="family-card-sub">坚持了 ${TOTAL_LOOPS} 轮加速，节奏感满分！</div>
    `;
    sfx.success();
    mascot.say('太厉害了，全家节奏感满分！', 'cheer');
    startBtn.textContent = '▶ 再玩一次';
    startBtn.style.display = '';
    stopBtn.style.display = 'none';
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
                finishSuccess();
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
  howto: '跟着节拍做 4 个动作的循环，越跑越快，坚持满 4 轮就算过关，练循环+节奏工作记忆！',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
