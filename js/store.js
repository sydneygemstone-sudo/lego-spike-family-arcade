/* js/store.js
 * sessionStorage 存档——无账号、无云同步，关闭标签页后自动清空。
 * schema v4: every programming game has ten missions; badges are collected once per tab session.
 * 关闭标签页即结束本次收集；旧的持久化存档不会自动导入。
 * 版本号防脏数据：无法识别的 version / 解析失败 / 字段类型不对，一律回退默认值。
 *
 * 用法：
 *   import { store, GAME_IDS } from './store.js';
 *   store.getStars('hunt');           // 无 level 参数 = 旧签名兼容，等价于 getStars('hunt', 1)
 *   store.getStars('hunt', 2);        // 0-3，某一关某个 level 的历史最高星
 *   store.setStars('hunt', 2, 3);     // 只会保留该 level 历史最高分；返回 { best, isNewBest, badgeUnlocked, badgeTier }
 *   store.getGameTotal('hunt');       // 0-30，该游戏 10 个任务星数之和
 *   store.getBadgeTier('hunt');       // null | 'bronze' | 'gold'
 *   store.getBadges();                // ['hunt', 'quiz', ...]（bronze 及以上都算"已解锁"）
 *   store.getQuizBest();  store.setQuizBest(7);
 *   store.totalStars();   store.maxStars();  // 0-180 / 180
 *
 * 完整方法签名见项目根目录 API.md。
 */

import { GAME_IDS, getLevelCount, maxCampaignStars } from './game-config.js';

export { GAME_IDS } from './game-config.js';

const STORAGE_KEY = 'lsfa_session_v1';
const SCHEMA_VERSION = 4;
const QUIZ_ROUND_SIZE = 3;

function emptyLevels(gameId) {
  const levels = {};
  for (let i = 1; i <= getLevelCount(gameId); i += 1) levels[`l${i}`] = 0;
  return levels;
}

function defaultData() {
  const stars = {};
  GAME_IDS.forEach((id) => { stars[id] = emptyLevels(id); });
  return {
    version: SCHEMA_VERSION,
    stars,
    badges: [],
    quizBest: 0,
    quizRoundSize: QUIZ_ROUND_SIZE,
    legacyQuizBest: null,
  };
}

// 把 1..10 或 'l1'..'l10' 归一化成存储用的 key；非法/缺省一律兜底 'l1'
// （旧签名 getStars(gameId) 不传 level 时，就是靠这个兜底表现成"等价于 L1"）。
function levelKey(gameId, level) {
  if (typeof level === 'string' && /^l\d+$/.test(level)) {
    const n = Number(level.slice(1));
    if (n >= 1 && n <= getLevelCount(gameId)) return `l${n}`;
  }
  const n = Number(level);
  return Number.isInteger(n) && n >= 1 && n <= getLevelCount(gameId) ? `l${n}` : 'l1';
}

function clampStar(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, n));
}

function isVersionShape(data, version) {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== version) return false;
  if (!data.stars || typeof data.stars !== 'object') return false;
  if (!Array.isArray(data.badges)) return false;
  if (typeof data.quizBest !== 'number') return false;
  return true;
}

function sanitizeV4(parsed) {
  const merged = defaultData();
  GAME_IDS.forEach((id) => {
    const src = parsed.stars[id];
    const lv = emptyLevels(id);
    if (src && typeof src === 'object') {
      Object.keys(lv).forEach((key) => { lv[key] = clampStar(src[key]); });
    } else if (typeof src === 'number') {
      lv.l1 = clampStar(src);
    }
    merged.stars[id] = lv;
  });
  merged.badges = parsed.badges.filter((b) => typeof b === 'string' && !GAME_IDS.includes(b));
  GAME_IDS.forEach((id) => {
    if (Object.values(merged.stars[id]).every((stars) => stars >= 1)) merged.badges.push(id);
  });
  merged.quizBest = parsed.quizRoundSize === QUIZ_ROUND_SIZE
    ? Math.max(0, Math.min(QUIZ_ROUND_SIZE, parsed.quizBest | 0))
    : 0;
  merged.legacyQuizBest = Number.isFinite(parsed.legacyQuizBest) ? parsed.legacyQuizBest : null;
  return merged;
}

function load() {
  let raw;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return defaultData(); // sessionStorage 被禁用时静默降级为内存态默认值
  }
  if (!raw) return defaultData();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return defaultData();
  }
  if (isVersionShape(parsed, 4)) return sanitizeV4(parsed);
  return defaultData();
}

let data = load();

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // 写入失败（隐私模式/容量满）不阻断游戏体验，静默忽略
  }
}

/** Every mission must be completed at least once for the bronze badge. */
function bronzeMet(gameId) {
  const lv = data.stars[gameId];
  return Object.values(lv).every((stars) => stars >= 1);
}

/**
 * 徽章档位：未解锁 null / 铜 bronze（全部任务都 ≥1 星）/ 金 gold（全部任务满星）。
 * 非六关 id（比如闪卡测验的 'quiz'）没有档位概念，解锁了就是 bronze，不存在金徽章。
 */
function getBadgeTier(id) {
  if (GAME_IDS.includes(id)) {
    if (!data.badges.includes(id) || !bronzeMet(id)) return null;
    return getGameTotal(id) >= getLevelCount(id) * 3 ? 'gold' : 'bronze';
  }
  return data.badges.includes(id) ? 'bronze' : null;
}

function getStars(gameId, level) {
  if (!GAME_IDS.includes(gameId)) return 0;
  const key = levelKey(gameId, level);
  return data.stars[gameId][key] || 0;
}

function getAllStars() {
  const out = {};
  GAME_IDS.forEach((id) => { out[id] = { ...data.stars[id] }; });
  return out;
}

function getGameTotal(gameId) {
  if (!GAME_IDS.includes(gameId)) return 0;
  return Object.values(data.stars[gameId]).reduce((sum, value) => sum + (value || 0), 0);
}

/**
 * 记录某一关某个 level 的结算星级，只保留该 level 历史最高分。
 * 若全部任务都达到 ≥1 星，自动解锁铜徽章；若进一步全部满星，自动升级金徽章
 * （两种情况都会把 badgeUnlocked 设为 gameId，方便 shell 弹窗提示）。
 * @returns {{ best: number, isNewBest: boolean, badgeUnlocked: string|null, badgeTier: string|null }}
 */
function setStars(gameId, level, stars) {
  if (!GAME_IDS.includes(gameId)) {
    return { best: 0, isNewBest: false, badgeUnlocked: null, badgeTier: null };
  }
  const key = levelKey(gameId, level);
  const clamped = clampStar(stars);
  const prevTier = getBadgeTier(gameId);
  const prev = data.stars[gameId][key] || 0;
  const isNewBest = clamped > prev;
  if (isNewBest) data.stars[gameId][key] = clamped;

  if (bronzeMet(gameId) && !data.badges.includes(gameId)) {
    data.badges.push(gameId);
  }
  const newTier = getBadgeTier(gameId);
  const badgeUnlocked = (newTier && newTier !== prevTier) ? gameId : null;

  persist();
  return { best: data.stars[gameId][key], isNewBest, badgeUnlocked, badgeTier: newTier };
}

function getBadges() {
  return data.badges.filter((id) => !GAME_IDS.includes(id) || bronzeMet(id));
}

function hasBadge(id) {
  return data.badges.includes(id);
}

function addBadge(id) {
  if (data.badges.includes(id)) return false;
  data.badges.push(id);
  persist();
  return true;
}

function getQuizBest() {
  return data.quizBest;
}

function setQuizBest(score) {
  const s = Math.max(0, Math.min(QUIZ_ROUND_SIZE, score | 0));
  const isNewBest = s > data.quizBest;
  if (isNewBest) data.quizBest = s;
  persist();
  return { best: data.quizBest, isNewBest };
}

function totalStars() {
  return GAME_IDS.reduce((sum, id) => sum + getGameTotal(id), 0);
}

function maxStars() {
  return maxCampaignStars();
}

function resetAll() {
  data = defaultData();
  persist();
}

export const store = {
  getStars,
  setStars,
  getAllStars,
  getGameTotal,
  getBadges,
  hasBadge,
  addBadge,
  getBadgeTier,
  getQuizBest,
  setQuizBest,
  totalStars,
  maxStars,
  resetAll,
};
