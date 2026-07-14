// High-clarity mechanical concept diagrams for flashcards.
// Classic-script API retained: window.conceptDiagramsV2 / CommonJS export.
const conceptDiagramsV2 = (() => {
  const C = {
    ink: '#102A43', soft: '#243B53', paper: '#F7FAFC', panel: '#EAF2F8',
    coral: '#FF6B5F', teal: '#18B6A4', gold: '#FFC857', blue: '#3E7CB1',
    violet: '#7C63D5', steel: '#8DA4B8', white: '#FFFFFF', green: '#63C174',
  };
  const font = `font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif"`;
  const t = (x, y, value, size = 14, color = C.ink, anchor = 'middle', weight = 750) => `<text x="${x}" y="${y}" ${font} font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" dominant-baseline="middle">${value}</text>`;
  const open = (title, subtitle = '') => `<svg viewBox="0 0 480 360" width="480" height="360" xmlns="http://www.w3.org/2000/svg" class="concept-diagram-svg" role="img" aria-label="${title}" preserveAspectRatio="xMidYMid meet"><rect x="3" y="3" width="474" height="354" rx="22" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/><path d="M25 4H455Q477 4 477 26V70H3V26Q3 4 25 4Z" fill="${C.soft}"/>${t(24,29,'ROBOTICS LAB',11,C.gold,'start',800)}${t(24,51,title,19,C.white,'start',850)}${subtitle ? t(456,42,subtitle,11,C.panel,'end',650) : ''}`;
  const close = '</svg>';
  const card = (x, y, w, h, fill = C.panel) => `<rect x="${x + 4}" y="${y + 5}" width="${w}" height="${h}" rx="14" fill="${C.ink}" opacity=".12"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${C.ink}" stroke-width="2.5"/>`;
  const arrow = (x1, y1, x2, y2, color = C.coral, width = 4) => {
    const a = Math.atan2(y2-y1,x2-x1), h = 11;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><polygon points="${x2},${y2} ${x2-Math.cos(a-.55)*h},${y2-Math.sin(a-.55)*h} ${x2-Math.cos(a+.55)*h},${y2-Math.sin(a+.55)*h}" fill="${color}"/>`;
  };
  const gear = (cx, cy, r, fill = C.teal, teeth = 12) => {
    const pts = [];
    for (let i=0;i<teeth*2;i+=1){const a=-Math.PI/2+Math.PI*i/teeth,rr=i%2?r*.82:r;pts.push(`${(cx+Math.cos(a)*rr).toFixed(1)},${(cy+Math.sin(a)*rr).toFixed(1)}`);}
    return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${r*.46}" fill="${C.paper}" stroke="${C.ink}" stroke-width="2.4"/><circle cx="${cx}" cy="${cy}" r="${Math.max(5,r*.13)}" fill="${C.ink}"/>`;
  };
  const metric = (x, y, top, bottom, color) => `${card(x,y,104,48,C.white)}${t(x+52,y+17,top,12,C.ink)}${t(x+52,y+34,bottom,13,color,'middle',850)}`;

  const gearbox = `${open('多级减速箱','速度换扭矩')}
    ${card(24,88,432,196)}<path d="M54 110H426V258H54Z" fill="${C.soft}" stroke="${C.ink}" stroke-width="2.5"/>
    ${gear(124,184,48,C.gold,14)}${gear(201,184,30,C.teal,10)}${gear(267,184,39,C.blue,12)}${gear(342,184,25,C.coral,10)}
    ${arrow(62,184,85,184,C.gold)}${arrow(376,184,414,184,C.coral)}
    ${t(72,150,'输入',12,C.white)}${t(402,150,'输出',12,C.white)}
    ${metric(52,296,'转速','逐级降低',C.blue)}${metric(188,296,'扭矩','逐级增大',C.coral)}${metric(324,296,'方向','每级反转',C.teal)}${close}`;

  const gearRatio = `${open('齿轮比','8 齿 : 40 齿')}
    ${card(24,88,295,218)}${gear(117,196,42,C.gold,10)}${gear(235,196,84,C.teal,20)}
    ${arrow(75,123,106,112,C.coral)}${arrow(281,291,247,306,C.blue)}
    ${t(117,196,'8T',14,C.ink,'middle',900)}${t(235,196,'40T',17,C.ink,'middle',900)}
    ${t(117,270,'主动轮 · 快',13,C.ink)}${t(235,295,'从动轮 · 慢',13,C.ink)}
    ${metric(342,105,'转速','÷ 5',C.blue)}${metric(342,176,'扭矩','× 5',C.coral)}${metric(342,247,'转向','相反',C.teal)}${close}`;

  const leverSystem = `${open('杠杆系统','动力臂越长越省力')}
    ${card(24,88,432,212)}
    <path d="M55 177L424 140 427 165 58 202Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M180 197L151 259H209Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="3"/><circle cx="180" cy="197" r="7" fill="${C.ink}"/>
    <path d="M61 203v34h65v-40" fill="${C.blue}" stroke="${C.ink}" stroke-width="3"/>${t(94,221,'重物',14,C.white)}
    ${arrow(397,104,401,142,C.coral,5)}${t(396,95,'较小的力',12,C.coral)}
    <path d="M94 160H180M180 272H399" stroke="${C.steel}" stroke-width="2" stroke-dasharray="6 5"/>
    ${t(137,149,'短力臂',12,C.ink)}${t(290,281,'长动力臂',12,C.ink)}
    ${metric(60,307,'核心','力 × 力臂',C.violet)}${metric(188,307,'结果','长臂省力',C.coral)}${metric(316,307,'交换','省力但走更远',C.teal)}${close}`;

  const fulcrum = `${open('支点位置','移动支点，改变优势')}
    ${card(24,88,432,212)}
    <path d="M50 168H430V192H50Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/>
    <path d="M205 192L176 258H234Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="3"/><circle cx="205" cy="192" r="7" fill="${C.ink}"/>
    <rect x="67" y="114" width="67" height="54" rx="8" fill="${C.blue}" stroke="${C.ink}" stroke-width="3"/>${t(100,142,'负载',14,C.white)}
    ${arrow(395,116,395,164,C.coral,5)}${t(395,103,'动力',12,C.coral)}
    <path d="M100 278H205M205 278H395" stroke="${C.steel}" stroke-width="2.2" stroke-dasharray="7 5"/>
    ${t(151,292,'阻力臂',12,C.ink)}${t(299,292,'动力臂',12,C.ink)}
    ${metric(56,307,'支点靠近负载','更省力',C.teal)}${metric(188,307,'支点居中','力量均衡',C.gold)}${metric(320,307,'支点靠近动力','更费力',C.coral)}${close}`;

  const structuralRigidity = `${open('结构刚性','三角形锁住形状')}
    ${card(24,88,204,205,C.white)}${card(252,88,204,205,C.white)}
    <path d="M62 133H188V258H62Z" fill="none" stroke="${C.steel}" stroke-width="10" stroke-linejoin="round"/><path d="M69 139L183 252" stroke="${C.coral}" stroke-width="5" stroke-dasharray="8 6"/>${arrow(91,118,70,143,C.coral)}${t(126,275,'四边形会歪斜',13,C.coral)}
    <path d="M285 258L354 127 423 258Z" fill="none" stroke="${C.teal}" stroke-width="10" stroke-linejoin="round"/>${t(354,275,'三角形稳定',13,C.teal)}
    ${metric(56,307,'少一根斜撑','容易变形',C.coral)}${metric(188,307,'加入三角撑','载荷分散',C.teal)}${metric(320,307,'机器人底盘','优先三角化',C.blue)}${close}`;

  const frictionControl = `${open('摩擦控制','抓地与滑行的选择')}
    ${card(24,88,432,205)}
    <path d="M50 230H430" stroke="${C.ink}" stroke-width="5"/><path d="M55 242l18-12 18 12 18-12 18 12 18-12 18 12" fill="none" stroke="${C.coral}" stroke-width="4"/>
    ${gear(132,181,39,C.teal,14)}${gear(348,181,39,C.blue,14)}
    <path d="M96 181h72" stroke="${C.ink}" stroke-width="9" stroke-dasharray="6 5"/><circle cx="132" cy="181" r="14" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/>
    <circle cx="348" cy="181" r="39" fill="none" stroke="${C.paper}" stroke-width="4"/><path d="M315 161l66 40M315 201l66-40" stroke="${C.paper}" stroke-width="3" opacity=".7"/>
    ${arrow(86,113,178,113,C.teal)}${arrow(302,113,398,113,C.blue)}
    ${t(132,268,'深纹胎 · 高摩擦',13,C.teal)}${t(348,268,'光滑轮 · 低摩擦',13,C.blue)}
    ${metric(56,307,'高摩擦','起步与爬坡',C.teal)}${metric(188,307,'低摩擦','滑动与转向',C.blue)}${metric(320,307,'设计问题','需要哪一种？',C.coral)}${close}`;

  const centerOfGravity = `${open('重心与稳定','重心低、底盘宽更稳')}
    ${card(24,88,204,205,C.white)}${card(252,88,204,205,C.white)}
    <path d="M68 260H188L170 235H86Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="3"/><path d="M103 235V139H153V235Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/><circle cx="128" cy="198" r="12" fill="${C.coral}" stroke="${C.ink}" stroke-width="2.5"/>${t(128,198,'G',12,C.white)}<path d="M128 210v38" stroke="${C.coral}" stroke-width="3" stroke-dasharray="5 4"/>${t(128,276,'低重心 · 稳',13,C.teal)}
    <path d="M280 260H430L404 235H306Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="3"/><path d="M344 235V112H382V235Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="3" transform="rotate(12 363 235)"/><circle cx="352" cy="158" r="12" fill="${C.coral}" stroke="${C.ink}" stroke-width="2.5"/>${t(352,158,'G',12,C.white)}${arrow(404,112,425,154,C.coral)}${t(354,276,'高重心 · 易翻',13,C.coral)}
    ${metric(56,307,'降低电池','重心下降',C.teal)}${metric(188,307,'加宽轮距','支撑面变大',C.blue)}${metric(320,307,'高速转弯','最易侧翻',C.coral)}${close}`;

  const roboticChassis = `${open('机器人底盘','分层构建，易维护')}
    ${card(24,88,432,214)}
    <path d="M83 234L239 190 397 234 239 278Z" fill="${C.soft}" stroke="${C.ink}" stroke-width="3"/><path d="M103 199L239 161 376 199 239 238Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="3"/><path d="M134 158L239 128 345 158 239 190Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/><path d="M180 118L239 101 299 118 239 135Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="3"/>
    ${arrow(407,234,435,234,C.blue)}${arrow(385,198,435,182,C.teal)}${arrow(350,157,435,130,C.gold)}${arrow(302,117,435,92,C.coral)}
    ${t(439,234,'轮轴层',11,C.blue,'end')}${t(439,177,'结构层',11,C.teal,'end')}${t(439,126,'控制层',11,C.gold,'end')}${t(439,88,'传感层',11,C.coral,'end')}
    ${metric(56,307,'底层','承重与轮轴',C.blue)}${metric(188,307,'中层','Hub 与电池',C.gold)}${metric(320,307,'上层','传感器视野',C.coral)}${close}`;

  const linkageMechanism = `${open('四连杆机构','旋转变成可控轨迹')}
    ${card(24,88,432,210)}
    <path d="M84 250H397" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>
    <path d="M116 235L191 125 326 145 378 235" fill="none" stroke="${C.gold}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M191 125L326 145" stroke="${C.teal}" stroke-width="16" stroke-linecap="round"/>
    ${[[116,235],[191,125],[326,145],[378,235]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="11" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="4" fill="${C.coral}"/>`).join('')}
    <path d="M152 245A56 56 0 0 1 123 183" fill="none" stroke="${C.coral}" stroke-width="4" stroke-dasharray="7 5"/>${arrow(136,186,121,176,C.coral,3)}
    <path d="M328 110Q364 96 396 119" fill="none" stroke="${C.blue}" stroke-width="3" stroke-dasharray="6 5"/>${t(361,91,'输出轨迹',12,C.blue)}
    ${metric(56,307,'输入','曲柄旋转',C.coral)}${metric(188,307,'中间','连杆传递',C.teal)}${metric(320,307,'输出','摆动或升降',C.blue)}${close}`;

  const wormDrive = `${open('蜗轮蜗杆','大减速比 + 反向自锁')}
    ${card(24,88,432,210)}
    <path d="M58 204H299V238H58Z" fill="${C.steel}" stroke="${C.ink}" stroke-width="3"/><path d="M67 236l18-30M91 236l18-30M115 236l18-30M139 236l18-30M163 236l18-30M187 236l18-30M211 236l18-30M235 236l18-30M259 236l18-30" stroke="${C.ink}" stroke-width="3"/>
    ${gear(319,166,62,C.gold,18)}${arrow(63,171,115,191,C.teal)}${arrow(294,94,340,99,C.coral)}
    ${t(135,268,'蜗杆转很多圈',13,C.teal)}${t(319,253,'蜗轮慢慢走',13,C.coral)}
    <path d="M391 214v-13a13 13 0 0 1 26 0v13" fill="none" stroke="${C.ink}" stroke-width="4"/><rect x="382" y="214" width="44" height="38" rx="7" fill="${C.coral}" stroke="${C.ink}" stroke-width="3"/>${t(404,268,'反向难推动',12,C.ink)}
    ${metric(56,307,'优点','精密又有力',C.teal)}${metric(188,307,'代价','输出速度慢',C.blue)}${metric(320,307,'常见应用','升降与锁定',C.coral)}${close}`;

  const mechanicalClutch = `${open('机械离合器','过载时主动打滑')}
    ${card(24,88,204,207,C.white)}${card(252,88,204,207,C.white)}
    ${gear(86,177,36,C.teal,12)}${gear(157,177,36,C.gold,12)}${arrow(46,117,96,117,C.teal)}${arrow(150,117,194,117,C.coral)}
    <path d="M73 253l11 11 27-31" fill="none" stroke="${C.teal}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>${t(142,258,'正常啮合',13,C.teal)}
    ${gear(314,177,36,C.teal,12)}${gear(401,177,36,C.steel,12)}<path d="M357 126l-15 48h18l-10 49 35-62h-21l15-35Z" fill="${C.coral}" stroke="${C.ink}" stroke-width="2.5"/>
    <circle cx="400" cy="253" r="14" fill="none" stroke="${C.coral}" stroke-width="4"/><path d="M390 263l20-20" stroke="${C.coral}" stroke-width="4"/>${t(331,258,'过载打滑',13,C.coral)}
    ${metric(56,307,'正常载荷','稳定传动',C.teal)}${metric(188,307,'过载瞬间','离合器滑开',C.coral)}${metric(320,307,'保护对象','电机与齿轮',C.blue)}${close}`;

  const rackPinion = `${open('齿轮齿条','旋转变成直线移动')}
    ${card(24,88,432,210)}
    <path d="M70 224H374" stroke="${C.ink}" stroke-width="22" stroke-linecap="round"/>
    <path d="M78 205v-18M104 205v-18M130 205v-18M156 205v-18M182 205v-18M208 205v-18M234 205v-18M260 205v-18M286 205v-18M312 205v-18M338 205v-18M364 205v-18" stroke="${C.gold}" stroke-width="9"/>
    ${gear(238,142,48,C.teal,16)}
    ${arrow(185,111,224,94,C.coral)}${arrow(106,260,194,260,C.blue)}
    ${t(238,93,'齿轮旋转',13,C.coral)}${t(260,266,'齿条直线移动',13,C.blue)}
    ${metric(56,307,'输入','圆周旋转',C.teal)}${metric(188,307,'转换','齿轮咬合',C.gold)}${metric(320,307,'输出','直线往复',C.blue)}${close}`;

  const beltDrive = `${open('皮带传动','跨距离传递旋转')}
    ${card(24,88,432,210)}
    <circle cx="145" cy="181" r="56" fill="${C.paper}" stroke="${C.ink}" stroke-width="8"/>
    <circle cx="352" cy="181" r="38" fill="${C.paper}" stroke="${C.ink}" stroke-width="8"/>
    <path d="M145 125C226 111 300 126 352 143M145 237C226 251 300 236 352 219" fill="none" stroke="${C.gold}" stroke-width="13" stroke-linecap="round"/>
    <circle cx="145" cy="181" r="10" fill="${C.teal}"/><circle cx="352" cy="181" r="9" fill="${C.coral}"/>
    ${arrow(98,117,131,94,C.teal)}${arrow(333,112,370,125,C.coral)}
    ${t(145,271,'大滑轮',13,C.teal)}${t(352,271,'小滑轮',13,C.coral)}
    ${metric(56,307,'优点','跨距离传动',C.teal)}${metric(188,307,'变量','滑轮直径',C.gold)}${metric(320,307,'检查','张力与打滑',C.coral)}${close}`;

  return { gearbox, gearRatio, leverSystem, fulcrum, structuralRigidity, frictionControl, centerOfGravity, roboticChassis, linkageMechanism, rackPinion, beltDrive };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = conceptDiagramsV2;
if (typeof window !== 'undefined') window.conceptDiagramsV2 = conceptDiagramsV2;
