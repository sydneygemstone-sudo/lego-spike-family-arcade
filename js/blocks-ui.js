/* js/blocks-ui.js
 * 触屏拖拽指令条组件 —— 纯 Pointer Events 实现（严禁 HTML5 drag&drop，iPad 上不可靠）。
 * 从托盘（tray，无限供应的积木模板）拖到序列槽（sequence，程序序列）。
 * 抓起放大 1.1x、放下 snap 吸附 + 音效、长按删除、拖出序列外 = 删除。
 *
 * 用法（详见 API.md）：
 *   import { createTray, createSequence } from './blocks-ui.js';
 *   const tray = createTray(trayEl, [{id:'fwd', label:'Move Forward', color:'blue', icon:'⬆️'}, ...]);
 *   const seq  = createSequence(seqEl, { maxSlots: 12 });
 *   seq.onChange((list) => { ... });
 *   seq.getSequence(); // [{uid,type,label,color,icon}, ...]
 */

import { sfx } from './sfx.js';

const DRAG_THRESHOLD = 8; // px，超过才判定为拖拽而非点按/长按
const LONG_PRESS_MS = 550;

let uidCounter = 1;
function nextUid() {
  return 'blk_' + (uidCounter++) + '_' + Math.random().toString(36).slice(2, 7);
}

let stylesInjected = false;
function injectStylesOnce() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .blocks-tray {
      display: flex;
      gap: 10px;
      padding: 10px 10px 14px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
    }
    .blocks-seq {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      gap: 8px;
      min-height: 76px;
      padding: 12px;
      border-radius: 16px;
      border: 3px dashed #C7CDD3;
      background: rgba(255,255,255,.5);
      transition: border-color .15s ease, background .15s ease;
    }
    .blocks-seq--drag-over {
      border-color: var(--lego-blue, #0055BF);
      background: rgba(76,141,255,.12);
    }
    .blocks-seq--reject {
      border-color: var(--lego-red, #D01012);
      background: rgba(208,16,18,.10);
    }
    .blocks-seq--active {
      border-color: var(--lego-yellow, #F5C518);
      box-shadow: 0 0 0 3px rgba(245,197,24,.2);
    }
    .blocks-seq-empty-hint {
      color: #8A929A;
      font-size: 14px;
      font-weight: 700;
      align-self: center;
      pointer-events: none;
      user-select: none;
    }
    .brick-block {
      --blk-c: var(--lego-blue, #0055BF);
      --blk-c-light: var(--lego-blue-light, #4C8DFF);
      --blk-c-dark: var(--lego-blue-dark, #003580);
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-width: 64px;
      min-height: 56px;
      padding: 10px 12px 8px;
      margin-top: 8px;
      border-radius: 12px;
      background: var(--blk-c);
      color: #fff;
      font-weight: 800;
      font-size: 12.5px;
      line-height: 1.15;
      text-align: center;
      box-shadow: 0 4px 0 var(--blk-c-dark), 0 6px 10px rgba(0,0,0,.18);
      touch-action: none;
      cursor: grab;
      -webkit-user-select: none;
      user-select: none;
      transition: transform .12s ease, box-shadow .12s ease, opacity .15s ease;
    }
    .brick-block::before {
      content: "";
      position: absolute;
      top: -7px; left: 0; right: 0;
      height: 13px;
      background-image:
        radial-gradient(circle at 32% 30%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 45%),
        radial-gradient(circle at 50% 45%, #fff 0%, var(--blk-c-light) 46%, var(--blk-c-dark) 100%);
      background-size: 16px 16px, 16px 16px;
      background-repeat: repeat-x;
      background-position: 8px 1px, 8px 1px;
      pointer-events: none;
    }
    .brick-block .blk-icon { font-size: 18px; }
    .brick-block[data-color="red"]    { --blk-c: var(--lego-red, #D01012);    --blk-c-light: var(--lego-red-light, #FF5A5C);    --blk-c-dark: var(--lego-red-dark, #8E0B0D); }
    .brick-block[data-color="yellow"] { --blk-c: var(--lego-yellow, #F5C518); --blk-c-light: var(--lego-yellow-light, #FFE066); --blk-c-dark: var(--lego-yellow-dark, #B8890A); color:#3a2e00; }
    .brick-block[data-color="blue"]   { --blk-c: var(--lego-blue, #0055BF);   --blk-c-light: var(--lego-blue-light, #4C8DFF);   --blk-c-dark: var(--lego-blue-dark, #003580); }
    .brick-block[data-color="green"]  { --blk-c: var(--lego-green, #237841);  --blk-c-light: var(--lego-green-light, #57B87C);  --blk-c-dark: var(--lego-green-dark, #14502A); }
    .brick-block[data-color="purple"] { --blk-c: var(--lego-purple, #6B2FA0); --blk-c-light: var(--lego-purple-light, #A461DD); --blk-c-dark: var(--lego-purple-dark, #451A6B); }
    .brick-block[data-color="orange"] { --blk-c: var(--lego-orange, #E8710A);--blk-c-light: var(--lego-orange-light, #FFA94D); --blk-c-dark: var(--lego-orange-dark, #A34D00); }
    .brick-block[data-color="cyan"]   { --blk-c: var(--lego-cyan, #0AA3B5);  --blk-c-light: var(--lego-cyan-light, #5AD9E6);   --blk-c-dark: var(--lego-cyan-dark, #036B77); }
    .brick-block[data-color="pink"]   { --blk-c: var(--lego-pink, #E0218A);  --blk-c-light: var(--lego-pink-light, #FF6EC0);   --blk-c-dark: var(--lego-pink-dark, #99005C); }

    .brick-block--ghost {
      position: fixed;
      z-index: 500;
      pointer-events: none;
      transform: scale(1.1);
      box-shadow: 0 10px 18px rgba(0,0,0,.32);
      opacity: .96;
    }
    .brick-block--source-hidden { opacity: .28; }
    .brick-block--pressing { transform: scale(.94); }
    .brick-block--landed { animation: blk-land .28s cubic-bezier(.34,1.56,.64,1); }
    @keyframes blk-land {
      0%   { transform: scale(1.16); }
      60%  { transform: scale(.94); }
      100% { transform: scale(1); }
    }
    .brick-block--removing {
      animation: blk-remove .18s ease forwards;
    }
    @keyframes blk-remove {
      to { transform: scale(0); opacity: 0; margin-left: -37px; margin-right: -37px; }
    }
    .blocks-insert-marker {
      align-self: center;
      width: 5px;
      height: 48px;
      border-radius: 3px;
      background: var(--lego-yellow, #F5C518);
      box-shadow: 0 0 0 2px rgba(0,0,0,.08);
    }
  `;
  document.head.appendChild(style);
}

/* 所有已创建的 sequence 实例注册表，用于拖拽时命中检测（支持一页多个序列容器） */
const registeredSequences = [];
let defaultSequence = null; // 供托盘"轻点直接添加"兜底交互使用的默认目标

function renderBlockTile(def, { ghost = false } = {}) {
  const el = document.createElement('div');
  el.className = 'brick-block';
  if (ghost) el.classList.add('brick-block--ghost');
  el.dataset.color = def.color || 'blue';
  el.innerHTML = `${def.icon ? `<span class="blk-icon">${def.icon}</span>` : ''}<span class="blk-label">${def.label}</span>`;
  return el;
}

function rectCenterX(rect) { return rect.left + rect.width / 2; }

/**
 * 根据指针 x/y 与 seqHandle 内部当前块的位置，计算应插入的下标（0..length）。
 */
function computeInsertIndex(seqHandle, clientX, clientY) {
  const items = Array.from(seqHandle.el.querySelectorAll(':scope > .brick-block:not(.brick-block--ghost)'));
  if (items.length === 0) return 0;
  // 按行分组（flex-wrap 场景下，先找 y 最接近的一行，再在行内按 x 比较）
  let best = items.length;
  let bestDist = Infinity;
  for (let i = 0; i < items.length; i++) {
    const r = items[i].getBoundingClientRect();
    const rowDist = Math.abs((r.top + r.bottom) / 2 - clientY);
    const cx = rectCenterX(r);
    // 同一行内：光标在块中心左侧 -> 插入到它前面；否则候选它后面
    const dist = rowDist * 1000 + Math.abs(cx - clientX);
    if (clientX < cx && rowDist < r.height) {
      if (dist < bestDist) { bestDist = dist; best = i; }
    } else if (dist < bestDist) {
      bestDist = dist; best = i + 1;
    }
  }
  return Math.max(0, Math.min(items.length, best));
}

function findSequenceAtPoint(x, y) {
  for (const seq of registeredSequences) {
    const r = seq.el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return seq;
  }
  return null;
}

/* --------------------------------------------------------------------------
 * createTray —— 积木托盘（模板供应，拖出不减少）
 * -------------------------------------------------------------------------- */
export function createTray(container, blockDefs) {
  injectStylesOnce();
  const el = document.createElement('div');
  el.className = 'blocks-tray no-select';
  container.appendChild(el);

  function refresh(defs) {
    el.innerHTML = '';
    defs.forEach((def) => {
      const tile = renderBlockTile(def);
      tile.addEventListener('pointerdown', (ev) => startTrayDrag(ev, def, tile));
      el.appendChild(tile);
    });
  }

  refresh(blockDefs);

  return { el, refresh };
}

/* --------------------------------------------------------------------------
 * createSequence —— 序列槽（程序区）
 * -------------------------------------------------------------------------- */
export function createSequence(container, opts = {}) {
  injectStylesOnce();
  const maxSlots = typeof opts.maxSlots === 'number' ? opts.maxSlots : null;
  const emptyText = opts.emptyText || '把下面的积木拖到这里 →';

  const el = document.createElement('div');
  el.className = 'blocks-seq no-select';
  container.appendChild(el);

  let sequence = []; // [{uid, type, label, color, icon}]
  const listeners = [];

  function renderEmptyHint() {
    let hint = el.querySelector('.blocks-seq-empty-hint');
    if (sequence.length === 0) {
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'blocks-seq-empty-hint';
        hint.textContent = emptyText;
        el.appendChild(hint);
      }
    } else if (hint) {
      hint.remove();
    }
  }

  function renderAll() {
    el.querySelectorAll(':scope > .brick-block, :scope > .blocks-seq-empty-hint, :scope > .blocks-insert-marker').forEach((n) => n.remove());
    sequence.forEach((item) => {
      const tile = renderBlockTile(item);
      tile.dataset.uid = item.uid;
      tile.addEventListener('pointerdown', (ev) => startSeqDrag(ev, item, tile));
      el.appendChild(tile);
    });
    renderEmptyHint();
  }

  function emit() {
    const snapshot = getSequence();
    listeners.forEach((cb) => cb(snapshot));
  }

  function getSequence() {
    return sequence.map((s) => ({ ...s }));
  }

  function setSequence(arr) {
    sequence = (arr || []).map((b) => ({ ...b, uid: b.uid || nextUid() }));
    renderAll();
    emit();
  }

  function addBlock(def, index = sequence.length) {
    if (maxSlots !== null && sequence.length >= maxSlots) return false;
    const item = { uid: nextUid(), type: def.id || def.type, label: def.label, color: def.color || 'blue', icon: def.icon || '' };
    sequence.splice(index, 0, item);
    renderAll();
    emit();
    return true;
  }

  function removeAt(index) {
    if (index < 0 || index >= sequence.length) return;
    sequence.splice(index, 1);
    renderAll();
    emit();
  }

  function removeByUid(uid) {
    const idx = sequence.findIndex((s) => s.uid === uid);
    if (idx !== -1) removeAt(idx);
  }

  function moveItem(fromIndex, toIndex) {
    const [item] = sequence.splice(fromIndex, 1);
    let idx = toIndex;
    if (fromIndex < toIndex) idx -= 1; // 移除自身后下标整体前移一位
    sequence.splice(Math.max(0, Math.min(sequence.length, idx)), 0, item);
    renderAll();
    emit();
  }

  function clear() {
    sequence = [];
    renderAll();
    emit();
  }

  function onChange(cb) {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  renderAll();

  const handle = {
    el, getSequence, setSequence, addBlock, removeAt, removeByUid, moveItem, clear, onChange,
    activate() {
      registeredSequences.forEach((seq) => seq.el.classList.remove('blocks-seq--active'));
      defaultSequence = handle;
      el.classList.add('blocks-seq--active');
    },
    isFull: () => maxSlots !== null && sequence.length >= maxSlots,
    destroy() {
      const i = registeredSequences.indexOf(handle);
      if (i !== -1) registeredSequences.splice(i, 1);
      if (defaultSequence === handle) defaultSequence = registeredSequences[0] || null;
      el.remove();
    },
  };
  registeredSequences.push(handle);
  defaultSequence = handle;
  el.addEventListener('pointerdown', () => handle.activate(), { capture: true });
  handle.activate();
  handle._internal = { get sequence() { return sequence; }, set sequence(v) { sequence = v; }, renderAll, emit };
  return handle;
}

/* --------------------------------------------------------------------------
 * 拖拽状态机（Pointer Events，单例：同一时刻只有一个进行中的拖拽）
 * -------------------------------------------------------------------------- */
let drag = null; // 当前拖拽会话

function cleanupDrag() {
  if (!drag) return;
  if (drag.ghostEl) drag.ghostEl.remove();
  if (drag.sourceTile) drag.sourceTile.classList.remove('brick-block--source-hidden', 'brick-block--pressing');
  registeredSequences.forEach((s) => s.el.classList.remove('blocks-seq--drag-over', 'blocks-seq--reject'));
  const marker = document.querySelector('.blocks-insert-marker');
  if (marker) marker.remove();
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
  window.removeEventListener('pointercancel', onDragCancel);
  drag = null;
}

function beginCommonListeners() {
  window.addEventListener('pointermove', onDragMove, { passive: false });
  window.addEventListener('pointerup', onDragEnd);
  window.addEventListener('pointercancel', onDragCancel);
}

function startTrayDrag(ev, def, tile) {
  if (ev.button !== undefined && ev.button !== 0) return;
  cleanupDrag();
  drag = {
    kind: 'tray', def, sourceTile: tile,
    startX: ev.clientX, startY: ev.clientY,
    dragStarted: false, ghostEl: null, pointerId: ev.pointerId,
    longPressTimer: null, // 托盘模板不支持长按删除
  };
  tile.classList.add('brick-block--pressing');
  beginCommonListeners();
}

function startSeqDrag(ev, item, tile) {
  if (ev.button !== undefined && ev.button !== 0) return;
  cleanupDrag();
  const seqHandle = registeredSequences.find((s) => s.el.contains(tile));
  const index = seqHandle ? seqHandle.getSequence().findIndex((s) => s.uid === item.uid) : -1;
  drag = {
    kind: 'seq', def: item, sourceTile: tile, sourceSeq: seqHandle, sourceIndex: index,
    startX: ev.clientX, startY: ev.clientY,
    dragStarted: false, ghostEl: null, pointerId: ev.pointerId,
    longPressTimer: setTimeout(() => {
      if (drag && !drag.dragStarted) {
        sfx.click();
        tile.classList.add('brick-block--removing');
        setTimeout(() => { if (seqHandle) seqHandle.removeByUid(item.uid); }, 170);
        cleanupDrag();
      }
    }, LONG_PRESS_MS),
  };
  tile.classList.add('brick-block--pressing');
  beginCommonListeners();
}

function promoteToDrag(ev) {
  drag.dragStarted = true;
  if (drag.longPressTimer) { clearTimeout(drag.longPressTimer); drag.longPressTimer = null; }
  drag.sourceTile.classList.remove('brick-block--pressing');
  if (drag.kind === 'seq') drag.sourceTile.classList.add('brick-block--source-hidden');
  const ghost = renderBlockTile(drag.def, { ghost: true });
  const r = drag.sourceTile.getBoundingClientRect();
  ghost.style.width = r.width + 'px';
  ghost.style.left = (ev.clientX - r.width / 2) + 'px';
  ghost.style.top = (ev.clientY - r.height / 2) + 'px';
  document.body.appendChild(ghost);
  drag.ghostEl = ghost;
}

function onDragMove(ev) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  const dx = ev.clientX - drag.startX;
  const dy = ev.clientY - drag.startY;
  if (!drag.dragStarted) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    promoteToDrag(ev);
  }
  ev.preventDefault();
  const w = drag.ghostEl.offsetWidth;
  const h = drag.ghostEl.offsetHeight;
  drag.ghostEl.style.left = (ev.clientX - w / 2) + 'px';
  drag.ghostEl.style.top = (ev.clientY - h / 2) + 'px';

  const target = findSequenceAtPoint(ev.clientX, ev.clientY);
  registeredSequences.forEach((s) => s.el.classList.remove('blocks-seq--drag-over', 'blocks-seq--reject'));
  document.querySelectorAll('.blocks-insert-marker').forEach((m) => m.remove());

  if (target) {
    const wouldExceed = target.isFull() && !(drag.kind === 'seq' && drag.sourceSeq === target);
    target.el.classList.add(wouldExceed ? 'blocks-seq--reject' : 'blocks-seq--drag-over');
    if (!wouldExceed) {
      const idx = computeInsertIndex(target, ev.clientX, ev.clientY);
      const marker = document.createElement('div');
      marker.className = 'blocks-insert-marker';
      const children = Array.from(target.el.querySelectorAll(':scope > .brick-block:not(.brick-block--ghost)'));
      const ref = children[idx];
      if (ref) target.el.insertBefore(marker, ref); else target.el.appendChild(marker);
      drag.pendingIndex = idx;
      drag.pendingTarget = target;
    } else {
      drag.pendingIndex = null;
      drag.pendingTarget = null;
    }
  } else {
    drag.pendingIndex = null;
    drag.pendingTarget = null;
  }
}

function onDragEnd(ev) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  if (!drag.dragStarted) {
    // 轻点兜底交互（API.md §6）：托盘积木轻点（未越过 DRAG_THRESHOLD、也未触发长按）
    // 直接加进"最近一次创建且仍挂在 DOM 里"的序列实例（defaultSequence）。
    // seq 内已有积木的轻点行为保持原样（不做任何事——长按删除走独立的 longPressTimer 分支）。
    if (drag.kind === 'tray' && defaultSequence) {
      if (defaultSequence.isFull()) {
        sfx.fail();
      } else {
        defaultSequence.addBlock(drag.def);
        sfx.snap();
        const list = defaultSequence.getSequence();
        const lastUid = list.length ? list[list.length - 1].uid : null;
        const landed = lastUid ? defaultSequence.el.querySelector(`[data-uid="${lastUid}"]`) : null;
        if (landed) landed.classList.add('brick-block--landed');
      }
    }
    cleanupDrag();
    return;
  }

  const target = drag.pendingTarget;
  const idx = drag.pendingIndex;

  if (target && idx !== null) {
    if (drag.kind === 'tray') {
      target.addBlock(drag.def, idx);
    } else if (drag.kind === 'seq') {
      if (drag.sourceSeq === target) {
        target.moveItem(drag.sourceIndex, idx);
      } else {
        drag.sourceSeq.removeAt(drag.sourceIndex);
        target.addBlock(drag.def, idx);
      }
    }
    sfx.snap();
    const landed = target.el.querySelector(`[data-uid]:nth-child(${idx + 1})`);
    if (landed) landed.classList.add('brick-block--landed');
  } else if (drag.kind === 'seq') {
    // 拖出所有序列容器之外 = 删除
    sfx.click();
    drag.sourceSeq && drag.sourceSeq.removeAt(drag.sourceIndex);
  }
  cleanupDrag();
}

function onDragCancel(ev) {
  if (!drag || ev.pointerId !== drag.pointerId) return;
  cleanupDrag();
}
