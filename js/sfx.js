/* js/sfx.js
 * Web Audio 纯合成音效——不依赖任何外部音频文件。
 * 五种音效：click / snap(乐高积木咔哒) / success / fail / star。
 * 首次 pointerdown（或 touchstart/keydown 兜底）解锁 AudioContext（iOS Safari
 * 要求音频必须在用户手势的同步调用栈里 resume()，所以这里监听最早的手势）。
 *
 * 用法：
 *   import { sfx } from './sfx.js';
 *   sfx.click(); sfx.snap(); sfx.success(); sfx.fail(); sfx.star();
 *   sfx.setEnabled(false); // 静音开关（可选，供家长角落用）
 */

let ctx = null;
let masterGain = null;
let enabled = true;
let unlocked = false;
let noiseBufferCache = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function unlock() {
  if (unlocked) return;
  const c = getCtx();
  if (c.state === 'suspended') {
    c.resume().catch(() => {});
  }
  // 播放一个几乎听不见的静音 buffer，确保 iOS Safari 真正解锁音频输出链路。
  const buffer = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(c.destination);
  try { src.start(0); } catch (e) { /* noop */ }
  unlocked = true;
}

['pointerdown', 'touchstart', 'keydown'].forEach((evt) => {
  document.addEventListener(evt, unlock, { once: true, passive: true });
});

function noiseBuffer(c) {
  if (noiseBufferCache && noiseBufferCache.ctx === c) return noiseBufferCache.buffer;
  const len = Math.floor(c.sampleRate * 0.3);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    // 略微向低频衰减的白噪声，听感更接近"塑料摩擦"而非纯电子噪声
    data[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.9;
  }
  noiseBufferCache = { ctx: c, buffer: buf };
  return buf;
}

function envGain(c, startTime, attack, peak, decayTo, releaseEnd) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, startTime);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), startTime + attack);
  g.gain.exponentialRampToValueAtTime(Math.max(decayTo, 0.0001), releaseEnd);
  return g;
}

function tone({ freq, type = 'sine', start = 0, dur = 0.15, peak = 0.5, freqEnd = null, detune = 0 }) {
  if (!enabled) return;
  const c = getCtx();
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
  }
  if (detune) osc.detune.setValueAtTime(detune, t0);
  const g = envGain(c, t0, Math.min(0.012, dur * 0.2), peak, peak * 0.001, t0 + dur);
  osc.connect(g).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst({ start = 0, dur = 0.06, peak = 0.6, filterFreq = 3500, filterType = 'bandpass' }) {
  if (!enabled) return;
  const c = getCtx();
  const t0 = c.currentTime + start;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filt = c.createBiquadFilter();
  filt.type = filterType;
  filt.frequency.value = filterFreq;
  filt.Q.value = 0.9;
  const g = envGain(c, t0, 0.002, peak, peak * 0.001, t0 + dur);
  src.connect(filt).connect(g).connect(masterGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/* ---- click：轻快的 UI 点击，短促单音 ---- */
function click() {
  tone({ freq: 720, type: 'sine', dur: 0.06, peak: 0.35, freqEnd: 560 });
}

/* ---- snap：乐高积木"咔哒"吸附声 —— 短促方波瞬态 + 噪声瞬态叠加，
   模拟塑料凸粒卡入凹槽的清脆一响，再跟一个极短的低频"哒"收尾。 ---- */
function snap() {
  // 高频瞬态：方波 tick，非常短、干脆
  tone({ freq: 1800, type: 'square', dur: 0.028, peak: 0.4, freqEnd: 1200 });
  // 噪声瞬态：模拟塑料摩擦咔哒的"沙"感
  noiseBurst({ start: 0, dur: 0.035, peak: 0.5, filterFreq: 4200 });
  // 低频收尾：模拟积木完全卡到底的"哒"一声闷响
  tone({ freq: 180, type: 'triangle', start: 0.02, dur: 0.05, peak: 0.32, freqEnd: 90 });
}

/* ---- success：三音上行琶音，明快 ---- */
function success() {
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
  notes.forEach((f, i) => {
    tone({ freq: f, type: 'triangle', start: i * 0.09, dur: 0.22, peak: 0.4 });
  });
  tone({ freq: 1046.5, type: 'sine', start: 0.28, dur: 0.35, peak: 0.35 }); // C6 收尾
}

/* ---- fail：滑稽的下滑"oops"音，不做说教感的严肃警报 ---- */
function fail() {
  tone({ freq: 330, type: 'sawtooth', dur: 0.32, peak: 0.28, freqEnd: 140, detune: -20 });
  noiseBurst({ start: 0.02, dur: 0.08, peak: 0.2, filterFreq: 900, filterType: 'lowpass' });
}

/* ---- star：结算弹窗逐颗弹星星时的"叮~"闪光音 ---- */
function star() {
  tone({ freq: 1318.5, type: 'sine', dur: 0.28, peak: 0.4, freqEnd: 2637 });
  tone({ freq: 2637, type: 'sine', start: 0.03, dur: 0.22, peak: 0.22 });
}

function setEnabled(v) {
  enabled = !!v;
}

export const sfx = {
  click,
  snap,
  success,
  fail,
  star,
  setEnabled,
  unlock, // 供 shell.js/blocks-ui.js 在自己捕获的第一次手势里主动调用兜底
};
