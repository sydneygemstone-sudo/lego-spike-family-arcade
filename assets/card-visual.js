/** Shared visual renderer for the card browser and three-question quiz. */
const BLOCK_CATS = ['motors', 'movement', 'sensors', 'display', 'events', 'control'];

const CONCEPT_DIAGRAM_KEY_MAP = {
  lever: 'leverSystem', rigidity: 'structuralRigidity', friction: 'frictionControl',
  gravity: 'centerOfGravity', chassis: 'roboticChassis', linkage: 'linkageMechanism',
  rackPinion: 'rackPinion', beltDrive: 'beltDrive', gearbox: 'gearbox', gearRatio: 'gearRatio',
  fulcrum: 'fulcrum',
};

const CATEGORY_ART = Object.freeze({
  motors: ['MOTOR', '#3E7CB1'], movement: ['MOVE', '#FF6B5F'], sensors: ['SENSE', '#18B6A4'],
  display: ['LIGHT', '#7C63D5'], events: ['EVENT', '#FFC857'], control: ['LOGIC', '#FF8B42'],
  hardware: ['HUB', '#3E7CB1'], elements: ['BUILD', '#18B6A4'], concepts: ['LAB', '#7C63D5'],
});

export function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function getConceptDiagram(shortKey) {
  const key = CONCEPT_DIAGRAM_KEY_MAP[shortKey] || shortKey;
  return (typeof window !== 'undefined' && window.conceptDiagramsV2 && window.conceptDiagramsV2[key]) || '';
}

function categoryMark(category) {
  const [name, accent] = CATEGORY_ART[category] || ['LAB', '#18B6A4'];
  return `<svg class="card-visual-mark" viewBox="0 0 92 40" width="92" height="40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name} 分类">
    <path d="M9 3H83L89 9V31L83 37H9L3 31V9Z" fill="#102A43" stroke="#102A43" stroke-width="2"/>
    <path d="M11 8H34L39 13V32H11Z" fill="${accent}"/>
    <circle cx="19" cy="20" r="5" fill="#F7FAFC"/><path d="M29 15v10M24 20h10" stroke="#F7FAFC" stroke-width="2.2" stroke-linecap="round"/>
    <text x="63" y="21" font-family="-apple-system,'Segoe UI',sans-serif" font-size="10" font-weight="850" fill="#F7FAFC" text-anchor="middle" dominant-baseline="middle">${name}</text>
  </svg>`;
}

let blockSvgInstance = 0;

/**
 * scratchblocks ships a reusable <defs> library inside every rendered SVG.
 * Its stock ids (sb3-greenFlag, sb3-loopArrow, …) therefore collide when a
 * whole card deck is mounted at once. Give each SVG a private id namespace and
 * rewrite every local reference. This also prevents Safari from resolving a
 * <use> against the first card in the document.
 */
function namespaceSvgIds(svg, hint = 'block') {
  const prefix = `ra-${hint.replace(/[^a-z0-9_-]/gi, '-')}-${blockSvgInstance += 1}`;
  const idMap = new Map();
  svg.querySelectorAll('[id]').forEach(node => {
    const oldId = node.id;
    const nextId = `${prefix}-${oldId}`;
    idMap.set(oldId, nextId);
    node.id = nextId;
  });
  if (!idMap.size) return;
  svg.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attr => {
      let value = attr.value;
      idMap.forEach((nextId, oldId) => { value = value.replaceAll(`#${oldId}`, `#${nextId}`); });
      if (attr.name === 'aria-labelledby' || attr.name === 'aria-describedby') {
        value = value.split(/\s+/).map(token => idMap.get(token) || token).join(' ');
      }
      if (value !== attr.value) node.setAttribute(attr.name, value);
    });
  });
}

export function renderCardVisual(card) {
  if (BLOCK_CATS.includes(card.category) && card.blockId) {
    return `<div class="card-block-visual" data-vector-family="robotics-lab">${categoryMark(card.category)}<pre class="blocks-render" data-blockid="${escapeHtml(card.blockId)}"> </pre></div>`;
  }
  if (card.category === 'hardware' || card.category === 'elements') {
    return `<div class="card-photo-visual" data-vector-family="robotics-lab">${categoryMark(card.category)}<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.title)}" loading="lazy" decoding="async"></div>`;
  }
  if (card.category === 'concepts') {
    return `<div class="card-concept-visual" data-vector-family="robotics-lab">${getConceptDiagram(card.diagram)}</div>`;
  }
  return card.image ? `<div class="card-photo-visual" data-vector-family="robotics-lab">${categoryMark(card.category)}<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.title)}" loading="lazy" decoding="async"></div>` : '';
}

export function renderBlockScripts(containerSelector, scale = 1) {
  const nodes = document.querySelectorAll(`${containerSelector} pre.blocks-render[data-blockid]`);
  nodes.forEach(pre => {
    const key = pre.getAttribute('data-blockid');
    pre.textContent = (window.blockScripts && window.blockScripts[key]) || '';
  });
  if (typeof window.scratchblocks !== 'undefined' && nodes.length) {
    window.scratchblocks.renderMatching(`${containerSelector} pre.blocks-render`, {
      style: 'scratch3', languages: ['en'], scale,
    });
    nodes.forEach(pre => {
      const hint = pre.getAttribute('data-blockid') || 'block';
      pre.querySelectorAll('.scratchblocks > svg').forEach(svg => namespaceSvgIds(svg, hint));
    });
  }
}

export const CATEGORY_LABELS = {
  motors: '电机', movement: '移动', sensors: '传感判断', display: '显示',
  events: '事件', control: '控制', hardware: '硬件', elements: '结构件', concepts: '力学原理',
};
