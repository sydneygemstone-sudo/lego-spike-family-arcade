/* ============================================================================
 * art.js — 全套游戏场景 SVG 美术资产（Fable 5 手绘，禁止 worker 修改图形）
 * 统一视觉语言：SPIKE 主体色 (Hub黄 #F5C518 / 面板白 / 电机青 #00A3B2 /
 * 轮胎黑 #2B2B2B)，描边 #37474F 2.5px 圆角，柔和投影，糖果高光。
 * 每个资产导出为函数，返回 SVG 字符串；可参数化的带参数。
 * ========================================================================== */

const OUTLINE = '#37474F';

/* ----------------------------------------------------------------------------
 * 1. 乐高机器人小车 · 侧视（bridge / sort / race 用）
 * 朝右行驶。wheelAngle 传入度数可让轮辐转动（做滚动动画）。
 * -------------------------------------------------------------------------- */
export function roverSide({ wheelAngle = 0, face = 'happy' } = {}) {
  const faces = {
    happy: '<circle cx="66" cy="34" r="3.2" fill="#37474F"/><circle cx="82" cy="34" r="3.2" fill="#37474F"/><path d="M64 44 Q74 51 84 44" stroke="#37474F" stroke-width="3" fill="none" stroke-linecap="round"/>',
    effort: '<rect x="62" y="31" width="7" height="4" rx="2" fill="#37474F"/><rect x="79" y="31" width="7" height="4" rx="2" fill="#37474F"/><ellipse cx="74" cy="45" rx="5" ry="4" fill="#37474F"/>',
    oops: '<path d="M62 30 l8 8 M70 30 l-8 8" stroke="#37474F" stroke-width="2.8" stroke-linecap="round"/><path d="M78 30 l8 8 M86 30 l-8 8" stroke="#37474F" stroke-width="2.8" stroke-linecap="round"/><path d="M64 47 Q74 42 84 47" stroke="#37474F" stroke-width="3" fill="none" stroke-linecap="round"/>',
  };
  const spoke = (cx, cy) => `
    <g transform="rotate(${wheelAngle} ${cx} ${cy})">
      <line x1="${cx - 11}" y1="${cy}" x2="${cx + 11}" y2="${cy}" stroke="#9E9E9E" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy - 11}" x2="${cx}" y2="${cy + 11}" stroke="#9E9E9E" stroke-width="3.5" stroke-linecap="round"/>
    </g>`;
  return `
<svg viewBox="0 0 150 110" xmlns="http://www.w3.org/2000/svg">
  <!-- 车架底盘 -->
  <rect x="18" y="58" width="114" height="16" rx="6" fill="#00A3B2" stroke="${OUTLINE}" stroke-width="2.5"/>
  <!-- Hub 机身 -->
  <rect x="40" y="14" width="68" height="52" rx="10" fill="#F5C518" stroke="${OUTLINE}" stroke-width="2.5"/>
  <rect x="52" y="22" width="44" height="34" rx="6" fill="#FFFFFF" stroke="#D8D8D8" stroke-width="1.5"/>
  ${faces[face] || faces.happy}
  <!-- 顶部凸粒 -->
  <circle cx="55" cy="12" r="4.5" fill="#FFE066" stroke="${OUTLINE}" stroke-width="2"/>
  <circle cx="74" cy="12" r="4.5" fill="#FFE066" stroke="${OUTLINE}" stroke-width="2"/>
  <circle cx="93" cy="12" r="4.5" fill="#FFE066" stroke="${OUTLINE}" stroke-width="2"/>
  <!-- 前灯 -->
  <circle cx="126" cy="52" r="5" fill="#FFF3B0" stroke="${OUTLINE}" stroke-width="2"/>
  <!-- 车轮（带转动轮辐） -->
  <g>
    <circle cx="44" cy="82" r="20" fill="#2B2B2B" stroke="${OUTLINE}" stroke-width="2.5"/>
    <circle cx="44" cy="82" r="13" fill="#4A4A4A"/>
    ${spoke(44, 82)}
    <circle cx="44" cy="82" r="4" fill="#E0E0E0" stroke="${OUTLINE}" stroke-width="1.5"/>
  </g>
  <g>
    <circle cx="106" cy="82" r="20" fill="#2B2B2B" stroke="${OUTLINE}" stroke-width="2.5"/>
    <circle cx="106" cy="82" r="13" fill="#4A4A4A"/>
    ${spoke(106, 82)}
    <circle cx="106" cy="82" r="4" fill="#E0E0E0" stroke="${OUTLINE}" stroke-width="1.5"/>
  </g>
</svg>`;
}

/* ----------------------------------------------------------------------------
 * 2. 乐高机器人小车 · 俯视（hunt / macro / race 走格用）
 * 默认朝上（north）；旋转由使用方外层 transform 控制。
 * -------------------------------------------------------------------------- */
export function roverTop({ face = 'happy' } = {}) {
  const eyes = face === 'oops'
    ? '<path d="M40 40 l7 7 M47 40 l-7 7" stroke="#37474F" stroke-width="2.5" stroke-linecap="round"/><path d="M60 40 l7 7 M67 40 l-7 7" stroke="#37474F" stroke-width="2.5" stroke-linecap="round"/>'
    : '<circle cx="44" cy="44" r="3.4" fill="#37474F"/><circle cx="64" cy="44" r="3.4" fill="#37474F"/><path d="M44 55 Q54 61 64 55" stroke="#37474F" stroke-width="3" fill="none" stroke-linecap="round"/>';
  return `
<svg viewBox="0 0 108 120" xmlns="http://www.w3.org/2000/svg">
  <!-- 方向箭头（船头） -->
  <path d="M54 4 L70 24 L38 24 Z" fill="#0055BF" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- 左右履带轮 -->
  <rect x="6" y="30" width="16" height="66" rx="8" fill="#2B2B2B" stroke="${OUTLINE}" stroke-width="2.5"/>
  <rect x="86" y="30" width="16" height="66" rx="8" fill="#2B2B2B" stroke="${OUTLINE}" stroke-width="2.5"/>
  <line x1="14" y1="40" x2="14" y2="86" stroke="#5A5A5A" stroke-width="3" stroke-dasharray="4 5"/>
  <line x1="94" y1="40" x2="94" y2="86" stroke="#5A5A5A" stroke-width="3" stroke-dasharray="4 5"/>
  <!-- Hub 机身 -->
  <rect x="22" y="26" width="64" height="74" rx="10" fill="#F5C518" stroke="${OUTLINE}" stroke-width="2.5"/>
  <rect x="32" y="34" width="44" height="36" rx="6" fill="#FFFFFF" stroke="#D8D8D8" stroke-width="1.5"/>
  ${eyes}
  <!-- 尾部电机块 -->
  <rect x="34" y="76" width="40" height="18" rx="5" fill="#00A3B2" stroke="${OUTLINE}" stroke-width="2.5"/>
  <circle cx="46" cy="85" r="4" fill="#BDF3F8" stroke="${OUTLINE}" stroke-width="1.5"/>
  <circle cx="62" cy="85" r="4" fill="#BDF3F8" stroke="${OUTLINE}" stroke-width="1.5"/>
</svg>`;
}

/* ----------------------------------------------------------------------------
 * 3. 抓娃娃机 · 俯视主场景（claw 关教学核心）
 * 组成：圆形底座机械臂（可旋转组 #claw-arm-rot）+ 量角器刻度环（unitDeg 一格）
 * + 目标物投放圈。armDeg = 当前臂角度；targetDeg = 目标物所在角度（显示目标射线）。
 * 量角器 0° 在正右方，逆时针增角（数学惯例，符合量角器教具）。
 * 目标物由使用方叠加（targetSlot(deg) 给出坐标）。
 * -------------------------------------------------------------------------- */
export function clawTopScene({ unitDeg = 30, armDeg = 0, showTargetRay = null } = {}) {
  const R = 150, cx = 205, cy = 196;
  let ticks = '';
  for (let d = 0; d <= 180; d += unitDeg) {
    const rad = (Math.PI * d) / 180;
    const x1 = cx + Math.cos(rad) * (R - 14), y1 = cy - Math.sin(rad) * (R - 14);
    const x2 = cx + Math.cos(rad) * R, y2 = cy - Math.sin(rad) * R;
    const xt = cx + Math.cos(rad) * (R + 20), yt = cy - Math.sin(rad) * (R + 20);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>
      <text x="${xt.toFixed(1)}" y="${yt.toFixed(1)}" font-size="15" font-weight="700" fill="${OUTLINE}" text-anchor="middle" dominant-baseline="middle">${d}°</text>`;
  }
  // 单位格之间的细分弧带（交替浅色，让"一格"可数）
  let sectors = '';
  for (let d = 0; d < 180; d += unitDeg) {
    const a0 = (Math.PI * d) / 180, a1 = (Math.PI * (d + unitDeg)) / 180;
    const large = 0;
    const p0x = cx + Math.cos(a0) * (R - 14), p0y = cy - Math.sin(a0) * (R - 14);
    const p1x = cx + Math.cos(a1) * (R - 14), p1y = cy - Math.sin(a1) * (R - 14);
    const q1x = cx + Math.cos(a1) * (R - 44), q1y = cy - Math.sin(a1) * (R - 44);
    const q0x = cx + Math.cos(a0) * (R - 44), q0y = cy - Math.sin(a0) * (R - 44);
    const fill = (d / unitDeg) % 2 === 0 ? '#FFF3C4' : '#FFE49A';
    sectors += `<path d="M ${p0x.toFixed(1)} ${p0y.toFixed(1)} A ${R - 14} ${R - 14} 0 ${large} 0 ${p1x.toFixed(1)} ${p1y.toFixed(1)} L ${q1x.toFixed(1)} ${q1y.toFixed(1)} A ${R - 44} ${R - 44} 0 ${large} 1 ${q0x.toFixed(1)} ${q0y.toFixed(1)} Z" fill="${fill}" stroke="#E8C96A" stroke-width="1"/>`;
  }
  const targetRay = showTargetRay !== null ? (() => {
    const rad = (Math.PI * showTargetRay) / 180;
    const x2 = cx + Math.cos(rad) * (R + 4), y2 = cy - Math.sin(rad) * (R + 4);
    return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#D01012" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round" opacity="0.85"/>
      <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="7" fill="none" stroke="#D01012" stroke-width="3"/>`;
  })() : '';
  return `
<svg viewBox="0 0 410 260" xmlns="http://www.w3.org/2000/svg">
  <!-- 台面 -->
  <rect x="4" y="4" width="402" height="252" rx="18" fill="#EAF6F8" stroke="${OUTLINE}" stroke-width="2.5"/>
  <!-- 半圆工作区地板 -->
  <path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z" fill="#F8FBFF" stroke="#C7D6E4" stroke-width="2"/>
  ${sectors}
  ${ticks}
  ${targetRay}
  <!-- 机械臂（旋转组，逻辑层用 transform rotate(-armDeg cx cy) 控制） -->
  <g id="claw-arm-rot" transform="rotate(${-armDeg} ${cx} ${cy})">
    <rect x="${cx}" y="${cy - 11}" width="${R - 52}" height="22" rx="10" fill="#F5C518" stroke="${OUTLINE}" stroke-width="2.5"/>
    <circle cx="${cx + 24}" cy="${cy}" r="5.5" fill="#FFE066" stroke="${OUTLINE}" stroke-width="1.8"/>
    <circle cx="${cx + 52}" cy="${cy}" r="5.5" fill="#FFE066" stroke="${OUTLINE}" stroke-width="1.8"/>
    <!-- 臂端小爪（俯视三点） -->
    <circle cx="${cx + R - 52}" cy="${cy}" r="15" fill="#00A3B2" stroke="${OUTLINE}" stroke-width="2.5"/>
    <circle cx="${cx + R - 52}" cy="${cy - 7}" r="3.6" fill="#BDF3F8" stroke="${OUTLINE}" stroke-width="1.4"/>
    <circle cx="${cx + R - 46}" cy="${cy + 6}" r="3.6" fill="#BDF3F8" stroke="${OUTLINE}" stroke-width="1.4"/>
    <circle cx="${cx + R - 58}" cy="${cy + 6}" r="3.6" fill="#BDF3F8" stroke="${OUTLINE}" stroke-width="1.4"/>
  </g>
  <!-- 底座转盘 -->
  <circle cx="${cx}" cy="${cy}" r="30" fill="#0055BF" stroke="${OUTLINE}" stroke-width="2.5"/>
  <circle cx="${cx}" cy="${cy}" r="18" fill="#3D7BD9"/>
  <circle cx="${cx}" cy="${cy}" r="6" fill="#FFFFFF" stroke="${OUTLINE}" stroke-width="2"/>
</svg>`;
}

/** claw 目标物挂点：给角度返回台面坐标（半径与臂端一致），供逻辑层摆放目标物 */
export function clawTargetSlot(deg) {
  const R = 150, cx = 205, cy = 196;
  const rad = (Math.PI * deg) / 180;
  return { x: cx + Math.cos(rad) * (R - 52), y: cy - Math.sin(rad) * (R - 52) };
}

/* ----------------------------------------------------------------------------
 * 4. 抓娃娃机 · 侧视深度仪表（下降圈数教学：1 圈 = 1 格深度）
 * totalTurns = 刻度总格数；turns = 当前设定；targetTurns = 目标深度格。
 * -------------------------------------------------------------------------- */
export function depthGauge({ totalTurns = 4, turns = 1, targetTurns = null } = {}) {
  const top = 34, step = 36, x = 96;
  let rows = '';
  for (let i = 1; i <= totalTurns; i++) {
    const y = top + i * step;
    rows += `<line x1="${x - 26}" y1="${y}" x2="${x + 26}" y2="${y}" stroke="#C7D6E4" stroke-width="2" stroke-dasharray="5 4"/>
      <text x="${x + 44}" y="${y + 1}" font-size="14" font-weight="700" fill="${OUTLINE}" text-anchor="middle" dominant-baseline="middle">${i}圈</text>`;
  }
  const clawY = top + turns * step;
  const target = targetTurns !== null ? `<g transform="translate(${x - 52} ${top + targetTurns * step})"><path d="M0 0 L14 -8 L14 8 Z" fill="#D01012"/><text x="-6" y="1" font-size="13" font-weight="800" fill="#D01012" text-anchor="end" dominant-baseline="middle">目标</text></g>` : '';
  return `
<svg viewBox="0 0 170 210" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="4" width="162" height="202" rx="14" fill="#F8FBFF" stroke="${OUTLINE}" stroke-width="2.5"/>
  <!-- 顶轨 -->
  <rect x="${x - 34}" y="${top - 16}" width="68" height="12" rx="6" fill="#9AA7B4" stroke="${OUTLINE}" stroke-width="2"/>
  ${rows}
  ${target}
  <!-- 缆绳 + 爪（随 turns 下降） -->
  <line x1="${x}" y1="${top - 4}" x2="${x}" y2="${clawY - 16}" stroke="${OUTLINE}" stroke-width="3"/>
  <g transform="translate(${x} ${clawY})">
    <circle cx="0" cy="-10" r="9" fill="#F5C518" stroke="${OUTLINE}" stroke-width="2.2"/>
    <path d="M-2 -4 Q-14 6 -9 16" stroke="${OUTLINE}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M2 -4 Q14 6 9 16" stroke="${OUTLINE}" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
}

/* ----------------------------------------------------------------------------
 * 5. 夹爪力度表（半圆压力表 + 安全区带）
 * min/max = 目标物安全夹力区间（高亮绿带），value = 当前设定。量程 0-10N。
 * -------------------------------------------------------------------------- */
export function forceGauge({ value = 5, min = 3, max = 5 } = {}) {
  const cx = 118, cy = 122, R = 84;
  const a = (v) => Math.PI - (Math.PI * v) / 10; // 0N=左端 10N=右端
  const arc = (v0, v1, r, color, w) => {
    const p0x = cx + Math.cos(a(v0)) * r, p0y = cy - Math.sin(a(v0)) * r;
    const p1x = cx + Math.cos(a(v1)) * r, p1y = cy - Math.sin(a(v1)) * r;
    return `<path d="M ${p0x.toFixed(1)} ${p0y.toFixed(1)} A ${r} ${r} 0 0 1 ${p1x.toFixed(1)} ${p1y.toFixed(1)}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  };
  let ticks = '';
  for (let v = 0; v <= 10; v += 1) {
    const big = v % 5 === 0;
    const r0 = R - (big ? 16 : 9);
    const x1 = cx + Math.cos(a(v)) * r0, y1 = cy - Math.sin(a(v)) * r0;
    const x2 = cx + Math.cos(a(v)) * R, y2 = cy - Math.sin(a(v)) * R;
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${OUTLINE}" stroke-width="${big ? 3 : 1.6}"/>`;
    if (big) {
      const xt = cx + Math.cos(a(v)) * (R + 15), yt = cy - Math.sin(a(v)) * (R + 15);
      ticks += `<text x="${xt.toFixed(1)}" y="${yt.toFixed(1)}" font-size="14" font-weight="700" fill="${OUTLINE}" text-anchor="middle" dominant-baseline="middle">${v}</text>`;
    }
  }
  const needleA = a(value);
  const nx = cx + Math.cos(needleA) * (R - 24), ny = cy - Math.sin(needleA) * (R - 24);
  return `
<svg viewBox="0 0 236 150" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="4" width="228" height="142" rx="14" fill="#F8FBFF" stroke="${OUTLINE}" stroke-width="2.5"/>
  ${arc(0, 10, R, '#E3E9EF', 10)}
  ${arc(min, max, R, '#57B84E', 10)}
  ${ticks}
  <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#D01012" stroke-width="4" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="7" fill="#D01012" stroke="${OUTLINE}" stroke-width="2"/>
  <text x="${cx}" y="${cy + 14}" font-size="12" font-weight="700" fill="${OUTLINE}" text-anchor="middle">牛顿 N</text>
</svg>`;
}

/* ----------------------------------------------------------------------------
 * 6. 目标物图鉴（claw 关抓取对象，含脆弱度语义）
 * -------------------------------------------------------------------------- */
export function prize(kind = 'brick') {
  const items = {
    glass: `<g><path d="M14 6 L38 6 L34 40 Q26 46 18 40 Z" fill="#CFE9FF" stroke="${OUTLINE}" stroke-width="2.5" opacity="0.92"/><ellipse cx="26" cy="8" rx="12" ry="4" fill="#E8F4FF" stroke="${OUTLINE}" stroke-width="2"/><path d="M20 14 Q22 26 21 34" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.9"/></g>`,
    egg: `<g><path d="M26 4 C38 14 42 26 42 33 a16 14 0 0 1 -32 0 C10 26 14 14 26 4 Z" fill="#FFF4E0" stroke="${OUTLINE}" stroke-width="2.5"/><circle cx="20" cy="22" r="2.4" fill="#F1D9B8"/><circle cx="31" cy="30" r="2" fill="#F1D9B8"/></g>`,
    brick: `<g><rect x="6" y="18" width="40" height="24" rx="4" fill="#D01012" stroke="${OUTLINE}" stroke-width="2.5"/><circle cx="16" cy="16" r="5" fill="#E8443F" stroke="${OUTLINE}" stroke-width="2"/><circle cx="30" cy="16" r="5" fill="#E8443F" stroke="${OUTLINE}" stroke-width="2"/><circle cx="44" cy="16" r="5" fill="#E8443F" stroke="${OUTLINE}" stroke-width="2"/></g>`,
    plush: `<g><circle cx="26" cy="28" r="16" fill="#B98A5E" stroke="${OUTLINE}" stroke-width="2.5"/><circle cx="14" cy="14" r="7" fill="#B98A5E" stroke="${OUTLINE}" stroke-width="2.5"/><circle cx="38" cy="14" r="7" fill="#B98A5E" stroke="${OUTLINE}" stroke-width="2.5"/><circle cx="20" cy="25" r="2.6" fill="#37474F"/><circle cx="32" cy="25" r="2.6" fill="#37474F"/><ellipse cx="26" cy="33" rx="4" ry="3" fill="#8A6242"/></g>`,
  };
  return `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">${items[kind] || items.brick}</svg>`;
}

/* ----------------------------------------------------------------------------
 * 7. 独木桥场景 · 侧视（bridge 关教学核心：桥板印步格数字）
 * steps = 桥长格数；roverAtStep = 机器人当前位置（0=左岸, 1..steps=桥上, steps+1=右岸）
 * 逻辑层负责动画时可用 roverX(step) 求横坐标后自行移动 rover 图层。
 * -------------------------------------------------------------------------- */
export function bridgeScene({ steps = 6 } = {}) {
  const bx = 120, bw = 64, by = 150; // 桥板起点/每格宽/桥面高
  let planks = '';
  for (let i = 1; i <= steps; i++) {
    const x = bx + (i - 1) * bw;
    const tone = i % 2 ? '#C89B6A' : '#B98A5E';
    planks += `<rect x="${x}" y="${by}" width="${bw - 4}" height="26" rx="4" fill="${tone}" stroke="${OUTLINE}" stroke-width="2.2"/>
      <circle cx="${x + bw / 2 - 2}" cy="${by + 44}" r="15" fill="#FFFFFF" stroke="${OUTLINE}" stroke-width="2.2"/>
      <text x="${x + bw / 2 - 2}" y="${by + 45}" font-size="17" font-weight="800" fill="${OUTLINE}" text-anchor="middle" dominant-baseline="middle">${i}</text>`;
  }
  const endX = bx + steps * bw;
  return `
<svg viewBox="0 0 ${endX + 130} 260" xmlns="http://www.w3.org/2000/svg">
  <!-- 水面 -->
  <rect x="0" y="${by + 62}" width="${endX + 130}" height="60" fill="#BEE3F0"/>
  <path d="M10 ${by + 76} q14 -7 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0" stroke="#8FCFE4" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- 左岸 -->
  <rect x="0" y="${by - 44}" width="${bx - 6}" height="106" rx="10" fill="#57B84E" stroke="${OUTLINE}" stroke-width="2.5"/>
  <rect x="0" y="${by - 44}" width="${bx - 6}" height="18" rx="9" fill="#6FCB66"/>
  <!-- 右岸 + 终点旗 -->
  <rect x="${endX + 2}" y="${by - 44}" width="126" height="106" rx="10" fill="#57B84E" stroke="${OUTLINE}" stroke-width="2.5"/>
  <rect x="${endX + 2}" y="${by - 44}" width="126" height="18" rx="9" fill="#6FCB66"/>
  <line x1="${endX + 56}" y1="${by - 100}" x2="${endX + 56}" y2="${by - 42}" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round"/>
  <path d="M${endX + 58} ${by - 98} L${endX + 106} ${by - 84} L${endX + 58} ${by - 70} Z" fill="#D01012" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
  ${planks}
  <!-- 桥索 -->
  <path d="M${bx - 4} ${by - 30} Q ${bx + (steps * bw) / 2} ${by - 64} ${endX} ${by - 30}" stroke="#8A6242" stroke-width="4" fill="none"/>
  <line x1="${bx - 4}" y1="${by - 30}" x2="${bx - 4}" y2="${by + 2}" stroke="#8A6242" stroke-width="4"/>
  <line x1="${endX}" y1="${by - 30}" x2="${endX}" y2="${by + 2}" stroke="#8A6242" stroke-width="4"/>
</svg>`;
}

/** bridge：第 n 步的机器人中心横坐标（0=左岸出发位） */
export function bridgeRoverX(step, steps = 6) {
  const bx = 120, bw = 64;
  if (step <= 0) return bx - 62;
  if (step > steps) return bx + steps * bw + 60;
  return bx + (step - 1) * bw + bw / 2 - 2;
}

/* ----------------------------------------------------------------------------
 * 8. 传送带场景 · 侧视（sort 关：包裹可数、滚轮结构真实）
 * n = 包裹数（= 应设的 Repeat 数）。宽度自适应 n。
 * -------------------------------------------------------------------------- */
export function beltScene({ n = 4 } = {}) {
  const seg = 92, bx = 150, by = 130;
  const W = bx + n * seg + 180;
  let parcels = '', rollers = '';
  for (let i = 0; i < n; i++) {
    const x = bx + i * seg + seg / 2;
    parcels += `
    <g transform="translate(${x} ${by - 34})">
      <rect x="-24" y="-24" width="48" height="46" rx="5" fill="#D9A05B" stroke="${OUTLINE}" stroke-width="2.4"/>
      <line x1="0" y1="-24" x2="0" y2="22" stroke="#B97C3B" stroke-width="7"/>
      <line x1="-24" y1="-2" x2="24" y2="-2" stroke="#B97C3B" stroke-width="7"/>
      <circle cx="0" cy="-2" r="9" fill="#FFE066" stroke="${OUTLINE}" stroke-width="2"/>
      <text x="0" y="0" font-size="11" font-weight="800" fill="${OUTLINE}" text-anchor="middle" dominant-baseline="middle">${i + 1}</text>
    </g>`;
  }
  const rollerCount = Math.floor((n * seg + 60) / 46);
  for (let i = 0; i <= rollerCount; i++) {
    rollers += `<circle cx="${bx - 30 + i * 46}" cy="${by + 22}" r="13" fill="#9AA7B4" stroke="${OUTLINE}" stroke-width="2.2"/><circle cx="${bx - 30 + i * 46}" cy="${by + 22}" r="4" fill="#E3E9EF"/>`;
  }
  return `
<svg viewBox="0 0 ${W} 220" xmlns="http://www.w3.org/2000/svg">
  <!-- 仓库背景门 -->
  <rect x="${W - 150}" y="26" width="130" height="150" rx="10" fill="#CFE0EE" stroke="${OUTLINE}" stroke-width="2.5"/>
  <rect x="${W - 132}" y="60" width="94" height="116" rx="6" fill="#8FB3D4" stroke="${OUTLINE}" stroke-width="2"/>
  <line x1="${W - 132}" y1="90" x2="${W - 38}" y2="90" stroke="#6E96BC" stroke-width="3"/>
  <line x1="${W - 132}" y1="120" x2="${W - 38}" y2="120" stroke="#6E96BC" stroke-width="3"/>
  <text x="${W - 85}" y="48" font-size="16" font-weight="800" fill="${OUTLINE}" text-anchor="middle">仓库</text>
  <!-- 传送带带体 -->
  <rect x="${bx - 44}" y="${by}" width="${n * seg + 88}" height="20" rx="10" fill="#4A4A4A" stroke="${OUTLINE}" stroke-width="2.5"/>
  <line x1="${bx - 34}" y1="${by + 10}" x2="${bx + n * seg + 34}" y2="${by + 10}" stroke="#6E6E6E" stroke-width="4" stroke-dasharray="10 12"/>
  ${rollers}
  ${parcels}
</svg>`;
}

/* ----------------------------------------------------------------------------
 * 9. 跑道场景 · 俯视（race 关：红绿瓷砖嵌在跑道里，一眼可见）
 * tiles = ['red'|'green'|null, ...] 每格的瓷砖颜色（null 为普通格）。
 * -------------------------------------------------------------------------- */
export function trackScene({ tiles = [null, 'red', null, 'green', null, 'red', null] } = {}) {
  const seg = 84, tx = 90, ty = 60, th = 110;
  const W = tx + tiles.length * seg + 130;
  let cells = '';
  tiles.forEach((t, i) => {
    const x = tx + i * seg;
    const base = i % 2 ? '#EDEDE4' : '#E2E2D6';
    cells += `<rect x="${x}" y="${ty}" width="${seg - 3}" height="${th}" fill="${base}" stroke="#C9C9BC" stroke-width="1.5"/>`;
    if (t === 'red') cells += `<rect x="${x + 10}" y="${ty + 14}" width="${seg - 23}" height="${th - 28}" rx="8" fill="#E8443F" stroke="${OUTLINE}" stroke-width="2.5"/><circle cx="${x + seg / 2 - 1}" cy="${ty + th / 2}" r="9" fill="#D01012" stroke="#FFF" stroke-width="2.5"/>`;
    if (t === 'green') cells += `<rect x="${x + 10}" y="${ty + 14}" width="${seg - 23}" height="${th - 28}" rx="8" fill="#57B84E" stroke="${OUTLINE}" stroke-width="2.5"/><path d="M${x + seg / 2 - 13} ${ty + th / 2} l8 9 l16 -18" stroke="#FFF" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const endX = tx + tiles.length * seg;
  let checker = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
    if ((r + c) % 2 === 0) checker += `<rect x="${endX + 14 + c * 16}" y="${ty + 10 + r * 24}" width="16" height="24" fill="#2B2B2B"/>`;
  }
  return `
<svg viewBox="0 0 ${W} 230" xmlns="http://www.w3.org/2000/svg">
  <!-- 草地 -->
  <rect x="0" y="0" width="${W}" height="230" rx="18" fill="#CBE6C4"/>
  <!-- 跑道 -->
  <rect x="${tx - 40}" y="${ty - 14}" width="${tiles.length * seg + 136}" height="${th + 28}" rx="14" fill="#F2F2E9" stroke="${OUTLINE}" stroke-width="2.5"/>
  ${cells}
  <!-- 终点格纹 -->
  <rect x="${endX + 8}" y="${ty + 4}" width="44" height="${th - 8}" rx="6" fill="#FFFFFF" stroke="${OUTLINE}" stroke-width="2.5"/>
  ${checker}
</svg>`;
}

/** race：第 i 格中心横坐标 */
export function trackCellX(i) { return 90 + i * 84 + 40; }

/* ----------------------------------------------------------------------------
 * 10. 寻宝网格地块（hunt/macro 通用 tile 库，替换 emoji）
 * -------------------------------------------------------------------------- */
export const tiles = {
  grass: (s = 72) => `<svg viewBox="0 0 72 72" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="69" height="69" rx="8" fill="#DFF0DA" stroke="#C4DDBC" stroke-width="2"/><path d="M13 53 q2.5 -10 5 0 M18 53 q2.5 -8 5 0 M31 25 q2.5 -10 5 0 M36 25 q2.5 -8 5 0 M49 45 q2.5 -10 5 0 M54 45 q2.5 -8 5 0" stroke="#7FB874" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  rock: (s = 72) => `<svg viewBox="0 0 72 72" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="69" height="69" rx="8" fill="#DFF0DA" stroke="#C4DDBC" stroke-width="2"/><path d="M16 52 L22 30 L34 20 L50 24 L58 40 L54 52 Z" fill="#9AA7B4" stroke="${OUTLINE}" stroke-width="2.6" stroke-linejoin="round"/><path d="M30 34 L40 30 M26 44 L48 40" stroke="#7E8B98" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  gem: (s = 72) => `<svg viewBox="0 0 72 72" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="69" height="69" rx="8" fill="#FFF4CE" stroke="#EDD98F" stroke-width="2"/><path d="M24 24 L48 24 L58 38 L36 60 L14 38 Z" fill="#6FD3F2" stroke="${OUTLINE}" stroke-width="2.6" stroke-linejoin="round"/><path d="M24 24 L36 38 L48 24 M14 38 L36 38 L58 38 M36 38 L36 59" stroke="#3FB6DE" stroke-width="2.2"/><path d="M28 28 L33 33" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/></svg>`,
  flag: (s = 72) => `<svg viewBox="0 0 72 72" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="69" height="69" rx="8" fill="#DFF0DA" stroke="#C4DDBC" stroke-width="2"/><line x1="28" y1="14" x2="28" y2="58" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round"/><path d="M30 16 L56 24 L30 32 Z" fill="#D01012" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
};

/* ----------------------------------------------------------------------------
 * 11. 表冠式数字拨轮（bridge/sort 参数输入，替换灰球按钮）
 * 逻辑层负责 +/- 事件与数字更新，这里给出成套外观（含上下箭头按钮位）。
 * -------------------------------------------------------------------------- */
export function dialFrame({ label = '圈数' } = {}) {
  return `
<svg viewBox="0 0 150 190" xmlns="http://www.w3.org/2000/svg">
  <rect x="26" y="34" width="98" height="122" rx="16" fill="#F5C518" stroke="${OUTLINE}" stroke-width="3"/>
  <rect x="40" y="66" width="70" height="58" rx="10" fill="#FFFFFF" stroke="${OUTLINE}" stroke-width="2.5"/>
  <!-- 上下按钮区（逻辑层叠 <button>，这里画箭头槽） -->
  <path d="M62 46 L75 34 L88 46 Z" fill="#FFFFFF" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M62 144 L75 156 L88 144 Z" fill="#FFFFFF" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="40" cy="50" r="4" fill="#FFE066" stroke="${OUTLINE}" stroke-width="1.6"/>
  <circle cx="110" cy="50" r="4" fill="#FFE066" stroke="${OUTLINE}" stroke-width="1.6"/>
  <text x="75" y="176" font-size="15" font-weight="800" fill="${OUTLINE}" text-anchor="middle">${label}</text>
</svg>`;
}

/* ============================================================================
 * v3 新增资产（2026-07-13 · claw 重做 / hunt 传送门 / sort 彩色包裹 /
 * bridge 大小轮 —— Fable 5 亲绘，worker 禁改图形）
 * ========================================================================== */

/* ----------------------------------------------------------------------------
 * 12. 娃娃机机厢 · 侧视（claw v3 主场景）
 * 教学结构直接画进图里：顶部导轨 + 齿轮爪车（转圈→横移），底部编号位置格。
 * gridCount = 位置格数；unitLabel 显示"1圈=N格"的图例。
 * 动画接口：#claw-trolley 组做 translateX 横移（用 clawGridX(i) 求目标 x），
 * 其内 #claw-gear 做 rotate（横移时转动），#claw-hoist 做 translateY 下降，
 * #claw-fingers-l/r 做 rotate 开合。奖品由逻辑层叠放在 clawGridX(i) 底格上方。
 * -------------------------------------------------------------------------- */
export function clawMachineScene({ gridCount = 8 } = {}) {
  const cell = 66, x0 = 96, floorY = 320, railY = 78;
  const W = x0 + gridCount * cell + 60;
  // 起点标记（S 位，爪车 0 位正下方）+ 等距位置格 1..N（格 i 中心 = x0 + i*cell，与"1圈=1格"严格对应）
  let grid = `<circle cx="${x0}" cy="${floorY + 22}" r="14" fill="#57B84E" stroke="#37474F" stroke-width="2.2"/>
      <text x="${x0}" y="${floorY + 23}" font-size="14" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">S</text>`;
  for (let i = 1; i <= gridCount; i++) {
    const x = x0 + i * cell;
    grid += `<line x1="${x - cell / 2}" y1="${floorY}" x2="${x - cell / 2}" y2="${floorY - 10}" stroke="#B9C7D4" stroke-width="2"/>
      <circle cx="${x}" cy="${floorY + 22}" r="14" fill="#FFFFFF" stroke="#37474F" stroke-width="2.2"/>
      <text x="${x}" y="${floorY + 23}" font-size="15" font-weight="800" fill="#37474F" text-anchor="middle" dominant-baseline="middle">${i}</text>`;
  }
  return `
<svg viewBox="0 0 ${W} 390" xmlns="http://www.w3.org/2000/svg">
  <!-- 机厢外框 -->
  <rect x="8" y="8" width="${W - 16}" height="374" rx="20" fill="#EAF6F8" stroke="#37474F" stroke-width="3"/>
  <!-- 顶部招牌灯条 -->
  <rect x="8" y="8" width="${W - 16}" height="34" rx="17" fill="#F5C518" stroke="#37474F" stroke-width="3"/>
  ${Array.from({ length: Math.floor((W - 60) / 46) }, (_, i) => `<circle cx="${34 + i * 46}" cy="25" r="6" fill="#FFF7DC" stroke="#E0A800" stroke-width="1.5"/>`).join('')}
  <!-- 导轨（带齿条纹理） -->
  <rect x="${x0 - 40}" y="${railY - 8}" width="${gridCount * cell + 80}" height="16" rx="8" fill="#9AA7B4" stroke="#37474F" stroke-width="2.5"/>
  ${Array.from({ length: Math.floor((gridCount * cell + 60) / 16) }, (_, i) => `<line x1="${x0 - 30 + i * 16}" y1="${railY + 8}" x2="${x0 - 22 + i * 16}" y2="${railY + 8}" stroke="#6E7B88" stroke-width="3"/>`).join('')}
  <!-- 爪车（逻辑层对此组 translateX；初始在 0 位 = 导轨最左） -->
  <g id="claw-trolley">
    <rect x="${x0 - 34}" y="${railY - 26}" width="68" height="30" rx="8" fill="#F5C518" stroke="#37474F" stroke-width="2.5"/>
    <circle cx="${x0 - 20}" cy="${railY - 30}" r="4" fill="#FFE066" stroke="#37474F" stroke-width="1.5"/>
    <circle cx="${x0 + 20}" cy="${railY - 30}" r="4" fill="#FFE066" stroke="#37474F" stroke-width="1.5"/>
    <!-- 驱动齿轮（横移时 rotate，教学：转圈→位移） -->
    <g id="claw-gear" transform="rotate(0 ${x0} ${railY + 14})">
      <circle cx="${x0}" cy="${railY + 14}" r="15" fill="#00A3B2" stroke="#37474F" stroke-width="2.5"/>
      ${Array.from({ length: 8 }, (_, i) => { const a = (Math.PI * 2 * i) / 8; return `<rect x="${x0 + Math.cos(a) * 15 - 3}" y="${railY + 14 + Math.sin(a) * 15 - 3}" width="6" height="6" rx="1.5" fill="#00A3B2" stroke="#37474F" stroke-width="1.5" transform="rotate(${(360 / 16) + i * 45} ${x0 + Math.cos(a) * 15} ${railY + 14 + Math.sin(a) * 15})"/>`; }).join('')}
      <circle cx="${x0}" cy="${railY + 14}" r="5" fill="#BDF3F8" stroke="#37474F" stroke-width="1.8"/>
    </g>
    <!-- 吊臂组（逻辑层对此组 translateY 下降；缆绳用 #claw-cable 的 height 拉长） -->
    <g id="claw-hoist">
      <line id="claw-cable" x1="${x0}" y1="${railY + 26}" x2="${x0}" y2="${railY + 74}" stroke="#37474F" stroke-width="3.5"/>
      <circle cx="${x0}" cy="${railY + 82}" r="11" fill="#F5C518" stroke="#37474F" stroke-width="2.5"/>
      <path id="claw-fingers-l" d="M${x0 - 4} ${railY + 90} Q${x0 - 20} ${railY + 104} ${x0 - 13} ${railY + 118}" stroke="#37474F" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path id="claw-fingers-r" d="M${x0 + 4} ${railY + 90} Q${x0 + 20} ${railY + 104} ${x0 + 13} ${railY + 118}" stroke="#37474F" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>
  </g>
  <!-- 底部平台与位置格 -->
  <rect x="${x0 - 40}" y="${floorY}" width="${gridCount * cell + 80}" height="12" rx="6" fill="#C7D6E4" stroke="#37474F" stroke-width="2.5"/>
  ${grid}
  <!-- 出奖口（左端） -->
  <rect x="${x0 - 78}" y="${floorY - 52}" width="44" height="64" rx="8" fill="#0055BF" stroke="#37474F" stroke-width="2.5"/>
  <rect x="${x0 - 70}" y="${floorY - 40}" width="28" height="40" rx="5" fill="#3D7BD9"/>
  <text x="${x0 - 56}" y="${floorY - 58}" font-size="13" font-weight="800" fill="#37474F" text-anchor="middle">出奖口</text>
</svg>`;
}

/** claw v3：移动到第 i 格时 trolley 的 translateX 偏移（0 = 起点 S 位；每格 = 66px，与"1圈=1格"严格等距） */
export function clawGridX(i) {
  const cell = 66;
  return Math.max(0, i) * cell;
}

/* ----------------------------------------------------------------------------
 * 13. 传送门地块（hunt L3）：一对漩涡门 A/B
 * -------------------------------------------------------------------------- */
tiles.portal = (s = 72, hue = 'purple') => {
  const cs = hue === 'purple' ? ['#B39DDB', '#7E57C2', '#4527A0'] : ['#81D4FA', '#29B6F6', '#0277BD'];
  return `<svg viewBox="0 0 72 72" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <rect x="1.5" y="1.5" width="69" height="69" rx="8" fill="#DFF0DA" stroke="#C4DDBC" stroke-width="2"/>
  <ellipse cx="36" cy="36" rx="24" ry="27" fill="${cs[0]}" stroke="#37474F" stroke-width="2.6"/>
  <ellipse cx="36" cy="36" rx="16" ry="19" fill="${cs[1]}"/>
  <path d="M36 14 q16 8 8 22 q-6 12 -14 8 q-8 -4 -2 -12 q5 -7 -2 -10" fill="none" stroke="${cs[2]}" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="36" cy="36" rx="5" ry="6" fill="#FFFFFF" opacity="0.9"/>
</svg>`;
};

/* ----------------------------------------------------------------------------
 * 14. beltScene 彩色包裹版（sort v3）：colors = ['red'|'blue'|'yellow', ...]
 * 序列即题面；包裹颜色决定要执行的分拣动作。
 * -------------------------------------------------------------------------- */
export function beltSceneColored({ colors = ['red', 'blue', 'blue'] } = {}) {
  const palette = { red: ['#E8443F', '#C62D28'], blue: ['#3D7BD9', '#2557A8'], yellow: ['#F5C518', '#D9A800'] };
  const n = colors.length;
  const seg = 78, bx = 130, by = 130;
  const W = bx + n * seg + 170;
  let parcels = '', rollers = '';
  colors.forEach((c, i) => {
    const [f, d] = palette[c] || palette.red;
    const x = bx + i * seg + seg / 2;
    parcels += `
    <g class="parcel" data-idx="${i}" transform="translate(${x} ${by - 32})">
      <rect x="-22" y="-22" width="44" height="42" rx="5" fill="${f}" stroke="#37474F" stroke-width="2.4"/>
      <line x1="0" y1="-22" x2="0" y2="20" stroke="${d}" stroke-width="6"/>
      <circle cx="0" cy="-1" r="8.5" fill="#FFFFFF" stroke="#37474F" stroke-width="2"/>
      <text x="0" y="0" font-size="10.5" font-weight="800" fill="#37474F" text-anchor="middle" dominant-baseline="middle">${i + 1}</text>
    </g>`;
  });
  const rollerCount = Math.floor((n * seg + 60) / 44);
  for (let i = 0; i <= rollerCount; i++) {
    rollers += `<circle cx="${bx - 26 + i * 44}" cy="${by + 20}" r="12" fill="#9AA7B4" stroke="#37474F" stroke-width="2.2"/><circle cx="${bx - 26 + i * 44}" cy="${by + 20}" r="3.6" fill="#E3E9EF"/>`;
  }
  return `
<svg viewBox="0 0 ${W} 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="${W - 140}" y="20" width="122" height="146" rx="10" fill="#CFE0EE" stroke="#37474F" stroke-width="2.5"/>
  <rect x="${W - 124}" y="52" width="90" height="114" rx="6" fill="#8FB3D4" stroke="#37474F" stroke-width="2"/>
  <text x="${W - 79}" y="42" font-size="15" font-weight="800" fill="#37474F" text-anchor="middle">分拣站</text>
  <rect x="${bx - 40}" y="${by}" width="${n * seg + 80}" height="18" rx="9" fill="#4A4A4A" stroke="#37474F" stroke-width="2.5"/>
  <line x1="${bx - 30}" y1="${by + 9}" x2="${bx + n * seg + 30}" y2="${by + 9}" stroke="#6E6E6E" stroke-width="4" stroke-dasharray="9 11"/>
  ${rollers}
  ${parcels}
</svg>`;
}

/* ----------------------------------------------------------------------------
 * 15. roverSide 大小轮版（bridge v3）：wheelScale 1 = 小轮(1圈1步)，1.45 = 大轮(1圈2步)
 * 大轮视觉上明显更大并带双圈胎纹，孩子一眼分清。
 * -------------------------------------------------------------------------- */
export function roverSideWheeled({ wheelAngle = 0, face = 'happy', wheelScale = 1 } = {}) {
  const base = roverSide({ wheelAngle, face });
  if (wheelScale === 1) return base;
  // 大轮：放大轮组并加外圈胎纹
  return base
    .replace(/r="20"/g, 'r="28"')
    .replace(/r="13"/g, 'r="18"')
    .replace('</svg>', `<circle cx="44" cy="82" r="24" fill="none" stroke="#5A5A5A" stroke-width="2" stroke-dasharray="5 6"/><circle cx="106" cy="82" r="24" fill="none" stroke="#5A5A5A" stroke-width="2" stroke-dasharray="5 6"/></svg>`);
}

/* ----------------------------------------------------------------------------
 * 16. 真人互动游戏动作图标集（「一起玩」分类用 · 简笔小人，姿态一眼可读）
 * 统一 96×96；主体深灰粗线，动作强调部位橙色。key 与真人游戏配置对应。
 * -------------------------------------------------------------------------- */
const P = '#37474F', ACC = '#FF8F00';
const stick = (body) => `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
export const actionIcons = {
  /* 蹲下：屈膝低重心，双手前平 */
  squat: () => stick(`
    <circle cx="48" cy="34" r="11" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <path d="M48 45 L48 60 L36 70 L36 82" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M48 60 L60 70 L60 82" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M48 50 L70 54 M48 50 L26 54" stroke="${ACC}" stroke-width="5" stroke-linecap="round"/>
    <line x1="20" y1="86" x2="76" y2="86" stroke="#B9C7D4" stroke-width="3" stroke-linecap="round"/>`),
  /* 跳跃：双脚离地，手上扬，弹跳线 */
  jump: () => stick(`
    <circle cx="48" cy="22" r="11" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <path d="M48 33 L48 54" stroke="${P}" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 38 L68 26 M48 38 L28 26" stroke="${ACC}" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 54 L38 66 L34 60 M48 54 L58 66 L62 60" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M30 80 q6 -5 12 0 M54 80 q6 -5 12 0" stroke="#B9C7D4" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  /* 转圈：小人+环绕箭头 */
  spin: () => stick(`
    <circle cx="48" cy="30" r="10" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <path d="M48 40 L48 62 M48 46 L60 52 M48 46 L36 52 M48 62 L40 78 M48 62 L56 78" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M20 48 a28 22 0 1 1 8 18" stroke="${ACC}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <path d="M24 70 L28 64 L33 71 Z" fill="${ACC}"/>`),
  /* 拍手：双手胸前合，放射线 */
  clap: () => stick(`
    <circle cx="48" cy="26" r="11" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <path d="M48 37 L48 64 M48 64 L38 84 M48 64 L58 84" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M48 46 L58 52 M48 46 L38 52" stroke="${ACC}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="48" cy="53" r="6" fill="${ACC}"/>
    <path d="M60 44 l6 -5 M62 53 l8 0 M36 44 l-6 -5 M34 53 l-8 0" stroke="${ACC}" stroke-width="3" stroke-linecap="round"/>`),
  /* 单脚站：一腿直立一腿弯抬，双臂平展 */
  oneleg: () => stick(`
    <circle cx="48" cy="24" r="11" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <path d="M48 35 L48 60" stroke="${P}" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 42 L72 42 M48 42 L24 42" stroke="${ACC}" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 60 L48 84" stroke="${P}" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 60 L62 66 L62 56" stroke="${ACC}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="26" y1="88" x2="70" y2="88" stroke="#B9C7D4" stroke-width="3" stroke-linecap="round"/>`),
  /* 摸耳朵：一手弯至头侧，耳朵标橙 */
  touchear: () => stick(`
    <circle cx="48" cy="30" r="11" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <circle cx="59" cy="30" r="3.5" fill="${ACC}"/>
    <path d="M48 41 L48 66 M48 66 L38 86 M48 66 L58 86" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M48 48 L66 44 L62 32" stroke="${ACC}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M48 50 L32 60" stroke="${P}" stroke-width="5" stroke-linecap="round"/>`),
  /* 跺脚：一脚高抬猛踏，冲击线 */
  stomp: () => stick(`
    <circle cx="46" cy="24" r="11" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <path d="M46 35 L46 58 M46 42 L60 50 M46 42 L32 50" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M46 58 L40 84" stroke="${P}" stroke-width="5" stroke-linecap="round"/>
    <path d="M46 58 L62 62 L64 74" stroke="${ACC}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M58 82 l4 6 M66 80 l1 7 M72 76 l6 5" stroke="${ACC}" stroke-width="3" stroke-linecap="round"/>
    <line x1="20" y1="88" x2="54" y2="88" stroke="#B9C7D4" stroke-width="3" stroke-linecap="round"/>`),
  /* 定住不动：立正 + 僵直强调框 */
  freeze: () => stick(`
    <rect x="14" y="6" width="68" height="84" rx="10" fill="none" stroke="${ACC}" stroke-width="3.5" stroke-dasharray="8 6"/>
    <circle cx="48" cy="28" r="11" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <path d="M48 39 L48 64 M48 46 L58 58 M48 46 L38 58 M48 64 L42 84 M48 64 L54 84" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round"/>`),
  /* 拍腿：双手贴大腿侧，拍击线 */
  patlegs: () => stick(`
    <circle cx="48" cy="24" r="11" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <path d="M48 35 L48 60 M48 60 L40 84 M48 60 L56 84" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M48 42 L60 58 M48 42 L36 58" stroke="${ACC}" stroke-width="5" stroke-linecap="round"/>
    <path d="M62 62 l5 4 M34 62 l-5 4" stroke="${ACC}" stroke-width="3" stroke-linecap="round"/>`),
  /* 举手：单手直冲天 */
  raisehand: () => stick(`
    <circle cx="48" cy="30" r="11" fill="#FFE0B2" stroke="${P}" stroke-width="3"/>
    <path d="M48 41 L48 66 M48 66 L38 86 M48 66 L58 86 M48 48 L34 58" stroke="${P}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M48 48 L62 30 L62 12" stroke="${ACC}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="62" cy="10" r="4" fill="${ACC}"/>`),
};
