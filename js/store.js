/* js/store.js
 * localStorage 存档——无账号/云同步，纯本地。
 * schema: { version, stars:{hunt,claw,macro,race,sort,bridge}(0-3), badges:[id...], quizBest }
 * 版本号防脏数据：解析失败或 version 不匹配一律回退默认值，不让旧格式脏数据炸页面。
 *
 * 用法：
 *   import { store, GAME_IDS } from './store.js';
 *   store.getStars('hunt');           // 0-3
 *   store.setStars('hunt', 3);        // 只会保留历史最高分；返回 { best, isNewBest, badgeUnlocked }
 *   store.getBadges();                // ['hunt', 'quiz', ...]
 *   store.getQuizBest();  store.setQuizBest(7);
 *   store.totalStars();   store.maxStars();
 *
 * 完整方法签名见项目根目录 API.md。
 */

const STORAGE_KEY = 'lsfa_save_v1';
const SCHEMA_VERSION = 1;

export const GAME_IDS = ['hunt', 'claw', 'macro', 'race', 'sort', 'bridge'];

function defaultData() {
  const stars = {};
  GAME_IDS.forEach((id) => { stars[id] = 0; });
  return {
    version: SCHEMA_VERSION,
    stars,
    badges: [],
    quizBest: 0,
  };
}

function isValidShape(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== SCHEMA_VERSION) return false;
  if (!data.stars || typeof data.stars !== 'object') return false;
  if (!Array.isArray(data.badges)) return false;
  if (typeof data.quizBest !== 'number') return false;
  return true;
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
  if (!isValidShape(parsed)) return defaultData();
  // 补齐字段：即使 shape 校验通过，也确保新增关卡 id 不缺 key
  const merged = defaultData();
  GAME_IDS.forEach((id) => {
    const v = parsed.stars[id];
    merged.stars[id] = typeof v === 'number' && v >= 0 && v <= 3 ? v : 0;
  });
  merged.badges = parsed.badges.filter((b) => typeof b === 'string');
  merged.quizBest = Math.max(0, Math.min(999, parsed.quizBest | 0));
  return merged;
}

let data = load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // 写入失败（隐私模式/容量满）不阻断游戏体验，静默忽略
  }
}

function getStars(gameId) {
  return GAME_IDS.includes(gameId) ? (data.stars[gameId] || 0) : 0;
}

function getAllStars() {
  return { ...data.stars };
}

/**
 * 记录一次关卡结算的星级，只保留历史最高分。
 * 若本次让该关首次达到 3 星，自动解锁对应徽章（badge id = gameId）。
 * @returns {{ best: number, isNewBest: boolean, badgeUnlocked: string|null }}
 */
function setStars(gameId, stars) {
  if (!GAME_IDS.includes(gameId)) {
    return { best: 0, isNewBest: false, badgeUnlocked: null };
  }
  const clamped = Math.max(0, Math.min(3, stars | 0));
  const prev = data.stars[gameId] || 0;
  const isNewBest = clamped > prev;
  if (isNewBest) data.stars[gameId] = clamped;

  let badgeUnlocked = null;
  if (data.stars[gameId] === 3 && !data.badges.includes(gameId)) {
    data.badges.push(gameId);
    badgeUnlocked = gameId;
  }
  persist();
  return { best: data.stars[gameId], isNewBest, badgeUnlocked };
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
  return GAME_IDS.reduce((sum, id) => sum + (data.stars[id] || 0), 0);
}

function maxStars() {
  return GAME_IDS.length * 3;
}

function resetAll() {
  data = defaultData();
  persist();
}

export const store = {
  getStars,
  setStars,
  getAllStars,
  getBadges,
  hasBadge,
  addBadge,
  getQuizBest,
  setQuizBest,
  totalStars,
  maxStars,
  resetAll,
};
