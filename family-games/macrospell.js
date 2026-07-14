/* family-games/macrospell.js
 * 口令宏（真人 My Block）—— 真人互动分类第 4 关。
 * 第一步：全家用 iPad 拖动作积木共同定义一个"宏"（2-4 个动作组成，起个名字）；
 * 第二步：iPad 随机播报指令流（单动作 与 宏名 混合），听到宏名要把整套动作做出来。
 * 教学点：抽象与组块（My Block 的现实版）。定义阶段复用 js/blocks-ui.js 的拖拽序列
 * 组件（不改该文件，只是导入使用，和 games/macro.js 的做法一致）。
 * 协议：export default { id, title, icon, howto, init(container, api), destroy() }。
 */

import { createTray, createSequence } from '../js/blocks-ui.js';

const ACTION_KEYS = ['clap', 'touchear', 'freeze', 'patlegs', 'raisehand'];
const ACTION_LABEL = {
  clap: '拍手', touchear: '摸耳朵', freeze: '双手停住', patlegs: '拍腿', raisehand: '举手',
};
const ACTION_COLOR = {
  clap: 'blue', touchear: 'pink', freeze: 'cyan', patlegs: 'yellow', raisehand: 'green',
};
const NAME_PRESETS = [
  { name: '星光信号', code: 'L' },
  { name: '节拍密码', code: 'R' },
  { name: '超级变身', code: 'S' },
  { name: '机器人问候', code: 'H' },
];

function blockDefs() {
  return ACTION_KEYS.map((k) => ({ id: k, label: ACTION_LABEL[k], color: ACTION_COLOR[k] }));
}

// 纯 emoji 图标（宏预设图标 / 🎉）默认字号很小，撑在大白卡里显得空——统一放大居中。
// 盒子本身也要跟着缩到跟字号匹配（不然只字号变大、外面的盒子还是 clamp 默认的
// 220px 见方，字周围照样空一圈）。
function bigIconStyle() {
  return 'width:clamp(64px,14vw,140px);height:clamp(64px,14vw,140px);display:flex;align-items:center;justify-content:center;font-size:clamp(48px,11vw,110px);line-height:1;';
}

export function buildBroadcastStream(rand) {
  // 每轮固定 5 项：恰好 2 次宏 + 3 个单动作，避免随机结果变成全宏或无宏。
  return rand.shuffle([
    { kind: 'macro' },
    { kind: 'macro' },
    { kind: 'action', key: rand.pick(ACTION_KEYS) },
    { kind: 'action', key: rand.pick(ACTION_KEYS) },
    { kind: 'action', key: rand.pick(ACTION_KEYS) },
  ]);
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  const { Art, rand, sfx, mascot, completeRound, emitFeedback, glyph } = api;

  function wait(ms) { return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); }); }

  // family-root 默认 justify-content:center——定义阶段只有一张卡可见时，
  // 会在卡片上方空出半屏（指令横幅和卡片之间一大片空白）。这里改成顶部对齐，
  // 卡片自然贴到指令横幅下面，后面阶段卡片增多也是从上往下自然排布。
  container.style.justifyContent = 'flex-start';

  container.innerHTML = `
    <div class="brick-card brick-card--cat-sort" id="ms-define-card">
      <p class="title-sm" style="margin:0;">① 全家一起拖 2-4 个动作，定义一个"宏"</p>
      <div id="ms-tray"></div>
      <div id="ms-seq"></div>
      <button class="brick-btn brick-btn--purple" id="ms-confirm-btn" disabled>确认宏</button>
      <div id="ms-name-picker" class="flex-row gap-3" style="flex-wrap:wrap; display:none; margin-top:8px;"></div>
      <div id="ms-def-summary" class="flex-row gap-3" style="align-items:center; display:none; margin-top:10px;"></div>
    </div>

    <div class="family-stage" id="ms-stage" style="display:none;"></div>

    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap; display:none;" id="ms-run-row">
      <button class="brick-btn brick-btn--blue brick-btn--lg" id="ms-broadcast-btn">开始播报</button>
      <button class="brick-btn brick-btn--purple" id="ms-redefine-btn">重新定义宏</button>
    </div>
    <div class="family-judge-panel" id="ms-judge-row" style="display:none;">
      <strong>主持人判定：每次听到宏名，都完整做出了整套动作吗？</strong>
      <div class="flex-row gap-3" style="justify-content:center;flex-wrap:wrap;">
        <button class="brick-btn brick-btn--green brick-btn--lg" id="ms-pass-btn">全部展开正确</button>
        <button class="brick-btn brick-btn--red brick-btn--lg" id="ms-fail-btn">漏了动作 · 再试</button>
      </div>
    </div>
  `;

  const defineCard = container.querySelector('#ms-define-card');
  const trayEl = container.querySelector('#ms-tray');
  const seqEl = container.querySelector('#ms-seq');
  const confirmBtn = container.querySelector('#ms-confirm-btn');
  const namePicker = container.querySelector('#ms-name-picker');
  const defSummary = container.querySelector('#ms-def-summary');
  const stage = container.querySelector('#ms-stage');
  const runRow = container.querySelector('#ms-run-row');
  const broadcastBtn = container.querySelector('#ms-broadcast-btn');
  const redefineBtn = container.querySelector('#ms-redefine-btn');
  const judgeRow = container.querySelector('#ms-judge-row');
  const passBtn = container.querySelector('#ms-pass-btn');
  const failBtn = container.querySelector('#ms-fail-btn');

  const tray = createTray(trayEl, blockDefs());
  const seq = createSequence(seqEl, { maxSlots: 4, emptyText: '拖 2-4 个动作积木到这里 →' });
  let macroDef = null;
  let running = false;

  seq.onChange((list) => {
    confirmBtn.disabled = !(list.length >= 2 && list.length <= 4);
  });

  confirmBtn.addEventListener('click', () => {
    if (confirmBtn.disabled) return;
    sfx.click();
    namePicker.style.display = 'flex';
    namePicker.innerHTML = NAME_PRESETS.map((p, i) => `
      <button class="brick-btn brick-btn--yellow" data-i="${i}"><span class="macro-name-code">${p.code}</span>&nbsp;${p.name}</button>
    `).join('');
    confirmBtn.disabled = true;
    namePicker.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => finalizeMacro(NAME_PRESETS[Number(btn.dataset.i)]));
    });
    mascot.say('给这个宏取个名字吧！', 'happy');
  });

  function finalizeMacro(preset) {
    const snapshot = seq.getSequence();
    macroDef = { name: preset.name, code: preset.code, actions: snapshot.map((b) => b.type) };
    sfx.success();
    namePicker.style.display = 'none';
    defSummary.style.display = 'flex';
    defSummary.innerHTML = `
      <div class="badge-hex macro-code-badge" style="--badge-color: var(--cat-sort);">${macroDef.code}</div>
      <div>
        <div class="title-sm">${macroDef.name} = ${macroDef.actions.map((k) => ACTION_LABEL[k]).join(' + ')}</div>
      </div>
    `;
    trayEl.style.display = 'none';
    seqEl.style.display = 'none';
    confirmBtn.style.display = 'none';
    runRow.style.display = 'flex';
    stage.style.display = 'flex';
    stage.innerHTML = `
      <div class="family-card-icon" style="${bigIconStyle()}">${glyph('spark')}</div>
      <div class="family-card-text">宏已就绪：${macroDef.name}</div>
      <div class="family-card-sub">点「开始播报」，听到宏名要做出整套动作！</div>
    `;
    mascot.say('宏定义好了！点开始播报，听到宏名字要做完整套动作哦！', 'cheer', 4200);
    emitFeedback('ready', { label: `宏已定义：${macroDef.name}` });
  }

  redefineBtn.addEventListener('click', () => {
    if (running) return;
    sfx.click();
    macroDef = null;
    seq.clear();
    trayEl.style.display = '';
    seqEl.style.display = '';
    confirmBtn.style.display = '';
    confirmBtn.disabled = true;
    defSummary.style.display = 'none';
    namePicker.style.display = 'none';
    runRow.style.display = 'none';
    stage.style.display = 'none';
    mascot.say('重新拖几个动作，定义一个新的宏吧！', 'idle');
  });

  async function runBroadcast() {
    if (running || !macroDef) return;
    running = true;
    broadcastBtn.disabled = true;
    redefineBtn.disabled = true;
    defineCard.style.display = 'none';
    const stream = buildBroadcastStream(rand);
    judgeRow.style.display = 'none';
    emitFeedback('action', { label: `播报中 · 记住 ${macroDef.actions.length} 个宏动作` });
    for (const item of stream) {
      if (cancelled) return;
      if (item.kind === 'macro') {
        stage.innerHTML = `
          <div class="family-card-icon" style="${bigIconStyle()}">${glyph('broadcast')}</div>
          <div class="family-card-text">${macroDef.name}！</div>
          <div class="family-card-sub">现在凭记忆完成整套动作；屏幕不会泄露答案</div>
        `;
        sfx.snap();
        await wait(Math.max(1200, macroDef.actions.length * 650));
      } else {
        stage.innerHTML = `
          <div class="family-card-icon">${Art.actionIcons[item.key]()}</div>
          <div class="family-card-text">${ACTION_LABEL[item.key]}</div>
        `;
        sfx.click();
        await wait(800);
      }
      if (cancelled) return;
    }
    if (cancelled) return;
    stage.innerHTML = `
      <div class="family-card-icon" style="${bigIconStyle()}">${glyph('success')}</div>
      <div class="family-card-text">播报完毕！</div>
      <div class="family-card-sub">再点一次可以换一批新的播报</div>
    `;
    sfx.success();
    mascot.say('播报完毕，主持人来核对每次宏有没有完整展开。', 'cheer');
    running = false;
    judgeRow.style.display = 'grid';
    emitFeedback('round', { label: '播报结束 · 等待主持人判定' });
  }

  broadcastBtn.addEventListener('click', () => {
    sfx.click();
    runBroadcast();
  });

  passBtn.addEventListener('click', () => {
    sfx.success();
    judgeRow.style.display = 'none';
    broadcastBtn.disabled = false;
    redefineBtn.disabled = false;
    defineCard.style.display = '';
    mascot.say('宏展开全部正确，挑战通过！', 'cheer');
    completeRound();
  });
  failBtn.addEventListener('click', () => {
    sfx.fail();
    judgeRow.style.display = 'none';
    broadcastBtn.disabled = false;
    redefineBtn.disabled = false;
    defineCard.style.display = '';
    emitFeedback('miss', { label: '宏展开不完整 · 本轮不打卡' });
    mascot.say('漏了动作，再听一轮，把宏完整展开！', 'oops');
  });

  mascot.say('先拖几个动作积木，定义一个专属的"宏"吧！', 'idle', 4200);

  return {
    destroy() {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
      seq.destroy();
    },
  };
}

let activeHandle = null;

export default {
  id: 'macrospell',
  title: '口令宏',
  icon: '🔮',
  howto: '先用坐姿动作定义宏；一轮一定出现 2 次宏和 3 个单动作，播报时不会显示宏的答案。',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
