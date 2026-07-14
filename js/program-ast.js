/* Pure gameplay rules shared by the programming games.  Keeping these rules out
 * of the DOM makes "no-cheat" gates testable and lets the UI explain the exact
 * failing instruction instead of guessing from animation state. */

export function expandMacroProgram(program, definitions) {
  const out = [];
  for (const token of program) {
    const match = /^myblock(\d+)$/.exec(token);
    if (!match) { out.push(token); continue; }
    const definition = definitions[Number(match[1])];
    if (!definition) return { ok: false, reason: 'undefined-macro', expanded: out };
    out.push(...definition);
  }
  return { ok: true, expanded: out };
}

export function judgeMacroProgram({ program, definitions, target, topLevelBudget = Infinity, requiredMacroCount = 0 }) {
  const macroTokens = program.filter((token) => /^myblock\d+$/.test(token));
  const usedMacros = new Set(macroTokens);
  const expanded = expandMacroProgram(program, definitions);
  if (!expanded.ok) return expanded;
  const mismatchIndex = target.findIndex((value, index) => expanded.expanded[index] !== value);
  if (mismatchIndex >= 0 || expanded.expanded.length !== target.length) {
    return { ok: false, reason: 'sequence-mismatch', mismatchIndex: mismatchIndex < 0 ? target.length : mismatchIndex };
  }
  return {
    ok: true,
    macroCount: macroTokens.length,
    distinctMacros: usedMacros.size,
    expanded: expanded.expanded,
    withinBudget: program.length <= topLevelBudget,
    meetsMacroChallenge: macroTokens.length >= requiredMacroCount,
  };
}

/**
 * Correctness and reward are deliberately separate.  A child who reproduces
 * the route always completes the mission; compression and first-try accuracy
 * decide whether that completion earns one, two or three stars.
 */
export function scoreMacroProgram({
  attempts,
  topLevelCount,
  targetLength,
  optimalCount,
  distinctMacros = 0,
  requiredDistinctMacros = 1,
}) {
  const safeTarget = Math.max(1, Number(targetLength) || 1);
  const compressionRatio = 1 - Math.min(1, topLevelCount / safeTarget);
  const challengeMet = distinctMacros >= requiredDistinctMacros;
  if (attempts === 1 && topLevelCount <= optimalCount && challengeMet) {
    return { stars: 3, compressionRatio, challengeMet };
  }
  if (attempts <= 2 && compressionRatio > 0 && distinctMacros > 0) {
    return { stars: 2, compressionRatio, challengeMet };
  }
  return { stars: 1, compressionRatio, challengeMet };
}

export function advanceMacroPose({ index = 0, turnDeg = 0 }, action) {
  if (action === 'fwd') return { index: index + 1, turnDeg };
  if (action === 'left') return { index, turnDeg: turnDeg - 90 };
  if (action === 'right') return { index, turnDeg: turnDeg + 90 };
  return { index, turnDeg };
}

export function expandLoopSegments(segments) {
  const out = [];
  for (const segment of segments) {
    const repeat = Math.max(0, Number(segment.repeat) || 0);
    for (let i = 0; i < repeat; i++) out.push(...segment.body);
  }
  return out;
}

export function validateLoopStructure({ prefix = [], segments, targetLength, minSegments = 2 }) {
  if (!Array.isArray(segments) || segments.length < minSegments) {
    return { ok: false, reason: 'segments-required' };
  }
  if (segments.some((segment) => !Array.isArray(segment.body) || segment.body.length < 2 || Number(segment.repeat) < 2)) {
    return { ok: false, reason: 'weak-loop' };
  }
  const expandedLength = prefix.length + segments.reduce((sum, segment) => sum + segment.body.length * Number(segment.repeat), 0);
  if (expandedLength !== targetLength) {
    return { ok: false, reason: 'coverage-mismatch', expandedLength, targetLength };
  }
  return { ok: true, expandedLength };
}

export function judgeLoopProgram({ prefix = [], segments, target, minSegments = 2 }) {
  const structure = validateLoopStructure({ prefix, segments, targetLength: target.length, minSegments });
  if (!structure.ok) return structure;
  const expanded = [...prefix, ...expandLoopSegments(segments)];
  const mismatchIndex = target.findIndex((value, index) => expanded[index] !== value);
  if (mismatchIndex >= 0 || expanded.length !== target.length) {
    return { ok: false, reason: 'sequence-mismatch', mismatchIndex: mismatchIndex < 0 ? target.length : mismatchIndex, expanded };
  }
  return { ok: true, expanded };
}

export function gripBand({ weight, firmness, softness, fragile = false }) {
  // The on-screen ruler is the single source of truth: light starts at 2,
  // medium at 4, heavy at 7. Soft/slippery materials need one extra unit;
  // fragile prizes leave only a narrow two-step safe window.
  const material = firmness || softness || 'hard';
  const weightFloor = weight === 'heavy' ? 7 : weight === 'medium' ? 4 : 2;
  const minimum = Math.min(10, weightFloor + (material === 'soft' ? 1 : 0));
  return {
    min: minimum,
    max: Math.min(10, minimum + (fragile ? 1 : material === 'soft' ? 2 : 3)),
  };
}

export function judgeRaceMove({ action, from, length, pits = [] }) {
  const def = {
    fwd2: { delta: 2, mode: 'roll' },
    fwd3: { delta: 3, mode: 'roll' },
    jump3: { delta: 3, mode: 'jump' },
    back1: { delta: -1, mode: 'roll' },
  }[action];
  if (!def) return { ok: false, reason: 'unknown-action' };
  const to = from + def.delta;
  if (to < 0 || to >= length) return { ok: false, reason: 'off-track', to };
  const crossed = [];
  const step = Math.sign(def.delta);
  for (let p = from + step; p !== to; p += step) crossed.push(p);
  if (def.mode !== 'jump' && crossed.some((p) => pits.includes(p))) return { ok: false, reason: 'pit-crossing', to };
  if (pits.includes(to)) return { ok: false, reason: 'pit-landing', to };
  return { ok: true, to, mode: def.mode };
}

/** Solve the real one-block-per-cell race rules; declared optimal values are never trusted. */
export function solveRaceRoute({ length, target, supply, types, pits = [], requiredAction = null }) {
  const startCounts = types.map((type) => Math.max(0, Number(supply[type]) || 0));
  const key = (pos, counts, visited, requiredUsed) => `${pos}|${counts.join(',')}|${visited}|${requiredUsed ? 1 : 0}`;
  const queue = [{ pos: 0, counts: startCounts, visited: 1, requiredUsed: false, path: [] }];
  const seen = new Set([key(0, startCounts, 1, false)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const state = queue[cursor];
    if (state.pos === target && (!requiredAction || state.requiredUsed)) {
      return { hops: state.path.length, path: state.path };
    }
    for (let typeIndex = 0; typeIndex < types.length; typeIndex += 1) {
      if (state.counts[typeIndex] <= 0) continue;
      const action = types[typeIndex];
      const move = judgeRaceMove({ action, from: state.pos, length, pits });
      if (!move.ok) continue;
      const bit = 1 << move.to;
      if (move.to !== target && (state.visited & bit)) continue;
      const counts = state.counts.slice();
      counts[typeIndex] -= 1;
      const visited = state.visited | bit;
      const requiredUsed = state.requiredUsed || action === requiredAction;
      const stateKey = key(move.to, counts, visited, requiredUsed);
      if (seen.has(stateKey)) continue;
      seen.add(stateKey);
      queue.push({
        pos: move.to,
        counts,
        visited,
        requiredUsed,
        path: [...state.path, { index: state.pos, action }],
      });
    }
  }
  return null;
}

/** Pure placement reducer used by touch/drag UI and inventory regression tests. */
export function tryPlaceRaceBlock({ cellBlocks, supply, index, type, target, pits = [] }) {
  if (index === target || pits.includes(index)) return { ok: false, reason: 'blocked-cell', cellBlocks, supply };
  if (cellBlocks[index]) return { ok: false, reason: 'occupied-cell', cellBlocks, supply };
  if ((supply[type] || 0) <= 0) return { ok: false, reason: 'out-of-stock', cellBlocks, supply };
  const nextBlocks = cellBlocks.slice();
  const nextSupply = { ...supply };
  nextBlocks[index] = type;
  nextSupply[type] -= 1;
  return { ok: true, cellBlocks: nextBlocks, supply: nextSupply };
}
