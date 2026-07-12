/* ==========================================================================
   blocks.js
   scratchblocks 源码映射表 —— 每张"积木类"闪卡（MOTORS / MOVEMENT / SENSORS
   的 wait-until / DISPLAY / EVENTS / CONTROL）对应一段 scratchblocks 语法。

   Key = 闪卡 scaledFlashcards 数组里的 "id" 字段（app.js 第 61 行起）。
   Value = scratchblocks 源码字符串，渲染出的文字/参数必须与卡片英文 caption
   完全一致（数字用圆形槽 (n)，下拉选项用 [x v]，自由文本用 [text]）。

   类别颜色覆盖（对应 SPIKE Prime 积木类别配色）：
     MOTORS          → :: motion   (蓝)
     MOVEMENT        → :: custom   (粉红，Scratch3 自定义块色)
     DISPLAY         → :: looks    (紫)
     EVENTS          → :: events hat (黄，帽子形)
     CONTROL         → :: control  (橙)
     SENSORS(wait until) → 本体保留原生 control(橙)，条件布尔用 :: sensing (青)

   本文件不修改 index.html / app.js / style.css，只被 preview.html 引用。
   ========================================================================== */

const blockScripts = {

    // ---------------------------------------------------------------------
    // MOTORS · motion (蓝) —— 7 张
    // ---------------------------------------------------------------------
    "wb_m1": "run motor [A v] for (1) rotations:: motion",
    "wb_m2": "run motor [A v] for (90) degrees:: motion",
    "wb_m3": "run motor [A v] for (1) seconds:: motion",
    "wb_m4": "start motor [A v] at (50)% speed:: motion",
    "wb_m5": "stop motor [A v]:: motion",
    "wb_m6": "set motor [A v] speed to (75)%:: motion",
    "wb_m7": "set motor [A v] position to (0):: motion",

    // ---------------------------------------------------------------------
    // MOVEMENT · custom (粉红，Scratch3 自定义块色) —— 7 张
    // ---------------------------------------------------------------------
    "wb_mv1": "move [forward v] for (10) cm:: custom",
    "wb_mv2": "move [forward v] for (2) rotations:: custom",
    "wb_mv3": "move [forward v] for (1) seconds:: custom",
    "wb_mv4": "start moving steering (30):: custom",
    "wb_mv5": "stop moving:: custom",
    "wb_mv6": "set movement speed to (50)%:: custom",
    "wb_mv7": "set movement motors [A + B v]:: custom",

    // ---------------------------------------------------------------------
    // SENSORS · wait until —— 本体 control(橙，原生 wait until 语义)
    //           条件布尔 :: sensing (青) —— 4 张
    // ---------------------------------------------------------------------
    "wb_s1": "wait until <color is [red v]?:: sensing>",
    "wb_s2": "wait until <distance \\< (15) cm:: sensing>",
    "wb_s3": "wait until <force sensor is pressed:: sensing>",
    "wb_s4": "wait until <yaw angle \\> (90):: sensing>",

    // ---------------------------------------------------------------------
    // DISPLAY · looks (紫) —— 4 张
    // ---------------------------------------------------------------------
    "wb_ls1": "show matrix [smile v]:: looks",
    "wb_ls2": "write [GO!]:: looks",
    "wb_ls3": "play beep [C5 v] for (0.2) secs:: looks",
    "wb_ls4": "turn off light matrix:: looks",

    // ---------------------------------------------------------------------
    // EVENTS · events hat (黄，帽子形) —— 6 张
    // ---------------------------------------------------------------------
    "wb_ev1": "when program starts:: events hat",
    "wb_ev2": "when color detects [red v]:: events hat",
    "wb_ev3": "when distance \\< (15) cm:: events hat",
    "wb_ev4": "when force sensor is bumped:: events hat",
    "wb_ev5": "when hub is shaken:: events hat",
    "wb_ev6": "when timer \\> (5) secs:: events hat",

    // ---------------------------------------------------------------------
    // CONTROL · control (橙) —— 5 张
    // C 型块（repeat/forever/if/if-else）带完整 C 型结构，内部用省略号占位
    // ---------------------------------------------------------------------
    "wb_c1": "wait (1) seconds:: control",

    "wb_c2": `repeat (5) times {
    ...
}:: control`,

    "wb_c3": `forever:: control
    ...
end`,

    "wb_c4": `if <condition:: grey> then:: control
    ...
end`,

    "wb_c5": `if <condition:: grey> then:: control
    ...
else
    ...
end`,

};

if (typeof module !== "undefined" && module.exports) {
    module.exports = blockScripts;
}

// --- 本项目(lego-spike-family-arcade)追加 ---
// 这是经典 <script>（非 module）加载的顶层 const，不会自动挂到 window 上
// （只有 var / 函数声明才会），而 assets/card-visual.js 是 ES module，
// 读不到经典脚本的词法作用域绑定，必须显式挂到 window 才能跨脚本访问。
// 只改了本项目里的这份拷贝，源目录 spike_prime_flashcards/blocks.js 未改动。
if (typeof window !== "undefined") {
    window.blockScripts = blockScripts;
}
