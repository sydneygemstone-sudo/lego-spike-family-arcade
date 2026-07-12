/* family-games/macrospell.js
 * 口令宏（真人 My Block）—— 真人互动分类第 4 关。
 * 第一步：全家用 iPad 拖动作积木共同定义一个"宏"（2-4 个动作组成，起个名字）；
 * 第二步：iPad 随机播报指令流（单动作 与 宏名 混合），听到宏名要把整套动作做出来。
 * 教学点：抽象与组块（My Block 的现实版）。定义阶段复用 js/blocks-ui.js 的拖拽序列
 * 组件（不改该文件，只是导入使用，和 games/macro.js 的做法一致）。
 * 协议：export default { id, title, icon, howto, init(container, api), destroy() }。
 */

import { createTray, createSequence } from '../js/blocks-ui.js';

const ACTION_KEYS = ['squat', 'jump', 'spin', 'clap', 'oneleg', 'touchear', 'stomp', 'patlegs', 'raisehand'];
const ACTION_LABEL = {
  squat: '蹲下', jump: '跳一下', spin: '转一圈', clap: '拍手',
  oneleg: '单脚站', touchear: '摸耳朵', stomp: '跺脚', patlegs: '拍腿', raisehand: '举手',
};
const ACTION_COLOR = {
  squat: 'green', jump: 'orange', spin: 'purple', clap: 'blue',
  oneleg: 'cyan', touchear: 'pink', stomp: 'red', patlegs: 'yellow', raisehand: 'green',
};
const NAME_PRESETS = [
  { name: '忍者闪避', icon: '🥷' },
  { name: '火箭步', icon: '🚀' },
  { name: '超级变身', icon: '⭐' },
  { name: '兔子跳', icon: '🐇' },
];

function blockDefs() {
  return ACTION_KEYS.map((k) => ({ id: k, label: ACTION_LABEL[k], color: ACTION_COLOR[k] }));
}

function buildBroadcastStream(rand, macroLen) {
  const total = rand.int(7, 9);
  const stream = [];
  for (let i = 0; i < total; i++) {
    if (rand.int(1, 10) <= 4) {
      stream.push({ kind: 'macro' });
    } else {
      stream.push({ kind: 'action', key: rand.pick(ACTION_KEYS) });
    }
  }
  return stream;
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  const { Art, rand, sfx, mascot } = api;

  function wait(ms) { return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); }); }

  container.innerHTML = `
    <div class="brick-card brick-card--cat-sort" id="ms-define-card">
      <p class="title-sm" style="margin:0;">① 全家一起拖 2-4 个动作，定义一个"宏"</p>
      <div id="ms-tray"></div>
      <div id="ms-seq"></div>
      <button class="brick-btn brick-btn--purple" id="ms-confirm-btn" disabled>✅ 确认宏</button>
      <div id="ms-name-picker" class="flex-row gap-3" style="flex-wrap:wrap; display:none; margin-top:8px;"></div>
      <div id="ms-def-summary" class="flex-row gap-3" style="align-items:center; display:none; margin-top:10px;"></div>
    </div>

    <div class="family-stage" id="ms-stage" style="display:none;"></div>

    <div class="flex-row gap-3" style="justify-content:center; flex-wrap:wrap; display:none;" id="ms-run-row">
      <button class="brick-btn brick-btn--blue brick-btn--lg" id="ms-broadcast-btn">📣 开始播报</button>
      <button class="brick-btn brick-btn--purple" id="ms-redefine-btn">🔄 重新定义宏</button>
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
      <button class="brick-btn brick-btn--yellow" data-i="${i}"><span style="font-size:22px;">${p.icon}</span>&nbsp;${p.name}</button>
    `).join('');
    confirmBtn.disabled = true;
    namePicker.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => finalizeMacro(NAME_PRESETS[Number(btn.dataset.i)]));
    });
    mascot.say('给这个宏取个名字吧！', 'happy');
  });

  function finalizeMacro(preset) {
    const snapshot = seq.getSequence();
    macroDef = { name: preset.name, icon: preset.icon, actions: snapshot.map((b) => b.type) };
    sfx.success();
    namePicker.style.display = 'none';
    defSummary.style.display = 'flex';
    defSummary.innerHTML = `
      <div class="badge-hex" style="--badge-color: var(--cat-sort);">${macroDef.icon}</div>
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
      <div class="family-card-icon">${macroDef.icon}</div>
      <div class="family-card-text">宏已就绪：${macroDef.name}</div>
      <div class="family-card-sub">点「开始播报」，听到宏名要做出整套动作！</div>
    `;
    mascot.say('宏定义好了！点开始播报，听到宏名字要做完整套动作哦！', 'cheer', 4200);
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
    const stream = buildBroadcastStream(rand, macroDef.actions.length);
    for (const item of stream) {
      if (cancelled) return;
      if (item.kind === 'macro') {
        stage.innerHTML = `
          <div class="family-card-icon">${macroDef.icon}</div>
          <div class="family-card-text">${macroDef.name}！</div>
          <div class="family-card-sub">做出整套动作：${macroDef.actions.map((k) => ACTION_LABEL[k]).join(' → ')}</div>
        `;
        sfx.snap();
        await wait(1000);
        if (cancelled) return;
        for (const key of macroDef.actions) {
          if (cancelled) return;
          stage.innerHTML = `
            <div class="family-card-sub">「${macroDef.name}」展开中……</div>
            <div class="family-card-icon">${Art.actionIcons[key]()}</div>
            <div class="family-card-text">${ACTION_LABEL[key]}</div>
          `;
          sfx.click();
          await wait(900);
          if (cancelled) return;
        }
        await wait(500);
      } else {
        stage.innerHTML = `
          <div class="family-card-icon">${Art.actionIcons[item.key]()}</div>
          <div class="family-card-text">${ACTION_LABEL[item.key]}</div>
        `;
        sfx.click();
        await wait(1500);
      }
      if (cancelled) return;
    }
    if (cancelled) return;
    stage.innerHTML = `
      <div class="family-card-icon">🎉</div>
      <div class="family-card-text">播报完毕！</div>
      <div class="family-card-sub">再点一次可以换一批新的播报</div>
    `;
    sfx.success();
    mascot.say('播报完毕，全家默契值爆表！', 'cheer');
    running = false;
    broadcastBtn.disabled = false;
    redefineBtn.disabled = false;
  }

  broadcastBtn.addEventListener('click', () => {
    sfx.click();
    runBroadcast();
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
  howto: '先拖动作积木定义一个宏并取名，再听 iPad 播报——听到宏名字要做出整套动作！',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
