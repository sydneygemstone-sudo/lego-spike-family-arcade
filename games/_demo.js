/* games/_demo.js
 * 占位关卡——验证 shell 完整生命周期（init/complete/fail/destroy）用。
 * 正式六关由其他 worker 按 API.md 协议实现，替换掉这个文件即可。
 */

let clickCount = 0;
let elCount = null;

function render(container, api) {
  container.innerHTML = `
    <div class="flex-col gap-4" style="align-items:center; padding: 32px 0;">
      <p class="title-md">这是一个占位关卡，用来验证关卡容器（shell）能正常工作。</p>
      <p class="text-muted">点 3 下下面的蓝色按钮就算通关；随时可以点橙色按钮体验"失败"反馈。</p>
      <button id="demo-progress-btn" class="brick-btn brick-btn--blue brick-btn--lg">
        点我通关 (<span id="demo-count">0</span>/3)
      </button>
      <button id="demo-fail-btn" class="brick-btn brick-btn--orange">试试失败反馈</button>
    </div>
  `;
  elCount = container.querySelector('#demo-count');

  container.querySelector('#demo-progress-btn').addEventListener('click', () => {
    api.sfx.click();
    clickCount += 1;
    elCount.textContent = String(clickCount);
    if (clickCount >= 3) {
      api.mascot.say('通关啦！', 'cheer');
      api.complete(3);
      clickCount = 0;
      elCount.textContent = '0';
    } else {
      api.mascot.say(`再点 ${3 - clickCount} 下！`, 'happy');
    }
  });

  container.querySelector('#demo-fail-btn').addEventListener('click', () => {
    api.fail('demo-fail-button-pressed');
  });
}

export default {
  id: '_demo',
  title: '占位关卡 Demo',
  icon: '🧩',
  init(container, api) {
    clickCount = 0;
    render(container, api);
  },
  destroy() {
    clickCount = 0;
    elCount = null;
  },
};
