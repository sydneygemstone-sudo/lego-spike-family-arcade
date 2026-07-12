/* js/quiz.js
 * 闪卡小测验——每轮 8 题，展示积木 SVG/零件图，四选一中文功能描述。
 * 答对给分 + 连对 3 题以上加播一段"连击"奖励音；最佳成绩存档；满分解锁"闪卡大师"徽章。
 *
 * 用法：
 *   import { mountQuiz } from './quiz.js';
 *   const quiz = mountQuiz(containerEl);
 *   quiz.start();   // 开始新一轮
 *   quiz.destroy();
 */

import { CARDS_DATA } from '../assets/cards-data.js';
import { renderCardVisual, renderBlockScripts } from '../assets/card-visual.js';
import { sfx } from './sfx.js';
import { createMascot } from './mascot.js';
import { store } from './store.js';

const QUESTIONS_PER_ROUND = 8;
const STREAK_BONUS_AT = 3;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions() {
  const pool = shuffle(CARDS_DATA).slice(0, QUESTIONS_PER_ROUND);
  return pool.map((card) => {
    const others = shuffle(CARDS_DATA.filter((c) => c.id !== card.id && c.chinese !== card.chinese)).slice(0, 3);
    const options = shuffle([card.chinese, ...others.map((c) => c.chinese)]);
    return { card, options, correct: card.chinese };
  });
}

export function mountQuiz(container) {
  let questions = [];
  let index = 0;
  let score = 0;
  let streak = 0;
  let mascot = null;
  let locked = false; // 答题后短暂锁定，防止连点

  function renderIntro() {
    container.innerHTML = `
      <div class="quiz-intro flex-col gap-3" style="align-items:center; text-align:center; padding: 24px 0;">
        <div id="quiz-mascot-slot"></div>
        <p class="title-md">看图猜功能，答对 8 题挑战满分！</p>
        <p class="text-muted">最佳成绩：<strong id="quiz-best-label">${store.getQuizBest()}</strong> / ${QUESTIONS_PER_ROUND}</p>
        <button class="brick-btn brick-btn--green brick-btn--lg" id="quiz-start-btn">开始测验</button>
      </div>
    `;
    mascot = createMascot(container.querySelector('#quiz-mascot-slot'));
    mascot.say('准备好了吗？看图猜猜这是做什么用的！', 'idle', 0);
    container.querySelector('#quiz-start-btn').addEventListener('click', start);
  }

  function start() {
    questions = pickQuestions();
    index = 0;
    score = 0;
    streak = 0;
    renderQuestion();
  }

  function renderQuestion() {
    locked = false;
    const q = questions[index];
    container.innerHTML = `
      <div class="quiz-round">
        <div class="quiz-progress flex-between">
          <span class="title-sm">第 ${index + 1} / ${questions.length} 题</span>
          <span class="title-sm">得分 ${score}</span>
        </div>
        <div class="quiz-visual-stage brick-card brick-card--blue" id="quiz-visual-stage">
          ${renderCardVisual(q.card)}
        </div>
        <div class="quiz-options" id="quiz-options">
          ${q.options.map((opt, i) => `
            <button class="brick-btn brick-btn--yellow quiz-option-btn" data-opt-index="${i}">${opt}</button>
          `).join('')}
        </div>
        <div id="quiz-mascot-slot-q" class="flex-center" style="margin-top:12px;"></div>
      </div>
    `;
    renderBlockScripts('#quiz-visual-stage', 1.15);
    mascot = createMascot(container.querySelector('#quiz-mascot-slot-q'));
    mascot.setEmotion('idle');

    container.querySelectorAll('.quiz-option-btn').forEach((btn) => {
      btn.addEventListener('click', () => onAnswer(btn, q));
    });
  }

  function onAnswer(btn, q) {
    if (locked) return;
    locked = true;
    const chosen = btn.textContent.trim();
    const isCorrect = chosen === q.correct;
    const allBtns = Array.from(container.querySelectorAll('.quiz-option-btn'));

    allBtns.forEach((b) => { b.disabled = true; });

    if (isCorrect) {
      btn.classList.add('quiz-option-btn--correct');
      score += 1;
      streak += 1;
      sfx.success();
      if (streak >= STREAK_BONUS_AT) {
        setTimeout(() => sfx.star(), 180);
        mascot.say(`连续答对 ${streak} 题！太厉害了！`, 'cheer');
      } else {
        mascot.say('答对了！', 'happy');
      }
    } else {
      btn.classList.add('quiz-option-btn--wrong');
      const correctBtn = allBtns.find((b) => b.textContent.trim() === q.correct);
      if (correctBtn) correctBtn.classList.add('quiz-option-btn--correct');
      streak = 0;
      sfx.fail();
      mascot.say('差一点，看看正确答案吧！', 'oops');
    }

    setTimeout(() => {
      index += 1;
      if (index < questions.length) {
        renderQuestion();
      } else {
        renderResult();
      }
    }, 1100);
  }

  function renderResult() {
    const result = store.setQuizBest(score);
    const perfect = score === questions.length;
    let badgeUnlocked = false;
    if (perfect) badgeUnlocked = store.addBadge('quiz');

    container.innerHTML = `
      <div class="quiz-result flex-col gap-3" style="align-items:center; text-align:center; padding: 24px 0;">
        <div id="quiz-result-mascot-slot"></div>
        <h2 class="title-lg">本轮得分：${score} / ${questions.length}</h2>
        <p class="text-muted">历史最佳：${result.best} / ${questions.length}${result.isNewBest ? '（新纪录！）' : ''}</p>
        ${badgeUnlocked ? `
          <div class="flex-col gap-2" style="align-items:center;">
            <div class="badge-hex" style="--badge-color: var(--lego-purple);">🗂️</div>
            <div class="title-sm">解锁"闪卡大师"徽章！</div>
          </div>
        ` : ''}
        <div class="flex-row gap-3" style="justify-content:center; flex-wrap: wrap;">
          <button class="brick-btn brick-btn--green" id="quiz-again-btn">再来一轮</button>
          <button class="brick-btn brick-btn--gray" id="quiz-exit-btn">返回浏览</button>
        </div>
      </div>
    `;
    mascot = createMascot(container.querySelector('#quiz-result-mascot-slot'));
    mascot.say(
      perfect ? '满分！你是真正的闪卡大师！' : score >= questions.length * 0.6 ? '很不错，再挑战一次试试满分！' : '再试一次，你会越来越厉害！',
      perfect ? 'cheer' : score >= questions.length * 0.6 ? 'happy' : 'think',
      0
    );
    container.querySelector('#quiz-again-btn').addEventListener('click', start);
    container.querySelector('#quiz-exit-btn').addEventListener('click', () => {
      if (typeof onExit === 'function') onExit();
    });
  }

  let onExit = null;

  renderIntro();

  return {
    start,
    onExit(cb) { onExit = cb; },
    destroy() {
      container.innerHTML = '';
    },
  };
}
