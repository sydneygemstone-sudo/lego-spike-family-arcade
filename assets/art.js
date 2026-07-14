/**
 * Robotics Adventure vector art.
 * A completely redrawn visual system: deep-navy construction lines, coral / teal /
 * gold signals, crisp geometric forms and restrained 2.5D facets. All public APIs
 * and animation hooks from the original asset module are retained.
 */
import { V, svgOpen, svgClose, textStyle, hardwarePanel, bolt, wheel, faceMarkup, gear, arrow, tinyStars } from './vector-system.js';

const O = V.ink;
const label = (x, y, value, size = 14, fill = O, anchor = 'middle') =>
  `<text x="${x}" y="${y}" ${textStyle} font-size="${size}" font-weight="800" fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle">${value}</text>`;

export function roverSide({ wheelAngle = 0, face = 'happy' } = {}) {
  return `${svgOpen('0 0 150 110', '机器人探险车侧视图')}
    <ellipse cx="77" cy="100" rx="61" ry="7" fill="${O}" opacity=".14"/>
    <path d="M18 58L30 45H120L134 58V74H18Z" fill="${V.teal}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 45L39 36H109L120 45Z" fill="${V.tealDark}" stroke="${O}" stroke-width="2.4"/>
    <path d="M42 16H101L112 29V61H36V25Z" fill="${V.gold}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M42 16H101L112 29H52Z" fill="#FFE39A" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="53" y="28" width="43" height="27" rx="8" fill="${V.paper}" stroke="${O}" stroke-width="2.3"/>
    ${faceMarkup(face, 74.5, 39, .78)}
    ${bolt(45, 20, 3.4)}${bolt(98, 20, 3.4)}
    <path d="M122 50h12l8 7-8 7h-12Z" fill="${V.coral}" stroke="${O}" stroke-width="2.5"/>
    ${wheel(43, 81, 20, wheelAngle)}${wheel(108, 81, 20, wheelAngle)}
  ${svgClose}`;
}

export function roverTop({ face = 'happy' } = {}) {
  return `${svgOpen('0 0 108 120', '机器人探险车俯视图')}
    <ellipse cx="54" cy="106" rx="42" ry="7" fill="${O}" opacity=".12"/>
    <path d="M54 3L73 25H35Z" fill="${V.coral}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="5" y="30" width="18" height="67" rx="9" fill="${V.rubber}" stroke="${O}" stroke-width="3"/>
    <rect x="85" y="30" width="18" height="67" rx="9" fill="${V.rubber}" stroke="${O}" stroke-width="3"/>
    <path d="M14 40v47M94 40v47" stroke="${V.steel}" stroke-width="3" stroke-dasharray="6 6"/>
    <path d="M24 26H84L91 36V94L79 104H29L17 94V36Z" fill="${V.gold}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M24 26H84L91 36H32Z" fill="#FFE39A" stroke="${O}" stroke-width="2"/>
    <rect x="31" y="38" width="46" height="34" rx="9" fill="${V.paper}" stroke="${O}" stroke-width="2.3"/>
    ${faceMarkup(face, 54, 51, .9)}
    <path d="M31 79H77V96H31Z" fill="${V.teal}" stroke="${O}" stroke-width="2.4"/>
    ${bolt(42, 87.5, 3.4, V.paper)}${bolt(66, 87.5, 3.4, V.paper)}
  ${svgClose}`;
}

export function clawTopScene({ unitDeg = 30, armDeg = 0, showTargetRay = null } = {}) {
  const R = 150, cx = 205, cy = 196;
  let ticks = '', wedges = '';
  for (let d = 0; d <= 180; d += unitDeg) {
    const a = Math.PI * d / 180;
    const x1 = cx + Math.cos(a) * (R - 14), y1 = cy - Math.sin(a) * (R - 14);
    const x2 = cx + Math.cos(a) * R, y2 = cy - Math.sin(a) * R;
    const xt = cx + Math.cos(a) * (R + 20), yt = cy - Math.sin(a) * (R + 20);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${O}" stroke-width="3"/>${label(xt, yt, `${d}°`, 13)}`;
    if (d < 180) {
      const b = Math.PI * (d + unitDeg) / 180;
      const x3 = cx + Math.cos(b) * (R - 40), y3 = cy - Math.sin(b) * (R - 40);
      const x4 = cx + Math.cos(a) * (R - 40), y4 = cy - Math.sin(a) * (R - 40);
      wedges += `<path d="M${x1} ${y1}A${R - 14} ${R - 14} 0 0 0 ${cx + Math.cos(b) * (R - 14)} ${cy - Math.sin(b) * (R - 14)}L${x3} ${y3}A${R - 40} ${R - 40} 0 0 1 ${x4} ${y4}Z" fill="${(d / unitDeg) % 2 ? V.panel : V.panelDeep}"/>`;
    }
  }
  let ray = '';
  if (showTargetRay !== null) {
    const a = Math.PI * showTargetRay / 180;
    ray = arrow(cx, cy, cx + Math.cos(a) * (R - 6), cy - Math.sin(a) * (R - 6), V.coral, 3);
  }
  return `${svgOpen('0 0 410 260', '机械爪角度控制台')}
    ${hardwarePanel(4, 4, 402, 252, V.panel, 18)}
    <path d="M55 196A150 150 0 0 1 355 196Z" fill="${V.paper}" stroke="${O}" stroke-width="2.5"/>
    ${wedges}${ticks}${ray}
    <g id="claw-arm-rot" transform="rotate(${-armDeg} ${cx} ${cy})">
      <path d="M205 184H309L329 196 309 208H205Z" fill="${V.gold}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M220 184H309L329 196H220Z" fill="#FFE39A" opacity=".8"/>
      ${bolt(238, 196)}${bolt(272, 196)}
      <circle cx="303" cy="196" r="17" fill="${V.teal}" stroke="${O}" stroke-width="3"/>
      <path d="M295 190l8 6 8-6M295 202l8-6 8 6" fill="none" stroke="${V.paper}" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <circle cx="205" cy="196" r="30" fill="${V.blue}" stroke="${O}" stroke-width="3"/>
    ${gear(205, 196, 18, 10, V.teal)}
  ${svgClose}`;
}

export function clawTargetSlot(deg) {
  const a = Math.PI * deg / 180;
  return { x: 205 + Math.cos(a) * 98, y: 196 - Math.sin(a) * 98 };
}

export function depthGauge({ totalTurns = 4, turns = 1, targetTurns = null } = {}) {
  const top = 34, step = 36, x = 94;
  let rows = '';
  for (let i = 1; i <= totalTurns; i += 1) rows += `<line x1="55" y1="${top + i * step}" x2="129" y2="${top + i * step}" stroke="${V.steel}" stroke-width="2" stroke-dasharray="5 5"/>${label(145, top + i * step, `${i}圈`, 12, O, 'end')}`;
  const y = top + turns * step;
  const target = targetTurns === null ? '' : `<path d="M40 ${top + targetTurns * step}l12-8v16Z" fill="${V.coral}"/>`;
  return `${svgOpen('0 0 170 210', '机械爪深度表')}${hardwarePanel(4, 4, 162, 202, V.paper, 16)}
    <path d="M58 25H130V39H58Z" fill="${V.inkSoft}" stroke="${O}" stroke-width="2.4"/>${rows}${target}
    <line x1="${x}" y1="39" x2="${x}" y2="${y - 13}" stroke="${O}" stroke-width="3"/>
    <g transform="translate(${x} ${y})"><circle cy="-8" r="10" fill="${V.gold}" stroke="${O}" stroke-width="2.4"/><path d="M-4 0Q-20 12-12 25M4 0Q20 12 12 25" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/></g>
  ${svgClose}`;
}

export function forceGauge({ value = 5, min = 3, max = 5 } = {}) {
  const cx = 118, cy = 122, R = 82;
  const a = v => Math.PI - Math.PI * v / 10;
  const point = (v, r) => [cx + Math.cos(a(v)) * r, cy - Math.sin(a(v)) * r];
  let ticks = '';
  for (let v = 0; v <= 10; v += 1) {
    const [x1, y1] = point(v, R - (v % 5 ? 9 : 15)); const [x2, y2] = point(v, R);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${O}" stroke-width="${v % 5 ? 1.7 : 3}"/>`;
  }
  const arc = (v0, v1, color, width) => { const [x0, y0] = point(v0, R); const [x1, y1] = point(v1, R); return `<path d="M${x0} ${y0}A${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`; };
  const [nx, ny] = point(value, 59);
  return `${svgOpen('0 0 236 150', '机械爪夹力表')}${hardwarePanel(4, 4, 228, 142, V.paper, 16)}
    ${arc(0, 10, V.panelDeep, 11)}${arc(min, max, V.teal, 11)}${ticks}
    <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${V.coral}" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="8" fill="${V.coral}" stroke="${O}" stroke-width="2"/>
    ${label(cx, 139, '夹力 N', 12)}
  ${svgClose}`;
}

export function prize(kind = 'brick') {
  const p = {
    glass: `<path d="M15 9H39L35 42Q27 49 19 42Z" fill="#BDECF4" stroke="${O}" stroke-width="2.6"/><ellipse cx="27" cy="9" rx="12" ry="4" fill="${V.paper}" stroke="${O}" stroke-width="2"/><path d="M21 17v18" stroke="white" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
    egg: `<path d="M27 5Q42 20 42 34A15 14 0 0 1 12 34Q12 20 27 5Z" fill="#FFF4DA" stroke="${O}" stroke-width="2.7"/>${tinyStars([[21,25,2],[32,18,1.5]], V.gold)}`,
    brick: `<path d="M6 20H48V44H6Z" fill="${V.coral}" stroke="${O}" stroke-width="2.7"/><path d="M6 20H48L42 14H12Z" fill="#FF9A91" stroke="${O}" stroke-width="2"/>${[14,27,40].map(x => `<circle cx="${x}" cy="15" r="4" fill="${V.coral}" stroke="${O}" stroke-width="1.7"/>`).join('')}`,
    plush: `<path d="M14 16Q9 6 18 7L25 14Q29 11 34 14L41 7Q50 7 42 18Q47 24 44 36Q41 47 27 48Q13 47 10 36Q7 24 14 16Z" fill="${V.gold}" stroke="${O}" stroke-width="2.7"/><circle cx="21" cy="28" r="2.5" fill="${O}"/><circle cx="34" cy="28" r="2.5" fill="${O}"/><path d="M23 36q4 4 8 0" fill="none" stroke="${O}" stroke-width="2.2" stroke-linecap="round"/>`,
  };
  return `${svgOpen('0 0 54 54', `奖品${kind}`)}${p[kind] || p.brick}${svgClose}`;
}

export function bridgeScene({ steps = 6 } = {}) {
  const bx = 120, bw = 64, by = 150, endX = bx + steps * bw, W = endX + 130;
  let planks = '', piers = '';
  for (let i = 1; i <= steps; i += 1) {
    const x = bx + (i - 1) * bw;
    planks += `<path d="M${x} ${by}H${x + bw - 4}L${x + bw - 10} ${by + 28}H${x + 6}Z" fill="${i % 2 ? V.gold : '#E5A936'}" stroke="${O}" stroke-width="2.3" stroke-linejoin="round"/>${label(x + bw / 2 - 2, by + 43, i, 15, O)}`;
  }
  const count = steps >= 6 ? 3 : 2;
  for (let i = 1; i <= count; i += 1) { const x = bx + steps * bw * i / (count + 1); piers += `<path d="M${x - 11} ${by + 24}H${x + 11}L${x + 15} 235H${x - 15}Z" fill="${V.blueDark}" stroke="${O}" stroke-width="2.5"/>`; }
  return `${svgOpen(`0 0 ${W} 260`, '机器人精准渡桥场景')}
    <rect width="${W}" height="260" rx="18" fill="${V.panel}"/><path d="M0 202Q60 184 120 202T240 202T360 202T480 202T600 202T720 202V260H0Z" fill="${V.water}"/>
    <path d="M0 225Q50 212 100 225T200 225T300 225T400 225T500 225T600 225" fill="none" stroke="${V.paper}" stroke-width="4" opacity=".75"/>
    ${piers}
    <path d="M0 110H114V210H0Z" fill="${V.teal}" stroke="${O}" stroke-width="3"/><path d="M${endX + 2} 110H${W}V210H${endX + 2}Z" fill="${V.teal}" stroke="${O}" stroke-width="3"/>
    <path d="M0 110H114L102 126H0ZM${endX + 2} 110H${W}V126H${endX + 14}Z" fill="#65D7C8"/>
    ${planks}
    <path d="M116 119Q${bx + steps * bw / 2} 74 ${endX + 2} 119" fill="none" stroke="${V.coral}" stroke-width="4"/>
    <path d="M${endX + 58} 110V53M${endX + 58} 55l48 14-48 15Z" fill="${V.coral}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
    ${tinyStars([[endX + 85,44,4],[70,71,3],[W - 40,130,3]])}
  ${svgClose}`;
}

export function bridgeRoverX(step, steps = 6) {
  if (step <= 0) return 58;
  if (step > steps) return 120 + steps * 64 + 60;
  return 120 + (step - 1) * 64 + 30;
}

export function beltScene({ n = 4 } = {}) {
  return beltSceneColored({ colors: Array.from({ length: n }, () => 'gold') });
}

export function trackScene({ tiles: cells = [null, 'red', null, 'green', null, 'red', null] } = {}) {
  const seg = 84, tx = 90, ty = 60, th = 110, endX = tx + cells.length * seg, W = endX + 130;
  const body = cells.map((kind, i) => {
    const x = tx + i * seg;
    const signal = kind === 'red' ? `<path d="M${x + 16} ${ty + 18}H${x + seg - 18}V${ty + th - 18}H${x + 16}Z" fill="${V.coral}" stroke="${O}" stroke-width="2.5"/>${label(x + seg / 2, ty + th / 2, 'STOP', 11, V.white)}` : kind === 'green' ? `<path d="M${x + 16} ${ty + 18}H${x + seg - 18}V${ty + th - 18}H${x + 16}Z" fill="${V.teal}" stroke="${O}" stroke-width="2.5"/>${arrow(x + 26, ty + th / 2, x + seg - 27, ty + th / 2, V.white, 4)}` : '';
    return `<path d="M${x} ${ty}H${x + seg - 3}V${ty + th}H${x}Z" fill="${i % 2 ? '#EDF3F7' : V.paper}" stroke="${V.panelDeep}" stroke-width="1.5"/>${signal}`;
  }).join('');
  let checker = '';
  for (let r = 0; r < 5; r += 1) for (let c = 0; c < 2; c += 1) checker += `<rect x="${endX + 12 + c * 16}" y="${ty + 7 + r * 19}" width="16" height="19" fill="${(r + c) % 2 ? V.white : O}"/>`;
  return `${svgOpen(`0 0 ${W} 230`, '机关竞速轨道')}
    <rect width="${W}" height="230" rx="18" fill="${V.tealDark}"/><path d="M0 24L${W} 0V42L0 72ZM0 188L${W} 154V206L0 230Z" fill="${V.teal}" opacity=".55"/>
    ${tinyStars([[34,38,4],[W - 48,33,3],[50,203,3],[W - 65,202,4]], V.gold)}
    <path d="M45 45H${endX + 70}Q${endX + 85} 45 ${endX + 85} 60V170Q${endX + 85} 185 ${endX + 70} 185H45Q30 185 30 170V60Q30 45 45 45Z" fill="${V.panel}" stroke="${O}" stroke-width="3"/>
    ${body}<rect x="${endX + 8}" y="${ty + 4}" width="44" height="${th - 8}" rx="5" fill="white" stroke="${O}" stroke-width="2.5"/>${checker}
  ${svgClose}`;
}

export function trackCellX(i) { return 90 + i * 84 + 40; }

const tileBase = (s, fill, body, tileLabel) => `${svgOpen('0 0 72 72', tileLabel, `width="${s}" height="${s}"`)}
  <path d="M9 2H63L70 9V63L63 70H9L2 63V9Z" fill="${fill}" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 2H63L70 9H16Z" fill="white" opacity=".25"/>${body}${svgClose}`;

export const tiles = {
  grass: (s = 72) => tileBase(s, '#DDF4EC', `<path d="M13 56q6-17 12 0M31 28q6-17 12 0M50 51q5-14 10 0" fill="none" stroke="${V.tealDark}" stroke-width="3" stroke-linecap="round"/>`, '草地格'),
  rock: (s = 72) => tileBase(s, '#DDF4EC', `<path d="M13 55L20 32 35 17 54 24 61 45 54 57Z" fill="${V.steel}" stroke="${O}" stroke-width="2.7" stroke-linejoin="round"/><path d="M20 32l15 8 19-16M35 40l-5 17" fill="none" stroke="${V.panelDeep}" stroke-width="2.5"/>`, '岩石障碍格'),
  gem: (s = 72) => tileBase(s, '#FFF2D0', `<path d="M18 29L27 18H47L57 30 36 58 15 30Z" fill="${V.teal}" stroke="${O}" stroke-width="2.7" stroke-linejoin="round"/><path d="M27 18l9 12 11-12M15 30h42M36 30v28" fill="none" stroke="#A2F1E7" stroke-width="2"/>${tinyStars([[54,16,4],[17,17,2]], V.coral)}`, '能源宝石格'),
  flag: (s = 72) => tileBase(s, '#DDF4EC', `<path d="M26 15v45" stroke="${O}" stroke-width="4" stroke-linecap="round"/><path d="M28 17l31 10-31 12Z" fill="${V.coral}" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="26" cy="14" r="4" fill="${V.gold}" stroke="${O}" stroke-width="2"/>`, '任务起点格'),
};

export function dialFrame({ label: dialLabel = '圈数' } = {}) {
  return `${svgOpen('0 0 150 190', `${dialLabel}数字拨轮`)}
    <path d="M34 28H116L127 40V153L116 165H34L23 153V40Z" fill="${V.gold}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M34 28H116L127 40H45Z" fill="#FFE39A"/>
    <rect x="40" y="64" width="70" height="60" rx="11" fill="${V.paper}" stroke="${O}" stroke-width="2.7"/>
    <path d="M62 49L75 36 88 49ZM62 141L75 154 88 141Z" fill="${V.paper}" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
    ${bolt(37,45,3.5)}${bolt(113,45,3.5)}${label(75,178,dialLabel,14)}
  ${svgClose}`;
}

export function clawMachineScene({ gridCount = 8 } = {}) {
  const cell = 66, x0 = 96, floorY = 320, railY = 78, W = x0 + gridCount * cell + 60;
  let grid = `<circle cx="${x0}" cy="${floorY + 23}" r="15" fill="${V.teal}" stroke="${O}" stroke-width="2.4"/>${label(x0, floorY + 24, 'S', 13, V.white)}`;
  for (let i = 1; i <= gridCount; i += 1) { const x = x0 + i * cell; grid += `<path d="M${x - cell / 2} ${floorY}v-12" stroke="${V.steel}" stroke-width="2"/><circle cx="${x}" cy="${floorY + 23}" r="15" fill="${V.paper}" stroke="${O}" stroke-width="2.4"/>${label(x, floorY + 24, i, 13)}`; }
  return `${svgOpen(`0 0 ${W} 390`, '双拨盘机器人抓取舱')}
    ${hardwarePanel(7, 7, W - 14, 375, V.panel, 22)}
    <path d="M18 18H${W - 18}V48H18Z" fill="${V.inkSoft}" stroke="${O}" stroke-width="2.5"/>${tinyStars(Array.from({length:Math.max(5,Math.floor((W-60)/48))},(_,i)=>[34+i*48,33,4]), V.gold)}
    <path d="M${x0 - 42} ${railY - 11}H${x0 + gridCount * cell + 42}V${railY + 9}H${x0 - 42}Z" fill="${V.steel}" stroke="${O}" stroke-width="2.7"/>
    <path d="M${x0 - 30} ${railY + 9}H${x0 + gridCount * cell + 30}" stroke="${O}" stroke-width="3" stroke-dasharray="10 8"/>
    <g id="claw-trolley">
      <path d="M${x0 - 35} ${railY - 30}H${x0 + 35}L${x0 + 29} ${railY + 6}H${x0 - 29}Z" fill="${V.gold}" stroke="${O}" stroke-width="2.7" stroke-linejoin="round"/>
      <path d="M${x0 - 35} ${railY - 30}H${x0 + 35}L${x0 + 26} ${railY - 17}H${x0 - 26}Z" fill="#FFE39A"/>
      ${bolt(x0 - 21, railY - 15, 3.5)}${bolt(x0 + 21, railY - 15, 3.5)}
      <g id="claw-gear">${gear(x0, railY + 14, 17, 10, V.teal)}</g>
      <g id="claw-hoist">
        <line id="claw-cable" x1="${x0}" y1="${railY + 26}" x2="${x0}" y2="${railY + 74}" stroke="${O}" stroke-width="3.5"/>
        <path d="M${x0 - 12} ${railY + 75}H${x0 + 12}L${x0 + 8} ${railY + 94}H${x0 - 8}Z" fill="${V.coral}" stroke="${O}" stroke-width="2.5"/>
        <path id="claw-fingers-l" d="M${x0 - 4} ${railY + 90}Q${x0 - 23} ${railY + 108} ${x0 - 14} ${railY + 123}" fill="none" stroke="${O}" stroke-width="5.5" stroke-linecap="round"/>
        <path id="claw-fingers-r" d="M${x0 + 4} ${railY + 90}Q${x0 + 23} ${railY + 108} ${x0 + 14} ${railY + 123}" fill="none" stroke="${O}" stroke-width="5.5" stroke-linecap="round"/>
      </g>
    </g>
    <path d="M${x0 - 43} ${floorY}H${x0 + gridCount * cell + 43}V${floorY + 14}H${x0 - 43}Z" fill="${V.inkSoft}" stroke="${O}" stroke-width="2.7"/>${grid}
    <path d="M20 ${floorY - 73}H72L83 ${floorY - 62}V${floorY + 14}H20Z" fill="${V.blue}" stroke="${O}" stroke-width="2.7"/><path d="M31 ${floorY - 54}H69V${floorY - 3}H31Z" fill="${V.blueDark}"/>${label(51, floorY - 84, '回收舱', 12)}
    <path d="M${W * .65} 56L${W * .52} 300M${W * .75} 56L${W * .66} 250" stroke="white" stroke-width="10" stroke-linecap="round" opacity=".25"/>
  ${svgClose}`;
}

export function clawGridX(i) { return Math.max(0, i) * 66; }

tiles.portal = (s = 72, hue = 'purple') => {
  const a = hue === 'purple' ? V.violet : V.blue, b = hue === 'purple' ? V.violetDark : V.blueDark;
  return tileBase(s, '#DDF4EC', `<ellipse cx="36" cy="38" rx="24" ry="28" fill="${O}" opacity=".16"/><path d="M36 10C53 10 64 22 64 37S53 64 36 64 8 52 8 37 19 10 36 10Z" fill="${a}" stroke="${O}" stroke-width="2.8"/><path d="M37 18C50 18 56 27 55 37S47 55 35 54 17 47 18 37s8-14 17-13 13 7 12 13-6 10-12 9-9-5-8-9" fill="none" stroke="${b}" stroke-width="4.5" stroke-linecap="round"/><circle cx="35" cy="37" r="5" fill="white"/>${tinyStars([[15,18,3],[57,16,2],[58,57,3]], V.gold)}`, '量子传送门格');
};

export function beltSceneColored({ colors = ['red', 'blue', 'blue'] } = {}) {
  const palette = { red: [V.coral, V.coralDark], blue: [V.blue, V.blueDark], yellow: [V.gold, V.goldDark], gold: [V.gold, V.goldDark] };
  const n = colors.length, seg = 78, bx = 130, by = 130, W = bx + n * seg + 170;
  let parcels = '', rollers = '';
  colors.forEach((c, i) => { const [fill, dark] = palette[c] || palette.red; const x = bx + i * seg + seg / 2; parcels += `<g class="parcel" data-idx="${i}" transform="translate(${x} ${by - 32})"><path d="M-23-18L0-29 23-18V20L0 31-23 20Z" fill="${fill}" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/><path d="M-23-18L0-7 23-18 0-29Z" fill="white" opacity=".22"/><path d="M0-7V31M-23-18L0-7 23-18" fill="none" stroke="${dark}" stroke-width="3"/>${label(0,8,i+1,11,V.white)}</g>`; });
  for (let i = 0; i <= Math.floor((n * seg + 60) / 44); i += 1) rollers += wheel(bx - 26 + i * 44, by + 20, 12, 0, V.gold);
  return `${svgOpen(`0 0 ${W} 200`, '自动分拣流水线')}
    <rect width="${W}" height="200" rx="18" fill="${V.panel}"/><path d="M12 13H${W - 155}V23H12Z" fill="${V.inkSoft}"/>
    <path d="M${W - 142} 21H${W - 18}V170H${W - 142}Z" fill="${V.blue}" stroke="${O}" stroke-width="3"/><path d="M${W - 126} 55H${W - 34}V170H${W - 126}Z" fill="${V.blueDark}"/>${label(W - 80,42,'SORT LAB',12,V.white)}
    <path d="M${bx - 42} ${by}H${bx + n * seg + 42}V${by + 20}H${bx - 42}Z" fill="${V.inkSoft}" stroke="${O}" stroke-width="3"/><path d="M${bx - 31} ${by + 10}H${bx + n * seg + 31}" stroke="${V.steel}" stroke-width="3" stroke-dasharray="10 10"/>${rollers}${parcels}
    ${tinyStars([[35,45,4],[70,78,3],[W-35,18,3]])}
  ${svgClose}`;
}

export function roverSideWheeled({ wheelAngle = 0, face = 'happy', wheelScale = 1 } = {}) {
  if (wheelScale === 1) return roverSide({ wheelAngle, face });
  const r = 27;
  return `${svgOpen('0 0 150 116', '大轮机器人探险车')}
    <ellipse cx="77" cy="105" rx="64" ry="7" fill="${O}" opacity=".14"/>
    <path d="M18 58L30 45H120L134 58V78H18Z" fill="${V.teal}" stroke="${O}" stroke-width="3"/><path d="M42 16H101L112 29V61H36V25Z" fill="${V.gold}" stroke="${O}" stroke-width="3"/><rect x="53" y="28" width="43" height="27" rx="8" fill="${V.paper}" stroke="${O}" stroke-width="2.3"/>${faceMarkup(face,74.5,39,.78)}
    ${wheel(42,84,r,wheelAngle,V.coral)}${wheel(108,84,r,wheelAngle,V.coral)}
  ${svgClose}`;
}

const poseSvg = (name, parts, accent = V.coral) => `${svgOpen('0 0 96 96', `动作：${name}`)}
  <path d="M13 88H83" stroke="${V.panelDeep}" stroke-width="3" stroke-linecap="round"/>
  ${parts.replaceAll('$A', accent)}${svgClose}`;
const head = (x=48,y=23) => `<circle cx="${x}" cy="${y}" r="10" fill="${V.skin}" stroke="${O}" stroke-width="3"/><path d="M${x-7} ${y-4}q7-8 14 0" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`;
const limb = d => `<path d="${d}" fill="none" stroke="${O}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
const active = d => `<path d="${d}" fill="none" stroke="$A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;

export const actionIcons = {
  squat: () => poseSvg('蹲下', `${head(48,27)}${limb('M48 37V55L33 68v14M48 55l15 13v14')}${active('M48 44L25 52M48 44l23 8')}`),
  jump: () => poseSvg('跳跃', `${head(48,18)}${limb('M48 28v25L35 69l-8-6M48 53l13 16 8-6')}${active('M48 37L27 24M48 37l21-13')}<path d="M22 81l8-6M74 81l-8-6" stroke="${V.gold}" stroke-width="3"/>`),
  spin: () => poseSvg('转圈', `${head()}${limb('M48 33v28M48 43L33 51M48 43l15 8M48 61l-9 21M48 61l9 21')}${active('M18 48a30 26 0 1 1 8 20')}<path d="M22 73l4-9 7 7Z" fill="$A"/>`),
  clap: () => poseSvg('拍手', `${head()}${limb('M48 33v29M48 62l-9 21M48 62l9 21')}${active('M48 43l-8 11M48 43l8 11')}<path d="M28 51h6M62 51h6M32 43l4 4M64 43l-4 4" stroke="${V.gold}" stroke-width="3"/>`),
  oneleg: () => poseSvg('单脚站立', `${head()}${limb('M48 33v29M48 62v22')}${active('M48 44H22M48 44h26M48 62l15 8v-13')}`),
  touchear: () => poseSvg('触摸耳朵', `${head(46,24)}${limb('M46 34v29M46 63l-9 21M46 63l9 21M46 45L29 58')}${active('M46 44l19-8-8-12')}<circle cx="56" cy="24" r="3" fill="$A"/>`),
  stomp: () => poseSvg('跺脚', `${head()}${limb('M48 33v28M48 43L33 52M48 43l15 9M48 61L37 84')}${active('M48 61l16 5 2 11')}<path d="M59 85l5 5M68 83v7M75 80l5 5" stroke="${V.gold}" stroke-width="3"/>`),
  freeze: () => poseSvg('定住', `<path d="M14 7H82V86H14Z" fill="none" stroke="$A" stroke-width="3" stroke-dasharray="8 6"/>${head()}${limb('M48 33v29M48 43L35 56M48 43l13 13M48 62l-7 22M48 62l7 22')}`),
  patlegs: () => poseSvg('拍腿', `${head()}${limb('M48 33v29M48 62l-9 22M48 62l9 22')}${active('M48 42l14 18M48 42L34 60')}<path d="M64 64l5 4M32 64l-5 4" stroke="${V.gold}" stroke-width="3"/>`),
  raisehand: () => poseSvg('举手', `${head(46,26)}${limb('M46 36v28M46 64l-9 20M46 64l9 20M46 46L31 58')}${active('M46 46l17-20V8')}<circle cx="63" cy="8" r="4" fill="$A"/>`),
};
