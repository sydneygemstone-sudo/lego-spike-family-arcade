/* family-games/livinghunt.js
 * 客厅寻宝（真人版 hunt）—— 真人互动分类第 2 关。
 * 三个角色：程序员（孩子 A）· 编译器（老师/家长）· 机器人（孩子 B，两人家庭可由老师兼任）。
 * 三阶段流程——
 *   阶段0 读程序：iPad 生成 5-8 步指令序列，完整展示，程序员通读记忆。
 *   阶段1 编译走查：iPad 逐条大字显示当前指令，程序员自己走一遍，编译器对照屏幕核对
 *     每一步——✓ 进下一条 / ✗ 记一次"第 k 行编译错误"并重做该条。全部通过后大字
 *     庆祝「✅ 编译通过 BUILD PASSED」。
 *   阶段2 部署执行：程序员改用纯语言逐条指挥机器人执行（屏幕只给程序员看当前行），
 *     编译器核对机器人动作，同样 ✓/✗。全对→「🚀 部署成功」庆祝+打卡，顺带展示
 *     趣味统计"本次程序 N error 0 warning"（N = 编译阶段的错误次数）。
 * 教学点：真正的程序要先"编译验证"（compile）再"部署运行"（deploy）。
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

// 安全上限：客厅就那么大，不能连续一串"前进"把机器人开去撞墙——
// 累计前进步数封顶 + 连续前进条数封顶（后者顺带保证方向转换会穿插在序列里）。
const MAX_TOTAL_FORWARD = 10;
const MAX_CONSECUTIVE_FORWARD = 2;
const MAX_BUILD_ATTEMPTS = 40;
// 兜底序列本身也满足上面两条安全约束，极端情况下（理论上不会触发）保证一定能拿到序列。
const FALLBACK_SEQUENCE = [
  { kind: 'forward', n: 2 }, { kind: 'left' }, { kind: 'forward', n: 2 },
  { kind: 'right' }, { kind: 'squat' }, { kind: 'forward', n: 1 }, { kind: 'left' },
];

const ROLE_INTRO = {
  read: '程序员看好，记住整套程序！',
  compile: '程序员自己走，编译器核对每步',
  deploy: '程序员改用语言指挥机器人',
};

// .family-card-icon 默认按 vw 撑到 220px 见方——竖屏没问题，但横屏 1024×768 这种
// "宽但矮"的视口下，宽度驱动的尺寸会把图标撑得比可用高度还大，顶出一屏需要滚动。
// 单步展示区改成按视口高度(vh)算，横屏自动收小，竖屏依然够大。
const STEP_ICON_STYLE = 'width:clamp(90px,20vh,190px);height:clamp(90px,20vh,190px);';

const STAGE_META = [
  { label: '读程序', emoji: '📖' },
  { label: '编译', emoji: '🧑‍💻' },
  { label: '部署', emoji: '🤖' },
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

function sequenceIsSafe(steps) {
  let totalForward = 0;
  let consecutiveForward = 0;
  for (const s of steps) {
    if (s.kind === 'forward') {
      totalForward += s.n;
      consecutiveForward += 1;
      if (consecutiveForward > MAX_CONSECUTIVE_FORWARD) return false;
    } else {
      consecutiveForward = 0;
    }
  }
  return totalForward <= MAX_TOTAL_FORWARD;
}

function buildSequence(rand) {
  for (let attempt = 0; attempt < MAX_BUILD_ATTEMPTS; attempt++) {
    const len = rand.int(5, 8);
    const steps = [];
    for (let i = 0; i < len; i++) steps.push(rand.pick(STEP_BUILDERS)());
    if (sequenceIsSafe(steps)) return steps;
  }
  return FALLBACK_SEQUENCE.slice();
}

function renderStageBar(stageBarEl, currentStage) {
  stageBarEl.innerHTML = STAGE_META.map((s, i) => {
    const isActive = i === currentStage;
    const isDone = i < currentStage;
    const bg = isActive ? 'var(--lego-orange)' : (isDone ? 'var(--lego-green)' : 'var(--paper-200)');
    const color = isActive || isDone ? '#fff' : 'var(--ink-500)';
    return `
      <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:${bg};color:${color};font-weight:800;font-size:clamp(13px,2.4vw,17px);white-space:nowrap;">
        <span>${isDone ? '✅' : s.emoji}</span><span>${i + 1}. ${s.label}</span>
      </div>
    `;
  }).join('');
}

function render(container, api) {
  let cancelled = false;
  const { Art, rand, sfx, mascot, roleSwap, completeRound } = api;

  // 767px 高的横屏视口 + 8 步序列很容易把内容顶出一屏，需要滚动才能看到底部按钮/
  // 角色卡——收紧几处非必要留白（整体间距、大卡默认 34vh 地板、角色卡内边距），
  // 把"阶段内容单屏可见"的余量留出来，不影响竖屏正常显示。
  container.style.gap = '10px';

  container.innerHTML = `
    <div class="brick-card brick-card--cat-hunt" id="lh-stagebar-card" style="padding:10px var(--space-4);">
      <div class="flex-row" id="lh-stagebar" style="justify-content:center; gap:8px; flex-wrap:wrap;"></div>
    </div>

    <div class="family-stage" id="lh-stage" style="min-height:0; padding:var(--space-4);"></div>

    <div class="flex-row gap-4" style="justify-content:center; flex-wrap:wrap; display:none;" id="lh-check-row">
      <button class="brick-btn brick-btn--green" id="lh-ok-btn" style="min-height:88px; min-width:120px; font-size:26px;">✅ 对</button>
      <button class="brick-btn brick-btn--red" id="lh-no-btn" style="min-height:88px; min-width:120px; font-size:26px;">❌ 错</button>
    </div>

    <div class="flex-row gap-3" style="justify-content:center; display:none;" id="lh-transition-row">
      <button class="brick-btn brick-btn--blue" id="lh-transition-btn" style="min-height:56px;"></button>
    </div>

    <div class="flex-row gap-3" style="justify-content:center;">
      <button class="brick-btn brick-btn--purple" id="lh-shuffle-btn" style="min-height:52px;">🎲 换一套新程序</button>
    </div>

    <div class="brick-card brick-card--cat-hunt" id="lh-role-card" style="padding:10px var(--space-4);"></div>
  `;

  const stageBarEl = container.querySelector('#lh-stagebar');
  const stageEl = container.querySelector('#lh-stage');
  const checkRow = container.querySelector('#lh-check-row');
  const okBtn = container.querySelector('#lh-ok-btn');
  const noBtn = container.querySelector('#lh-no-btn');
  const transitionRow = container.querySelector('#lh-transition-row');
  const transitionBtn = container.querySelector('#lh-transition-btn');
  const shuffleBtn = container.querySelector('#lh-shuffle-btn');
  const roleCard = container.querySelector('#lh-role-card');
  roleCard.style.padding = '6px var(--space-4)';

  roleSwap(roleCard, { roles: ['👦 我是程序员', '🧑‍💻 我是编译器', '🤖 我是机器人'] });
  // 角色卡默认按钮/间距是给独立大卡片留的，这里三选一循环用得没那么频繁，
  // 紧凑一点换回一屏空间（横屏 768 高 + 长序列时尤其吃紧）。
  const roleSwapBtn = roleCard.querySelector('#role-swap-btn');
  if (roleSwapBtn) roleSwapBtn.style.minHeight = '40px';
  const roleSwapEl = roleCard.querySelector('.family-roleswap');
  if (roleSwapEl) roleSwapEl.style.gap = '4px';

  // 真正的教学点常驻在顶部一句话横幅里（复用 setHowTo，不占额外一屏空间）。
  if (typeof api.setHowTo === 'function') {
    api.setHowTo('程序要先「编译验证」，再「部署运行」！');
  }

  let sequence = [];
  let stage = 0; // 0=读程序 1=编译 2=部署
  let idx = 0;
  let compileErrorCount = 0;

  function showTransition(label, handler) {
    transitionRow.style.display = 'flex';
    transitionBtn.textContent = label;
    transitionBtn.onclick = () => { if (cancelled) return; sfx.click(); handler(); };
  }
  function hideTransition() {
    transitionRow.style.display = 'none';
    transitionBtn.onclick = null;
  }

  function startRead() {
    stage = 0;
    idx = 0;
    renderStageBar(stageBarEl, stage);
    checkRow.style.display = 'none';
    // 角色卡在"读程序"阶段帮忙提醒谁是谁；进了编译/部署的高频 ✓/✗ 核对循环后
    // 收起来腾地方给 ≥80px 的大按钮，不然横屏 1024×768 长序列会被顶出一屏。
    roleCard.style.display = '';
    stageEl.innerHTML = `
      <p class="title-sm" style="margin:0 0 6px;">📖 完整程序，全家一起读一遍，程序员要记住！</p>
      <div class="family-card-row" style="justify-content:center; gap:10px;">
        ${sequence.map((s, i) => `
          <div class="family-card-item" style="gap:2px;">
            <div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;background:var(--paper-100);border-radius:10px;">${stepIconHTML(Art, s, 'sm')}</div>
            <div class="family-card-sub" style="font-size:clamp(11px,2.2vw,14px);">${i + 1}.${stepLabel(s)}</div>
          </div>
        `).join('')}
      </div>
    `;
    showTransition('📖 记好了，开始编译走查 →', startCompile);
    mascot.say(ROLE_INTRO.read, 'happy');
  }

  function showCompileStep() {
    if (idx >= sequence.length) { compilePassed(); return; }
    const step = sequence[idx];
    stageEl.innerHTML = `
      <div class="family-card-sub">🧑‍💻 编译走查 · 第 ${idx + 1} / ${sequence.length} 条</div>
      <div class="family-card-icon" style="${STEP_ICON_STYLE}">${stepIconHTML(Art, step)}</div>
      <div class="family-card-text" style="font-size:clamp(24px,5.5vh,52px);">${stepLabel(step)}</div>
    `;
    checkRow.style.display = 'flex';
  }

  function startCompile() {
    stage = 1;
    idx = 0;
    renderStageBar(stageBarEl, stage);
    hideTransition();
    roleCard.style.display = 'none';
    showCompileStep();
    mascot.say(ROLE_INTRO.compile, 'think');
  }

  function compilePassed() {
    checkRow.style.display = 'none';
    // 这一屏比"部署成功"多一个"进入部署阶段"过渡按钮，横屏 768 高时角色卡+这个
    // 按钮放不下——角色卡继续收着，等真正全部完成（部署成功）再放出来。
    roleCard.style.display = 'none';
    stageEl.innerHTML = `
      <div class="family-card-icon anim-pop-in" style="${STEP_ICON_STYLE}display:flex;align-items:center;justify-content:center;font-size:clamp(48px,14vh,120px);line-height:1;">✅</div>
      <div class="family-card-text" style="font-size:clamp(22px,5vh,42px);">编译通过 BUILD PASSED</div>
      <div class="family-card-sub">编译阶段一共 ${compileErrorCount} 次编译错误</div>
    `;
    sfx.success();
    mascot.say('编译通过！可以部署啦！', 'cheer');
    showTransition('🚀 进入部署阶段', startDeploy);
  }

  function showDeployStep() {
    if (idx >= sequence.length) { deployPassed(); return; }
    const step = sequence[idx];
    stageEl.innerHTML = `
      <div class="family-card-sub">🤖 部署执行 · 第 ${idx + 1} / ${sequence.length} 条</div>
      <div class="family-card-icon" style="${STEP_ICON_STYLE}">${stepIconHTML(Art, step)}</div>
      <div class="family-card-text" style="font-size:clamp(24px,5.5vh,52px);">${stepLabel(step)}</div>
    `;
    checkRow.style.display = 'flex';
  }

  function startDeploy() {
    stage = 2;
    idx = 0;
    renderStageBar(stageBarEl, stage);
    hideTransition();
    roleCard.style.display = 'none';
    showDeployStep();
    mascot.say(ROLE_INTRO.deploy, 'think');
  }

  function deployPassed() {
    checkRow.style.display = 'none';
    roleCard.style.display = '';
    stageEl.innerHTML = `
      <div class="family-card-icon anim-pop-in" style="${STEP_ICON_STYLE}display:flex;align-items:center;justify-content:center;font-size:clamp(48px,14vh,120px);line-height:1;">🚀</div>
      <div class="family-card-text" style="font-size:clamp(22px,5vh,42px);">部署成功！</div>
      <div class="family-card-sub">本次程序 ${compileErrorCount} error 0 warning</div>
    `;
    sfx.success();
    mascot.say('部署成功，全家协作满分！', 'cheer');
    completeRound();
  }

  okBtn.addEventListener('click', () => {
    if (cancelled) return;
    sfx.success();
    idx += 1;
    if (stage === 1) showCompileStep(); else showDeployStep();
  });
  noBtn.addEventListener('click', () => {
    if (cancelled) return;
    sfx.fail();
    if (stage === 1) {
      compileErrorCount += 1;
      mascot.say(`第 ${idx + 1} 行编译错误，重做这一条！`, 'oops');
      showCompileStep();
    } else {
      mascot.say(`第 ${idx + 1} 步对不上，重做这一条！`, 'oops');
      showDeployStep();
    }
  });

  function newRound() {
    sequence = buildSequence(rand);
    compileErrorCount = 0;
    idx = 0;
    startRead();
  }

  shuffleBtn.addEventListener('click', () => {
    sfx.click();
    newRound();
  });

  newRound();

  return {
    destroy() {
      cancelled = true;
      hideTransition();
    },
  };
}

let activeHandle = null;

export default {
  id: 'livinghunt',
  title: '客厅寻宝',
  icon: '🧭',
  howto: '程序员先读程序，再逐条编译走查，编译通过后改口头指挥机器人部署，先验证再运行！',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
