/* family-games/humanrobot.js
 * 人体机器人（你说我做）—— 真人互动分类第 1 关。
 * iPad 出一组动作卡（actionIcons 图标 + 中文大字），只给"描述者"看；描述者只能用嘴
 * 指挥（禁止比划），"执行者"照做。做完后翻面亮出原卡，两人一起自评对/错。
 * 教学点：精确指令传达（编程语言的本质——听的人只能执行你说出来的，不能靠猜）。
 * 协议：export default { id, title, icon, howto, init(container, api), destroy() }。
 */

const ACTION_KEYS = ['squat', 'jump', 'spin', 'clap', 'oneleg', 'touchear', 'stomp', 'freeze', 'patlegs', 'raisehand'];
const ACTION_LABEL = {
  squat: '蹲下', jump: '跳一下', spin: '转一圈', clap: '拍拍手',
  oneleg: '单脚站', touchear: '摸摸耳朵', stomp: '跺跺脚',
  freeze: '定住不动', patlegs: '拍拍腿', raisehand: '举起手',
};

const JUDGE_LINES_OK = ['太棒了，指令传达得清清楚楚！', '完美同步，编程语言学得真好！', '完全正确，你们是最佳拍档！'];
const JUDGE_LINES_MISS = ['没关系，再想想怎么说得更精确！', '差一点点，指令要更具体哦！', 'Debug 一下，换个说法再来一次！'];

function randInt(rand, a, b) { return rand.int(a, b); }

function buildCombo(rand) {
  const len = rand.int(2, 3);
  const keys = rand.shuffle(ACTION_KEYS).slice(0, len);
  const items = keys.map((k) => ({ kind: 'action', key: k, label: ACTION_LABEL[k] }));
  if (rand.int(1, 10) <= 4) {
    items.push({ kind: 'count', n: rand.int(2, 5) });
  }
  return items;
}

function itemIconHTML(Art, item) {
  if (item.kind === 'count') {
    return `<div class="family-card-item"><div class="family-card-icon" style="display:flex;align-items:center;justify-content:center;font-size:clamp(48px,10vw,90px);font-weight:900;color:var(--lego-orange);">${item.n}</div><div class="family-card-sub">数 ${item.n} 秒</div></div>`;
  }
  return `<div class="family-card-item"><div class="family-card-icon">${Art.actionIcons[item.key]()}</div><div class="family-card-sub">${item.label}</div></div>`;
}

function comboText(items) {
  return items.map((it) => it.kind === 'count' ? `数${it.n}秒` : it.label).join(' + ');
}

function render(container, api) {
  let cancelled = false;
  const { Art, rand, sfx, mascot, flipCard, roleSwap } = api;

  container.innerHTML = `
    <div class="brick-card brick-card--cat-macro">
      <p class="title-sm" style="margin:0;">🗣️ 描述者拿好 iPad，读题后点「开始指挥」把卡片藏起来！</p>
    </div>
    <div id="hr-flip-slot"></div>
    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap;">
      <button class="brick-btn brick-btn--blue brick-btn--lg" id="hr-start-btn">🙈 开始指挥（藏卡片）</button>
      <button class="brick-btn brick-btn--yellow brick-btn--lg" id="hr-reveal-btn" style="display:none;">🔍 翻面对答案</button>
    </div>
    <div class="flex-row gap-3" id="hr-judge-row" style="justify-content:center; flex-wrap:wrap; display:none;">
      <button class="brick-btn brick-btn--green brick-btn--lg" id="hr-ok-btn">✅ 全对</button>
      <button class="brick-btn brick-btn--gray brick-btn--lg" id="hr-miss-btn">🔁 差一点</button>
    </div>
    <div class="flex-row gap-3" style="justify-content:center;">
      <button class="brick-btn brick-btn--purple" id="hr-shuffle-btn">🎲 换一组动作卡</button>
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

  const role = roleSwap(roleCard, { roles: ['🗣️ 我是描述者', '🏃 我是执行者'] });

  let combo = null;
  let flip = null;

  function newRound() {
    combo = buildCombo(rand);
    const frontHTML = `
      <p class="title-sm" style="margin:0 0 4px;">📋 动作组合卡（描述者读题）</p>
      <div class="family-card-row">${combo.map((it) => itemIconHTML(Art, it)).join('')}</div>
    `;
    const backHTML = `
      <p class="title-sm" style="margin:0 0 4px; color: var(--lego-orange);">🙈 描述中，执行者别偷看！</p>
      <div class="family-card-text">?</div>
      <p class="family-card-sub">描述者只能用嘴说，不能用手比划哦</p>
    `;
    if (!flip) {
      flip = flipCard(flipSlot, { front: frontHTML, back: backHTML, flipped: false });
    } else {
      flip.setFront(frontHTML);
      flip.setBack(backHTML);
      flip.toFront();
    }
    startBtn.style.display = '';
    revealBtn.style.display = 'none';
    judgeRow.style.display = 'none';
    mascot.say('看好卡片，想想怎么用最精确的话说出来！', 'think');
  }

  startBtn.addEventListener('click', () => {
    sfx.click();
    flip.toBack();
    startBtn.style.display = 'none';
    revealBtn.style.display = '';
    mascot.say('执行者做完了吗？做完了就翻面对照吧！', 'idle');
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
  });
  missBtn.addEventListener('click', () => {
    if (cancelled) return;
    sfx.fail();
    mascot.say(rand.pick(JUDGE_LINES_MISS), 'oops');
    judgeRow.style.display = 'none';
  });

  shuffleBtn.addEventListener('click', () => {
    sfx.click();
    newRound();
  });

  newRound();

  return {
    destroy() { cancelled = true; },
  };
}

let activeHandle = null;

export default {
  id: 'humanrobot',
  title: '人体机器人',
  icon: '🤖',
  howto: '描述者看卡指挥（只能说不能比划），执行者照做，做完翻面对答案，两人一起判对错！',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
