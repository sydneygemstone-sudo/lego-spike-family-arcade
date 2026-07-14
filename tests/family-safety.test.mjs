import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = globalThis.document || { addEventListener() {} };

test('living hunt builds a step-by-step route that reaches the treasure', async () => {
  const { commandsForPath } = await import('../family-games/livinghunt.js');
  const path = [[4, 0], [3, 0], [2, 0], [2, 1], [2, 2], [1, 2]];
  const commands = commandsForPath(path);
  assert.equal(commands.filter((command) => command.kind === 'forward').length, path.length - 1);

  const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  let direction = 0;
  let position = [...path[0]];
  commands.forEach((command) => {
    if (command.kind === 'left') direction = (direction + 3) % 4;
    if (command.kind === 'right') direction = (direction + 1) % 4;
    if (command.kind === 'forward') position = [position[0] + dirs[direction][0], position[1] + dirs[direction][1]];
  });
  assert.deepEqual(position, path.at(-1));
});

test('macro broadcast always contains two macros and at least one standalone action', async () => {
  const { buildBroadcastStream } = await import('../family-games/macrospell.js');
  const rand = { shuffle: (items) => items, pick: (items) => items[0] };
  const stream = buildBroadcastStream(rand);
  assert.equal(stream.filter((item) => item.kind === 'macro').length, 2);
  assert.ok(stream.filter((item) => item.kind === 'action').length >= 1);
});

test('quiz gives three parent-read scenes and every answer requires three ordered cards', async () => {
  const { buildQuizQuestions, evaluateSceneAnswer } = await import('../js/quiz.js');
  const questions = buildQuizQuestions('advanced', () => 0.37);
  assert.equal(questions.length, 3);
  questions.forEach((question) => {
    assert.equal(question.correctIds.length, 3);
    assert.equal(question.correctCards.length, 3);
    assert.equal(question.trayCards.length, 6);
    assert.equal(new Set(question.trayCards.map((card) => card.id)).size, 6);
    assert.match(question.readAloud, /。/);
    assert.equal(evaluateSceneAnswer(question.correctIds, question.correctIds).exact, true);
    assert.equal(evaluateSceneAnswer([...question.correctIds].reverse(), question.correctIds).exact, false);
  });
});

test('flashcard physical catalog contains only the 45678-focused 8 hardware and 20 element cards', async () => {
  const { CARDS_DATA } = await import('../assets/cards-data.js');
  const hardware = CARDS_DATA.filter((card) => card.category === 'hardware');
  const elements = CARDS_DATA.filter((card) => card.category === 'elements');
  assert.equal(CARDS_DATA.length, 72);
  assert.equal(hardware.length, 8);
  assert.equal(elements.length, 20);
  const titles = [...hardware, ...elements].map((card) => card.title).join('\n');
  assert.doesNotMatch(titles, /Built-in Gyro|Bluetooth Wireless|5x5 LED Matrix|Worm Gear|Turntable|Universal Joint|Clutch Gear|Ball Caster/);
  assert.match(titles, /Large Hub Rechargeable Battery/);
  assert.match(titles, /Micro USB Cable/);
  assert.match(titles, /Wire Clip with Cross Hole/);
  assert.match(titles, /Brick 2x4 with Cross Holes/);
});

test('flashcard actions do not contain the removed high-risk instructions', async () => {
  const { CARDS_DATA } = await import('../assets/cards-data.js');
  const actions = CARDS_DATA.map((card) => card.action || '').join('\n');
  assert.doesNotMatch(actions, /闭眼向前|盲走|朝后蹦|靠一下墙|快速晃动头|平板支撑|背上放一书包|任凭家长推动|十指关节交织反转/);
});
