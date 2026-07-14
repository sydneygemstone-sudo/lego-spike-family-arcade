/* assets/cards-data.js
 * SPIKE Prime 闪卡数据 —— 72 张，从 spike_prime_flashcards/app.js 的
 * scaledFlashcards 常量原样抽取（仅重写 image 路径 images/parts/ -> assets/images/parts/，
 * 未改动任何卡片内容/中文释义/动作描述）。字段：
 *   id / title(英文积木文案或名称) / category / chinese / details / action / isCustom
 *   category 为 motors|movement|sensors|display|events|control 时另有 blockId
 *     -> 去 assets/blocks.js 的 blockScripts[blockId] 取 scratchblocks 源码渲染 SVG
 *   category 为 hardware|elements 时另有 image(图片相对路径) 及可选 annotation
 *   category 为 concepts 时另有 diagram(短key) -> assets/concept-diagrams-v2.js 的
 *     conceptDiagramsV2 取内联 SVG（短key到长key的映射见 quiz.js/flashcards 渲染逻辑）
 * 导出为 ES module，供 flashcards.html + js/quiz.js 使用。
 */
export const CARDS_DATA = [{
            "id": "wb_m1",
            "title": "run motor [A] for [1] rotations",
            "category": "motors",
            "chinese": "控制电机 A 顺时针旋转 1 圈",
            "details": "This block will run one or more motors clockwise or anticlockwise for a specified number of rotations, seconds or degrees. The motor speed is set by the Set Speed Block. The default speed is 75%.",
            "action": "右手臂侧平举，像电机输出轴一样向前平稳地画个正圆（360°），动作要规整。",
            "isCustom": false,
            "blockId": "wb_m1"
        },
{
            "id": "wb_m2",
            "title": "run motor [A] for [90] degrees",
            "category": "motors",
            "chinese": "控制电机 A 旋转 90 度",
            "details": "This block sets one or more motors to a specified position. The motor can be set to run clockwise, anticlockwise or to take the shortest path to the specified position. The position ranges from 0 to 359 degrees.",
            "action": "右手臂从身体一侧平直抬起 90 度（直角），迅速定格，模拟关节旋转直角。",
            "isCustom": false,
            "blockId": "wb_m2"
        },
{
            "id": "wb_m3",
            "title": "run motor [A] for [1] seconds",
            "category": "motors",
            "chinese": "控制电机 A 持续旋转 1 秒",
            "details": "This block will run one or more motors clockwise or anticlockwise for a specified number of seconds. The default speed is 75%.",
            "action": "右手臂大步画圈并默数 '1秒'（即数到1001），时间一到，瞬间收回停住。",
            "isCustom": false,
            "blockId": "wb_m3"
        },
{
            "id": "wb_m4",
            "title": "start motor [A] at [50]% speed",
            "category": "motors",
            "chinese": "以 50% 速度启动电机 A",
            "details": "This block will run one or more motors clockwise or anticlockwise forever (continuous rotation). The speed is set by the Set Speed Block. The default speed is 75%.",
            "action": "坐好后用食指在桌面上匀速画圈；家长举起停止卡时立刻停下，不需要身体持续用力。",
            "isCustom": false,
            "blockId": "wb_m4"
        },
{
            "id": "wb_m5",
            "title": "stop motor [A]",
            "category": "motors",
            "chinese": "停止电机 A 旋转",
            "details": "This block stops one or more motors from running. The motor will brake so that it quickly comes to a complete stop. The motor will not hold its position once it has stopped.",
            "action": "听到家长发出指令时，大喊 'STOP!'，身体各关节瞬间定格保持不动，维持 3 秒。",
            "isCustom": false,
            "blockId": "wb_m5"
        },
{
            "id": "wb_m6",
            "title": "set motor [A] speed to [75]%",
            "category": "motors",
            "chinese": "将电机 A 默认速度设为 75%",
            "details": "This block sets the speed of one or more motors. The range is -100% to 100%. Negative values will reverse the direction of the motor. If the speed is set to 0, the motor stops. The default value is 75%.",
            "action": "将平举画圈的手臂动作频率调整至较快节拍（约每秒 1.5 圈），保持恒定速率。",
            "isCustom": false,
            "blockId": "wb_m6"
        },
{
            "id": "wb_m7",
            "title": "set motor [A] position to [0]",
            "category": "motors",
            "chinese": "重置电机 A 的绝对位置为 0",
            "details": "This block resets the motor's internal position counter to the specified value (usually 0). It does not physically move the motor -- it recalibrates the zero reference point, which is essential before any precision-position task.",
            "action": "将平举的手臂垂下贴紧大腿（归零位），深呼吸，代表电机内部的位置计数器已校准归零。",
            "isCustom": false,
            "blockId": "wb_m7"
        },
{
            "id": "wb_mv1",
            "title": "move [forward] for [10] cm",
            "category": "movement",
            "chinese": "底盘直行前进 10 厘米",
            "details": "This block moves a Driving Base forward or backward for a certain distance. The distance unit can be cm, inches, rotations, or degrees.",
            "action": "身体朝正前方向跨出小半步（约 10cm，约等于一脚掌宽度），动作平稳。",
            "isCustom": false,
            "blockId": "wb_mv1"
        },
{
            "id": "wb_mv2",
            "title": "move [forward] for [2] rotations",
            "category": "movement",
            "chinese": "底盘以轮子转动 2 圈的距离前行",
            "details": "This block moves a Driving Base forward or backward for a certain number of rotations. Essential for calibrated long-distance travels.",
            "action": "身体端正向前大跨步迈出 2 大步，代表轮子滚转了整整两圈产生的物理位移。",
            "isCustom": false,
            "blockId": "wb_mv2"
        },
{
            "id": "wb_mv3",
            "title": "move [forward] for [1] seconds",
            "category": "movement",
            "chinese": "底盘向前行驶 1 秒钟",
            "details": "This block moves a Driving Base forward or backward for a certain number of seconds. Useful when moving without physical distance limits.",
            "action": "坐着让桌面小模型匀速向前滑动 1 秒，心中默念 1001，时间到就停住模型。",
            "isCustom": false,
            "blockId": "wb_mv3"
        },
{
            "id": "wb_mv4",
            "title": "start moving steering [30]",
            "category": "movement",
            "chinese": "以 30 转向偏移度启动移动",
            "details": "This block starts moving a Driving Base forward or backward with a specified steering value. Higher steering values (e.g. +99 and -99) will make the turns sharper.",
            "action": "一边匀速向前迈步，一边将整个上半身向右偏斜，在地上踩出一条向右弯的弧形轨迹。",
            "isCustom": false,
            "blockId": "wb_mv4"
        },
{
            "id": "wb_mv5",
            "title": "stop moving",
            "category": "movement",
            "chinese": "停止底盘双轮移动",
            "details": "This block stops all movement of the Driving Base by turning off both driving motors.",
            "action": "坐好后让双手在桌面缓慢向前滑，听到停止指令就停住，观察启动与停止的区别。",
            "isCustom": false,
            "blockId": "wb_mv5"
        },
{
            "id": "wb_mv6",
            "title": "set movement speed to [50]%",
            "category": "movement",
            "chinese": "将底盘移动速度设定为 50%",
            "details": "This block sets the speed of a moving Driving Base. The range is -100% to 100%. Negative values change the direction of the movement. The default speed is 50%.",
            "action": "切换至慢动作行走状态，步伐距离一致但节奏减慢一倍，四平八稳地移动。",
            "isCustom": false,
            "blockId": "wb_mv6"
        },
{
            "id": "wb_mv7",
            "title": "set movement motors [A + B]",
            "category": "movement",
            "chinese": "配置底盘的左右轮连接端口",
            "details": "This block defines the Ports to which the two driving motors are connected. Setting correct ports is essential for synchronized movement.",
            "action": "双手食指伸出，分别指着两只脚，大喊 '左脚 A，右脚 B，底盘合体！'，随后开始行走。",
            "isCustom": false,
            "blockId": "wb_mv7"
        },
{
            "id": "wb_s1",
            "title": "wait until color is [red]?",
            "category": "sensors",
            "chinese": "等待，直到颜色传感器检测到红色",
            "details": "控制流阻塞积木。颜色传感器检测到地面卡纸反射光的波长符合红色范围后，程序才解锁继续向下执行。",
            "action": "坐着观察家长依次展示的颜色卡；看到红色时说 'RED'，再把桌面小模型向前移动一格。",
            "isCustom": false,
            "blockId": "wb_s1"
        },
{
            "id": "wb_s2",
            "title": "wait until distance < [15] cm",
            "category": "sensors",
            "chinese": "等待，直到障碍物距离小于 15cm",
            "details": "超声波传感器持续发射回波。当前方墙壁或家具距离缩短到 15cm 时，程序解锁，用于物理防撞避障处理。",
            "action": "把小模型放在桌面网格上；当它与障碍卡相距一格时停下，再把模型原地向右转。全程坐着、睁眼操作。",
            "isCustom": false,
            "blockId": "wb_s2"
        },
{
            "id": "wb_s3",
            "title": "wait until force sensor is pressed",
            "category": "sensors",
            "chinese": "等待，直到压力传感器被压下",
            "details": "触碰压力传感器前端十字塞被压回外壳时返回 True。通常装在车头做碰撞检测，或机械手做抓取检测。",
            "action": "坐好后把一只手掌当按钮；家长说 '按下' 时用另一只手轻点手掌，并说 'CLICK'。",
            "isCustom": false,
            "blockId": "wb_s3"
        },
{
            "id": "wb_s4",
            "title": "wait until yaw angle > [90]",
            "category": "sensors",
            "chinese": "等待，直到 Hub 偏航角大于 90 度",
            "details": "IMU 陀螺仪检测 Yaw 角位移。当机器人原地转过一个直角（90°）后，程序解锁。用于实现精准的直角转弯。",
            "action": "坐着把一张 Hub 纸卡在桌面原地向右转 90 度，和直角模板对齐后停下。",
            "isCustom": false,
            "blockId": "wb_s4"
        },
{
            "id": "wb_ls1",
            "title": "show matrix [smile]",
            "category": "display",
            "chinese": "在像素屏上点亮笑脸图案",
            "details": "点亮集线器正面的 5x5 红色 LED 灯阵，构成经典图样。常用于程序开始或寻宝成功后的正反馈表情。",
            "action": "用手指在空中画一个笑脸轮廓，再在纸上或点阵格里指出眼睛和嘴巴的位置。",
            "isCustom": false,
            "blockId": "wb_ls1"
        },
{
            "id": "wb_ls2",
            "title": "write [GO!]",
            "category": "display",
            "chinese": "在像素屏上滚动播放文字 'GO!'",
            "details": "将英文字符拆解，以向左滑动的跑马灯跑字形式在 5x5 的小屏幕上滚动播放，做指示提示。",
            "action": "用手指在桌面依次写出 'G-O-!'，然后用正常音量说 'GO'，不用踏步或大喊。",
            "isCustom": false,
            "blockId": "wb_ls2"
        },
{
            "id": "wb_ls3",
            "title": "play beep [C5] for [0.2] secs",
            "category": "display",
            "chinese": "控制扬声器播放 C5 音符 0.2 秒",
            "details": "控制 Hub 的小扬声器发出 C5（高音 C）的短音。常用作程序循环的计数提示音或按键确认反馈。",
            "action": "清脆且迅速地模仿电子仪器嘴里发声：'哔！'（声音要短促干净）。",
            "isCustom": false,
            "blockId": "wb_ls3"
        },
{
            "id": "wb_ls4",
            "title": "turn off light matrix",
            "category": "display",
            "chinese": "熄灭 Hub 的全部 LED 像素灯",
            "details": "关闭像素屏上的全部发光图案。可重置显示画面，或作为程序休眠结束时的黑屏指示。",
            "action": "双手遮住双眼，身体垂头放松，象征显示矩阵屏熄灭并进入节能状态。",
            "isCustom": false,
            "blockId": "wb_ls4"
        },
{
            "id": "wb_ev1",
            "title": "when program starts",
            "category": "events",
            "chinese": "当程序启动时 (帽形主积木)",
            "details": "This block plays all of the blocks that are attached to it when the program starts. The program can be started by clicking the Play button or pressing the Center Button on the Hub.",
            "action": "双手在胸前用力拍一下，大喊 '三、二、一，程序启动！'，随后开始行走第一步。",
            "isCustom": false,
            "blockId": "wb_ev1"
        },
{
            "id": "wb_ev2",
            "title": "when color detects [red]",
            "category": "events",
            "chinese": "当颜色传感器发现红色时触发",
            "details": "This block plays all of the blocks that are attached to it when the Color Sensor detects a specified color.",
            "action": "让桌面小模型沿网格移动；碰到红色事件卡时停下，并把双手放到腿上表示程序已触发。",
            "isCustom": false,
            "blockId": "wb_ev2"
        },
{
            "id": "wb_ev3",
            "title": "when distance < [15] cm",
            "category": "events",
            "chinese": "当前方障碍距离小于 15cm 时触发",
            "details": "This block plays all of the blocks that are attached to it when the Distance Sensor detects that an object is closer than or farther than the specified distance.",
            "action": "坐着推动桌面小模型；家长放下障碍卡时说 '避让'，把模型退回前一格。",
            "isCustom": false,
            "blockId": "wb_ev3"
        },
{
            "id": "wb_ev4",
            "title": "when force sensor is bumped",
            "category": "events",
            "chinese": "当触碰传感器受到撞击时触发",
            "details": "This block plays all of the blocks that are attached to it when the Force Sensor is pressed, released, or bumped.",
            "action": "让桌面小模型碰到软积木墙时停下，再把模型后移一格并原地转向；不要让身体靠墙或碰撞。",
            "isCustom": false,
            "blockId": "wb_ev4"
        },
{
            "id": "wb_ev5",
            "title": "when hub is shaken",
            "category": "events",
            "chinese": "当 Hub 智能脑受到剧烈晃动时触发",
            "details": "This block plays all of the blocks that are attached to it when the Hub detects movements like: Shaken, Tapped, or Free Fall.",
            "action": "双手握住一张纸卡轻轻左右晃两次，检测到晃动后把卡平放桌面并说 '警报'；头部保持不动。",
            "isCustom": false,
            "blockId": "wb_ev5"
        },
{
            "id": "wb_ev6",
            "title": "when timer > [5] secs",
            "category": "events",
            "chinese": "当系统计时器大于 5 秒时触发",
            "details": "内置毫秒级计时器。当计时数值超过设定阈值时触发。常用在搜救任务的时限报警，或定时巡检状态切换。",
            "action": "坐着听完 5 秒倒计时；时间到时把双手放到腿上，并用正常音量说 '超时停机'。",
            "isCustom": false,
            "blockId": "wb_ev6"
        },
{
            "id": "wb_c1",
            "title": "wait [1] seconds",
            "category": "control",
            "chinese": "程序休眠挂起 1 秒钟",
            "details": "This block pauses the programming stack for a specified number of seconds. You can specify whole numbers and decimals.",
            "action": "坐好后看着计时卡默数 '1001'，时间到就轻拍一下桌面；自然呼吸和小幅调整都没关系。",
            "isCustom": false,
            "blockId": "wb_c1"
        },
{
            "id": "wb_c2",
            "title": "repeat [5] times",
            "category": "control",
            "chinese": "循环执行内部代码 5 次",
            "details": "All of the blocks that are held inside of this block will loop for a specified number of times before allowing the programming stack to continue.",
            "action": "选定一个全身的物理小动作（如拍大腿），大声计数并连续重复做 5 次，做多做少都算报错。",
            "isCustom": false,
            "blockId": "wb_c2"
        },
{
            "id": "wb_c3",
            "title": "forever",
            "category": "control",
            "chinese": "无限死循环",
            "details": "All of the blocks that are held inside of this block will loop forever. The only way to stop the loop is to interrupt the program by clicking the Stop button or using the Stop All Block.",
            "action": "坐着让一张方向卡在左、右两个位置间循环移动；家长举起停止卡时结束循环。",
            "isCustom": false,
            "blockId": "wb_c3"
        },
{
            "id": "wb_c4",
            "title": "if [condition] then",
            "category": "control",
            "chinese": "如果条件成立，则执行夹口代码",
            "details": "This block will check whether or not the specified Boolean condition is true. If the condition is true, the blocks inside will play.",
            "action": "坐着看天气卡：如果是云，就把纸伞卡放到小模型上；否则把双手平放腿上。",
            "isCustom": false,
            "blockId": "wb_c4"
        },
{
            "id": "wb_c5",
            "title": "if [condition] then/else",
            "category": "control",
            "chinese": "如果成立执行 A，否则执行 B",
            "details": "This block will check whether or not the specified Boolean condition is true. If the condition is true, the first space blocks play; otherwise, the second space blocks play.",
            "action": "坐着看昼夜卡：天亮就举起太阳卡，天黑就举起月亮卡，用两条分支表示不同结果。",
            "isCustom": false,
            "blockId": "wb_c5"
        },
{
            "id": "hw_1",
            "title": "Smart Hub",
            "category": "hardware",
            "chinese": "智能集线器 (智能脑)",
            "details": "Spike Prime 编程套件的核心大脑。包含 6 个通用 A-F 双向输入输出端口、内置 6 轴 IMU 陀螺仪、5x5 LED 点阵屏、扬声器及蓝牙模块。",
            "action": "坐着把双手在胸前围成一个盒子，睁眼观察家长递来的颜色、距离和声音卡，模拟接收传感器信号。",
            "image": "assets/images/parts/hw_6_smart_hub.png",
            "isCustom": false
        },
{
            "id": "hw_3",
            "title": "Medium Angular Motor",
            "category": "hardware",
            "chinese": "中型角位移电机",
            "details": "体积紧凑、旋转敏捷的伺服驱动马达。转速较高，内置集成式旋转位置编码器，能够侦测微小到 1 度的轴角度偏差，控制精准。",
            "action": "平举右手臂，手掌在手腕部做快速、轻巧的旋转，动作节拍要轻快且有节奏感。",
            "image": "assets/images/parts/hw_2_medium_motor.png",
            "isCustom": false
        },
{
            "id": "hw_4",
            "title": "Large Angular Motor",
            "category": "hardware",
            "chinese": "大型角位移电机",
            "details": "动力强劲、扭矩极高的伺服驱动马达。输出轴带有更多的乐高连接孔，适合作为双轮车底盘驱动轮或大臂绞轮起吊装置。",
            "action": "坐着用双手缓慢转动一个纸盘，假装它带动较重的纸积木；只比较快慢，不做负重发力。",
            "image": "assets/images/parts/hw_1_large_motor.png",
            "isCustom": false
        },
{
            "id": "hw_5",
            "title": "Color Sensor",
            "category": "hardware",
            "chinese": "高精度颜色传感器",
            "details": "利用光学探头识别 8 种基础色块，或检测反射红外光强度和环境光强度的光学传感器。常用于设计走黑线轨迹（巡线）或按颜色分拣积木。",
            "action": "右手食指和中指并拢指向双眼，像扫描头一样在地面上缓缓平扫，嘴里模仿发出 '滴，滴，正在探测反射光强...' 的声音。",
            "image": "assets/images/parts/hw_3_color_sensor.png",
            "isCustom": false
        },
{
            "id": "hw_6",
            "title": "Distance Sensor",
            "category": "hardware",
            "chinese": "超声波距离传感器",
            "details": "利用超声波原理探测 4cm - 200cm 范围内前方障碍物距离的传感器。双孔设计酷似大眼睛，眼睛周围带可控亮度指示灯。",
            "action": "坐着睁眼观察家长把小模型放在网格不同位置，根据格数回答 '远' 或 '近'。",
            "image": "assets/images/parts/hw_4_distance_sensor.png",
            "isCustom": false
        },
{
            "id": "hw_7",
            "title": "Force Sensor",
            "category": "hardware",
            "chinese": "智能触碰压力传感器",
            "details": "可测量 0 - 10 牛顿（约 1 公斤）物理压力的力学传感器。不仅能判断按下/松开状态，还能读出精确的受力大小。",
            "action": "把一块软海绵放在桌面，轻按一下再松开，用 '碰到/没碰到' 描述触碰传感器状态，不互相施力。",
            "image": "assets/images/parts/hw_5_force_sensor.png",
            "isCustom": false
        },
{
            "id": "hw_8",
            "title": "Large Hub Rechargeable Battery",
            "category": "hardware",
            "chinese": "大号 Hub 专用充电电池",
            "details": "45610 可拆卸锂离子电池，容量 2100mAh，是 45678 套装内为智能 Hub 供电的专用电池。电池装在 Hub 内时即可通过 Micro USB 线充电。",
            "action": "在桌上摆出“电池→Hub→电机”三张卡，说出能量从哪里出发、最后让谁动起来。",
            "image": "assets/images/parts/hw_7_hub_battery.png",
            "isCustom": false
        },
{
            "id": "hw_9",
            "title": "Micro USB Cable",
            "category": "hardware",
            "chinese": "Micro USB 连接与充电线",
            "details": "45678 套装随附的 USB-A 转 Micro USB 线。它既可以为装在 Hub 内的专用电池充电，也可用于有线连接电脑与 Hub。",
            "action": "用手指沿着一条线从电脑滑到 Hub 卡，分别说出“传程序”和“给电池充电”两种用途。",
            "image": "assets/images/parts/hw_8_micro_usb.png",
            "isCustom": false
        },
{
            "id": "te_1",
            "title": "Beam",
            "category": "elements",
            "chinese": "带孔直梁 (15孔梁)",
            "details": "这是乐高 Technic（机械科技）结构件体系中最基础的骨架件——内部带有一排等距圆孔（孔距为标准 8 毫米），通过销钉固定，是承载底盘和支架的基础。",
            "action": "把一支直尺平放在桌面，沿边摆出 15 个等距标记，观察直梁怎样提供笔直的连接骨架。",
            "image": "assets/images/parts/te_1_technic_beam.png",
            "isCustom": false
        },
{
            "id": "te_2",
            "title": "Frame (5x7)",
            "category": "elements",
            "chinese": "多孔承重车架 (5x7 框架)",
            "details": "中空的矩形乐高大框架。四周以及侧向带有多孔，能抵御横向和纵向的物理形变力，是机器人车重型底盘的核心支撑，同属乐高 Technic 结构件家族。",
            "action": "在桌面用四支笔摆出矩形框架，轻轻移动其中一角，观察框架怎样保持形状；不要互相按压身体。",
            "image": "assets/images/parts/te_2_technic_frame.png",
            "isCustom": false
        },
{
            "id": "te_3",
            "title": "Axle",
            "category": "elements",
            "chinese": "十字传动轴",
            "details": "用于传递动力和转矩的十字星截面长轴。能穿过齿轮、皮带轮、轮毂把电机的输出能量传输给底盘车轮或爪爪，是 Technic 系统里的经典传动件。",
            "action": "平伸右手，五指紧密并拢，只留大拇指翘起成十字榫眼，模拟一根挺拔转动的金属十字轴，做原地拧动动作。",
            "image": "assets/images/parts/te_3_technic_axle.png",
            "isCustom": false
        },
{
            "id": "te_4",
            "title": "Connector Peg (Pin)",
            "category": "elements",
            "chinese": "连接销 (双向插销)",
            "details": "分为带摩擦力销（黑色/蓝色，插紧后起硬固定连接）和无摩擦销（灰色/淡灰，转动无阻，起活动轴点和关节连接）。",
            "action": "用左手的大拇指和食指紧紧掐扣住右腕关节，发出 '啪嗒' 扣锁声，模仿插销紧锁孔洞咬合的固定效果。",
            "image": "assets/images/parts/te_4_technic_pin.png",
            "isCustom": false
        },
{
            "id": "te_5",
            "title": "Wheel & Rubber Tire",
            "category": "elements",
            "chinese": "车轮与橡胶轮胎",
            "details": "由硬塑料轮毂与弹性橡胶轮胎组成。提供极高的物理抓地摩擦力，防止驱动底盘原地空转或发生物理位移漂移打滑。",
            "action": "坐着用两只手指在桌面同步画圆，模拟左右车轮一起转动，再推动小模型前进。",
            "image": "assets/images/parts/te_5_wheel_tire.png",
            "isCustom": false
        },
{
            "id": "te_6",
            "title": "Spur Gear",
            "category": "elements",
            "chinese": "圆柱直齿轮 (20齿齿轮)",
            "details": "最基础的啮合直齿轮。用于平行轴之间的传动传递。大齿轮啮合带动小齿轮可以减扭矩增速，小带大可以减速增力。",
            "action": "双手食指交错扣紧（模拟齿轮的互锁啮合），手腕缓慢扭动，一只手往顺时针转，强行带另一手逆时针转。",
            "image": "assets/images/parts/te_6_spur_gear.png",
            "isCustom": false
        },
{
            "id": "te_7",
            "title": "Bevel Gear",
            "category": "elements",
            "chinese": "角位伞齿轮 (锥齿轮)",
            "details": "斜齿伞齿轮。允许动力在 90 度垂直交叉轴之间传递。常用于将车身轴向电机的横转传给两侧的驱动车轮行进。",
            "action": "双手五指尖对接成 90 度折角手掌合拢，手腕在直角朝向上做咬合转动旋转动作。",
            "image": "assets/images/parts/te_7_bevel_gear.png",
            "isCustom": false
        },
{
            "id": "te_8",
            "title": "Rack Gear",
            "category": "elements",
            "chinese": "传动齿条",
            "details": "将圆形直齿轮的‘旋转动力’转化为‘平直方向往复移动直线运动’的零件。常见于自动升降栏杆或平行齿轮方向转向机构。",
            "action": "左小臂伸平，右手作齿轮在左手臂上做跨步攀移，让左臂跟随着右手的旋转做往复拉缩滑行。",
            "image": "assets/images/parts/te_8_rack_gear.png",
            "isCustom": false
        },
{
            "id": "te_9",
            "title": "Angular Beam",
            "category": "elements",
            "chinese": "折角梁",
            "details": "45678 套装内的折角 Technic 梁。它把原本沿直线排列的连接孔转向另一个方向，适合搭建机械臂、斜撑和不在同一直线上的结构。",
            "action": "把两支直尺摆成折角，再用一张小卡固定转折点，比较它和直梁能连接到的方向。",
            "image": "assets/images/parts/te_9_angular_beam.png",
            "isCustom": false
        },
{
            "id": "te_10",
            "title": "Bushing",
            "category": "elements",
            "chinese": "限位轴套",
            "details": "卡在十字轴上、限制轮子或大齿轮发生轴向左右窜位脱轴的小限位器，保证旋转轴线上各个传动点距离恒定。",
            "action": "把两个纸环套在铅笔两侧，轻推纸环观察它们怎样限制位置；不要抓住或固定他人的手臂。",
            "image": "assets/images/parts/te_10_bushing.png",
            "isCustom": false
        },
{
            "id": "te_11",
            "title": "Plate",
            "category": "elements",
            "chinese": "多孔薄板",
            "details": "厚度仅为带孔梁三分之一的带孔超薄拼装板。主要用于在拼接口起辅助搭接片（拉接）加固，或作为光敏避障传感器承载件，属于 Technic 拼装体系的常见薄型加固件。",
            "action": "把一张纸片平放在两块积木之间，观察它怎样连接两侧；不用拉扯或对抗外力。",
            "image": "assets/images/parts/te_11_technic_plate.png",
            "isCustom": false
        },
{
            "id": "te_12",
            "title": "Ball & Cup Connector",
            "category": "elements",
            "chinese": "球头与球窝连接件",
            "details": "45678 套装内的白色球头和带球窝连接件。两件扣合后可以向多个方向转动，既能做活动关节，也能把白球用作低摩擦支撑点。",
            "action": "用拳头代表球头、另一只手弯成球窝，演示它可以转向，但不会像插销那样固定成一个角度。",
            "image": "assets/images/parts/te_12_ball_socket.png",
            "isCustom": false
        },
{
            "id": "te_13",
            "title": "Axle Connector",
            "category": "elements",
            "chinese": "长轴连接套管 (连接轴套)",
            "details": "带十字贯通孔的塑料套管。用于直接把两根短传动十字轴对接长，以便动力可以远距离输送至末端执行爪关节。",
            "action": "左手食指尖与右手食指尖稳稳对在一起，大喊：'短轴连合，长轴传动！'，摆成一长线保持稳定。",
            "image": "assets/images/parts/te_13_axle_connector.png",
            "isCustom": false
        },
{
            "id": "te_14",
            "title": "Cross Block",
            "category": "elements",
            "chinese": "十字梁转换块 (交叉连接块)",
            "details": "带有互相垂直的孔和十字插槽的转换搭接件。用于在空间上连接互相交错垂直的梁、轴，增加三维车身刚性结构，是 Technic 机械组里常用的转向连接件。",
            "action": "双臂曲肘在胸前摆成一个工整垂直的十字交叉大架，模拟坚固的空间斜撑支点支护结构。",
            "image": "assets/images/parts/te_14_cross_block.png",
            "isCustom": false
        },
{
            "id": "te_15",
            "title": "Belt & Pulley",
            "category": "elements",
            "chinese": "传动滑轮与皮带",
            "details": "利用带槽滑轮和橡胶圈做长跨距柔性传动。当机械手受死磕硬卡障碍物时皮带打滑，防止电机内部热载荷烧毁马达线圈。",
            "action": "双手合抱并像双轮车链条一样沿轨迹环行滚动，大喊 '柔性保护启动！' 并假装在阻力变大时打滑空转。",
            "image": "assets/images/parts/te_15_belt_pulley.png",
            "isCustom": false
        },
{
            "id": "te_16",
            "title": "I-Frame (3x5)",
            "category": "elements",
            "chinese": "I 形框架 (3×5)",
            "details": "45678 套装内的紧凑 I 形 Technic 框架。两端各有竖向孔列，中间横梁带孔，可快速把左右两侧连接成不易扭曲的小型结构。",
            "action": "用三支笔摆成大写 I，指出两端负责固定、中间负责跨接的位置。",
            "image": "assets/images/parts/te_16_i_frame.png",
            "isCustom": false
        },
{
            "id": "te_17",
            "title": "Short Liftarm",
            "category": "elements",
            "chinese": "短梁与连杆",
            "details": "45678 套装内的短 Technic 梁。它可以作为紧凑支撑、机械连杆或两个转轴之间的摆动臂，作用取决于插销和轴装在什么孔位。",
            "action": "把前臂放松放在桌面，缓慢屈伸手肘，观察手掌沿弧线移动；不快速出拳。",
            "image": "assets/images/parts/te_17_technic_lever.png",
            "isCustom": false
        },
{
            "id": "te_18",
            "title": "Wire Clip with Cross Hole",
            "category": "elements",
            "chinese": "带十字孔导线夹",
            "details": "45678 套装内用于整理电机和传感器导线的小型夹件。十字孔把夹子固定在轴或结构上，弧形槽让导线沿规划路线通过，避免卷进齿轮。",
            "action": "用一条毛线代表电线，先让它穿过纸夹，再说明为什么不能让线碰到会转动的轮子。",
            "image": "assets/images/parts/te_18_wire_clip.png",
            "isCustom": false
        },
{
            "id": "te_19",
            "title": "Brick 2x4 with Cross Holes",
            "category": "elements",
            "chinese": "带十字轴孔的 2×4 积木",
            "details": "45678 套装的特色 2×4 积木。顶部凸点可以连接普通 LEGO 积木，侧面的十字轴孔可以连接 Technic 轴，让两种搭建系统互相衔接。",
            "action": "把一张“普通积木”卡放上方、一张“十字轴”卡放侧面，说明同一块积木怎样连接两套结构。",
            "image": "assets/images/parts/te_19_cross_hole_brick.png",
            "isCustom": false
        },
{
            "id": "te_21",
            "title": "Large Base Plate with Holes",
            "category": "elements",
            "chinese": "大号多孔底板",
            "details": "45678 套装内的大面积黄色多孔底板。上表面和四周都提供连接点，适合快速搭建稳定底座、控制台或需要大量固定位置的模型。",
            "action": "在方格纸上圈出四个角和中央区域，规划哪些孔固定 Hub、哪些孔留给电机与传感器。",
            "image": "assets/images/parts/te_21_base_plate.png",
            "isCustom": false
        },
{
            "id": "te_20",
            "title": "Gearbox",
            "category": "concepts",
            "chinese": "力气放大器",
            "legacyName": "多级减速箱",
            "details": "组合式的多极齿轮减速机箱。用高速低扭小电机带动多组小带大直齿轮，使得末端获得数十倍扭力升幅以吊起重物。",
            "action": "坐着转动一个大纸齿轮，让它缓慢带动小纸片上升；只做模型演示，不搬重物。",
            "isCustom": false,
            "diagram": "gearbox"
        },
{
            "id": "mc_1",
            "title": "Gear Ratio",
            "category": "concepts",
            "chinese": "大轮带小轮",
            "legacyName": "齿轮比 (减速增矩比)",
            "details": "主动轴齿轮齿数与被动轴齿数之比。小齿轮（如 8 齿）驱动大齿轮（如 40 齿），从动轮转速降低为五分之一，但转矩力量提升了 5 倍。",
            "action": "在桌上放一大一小两个纸齿轮，用手指缓慢拨动并数转数，比较同一时间内谁转得更多。",
            "isCustom": false,
            "diagram": "gearRatio"
        },
{
            "id": "mc_2",
            "title": "Lever System",
            "category": "concepts",
            "chinese": "跷跷板的力量",
            "legacyName": "杠杆传动系统",
            "details": "基于杠杆省力性质的传动。动力点、支点、阻力点的布局直接影响省力程度。起重机摆臂即为经典的费力省位移杠杆变体。",
            "action": "用尺子和橡皮在桌面搭一个小杠杆，轻按尺子一端，观察另一端怎样抬起。",
            "isCustom": false,
            "diagram": "lever"
        },
{
            "id": "mc_3",
            "title": "Fulcrum",
            "category": "concepts",
            "chinese": "跷跷板的中心",
            "legacyName": "杠杆旋转支点",
            "details": "机械杠杆臂绕其转动平衡的固定点。支点的空间距离分配决定了动力臂和阻力臂长，是所有杠杆传力的静平衡轴心。",
            "action": "用手指按住尺子中间作为支点，轻轻上下移动尺子两端，观察转动中心。",
            "isCustom": false,
            "diagram": "fulcrum"
        },
{
            "id": "mc_4",
            "title": "Structural Rigidity",
            "category": "concepts",
            "chinese": "三角形最稳的秘密",
            "legacyName": "机械结构刚性",
            "details": "结构体抵挡扭扯弯剪力维持原状的力。拼装骨架车体必须利用“三角形的结构平衡性质”进行斜角斜撑搭接，防车身软晃晃塌架。",
            "action": "用三根笔在桌面摆成三角形，再用四根笔摆成四边形，轻推角点比较哪一种更不容易变形。",
            "isCustom": false,
            "diagram": "rigidity"
        },
{
            "id": "mc_5",
            "title": "Friction Control",
            "category": "concepts",
            "chinese": "滑滑的和涩涩的",
            "legacyName": "主动摩擦力控制",
            "details": "两接触面间的相对滑动阻力。轮胎要粗糙增大摩擦来爬坡防空转；传动轴承销子表面则必须做光滑做无摩擦，减小热载损耗。",
            "action": "双手用力对掌搓热感受到很大的阻力，随后手心喷滑石粉状快速在空中丝滑搓过，模拟无摩擦。",
            "isCustom": false,
            "diagram": "friction"
        },
{
            "id": "mc_6",
            "title": "Center of Gravity",
            "category": "concepts",
            "chinese": "不倒翁的秘密",
            "legacyName": "重力重心中心",
            "details": "重力的平衡点。将集线器、重型电池包装在底盘底部可以压低整体重心，防止机器车在陡坡越障或高速转弯时发生侧翻摔倒。",
            "action": "用同样积木分别搭一高一低两个小塔，轻推桌面观察哪一个更稳定；不用晃动身体。",
            "isCustom": false,
            "diagram": "gravity"
        },
{
            "id": "mc_7",
            "title": "Robotic Chassis",
            "category": "concepts",
            "chinese": "机器人的脚底板",
            "legacyName": "行进机器人底盘",
            "details": "承载 Hub、电机和轮子的主体行走机构。一个优秀的底盘需要有坚硬的车梁框架拉接，保证左右驱动轮轴线精确平行无倾斜。",
            "action": "在桌面用两根长梁和两根短梁拼出矩形底盘，把空纸盒放在上面观察承载位置；不做负重支撑。",
            "isCustom": false,
            "diagram": "chassis"
        },
{
            "id": "mc_8",
            "title": "Linkage Mechanism",
            "category": "concepts",
            "chinese": "会跳舞的骨架",
            "legacyName": "关节多杆机构",
            "details": "用若干刚性杆件和旋转销点组成的运动连杆。能实现特定的轨迹控制，例如仿真步行蜘蛛腿、扫雪刷臂动作摆动。",
            "action": "用两支冰棒棍或纸条在桌面连接成活动关节，缓慢推拉一端，观察另一端的连动。",
            "isCustom": false,
            "diagram": "linkage"
        },
{
            "id": "mc_9",
            "title": "Rack and Pinion",
            "category": "concepts",
            "chinese": "转动变成直线移动",
            "legacyName": "齿轮齿条传动",
            "details": "45678 套装里的圆齿轮和 13 格齿条可以把旋转运动转换成直线往复运动。常用于推杆、升降门、滑台和抓取机构。",
            "action": "让一个纸圆沿直尺边缘滚动，观察圆周转动怎样让接触点沿直线移动。",
            "isCustom": false,
            "diagram": "rackPinion"
        },
{
            "id": "mc_10",
            "title": "Belt Drive",
            "category": "concepts",
            "chinese": "跨得远的柔性传动",
            "legacyName": "皮带与滑轮传动",
            "details": "45678 套装内的滑轮和橡胶皮带可以跨过较远距离传递旋转。改变两个滑轮大小会改变速度和力量，皮带过松则会打滑。",
            "action": "把橡皮筋套在两个瓶盖外圈，缓慢转动一个瓶盖，观察另一个瓶盖的方向和速度。",
            "isCustom": false,
            "diagram": "beltDrive"
        }];
