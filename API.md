# API.md — 游戏 worker 接口合同

给六个关卡游戏模块（`games/hunt.js` / `claw.js` / `macro.js` / `race.js` / `sort.js` / `bridge.js`）作者看的接口文档。
前端地基（design-system.css / sfx.js / mascot.js / store.js / blocks-ui.js / shell.js / game.html / index.html /
flashcards.html / parents.html）已经就绪，游戏模块只需要遵守下面的协议即可接入。

参考实现：`games/_demo.js`（3 次点击通关的占位关，演示了 `init` / `complete` / `fail` / `destroy` 完整生命周期）。

---

## 1. 关卡模块协议

每个关卡是一个 ES module，放在 `games/<id>.js`，`<id>` 必须匹配 `/^[a-zA-Z0-9_]+$/`（不能带路径分隔符），
且与 `js/store.js` 里的 `GAME_IDS` 之一一致（`hunt` / `claw` / `macro` / `race` / `sort` / `bridge`），
否则拿到的星级不会被存档/不会解锁徽章（`_demo` 就是刻意不在 `GAME_IDS` 里的占位关，不会污染存档）。

支持两种导出写法，`shell.js` 都认：

```js
// 写法 A（推荐，默认导出一个对象）
export default {
  id: 'hunt',
  title: '网格寻宝',
  icon: '🗺️',
  init(container, api) { /* 挂载游戏 DOM、绑定事件 */ },
  destroy() { /* 清理事件监听/计时器，container 会被 shell 清空，不用自己清 innerHTML */ },
};
```

```js
// 写法 B（具名导出，效果等价）
export const id = 'hunt';
export const title = '网格寻宝';
export const icon = '🗺️';
export function init(container, api) { /* ... */ }
export function destroy() { /* ... */ }
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 否（仅用于展示/自查，shell 用 URL 的 `?g=` 而非这个字段来定位模块） | 建议与文件名一致 |
| `title` | string | 是 | 关卡中文名，显示在关卡容器顶部标题 |
| `icon` | string | 是 | 一个 emoji，显示在标题前 |
| `init(container, api)` | function | 是 | 关卡启动/重启时调用。`container` 是一个空的 `<div class="game-root">`（已清空），把整关 UI 挂进去 |
| `destroy()` | function | 否 | 关卡销毁前调用（重试/返回首页前）。清理你自己加在 `container` 之外的东西（比如 `window` 上的事件监听、`setInterval`），`container` 本身由 shell 负责清空，不用手动 `container.innerHTML = ''` |

`game.html?g=hunt` 访问即可加载对应关卡；未知/非法 `g` 参数会展示统一的错误态（吉祥物 oops + 返回首页按钮），不会白屏。

---

## 2. `api` 对象（`init(container, api)` 的第二个参数）

```ts
interface GameApi {
  complete(stars: number): void;   // 通关，1-3 星（会被 clamp 到 0-3 并四舍五入）
  fail(reason?: string): void;     // 单次失败的轻量反馈（不结束关卡，不弹结算）
  sfx: SfxModule;                  // 见 §4，和全局共用同一个 AudioContext
  mascot: MascotInstance;          // 见 §3，顶部栏那只吉祥物，可直接调用
  store: StoreModule;              // 见 §5，只读用途为主（关卡通常不用自己存档，shell 已经在 complete() 里存了）
}
```

### `api.complete(stars)`
- 调用后 shell 会：`store.setStars(gameId, stars)`（只保留历史最高分）→ 弹出统一结算弹窗（3 星逐颗弹出动画 + `sfx.star()`，首次拿满 3 星自动解锁对应徽章并在弹窗里提示）→ 提供"重试"（重新调用你的 `destroy()` + `init()`）和"返回首页"按钮。
- **关卡本身不需要、也不应该自己弹结算 UI**，调 `complete()` 就够了。
- `stars` 传 0 也能调用（会展示"再接再厉"的弱鼓励文案），但按 spec §3 六关设计通常最低是 1 星（"完成"）。

### `api.fail(reason)`
- 用于**关内的单次失误**（撞墙、抓空、选错规则等），不是"关卡结束"。
- 效果：`sfx.fail()` + 吉祥物切到 `oops` 表情说一句随机鼓励语 + `container` 短暂抖动动画（`.anim-shake`，450ms）。
- 之后**由你的关卡代码自己决定怎么处理**（比如把机器人弹回起点、清空已摆放的指令、允许重新拖积木），shell 不会重置你的 DOM。
- `reason` 只用于 `console.debug`，不展示给玩家，传什么都行（比如 `'hit-obstacle'` / `'wrong-force'`），也可以不传。

### `api.sfx` / `api.mascot` / `api.store`
直接是全局单例（和 shell 自己用的是同一份），签名见下面几节。**不要自己 `import` 一份新的 mascot 实例给顶部栏**——如果你需要额外的吉祥物（比如关卡内一个小助手气泡），可以 `import { createMascot } from '../js/mascot.js'` 自己再 `createMascot()` 一个新实例，两者互不干扰。

---

## 3. `js/mascot.js` — SPIKE Hub 吉祥物组件

```js
import { createMascot } from '../js/mascot.js';

const mascot = createMascot(containerEl, { emotion: 'idle' }); // opts 可选，默认 idle
```

返回的实例：

| 方法 | 签名 | 说明 |
|---|---|---|
| `setEmotion` | `(name: 'idle'\|'happy'\|'think'\|'cheer'\|'oops') => void` | 切换 5×5 点阵表情 + 对应的 CSS 弹跳/摇晃动画。非法值兜底为 `idle` |
| `say` | `(text: string, emotion?: string, ms?: number) => void` | 弹出气泡说话，可选同时切表情。`ms` 默认 3200（毫秒后自动隐藏），传 `0` 或负数表示**常驻不自动消失**（结算弹窗用这个）。气泡会自动测量与卡片/弹窗边界（`.modal-card` / `.brick-card`）的间距，空间不够会自动翻到吉祥物下方显示，避免顶穿容器 |
| `hideBubble` | `() => void` | 立即隐藏气泡（不等自动超时） |
| `bounce` | `() => void` | 重新触发一次当前表情的弹跳动画（用于强调，比如答对时想让吉祥物"跳一下"但不换台词） |
| `destroy` | `() => void` | 从 DOM 移除，清理定时器 |
| `.el` | `HTMLElement` | 吉祥物的根节点（`.spike-mascot-wrap`），一般用不到 |

**5×5 点阵表情语义**（呼应闪卡里的 `show matrix` 积木）：`idle` 平静小笑脸 / `happy` 大眼睛笑脸 / `think` 单眼上瞟+若有所思嘴型 / `cheer` 大睁眼+张嘴欢呼 / `oops` 叉叉眼+波浪嘴。

---

## 4. `js/sfx.js` — Web Audio 合成音效

```js
import { sfx } from '../js/sfx.js';

sfx.click();    // 轻快 UI 点击
sfx.snap();     // 积木咔哒吸附声（方波瞬态 + 噪声瞬态 + 低频收尾）
sfx.success();  // 三音上行琶音，关内小成功（比如答对一题）
sfx.fail();     // 滑稽下滑音，失败但不说教
sfx.star();     // 结算弹窗逐颗弹星星时的"叮~"声

sfx.setEnabled(false); // 静音开关（可选，比如家长角落想加个总开关）
sfx.unlock();          // 手动触发 AudioContext 解锁（一般不用管，首次 pointerdown/touchstart/keydown 会自动解锁）
```

- 全部音效是纯合成（`OscillatorNode` + 白噪声 `AudioBuffer`），没有任何外部音频文件依赖。
- 所有关卡共享同一个 `AudioContext`/`masterGain`（模块级单例），不会因为多次 `import` 或多个关卡切换而重复创建。
- iOS Safari 要求音频必须在用户手势的同步调用栈里解锁：`sfx.js` 在 `document` 上监听了首次 `pointerdown`/`touchstart`/`keydown`（`{once:true}`）自动解锁，游戏模块**不需要**手动调用 `sfx.unlock()`。

---

## 5. `js/store.js` — 存档

```js
import { store, GAME_IDS } from '../js/store.js';
// GAME_IDS === ['hunt', 'claw', 'macro', 'race', 'sort', 'bridge']
```

| 方法 | 签名 | 说明 |
|---|---|---|
| `getStars` | `(gameId: string) => 0\|1\|2\|3` | 读取某关历史最高星级；非法 gameId 返回 0 |
| `setStars` | `(gameId, stars: number) => { best, isNewBest, badgeUnlocked }` | 只保留历史最高分；`stars` 会被 clamp 到 0-3 并取整；首次让该关达到 3 星会把 `badgeUnlocked` 设为该 `gameId`（同时已经把徽章写入存档），否则为 `null`。**一般关卡不用自己调这个，shell 的 `api.complete()` 已经处理** |
| `getAllStars` | `() => Record<string, number>` | 六关的星级快照（拷贝，改了不影响真实存档） |
| `getBadges` | `() => string[]` | 已解锁的徽章 id 列表（`'hunt'` `'claw'` ... 或 `'quiz'`） |
| `hasBadge` | `(id: string) => boolean` | |
| `addBadge` | `(id: string) => boolean` | 手动解锁一个徽章（返回是否为新解锁）；闪卡测验满分解锁 `'quiz'` 徽章用的就是这个 |
| `getQuizBest` / `setQuizBest` | `() => number` / `(score: number) => { best, isNewBest }` | 闪卡测验最佳成绩，只保留历史最高分 |
| `totalStars` / `maxStars` | `() => number` | 六关星级总和 / 满分（当前是 18） |
| `resetAll` | `() => void` | 清空存档回到默认值（仅供开发调试用，UI 里没有暴露入口） |

**存档 schema**（`localStorage` key = `lsfa_save_v1`）：

```json
{
  "version": 1,
  "stars": { "hunt": 0, "claw": 0, "macro": 0, "race": 0, "sort": 0, "bridge": 0 },
  "badges": [],
  "quizBest": 0
}
```

版本号防脏数据：`version` 不匹配、JSON 解析失败、字段类型不对，一律静默回退默认值，不会让旧格式数据炸页面。`localStorage` 不可用（隐私模式等）时也会静默降级为内存态默认值，不抛错。

---

## 6. `js/blocks-ui.js` — 触屏拖拽指令条

纯 Pointer Events 实现（**不用 HTML5 drag&drop**，iPad Safari 上不可靠）。托盘（tray，模板无限供应）→ 拖到序列槽
（sequence，程序序列）。抓起放大 1.1x、放下 snap 吸附 + `sfx.snap()`、长按 550ms 删除、拖出序列容器外 = 删除、
拖动序列内已有积木 = 重新排序。所有交互自带乐高质感样式（首次调用时自动注入一份 `<style>`，复用
`design-system.css` 里的 `--lego-*` 颜色变量，不需要额外引入 CSS 文件）。

```js
import { createTray, createSequence } from '../js/blocks-ui.js';

const blockDefs = [
  { id: 'fwd',  label: 'Move Forward', color: 'blue',  icon: '⬆️' },
  { id: 'left', label: 'Turn Left',    color: 'green', icon: '⬅️' },
  { id: 'grab', label: 'Grab',         color: 'orange' },
];

const tray = createTray(trayContainerEl, blockDefs);
const seq  = createSequence(seqContainerEl, { maxSlots: 12, emptyText: '把积木拖到这里 →' });

seq.onChange((list) => {
  // list: [{ uid, type, label, color, icon }, ...]，每次增删/重排都会触发
});

// 需要时也可以：
seq.getSequence();       // 当前序列快照（数组，拷贝）
seq.setSequence(arr);    // 程序化整体替换（比如 macro 关展开宏时回填）
seq.addBlock(blockDefs[0], 0); // 程序化在下标 0 插入一个块，返回 boolean（满了会失败）
seq.removeAt(2);
seq.clear();
seq.isFull();             // maxSlots 已满？
```

### `createTray(container, blockDefs)`
- `blockDefs: Array<{ id: string, label: string, color?: string, icon?: string }>`
  - `color` 取值：`red` `yellow` `blue` `green` `purple` `orange` `cyan` `pink`（对应 `design-system.css` 的 8 个糖果色，不传默认 `blue`）
  - `icon` 是可选的一个 emoji/短文本，显示在 label 上方
- 返回 `{ el, refresh(blockDefs) }`。`refresh` 用于重新渲染托盘内容（比如某个关卡阶段要换一批可用积木）。
- 托盘里的块是"模板"——拖走一个不会消失，可以无限次拖同一种块到序列里。

### `createSequence(container, opts)`
- `opts.maxSlots?: number`（不传 = 不限长度）
- `opts.emptyText?: string`（序列为空时的占位提示文案）
- 返回值方法签名：

| 方法 | 签名 |
|---|---|
| `getSequence` | `() => Array<{uid,type,label,color,icon}>` |
| `setSequence` | `(arr) => void` |
| `addBlock` | `(blockDef, index?: number) => boolean`（`index` 默认追加到末尾；`maxSlots` 已满返回 `false` 且不插入） |
| `removeAt` | `(index: number) => void` |
| `removeByUid` | `(uid: string) => void` |
| `moveItem` | `(fromIndex, toIndex) => void` |
| `clear` | `() => void` |
| `onChange` | `(cb: (list) => void) => unsubscribeFn` |
| `isFull` | `() => boolean` |
| `destroy` | `() => void` |

**一页多个序列容器**：`createSequence` 内部会把每个实例注册到一个模块级列表里用于拖拽命中检测，天然支持一页有多个独立的序列区（比如 macro 关"定义 My Block 的序列" + "主程序序列"两个 `createSequence` 实例互不干扰，拖拽判定用指针坐标落在哪个容器范围内决定）。

**兼容性提示**：托盘上的"轻点也能加入"是一个渐进增强的兜底交互（方便小朋友手抖点不准拖拽），会把块加进**最近一次创建的** `createSequence` 实例；如果你的关卡同时有多个序列区又想让轻点精确导向某一个，建议主要依赖拖拽本身，不要依赖轻点兜底的目标选择。

---

## 7. 设计系统类名速查（`css/design-system.css`）

所有页面已经 `<link>` 了这份 CSS，游戏模块直接用类名即可，不用重新定义颜色/圆角/阴影。

### 颜色 CSS 变量
`--lego-red/yellow/blue/green/purple/orange/cyan/pink`，每个都有 `-light` / `-dark` 变体。
六关语义色：`--cat-hunt`（绿）`--cat-claw`（蓝）`--cat-macro`（粉）`--cat-race`（橙）`--cat-sort`（紫）`--cat-bridge`（青），同样有 `-light`/`-dark`。

### 卡片 `.brick-card`
```html
<div class="brick-card brick-card--blue brick-card--interactive">...</div>
```
- 修饰类（八色任选其一）：`brick-card--red|yellow|blue|green|purple|orange|cyan|pink`
- 或语义色：`brick-card--cat-hunt|cat-claw|cat-macro|cat-race|cat-sort|cat-bridge`
- `brick-card--interactive`：加悬浮/按下反馈（`:active` 位移+阴影收缩），可点击容器用这个

### 按钮 `.brick-btn`
```html
<button class="brick-btn brick-btn--blue brick-btn--lg">开始</button>
```
- 颜色：`brick-btn--yellow|blue|green|red|purple|orange|gray`
- 尺寸：默认 56px 高；`brick-btn--lg`(68px) / `brick-btn--sm`(44px)
- 圆形图标按钮：加 `brick-btn--icon`
- 禁用：加原生 `disabled` 属性或 `aria-disabled="true"`

### 星级 `.star-rating` / `.star`
```html
<div class="star-rating">
  <span class="star star--filled">★</span>
  <span class="star star--filled">★</span>
  <span class="star">★</span>
</div>
```
`star--filled` 触发弹出动画（`star-pop`），没有这个类是灰色未填充状态。

### 进度条 `.progress-track` / `.progress-fill`
```html
<div class="progress-track"><div class="progress-fill" style="width: 60%"></div></div>
```

### 徽章 `.badge-hex`
```html
<div class="badge-hex" style="--badge-color: var(--cat-hunt);">🏅</div>
<div class="badge-hex badge-hex--locked">❔</div>
```

### 弹窗 `.modal-overlay` / `.modal-card`
```html
<div class="modal-overlay"><div class="modal-card">...</div></div>
```
shell 的结算弹窗就是这套，关卡内如果需要一个"选择确认"弹窗（比如 race 关"该走哪条规则？"）可以直接复用。

### 动效工具类
`.anim-bounce`（持续弹跳）/ `.anim-shake`（一次性摇晃 450ms，`fail()` 会自动加在 `game-root` 上）/
`.anim-fade-in` / `.anim-pop-in`（弹入，星星和气泡在用）。

### 触屏规范（已经全局生效，不用自己加）
- 所有 `button` / `a` / `[role=button]` 最小 44×44px（`--tap-min`）
- 全局 `touch-action: manipulation`（禁双击缩放）；`blocks-ui.js` 的可拖拽块另外设了 `touch-action: none` 防止拖拽时页面滚动干扰
- `.no-select` 工具类：禁文本选中 + 禁长按菜单（拖拽元素、吉祥物 SVG 都在用）

---

## 8. 关卡开发建议流程

1. 复制 `games/_demo.js` 改名，先跑通 `init` → 点几下 → `complete(3)` → 结算弹窗 → 重试 的完整链路。
2. 需要拖拽指令的关卡（hunt / macro，race 的规则卡大概率也需要）接入 `blocks-ui.js`；纯参数滑杆类的关卡（claw）不需要 blocks-ui，自己用 `<input type="range">` 或自定义滑杆 + `.brick-card` 包一层即可。
3. 位移类三关（hunt/race/bridge）按 spec 用一个轻量 Canvas 走位渲染器（各关自己实现，不是全局依赖）；操作类三关（claw/macro/sort）用 DOM+CSS 动效即可，不需要 Canvas。
4. 关内每次"犯错但关卡还没结束"调 `api.fail(reason)`；关卡真正结束（无论星级高低）调 `api.complete(stars)`，星级判定逻辑按 spec §3 各关那条"星级：..."描述实现。
5. 用 `game.html?g=<你的id>` 手动过一遍：768×1024 和 1024×768 都点一遍，确认无 console error、退出重进存档保留、音效首次点击后能响应。
