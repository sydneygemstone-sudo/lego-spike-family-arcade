/* assets/card-visual.js
 * 闪卡可视化渲染的共享小工具——浏览页(flashcards.html)和测验(js/quiz.js)都要展示
 * 同一张卡片的"长相"（积木 SVG / 零件照片 / 力学原理图），抽成一处避免逻辑分叉。
 * 依赖三个作为经典 <script> 加载的全局对象（须先于本模块使用前加载好）：
 *   window.scratchblocks（vendor/scratchblocks.min.js）
 *   window.blockScripts（assets/blocks.js）
 *   window.conceptDiagramsV2（assets/concept-diagrams-v2.js）
 * 逻辑对齐原 spike_prime_flashcards/app.js 的 getCardVisualHTML/renderAllBlockScripts，
 * 仅裁掉了打印专用的媒体切换与像素级缩放兜底（本项目不做打印视图）。
 */

const BLOCK_CATS = ['motors', 'movement', 'sensors', 'display', 'events', 'control'];

// 卡片 diagram 短 key -> concept-diagrams-v2.js 里的长 key
const CONCEPT_DIAGRAM_KEY_MAP = {
  lever: 'leverSystem',
  rigidity: 'structuralRigidity',
  friction: 'frictionControl',
  gravity: 'centerOfGravity',
  chassis: 'roboticChassis',
  linkage: 'linkageMechanism',
  clutch: 'mechanicalClutch',
  gearbox: 'gearbox',
  gearRatio: 'gearRatio',
  fulcrum: 'fulcrum',
  wormDrive: 'wormDrive',
};

export function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function getConceptDiagram(shortKey) {
  const key = CONCEPT_DIAGRAM_KEY_MAP[shortKey] || shortKey;
  return (typeof window.conceptDiagramsV2 !== 'undefined' && window.conceptDiagramsV2[key]) || '';
}

/** 返回一张卡片视觉区的 HTML 字符串（积木 SVG 占位 / 图片 / 原理图）。 */
export function renderCardVisual(card) {
  if (BLOCK_CATS.includes(card.category) && card.blockId) {
    return `<div class="card-block-visual"><pre class="blocks-render" data-blockid="${card.blockId}"> </pre></div>`;
  }
  if (card.category === 'hardware' || card.category === 'elements') {
    return `<div class="card-photo-visual"><img src="${card.image}" alt="${escapeHtml(card.title)}" loading="lazy"></div>`;
  }
  if (card.category === 'concepts') {
    return `<div class="card-concept-visual">${getConceptDiagram(card.diagram)}</div>`;
  }
  return card.image ? `<div class="card-photo-visual"><img src="${card.image}" alt="${escapeHtml(card.title)}" loading="lazy"></div>` : '';
}

/** 把 containerSelector 下所有待渲染的积木 <pre> 统一转成 scratchblocks SVG。 */
export function renderBlockScripts(containerSelector, scale = 1) {
  const nodes = document.querySelectorAll(`${containerSelector} pre.blocks-render[data-blockid]`);
  nodes.forEach((pre) => {
    const key = pre.getAttribute('data-blockid');
    pre.textContent = (window.blockScripts && window.blockScripts[key]) || '';
  });
  if (typeof window.scratchblocks !== 'undefined' && nodes.length) {
    window.scratchblocks.renderMatching(`${containerSelector} pre.blocks-render`, {
      style: 'scratch3',
      languages: ['en'],
      scale,
    });
  }
}

export const CATEGORY_LABELS = {
  motors: '电机',
  movement: '移动',
  sensors: '传感判断',
  display: '显示',
  events: '事件',
  control: '控制',
  hardware: '硬件',
  elements: '结构件',
  concepts: '力学原理',
};
