/* Unified mission-control artwork for the six programming games.
 * Geometry intentionally matches the existing game engines; visuals do not.
 */

const FACE = {
  happy: '<path d="M-8 2h4m8 0h4M-7 9q7 6 14 0"/>',
  idle: '<path d="M-8 2h4m8 0h4M-5 10h10"/>',
  effort: '<path d="M-9 1l5 2m8 0 5-2M-6 11q6-4 12 0"/>',
  oops: '<path d="M-9 2l5 3m-5 0 5-3m8 3 5-3m-5 0 5 3M-6 12q6-5 12 0"/>',
  think: '<path d="M-8 2h4m8 0h4M-3 11q5-3 8 0"/>',
};

function faceMarkup(face) {
  return `<g fill="none" stroke="#d9f5ff" stroke-width="2.4" stroke-linecap="round">${FACE[face] || FACE.idle}</g>`;
}

export function roverTop({ face = 'happy' } = {}) {
  return `<svg viewBox="0 0 108 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="任务机器人">
    <defs>
      <linearGradient id="rt-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#35d2e4"/><stop offset="1" stop-color="#3975ff"/></linearGradient>
      <filter id="rt-shadow"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#07172f" flood-opacity=".38"/></filter>
    </defs>
    <g filter="url(#rt-shadow)">
      <rect x="8" y="25" width="18" height="70" rx="9" fill="#0a1730"/><rect x="82" y="25" width="18" height="70" rx="9" fill="#0a1730"/>
      <path d="M28 19h52l10 18v52l-10 18H28L18 89V37z" fill="url(#rt-body)" stroke="#bff8ff" stroke-width="2"/>
      <path d="M41 8h26l6 12H35z" fill="#ffca3a" stroke="#fff1a8" stroke-width="2"/>
      <rect x="33" y="40" width="42" height="37" rx="12" fill="#07172f" stroke="#6feaff" stroke-width="2"/>
      <g transform="translate(54 50)">${faceMarkup(face)}</g>
      <circle cx="30" cy="91" r="5" fill="#ff5c6c"/><circle cx="78" cy="91" r="5" fill="#76f0b1"/>
      <path d="M36 106h36" stroke="#a9f4ff" stroke-width="3" stroke-linecap="round"/>
    </g>
  </svg>`;
}

export function roverSide({ wheelAngle = 0, face = 'happy' } = {}) {
  return `<svg viewBox="0 0 150 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="任务机器人">
    <defs><linearGradient id="rs-body" x1="0" x2="1" y2="1"><stop stop-color="#31d3e3"/><stop offset="1" stop-color="#3f72ff"/></linearGradient><filter id="rs-shadow"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#06142b" flood-opacity=".36"/></filter></defs>
    <g filter="url(#rs-shadow)">
      <ellipse cx="75" cy="94" rx="58" ry="7" fill="#06142b" opacity=".35"/>
      <g transform="translate(38 83) rotate(${wheelAngle})"><circle r="17" fill="#07162d" stroke="#5c7698" stroke-width="4"/><path d="M-10 0h20M0-10v20" stroke="#91a7c5" stroke-width="3"/></g>
      <g transform="translate(112 83) rotate(${wheelAngle})"><circle r="17" fill="#07162d" stroke="#5c7698" stroke-width="4"/><path d="M-10 0h20M0-10v20" stroke="#91a7c5" stroke-width="3"/></g>
      <path d="M32 28h76l18 26-12 31H28L18 54z" fill="url(#rs-body)" stroke="#bff9ff" stroke-width="2"/>
      <path d="M108 30l24 15-15 7z" fill="#ffca3a"/>
      <rect x="43" y="39" width="52" height="31" rx="10" fill="#07172f" stroke="#6feaff" stroke-width="2"/>
      <g transform="translate(69 45)">${faceMarkup(face)}</g>
      <path d="M31 31l7-17h35l8 14" fill="none" stroke="#8af2ff" stroke-width="4" stroke-linecap="round"/>
    </g>
  </svg>`;
}

export function roverSideWheeled({ wheelAngle = 0, face = 'happy', wheelScale = 1 } = {}) {
  const w = Math.max(.72, Math.min(1.35, Number(wheelScale) || 1));
  return roverSide({ wheelAngle, face }).replaceAll('r="17"', `r="${(17 * w).toFixed(1)}"`);
}

export const tiles = {
  grass() {
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="#102b49"/><path d="M0 100L100 0M-30 80L80-30M20 130L130 20" stroke="#19415f" stroke-width="2"/><rect x="5" y="5" width="90" height="90" rx="12" fill="none" stroke="#2d6381" stroke-width="2" opacity=".65"/></svg>`;
  },
  rock() {
    return `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#0a1a30"/><path d="M16 73L25 32l25-18 29 15 9 43-18 16H32z" fill="#33435f" stroke="#8293ad" stroke-width="3"/><path d="M29 34l22 15 28-17M51 49l-4 31" fill="none" stroke="#647793" stroke-width="3"/></svg>`;
  },
  portal(_size = 72, color = 'purple') {
    const a = color === 'purple' ? '#b67cff' : '#37d8ff';
    const b = color === 'purple' ? '#5b2ccf' : '#0876d9';
    return `<svg viewBox="0 0 100 100"><defs><radialGradient id="pt-${color}"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".28" stop-color="${a}"/><stop offset=".7" stop-color="${b}"/><stop offset="1" stop-color="#07162e" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="50" r="45" fill="url(#pt-${color})" opacity=".9"/><circle cx="50" cy="50" r="31" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 9"/><circle cx="50" cy="50" r="17" fill="#05152d" stroke="${a}" stroke-width="4"/></svg>`;
  },
  gem() {
    return `<svg viewBox="0 0 100 100"><defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c9fbff"/><stop offset=".35" stop-color="#44e1ff"/><stop offset="1" stop-color="#7667ff"/></linearGradient></defs><path d="M50 8l31 22-12 48-19 14-19-14-12-48z" fill="url(#gm)" stroke="#e8fdff" stroke-width="4"/><path d="M19 30h62L50 92zM50 8v84" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="3"/></svg>`;
  },
  flag() {
    return `<svg viewBox="0 0 100 100"><path d="M28 90V14" stroke="#d9f5ff" stroke-width="7" stroke-linecap="round"/><path d="M32 18h48L65 38l15 20H32z" fill="#ffca3a" stroke="#fff2a7" stroke-width="3"/></svg>`;
  },
};

export const trackCellX = (index) => 90 + index * 84 + 42;

export function trackScene({ tiles: cellTypes = [] } = {}) {
  const n = cellTypes.length;
  const w = 90 + n * 84 + 130;
  const cells = cellTypes.map((type, i) => {
    const x = 90 + i * 84;
    const target = type === 'green';
    return `<g transform="translate(${x} 60)"><rect width="80" height="110" rx="16" fill="${target ? '#123e38' : '#112b49'}" stroke="${target ? '#62efb0' : '#2d607e'}" stroke-width="3"/><path d="M14 83h52" stroke="${target ? '#62efb0' : '#244b67'}" stroke-width="3" stroke-linecap="round"/>${target ? '<path d="M26 54l14 14 25-31" fill="none" stroke="#73f6bd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' : `<text x="40" y="39" text-anchor="middle" fill="#6d91ab" font-size="20" font-weight="800">${String(i + 1).padStart(2, '0')}</text>`}</g>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} 230" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="trk-bg" x2="0" y2="1"><stop stop-color="#07182f"/><stop offset="1" stop-color="#0d2946"/></linearGradient></defs><rect width="${w}" height="230" rx="24" fill="url(#trk-bg)"/><path d="M40 195h${w - 80}" stroke="#1e4968" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/>${cells}</svg>`;
}

export function dialFrame({ label = '参数' } = {}) {
  return `<svg viewBox="0 0 150 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}"><rect x="8" y="7" width="134" height="176" rx="32" fill="#123553" stroke="#4b7898" stroke-width="3"/><path d="M75 21l17 21H58z" fill="#5ae7f4"/><path d="M58 149h34l-17 21z" fill="#5ae7f4"/><circle cx="75" cy="94" r="40" fill="#06142b" stroke="#84eff7" stroke-width="3"/><circle cx="75" cy="94" r="30" fill="none" stroke="#254c6b" stroke-width="2" stroke-dasharray="2 7"/><text x="75" y="181" fill="#b8cfdf" text-anchor="middle" font-size="12" font-weight="700">${label}</text></svg>`;
}

export function prize(kind = 'brick') {
  const common = 'stroke="#e9fbff" stroke-width="3"';
  const art = {
    glass: `<path d="M26 18h48l-7 62H33z" fill="#67dff0" fill-opacity=".45" ${common}/><path d="M35 46h30" stroke="#b9f7ff" stroke-width="4"/>`,
    egg: `<path d="M50 12c18 0 30 31 30 52S67 88 50 88 20 84 20 64 32 12 50 12z" fill="#fff5d8" ${common}/>`,
    plush: `<circle cx="50" cy="52" r="29" fill="#ff8ea1" ${common}/><circle cx="29" cy="25" r="13" fill="#ff8ea1" ${common}/><circle cx="71" cy="25" r="13" fill="#ff8ea1" ${common}/><circle cx="40" cy="49" r="4" fill="#202b45"/><circle cx="60" cy="49" r="4" fill="#202b45"/>`,
    brick: `<rect x="18" y="31" width="64" height="50" rx="9" fill="#ffca3a" ${common}/><circle cx="34" cy="31" r="9" fill="#ffe37b" ${common}/><circle cx="66" cy="31" r="9" fill="#ffe37b" ${common}/>`,
  };
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${art[kind] || art.brick}</svg>`;
}

export function clawGridX(pos) { return pos * 66; }

export function clawMachineScene({ gridCount = 8 } = {}) {
  const cells = Array.from({ length: gridCount + 1 }, (_, i) => `<g transform="translate(${96 + i * 66} 319)"><rect x="-27" y="-17" width="54" height="34" rx="8" fill="#0d2947" stroke="#315f7e" stroke-width="2"/><text y="6" text-anchor="middle" fill="#a9c6d9" font-size="15" font-weight="800">${i}</text></g>`).join('');
  return `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cm-bg" x2="0" y2="1"><stop stop-color="#07172f"/><stop offset="1" stop-color="#102d4b"/></linearGradient><linearGradient id="cm-metal" x2="1" y2="1"><stop stop-color="#9df5ff"/><stop offset=".45" stop-color="#3f7ba4"/><stop offset="1" stop-color="#143958"/></linearGradient></defs><rect width="720" height="390" rx="28" fill="url(#cm-bg)"/><path d="M46 70h628M46 286h628" stroke="#2d5c7b" stroke-width="4"/><path d="M62 78h586" stroke="#70eef7" stroke-width="5" stroke-linecap="round"/>
    <g id="claw-trolley"><rect x="67" y="52" width="58" height="52" rx="12" fill="url(#cm-metal)" stroke="#d6fbff" stroke-width="2"/><g id="claw-gear"><circle cx="96" cy="92" r="17" fill="#07172f" stroke="#78edf7" stroke-width="4"/><path d="M85 92h22M96 81v22" stroke="#78edf7" stroke-width="3"/></g><g id="claw-hoist"><line id="claw-cable" x1="96" y1="104" x2="96" y2="151" stroke="#a6c4d9" stroke-width="4"/><path d="M74 151h44l-7 26H81z" fill="#3f7fa6" stroke="#c6f8ff" stroke-width="2"/><g id="claw-fingers-l"><path d="M92 172q-32 25-20 57" fill="none" stroke="#8beef5" stroke-width="8" stroke-linecap="round"/></g><g id="claw-fingers-r"><path d="M100 172q32 25 20 57" fill="none" stroke="#8beef5" stroke-width="8" stroke-linecap="round"/></g></g></g>
    ${cells}<path d="M76 350h568" stroke="#ffca3a" stroke-width="4" stroke-dasharray="10 10"/></svg>`;
}

export function beltSceneColored({ colors = [] } = {}) {
  const n = colors.length;
  const w = 130 + n * 78 + 170;
  const palette = { red: '#ff6274', blue: '#4c8dff', yellow: '#ffcf3f' };
  const parcels = colors.map((color, i) => {
    const x = 130 + i * 78 + 39;
    return `<g class="parcel" data-idx="${i}" transform="translate(${x} 104)"><rect x="-24" y="-24" width="48" height="48" rx="10" fill="${palette[color]}" stroke="#effcff" stroke-width="3"/><path d="M-24-7h48M0-24v48" stroke="#fff" stroke-opacity=".58" stroke-width="3"/></g>`;
  }).join('');
  const rollers = Array.from({ length: n + 2 }, (_, i) => `<circle cx="${92 + i * 78}" cy="145" r="14" fill="#0a1830" stroke="#497292" stroke-width="4"/>`).join('');
  return `<svg viewBox="0 0 ${w} 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="belt-bg" x2="0" y2="1"><stop stop-color="#07172f"/><stop offset="1" stop-color="#102b49"/></linearGradient></defs><rect width="${w}" height="200" rx="24" fill="url(#belt-bg)"/><rect x="55" y="119" width="${w - 110}" height="52" rx="24" fill="#1b4260" stroke="#5b86a3" stroke-width="3"/>${rollers}${parcels}<path d="M46 41h${w - 92}" stroke="#275270" stroke-width="3" stroke-dasharray="3 11"/></svg>`;
}

export function bridgeRoverX(step, _steps = 6) { return 120 + step * 64; }

export function bridgeScene({ steps = 6 } = {}) {
  const w = 120 + steps * 64 + 130;
  const deck = Array.from({ length: steps + 1 }, (_, i) => `<g transform="translate(${120 + i * 64} 150)"><rect x="-28" y="-4" width="56" height="34" rx="8" fill="#133653" stroke="#3d7190" stroke-width="2"/><text y="19" text-anchor="middle" fill="#8fb3c9" font-size="13" font-weight="800">${i}</text></g>`).join('');
  return `<svg viewBox="0 0 ${w} 260" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="br-bg" x2="0" y2="1"><stop stop-color="#07182f"/><stop offset=".55" stop-color="#102d4b"/><stop offset=".56" stop-color="#0d4962"/><stop offset="1" stop-color="#082b43"/></linearGradient></defs><rect width="${w}" height="260" rx="24" fill="url(#br-bg)"/><circle cx="${w - 85}" cy="52" r="25" fill="#ffca3a" opacity=".86"/><path d="M28 197q70-28 140 0t140 0t140 0t140 0" fill="none" stroke="#4ecfe3" stroke-opacity=".35" stroke-width="6"/>${deck}<path d="M82 181h${w - 164}" stroke="#ffca3a" stroke-width="4" stroke-dasharray="10 9"/></svg>`;
}
