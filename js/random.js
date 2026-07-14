/* Deterministic, backend-free random context for GitHub Pages.
 *
 * A run has one tab-scoped seed. Each game/level/variant forks that seed into
 * an independent stream, so the same URL recreates the same puzzle while the
 * "new variant" action can move through ten repeatable combinations.
 */

const RUN_SEED_KEY = 'lsfa_run_seed_v1';

export function hashSeed(value) {
  const text = String(value ?? '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(seed) {
  const normalizedSeed = String(seed || 'spike-prime');
  const next = mulberry32(hashSeed(normalizedSeed));
  const api = {
    seed: normalizedSeed,
    next,
    int(min, max) {
      const low = Math.ceil(Number(min));
      const high = Math.floor(Number(max));
      if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) return low || 0;
      return low + Math.floor(next() * (high - low + 1));
    },
    pick(items) {
      if (!Array.isArray(items) || !items.length) return undefined;
      return items[api.int(0, items.length - 1)];
    },
    shuffle(items) {
      const copy = Array.isArray(items) ? [...items] : [];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = api.int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    fork(label) { return createSeededRandom(`${normalizedSeed}|${String(label)}`); },
  };
  return api;
}

export function normalizeVariant(value, count = 10) {
  const max = Math.max(1, Number(count) || 10);
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= max ? number : 1;
}

function safeSeed(value) {
  const text = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{4,64}$/.test(text) ? text : null;
}

function newSeed() {
  try {
    const bytes = new Uint32Array(2);
    globalThis.crypto.getRandomValues(bytes);
    return `${bytes[0].toString(36)}-${bytes[1].toString(36)}`;
  } catch (error) {
    return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xFFFFFFFF).toString(36)}`;
  }
}

export function getRunSeed(params = new URLSearchParams()) {
  const fromUrl = safeSeed(params.get('seed'));
  if (fromUrl) return fromUrl;
  try {
    const existing = safeSeed(sessionStorage.getItem(RUN_SEED_KEY));
    if (existing) return existing;
    const created = newSeed();
    sessionStorage.setItem(RUN_SEED_KEY, created);
    return created;
  } catch (error) {
    return newSeed();
  }
}

export function createRandomContext(params, namespace, variantCount = 10) {
  const seed = getRunSeed(params);
  const variant = normalizeVariant(params.get('v') || params.get('r'), variantCount);
  const contextSeed = `${seed}|${namespace}|variant:${variant}`;
  const createStream = (label = 'layout') => createSeededRandom(`${contextSeed}|stream:${String(label)}`);
  return {
    seed,
    variant,
    variantCount,
    createStream,
    // Backward-compatible defaults for callers that only initialize once.
    rand: createStream('layout'),
    uiRand: createStream('ui'),
  };
}

export function nextVariant(current, count = 10) {
  const variant = normalizeVariant(current, count);
  return variant >= count ? 1 : variant + 1;
}
