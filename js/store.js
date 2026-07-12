/* js/store.js
 * localStorage 存档——无账号/云同步，纯本地。
 * schema v2: { version:2, stars:{hunt:{l1,l2,l3}, claw:{...}, ...}(每项 0-3), badges:[id...], quizBest }
 * v1（单层 stars[gameId] 是 0-3 的数字）静默迁移成 v2（旧值放进 l1，l2/l3 归零，立即落盘）。
 * 版本号防脏数据：无法识别的 version（既不是 1 也不是 2）/解析失败/字段类型不对，一律回退默认值。
 *
 * 用法：
 *   import { store, GAME_IDS } from './store.js';
 *   store.getStars('hunt');           // 无 level 参数 = 旧签名兼容，等价于 getStars('hunt', 1)
 *   store.getStars('hunt', 2);        // 0-3，某一关某个 level 的历史最高星
 *   store.setStars('hunt', 2, 3);     // 只会保留该 level 历史最高分；返回 { best, isNewBest, badgeUnlocked, badgeTier }
 *   store.getGameTotal('hunt');       // 0-9，该关 3 个 level 星数之和
 *   store.getBadgeTier('hunt');       // null | 'bronze' | 'gold'
 *   store.getBadges();                // ['hunt', 'quiz', ...]（bronze 及以上都算"已解锁"）
 *   store.getQuizBest();  store.setQuizBest(7);
 *   store.totalStars();   store.maxStars();  // 0-54 / 54
 *
 * 完整方法签名见项目根目录 API.md。
 */

const STORAGE_KEY = 'lsfa_save_v1';
const SCHEMA_VERSION = 2;
const LEVEL_KEYS = ['l1', 'l2', 'l3'];

export const GAME_IDS = ['hunt', 'claw', 'macro', 'race', 'sort', 'bridge'];

function emptyLevels() {
  return { l1: 0, l2: 0, l3: 0 };
}

function defaultData() {
  const stars = {};
  GAME_IDS.forEach((id) => { stars[id] = emptyLevels(); });
  return {
    version: SCHEMA_VERSION,
    stars,
    badges: [],
    quizBest: 0,
  };
}

// 把 1|2|3 或 'l1'|'l2'|'l3' 归一化成存储用的 key；非法/缺省一律兜底 'l1'
// （旧签名 getStars(gameId) 不传 level 时，就是靠这个兜底表现成"等价于 L1"）。
function levelKey(level) {
  if (typeof level === 'string' && LEVEL_KEYS.includes(level)) return level;
  const n = Number(level);
  return (n === 1 || n === 2 || n === 3) ? `l${n}` : 'l1';
}

function clampStar(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, n));
}

function isV2Shape(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== 2) return false;
  if (!data.stars || typeof data.stars !== 'object') return false;
  if (!Array.isArray(data.badges)) return false;
  if (typeof data.quizBest !== 'number') return false;
  return true;
}

function isV1Shape(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== 1) return false;
  if (!data.stars || typeof data.stars !== 'object') return false;
  if (!Array.isArray(data.badges)) return false;
  if (typeof data.quizBest !== 'number') return false;
  return true;
}

function sanitizeV2(parsed) {
  const merged = defaultData();
  GAME_IDS.forEach((id) => {
    const src = parsed.stars[id];
    const lv = emptyLevels();
    if (src && typeof src === 'object') {
      lv.l1 = clampStar(src.l1);
      lv.l2 = clampStar(src.l2);
      lv.l3 = clampStar(src.l3);
    } else if (typeof src === 'number') {
      // 容错双保险：理论上 v2 不该混进单值，万一出现按 v1 语义读成 l1
      lv.l1 = clampStar(src);
    }
    merged.stars[id] = lv;
  });
  merged.badges = parsed.badges.filter((b) => typeof b === 'string');
  merged.quizBest = Math.max(0, Math.min(999, parsed.quizBest | 0));
  return merged;
}

function migrateV1(parsed) {
  const merged = defaultData();
  GAME_IDS.forEach((id) => {
    const old = parsed.stars[id];
    const v = (typeof old === 'number' && old >= 0 && old <= 3) ? Math.round(old) : 0;
    merged.stars[id] = { l1: v, l2: 0, l3: 0 };
  });
  merged.badges = parsed.badges.filter((b) => typeof b === 'string');
  merged.quizBest = Math.max(0, Math.min(999, parsed.quizBest | 0));
  return merged;
}

function load() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return defaultData(); // localStorage 被禁用（隐私模式等）时静默降级为内存态默认值
  }
  if (!raw) return defaultData();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return defaultData();
  }
  if (isV2Shape(parsed)) return sanitizeV2(parsed);
  if (isV1Shape(parsed)) {
    const migrated = migrateV1(parsed);
    // 静默迁移：立刻落盘成 v2，不等下一次 setStars 才写入，避免中途刷新又读到 v1
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch (e) { /* noop */ }
    return migrated;
  }
  return defaultData();
}

let data = load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // 写入失败（隐私模式/容量满）不阻断游戏体验，静默忽略
  }
}

/** 该关三个 level 是否都至少 1 星（= 铜徽章解锁条件）。 */
function bronzeMet(gameId) {
  const lv = data.stars[gameId];
  return lv.l1 >= 1 && lv.l2 >= 1 && lv.l3 >= 1;
}

/**
 * 徽章档位。六关徽章：未解锁 null / 铜 bronze（三个 level 都 ≥1 星）/ 金 gold（9 星满）。
 * 非六关 id（比如闪卡测验的 'quiz'）没有档位概念，解锁了就是 bronze，不存在金徽章。
 */
function getBadgeTier(id) {
  if (GAME_IDS.includes(id)) {
    if (!data.badges.includes(id)) return null;
    return getGameTotal(id) >= 9 ? 'gold' : 'bronze';
  }
  return data.badges.includes(id) ? 'bronze' : null;
}

function getStars(gameId, level) {
  if (!GAME_IDS.includes(gameId)) return 0;
  const key = levelKey(level);
  return data.stars[gameId][key] || 0;
}

function getAllStars() {
  const out = {};
  GAME_IDS.forEach((id) => { out[id] = { ...data.stars[id] }; });
  return out;
}

function getGameTotal(gameId) {
  if (!GAME_IDS.includes(gameId)) return 0;
  const lv = data.stars[gameId];
  return (lv.l1 || 0) + (lv.l2 || 0) + (lv.l3 || 0);
}

/**
 * 记录某一关某个 level 的结算星级，只保留该 level 历史最高分。
 * 若三个 level 都达到 ≥1 星，自动解锁铜徽章；若进一步拿满 9 星，自动升级金徽章
 * （两种情况都会把 badgeUnlocked 设为 gameId，方便 shell 弹窗提示）。
 * @returns {{ best: number, isNewBest: boolean, badgeUnlocked: string|null, badgeTier: string|null }}
 */
function setStars(gameId, level, stars) {
  if (!GAME_IDS.includes(gameId)) {
    return { best: 0, isNewBest: false, badgeUnlocked: null, badgeTier: null };
  }
  const key = levelKey(level);
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
  return [...data.badges];
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
  const s = Math.max(0, score | 0);
  const isNewBest = s > data.quizBest;
  if (isNewBest) data.quizBest = s;
  persist();
  return { best: data.quizBest, isNewBest };
}

function totalStars() {
  return GAME_IDS.reduce((sum, id) => sum + getGameTotal(id), 0);
}

function maxStars() {
  return GAME_IDS.length * 9;
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
