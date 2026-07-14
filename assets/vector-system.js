/**
 * Shared vector language for the Robotics Adventure artwork.
 * Geometry stays deliberately flat enough to remain crisp on iPad, while
 * offset facets, cast shadows and hardware details create a restrained 2.5D feel.
 */
export const V = Object.freeze({
  ink: '#102A43',
  inkSoft: '#243B53',
  paper: '#F7FAFC',
  panel: '#EAF2F8',
  panelDeep: '#D7E5EF',
  coral: '#FF6B5F',
  coralDark: '#D94A43',
  teal: '#18B6A4',
  tealDark: '#0B7F76',
  gold: '#FFC857',
  goldDark: '#D89A18',
  blue: '#3E7CB1',
  blueDark: '#24557D',
  violet: '#7C63D5',
  violetDark: '#5540A6',
  green: '#63C174',
  greenDark: '#31834A',
  water: '#9CDCE5',
  white: '#FFFFFF',
  rubber: '#17202A',
  steel: '#8DA4B8',
  skin: '#F2C6A0',
});

export const svgOpen = (viewBox, label, extra = '') =>
  `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet" ${extra}>`;

export const svgClose = '</svg>';

export const textStyle = `font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif"`;

export function hardwarePanel(x, y, w, h, fill = V.paper, radius = 16) {
  return `<path d="M${x + radius} ${y}H${x + w - radius}Q${x + w} ${y} ${x + w} ${y + radius}V${y + h - radius}Q${x + w} ${y + h} ${x + w - radius} ${y + h}H${x + radius}Q${x} ${y + h} ${x} ${y + h - radius}V${y + radius}Q${x} ${y} ${x + radius} ${y}Z" fill="${fill}" stroke="${V.ink}" stroke-width="3"/>`;
}

export function bolt(x, y, r = 4, fill = V.gold) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${V.ink}" stroke-width="1.8"/><path d="M${x - r * .45} ${y}h${r * .9}" stroke="${V.ink}" stroke-width="1.5" stroke-linecap="round"/>`;
}

export function wheel(cx, cy, radius = 20, angle = 0, accent = V.teal) {
  const hub = radius * .34;
  return `<g>
    <circle cx="${cx + 3}" cy="${cy + 4}" r="${radius}" fill="${V.ink}" opacity=".18"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${V.rubber}" stroke="${V.ink}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${radius * .72}" fill="${V.inkSoft}" stroke="${accent}" stroke-width="2.5"/>
    <g transform="rotate(${angle} ${cx} ${cy})" stroke="${V.paper}" stroke-width="2.8" stroke-linecap="round">
      <path d="M${cx - radius * .5} ${cy}H${cx + radius * .5}M${cx} ${cy - radius * .5}V${cy + radius * .5}"/>
      <path d="M${cx - radius * .35} ${cy - radius * .35}L${cx + radius * .35} ${cy + radius * .35}M${cx + radius * .35} ${cy - radius * .35}L${cx - radius * .35} ${cy + radius * .35}" opacity=".55"/>
    </g>
    <circle cx="${cx}" cy="${cy}" r="${hub}" fill="${accent}" stroke="${V.ink}" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${hub * .35}" fill="${V.paper}"/>
  </g>`;
}

export function faceMarkup(face, cx, cy, scale = 1) {
  if (face === 'oops') return `<path d="M${cx - 10 * scale} ${cy - 5 * scale}l${6 * scale} ${6 * scale}m0 -${6 * scale}l-${6 * scale} ${6 * scale}M${cx + 4 * scale} ${cy - 5 * scale}l${6 * scale} ${6 * scale}m0 -${6 * scale}l-${6 * scale} ${6 * scale}" stroke="${V.ink}" stroke-width="${2.4 * scale}" stroke-linecap="round"/><path d="M${cx - 7 * scale} ${cy + 10 * scale}Q${cx} ${cy + 5 * scale} ${cx + 7 * scale} ${cy + 10 * scale}" fill="none" stroke="${V.ink}" stroke-width="${2.4 * scale}" stroke-linecap="round"/>`;
  if (face === 'effort') return `<path d="M${cx - 11 * scale} ${cy - 4 * scale}h${7 * scale}M${cx + 4 * scale} ${cy - 4 * scale}h${7 * scale}" stroke="${V.ink}" stroke-width="${2.8 * scale}" stroke-linecap="round"/><circle cx="${cx}" cy="${cy + 8 * scale}" r="${3.2 * scale}" fill="${V.ink}"/>`;
  return `<circle cx="${cx - 8 * scale}" cy="${cy - 3 * scale}" r="${2.5 * scale}" fill="${V.ink}"/><circle cx="${cx + 8 * scale}" cy="${cy - 3 * scale}" r="${2.5 * scale}" fill="${V.ink}"/><path d="M${cx - 8 * scale} ${cy + 7 * scale}Q${cx} ${cy + 13 * scale} ${cx + 8 * scale} ${cy + 7 * scale}" fill="none" stroke="${V.ink}" stroke-width="${2.4 * scale}" stroke-linecap="round"/>`;
}

export function gear(cx, cy, r = 30, teeth = 12, fill = V.steel) {
  const pts = [];
  for (let i = 0; i < teeth * 2; i += 1) {
    const a = -Math.PI / 2 + (Math.PI * i) / teeth;
    const rr = i % 2 ? r * .82 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${V.ink}" stroke-width="3" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${r * .48}" fill="${V.paper}" stroke="${V.ink}" stroke-width="2.4"/><circle cx="${cx}" cy="${cy}" r="${r * .14}" fill="${V.ink}"/>`;
}

export function arrow(x1, y1, x2, y2, color = V.coral, width = 4) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 10;
  const p1 = `${x2},${y2}`;
  const p2 = `${x2 - Math.cos(a - .55) * h},${y2 - Math.sin(a - .55) * h}`;
  const p3 = `${x2 - Math.cos(a + .55) * h},${y2 - Math.sin(a + .55) * h}`;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><polygon points="${p1} ${p2} ${p3}" fill="${color}"/>`;
}

export function tinyStars(points, color = V.gold) {
  return points.map(([x, y, r = 3]) => `<path d="M${x} ${y - r}L${x + r * .35} ${y - r * .35}L${x + r} ${y}L${x + r * .35} ${y + r * .35}L${x} ${y + r}L${x - r * .35} ${y + r * .35}L${x - r} ${y}L${x - r * .35} ${y - r * .35}Z" fill="${color}"/>`).join('');
}
