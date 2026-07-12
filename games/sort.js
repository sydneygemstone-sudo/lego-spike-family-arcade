/* games/sort.js — 3. 流水线密码 v3 (docs/superpowers/specs/2026-07-13-games-v3-redesign.md §三)
 * 彻底重做：传送带送来一串「有周期规律的彩色包裹序列」（如 红蓝·红蓝·红蓝），孩子要自己
 * 发现规律，把程序写成 `Repeat [n] 次 { 循环体 2-4 个动作 }`（L3 再加循环外的「前置动作」），
 * 循环体×次数必须精确覆盖整条序列（覆盖算式实时显示），确认后机器人沿带执行，逐包裹比对：
 * 配对正确 → 飞入对应色箱；配错 → 包裹弹落地上 + 停机报告"第几个包裹出错"，孩子改程序重跑
 * （debug 循环）。
 *
 * 美术：assets/art.js 的 beltSceneColored（彩色包裹，data-idx 可单独动画）+ roverSide（侧视
 * 机器人）+ dialFrame（Repeat 拨轮）。色箱/分拣提示纯 CSS 小挂件（非场景美术，仅信息展示）。
 * 动作块：createTray/createSequence（js/blocks-ui.js）三色积木「装红箱/装蓝箱/装黄箱」，
 * 块本身的糖果色 + 文字即视觉语义，不用 emoji。
 *
 * Level：
 *   L1 纯周期序列，周期 2 × 3 组 = 6 个包裹，无前置。
 *   L2 周期 3 × 3-4 组 = 9-12 个包裹，无前置。
 *   L3 前缀（1-2 个循环外的前置动作）+ 周期 2 循环段 × 2-3 组，教"不是所有都在循环里"。
 * 星级：运行 1 次即全部正确 = 3★ / 2 次内成功（debug 过一次）= 2★ / 3 次及以上才成功 = 1★。
 * 协议见 API.md：export default {id,title,icon,init,destroy}，api.level 决定关卡生成。
 */

import { beltSceneColored, roverSide, dialFrame } from '../assets/art.js';
import { createTray, createSequence } from '../js/blocks-ui.js';

const COLORS = ['red', 'blue', 'yellow'];
const COLOR_ZH = { red: '红', blue: '蓝', yellow: '黄' };

/* beltSceneColored 内部几何常量（必须与 art.js 保持一致，用于精确定位机器人 overlay） */
const SEG = 78, BX = 130, BY = 130, VIEW_H = 200;
const BODY_MAX = 4, PREFIX_MAX = 2;
const STAGE_TARGET_H = 140; // px：传送带舞台固定目标高度，包裹数少（带子相对更"方"）时也不会把卡片撑高
const DIAL_MIN = 1, DIAL_MAX = 6;

function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function wait(ms, timers) { return new Promise((resolve) => { timers.push(setTimeout(resolve, ms)); }); }

function beltWidth(n) { return BX + n * SEG + 170; }
/** 第 i 个包裹（0-based）在传送带整体宽度中的横向百分比 */
function parcelPercent(i, n) {
  const x = i < 0 ? BX - 40 : (BX + i * SEG + SEG / 2);
  return (x / beltWidth(n)) * 100;
}
const ROBOT_TOP_PCT = (BY / VIEW_H) * 100;

/* --------------------------------------------------------------------------
 * 关卡生成：period=颜色循环体长度；reps=循环次数；prefixLen=循环外前置动作数（仅 L3）
 * body 不允许全同色（2/3 都是质数，非常量数组即可保证"最小周期"确实等于 period，
 * 不会被玩家用更短的子周期蒙混过关）。
 * -------------------------------------------------------------------------- */
function genBody(len) {
  let body;
  do { body = Array.from({ length: len }, () => pick(COLORS)); } while (new Set(body).size === 1);
  return body;
}

function buildLevelPlan(level) {
  if (level === 3) {
    const period = 2;
    const reps = randInt(2, 3);
    const prefixLen = randInt(1, 2);
    const body = genBody(period);
    let prefix;
    do { prefix = Array.from({ length: prefixLen }, () => pick(COLORS)); }
    while (prefix[prefix.length - 1] === body[0]);
    const colors = [...prefix];
    for (let k = 0; k < reps; k++) colors.push(...body);
    return { colors, prefix, prefixLen, body, period, reps, N: colors.length };
  }
  const period = level === 2 ? 3 : 2;
  const reps = level === 2 ? randInt(3, 4) : 3;
  const body = genBody(period);
  const colors = [];
  for (let k = 0; k < reps; k++) colors.push(...body);
  return { colors, prefix: [], prefixLen: 0, body, period, reps, N: colors.length };
}

function colorBlockDefs() {
  return COLORS.map((c) => ({ id: c, label: `装${COLOR_ZH[c]}箱`, color: c }));
}

/* -------------------------------------------------------------------------- 样式 -------------------------------------------------------------------------- */
let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .sort-belt-card.brick-card { padding: 20px var(--space-4) 4px; }
    .sort-program-card.brick-card { padding: 20px var(--space-4) 4px; }
    .sort-stage { display:flex; justify-content:center; background:var(--paper-50); border-radius:14px; overflow:hidden; }
    .sort-stage-inner { position:relative; display:flex; }
    .sort-stage-inner svg { width:100%; height:auto; display:block; }
    .sort-parcel-hl { transform-box:fill-box; transform-origin:center; transform:scale(1.22); transition:transform .16s ease; filter:drop-shadow(0 0 8px rgba(245,197,24,.95)); }
    .sort-parcel-hit { transform-box:fill-box; transform-origin:center; transition:transform .5s ease, opacity .5s ease; transform:translateY(-46px) scale(.3); opacity:0; }
    .sort-parcel-miss { transform-box:fill-box; transform-origin:center; transition:transform .45s ease, opacity .45s ease; transform:translateY(54px) rotate(28deg); opacity:.4; }
    .sort-run-robot { position:absolute; width:13%; min-width:48px; max-width:84px; height:auto; top:${ROBOT_TOP_PCT}%; transform:translate(-50%,-100%); transition:left .6s ease; pointer-events:none; z-index:5; }
    .sort-bins-row { display:flex; gap:10px; justify-content:center; margin-top:4px; flex-wrap:wrap; }
    .sort-bin { display:flex; flex-direction:column; align-items:center; gap:2px; min-width:64px; padding:6px 10px; border-radius:12px; border:3px solid var(--ink-300); background:var(--paper-0); transition:transform .18s ease, box-shadow .18s ease; }
    .sort-bin[data-color="red"] { border-color: var(--lego-red,#D01012); }
    .sort-bin[data-color="blue"] { border-color: var(--lego-blue,#0055BF); }
    .sort-bin[data-color="yellow"] { border-color: var(--lego-yellow,#F5C518); }
    .sort-bin-count { font-size:22px; font-weight:900; color:var(--ink-900); }
    .sort-bin-label { font-size:11px; font-weight:700; color:var(--ink-500); }
    .sort-bin--pulse { animation: sort-bin-pulse .4s ease; }
    @keyframes sort-bin-pulse { 0%,100%{ transform:scale(1); } 45%{ transform:scale(1.22); } }
    .sort-program-card { display:flex; flex-direction:column; gap:4px; }
    .sort-section-label { margin:0 0 2px; font-weight:800; font-size: var(--font-small); color: var(--ink-700); }
    .sort-hint { font-size:11px; color:var(--ink-500); font-weight:600; margin:0 0 4px; }
    .sort-loop-row { display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap; }
    .sort-loop-brace { font-size: clamp(16px,3vw,22px); font-weight:900; color: var(--cat-sort,#6B2FA0); line-height:1.1; }
    .sort-loop-brace.text-center { margin: 0; }
    .sort-dial-outer { position:relative; width:clamp(52px,11vw,64px); aspect-ratio:150/190; }
    #sort-prefix-seq .blocks-seq, #sort-body-seq .blocks-seq { min-height:52px; padding:6px 8px; }
    #sort-tray .blocks-tray { padding:6px 8px 8px; }
    .sort-dial-outer svg { width:100%; height:100%; display:block; }
    .sort-dial-hit { position:absolute; left:0; right:0; background:transparent; border:none; }
    .sort-dial-hit--up { top:0; height:40%; }
    .sort-dial-hit--down { bottom:0; height:40%; }
    .sort-dial-readout { position:absolute; left:50%; top:51%; transform:translate(-50%,-50%); font-size: clamp(18px,4vw,26px); font-weight:900; color:var(--ink-900); pointer-events:none; }
    .sort-formula-text { text-align:center; font-weight:900; font-size: clamp(15px, 2.6vw, 20px); color: var(--cat-sort-dark, #451A6B); margin:2px 0; }
    .sort-formula-text.sort-formula--ok { color: var(--lego-green,#237841); }
    .sort-formula-text.sort-formula--bad { color: var(--lego-orange,#E8710A); }
    .sort-status-text { text-align:center; font-size: var(--font-small); font-weight:700; color: var(--ink-700); min-height: 1.4em; margin:0; }
    .sort-locked { opacity:.55; pointer-events:none; }

    .sort-page { display:flex; flex-direction:column; gap:6px; }

    /* 横屏短视口（如 1024×768）：传送带卡 + 程序卡竖排叠加会超出 768 高，改成
     * 传送带左 · 程序区右两栏，参照 games/claw.js 同一断点的做法。 */
    @media (min-width: 700px) and (max-height: 840px) {
      .sort-page { flex-direction:row; align-items:stretch; gap:14px; }
      .sort-belt-card.brick-card, .sort-program-card.brick-card { padding: 12px var(--space-3) 6px; flex:1 1 0; min-width:0; }
      .sort-belt-card { flex:1.05 1 0; }
      .sort-program-card { justify-content:center; }
      .sort-bins-row { margin-top:2px; }
      .sort-bin { min-width:52px; padding:3px 7px; }
      .sort-bin-count { font-size:17px; }
      .sort-bin-label { font-size:9.5px; }
      #sort-recount-btn { min-height:36px; padding:6px 12px; font-size:12px; margin-top:0; }
      .sort-section-label { margin:0 0 1px; font-size:11px; }
      .sort-hint { font-size:9.5px; margin:0 0 2px; }
      #sort-prefix-seq .blocks-seq, #sort-body-seq .blocks-seq { min-height:40px; padding:4px 6px; }
      #sort-tray .blocks-tray { padding:4px 6px 6px; }
      .sort-dial-outer { width:clamp(40px,7vw,50px); }
      .sort-formula-text { font-size: clamp(12px,1.8vw,15px); margin:1px 0; }
      .sort-program-card .brick-btn { min-height:38px; padding:7px 16px; margin-top:4px; }
      .sort-status-text { font-size:10.5px; }
    }
  `;
  document.head.appendChild(style);
}

function render(container, api) {
  let cancelled = false;
  const timers = [];
  const level = api.level;
  const plan = buildLevelPlan(level);
  const isL3 = plan.prefixLen > 0 || level === 3;
  let dialValue = 1;
  let attempts = 0;
  let busy = false;
  const bins = { red: 0, blue: 0, yellow: 0 };

  container.innerHTML = `
    <div class="sort-page">
      <div class="brick-card brick-card--cat-sort sort-belt-card">
        <p class="title-sm" style="margin:0 0 8px;">🔎 看看传送带上的包裹，找找颜色规律！</p>
        <div class="sort-stage"><div class="sort-stage-inner" id="sort-belt-box"></div></div>
        <div class="sort-bins-row" id="sort-bins-row"></div>
        <div class="flex-center" style="margin-top:4px;">
          <button class="brick-btn brick-btn--gray brick-btn--sm" id="sort-recount-btn">🔍 再看一遍</button>
        </div>
      </div>

      <div class="brick-card brick-card--cat-sort sort-program-card">
        ${isL3 ? `
        <div>
          <p class="sort-section-label">① 前置动作（循环外，只做一次，请拖拽加入）</p>
          <div id="sort-prefix-seq"></div>
        </div>` : ''}
        <div>
          <p class="sort-section-label">${isL3 ? '② ' : ''}循环体 —— 拖 2-4 个动作，组成"每一轮"的样子</p>
          <div id="sort-tray"></div>
          <div class="sort-loop-row">
            <span class="sort-loop-brace">Repeat</span>
            <div class="sort-dial-outer" id="sort-dial-outer">
              ${dialFrame({ label: '次' })}
              <button class="sort-dial-hit sort-dial-hit--up" id="sort-dial-up" aria-label="增加次数"></button>
              <button class="sort-dial-hit sort-dial-hit--down" id="sort-dial-down" aria-label="减少次数"></button>
              <div class="sort-dial-readout" id="sort-dial-value">1</div>
            </div>
            <span class="sort-loop-brace">次 {</span>
          </div>
          <div id="sort-body-seq"></div>
          <div class="sort-loop-brace text-center">}</div>
        </div>
        <p class="sort-formula-text" id="sort-formula-text"></p>
        <div class="flex-center">
          <button class="brick-btn brick-btn--green" id="sort-run-btn" disabled>▶ 运行程序</button>
        </div>
        <p class="sort-status-text" id="sort-status-text"></p>
      </div>
    </div>
  `;

  const beltBox = container.querySelector('#sort-belt-box');
  const binsRow = container.querySelector('#sort-bins-row');
  const recountBtn = container.querySelector('#sort-recount-btn');
  const traySlot = container.querySelector('#sort-tray');
  const prefixSeqSlot = container.querySelector('#sort-prefix-seq');
  const bodySeqSlot = container.querySelector('#sort-body-seq');
  const dialUpBtn = container.querySelector('#sort-dial-up');
  const dialDownBtn = container.querySelector('#sort-dial-down');
  const dialValueEl = container.querySelector('#sort-dial-value');
  const formulaText = container.querySelector('#sort-formula-text');
  const runBtn = container.querySelector('#sort-run-btn');
  const statusText = container.querySelector('#sort-status-text');
  const programCard = container.querySelector('.sort-program-card');

  beltBox.innerHTML = beltSceneColored({ colors: plan.colors });
  // 传送带舞台按固定目标高度反算宽度上限（不管 N 大小，卡片高度都稳定，避免小 N 时
  // 带子相对更"方"、按 100% 宽度铺满反而把整卡撑得很高，挤爆 768×1024 单屏预算）。
  {
    const stageOuter = container.querySelector('.sort-stage');
    const availW = stageOuter.getBoundingClientRect().width || 700;
    const aspect = beltWidth(plan.N) / VIEW_H;
    beltBox.style.width = `${Math.min(availW, STAGE_TARGET_H * aspect)}px`;
  }

  binsRow.innerHTML = COLORS.map((c) => `
    <div class="sort-bin" data-color="${c}">
      <span class="sort-bin-count" data-count="${c}">0</span>
      <span class="sort-bin-label">${COLOR_ZH[c]}箱</span>
    </div>
  `).join('');

  const robotWrap = document.createElement('div');
  robotWrap.className = 'sort-run-robot';
  robotWrap.style.left = `${parcelPercent(-1, plan.N)}%`;
  robotWrap.innerHTML = roverSide({ wheelAngle: 0, face: 'happy' });
  beltBox.appendChild(robotWrap);

  /* -------- 前置序列（L3 才建）：只支持拖拽（tap 兜底固定指向"最近创建的序列"= 循环体） -------- */
  let prefixSeq = null;
  if (isL3) {
    prefixSeq = createSequence(prefixSeqSlot, { maxSlots: PREFIX_MAX, emptyText: '可以留空，或拖 1-2 个色块 →' });
  }

  /* -------- 循环体序列（最后创建 = tap 兜底的默认落点，方便更常用的这一区） -------- */
  const tray = createTray(traySlot, colorBlockDefs());
  const bodySeq = createSequence(bodySeqSlot, { maxSlots: BODY_MAX, emptyText: '把 2-4 个动作拖到这里 →' });

  if (typeof window !== 'undefined' && window.__LSFA_TEST__) {
    window.__lsfaSort = { plan, prefixSeq, bodySeq };
  }

  function currentCoverage() {
    const prefixCount = prefixSeq ? prefixSeq.getSequence().length : 0;
    const bodyLen = bodySeq.getSequence().length;
    return { prefixCount, bodyLen, coverage: prefixCount + bodyLen * dialValue };
  }

  function updateFormula() {
    const { prefixCount, bodyLen, coverage } = currentCoverage();
    const parts = isL3 ? `前置 ${prefixCount} 个 + 循环体 ${bodyLen} 个 × Repeat ${dialValue} 次` : `循环体 ${bodyLen} 个 × Repeat ${dialValue} 次`;
    formulaText.textContent = `${parts} = ${coverage} 个包裹（传送带共 ${plan.N} 个）`;
    formulaText.classList.remove('sort-formula--ok', 'sort-formula--bad');
    const exact = coverage === plan.N && bodyLen > 0;
    if (exact) {
      formulaText.classList.add('sort-formula--ok');
    } else if (bodyLen > 0) {
      formulaText.classList.add('sort-formula--bad');
      formulaText.textContent += coverage < plan.N ? `　还差 ${plan.N - coverage} 个没处理哦` : `　多出了 ${coverage - plan.N} 个，覆盖不下啦`;
    }
    runBtn.disabled = !exact || busy;
  }

  dialValueEl.textContent = String(dialValue);
  updateFormula();

  dialUpBtn.addEventListener('click', () => {
    if (busy) return;
    dialValue = Math.min(DIAL_MAX, dialValue + 1);
    dialValueEl.textContent = String(dialValue);
    api.sfx.click();
    updateFormula();
  });
  dialDownBtn.addEventListener('click', () => {
    if (busy) return;
    dialValue = Math.max(DIAL_MIN, dialValue - 1);
    dialValueEl.textContent = String(dialValue);
    api.sfx.click();
    updateFormula();
  });
  bodySeq.onChange(() => updateFormula());
  if (prefixSeq) prefixSeq.onChange(() => updateFormula());

  /* -------- 演练：逐个高亮包裹，帮助看清规律，不计分，可反复 -------- */
  let recounting = false;
  recountBtn.addEventListener('click', async () => {
    if (recounting || busy) return;
    recounting = true;
    api.sfx.click();
    const groups = Array.from(beltBox.querySelectorAll('.parcel'));
    for (const g of groups) {
      if (cancelled) break;
      g.classList.add('sort-parcel-hl');
      api.sfx.click();
      await wait(240, timers);
      if (cancelled) break;
      g.classList.remove('sort-parcel-hl');
    }
    recounting = false;
  });

  function lockControls() {
    programCard.classList.add('sort-locked');
    recountBtn.disabled = true;
  }
  function unlockControls() {
    programCard.classList.remove('sort-locked');
    recountBtn.disabled = false;
  }

  function resetRunVisuals() {
    beltBox.querySelectorAll('.parcel').forEach((g) => g.classList.remove('sort-parcel-hit', 'sort-parcel-miss', 'sort-parcel-hl'));
    COLORS.forEach((c) => { bins[c] = 0; });
    updateBinsDisplay();
    robotWrap.style.left = `${parcelPercent(-1, plan.N)}%`;
    robotWrap.innerHTML = roverSide({ wheelAngle: 0, face: 'happy' });
  }

  function updateBinsDisplay() {
    COLORS.forEach((c) => {
      const el = binsRow.querySelector(`[data-count="${c}"]`);
      if (el) el.textContent = String(bins[c]);
    });
  }

  function pulseBin(color) {
    const binEl = binsRow.querySelector(`.sort-bin[data-color="${color}"]`);
    if (!binEl) return;
    binEl.classList.remove('sort-bin--pulse');
    void binEl.offsetWidth;
    binEl.classList.add('sort-bin--pulse');
  }

  /* setTimeout 补间（非 rAF）：与老版本同理，后台标签页也不会卡死，见旧 sort.js 注释。 */
  function tweenWheel(fromDeg, toDeg, ms, face) {
    return new Promise((resolve) => {
      if (cancelled) { resolve(); return; }
      const t0 = performance.now();
      const STEP_MS = 30;
      function step() {
        if (cancelled) { resolve(); return; }
        const p = Math.min(1, (performance.now() - t0) / ms);
        const deg = fromDeg + (toDeg - fromDeg) * p;
        robotWrap.innerHTML = roverSide({ wheelAngle: deg, face });
        if (p < 1) { timers.push(setTimeout(step, STEP_MS)); } else resolve();
      }
      step();
    });
  }

  function buildFlatProgram() {
    const prefixList = prefixSeq ? prefixSeq.getSequence().map((b) => b.type) : [];
    const bodyList = bodySeq.getSequence().map((b) => b.type);
    const flat = [...prefixList];
    for (let k = 0; k < dialValue; k++) flat.push(...bodyList);
    return flat;
  }

  async function runProgram() {
    if (busy) return;
    const { coverage } = currentCoverage();
    if (coverage !== plan.N) return;
    busy = true;
    attempts += 1;
    lockControls();
    resetRunVisuals();
    const flat = buildFlatProgram();
    statusText.textContent = '运行中…';
    let wheelDeg = 0;
    for (let i = 0; i < plan.N; i++) {
      if (cancelled) return;
      robotWrap.style.left = `${parcelPercent(i, plan.N)}%`;
      await tweenWheel(wheelDeg, wheelDeg + 260, 560, 'effort');
      wheelDeg += 260;
      if (cancelled) return;

      const expected = flat[i];
      const actual = plan.colors[i];
      const parcelEl = beltBox.querySelector(`.parcel[data-idx="${i}"]`);

      if (expected === actual) {
        api.sfx.snap();
        bins[actual] += 1;
        updateBinsDisplay();
        pulseBin(actual);
        if (parcelEl) parcelEl.classList.add('sort-parcel-hit');
        robotWrap.innerHTML = roverSide({ wheelAngle: wheelDeg, face: 'happy' });
        await wait(300, timers);
        if (cancelled) return;
      } else {
        if (parcelEl) parcelEl.classList.add('sort-parcel-miss');
        robotWrap.innerHTML = roverSide({ wheelAngle: wheelDeg, face: 'oops' });
        api.sfx.fail();
        api.fail('color-mismatch');
        statusText.textContent = `第 ${i + 1} 个包裹配错啦！它是${COLOR_ZH[actual]}色，你的程序在这里说是${COLOR_ZH[expected]}色。改一改程序再试试！`;
        api.mascot.say('看看是哪个循环槽配错了，调整一下重跑！', 'oops');
        await wait(500, timers);
        if (cancelled) return;
        busy = false;
        unlockControls();
        updateFormula();
        return;
      }
    }

    if (cancelled) return;
    statusText.textContent = '全部分拣正确！';
    api.sfx.success();
    const stars = attempts === 1 ? 3 : attempts === 2 ? 2 : 1;
    api.mascot.say(stars === 3 ? '一次跑通，太棒了！' : '任务完成啦！', stars === 3 ? 'cheer' : 'happy');
    await wait(600, timers);
    if (cancelled) return;
    api.complete(stars);
  }

  runBtn.addEventListener('click', () => {
    api.sfx.click();
    runProgram();
  });

  api.mascot.say('先看看传送带的颜色规律，再拼程序吧！', 'idle', 4200);

  return {
    destroy() {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
      if (prefixSeq) prefixSeq.destroy();
      bodySeq.destroy();
    },
  };
}

let activeHandle = null;

export default {
  id: 'sort',
  title: '流水线密码',
  icon: '📦',
  init(container, api) {
    injectStylesOnce();
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
