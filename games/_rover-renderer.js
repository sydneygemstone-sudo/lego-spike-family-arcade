/* games/_rover-renderer.js
 * 位移类三关（hunt / race / bridge）共用的轻量 Canvas 走位渲染器。
 * 只被这三个关卡文件 import，不对外暴露、不算全局共享层（不放 js/ 目录）。
 *
 * 提供：
 *   - setupHiDPICanvas(canvas, cssW, cssH)  —— 按 devicePixelRatio 配置清晰画布
 *   - drawRover(ctx, opts)                  —— 画一个可爱的乐高小机器人（黄色 Hub 身体 + 黑色轮子 + 点阵小脸）
 *   - createTicker(loopFn)                  —— requestAnimationFrame 常驻渲染循环（start/stop）
 *   - animate(opts)                         —— 一次性补间动画（position/angle 等数值过渡），返回可 cancel()
 *   - easing 函数 + lerp
 */

/* -------------------------------------------------------------------------- 画布 -------------------------------------------------------------------------- */

export function setupHiDPICanvas(canvas, cssW, cssH) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* -------------------------------------------------------------------------- 缓动 / 补间 -------------------------------------------------------------------------- */

export function lerp(a, b, t) { return a + (b - a) * t; }

export const Easing = {
  linear: (t) => t,
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * 一次性补间：duration 毫秒内把 t(0→1，已过 easing) 喂给 onUpdate，结束调 onComplete。
 * 返回 { cancel() }，关卡 destroy() 时应该 cancel 掉所有在途的补间，避免卸载后继续回调。
 */
export function animate({ duration = 400, easing = Easing.easeInOutQuad, onUpdate, onComplete }) {
  let rafId = null;
  let cancelled = false;
  const t0 = performance.now();
  function step(now) {
    if (cancelled) return;
    const raw = duration <= 0 ? 1 : Math.min(1, (now - t0) / duration);
    onUpdate(easing(raw), raw);
    if (raw < 1) {
      rafId = requestAnimationFrame(step);
    } else if (onComplete) {
      onComplete();
    }
  }
  rafId = requestAnimationFrame(step);
  return {
    cancel() {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    },
  };
}

/**
 * 常驻渲染循环：start() 后每帧调用 loopFn(timestampMs)，stop() 彻底停止。
 * 关卡应在 destroy() 里调用 stop()，避免离开关卡后 rAF 仍在跑。
 */
export function createTicker(loopFn) {
  let rafId = null;
  let running = false;
  function frame(ts) {
    if (!running) return;
    loopFn(ts);
    rafId = requestAnimationFrame(frame);
  }
  return {
    start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    },
    get running() { return running; },
  };
}

/* -------------------------------------------------------------------------- 小机器人精灵 -------------------------------------------------------------------------- */

// 3x3 点阵小脸表情（呼应吉祥物的 5x5 点阵屏，缩小版供小尺寸精灵使用）
const FACE_PATTERNS = {
  idle:  { lit: '#23272E', dots: [1, 0, 1, 0, 0, 0, 0, 1, 0] },
  happy: { lit: '#23272E', dots: [1, 0, 1, 0, 0, 0, 1, 1, 1] },
  oops:  { lit: '#D01012', dots: [1, 0, 1, 0, 0, 0, 0, 0, 0] },
  think: { lit: '#23272E', dots: [1, 0, 0, 0, 0, 0, 0, 1, 0] },
};

function drawDotFace(ctx, expression) {
  const pattern = FACE_PATTERNS[expression] || FACE_PATTERNS.idle;
  const gap = 4.6;
  const r = 1.5;
  const startX = -gap;
  const startY = -gap * 0.7;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const lit = pattern.dots[idx] === 1;
      ctx.beginPath();
      ctx.arc(startX + col * gap, startY + row * gap, r, 0, Math.PI * 2);
      ctx.fillStyle = lit ? pattern.lit : 'rgba(35,39,46,.15)';
      ctx.fill();
    }
  }
}

/**
 * 画一个可爱的乐高小机器人：黄色 Hub 方块身体 + 黑色轮子 + 点阵小脸。
 * 坐标系：angle=0 表示"朝上"（画布 -Y 方向），顺时针为正（Math.PI/2 = 朝右）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number,angle?:number,scale?:number,squash?:number,expression?:'idle'|'happy'|'oops'|'think',wheelSpin?:number}} opts
 */
export function drawRover(ctx, opts) {
  const {
    x, y, angle = 0, scale = 1, squash = 1,
    expression = 'idle', wheelSpin = 0,
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale * squash);

  const halfW = 15, halfH = 15;

  // 阴影
  ctx.beginPath();
  ctx.ellipse(0, halfH + 6, halfW * 0.9, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fill();

  // 轮子（左右两侧，随 wheelSpin 显示辐条转动感）
  [-1, 1].forEach((side) => {
    const wx = side * (halfW + 5);
    const wy = halfH * 0.15;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(wheelSpin);
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#23272E';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
    ctx.moveTo(0, -5); ctx.lineTo(0, 5);
    ctx.strokeStyle = '#4A5157';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  });

  // 车头指示（小三角，指向 forward / -Y）
  ctx.beginPath();
  ctx.moveTo(-5, -halfH - 1);
  ctx.lineTo(5, -halfH - 1);
  ctx.lineTo(0, -halfH - 9);
  ctx.closePath();
  ctx.fillStyle = '#0055BF';
  ctx.fill();

  // 身体（黄色圆角方块，乐高 Hub 质感）
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(-halfW + r, -halfH);
  ctx.arcTo(halfW, -halfH, halfW, halfH, r);
  ctx.arcTo(halfW, halfH, -halfW, halfH, r);
  ctx.arcTo(-halfW, halfH, -halfW, -halfH, r);
  ctx.arcTo(-halfW, -halfH, halfW, -halfH, r);
  ctx.closePath();
  ctx.fillStyle = '#F5C518';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#B8890A';
  ctx.stroke();

  // 顶部两颗装饰凸粒
  [-7, 7].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, -halfH + 4, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE066';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#B8890A';
    ctx.stroke();
  });

  // 白色面板 + 点阵小脸
  ctx.beginPath();
  const panelW = halfW * 1.35, panelH = halfH * 1.05;
  const pr = 4;
  ctx.moveTo(-panelW / 2 + pr, -panelH / 2 + 2);
  ctx.arcTo(panelW / 2, -panelH / 2 + 2, panelW / 2, panelH / 2 + 2, pr);
  ctx.arcTo(panelW / 2, panelH / 2 + 2, -panelW / 2, panelH / 2 + 2, pr);
  ctx.arcTo(-panelW / 2, panelH / 2 + 2, -panelW / 2, -panelH / 2 + 2, pr);
  ctx.arcTo(-panelW / 2, -panelH / 2 + 2, panelW / 2, -panelH / 2 + 2, pr);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#D9DEE3';
  ctx.stroke();

  ctx.save();
  ctx.translate(0, 3);
  drawDotFace(ctx, expression);
  ctx.restore();

  ctx.restore();
}
