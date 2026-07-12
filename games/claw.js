/* games/claw.js
 * 抓娃娃机 —— 侧视机械臂场景（inline SVG + CSS transition 分段演出）。
 * 三个乐高风滑杆：偏航角(0-180°) / 下降圈数(1-4) / 夹爪力(1-10N)。
 * 目标物随机位置（由 yaw+drop 反推）与脆弱度（力太大=碎，力太小=滑落）。
 * 全对（转到位+降到位+力刚好）才抓起入篮。星级按尝试次数：1次=3星，2-3次=2星，≥4次=1星。
 * 协议见 API.md：export default {id,title,icon,init,destroy}。
 */

/* --------------------------------------------------------------------------
 * 几何常量（SVG viewBox 640x380 的场景坐标系）
 * -------------------------------------------------------------------------- */
const VB_W = 640;
const VB_H = 380;
const PIVOT = { x: 320, y: 34 };   // 机械臂肩关节（固定枢轴）
const ARM_LEN = 150;               // 大臂长度
const UNIT_PER_TURN = 40;          // 每圈下降的像素长度
const HOME_YAW = 90;               // 静止姿态：垂直向下
const BASE_TIP = { x: PIVOT.x + ARM_LEN, y: PIVOT.y }; // 未旋转时的臂端基准点（本地坐标系用，画缆绳/爪子都以此为原点）
const BASKET = { x: 74, y: 320 };  // 篮子中心
const FLOOR_Y = 350;

const YAW_CHOICES = [30, 50, 70, 90, 110, 130, 150];
const ITEM_POOL = [
  { icon: '🥛', name: '玻璃杯', fragile: true, forceMin: 3, forceMax: 5, hint: '很脆弱，力道要刚刚好～' },
  { icon: '🥚', name: '鸡蛋', fragile: true, forceMin: 3, forceMax: 4, hint: '轻轻地，别捏碎啦～' },
  { icon: '🧱', name: '积木块', fragile: false, forceMin: 6, forceMax: 8, hint: '结结实实的，可以抓紧一点！' },
  { icon: '🧸', name: '小玩偶', fragile: false, forceMin: 6, forceMax: 8, hint: '毛茸茸的，抓稳当点！' },
];

function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function tipWorldPos(yawDeg) {
  const rad = (yawDeg * Math.PI) / 180;
  return { x: PIVOT.x + ARM_LEN * Math.cos(rad), y: PIVOT.y + ARM_LEN * Math.sin(rad) };
}

/** cable-group（臂端挂缆绳的容器）是 arm-group 的兄弟节点而非子节点，
 * 所以必须用 JS 算出当前 yaw 对应的臂端世界坐标，再 translate 过去对齐——
 * 任何"回到某个 yaw"的操作都要经过这个函数，不能直接写死 translate(0,0)。 */
function cableGroupTransform(yawDeg) {
  const tip = tipWorldPos(yawDeg);
  return `translate(${tip.x - BASE_TIP.x}px, ${tip.y - BASE_TIP.y}px)`;
}

function generateTarget() {
  const item = pick(ITEM_POOL);
  const yaw = pick(YAW_CHOICES);
  const dropTurns = randInt(1, 4);
  const tip = tipWorldPos(yaw);
  const pos = { x: tip.x, y: tip.y + dropTurns * UNIT_PER_TURN };
  return { ...item, yaw, dropTurns, pos };
}

/* --------------------------------------------------------------------------
 * 一次性注入本关专属样式
 * -------------------------------------------------------------------------- */
let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .claw-layout { display:flex; flex-wrap:wrap; gap:16px; align-items:flex-start; }
    .claw-stage-card { flex:1 1 380px; min-width:280px; padding-top:22px; }
    .claw-controls-card { flex:1 1 260px; min-width:240px; display:flex; flex-direction:column; gap:14px; }
    .claw-svg { width:100%; height:auto; display:block; touch-action:none; }
    .claw-slider-row { display:flex; flex-direction:column; gap:4px; }
    .claw-slider-label { display:flex; justify-content:space-between; align-items:baseline; font-weight:800; font-size:14px; }
    .claw-slider-label .val { color: var(--cat-claw, #0055BF); font-size:17px; }
    .claw-slider-row input[type=range] {
      -webkit-appearance:none; appearance:none; width:100%; height:14px; border-radius:999px;
      background: linear-gradient(90deg, var(--cat-claw-light,#4C8DFF), var(--cat-claw,#0055BF));
      box-shadow: inset 0 2px 4px rgba(0,0,0,.2);
      touch-action:none;
    }
    .claw-slider-row input[type=range]::-webkit-slider-thumb {
      -webkit-appearance:none; width:32px; height:32px; border-radius:50%;
      background: radial-gradient(circle at 32% 28%, #fff, var(--lego-yellow,#F5C518) 55%, var(--lego-yellow-dark,#B8890A) 100%);
      border:2px solid var(--lego-yellow-dark,#B8890A); box-shadow:0 3px 0 rgba(0,0,0,.18);
      cursor:grab;
    }
    .claw-slider-row input[type=range]::-moz-range-thumb {
      width:32px; height:32px; border-radius:50%;
      background: radial-gradient(circle at 32% 28%, #fff, var(--lego-yellow,#F5C518) 55%, var(--lego-yellow-dark,#B8890A) 100%);
      border:2px solid var(--lego-yellow-dark,#B8890A); box-shadow:0 3px 0 rgba(0,0,0,.18);
    }
    .claw-slider-row input[type=range]:disabled { opacity:.5; }
    .claw-hint-box { font-size:13px; color:var(--ink-500); background:var(--paper-100); border-radius:12px; padding:8px 12px; }
    .claw-attempts { font-size:13px; color:var(--ink-500); text-align:center; }
    .claw-arm-bar { fill: var(--lego-yellow, #F5C518); stroke:#B8890A; stroke-width:3; }
    .claw-pivot-mount { fill:#9AA3AB; stroke:#656D74; stroke-width:2; }
    .claw-cable { fill:#7A828A; }
    .claw-pincer { fill: var(--lego-orange, #E8710A); stroke:#A34D00; stroke-width:2; transition: transform .3s ease; }
    .claw-basket { fill:#B8890A; stroke:#8E0B0D; stroke-width:2; }
    .claw-floor { stroke:#C7CDD3; stroke-width:3; stroke-dasharray:8 6; }
    .claw-item-hint { font-size:13px; fill: var(--ink-500); }
    #claw-arm-group, #claw-cable-group, #claw-hand-group { transition: transform .55s cubic-bezier(.34,1.2,.4,1); }
    .claw-crack-mark { font-size:30px; opacity:0; transition: opacity .15s ease; }
    .claw-crack-mark.show { opacity:1; }
  `;
  document.head.appendChild(style);
}

/* --------------------------------------------------------------------------
 * SVG 场景骨架
 * -------------------------------------------------------------------------- */
function buildSceneSVG() {
  return `
  <svg class="claw-svg no-select" viewBox="0 0 ${VB_W} ${VB_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="抓娃娃机场景">
    <line class="claw-floor" x1="20" y1="${FLOOR_Y}" x2="${VB_W - 20}" y2="${FLOOR_Y}"/>
    <rect class="claw-basket" x="${BASKET.x - 46}" y="${BASKET.y - 14}" width="92" height="46" rx="10"/>
    <text x="${BASKET.x}" y="${BASKET.y + 40}" text-anchor="middle" font-size="30">🧺</text>

    <!-- 顶部固定轨道装饰 -->
    <rect x="${PIVOT.x - 60}" y="14" width="120" height="12" rx="6" fill="#9AA3AB" stroke="#656D74" stroke-width="2"/>

    <g id="claw-arm-group" style="transform-origin:${PIVOT.x}px ${PIVOT.y}px; transform: rotate(${HOME_YAW}deg);">
      <circle class="claw-pivot-mount" cx="${PIVOT.x}" cy="${PIVOT.y}" r="12"/>
      <rect class="claw-arm-bar" x="${PIVOT.x}" y="${PIVOT.y - 7}" width="${ARM_LEN}" height="14" rx="7"/>
    </g>

    <g id="claw-cable-group" style="transform-origin:${BASE_TIP.x}px ${BASE_TIP.y}px; transform: ${cableGroupTransform(HOME_YAW)};">
      <rect id="claw-cable-rect" class="claw-cable" x="${BASE_TIP.x - 4}" y="${BASE_TIP.y}" width="8" height="0"/>
      <g id="claw-hand-group" style="transform-origin:${BASE_TIP.x}px ${BASE_TIP.y}px; transform: translateY(0px);">
        <path id="claw-pincer-l" class="claw-pincer" style="transform-origin:${BASE_TIP.x - 3}px ${BASE_TIP.y}px;"
          d="M ${BASE_TIP.x - 3} ${BASE_TIP.y} L ${BASE_TIP.x - 22} ${BASE_TIP.y + 26} L ${BASE_TIP.x - 12} ${BASE_TIP.y + 30} L ${BASE_TIP.x - 3} ${BASE_TIP.y + 10} Z"/>
        <path id="claw-pincer-r" class="claw-pincer" style="transform-origin:${BASE_TIP.x + 3}px ${BASE_TIP.y}px;"
          d="M ${BASE_TIP.x + 3} ${BASE_TIP.y} L ${BASE_TIP.x + 22} ${BASE_TIP.y + 26} L ${BASE_TIP.x + 12} ${BASE_TIP.y + 30} L ${BASE_TIP.x + 3} ${BASE_TIP.y + 10} Z"/>
      </g>
    </g>

    <g id="claw-item-group">
      <text id="claw-item-text" font-size="34" text-anchor="middle" dominant-baseline="central"></text>
      <text id="claw-item-crack" class="claw-crack-mark" text-anchor="middle" dominant-baseline="central">💥</text>
      <text id="claw-item-hint" class="claw-item-hint" text-anchor="middle"></text>
    </g>
  </svg>`;
}

/* --------------------------------------------------------------------------
 * 主逻辑
 * -------------------------------------------------------------------------- */
function wait(ms, timers) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    timers.push(t);
  });
}

function render(container, api) {
  injectStylesOnce();
  let cancelled = false;
  const timers = [];
  let attempts = 0;
  let running = false;
  let target = generateTarget();

  container.innerHTML = `
    <div class="claw-layout">
      <div class="brick-card brick-card--cat-claw claw-stage-card">
        ${buildSceneSVG()}
      </div>
      <div class="brick-card brick-card--yellow claw-controls-card">
        <p class="title-sm" style="margin:0;">调好三个滑杆，把它稳稳抓进篮子！</p>
        <div class="claw-slider-row">
          <div class="claw-slider-label"><span>🎯 转向角度 Yaw</span><span class="val" id="claw-yaw-val">90°</span></div>
          <input type="range" id="claw-yaw-input" min="0" max="180" step="5" value="90">
        </div>
        <div class="claw-slider-row">
          <div class="claw-slider-label"><span>⬇️ 下降圈数 Drop</span><span class="val" id="claw-drop-val">1 圈</span></div>
          <input type="range" id="claw-drop-input" min="1" max="4" step="1" value="1">
        </div>
        <div class="claw-slider-row">
          <div class="claw-slider-label"><span>🤏 夹爪力 Force</span><span class="val" id="claw-force-val">5N</span></div>
          <input type="range" id="claw-force-input" min="1" max="10" step="1" value="5">
        </div>
        <div class="claw-hint-box" id="claw-hint-box"></div>
        <button class="brick-btn brick-btn--blue brick-btn--lg" id="claw-run-btn">抓取！</button>
        <div class="claw-attempts" id="claw-attempts-label">已尝试 0 次</div>
      </div>
    </div>
  `;

  const armGroupEl = container.querySelector('#claw-arm-group');
  const cableGroupEl = container.querySelector('#claw-cable-group');
  const cableRectEl = container.querySelector('#claw-cable-rect');
  const handGroupEl = container.querySelector('#claw-hand-group');
  const pincerL = container.querySelector('#claw-pincer-l');
  const pincerR = container.querySelector('#claw-pincer-r');
  const itemTextEl = container.querySelector('#claw-item-text');
  const itemCrackEl = container.querySelector('#claw-item-crack');
  const itemHintEl = container.querySelector('#claw-item-hint');
  const yawInput = container.querySelector('#claw-yaw-input');
  const dropInput = container.querySelector('#claw-drop-input');
  const forceInput = container.querySelector('#claw-force-input');
  const yawVal = container.querySelector('#claw-yaw-val');
  const dropVal = container.querySelector('#claw-drop-val');
  const forceVal = container.querySelector('#claw-force-val');
  const hintBox = container.querySelector('#claw-hint-box');
  const runBtn = container.querySelector('#claw-run-btn');
  const attemptsLabel = container.querySelector('#claw-attempts-label');

  function placeItem() {
    itemTextEl.setAttribute('x', target.pos.x);
    itemTextEl.setAttribute('y', target.pos.y);
    itemTextEl.textContent = target.icon;
    itemCrackEl.setAttribute('x', target.pos.x);
    itemCrackEl.setAttribute('y', target.pos.y);
    itemCrackEl.classList.remove('show');
    itemHintEl.setAttribute('x', target.pos.x);
    itemHintEl.setAttribute('y', Math.min(FLOOR_Y - 4, target.pos.y + 24));
    itemHintEl.textContent = `${target.name}：${target.hint}`;
  }

  function resetArmHome() {
    armGroupEl.style.transform = `rotate(${HOME_YAW}deg)`;
    cableGroupEl.style.transform = cableGroupTransform(HOME_YAW);
    cableRectEl.style.height = '0px';
    handGroupEl.style.transform = 'translateY(0px)';
    pincerL.style.transform = 'rotate(0deg)';
    pincerR.style.transform = 'rotate(0deg)';
  }

  function setControlsDisabled(disabled) {
    yawInput.disabled = disabled;
    dropInput.disabled = disabled;
    forceInput.disabled = disabled;
    runBtn.disabled = disabled;
  }

  function updateReadouts() {
    yawVal.textContent = `${yawInput.value}°`;
    dropVal.textContent = `${dropInput.value} 圈`;
    forceVal.textContent = `${forceInput.value}N`;
  }

  yawInput.addEventListener('input', updateReadouts);
  dropInput.addEventListener('input', updateReadouts);
  forceInput.addEventListener('input', updateReadouts);

  async function runAttempt() {
    if (running) return;
    running = true;
    attempts += 1;
    attemptsLabel.textContent = `已尝试 ${attempts} 次`;
    setControlsDisabled(true);
    itemCrackEl.classList.remove('show');

    const yaw = Number(yawInput.value);
    const drop = Number(dropInput.value);
    const force = Number(forceInput.value);
    const tip = tipWorldPos(yaw);
    const dx = tip.x - BASE_TIP.x;
    const dy = tip.y - BASE_TIP.y;

    api.mascot.say('抓取中……', 'think', 1600);

    // 阶段①：转
    armGroupEl.style.transform = `rotate(${yaw}deg)`;
    cableGroupEl.style.transform = `translate(${dx}px, ${dy}px)`;
    await wait(620, timers);
    if (cancelled) return;

    // 阶段②：降
    const dropPx = drop * UNIT_PER_TURN;
    cableRectEl.style.height = `${dropPx}px`;
    handGroupEl.style.transform = `translateY(${dropPx}px)`;
    await wait(520, timers);
    if (cancelled) return;

    // 阶段③：夹
    const closeAngle = 10 + force * 3;
    pincerL.style.transform = `rotate(${closeAngle}deg)`;
    pincerR.style.transform = `rotate(${-closeAngle}deg)`;
    api.sfx.snap();
    await wait(360, timers);
    if (cancelled) return;

    const posOk = yaw === target.yaw && drop === target.dropTurns;
    const forceOk = force >= target.forceMin && force <= target.forceMax;
    const tooWeak = posOk && force < target.forceMin;
    const tooStrong = posOk && force > target.forceMax;
    const success = posOk && forceOk;

    if (success) {
      // 抓到了！item 跟随手爪
      itemTextEl.style.transition = 'opacity .2s ease';
    } else if (tooStrong) {
      itemCrackEl.classList.add('show');
      itemTextEl.style.opacity = '0.35';
      api.sfx.fail();
      container.classList.add('anim-shake');
      await wait(500, timers);
      if (cancelled) return;
      container.classList.remove('anim-shake');
      itemTextEl.style.opacity = '1';
    } else if (tooWeak) {
      api.sfx.fail();
    } else {
      api.sfx.fail();
    }

    // 阶段④：升
    handGroupEl.style.transform = 'translateY(0px)';
    if (success) {
      itemTextEl.setAttribute('x', tip.x);
      itemTextEl.setAttribute('y', tip.y);
    }
    await wait(520, timers);
    if (cancelled) return;

    // 阶段⑤：回
    armGroupEl.style.transform = `rotate(${HOME_YAW}deg)`;
    cableGroupEl.style.transform = cableGroupTransform(HOME_YAW);
    cableRectEl.style.height = '0px';
    pincerL.style.transform = 'rotate(0deg)';
    pincerR.style.transform = 'rotate(0deg)';
    if (success) {
      itemTextEl.setAttribute('x', BASKET.x);
      itemTextEl.setAttribute('y', BASKET.y);
    }
    await wait(600, timers);
    if (cancelled) return;

    if (success) {
      itemTextEl.style.opacity = '0';
      itemHintEl.textContent = '';
      api.mascot.say('抓进篮子啦！', 'cheer');
      const stars = attempts === 1 ? 3 : attempts <= 3 ? 2 : 1;
      api.complete(stars);
      return;
    }

    // 失败：给理由 + 复位，允许再次尝试
    let reason = 'missed-position';
    let line = '没转到位/没降到位，再瞄准一次！';
    if (tooStrong) { reason = 'crushed'; line = target.fragile ? '太用力啦，捏碎了……轻一点！' : '力道太大，它滑走啦！'; }
    else if (tooWeak) { reason = 'too-weak'; line = '力气不够，它从爪子里溜走了！'; }
    api.fail(reason);
    api.mascot.say(line, 'oops');
    itemTextEl.setAttribute('x', target.pos.x);
    itemTextEl.setAttribute('y', target.pos.y);
    itemCrackEl.classList.remove('show');

    setControlsDisabled(false);
    running = false;
  }

  runBtn.addEventListener('click', () => {
    api.sfx.click();
    runAttempt();
  });

  placeItem();
  resetArmHome();
  updateReadouts();
  api.mascot.say('转动滑杆瞄准目标，调好下降圈数和夹爪力，把它稳稳抓进篮子里吧！', 'idle', 4200);

  return {
    destroy() {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    },
  };
}

let activeHandle = null;

export default {
  id: 'claw',
  title: '抓娃娃机',
  icon: '🕹️',
  init(container, api) {
    activeHandle = render(container, api);
  },
  destroy() {
    if (activeHandle) activeHandle.destroy();
    activeHandle = null;
  },
};
