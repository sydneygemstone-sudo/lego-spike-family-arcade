/* 三题亲子场景挑战：家长读题，小朋友每题必须挑出并排序 3 张闪卡。 */

import { CARDS_DATA } from '../assets/cards-data.js';
import { renderCardVisual, renderBlockScripts, escapeHtml } from '../assets/card-visual.js';
import { sfx } from './sfx.js';
import { store } from './store.js';

const QUESTIONS_PER_ROUND = 3;
const CARD_BY_ID = new Map(CARDS_DATA.map((card) => [card.id, card]));

export const SCENE_CHALLENGES = Object.freeze([
  {
    id: 'red-finish',
    levels: ['starter', 'advanced'],
    title: '红色终点线',
    readAloud: '机器人已经在向前巡逻。它看到红色终点线后，要先确认颜色，再停住双轮，最后亮出笑脸。请按发生顺序放入三张卡。',
    correctIds: ['wb_s1', 'wb_mv5', 'wb_ls1'],
    distractorIds: ['wb_s2', 'wb_m5', 'wb_ls4'],
    explanation: '先等颜色传感器看到红色，再停止底盘，最后用笑脸告诉大家任务完成。',
  },
  {
    id: 'cargo-button',
    levels: ['starter', 'advanced'],
    title: '按键发货',
    readAloud: '家长按下发货按钮后，机械臂转一圈把箱子送出去，再响一声表示完成。请挑出感知、动作、反馈三张卡。',
    correctIds: ['wb_s3', 'wb_m1', 'wb_ls3'],
    distractorIds: ['wb_s2', 'wb_m2', 'wb_ls1'],
    explanation: '先等待压力传感器被按下，再让电机转一圈，最后播放提示音。',
  },
  {
    id: 'obstacle-message',
    levels: ['starter', 'advanced'],
    title: '前方有障碍',
    readAloud: '机器人巡逻时发现障碍物已经靠近到 15 厘米内。它必须停下，然后在屏幕上写出 GO，提醒家长移开障碍物后再继续。',
    correctIds: ['wb_s2', 'wb_mv5', 'wb_ls2'],
    distractorIds: ['wb_s1', 'wb_mv1', 'wb_ls1'],
    explanation: '距离条件先成立，程序才停止移动并滚动显示提示文字。',
  },
  {
    id: 'launch-card',
    levels: ['starter', 'advanced'],
    title: '出发提示牌',
    readAloud: '按下运行后，机器人先向前走 10 厘米，再在屏幕上写出 GO。请找出启动、移动、显示三张卡并排好顺序。',
    correctIds: ['wb_ev1', 'wb_mv1', 'wb_ls2'],
    distractorIds: ['wb_ev6', 'wb_mv3', 'wb_ls4'],
    explanation: '启动事件放第一张，固定距离移动放第二张，显示 GO 放最后。',
  },
  {
    id: 'smart-grabber',
    levels: ['starter', 'advanced'],
    title: '会回应的机械手',
    readAloud: '要搭一只按到物体就会动作的机械手：需要一个大脑接收信息、一个零件感受按压、一个轻快的电机驱动夹爪。请按角色顺序选三张。',
    correctIds: ['hw_1', 'hw_7', 'hw_3'],
    distractorIds: ['hw_5', 'hw_4', 'hw_9'],
    explanation: 'Smart Hub 是大脑，Force Sensor 感受按压，Medium Motor 适合驱动紧凑夹爪。',
  },
  {
    id: 'seeing-rover',
    levels: ['starter', 'advanced'],
    title: '会看路的大车',
    readAloud: '要搭一台能发现前方障碍、又有足够力量推动底盘的机器人：先选控制大脑，再选看距离的眼睛，最后选动力更强的电机。',
    correctIds: ['hw_1', 'hw_6', 'hw_4'],
    distractorIds: ['hw_5', 'hw_3', 'hw_8'],
    explanation: 'Hub 负责控制，Distance Sensor 测距离，Large Motor 提供更强的底盘动力。',
  },
  {
    id: 'rigid-chassis',
    levels: ['starter', 'advanced'],
    title: '不摇晃的底盘',
    readAloud: '先拿一块大面积底板，再加一个抗扭的矩形框架，最后用连接销把结构锁住。哪三张结构卡能完成这个搭建顺序？',
    correctIds: ['te_21', 'te_2', 'te_4'],
    distractorIds: ['te_1', 'te_3', 'te_10'],
    explanation: '大底板提供面积，5×7 框架抵抗扭曲，连接销负责把结构固定。',
  },
  {
    id: 'turn-power',
    levels: ['advanced'],
    title: '动力拐弯 90°',
    readAloud: '电机的动力先沿十字轴传递，接着要在直角处改变方向，最后用交叉连接块把两条不同方向的轴线稳稳定位。请排出三张结构卡。',
    correctIds: ['te_3', 'te_7', 'te_14'],
    distractorIds: ['te_6', 'te_8', 'te_15'],
    explanation: '十字轴传动力，12 齿双斜齿轮在直角处传动，交叉连接块固定空间方向。',
  },
  {
    id: 'charge-hub',
    levels: ['advanced'],
    title: '给机器人补充能量',
    readAloud: '从电脑端开始，先找到连接与充电线，再找到储存电能的专用电池，最后找到使用这块电池的机器人控制大脑。请按能量路径排三张卡。',
    correctIds: ['hw_9', 'hw_8', 'hw_1'],
    distractorIds: ['hw_3', 'hw_5', 'hw_6'],
    explanation: 'Micro USB 线连接电源，专用电池储能，Smart Hub 使用电池供电。',
  },
]);

function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function cardsFrom(ids) {
  return ids.map((id) => CARD_BY_ID.get(id)).filter(Boolean);
}

export function buildQuizQuestions(level = 'starter', random = Math.random) {
  const scenarios = SCENE_CHALLENGES.filter((scene) => scene.levels.includes(level));
  return shuffle(scenarios, random).slice(0, QUESTIONS_PER_ROUND).map((scene) => {
    const distractorCount = level === 'advanced' ? 3 : 2;
    const trayIds = shuffle([
      ...scene.correctIds,
      ...shuffle(scene.distractorIds, random).slice(0, distractorCount),
    ], random);
    return {
      ...scene,
      level,
      correctCards: cardsFrom(scene.correctIds),
      trayCards: cardsFrom(trayIds),
    };
  });
}

export function evaluateSceneAnswer(selectedIds, correctIds) {
  const exact = selectedIds.length === correctIds.length
    && selectedIds.every((id, index) => id === correctIds[index]);
  const sameCards = selectedIds.length === correctIds.length
    && [...selectedIds].sort().join('|') === [...correctIds].sort().join('|');
  return { exact, sameCards, wrongOrder: sameCards && !exact };
}

function compactCard(card) {
  return `
    <span class="quiz-tray-visual">${renderCardVisual(card)}</span>
    <span class="quiz-tray-name">${escapeHtml(card.chinese)}</span>
  `;
}

export function mountQuiz(container) {
  let questions = [];
  let index = 0;
  let score = 0;
  let selectedIds = [];
  let locked = false;
  let difficulty = 'starter';
  let onExit = null;

  const bestScore = () => Math.min(QUESTIONS_PER_ROUND, Math.max(0, Number(store.getQuizBest()) || 0));

  function renderIntro() {
    container.innerHTML = `
      <div class="quiz-intro flex-col gap-3">
        <div class="quiz-core" aria-hidden="true"><i></i><span></span><b></b></div>
        <div class="quiz-intro-kicker">家长读场景 · 小朋友排三张卡</div>
        <h2 class="title-lg">三题任务编排</h2>
        <p class="text-muted">每题都要从卡组中选出 3 张，并按故事发生顺序放进 1、2、3 号槽。不是背答案，是把感知、动作和反馈连成完整任务。</p>
        <div class="quiz-levels" role="group" aria-label="选择挑战难度">
          <button type="button" class="quiz-level-btn is-active" data-level="starter" aria-pressed="true"><strong>启蒙</strong><span>5 选 3 · 清晰场景</span></button>
          <button type="button" class="quiz-level-btn" data-level="advanced" aria-pressed="false"><strong>进阶</strong><span>6 选 3 · 近似干扰</span></button>
        </div>
        <p class="quiz-best">最佳 ${bestScore()} / ${QUESTIONS_PER_ROUND}</p>
        <button class="brick-btn brick-btn--green brick-btn--lg" id="quiz-start-btn" data-testid="quiz-start">开始亲子挑战</button>
      </div>
    `;
    container.querySelectorAll('.quiz-level-btn').forEach((button) => {
      button.addEventListener('click', () => {
        difficulty = button.dataset.level;
        container.querySelectorAll('.quiz-level-btn').forEach((item) => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
      });
    });
    container.querySelector('#quiz-start-btn').addEventListener('click', start);
  }

  function start() {
    questions = buildQuizQuestions(difficulty);
    index = 0;
    score = 0;
    renderQuestion();
  }

  function updateSelection(question) {
    container.querySelectorAll('.quiz-tray-card').forEach((button) => {
      const selected = selectedIds.includes(button.dataset.cardId);
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const slots = container.querySelector('#quiz-three-slots');
    slots.innerHTML = [0, 1, 2].map((slotIndex) => {
      const card = CARD_BY_ID.get(selectedIds[slotIndex]);
      return `
        <button type="button" class="quiz-sequence-slot${card ? ' is-filled' : ''}" data-slot-index="${slotIndex}" ${card ? '' : 'disabled'}>
          <b>${slotIndex + 1}</b>
          <span>${card ? escapeHtml(card.chinese) : '选择一张卡'}</span>
          ${card ? '<i>点击移除</i>' : ''}
        </button>
      `;
    }).join('');
    slots.querySelectorAll('.is-filled').forEach((button) => {
      button.addEventListener('click', () => {
        if (locked) return;
        selectedIds.splice(Number(button.dataset.slotIndex), 1);
        updateSelection(question);
      });
    });
    container.querySelector('#quiz-submit-btn').disabled = selectedIds.length !== 3 || locked;
    container.querySelector('#quiz-selection-count').textContent = `${selectedIds.length} / 3`;
  }

  function renderQuestion() {
    const question = questions[index];
    selectedIds = [];
    locked = false;
    container.innerHTML = `
      <div class="quiz-round" data-testid="quiz-question" data-scene-id="${question.id}">
        <div class="quiz-progress flex-between">
          <span class="quiz-question-number">第 ${index + 1} 题</span>
          <div class="quiz-progress-dots" aria-label="第 ${index + 1} 题，共 ${questions.length} 题">
            ${questions.map((_, itemIndex) => `<span class="quiz-progress-dot${itemIndex < index ? ' is-done' : ''}${itemIndex === index ? ' is-current' : ''}"></span>`).join('')}
          </div>
          <span class="title-sm">${score} 分 · ${difficulty === 'starter' ? '启蒙' : '进阶'}</span>
        </div>

        <div class="quiz-scene-layout">
          <section class="quiz-parent-scene">
            <span class="quiz-parent-label">请家长读给小朋友听</span>
            <h2>${escapeHtml(question.title)}</h2>
            <p>${escapeHtml(question.readAloud)}</p>
            <div class="quiz-story-rhythm" aria-hidden="true"><i></i><b></b><i></i><b></b><i></i></div>
            <small>不要念卡名，让小朋友自己解释为什么选这三张。</small>
          </section>

          <section class="quiz-answer-workbench">
            <header><strong>任务顺序</strong><span id="quiz-selection-count">0 / 3</span></header>
            <div class="quiz-three-slots" id="quiz-three-slots"></div>
            <div class="quiz-card-tray" id="quiz-card-tray">
              ${question.trayCards.map((card) => `
                <button type="button" class="quiz-tray-card" data-card-id="${card.id}" aria-pressed="false">
                  ${compactCard(card)}
                </button>
              `).join('')}
            </div>
            <button type="button" class="brick-btn brick-btn--blue brick-btn--lg quiz-submit" id="quiz-submit-btn" disabled>提交三张卡</button>
          </section>
        </div>

        <div class="quiz-explain" id="quiz-explain" hidden aria-live="polite">
          <div class="quiz-explain-verdict" id="quiz-explain-verdict"></div>
          <div class="quiz-explain-copy" id="quiz-explain-copy"></div>
          <button class="brick-btn brick-btn--blue brick-btn--lg" id="quiz-next-btn">
            ${index + 1 < questions.length ? '下一题 →' : '查看成绩 →'}
          </button>
        </div>
      </div>
    `;

    renderBlockScripts('#quiz-container', 0.64);
    updateSelection(question);

    container.querySelectorAll('.quiz-tray-card').forEach((button) => {
      button.addEventListener('click', () => {
        if (locked) return;
        const id = button.dataset.cardId;
        const existing = selectedIds.indexOf(id);
        if (existing >= 0) selectedIds.splice(existing, 1);
        else if (selectedIds.length < 3) selectedIds.push(id);
        else {
          sfx.fail();
          container.querySelector('#quiz-selection-count').textContent = '已经选满 3 张';
          return;
        }
        sfx.click();
        updateSelection(question);
      });
    });
    container.querySelector('#quiz-submit-btn').addEventListener('click', () => submitAnswer(question));
    container.querySelector('#quiz-next-btn').addEventListener('click', () => {
      index += 1;
      if (index < questions.length) renderQuestion();
      else renderResult();
    });
  }

  function submitAnswer(question) {
    if (locked || selectedIds.length !== 3) return;
    locked = true;
    const verdict = evaluateSceneAnswer(selectedIds, question.correctIds);
    const explain = container.querySelector('#quiz-explain');
    const verdictEl = container.querySelector('#quiz-explain-verdict');
    const copyEl = container.querySelector('#quiz-explain-copy');
    container.querySelectorAll('.quiz-tray-card').forEach((button) => {
      button.disabled = true;
      const id = button.dataset.cardId;
      if (question.correctIds.includes(id)) button.classList.add('is-answer');
      if (selectedIds.includes(id) && !question.correctIds.includes(id)) button.classList.add('is-wrong');
    });
    container.querySelectorAll('.quiz-sequence-slot').forEach((button) => { button.disabled = true; });
    container.querySelector('#quiz-submit-btn').disabled = true;

    if (verdict.exact) {
      score += 1;
      sfx.success();
      verdictEl.textContent = '三张卡和顺序都正确';
      verdictEl.className = 'quiz-explain-verdict is-correct';
      copyEl.textContent = question.explanation;
    } else {
      sfx.fail();
      verdictEl.textContent = verdict.wrongOrder ? '三张卡选对了，顺序需要调整' : '这组任务还缺少关键角色';
      verdictEl.className = 'quiz-explain-verdict is-wrong';
      copyEl.textContent = `正确顺序：${question.correctCards.map((card, order) => `${order + 1}. ${card.chinese}`).join(' → ')}。${question.explanation}`;
    }
    explain.hidden = false;
    explain.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderResult() {
    const result = store.setQuizBest(score);
    const best = Math.min(QUESTIONS_PER_ROUND, Math.max(score, Number(result.best) || 0));
    const perfect = score === QUESTIONS_PER_ROUND;
    const badgeUnlocked = perfect ? store.addBadge('quiz') : false;
    container.innerHTML = `
      <div class="quiz-result flex-col gap-3">
        <div class="quiz-core quiz-core--result${perfect ? ' is-perfect' : ''}" aria-hidden="true"><i></i><span></span><b></b></div>
        <h2 class="title-lg">本轮完成 ${score} / ${QUESTIONS_PER_ROUND} 个场景</h2>
        <p class="text-muted">每题都复习了三张卡。让小朋友用自己的话复述“先发生什么、再做什么、最后怎样反馈”，比机械认卡更重要。</p>
        <p class="quiz-best">最佳 ${best} / ${QUESTIONS_PER_ROUND}${result.isNewBest ? ' · 新纪录' : ''}</p>
        ${badgeUnlocked ? '<div class="quiz-unlock">解锁「任务编排师」徽章</div>' : ''}
        <div class="flex-row gap-3">
          <button class="brick-btn brick-btn--green" id="quiz-again-btn">换三个场景</button>
          <button class="brick-btn brick-btn--gray" id="quiz-exit-btn">返回闪卡</button>
        </div>
      </div>
    `;
    container.querySelector('#quiz-again-btn').addEventListener('click', start);
    container.querySelector('#quiz-exit-btn').addEventListener('click', () => {
      if (typeof onExit === 'function') onExit();
    });
  }

  renderIntro();
  return {
    start,
    onExit(callback) { onExit = callback; },
    destroy() { container.innerHTML = ''; },
  };
}
