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
            "action": "双脚站定，单臂做匀速画圈运动，在家长拍肩膀发出停止指令前，动作决不能中止。",
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
            "action": "双手平举做雷达状，保持向前匀速行走 1 秒后（心中默念1001）双脚刹车站立。",
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
            "action": "双脚瞬间刹车，身体向前倾斜但保持脚掌牢牢扎地（锻炼肌肉的抗冲动控制力）。",
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
            "action": "闭上眼睛站立，等待家长将红色玩具卡片塞入你的手中，睁眼确认是红色后大喊 'RED!' 并继续前进。",
            "isCustom": false,
            "blockId": "wb_s1"
        },
{
            "id": "wb_s2",
            "title": "wait until distance < [15] cm",
            "category": "sensors",
            "chinese": "等待，直到障碍物距离小于 15cm",
            "details": "超声波传感器持续发射回波。当前方墙壁或家具距离缩短到 15cm 时，程序解锁，用于物理防撞避障处理。",
            "action": "双手平举闭眼向前盲走，一旦碰到家长伸出的手掌（约15厘米间隔），必须立刻像触电一样缩回并向右转。",
            "isCustom": false,
            "blockId": "wb_s2"
        },
{
            "id": "wb_s3",
            "title": "wait until force sensor is pressed",
            "category": "sensors",
            "chinese": "等待，直到压力传感器被压下",
            "details": "触碰压力传感器前端十字塞被压回外壳时返回 True。通常装在车头做碰撞检测，或机械手做抓取检测。",
            "action": "保持原地蹲姿，当家长用手轻拍你的头顶（模拟按下）时，立刻像弹簧一样蹦起来并大喊 'CLICK!'。",
            "isCustom": false,
            "blockId": "wb_s3"
        },
{
            "id": "wb_s4",
            "title": "wait until yaw angle > [90]",
            "category": "sensors",
            "chinese": "等待，直到 Hub 偏航角大于 90 度",
            "details": "IMU 陀螺仪检测 Yaw 角位移。当机器人原地转过一个直角（90°）后，程序解锁。用于实现精准的直角转弯。",
            "action": "原地向右转 90 度（直角），面朝右边侧面站定，身体保持像钢枪一样笔直。",
            "isCustom": false,
            "blockId": "wb_s4"
        },
{
            "id": "wb_ls1",
            "title": "show matrix [smile]",
            "category": "display",
            "chinese": "在像素屏上点亮笑脸图案",
            "details": "点亮集线器正面的 5x5 红色 LED 灯阵，构成经典图样。常用于程序开始或寻宝成功后的正反馈表情。",
            "action": "面向家长露出一张非常灿烂、略带夸张的笑脸，维持 3 秒钟（形成快乐脑波反馈）。",
            "isCustom": false,
            "blockId": "wb_ls1"
        },
{
            "id": "wb_ls2",
            "title": "write [GO!]",
            "category": "display",
            "chinese": "在像素屏上滚动播放文字 'GO!'",
            "details": "将英文字符拆解，以向左滑动的跑马灯跑字形式在 5x5 的小屏幕上滚动播放，做指示提示。",
            "action": "在空中大声比划写出 'G-O-!'，随后双手做大喇叭状朝前大喊一声 'GO!' 并向前猛踏一步。",
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
            "action": "在行进中一旦脚底碰到红色纸张，无论在做什么，必须立刻原地抱头蹲下（触发紧急下蹲事件）。",
            "isCustom": false,
            "blockId": "wb_ev2"
        },
{
            "id": "wb_ev3",
            "title": "when distance < [15] cm",
            "category": "events",
            "chinese": "当前方障碍距离小于 15cm 时触发",
            "details": "This block plays all of the blocks that are attached to it when the Distance Sensor detects that an object is closer than or farther than the specified distance.",
            "action": "正常直行中只要家长将手掌横在前方（模拟前方障碍事件），必须大喊 '避让！' 并朝后蹦出一步。",
            "isCustom": false,
            "blockId": "wb_ev3"
        },
{
            "id": "wb_ev4",
            "title": "when force sensor is bumped",
            "category": "events",
            "chinese": "当触碰传感器受到撞击时触发",
            "details": "This block plays all of the blocks that are attached to it when the Force Sensor is pressed, released, or bumped.",
            "action": "轻轻用背部靠一下墙面（模拟撞击触发），然后立刻先前跨出两步并侧身转弯。",
            "isCustom": false,
            "blockId": "wb_ev4"
        },
{
            "id": "wb_ev5",
            "title": "when hub is shaken",
            "category": "events",
            "chinese": "当 Hub 智能脑受到剧烈晃动时触发",
            "details": "This block plays all of the blocks that are attached to it when the Hub detects movements like: Shaken, Tapped, or Free Fall.",
            "action": "快速晃动头部和两肩（抖动肩膀），大喊 '警报！系统晃动！' 随后身体迅速缩团不动。",
            "isCustom": false,
            "blockId": "wb_ev5"
        },
{
            "id": "wb_ev6",
            "title": "when timer > [5] secs",
            "category": "events",
            "chinese": "当系统计时器大于 5 秒时触发",
            "details": "内置毫秒级计时器。当计时数值超过设定阈值时触发。常用在搜救任务的时限报警，或定时巡检状态切换。",
            "action": "家长扮演计时器说：'倒计时 5 秒... 时间到！'，孩子必须双手举过头顶大喊 '超时自动停机！' 并蹲下。",
            "isCustom": false,
            "blockId": "wb_ev6"
        },
{
            "id": "wb_c1",
            "title": "wait [1] seconds",
            "category": "control",
            "chinese": "程序休眠挂起 1 秒钟",
            "details": "This block pauses the programming stack for a specified number of seconds. You can specify whole numbers and decimals.",
            "action": "保持原地不动，在脑海里默默数完 '1001'，在此期间眼睛和身体不能有任何微小颤动。",
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
            "action": "双手叉腰做“向左转弯 -> 向右转弯”的摇摆动作，在家长拍肩膀发出“终止”信号前不能停下。",
            "isCustom": false,
            "blockId": "wb_c3"
        },
{
            "id": "wb_c4",
            "title": "if [condition] then",
            "category": "control",
            "chinese": "如果条件成立，则执行夹口代码",
            "details": "This block will check whether or not the specified Boolean condition is true. If the condition is true, the blocks inside will play.",
            "action": "家长说：'如果天上有云'，孩子回答：'假装打伞'，并在头顶用双手搭个伞顶，否则就立正站好。",
            "isCustom": false,
            "blockId": "wb_c4"
        },
{
            "id": "wb_c5",
            "title": "if [condition] then/else",
            "category": "control",
            "chinese": "如果成立执行 A，否则执行 B",
            "details": "This block will check whether or not the specified Boolean condition is true. If the condition is true, the first space blocks play; otherwise, the second space blocks play.",
            "action": "家长说：'如果现在天亮了'，孩子立刻假装伸懒腰；家长说：'如果天黑了'，孩子立刻假装闭眼睡觉。",
            "isCustom": false,
            "blockId": "wb_c5"
        },
{
            "id": "hw_1",
            "title": "Smart Hub",
            "category": "hardware",
            "chinese": "智能集线器 (智能脑)",
            "details": "Spike Prime 编程套件的核心大脑。包含 6 个通用 A-F 双向输入输出端口、内置 6 轴 IMU 陀螺仪、5x5 LED 点阵屏、扬声器及蓝牙模块。",
            "action": "双手在胸前合抱成一个大箱子，闭上眼睛，想象脑海是控制中枢，准备接收各种外界传感器信号。",
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
            "action": "双臂抱在胸前在原地深蹲，起立时发力并喊出 '输出最大转矩！'，感受腿部和全身核心肌群输出力量。",
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
            "action": "将两手微卷放在双眼外侧做望远镜状，闭上眼，通过仔细听家长的脚步声远近，判断并报出距离（'远/近'）。",
            "image": "assets/images/parts/hw_4_distance_sensor.png",
            "isCustom": false
        },
{
            "id": "hw_7",
            "title": "Force Sensor",
            "category": "hardware",
            "chinese": "智能触碰压力传感器",
            "details": "可测量 0 - 10 牛顿（约 1 公斤）物理压力的力学传感器。不仅能判断按下/松开状态，还能读出精确的受力大小。",
            "action": "将单手手掌顶在家长手心里，家长推孩子手心慢慢施力，孩子负责反馈阻力对抗，直到家长叫停。",
            "image": "assets/images/parts/hw_5_force_sensor.png",
            "isCustom": false
        },
{
            "id": "hw_8",
            "title": "Built-in Gyro Sensor",
            "category": "hardware",
            "chinese": "内置陀螺仪",
            "details": "集成在 Hub 智能脑内部的 6 轴惯性传感器（IMU）。可侦测车体当前的左右翻滚角、上下俯仰角和水平偏航角（Yaw）。",
            "action": "单脚踩地站立维持平衡，双手向身体两侧伸展成飞机翼，平稳地把身体向左、向右缓慢倾斜（飞机滑行姿态）。",
            "image": "assets/images/parts/hw_6_smart_hub.png",
            "isCustom": false,
            "annotation": "gyro"
        },
{
            "id": "hw_9",
            "title": "Bluetooth Wireless",
            "category": "hardware",
            "chinese": "低功耗蓝牙无线模块",
            "details": "Hub 智能脑内部集成的无线通信芯片。支持代码无线快速下发，或将机器人数据回传电脑端进行实时的可视化监控。",
            "action": "双手食指按在太阳穴上向两旁做电波发散状抖动，发出 '嘟嘟嘟，正在无线搜索配对...' 声，与家长对击掌连接。",
            "image": "assets/images/parts/hw_6_smart_hub.png",
            "isCustom": false,
            "annotation": "bluetooth"
        },
{
            "id": "hw_10",
            "title": "5x5 LED Matrix",
            "category": "hardware",
            "chinese": "5x5 LED 像素屏幕",
            "details": "集线器正面排布的 25 颗红色 LED 灯阵。可以通过代码点亮特定方格构成微笑、箭头等标志，用于信息反馈展示。",
            "action": "用手在脸上捏出一个巨大的鬼脸或闭起一只眼，象征集线器屏幕图案显示更新，定格 2 秒。",
            "image": "assets/images/parts/hw_6_smart_hub.png",
            "isCustom": false,
            "annotation": "ledmatrix"
        },
{
            "id": "te_1",
            "title": "Beam",
            "category": "elements",
            "chinese": "带孔直梁 (15孔梁)",
            "details": "这是乐高 Technic（机械科技）结构件体系中最基础的骨架件——内部带有一排等距圆孔（孔距为标准 8 毫米），通过销钉固定，是承载底盘和支架的基础。",
            "action": "双腿并拢，身体绷紧，两臂紧紧贴于裤缝两侧，硬朗得像一根 15 孔的机械长梁，保持 3 秒不许动摇。",
            "image": "assets/images/parts/te_1_technic_beam.png",
            "isCustom": false
        },
{
            "id": "te_2",
            "title": "Frame (5x7)",
            "category": "elements",
            "chinese": "多孔承重车架 (5x7 框架)",
            "details": "中空的矩形乐高大框架。四周以及侧向带有多孔，能抵御横向和纵向的物理形变力，是机器人车重型底盘的核心支撑，同属乐高 Technic 结构件家族。",
            "action": "双肘弯曲并在胸前撑开，用双手合围成一个大矩形，手臂肌肉紧绷，抵御家长从侧面的按压。",
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
            "action": "身体微蹲下起，双腿模拟轮子飞速转动，脚下交替踱步并在房间地板上缓缓前移，脚踩地声音要稳重。",
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
            "title": "Worm Gear",
            "category": "elements",
            "chinese": "蜗杆 (螺旋齿轮)",
            "details": "螺旋蜗杆。传动比高，转速极大变慢但扭力呈几十倍爆发增幅。带有极强的自锁机制，外力从齿轮侧无法撬动反推蜗杆。",
            "action": "右手作拧开水龙头螺纹拧动旋转，左手在极慢速度下起重移动，体会传动比的缓慢物理机械力量增幅。",
            "image": "assets/images/parts/te_9_worm_gear.png",
            "isCustom": false,
            "note": "※ 通用乐高件，SPIKE 套装外（45678 套装内未包含此件）"
        },
{
            "id": "te_10",
            "title": "Bushing",
            "category": "elements",
            "chinese": "限位轴套",
            "details": "卡在十字轴上、限制轮子或大齿轮发生轴向左右窜位脱轴的小限位器，保证旋转轴线上各个传动点距离恒定。",
            "action": "用双手牢牢合扣箍紧家长的手臂，防止家长手臂前后推移，大喊：'卡位限位！轴向锁死！'。",
            "image": "assets/images/parts/te_10_bushing.png",
            "isCustom": false
        },
{
            "id": "te_11",
            "title": "Plate",
            "category": "elements",
            "chinese": "多孔薄板",
            "details": "厚度仅为带孔梁三分之一的带孔超薄拼装板。主要用于在拼接口起辅助搭接片（拉接）加固，或作为光敏避障传感器承载件，属于 Technic 拼装体系的常见薄型加固件。",
            "action": "双手掌面合掌贴平，像一片坚韧无比的强加固物理拉片，承受来自面外的物理撕扯弯矩力。",
            "image": "assets/images/parts/te_11_technic_plate.png",
            "isCustom": false
        },
{
            "id": "te_12",
            "title": "Ball Caster Wheel",
            "category": "elements",
            "chinese": "万向球轮 (随动轮)",
            "details": "底盘尾部的万向随动轮。内部光滑的塑料圆球可沿任意方向自由滚动，协助前方驱动双轮实现精准转向，几乎不产生额外摩擦阻力。",
            "action": "单脚踩实地面，另一只脚悬空用脚踝做 360 度随意旋转，脚底像有一颗抹油的滑珠在光滑纸面滑行。",
            "image": "assets/images/parts/te_12_steel_castor.png",
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
            "title": "Turntable",
            "category": "elements",
            "chinese": "回转转盘",
            "details": "大型内外圈式圆盘滚珠轴承大齿圈。内圈固定车架，外圈可以整体无摩擦 360 度打转，适合吊车回转车身或大旋转盘。",
            "action": "以脚后跟为承重回转支点，双臂平展在空中滑翔，身体在原地匀速流畅旋转整整 360 度后立定。",
            "image": "assets/images/parts/te_16_turntable.png",
            "isCustom": false,
            "note": "※ 通用乐高件，SPIKE 套装外（45678 套装内未包含此件）"
        },
{
            "id": "te_17",
            "title": "Lever",
            "category": "elements",
            "chinese": "连杆摆动臂 (起伏摆臂)",
            "details": "多孔机械短杆件。充当人体手臂骨骼功能，通过两端销点传递轴向推力，通常作为机械步进腿或连杆转换臂，亦是 Technic 结构件的一员。",
            "action": "曲肘将前臂做有力地一推一拉（拳击出拳推缩），肘关节充当销心摆点，体验动作幅度的放大。",
            "image": "assets/images/parts/te_17_technic_lever.png",
            "isCustom": false
        },
{
            "id": "te_18",
            "title": "Universal Joint",
            "category": "elements",
            "chinese": "传动万向节",
            "details": "支持在“存在一定折夹角、不在同轴线”的两根转动轴线间实现不间断的动力扭矩转速传递，常用于四驱车避震关节传动。",
            "action": "两手十指关节交织反转在直角夹角角度上摇晃扭转，手指仍然模拟齿轴一样滚动传能。",
            "image": "assets/images/parts/te_18_universal_joint.png",
            "isCustom": false,
            "note": "※ 通用乐高件，SPIKE 套装外（45678 套装内未包含此件）"
        },
{
            "id": "te_19",
            "title": "Clutch Gear",
            "category": "elements",
            "chinese": "安全滑牙离合齿轮",
            "details": "乐高专用超载保护齿轮。当齿面输出力矩过大（超过安全阈值）时，其内部齿圈自打滑并发出咔嗒异响，保护减速马达齿轮不崩断。",
            "action": "双手攥紧拳头，突然发出 '咔哒哒，打滑！' 口哨声，双拳松开自由转动，代表动力载荷脱开保护。",
            "image": "assets/images/parts/te_19_clutch_gear.png",
            "isCustom": false,
            "note": "※ 通用乐高件，SPIKE 套装外（45678 套装内未包含此件）"
        },
{
            "id": "te_20",
            "title": "Gearbox",
            "category": "concepts",
            "chinese": "多级减速箱",
            "details": "组合式的多极齿轮减速机箱。用高速低扭小电机带动多组小带大直齿轮，使得末端获得数十倍扭力升幅以吊起重物。",
            "action": "双手在胸前合抱，深深扎马步大吼 '扭力五倍重增！'，随后像千斤起重机一样以极慢极有分量的动作搬物。",
            "isCustom": false,
            "diagram": "gearbox"
        },
{
            "id": "mc_1",
            "title": "Gear Ratio",
            "category": "concepts",
            "chinese": "齿轮比 (减速增矩比)",
            "details": "主动轴齿轮齿数与被动轴齿数之比。小齿轮（如 8 齿）驱动大齿轮（如 40 齿），从动轮转速降低为五分之一，但转矩力量提升了 5 倍。",
            "action": "家长扮演 40 齿大齿轮在 5 秒转 1 圈，孩子扮演 8 齿小齿轮必须配合快速旋转 5 圈，体会减速与扭矩变化。",
            "isCustom": false,
            "diagram": "gearRatio"
        },
{
            "id": "mc_2",
            "title": "Lever System",
            "category": "concepts",
            "chinese": "杠杆传动系统",
            "details": "基于杠杆省力性质的传动。动力点、支点、阻力点的布局直接影响省力程度。起重机摆臂即为经典的费力省位移杠杆变体。",
            "action": "让家长在胸前托住你的小臂（支点），下压手腕（动力），大臂自然上扬（阻力），感受物理杠杆位移的放大。",
            "isCustom": false,
            "diagram": "lever"
        },
{
            "id": "mc_3",
            "title": "Fulcrum",
            "category": "concepts",
            "chinese": "杠杆旋转支点",
            "details": "机械杠杆臂绕其转动平衡的固定点。支点的空间距离分配决定了动力臂和阻力臂长，是所有杠杆传力的静平衡轴心。",
            "action": "把脚后跟着地做脚尖悬空上下摆动，脚后跟充当身体受力的转动支点，体会支点作用力。",
            "isCustom": false,
            "diagram": "fulcrum"
        },
{
            "id": "mc_4",
            "title": "Structural Rigidity",
            "category": "concepts",
            "chinese": "机械结构刚性",
            "details": "结构体抵挡扭扯弯剪力维持原状的力。拼装骨架车体必须利用“三角形的结构平衡性质”进行斜角斜撑搭接，防车身软晃晃塌架。",
            "action": "把双脚分开踩宽（三角形），双手抱肘，大喊 '高强度刚性结构！'，任凭家长推动你，依然纹丝不动。",
            "isCustom": false,
            "diagram": "rigidity"
        },
{
            "id": "mc_5",
            "title": "Friction Control",
            "category": "concepts",
            "chinese": "主动摩擦力控制",
            "details": "两接触面间的相对滑动阻力。轮胎要粗糙增大摩擦来爬坡防空转；传动轴承销子表面则必须做光滑做无摩擦，减小热载损耗。",
            "action": "双手用力对掌搓热感受到很大的阻力，随后手心喷滑石粉状快速在空中丝滑搓过，模拟无摩擦。",
            "isCustom": false,
            "diagram": "friction"
        },
{
            "id": "mc_6",
            "title": "Center of Gravity",
            "category": "concepts",
            "chinese": "重力重心中心",
            "details": "重力的平衡点。将集线器、重型电池包装在底盘底部可以压低整体重心，防止机器车在陡坡越障或高速转弯时发生侧翻摔倒。",
            "action": "微蹲低姿态站立，左右大幅度摇晃上身但双脚吸住地不倒，体会重心压低给整个系统带来的强稳定性。",
            "isCustom": false,
            "diagram": "gravity"
        },
{
            "id": "mc_7",
            "title": "Robotic Chassis",
            "category": "concepts",
            "chinese": "行进机器人底盘",
            "details": "承载 Hub、电机和轮子的主体行走机构。一个优秀的底盘需要有坚硬的车梁框架拉接，保证左右驱动轮轴线精确平行无倾斜。",
            "action": "趴在地板上做标准平板支撑动作（背上放一书包），模拟一块坚固平整承载所有动力载荷的底盘。",
            "isCustom": false,
            "diagram": "chassis"
        },
{
            "id": "mc_8",
            "title": "Linkage Mechanism",
            "category": "concepts",
            "chinese": "关节多杆机构",
            "details": "用若干刚性杆件和旋转销点组成的运动连杆。能实现特定的轨迹控制，例如仿真步行蜘蛛腿、扫雪刷臂动作摆动。",
            "action": "与家长手牵手站好，胳膊肘伸平做同步的推缩连动摆动，模拟活塞曲轴机械连杆连传结构。",
            "isCustom": false,
            "diagram": "linkage"
        },
{
            "id": "mc_9",
            "title": "Worm Drive",
            "category": "concepts",
            "chinese": "蜗轮蜗杆减速比",
            "details": "蜗杆转 1 圈带动蜗轮只移动 1 齿。能获得极其惊人的单极减速自锁机制，外力撬不动齿轮轴，防吊臂断电自然脱落。",
            "action": "双手做蜗牛前行极慢动作迈出步伐，一旦家长大喊 '断电！'，身形悬空保持石定，展现重力防坠落自锁。",
            "isCustom": false,
            "diagram": "wormDrive"
        },
{
            "id": "mc_10",
            "title": "Mechanical Clutch",
            "category": "concepts",
            "chinese": "滑摩式安全联轴器",
            "details": "当输出转力力矩超过预设过载阀值（如爪部死死卡死）时通过物理滑磨断开能量传输的机构。保护马达内部组件不受损烧掉。",
            "action": "两手掌用力贴合摩擦，突然大喊 '滑磨！' 并双手滑移弹开，代表离合脱离，解除堵转超载负荷。",
            "isCustom": false,
            "diagram": "clutch"
        }];
