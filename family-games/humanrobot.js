/* family-games/humanrobot.js
 * 人体机器人（你说我做）—— 真人互动分类第 1 关。
 * iPad 出一组动作卡（actionIcons 图标 + 中文大字），只给"描述者"看；描述者只能用嘴
 * 指挥（禁止比划），"执行者"照做。做完后翻面亮出原卡，两人一起自评对/错。
 * 教学点：精确指令传达（编程语言的本质——听的人只能执行你说出来的，不能靠猜）。
 * 协议：export default { id, title, icon, howto, init(container, api), destroy() }。
 */

const ACTION_KEYS = ['clap', 'touchear', 'freeze', 'patlegs', 'raisehand'];
const ACTION_LABEL = {
  clap: '拍拍手', touchear: '摸摸耳朵', freeze: '双手停住',
  patlegs: '拍拍腿', raisehand: '举起手',
};
// 能"保持几秒"的动作（静态定住/持续重复类），"数秒"要接在这类动作后面才读得通顺；
// 跳一下/转一圈这种瞬时动作不适合接"保持 N 秒"，所以单独排除。
const HOLDABLE_KEYS = new Set(['freeze', 'touchear', 'patlegs', 'clap', 'raisehand']);

const JUDGE_LINES_OK = ['太棒了，指令传达得清清楚楚！', '完美同步，编程语言学得真好！', '完全正确，你们是最佳拍档！'];
const JUDGE_LINES_MISS = ['没关系，再想想怎么说得更精确！', '差一点点，指令要更具体哦！', 'Debug 一下，换个说法再来一次！'];

function buildCombo(rand) {
  const len = rand.int(2, 4);
  const keys = rand.shuffle(ACTION_KEYS).slice(0, len);
  const items = keys.map((k) => ({ key: k, label: ACTION_LABEL[k] }));
  if (rand.int(1, 10) <= 4) {
    // "数 N 秒"不再单独占一张卡——挂到前面某个动作上变成"XX 并保持 N 秒"，
    // 语义连贯，也不会再多出一张和其它卡毫无关系的悬空数字卡。
    const holdableIdx = items.map((it, i) => (HOLDABLE_KEYS.has(it.key) ? i : -1)).filter((i) => i >= 0);
    const idx = holdableIdx.length ? rand.pick(holdableIdx) : rand.int(0, items.length - 1);
    const n = rand.int(2, 5);
    items[idx] = { ...items[idx], holdSeconds: n, label: `${items[idx].label}并保持 ${n} 秒` };
  }
  return items;
}

// 图标尺寸按"容器宽度 ÷ 动作个数"动态算，保证 2~4 个动作卡永远单行排布，
// 不会因为动作数多/视口窄而换行撑爆卡片高度（换行才是溢出的根源）。
function computeIconPx(containerWidthPx, count) {
  const facePadding = 48; // .family-flip-face 左右 padding（--space-5 * 2）
  const rowGap = 24; // .family-card-row 的 gap（--space-5）
  const available = Math.max(160, (containerWidthPx || 700) - facePadding);
  const raw = (available - rowGap * Math.max(0, count - 1)) / Math.max(1, count);
  return Math.round(Math.max(56, Math.min(190, raw)));
}

function itemIconHTML(Art, item, iconPx) {
  const itemStyle = `width:${iconPx}px;`;
  const iconStyle = `width:${iconPx}px;height:${iconPx}px;flex-shrink:0;min-height:0;`;
  return `<div class="family-card-item" style="${itemStyle}"><div class="family-card-icon" style="${iconStyle}">${Art.actionIcons[item.key]()}</div><div class="family-card-sub">${item.label}</div></div>`;
}

function comboText(items) {
  return items.map((it) => it.label).join(' + ');
}

function render(container, api) {
  let cancelled = false;
  const { Art, rand, sfx, mascot, flipCard, roleSwap, completeRound, emitFeedback } = api;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-macro family-brief-card">
      <p class="title-sm" style="margin:0;">描述者拿好 iPad，读题后点「开始指挥」把卡片藏起来；所有动作都可坐着完成。</p>
    </div>
    <div id="hr-flip-slot"></div>
    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap;">
      <button class="brick-btn brick-btn--blue brick-btn--lg" id="hr-start-btn">开始指挥 · 藏起卡片</button>
      <button class="brick-btn brick-btn--yellow brick-btn--lg" id="hr-reveal-btn" style="display:none;">翻面对答案</button>
    </div>
    <div class="flex-row gap-3" id="hr-judge-row" style="justify-content:center; flex-wrap:wrap; display:none;">
      <button class="brick-btn brick-btn--green brick-btn--lg" id="hr-ok-btn">全部命中</button>
      <button class="brick-btn brick-btn--gray brick-btn--lg" id="hr-miss-btn">差一点 · 再试</button>
    </div>
    <div class="flex-row gap-3" style="justify-content:center;">
      <button class="brick-btn brick-btn--purple" id="hr-shuffle-btn">更换动作卡</button>
    </div>
    <div class="brick-card brick-card--cat-macro" id="hr-role-card"></div>
  `;

  const flipSlot = container.querySelector('#hr-flip-slot');
  const startBtn = container.querySelector('#hr-start-btn');
  const revealBtn = container.querySelector('#hr-reveal-btn');
  const judgeRow = container.querySelector('#hr-judge-row');
  const okBtn = container.querySelector('#hr-ok-btn');
  const missBtn = container.querySelector('#hr-miss-btn');
  const shuffleBtn = container.querySelector('#hr-shuffle-btn');
  const roleCard = container.querySelector('#hr-role-card');

  let combo = null;
  let flip = null;
  let resizeTimer = null;

  function backHTML() {
    return `
      <p class="title-sm" style="margin:0 0 4px; color: var(--lego-orange);">描述中 · 执行者不要偷看</p>
      <div class="family-card-text">?</div>
      <p class="family-card-sub">描述者只能用嘴说，不能用手比划哦</p>
    `;
  }

  function currentIconPx() {
    const width = flipSlot.clientWidth || container.clientWidth || 700;
    return computeIconPx(width, combo ? combo.length : 3);
  }

  function frontHTML() {
    const iconPx = currentIconPx();
    return `
      <p class="title-sm" style="margin:0 0 4px;">动作组合卡 · 描述者读题</p>
      <div class="family-card-row" style="flex-wrap:nowrap;">${combo.map((it) => itemIconHTML(Art, it, iconPx)).join('')}</div>
    `;
  }

  // 翻面组件是 position:absolute + inset:0 撑起来的固定高度容器，内容比容器高时
  // 会直接溢出卡片边框（这就是客户反馈的"底部压线/溢出"）。这里每次改内容后都
  // 量一次两面真实需要的高度（临时切成 static 拿 scrollHeight，量完立刻还原，
  // 全程同步执行不会有画面闪动），再把高度写回容器，让卡片跟着内容自适应。
  function measureFaceHeight(faceEl) {
    if (!faceEl) return 0;
    const prevPosition = faceEl.style.position;
    faceEl.style.position = 'static';
    const h = faceEl.scrollHeight;
    faceEl.style.position = prevPosition;
    return h;
  }

  function syncFlipHeight() {
    if (!flip) return;
    const innerEl = flip.el.querySelector('.family-flipcard-inner');
    const frontEl = flip.el.querySelector('.family-flip-face--front');
    const backEl = flip.el.querySelector('.family-flip-face--back');
    if (!innerEl) return;
    const h = Math.max(measureFaceHeight(frontEl), measureFaceHeight(backEl), 240);
    innerEl.style.minHeight = `${h}px`;
  }

  function applyFrontLayout() {
    if (!flip || !combo) return;
    flip.setFront(frontHTML());
    syncFlipHeight();
  }

  function newRound() {
    combo = buildCombo(rand);
    if (!flip) {
      flip = flipCard(flipSlot, { front: frontHTML(), back: backHTML(), flipped: false });
    } else {
      flip.setFront(frontHTML());
      flip.setBack(backHTML());
      flip.toFront();
    }
    syncFlipHeight();
    startBtn.style.display = '';
    revealBtn.style.display = 'none';
    judgeRow.style.display = 'none';
    mascot.say('看好卡片，想想怎么用最精确的话说出来！', 'think');
  }

  // 角色互换＝换人上场，旧卡描述者已经看过、对新的描述者来说等于泄题，
  // 所以互换必须作废旧卡、发新卡重新回到"读题"阶段，而不是只换一下标签文字。
  const role = roleSwap(roleCard, {
    roles: ['我是描述者', '我是执行者'],
    onSwap() { newRound(); },
  });

  startBtn.addEventListener('click', () => {
    sfx.click();
    flip.toBack();
    startBtn.style.display = 'none';
    revealBtn.style.display = '';
    mascot.say('执行者做完了吗？做完了就翻面对照吧！', 'idle');
    emitFeedback('action', { label: '指挥中 · 不能比划' });
  });

  revealBtn.addEventListener('click', () => {
    sfx.snap();
    flip.toFront();
    revealBtn.style.display = 'none';
    judgeRow.style.display = 'flex';
    mascot.say(`原题是：${comboText(combo)}，两人自己评一评对不对！`, 'idle', 4200);
  });

  okBtn.addEventListener('click', () => {
    if (cancelled) return;
    sfx.success();
    mascot.say(rand.pick(JUDGE_LINES_OK), 'cheer');
    judgeRow.style.display = 'none';
    emitFeedback('hit', { label: '指令完整命中' });
    completeRound();
  });
  missBtn.addEventListener('click', () => {
    if (cancelled) return;
    sfx.fail();
    mascot.say(rand.pick(JUDGE_LINES_MISS), 'oops');
    judgeRow.style.display = 'none';
    flip.toBack();
    revealBtn.style.display = '';
    emitFeedback('miss', { label: '没有命中 · 用同一张卡 Debug' });
  });

  shuffleBtn.addEventListener('click', () => {
    sfx.click();
    newRound();
  });

  function handleResize() {
    if (cancelled) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (cancelled) return;
      applyFrontLayout();
    }, 150);
  }
  window.addEventListener('resize', handleResize);

  newRound();

  return {
    destroy() {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    },
  };
}

let activeHandle = null;

export default {
  id: 'humanrobot',
  title: '人体机器人',
  icon: '🤖',
  howto: '描述者看卡指挥（只能说不能比划），执行者坐着完成拍手、拍腿和举手，做完翻面对答案。',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
