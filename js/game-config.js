/* Central campaign metadata shared by the home screen, shell and save store. */

export const GAME_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'hunt', title: '网格寻宝', icon: '🗺️', cat: 'hunt', levelCount: 10, campaign: true }),
  Object.freeze({ id: 'claw', title: '抓娃娃机', icon: '🕹️', cat: 'claw', levelCount: 10 }),
  Object.freeze({ id: 'macro', title: '口诀大师', icon: '📜', cat: 'macro', levelCount: 10 }),
  Object.freeze({ id: 'race', title: '机关轨道', icon: '🏁', cat: 'race', levelCount: 10 }),
  Object.freeze({ id: 'sort', title: '流水线密码', icon: '📦', cat: 'sort', levelCount: 10 }),
  Object.freeze({ id: 'bridge', title: '精准渡桥', icon: '🌉', cat: 'bridge', levelCount: 10 }),
]);

export const GAME_IDS = Object.freeze(GAME_DEFINITIONS.map((game) => game.id));

export function getGameDefinition(gameId) {
  return GAME_DEFINITIONS.find((game) => game.id === gameId) || null;
}

export function getLevelCount(gameId) {
  return getGameDefinition(gameId)?.levelCount || 1;
}

export function levelLabel(gameId, level) {
  return `任务 ${level}`;
}

export function maxCampaignStars() {
  return GAME_DEFINITIONS.reduce((sum, game) => sum + game.levelCount * 3, 0);
}

export function badgeRewardLine(gameId, tier) {
  if (tier !== 'gold') return '解锁新徽章！';
  return '解锁金徽章！十个任务全部拿满星啦！';
}
