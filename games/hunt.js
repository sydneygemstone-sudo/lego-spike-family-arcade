/* Grid Quest — ten handcrafted missions with testable rules in hunt-engine.js. */

import { createTray, createSequence } from '../js/blocks-ui.js';
import { roverTop, tiles } from './mission-art.js';
import {
  HUNT_COMMANDS, getHuntMission, createHuntState, stepHunt,
  switchesActive, scoreHuntRun, solveHuntMission,
} from './hunt-engine.js';

const MOVE_MS = 330;
const TURN_MS = 220;
const STEP_GAP_MS = 110;
const PORTAL_MS = 420;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cellKey = (col, row) => `${col},${row}`;

let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .hunt-page { --hunt-size:5; display:grid; gap:14px; }
    .hunt-stage-card, .hunt-console { min-width:0; }
    .hunt-mission-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px; }
    .hunt-mission-no { flex:none; padding:7px 11px; border-radius:999px; background:#101C39; color:#fff; font-weight:900; font-size:12px; }
    .hunt-title { margin:0; font-size:clamp(18px,3vw,27px); color:#101C39; }
    .hunt-brief { margin:3px 0 0; font-weight:750; color:var(--ink-700); font-size:clamp(12px,1.7vw,15px); }
    .hunt-grid-outer { display:flex; align-items:center; justify-content:center; min-height:0; }
    .hunt-grid { position:relative; display:grid; grid-template-columns:repeat(var(--hunt-size),1fr); grid-template-rows:repeat(var(--hunt-size),1fr); width:min(76vw,46vh,540px); aspect-ratio:1; overflow:hidden; border-radius:18px; border:3px solid #17264B; box-shadow:0 14px 34px rgba(16,28,57,.18), inset 0 0 0 2px rgba(255,255,255,.35); background:#B9DC83; }
    .hunt-cell { position:relative; line-height:0; overflow:hidden; }
    .hunt-cell > svg { width:100%; height:100%; display:block; }
    .hunt-overlay { position:absolute; inset:8%; display:grid; place-items:center; line-height:1; z-index:2; filter:drop-shadow(0 3px 2px rgba(0,0,0,.24)); }
    .hunt-overlay svg { width:100%; height:100%; display:block; }
    .hunt-pit { inset:17% 10%; border-radius:50%; background:radial-gradient(ellipse at 50% 45%,#020616 0 42%,#25375B 45% 60%,#6E7890 63% 68%,transparent 70%); box-shadow:inset 0 6px 10px #000; }
    .hunt-crate { inset:13%; border:4px solid #6A3818; border-radius:10px; background:linear-gradient(135deg,#D9913B,#A95620); color:#FFF2C5; font-size:clamp(20px,4.4vw,42px); font-weight:900; }
    .hunt-switch { inset:28%; border-radius:50%; background:#F5C518; border:4px solid #A06A00; box-shadow:0 4px 0 #7D5100,inset 0 4px 0 #FFECA0; }
    .hunt-switch--on { background:#4FD17D; border-color:#176934; box-shadow:0 0 16px #5EF298,inset 0 4px 0 #B7FFD0; }
    .hunt-gem-lock { inset:5%; border:3px solid rgba(108,68,190,.7); border-radius:50%; background:rgba(130,94,220,.17); box-shadow:0 0 18px rgba(108,68,190,.65); }
    .hunt-rover-pos { position:absolute; left:0; top:0; width:calc(100% / var(--hunt-size)); height:calc(100% / var(--hunt-size)); display:grid; place-items:center; z-index:8; transition:left ${MOVE_MS}ms cubic-bezier(.2,.7,.2,1),top ${MOVE_MS}ms cubic-bezier(.2,.7,.2,1); pointer-events:none; filter:drop-shadow(0 5px 5px rgba(0,0,0,.28)); }
    .hunt-rover-rot { width:82%; height:82%; transition:transform ${TURN_MS}ms cubic-bezier(.34,1.3,.4,1); }
    .hunt-rover-body, .hunt-rover-body svg { width:100%; height:100%; display:block; }
    .hunt-rover-body { animation:hunt-idle 2s ease-in-out infinite; }
    .hunt-rover-body.is-bump { animation:hunt-bump .3s ease; }
    .hunt-rover-body.is-jump { animation:hunt-jump ${MOVE_MS}ms ease; }
    .hunt-rover-body.is-portal { animation:hunt-portal ${PORTAL_MS}ms ease; }
    @keyframes hunt-idle { 50% { transform:translateY(-4%); } }
    @keyframes hunt-bump { 40% { transform:scale(1.18,.78); } 70% { transform:scale(.92,1.08); } }
    @keyframes hunt-jump { 45% { transform:translateY(-45%) scale(1.08); } }
    @keyframes hunt-portal { 45% { transform:scale(.12) rotate(170deg); opacity:.2; } 55% { transform:scale(.12) rotate(200deg); opacity:.2; } }
    .hunt-statusbar { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px; min-height:32px; }
    .hunt-status { font-weight:850; color:#243451; font-size:13px; }
    .hunt-lock-state { flex:none; padding:5px 9px; border-radius:999px; background:#F3E9FF; color:#6535A7; font-size:11px; font-weight:900; }
    .hunt-lock-state.is-open { background:#DCF8E5; color:#146A35; }
    .hunt-teaching { border-radius:16px; padding:11px 13px; background:linear-gradient(135deg,#EEF4FF,#F7F2FF); border:2px solid #C9D6F4; color:#263B69; font-size:12px; font-weight:800; line-height:1.45; margin-bottom:10px; }
    .hunt-teaching strong { color:#6B2FA0; }
    .hunt-tray-card, .hunt-seq-card { padding-top:17px !important; }
    .hunt-console { display:grid; gap:10px; }
    .hunt-card-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:3px; }
    .hunt-budget { font-size:11px; font-weight:850; color:#384868; }
    .hunt-actions { display:flex; gap:8px; align-items:center; }
    @media (min-width:760px) and (orientation:landscape) { .hunt-page { grid-template-columns:minmax(380px,1.08fr) minmax(320px,.92fr); align-items:stretch; } .hunt-stage-card { display:flex; flex-direction:column; } .hunt-grid-outer { flex:1; } .hunt-grid { width:min(45vw,55vh,560px); } .hunt-console { align-content:center; } }
    @media (min-width:700px) and (max-height:840px) { .hunt-page { gap:10px; } .hunt-stage-card { padding:13px !important; } .hunt-grid { width:min(44vw,55vh,430px); } .hunt-mission-head { margin-bottom:3px; } .hunt-brief { font-size:11px; } .hunt-teaching { padding:8px 10px; margin-bottom:5px; font-size:10.5px; } .hunt-console { gap:6px; } .hunt-tray-card,.hunt-seq-card { padding:11px !important; } #hunt-tray .blocks-tray { padding:4px 5px 7px; gap:6px; } #hunt-tray .brick-block { min-width:45px; min-height:39px; padding:5px 6px; font-size:9px; } #hunt-seq .blocks-seq { min-height:58px; padding:6px; gap:5px; } #hunt-seq .brick-block { min-width:42px; min-height:36px; padding:4px 5px; font-size:9px; } }
    @media (max-width:759px) { .hunt-grid { width:min(92vw,46vh,480px); } .hunt-mission-head { align-items:center; } }
  `;
  document.head.appendChild(style);
}

let apiRef = null;
let mission = null;
let state = null;
let seq = null;
let seqUnsub = null;
let running = false;
let destroyed = false;
let gridEl = null;
let roverPosEl = null;
let roverRotEl = null;
let roverBodyEl = null;
let angle = 0;

function posStyle(col, row) { return { left: `${col * 100 / mission.size}%`, top: `${row * 100 / mission.size}%` }; }
function moveRover(col, row, instant = false) {
  const p = posStyle(col, row);
  if (instant) roverPosEl.style.transition = 'none';
  roverPosEl.style.left = p.left; roverPosEl.style.top = p.top;
  if (instant) { void roverPosEl.offsetWidth; roverPosEl.style.transition = ''; }
}
function setRoverFace(face = 'happy') { if (roverBodyEl) roverBodyEl.innerHTML = roverTop({ face }); }
function animateBody(className, ms) {
  if (!roverBodyEl) return;
  roverBodyEl.classList.remove(className); void roverBodyEl.offsetWidth; roverBodyEl.classList.add(className);
  setTimeout(() => roverBodyEl?.classList.remove(className), ms);
}
function portalAt(col, row) {
  if (!mission.portals) return null;
  if (mission.portals.a.col === col && mission.portals.a.row === row) return 'a';
  if (mission.portals.b.col === col && mission.portals.b.row === row) return 'b';
  return null;
}
function baseTile() { return tiles.grass(); }
function cellMarkup(col, row) {
  const k = cellKey(col, row);
  let html = baseTile();
  if (mission.rocks.has(k)) html = tiles.rock();
  if (mission.pits.has(k)) html += '<div class="hunt-overlay hunt-pit" aria-label="裂谷"></div>';
  const portal = portalAt(col, row);
  if (portal) html += `<div class="hunt-overlay">${tiles.portal(72, portal === 'a' ? 'purple' : 'blue')}</div>`;
  if (mission.switches.has(k)) html += `<div class="hunt-overlay hunt-switch${state.crates.has(k) ? ' hunt-switch--on' : ''}" aria-label="压力板"></div>`;
  if (state.crates.has(k)) html += '<div class="hunt-overlay hunt-crate" aria-label="箱子">▦</div>';
  if (!state.grabbed && mission.treasure.col === col && mission.treasure.row === row) {
    html += `<div class="hunt-overlay">${tiles.gem()}</div>`;
    if (!switchesActive(mission, state)) html += '<div class="hunt-overlay hunt-gem-lock" aria-label="宝石防护罩"></div>';
  }
  if (mission.start.col === col && mission.start.row === row && !(mission.treasure.col === col && mission.treasure.row === row)) html += `<div class="hunt-overlay" style="inset:52% 8% 5% 55%;opacity:.75">${tiles.flag()}</div>`;
  return html;
}
function renderCells() {
  gridEl.querySelectorAll('.hunt-cell').forEach((cell) => {
    cell.innerHTML = cellMarkup(Number(cell.dataset.col), Number(cell.dataset.row));
  });
  const lock = document.querySelector('#hunt-lock-state');
  if (lock && mission.switches.size) {
    const active = switchesActive(mission, state);
    lock.textContent = active ? 'SHIELD / OPEN' : `SWITCH ${[...mission.switches].filter((k) => state.crates.has(k)).length}/${mission.switches.size}`;
    lock.classList.toggle('is-open', active);
  }
}
function renderGrid() {
  gridEl.innerHTML = '';
  for (let row = 0; row < mission.size; row++) for (let col = 0; col < mission.size; col++) {
    const cell = document.createElement('div'); cell.className = 'hunt-cell'; cell.dataset.col = col; cell.dataset.row = row;
    gridEl.appendChild(cell);
  }
  gridEl.insertAdjacentHTML('beforeend', '<div class="hunt-rover-pos" id="hunt-rover-pos"><div class="hunt-rover-rot" id="hunt-rover-rot"><div class="hunt-rover-body" id="hunt-rover-body"></div></div></div>');
  roverPosEl = gridEl.querySelector('#hunt-rover-pos'); roverRotEl = gridEl.querySelector('#hunt-rover-rot'); roverBodyEl = gridEl.querySelector('#hunt-rover-body');
  setRoverFace(); renderCells(); moveRover(state.col, state.row, true); roverRotEl.style.transform = `rotate(${angle}deg)`;
}

function reasonText(reason) {
  const map = { edge:'地图边缘挡住了', rock:'前面是岩石', pit:'前面是裂谷，要用跳跃', crate:'前面是箱子，要推或拉', 'nothing-to-jump':'跳跃前方必须有裂谷或岩石', 'empty-grab':'这里没有宝石', 'treasure-locked':'压力板还没有全部启动', 'no-crate-to-push':'面前没有可以推的箱子', 'no-crate-to-pull':'面前没有可以拉的箱子', 'crate-edge':'箱子会掉出地图', 'crate-rock':'箱子后面是岩石', 'robot-edge':'机器人身后是地图边缘' };
  return map[reason] || '这一步走不通，检查路线再试一次';
}
function setStatus(text) { const el = document.querySelector('#hunt-status'); if (el) el.textContent = text; }
function setControls(container, enabled) {
  container.querySelectorAll('#hunt-run,#hunt-clear').forEach((el) => { el.disabled = !enabled; });
  container.querySelectorAll('#hunt-tray,#hunt-seq').forEach((el) => { el.style.pointerEvents = enabled ? '' : 'none'; el.style.opacity = enabled ? '' : '.55'; });
}
async function resetAttempt() {
  state = createHuntState(mission); angle = state.facing * 90; renderCells(); setRoverFace(); moveRover(state.col, state.row); roverRotEl.style.transform = `rotate(${angle}deg)`;
  await wait(MOVE_MS);
}
async function playStep(command) {
  const before = state;
  const result = stepHunt(mission, state, command);
  state = result.state;
  if (!result.ok) {
    setRoverFace('oops'); animateBody('is-bump', 300); apiRef.fail(result.reason); setStatus(`⚠️ ${reasonText(result.reason)}`); await wait(520); await resetAttempt(); return result;
  }
  if (result.event === 'turn') {
    angle += command === 'left' ? -90 : 90; roverRotEl.style.transform = `rotate(${angle}deg)`; apiRef.sfx.click(); await wait(TURN_MS);
  } else if (result.event === 'portal') {
    moveRover(result.entered.col, result.entered.row); await wait(MOVE_MS);
    animateBody('is-portal', PORTAL_MS); apiRef.sfx.snap(); await wait(PORTAL_MS * .48); moveRover(result.exited.col, result.exited.row, true); await wait(PORTAL_MS * .52);
  } else {
    if (result.event === 'jump') animateBody('is-jump', MOVE_MS);
    if (result.event === 'push' || result.event === 'pull') { apiRef.sfx.snap(); renderCells(); }
    moveRover(state.col, state.row); await wait(MOVE_MS);
  }
  if (result.event === 'grab') { renderCells(); apiRef.sfx.success(); }
  if (before.crates !== state.crates && (result.event === 'push' || result.event === 'pull')) renderCells();
  return result;
}
async function runProgram(program, container) {
  running = true; setControls(container, false); setStatus('PROGRAM / RUNNING');
  for (let i = 0; i < program.length; i++) {
    if (destroyed) return;
    const result = await playStep(program[i]);
    if (!result.ok) { running = false; setControls(container, true); return; }
    if (result.done) {
      const stars = scoreHuntRun(mission, i + 1); setStatus(`MISSION COMPLETE / ${i + 1} BLOCKS`); apiRef.mascot.say(stars === 3 ? '最短路线！传奇探险家！' : '宝石到手！还能再压缩程序吗？', 'cheer'); await wait(480);
      if (!destroyed) apiRef.complete(stars); running = false; setControls(container, true); return;
    }
    await wait(STEP_GAP_MS);
  }
  apiRef.fail('program-ended'); setStatus('程序结束了，但宝石还没拿到'); await wait(420); await resetAttempt(); running = false; setControls(container, true);
}

function buildDOM(container) {
  container.innerHTML = `
    <div class="hunt-page" style="--hunt-size:${mission.size}">
      <section class="brick-card brick-card--cat-hunt hunt-stage-card">
        <div class="hunt-mission-head"><div><h2 class="hunt-title">${mission.title}</h2><p class="hunt-brief">${mission.brief}</p></div><span class="hunt-mission-no">任务 ${mission.number}/10</span></div>
        <div class="hunt-grid-outer"><div class="hunt-grid" id="hunt-grid" role="img" aria-label="${mission.title} 游戏地图"></div></div>
        <div class="hunt-statusbar"><span class="hunt-status" id="hunt-status">SCAN MAP / 编排行动路线</span>${mission.switches.size ? '<span class="hunt-lock-state" id="hunt-lock-state">SWITCH 0/1</span>' : ''}</div>
      </section>
      <aside class="hunt-console">
        <div class="hunt-teaching"><strong>MISSION BRIEF / </strong>${mission.teaching}</div>
        <div class="brick-card brick-card--blue hunt-tray-card"><div class="hunt-card-head"><span class="title-sm">COMMAND LIBRARY</span><span class="hunt-budget" id="hunt-budget">LIMIT ${mission.maxBlocks}</span></div><div id="hunt-tray"></div></div>
        <div class="brick-card brick-card--yellow hunt-seq-card"><div class="hunt-card-head"><span class="title-sm">PROGRAM TIMELINE</span><div class="hunt-actions game-action-dock"><button id="hunt-clear" class="brick-btn brick-btn--gray brick-btn--sm">重置</button><button id="hunt-run" class="brick-btn brick-btn--green brick-btn--lg">▶ 执行任务</button></div></div><div id="hunt-seq"></div></div>
      </aside>
    </div>`;
}

export default {
  id: 'hunt', title: '网格寻宝', icon: '◈', levelCount: 10,
  init(container, api) {
    injectStylesOnce(); destroyed = false; running = false; apiRef = api; mission = getHuntMission(api.level, api.variant); state = createHuntState(mission); angle = state.facing * 90;
    buildDOM(container); gridEl = container.querySelector('#hunt-grid'); renderGrid();
    const trayDefs = mission.commands.map((id) => HUNT_COMMANDS[id]); createTray(container.querySelector('#hunt-tray'), trayDefs);
    seq = createSequence(container.querySelector('#hunt-seq'), { maxSlots: mission.maxBlocks, emptyText: '轻点或拖入积木，设计你的路线 →' });
    const budget = container.querySelector('#hunt-budget');
    seqUnsub = seq.onChange((list) => { budget.textContent = `已用 ${list.length}/${mission.maxBlocks} 块`; setStatus(list.length ? '程序准备好了，执行看看！' : '先观察地图，再编排程序'); });
    container.querySelector('#hunt-run').addEventListener('click', () => { if (running) return; const program = seq.getSequence().map((b) => b.type); if (!program.length) { api.mascot.say('先放几块指令积木吧！', 'think'); return; } api.sfx.click(); runProgram(program, container); });
    container.querySelector('#hunt-clear').addEventListener('click', () => { if (!running) { api.sfx.click(); seq.clear(); } });
    api.mascot.say(mission.number === 4 ? '先看紫蓝传送门提示，再规划路线！' : mission.brief, 'idle', 0);
    if (typeof window !== 'undefined' && window.__LSFA_TEST__) window.__lsfaHunt = { mission, seq, getState: () => state, solve: () => solveHuntMission(mission) };
  },
  destroy() { destroyed = true; running = false; if (seqUnsub) seqUnsub(); seqUnsub = null; seq?.destroy(); seq = null; gridEl = roverPosEl = roverRotEl = roverBodyEl = null; },
};
