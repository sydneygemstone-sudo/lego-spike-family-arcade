# LEGO SPIKE Family Arcade · 设计规格书

> 2026-07-12 · Dean 已拍板。以桌面 Lego_Spike_Prime_Flashcards_And_Games_v2.pdf 为内容基准，把原 Antigravity 数字版重构成小朋友在 iPad 上打开即玩的游戏化网页。部署到 GitHub Pages（账号 sydneygemstone-sudo，新建 public 仓库 lego-spike-family-arcade）。

## 0. 已拍板决策
- 6 个关卡全部做成**屏幕上可独立完成的真游戏**（拖指令→虚拟机器人执行→星级评价），不再依赖家长/客厅空间。
- 美术：**乐高积木拟真 + 糖果色 UI**（经典红黄蓝绿、积木凸粒质感、圆角卡片）。
- 吉祥物：**SPIKE Hub 本体 + 5×5 点阵脸**（SVG，表情 idle/happy/think/cheer/oops），呼应 show matrix 积木卡。
- **进度系统**：localStorage 本地存档（无登录），每关 1-3 星，徽章墙，首页总进度条；**不锁关卡顺序**。
- **闪卡**：浏览翻卡 + 轻量小测验（看积木猜功能，答对给星）。
- **音效**：Web Audio 纯合成（无外部音频文件）：click/snap(积木咔哒)/success/fail/star。首次用户手势解锁 AudioContext。
- **家长角落**：低调入口（首页底部小按钮），内含可打印 PDF 说明与 ADHD 研究报告链接；主界面 100% 给孩子。
- 不做：账号/云同步、SPIKE App 界面 1:1 还原、构建工具链。

## 1. 技术架构
纯静态站点，浏览器原生 ES Modules，零构建、零外部运行时依赖（scratchblocks 除外，本地 vendor）。目标浏览器：iPad Safari（横竖屏 768×1024 / 1024×768 都可玩），触屏优先。

```
lego-spike-family-arcade/
├── index.html            # 首页：关卡地图(6卡) + 进度条 + 徽章墙 + 闪卡入口 + 家长角落小入口
├── game.html             # 通用关卡容器页（?g=hunt 等），加载 shell + 对应游戏模块
├── flashcards.html       # 闪卡浏览 + 小测验
├── parents.html          # 家长角落
├── css/design-system.css # 设计系统（其余页面级 css 各自独立文件）
├── js/
│   ├── shell.js    # 关卡生命周期、星级结算弹窗、重试/返回
│   ├── store.js    # 存档：{stars:{hunt:0-3,...}, badges:[], quizBest:0}
│   ├── sfx.js      # Web Audio 合成音效
│   ├── mascot.js   # Hub 点阵脸吉祥物组件
│   ├── blocks-ui.js# 触屏拖拽指令条（Pointer Events，禁用 HTML5 DnD）
│   └── quiz.js
├── games/{hunt,claw,macro,race,sort,bridge}.js
├── assets/           # 零件/硬件图、scratchblocks vendor、blocks.js（自 spike_prime_flashcards 拷贝）
└── docs/superpowers/specs/（本文件）
```

**游戏模块协议**：每关导出 `{id, title, icon, init(container, api), destroy()}`；api 注入 `complete(stars)` / `fail(reason)` / `sfx` / `mascot`。shell 统一结算、存档、导航。位移类三关（hunt/race/bridge）共享一个轻量 Canvas 走位渲染器（游戏内自带，非全局依赖）；操作类三关（claw/macro/sort）用 DOM+CSS 动效。

## 2. 设计系统要点
- 色板：LEGO 红 #D01012 / 黄 #F5C518 / 蓝 #0055BF / 绿 #237841 + 糖果高光渐变；每关继承 PDF 里的类别色系。
- 积木质感：卡片/按钮顶部一排 CSS 凸粒（radial-gradient 圆点 + 内阴影），按下有"按扁"位移反馈。
- 字体：系统圆体栈（-apple-system, "PingFang SC"…），标题特大号；全部界面文案中文为主、指令积木保留英文术语（与闪卡一致的双语教学）。
- 触屏规范：所有可点目标 ≥44px；touch-action: manipulation 禁双击缩放；拖拽用 Pointer Events + 视觉抓起放大 1.1x + snap 吸附音。

## 3. 六关游戏机制（均为：搭指令 → 按▶运行 → 动画执行 → 结算星级；失败动画要好玩不说教，吉祥物 oops 表情 + 一句鼓励）
1. **hunt 网格寻宝**：5×5 网格，随机起点/宝藏/2-3 个障碍。下方积木托盘：Move Forward / Turn Left / Turn Right / Grab。孩子拖积木排序 → 机器人按序走格。撞障碍/出界=失败重试。星级：3=最优步数，2=多≤3步，1=完成。
2. **claw 抓娃娃机**：侧视图机械臂。三个乐高风滑杆：偏航角(0-180°)/下降圈数(1-4)/夹爪力(1-10N)。目标物随机位置与脆弱度（玻璃杯需 3-5N，积木需 6-8N）。全对才抓起入篮。星级按尝试次数。
3. **macro 口诀大师**：先用 3-5 个动作积木定义一个 My Block（命名+序列），然后闯一条含重复片段的长路径关：直接摆放 My Block 卡完成，展开动画演示宏展开过程。星级按是否用宏压缩了指令数。
4. **race 避障接力**：横向卷轴跑道随机铺红/绿色块。先让孩子配置两条 if 规则（If Red→Wait 1s+Turn；If Green→Double Speed 2 steps），机器人自动跑，到色块处暂停问孩子"该执行哪条？"点选正确继续，错则打滑。星级按答对率。
5. **sort 仓库分拣**：设定 Repeat N 循环块（N=3-5 随机目标）。机器人走传送带，每到震动点屏幕晃动+音效，孩子在 1.5s 内点"卸货"，还要在心里数循环剩余次数——结束时问"还剩几次？"答对加星。
6. **bridge 精准渡桥**：窄桥俯视图。告知轮周长=1步，桥长=N 步（随机 4-8）。孩子拨数字轮选"前进 X 圈"，多走掉下去（掉落动画+水花），少走停桥中间可补拨一次。星级：一次精准=3 星。

## 4. 闪卡 + 测验
- 浏览：复用 v2 的卡片数据/scratchblocks 渲染/零件图，视觉换新设计系统，3D 翻卡动画。
- 测验：每轮 8 题，展示积木 SVG 或零件图，四选一中文功能描述；答对积分+连对奖励音；最佳成绩入存档，满分给"闪卡大师"徽章。

## 5. 徽章
每关首次 3 星各一枚（六边形乐高徽章，关卡 icon），闪卡大师 1 枚，共 7 枚；徽章墙未解锁显示剪影。

## 6. 部署与验收
- git init → GitHub public repo `lego-spike-family-arcade`（gh CLI，账号 sydneygemstone-sudo）→ Pages（main / root）。
- 验收硬标准：Browser pane 768×1024 与 1024×768 逐关真实通关；无 console error；刷新后存档保留；音效在首次点击后可用；总资源 < 5MB 首屏 < 1.5MB。
