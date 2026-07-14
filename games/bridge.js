/* Precision Bridge — checkpoints, battery and wheel-change engineering challenge. */

import { bridgeScene, bridgeRoverX, roverSideWheeled } from './mission-art.js';
import { BRIDGE_WHEELS, getBridgeMission, evaluateBridgePlan, planMetrics, scoreBridgePlan } from './bridge-engine.js';

const MOVE_BASE = 280;
const MOVE_PER_STEP = 90;
const SWAP_MS = 360;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BX = 120, BW = 64, BY = 150;
const DECK_TOP_PCT = ((BY + 13) / 260) * 100;
const sceneWidth = (steps) => BX + steps * BW + 130;

let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .bridge-page { display:grid; gap:14px; }
    .bridge-stage-card,.bridge-console-card { min-width:0; }
    .bridge-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px; }
    .bridge-title { margin:0; font-size:clamp(18px,3vw,27px); color:#10233C; }
    .bridge-brief { margin:3px 0 0; color:#40516C; font-weight:750; font-size:clamp(11px,1.6vw,14px); }
    .bridge-level { flex:none; border-radius:999px; padding:7px 11px; background:#063D48; color:#fff; font-size:12px; font-weight:900; }
    .bridge-scene-outer { position:relative; overflow:hidden; border-radius:18px; background:linear-gradient(#FFF2D5 0 42%,#BCE8F1 43% 100%); min-height:180px; display:flex; align-items:center; justify-content:center; }
    .bridge-scene-inner { position:relative; width:100%; min-width:0; }
    .bridge-scene-inner > svg { width:100%; height:auto; display:block; }
    .bridge-rover-pos { position:absolute; left:0; top:${DECK_TOP_PCT}%; width:11%; aspect-ratio:150/110; transform:translate(-50%,-50%); pointer-events:none; filter:drop-shadow(0 5px 5px rgba(0,0,0,.28)); }
    .bridge-rover-pos svg { width:100%; height:100%; display:block; }
    .bridge-rover-pos.is-swap { animation:bridge-swap ${SWAP_MS}ms ease; }
    .bridge-rover-pos.is-fall { animation:bridge-fall .55s ease forwards; }
    @keyframes bridge-swap { 50% { transform:translate(-50%,-50%) scale(.76); filter:drop-shadow(0 0 16px #F5C518) brightness(1.3); } }
    @keyframes bridge-fall { to { transform:translate(-50%,130%) rotate(35deg); opacity:.2; } }
    .bridge-markers { position:absolute; inset:0; pointer-events:none; }
    .bridge-marker { position:absolute; top:7%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; color:#17344D; font-size:10px; font-weight:900; }
    .bridge-marker::after { content:""; width:3px; height:36px; background:repeating-linear-gradient(#F5C518 0 6px,#17264B 6px 12px); border-radius:3px; }
    .bridge-status-row { margin-top:8px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .bridge-status { min-height:1.4em; font-weight:850; color:#253C58; font-size:12px; }
    .bridge-battery { flex:none; display:flex; gap:7px; align-items:center; padding:6px 10px; border-radius:999px; background:#E8F6EA; color:#176536; font-size:11px; font-weight:900; }
    .bridge-battery.is-hot { background:#FFF0DC; color:#A44C00; }
    .bridge-wheel-guide { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; margin-bottom:10px; }
    .bridge-wheel-spec { padding:8px; border-radius:13px; background:#F5F7FA; border:2px solid #DCE2E8; text-align:center; font-size:10px; font-weight:850; line-height:1.35; }
    .bridge-wheel-dot { display:block; width:22px; height:22px; border:5px solid currentColor; border-radius:50%; margin:0 auto 4px; box-shadow:inset 0 0 0 2px #fff; }
    .bridge-plan { display:grid; gap:7px; }
    .bridge-leg { display:grid; grid-template-columns:minmax(100px,1fr) minmax(140px,1.55fr) auto; align-items:center; gap:8px; padding:8px; border-radius:14px; background:#fff; border:2px solid #D8E1EA; }
    .bridge-leg-title { font-size:11px; font-weight:900; color:#263C55; }
    .bridge-leg-title strong { display:block; font-size:14px; color:#0A7585; }
    .bridge-wheel-buttons { display:flex; gap:5px; }
    .bridge-wheel-btn { flex:1; min-width:0; border:2px solid #CAD4DE; background:#F8FAFC; border-radius:10px; padding:6px 4px; font-size:10px; line-height:1.2; font-weight:850; color:#3C4C61; }
    .bridge-wheel-btn.is-active { border-color:var(--wheel-color); background:color-mix(in srgb,var(--wheel-color) 12%,white); color:var(--wheel-color); box-shadow:0 3px 0 color-mix(in srgb,var(--wheel-color) 50%,#333); }
    .bridge-stepper { display:flex; align-items:center; gap:6px; }
    .bridge-revs { min-width:30px; text-align:center; font-size:23px; font-weight:950; color:#10233C; }
    .bridge-metrics { margin-top:9px; padding:9px 11px; border-radius:13px; background:#FFF8D9; display:flex; justify-content:space-between; gap:10px; color:#55450C; font-size:11px; font-weight:900; }
    .bridge-run { width:100%; margin-top:9px; }
    @media (min-width:820px) { .bridge-page { grid-template-columns:minmax(420px,1.12fr) minmax(390px,.88fr); } .bridge-stage-card { display:flex; flex-direction:column; } .bridge-scene-outer { flex:1; } }
    @media (min-width:700px) and (max-height:840px) { .bridge-page { gap:10px; } .bridge-stage-card,.bridge-console-card { padding:12px !important; } .bridge-scene-outer { min-height:250px; } .bridge-head { margin-bottom:3px; } .bridge-brief { font-size:10.5px; } .bridge-wheel-guide { margin-bottom:5px; } .bridge-wheel-spec { padding:4px; } .bridge-wheel-dot { width:15px;height:15px;border-width:3px; } .bridge-plan { gap:4px; } .bridge-leg { padding:5px; } .bridge-wheel-btn { padding:4px 3px; font-size:9px; } .bridge-revs { font-size:18px; } .bridge-stepper .brick-btn { min-height:30px; } .bridge-metrics { margin-top:5px;padding:6px; } .bridge-run { margin-top:5px;min-height:38px!important; } }
    @media (max-width:620px) { .bridge-wheel-guide { grid-template-columns:1fr; } .bridge-leg { grid-template-columns:1fr; } .bridge-wheel-buttons { order:2; } .bridge-stepper { justify-content:center; } }
  `;
  document.head.appendChild(style);
}

let apiRef = null;
let mission = null;
let plan = [];
let attempts = 0;
let busy = false;
let destroyed = false;
let roverEl = null;
let containerRef = null;

function xPercent(step) { return bridgeRoverX(step, mission.length) / sceneWidth(mission.length) * 100; }
function wheel(id) { return BRIDGE_WHEELS[id]; }
function paintRover(wheelId, face = 'happy', wheelAngle = 0) { if (roverEl) roverEl.innerHTML = roverSideWheeled({ face, wheelAngle, wheelScale: wheel(wheelId).scale }); }
function placeRover(step, instant = false) { if (!roverEl) return; if (instant) roverEl.style.transition = 'none'; roverEl.style.left = `${xPercent(step)}%`; if (instant) { void roverEl.offsetWidth; roverEl.style.transition = ''; } }
function setStatus(text) { const el = containerRef?.querySelector('#bridge-status'); if (el) el.textContent = text; }
function setControls(enabled) { containerRef?.querySelectorAll('button').forEach((el) => { el.disabled = !enabled; }); }
function markerLeft(step) { return `${xPercent(step)}%`; }

function buildDOM(container) {
  const guide = mission.wheels.map((id) => { const w = wheel(id); return `<div class="bridge-wheel-spec" style="color:${w.color}"><span class="bridge-wheel-dot"></span>${w.label}<br>1 圈 = ${w.stepsPerRev} 步 · ${w.energyPerRev} 电</div>`; }).join('');
  const markers = mission.targets.map((target, index) => `<span class="bridge-marker" style="left:${markerLeft(target)}">${index === mission.targets.length - 1 ? '终点' : `检查 ${index + 1}`} · ${target}</span>`).join('');
  const rows = mission.targets.map((target, index) => `<div class="bridge-leg" data-leg="${index}"><div class="bridge-leg-title">第 ${index + 1} 段<strong>停在第 ${target} 格</strong></div><div class="bridge-wheel-buttons">${mission.wheels.map((id) => `<button class="bridge-wheel-btn" data-leg="${index}" data-wheel="${id}" style="--wheel-color:${wheel(id).color}">${wheel(id).label}<br>${wheel(id).stepsPerRev}步/圈</button>`).join('')}</div><div class="bridge-stepper"><button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-leg="${index}" data-dir="-1" aria-label="减少圈数">−</button><span class="bridge-revs" data-leg="${index}">1</span><button class="brick-btn brick-btn--gray brick-btn--icon brick-btn--sm" data-leg="${index}" data-dir="1" aria-label="增加圈数">＋</button></div></div>`).join('');
  container.innerHTML = `<div class="bridge-page"><section class="brick-card brick-card--cat-bridge bridge-stage-card"><div class="bridge-head"><div><h2 class="bridge-title">${mission.title}</h2><p class="bridge-brief">${mission.brief}</p></div><span class="bridge-level">MISSION ${mission.level}/10</span></div><div class="bridge-scene-outer"><div class="bridge-scene-inner">${bridgeScene({ steps: mission.length })}<div class="bridge-markers">${markers}</div><div class="bridge-rover-pos" id="bridge-rover"></div></div></div><div class="bridge-status-row"><span class="bridge-status" id="bridge-status">先计算每段圈数，再一次性试车</span><span class="bridge-battery" id="bridge-battery">POWER 0/${mission.battery}</span></div></section><aside class="brick-card brick-card--yellow bridge-console-card"><div class="bridge-wheel-guide">${guide}</div><div class="bridge-plan">${rows}</div><div class="bridge-metrics"><span id="bridge-energy">计划能耗：0/${mission.battery}</span><span id="bridge-changes">换轮：0/${mission.maxChanges}</span></div><div class="game-action-dock"><button class="brick-btn brick-btn--green brick-btn--lg bridge-run" id="bridge-run">▶ 执行工程方案</button></div></aside></div>`;
}

function updatePlanUI() {
  const metrics = planMetrics(plan);
  containerRef.querySelector('#bridge-energy').textContent = `计划能耗：${metrics.energy}/${mission.battery}`;
  containerRef.querySelector('#bridge-changes').textContent = `换轮：${metrics.changes}/${mission.maxChanges}`;
  const battery = containerRef.querySelector('#bridge-battery'); battery.textContent = `POWER ${metrics.energy}/${mission.battery}`; battery.classList.toggle('is-hot', metrics.energy > mission.battery);
  containerRef.querySelectorAll('.bridge-wheel-btn').forEach((btn) => btn.classList.toggle('is-active', plan[Number(btn.dataset.leg)].wheel === btn.dataset.wheel));
  plan.forEach((segment, index) => { containerRef.querySelector(`.bridge-revs[data-leg="${index}"]`).textContent = String(segment.revs); });
}

function animateMove(from, to, wheelId) {
  return new Promise((resolve) => {
    const duration = MOVE_BASE + Math.abs(to - from) * MOVE_PER_STEP;
    const start = performance.now();
    const w = wheel(wheelId);
    function tick(now) {
      if (destroyed) { resolve(); return; }
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const position = from + (to - from) * eased;
      roverEl.style.left = `${xPercent(position)}%`;
      paintRover(wheelId, 'effort', (360 * Math.abs(position - from) / w.stepsPerRev) % 360);
      if (p < 1) requestAnimationFrame(tick); else resolve();
    }
    requestAnimationFrame(tick);
  });
}
async function swapWheel(wheelId) { roverEl.classList.remove('is-swap'); void roverEl.offsetWidth; roverEl.classList.add('is-swap'); apiRef.sfx.snap(); paintRover(wheelId, 'effort'); await wait(SWAP_MS); roverEl.classList.remove('is-swap'); }
function failText(reason, result) {
  const target = result.target || mission.targets[result.failedLeg] || mission.length;
  const map = { battery:'电量耗尽了：换一种更省电的轮子组合', 'overshoot-checkpoint':`冲过第 ${target} 格检查站了`, 'undershoot-checkpoint':`还没到第 ${target} 格检查站`, 'overshoot-finish':'冲过终点，掉进水里了', 'undershoot-finish':'没有到达终点', 'too-many-changes':'换轮次数超出任务上限', 'invalid-wheel':'有一段工程方案还没配置好' };
  return map[reason] || '工程方案需要重新计算';
}
async function runPlan() {
  if (busy) return;
  busy = true; attempts += 1; setControls(false); roverEl.classList.remove('is-fall'); placeRover(0, true); paintRover(plan[0].wheel); setStatus('方案锁定，开始试车…'); apiRef.sfx.click();
  const result = evaluateBridgePlan(mission, plan);
  let previousWheel = null;
  for (const leg of result.trace) {
    if (destroyed) return;
    if (previousWheel && previousWheel !== leg.wheel) { setStatus(`🔧 第 ${leg.index + 1} 段换装${wheel(leg.wheel).label}`); await swapWheel(leg.wheel); }
    previousWheel = leg.wheel;
    setStatus(`第 ${leg.index + 1} 段行驶中 · 目标第 ${leg.target} 格`);
    await animateMove(leg.from, leg.to, leg.wheel);
    if (!result.ok && result.failedLeg === leg.index) break;
    setStatus(leg.target === mission.length ? '抵达终点！' : `✅ 第 ${leg.target} 格检查完成`); apiRef.sfx.snap(); await wait(360);
  }
  if (destroyed) return;
  if (!result.ok) {
    const text = failText(result.reason, result); setStatus(`⚠️ ${text}`); apiRef.fail(result.reason); paintRover(previousWheel || plan[0].wheel, 'oops');
    if (result.reason.includes('overshoot')) { roverEl.classList.add('is-fall'); await wait(560); }
    await wait(520); roverEl.classList.remove('is-fall'); placeRover(0, true); paintRover(plan[0].wheel); busy = false; setControls(true); return;
  }
  const rawStars = scoreBridgePlan(mission, result); const stars = attempts === 1 ? rawStars : Math.min(rawStars, attempts === 2 ? 2 : 1);
  setStatus(`🏆 工程成功 · 能耗 ${result.energy}/${mission.battery} · 换轮 ${result.changes} 次`); paintRover(previousWheel, 'happy'); apiRef.sfx.success(); apiRef.mascot.say(stars === 3 ? '一次通过，资源规划大师！' : '安全抵达！还可以挑战更省电的方案。', 'cheer'); await wait(520); if (!destroyed) apiRef.complete(stars); busy = false; setControls(true);
}

export default {
  id: 'bridge', title: '精准渡桥', icon: '≋',
  init(container, api) {
    injectStylesOnce(); apiRef = api; containerRef = container; mission = getBridgeMission(api.level, { variant: api.variant, rand: api.rand }); attempts = 0; busy = false; destroyed = false;
    plan = mission.targets.map((_, index) => ({ wheel: mission.wheels[index % mission.wheels.length], revs: 1 }));
    buildDOM(container); roverEl = container.querySelector('#bridge-rover'); placeRover(0, true); paintRover(plan[0].wheel); updatePlanUI();
    container.querySelectorAll('.bridge-wheel-btn').forEach((btn) => btn.addEventListener('click', () => { if (busy) return; plan[Number(btn.dataset.leg)].wheel = btn.dataset.wheel; api.sfx.click(); updatePlanUI(); }));
    container.querySelectorAll('.bridge-stepper button').forEach((btn) => btn.addEventListener('click', () => { if (busy) return; const index = Number(btn.dataset.leg); plan[index].revs = Math.max(0, Math.min(12, plan[index].revs + Number(btn.dataset.dir))); api.sfx.click(); updatePlanUI(); }));
    container.querySelector('#bridge-run').addEventListener('click', runPlan);
    api.mascot.say('每段都要精准停在检查点，界面不会提前告诉你答案。', 'idle', 0);
    if (typeof window !== 'undefined' && window.__LSFA_TEST__) window.__lsfaBridge = { mission, getPlan: () => plan.map((p) => ({ ...p })), setPlan(next) { plan = next.map((p) => ({ ...p })); updatePlanUI(); }, evaluate: () => evaluateBridgePlan(mission, plan) };
  },
  destroy() { destroyed = true; busy = false; roverEl = null; containerRef = null; },
};
