(() => {
  'use strict';

  // ===== 規則 =====
  const MULTS = [2, 4, 6, 8, 10];          // 倍率段數
  const MULT_COST = 2;        // 倍率孔每升一段要扣幾顆
  const litFor = level => MULTS.length - level;   // 倍率越高，亮的燈越少：2 倍亮 5 顆 … 10 倍亮 1 顆
  const COIN_BALLS = 20;      // 投一次幣換幾顆彈珠
  const SLOT_COUNT = 11;      // 底部落點數，每一排一顆 LED



  // ===== 彈珠台大冒險：怪物 =====
  const ADV_BALLS = 30;       // 每場冒險有幾顆彈珠
  const REFILL_MULT = 2;      // 補珠燈：中了得到 投珠數 × 2 顆彈珠
  // 12×12 像素圖：'.' 透明，其他字元對應 pal 的顏色
  const MONSTERS = [
    {
      bg: 'forest',
      name: { zh: '史萊姆', en: 'Slime' }, hp: 20,
      pal: { K: '#0b1a0b', G: '#3ccf4e', L: '#a6f7ae', D: '#1f7a2b', W: '#ffffff', R: '#ff5d73' },
      map: [
        '............',
        '....KKKK....',
        '..KKGGGGKK..',
        '.KGGLLGGGGK.',
        '.KGLLGGGGGK.',
        'KGGGGGGGGGGK',
        'KGGWKGGWKGGK',
        'KGGWKGGWKGGK',
        'KGGGGGGGGGGK',
        'KGGGDDDDGGGK',
        '.KGGGGGGGGK.',
        '..KKKKKKKK..',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '............',
        '....KKKK....',
        '..KKGGGGKK..',
        '.KGGLLGGGGK.',
        '.KGLLGGGGGK.',
        'KGGGGGGGGGGK',
        'KGGGKGGGKGGK',
        'KGGKGKGKGKGK',
        'KGKKKKKKKKGK',
        'KGGKRRRRKGGK',
        '.KGGKKKKGGK.',
        '..KKKKKKKK..',
      ],
    },
    {
      bg: 'cave',
      name: { zh: '蝙蝠', en: 'Bat' }, hp: 28,
      pal: { K: '#120818', P: '#8a4fd8', W: '#ffe66b', R: '#ff4d6d' },
      map: [
        '............',
        'K..........K',
        'KK..K..K..KK',
        'KPK.KKKK.KPK',
        'KPPKPPPPKPPK',
        'KPPPPWPWPPPK',
        '.KPPPPPPPPK.',
        '..KPPRRPPK..',
        '...KPPPPK...',
        '....K..K....',
        '............',
        '............',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '............',
        'K..........K',
        'KK..K..K..KK',
        'KPK.KKKK.KPK',
        'KPPKPPPPKPPK',
        'KPPPKPKPKPPK',
        '.KPPPPPPPPK.',
        '..KPKKKKPK..',
        '...KRRRRK...',
        '....KKKK....',
        '............',
        '............',
      ],
    },
    {
      bg: 'graveyard',
      name: { zh: '幽靈', en: 'Ghost' }, hp: 36,
      pal: { K: '#1a1a2e', W: '#e8f0ff', R: '#ff6b81' },
      map: [
        '....KKKK....',
        '..KKWWWWKK..',
        '.KWWWWWWWWK.',
        '.KWWWWWWWWK.',
        'KWWKKWWKKWWK',
        'KWWKKWWKKWWK',
        'KWWWWWWWWWWK',
        'KWWWWKKWWWWK',
        'KWWWWWWWWWWK',
        'KWWWWWWWWWWK',
        'KWKWWKKWWKWK',
        '.K.KK..KK.K.',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '....KKKK....',
        '..KKWWWWKK..',
        '.KWWWWWWWWK.',
        '.KWWWWWWWWK.',
        'KWWWKWWWKWWK',
        'KWWKWKWKWKWK',
        'KWWWWWWWWWWK',
        'KWWWKKKKWWWK',
        'KWWWKRRKWWWK',
        'KWWWWKKWWWWK',
        'KWKWWKKWWKWK',
        '.K.KK..KK.K.',
      ],
    },
    {
      bg: 'crypt',
      name: { zh: '骷髏', en: 'Skeleton' }, hp: 44,
      pal: { K: '#111111', W: '#f2efe6', R: '#e0465a' },
      map: [
        '...KKKKKK...',
        '..KWWWWWWK..',
        '.KWWWWWWWWK.',
        '.KWKKWWKKWK.',
        '.KWKKWWKKWK.',
        '.KWWWKKWWWK.',
        '..KWWWWWWK..',
        '...KWKWKWK..',
        '...KKKKKKK..',
        '....KWWK....',
        '...KWKKWK...',
        '...K....K...',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '...KKKKKK...',
        '..KWWWWWWK..',
        '.KWWWWWWWWK.',
        '.KWWWWWWWWK.',
        '.KWKKWWKKWK.',
        '.KWWWKKWWWK.',
        '..KWWWWWWK..',
        '...KWKWKWK..',
        '...KRRRRRK..',
        '...KWKWKWK..',
        '....KKKKK...',
        '....KWWK....',
      ],
    },
    {
      bg: 'hell',
      name: { zh: '小惡龍', en: 'Baby Dragon' }, hp: 55,
      pal: { K: '#2a0505', R: '#e6392f', W: '#ffffff', Y: '#ffd166', T: '#ff8fa3' },
      map: [
        '..K......K..',
        '.KRK....KRK.',
        '.KRRKKKKRRK.',
        'KRRRRRRRRRRK',
        'KRWKRRRRWKRK',
        'KRRRRRRRRRRK',
        '.KRRYYYYRRK.',
        '..KRYKKYRK..',
        '.KRRRRRRRRK.',
        'KRKRRRRRRKRK',
        'K..KRK.KRK.K',
        '...KK...KK..',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '..K......K..',
        '.KRK....KRK.',
        '.KRRKKKKRRK.',
        'KRRRRRRRRRRK',
        'KRKKRRRRKKRK',
        'KRRRRRRRRRRK',
        '.KRKKKKKKRK.',
        '..KKWTTWKK..',
        '.KRRKKKKRRK.',
        'KRKRRRRRRKRK',
        'K..KRK.KRK.K',
        '...KK...KK..',
      ],
    },
  ];

  // ===== 語言（中文 / English） =====
  const I18N = {
    zh: {
      title: '柑仔店彈珠台',
      selectHint: '燈在閃：可投倍率孔加倍，按藍色按鈕定燈',
      insertCoin: '請投幣換彈珠',
      lockedAlready: '燈已經定了，往投珠孔投珠再發射',
      roundNotOver: '這一局還沒結束',
      locked: '定燈！{mult} 倍，亮 {lit} 顆。往投珠孔投珠，再拉彈簧發射',
      noBalls: '彈珠不夠了，請投幣',
      betBeforeLock: '燈還在閃，先按藍色按鈕定燈才能投珠',
      inPlay: '鋼珠已發射，請等這一局結束',
      betInfo: '投珠 {bet} 顆 × {mult} 倍，中了得 {win} 顆',
      betInfoAdv: '投珠 {bet} 顆 × {mult} 倍，中了造成 {win} 點傷害',
      multLocked: '燈已經定了，這一局不能再投倍率孔',
      multMax: '倍率最高 {max} 倍',
      multShort: '彈珠不足 {cost} 顆，不能提升倍率',
      multUp: '{mult} 倍！定燈後亮 {lit} 顆，按藍色按鈕定燈',
      winPop: '+{win} 顆',
      winMsg: '中了！{mult} 倍 × {bet} 顆 = {win} 顆',
      losePop: '銘謝惠顧',
      loseMsg: '沒落在亮燈的那一排，銘謝惠顧',
      rolledBack: '力道不夠，鋼珠滾回來了，再按一次發射',
      lockFirst: '先按藍色按鈕定燈，再投珠發射',
      betFirst: '請先投珠再按發射鈕',
      fired: '發射！',
      moreBalls: '另有 {n} 顆',
      hintMult: '加倍', hintLock: '定燈', hintBet: '投珠', hintPull: '拉桿發射',
      cvBet: '投珠', cvBalls: '顆', cvLit: '亮{n}燈', cvMultHole: '倍率孔', cvBetHole: '投珠孔', cvCoinSlot: '投幣口',
      cvLock: '定燈', cvPull: '拉桿', cvChute: '出珠口', cvDisplay: '持珠',
      coin: '投幣', overlayText: '投一枚硬幣，換 20 顆彈珠！', overlayCoin: '投幣開始', howTo: '玩法說明',
      sign: '柑仔店<br><span>彈珠台</span>', stCredits: '持有彈珠', stBet: '投珠數', stMult: '倍率',
      stWin: '上局得珠', stBestWin: '最高分', stBest: '最多持珠', power: '力道',
      btnMult: '投倍率孔', btnLock: '定燈', btnBet: '投珠孔', btnFire: '按住拉彈簧',
      langBtn: 'English', langShort: 'EN', close: '關閉',
      modeShort: '冒險', modeShortAdv: '經典', modeLong: '切換到大冒險', modeLongAdv: '切換到經典模式',
      advTitle: '彈珠台大冒險', advStart: '開始冒險',
      advIntro: '打倒怪物！每場有 {n} 顆彈珠，鋼珠落進亮燈的那一排就能造成「倍率 × 投珠數」點傷害。',
      advWinTitle: '勝利！', advWinText: '打倒了{name}，還剩 {left} 顆彈珠。', advAgain: '挑戰下一隻',
      advLoseTitle: '落敗…', advLoseText: '彈珠用完了，{name}還剩 {hp} HP。', advRetry: '再試一次',
      advAppear: '野生的{name}出現了！HP {hp}',
      hitMsg: '命中！{mult} 倍 × {bet} 顆，造成 {dmg} 點傷害',
      lockedAdv: '定燈！亮 {lit} 顆紅燈，綠燈是補珠燈。往投珠孔投珠，再拉彈簧發射',
      refillMsg: '命中補珠燈！補回 {n} 顆彈珠', refillPop: '+{n} 顆',
      advMissMsg: '沒打中！{name}在嘲笑你', advWinMsg: '打倒了{name}！', advLoseMsg: '彈珠用完了…',
      dmgPop: '-{d} HP', advNoCoin: '大冒險模式不能投幣',
      advPressStart: '按「開始冒險」', laugh: '嘻嘻嘻',
      stWinAdv: '上次傷害', stBestWinAdv: '勝場', stBestAdv: '敗場',
    },
    en: {
      title: 'Candy Pinball',
      selectHint: 'Raise the multiplier, then press blue to lock',
      insertCoin: 'Insert a coin to get balls',
      lockedAlready: 'Already locked. Bet, then shoot',
      roundNotOver: 'This round isn\'t over yet',
      locked: 'Locked! ×{mult}, {lit} lit. Bet, then pull to shoot',
      noBalls: 'Out of balls: insert a coin',
      betBeforeLock: 'Press blue to lock before betting',
      inPlay: 'Ball in play. Wait for the result',
      betInfo: 'Bet {bet} × {mult}: win pays {win}',
      betInfoAdv: 'Bet {bet} × {mult}: a hit deals {win} damage',
      multLocked: 'Locked. No more multiplier this round',
      multMax: 'Max multiplier is ×{max}',
      multShort: 'Need {cost} balls to raise the multiplier',
      multUp: '×{mult}! {lit} lit after locking',
      winPop: '+{win}',
      winMsg: 'Win! ×{mult} × {bet} = {win} balls',
      losePop: 'No luck',
      loseMsg: 'Missed the lit lanes. No luck',
      rolledBack: 'Too weak, ball rolled back. Shoot again',
      lockFirst: 'Press blue to lock first',
      betFirst: 'Bet first, then shoot',
      fired: 'Fire!',
      moreBalls: '+{n} more',
      hintMult: 'Multiply', hintLock: 'Lock', hintBet: 'Bet', hintPull: 'Pull to shoot',
      cvBet: 'BET', cvBalls: 'balls', cvLit: '{n} lit', cvMultHole: 'MULTIPLY', cvBetHole: 'BET', cvCoinSlot: 'COIN',
      cvLock: 'LOCK', cvPull: 'PULL', cvChute: 'PAYOUT', cvDisplay: 'BALLS',
      coin: 'Coin', overlayText: 'Insert a coin for 20 balls!', overlayCoin: 'Insert coin', howTo: 'How to play',
      sign: 'Candy<br><span>Pinball</span>', stCredits: 'Balls', stBet: 'Bet', stMult: 'Multiplier',
      stWin: 'Last win', stBestWin: 'High score', stBest: 'Most balls', power: 'Power',
      btnMult: 'Multiply', btnLock: 'Lock', btnBet: 'Bet', btnFire: 'Hold to pull',
      langBtn: '中文', langShort: '中', close: 'Close',
      modeShort: 'Quest', modeShortAdv: 'Classic', modeLong: 'Pinball Quest', modeLongAdv: 'Classic mode',
      advTitle: 'Pinball Quest', advStart: 'Start',
      advIntro: 'Defeat the monster! You get {n} balls. Land in a lit lane to deal multiplier × bet damage.',
      advWinTitle: 'Victory!', advWinText: 'You defeated the {name} with {left} balls left.', advAgain: 'Next monster',
      advLoseTitle: 'Defeated…', advLoseText: 'Out of balls. The {name} still has {hp} HP.', advRetry: 'Try again',
      advAppear: 'A wild {name} appears! HP {hp}',
      hitMsg: 'Hit! ×{mult} × {bet} = {dmg} damage',
      lockedAdv: 'Locked! {lit} red lights. Green = refill. Bet, then shoot',
      refillMsg: 'Refill light! +{n} balls', refillPop: '+{n} balls',
      advMissMsg: 'Missed! The {name} laughs', advWinMsg: 'Defeated the {name}!', advLoseMsg: 'Out of balls…',
      dmgPop: '-{d} HP', advNoCoin: 'No coins in Quest mode',
      advPressStart: 'Press Start', laugh: 'hehehe',
      stWinAdv: 'Last hit', stBestWinAdv: 'Wins', stBestAdv: 'Losses',
    },
  };
  let lang = 'zh';
  try {
    const saved = localStorage.getItem('candy-pinball-lang');
    lang = saved === 'en' || saved === 'zh' ? saved : (/^zh/i.test(navigator.language || '') ? 'zh' : 'en');
  } catch (e) { lang = /^zh/i.test(navigator.language || '') ? 'zh' : 'en'; }
  function t(key, vars = {}) {
    const s = I18N[lang][key] ?? I18N.zh[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
  }

  // ===== 機台尺寸（邏輯座標，畫布會依螢幕縮放） =====
  const W = 520, H = 1054;
  const BALL_R = 7;
  const PIN_R = 2.6;
  const CAP_R = 5;                  // 橘色膠頭釘
  const GRAVITY = 620;
  const B = { left: 40, right: 480, top: 190, bottom: 720 };
  const LANE_X = 456;               // 發射軌道內牆
  const ARC = { x: 392, y: 278, r: 88 };      // 右上角發射彎軌（外圈）
  const INNER_R = 64;                          // 彎軌內圈
  const INNER_END = -70 * Math.PI / 180;
  const CORNER = { x: 95, y: 245, r: 55 };    // 左上圓角
  const SLOT_TOP = 590, SLOT_FLOOR = 690;
  const SLOT_W = (LANE_X - B.left) / SLOT_COUNT;
  const LED_Y = 658;
  const SHOOTER_FLOOR = 730;        // 彈簧頭放鬆時的位置
  const SPRING_TRAVEL = 60;         // 彈簧最多拉下多少
  const LANE_BOTTOM = 834;          // 發射軌道一路延伸到下方
  const PLUNGER_X = (LANE_X + B.right) / 2;
  const MAX_SPEED = 1500;
  const SUBSTEPS = 8;

  const HOLES = {
    bet: { x: 462, y: 980, r: 19 },     // 拉桿下方，白邊黑心的圓孔（按住可連續投）
    mult: { x: 222, y: 876, r: 17 },    // 定燈按鈕旁，白邊黑心的圓孔
  };
  const COIN_SLOT = { x: 448, y: 108 };   // 上方金屬板的投幣口（點了也能投幣）
  const KNOB_Y = 854;               // 前面板上的拉桿把手
  const CHUTE = { x: 52, y: 914 };
  // 托盤：從斜上方看的不鏽鋼盤，y 方向是盤子的深度（往前傾）
  const TRAY = { left: 34, right: 400, back: 934, front: 1034 };   // 右邊讓給投珠孔
  const TRAY_TILT = 260;            // 盤子往前傾，珠子會滾到前緣
  const TRAY_CAP = 190;             // 托盤裝得下的顆數；再多就從托盤滿出來、掉到機台外面（仍然計數）
  const DISPLAY = { x: 272, y: 856, w: 110, h: 46 };
  const DISPLAY_MAX = 9999;         // 持珠顯示器四位數的上限
  // 出珠口（右緣 78）到持珠顯示器（左緣 272）之間：定燈按鈕底板（寬 60）、倍率孔（直徑 34）平均間隔約 33
  const BUTTON = { x: 141, y: 876, r: 20 };   // 藍色定燈按鈕

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function distToSeg(px, py, s) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (py - s.ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (s.ax + dx * t), py - (s.ay + dy * t));
  }

  // ===== 牆面 =====
  const walls = [];
  function addWall(ax, ay, bx, by, rad = 1) { walls.push({ ax, ay, bx, by, rad }); }
  function addArc(cx, cy, r, a0, a1, segs, rad = 1) {
    for (let i = 0; i < segs; i++) {
      const t0 = a0 + (a1 - a0) * i / segs, t1 = a0 + (a1 - a0) * (i + 1) / segs;
      addWall(cx + r * Math.cos(t0), cy + r * Math.sin(t0), cx + r * Math.cos(t1), cy + r * Math.sin(t1), rad);
    }
  }
  addArc(CORNER.x, CORNER.y, CORNER.r, Math.PI, Math.PI * 1.5, 16);
  addWall(CORNER.x, B.top, ARC.x, B.top);
  addArc(ARC.x, ARC.y, ARC.r, -Math.PI / 2, 0, 24);
  addWall(B.left, CORNER.y, B.left, B.bottom);
  addWall(B.right, ARC.y, B.right, LANE_BOTTOM);
  addWall(LANE_X, ARC.y, LANE_X, LANE_BOTTOM, 2);
  addArc(ARC.x, ARC.y, INNER_R, 0, INNER_END, 14, 2);
  const dividers = [];
  for (let i = 1; i < SLOT_COUNT; i++) {
    const x = B.left + i * SLOT_W;
    dividers.push(x);
    addWall(x, SLOT_TOP, x, SLOT_FLOOR, 3);
  }
  addWall(B.left, SLOT_FLOOR, LANE_X, SLOT_FLOOR);

  // ===== 釘子 =====
  const pins = [];
  const caps = [];
  function pinFits(x, y) {
    if (walls.some(s => distToSeg(x, y, s) < 18 + s.rad)) return false;
    // 發射彎軌附近留空
    if (y < ARC.y && x > ARC.x - 70 && Math.hypot(x - ARC.x, y - ARC.y) > INNER_R - 14) return false;
    return true;
  }
  for (let k = 0; k < 7; k++) {
    const x = 72 + k * 54, y = 238;
    if (pinFits(x, y)) caps.push({ x, y });
  }
  for (let row = 0, y = 270; y <= 562; row++, y += 28) {
    for (let x = 58 + (row % 2 ? 18 : 0); x <= 438; x += 36) {
      if (!pinFits(x, y)) continue;
      if (caps.some(c => Math.hypot(c.x - x, c.y - y) < 24)) continue;
      pins.push({ x, y });
    }
  }

  // ===== 音效 =====
  const Sound = {
    ctx: null,
    muted: false,
    lastClink: 0,
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(freq, dur, type = 'sine', vol = 0.2, delay = 0, slideTo = 0) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    noise(dur, vol) {
      if (!this.ctx || this.muted) return;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.buffer = buf;
      src.connect(gain).connect(this.ctx.destination);
      src.start();
    },
    clink(speed) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastClink < 0.025 || speed < 40) return;
      this.lastClink = now;
      this.tone(2000 + Math.random() * 1400, 0.07, 'triangle', Math.min(0.12, speed / 5000));
    },
    clunk() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastClunk || 0) < 0.035) return;
      this.lastClunk = now;
      this.tone(520, 0.08, 'square', 0.06);
      this.tone(260, 0.12, 'triangle', 0.1, 0.05);
    },
    spring(power) {
      this.noise(0.12, 0.15 + power * 0.2);
      this.tone(220, 0.25, 'sawtooth', 0.06, 0, 70);
    },
    win() {
      [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => this.tone(f, 0.18, 'square', 0.06, i * 0.09));
    },
    lose() { this.tone(330, 0.35, 'triangle', 0.12, 0, 160); },
    coin() {
      this.tone(1320, 0.08, 'square', 0.08);
      this.tone(1980, 0.35, 'square', 0.08, 0.08);
    },
    thud() { this.tone(90, 0.2, 'sine', 0.25, 0, 50); },
    snicker() {
      // 嘻嘻嘻：三聲短促的高音
      [1180, 1320, 1120].forEach((f, i) => this.tone(f, 0.07, 'square', 0.045, i * 0.09, f * 0.8));
    },
    hit() {
      this.noise(0.15, 0.3);
      this.tone(420, 0.25, 'square', 0.08, 0, 70);
    },
    floor() {
      // 掉到地上：一聲悶響加一點金屬聲
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastFloor || 0) < 0.05) return;
      this.lastFloor = now;
      this.tone(160 + Math.random() * 60, 0.12, 'triangle', 0.08, 0, 90);
      this.tone(2600 + Math.random() * 900, 0.05, 'triangle', 0.04, 0.01);
    },
    error() { this.tone(150, 0.15, 'square', 0.06); },
    lock() {
      this.tone(880, 0.1, 'square', 0.08);
      this.tone(1320, 0.3, 'square', 0.08, 0.1);
    },
  };

  // ===== 遊戲狀態 =====
  const state = {
    credits: 0,           // 手上（托盤裡）的彈珠
    best: 0,              // 最多持珠（存在瀏覽器）
    bestWin: 0,           // 最高分：單局最高得珠（存在瀏覽器）
    lastWin: null,
    power: 0,
    charging: false,
    floorY: SHOOTER_FLOOR,
    payoutQueue: 0,
    payoutTimer: 0,
    started: false,
    buttonT: 0,           // 藍色按鈕按下的動畫
  };
  const round = {
    phase: 'select',      // select（燈在閃，可投倍率孔）| bet（燈已定，可投珠）| flying | win | lose
    bet: 0,
    level: 0,             // 目前倍率段 MULTS[level]
    lit: new Set(),
    landSlot: -1,
    resetT: 0,
    flashT: 0,
    refill: -1,           // 大冒險：補珠燈在哪一排（-1 = 沒有）
  };
  let ball = null;        // 機台內那顆發射用的鋼珠
  const tray = [];        // 托盤裡看得到的彈珠
  const tweens = [];      // 投珠時飛進洞裡的動畫
  const popups = [];

  function loadRecord(key) {
    try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) { return 0; /* 無痕模式 */ }
  }
  function saveRecord(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) { /* 無痕模式 */ }
  }
  state.best = loadRecord('candy-pinball-best');
  state.bestWin = loadRecord('candy-pinball-best-win');


  // ===== 遊戲模式：經典 / 彈珠台大冒險 =====
  let mode = 'classic';
  try { if (localStorage.getItem('candy-pinball-mode') === 'adv') mode = 'adv'; } catch (e) { /* 無痕模式 */ }
  // 兩個模式各自保留自己的持珠，切換時存起來、切回來再拿出來
  const store = {
    classic: { credits: 0, lastWin: null, started: false },
    adv: { credits: 0, lastWin: null, started: false },
  };
  const adv = {
    status: 'intro',      // intro | playing | won | lost
    monster: null,
    hp: 0,
    maxHp: 0,
    hitT: 0,              // 被打中時閃白、晃動
    laughT: 0,            // 沒打中時怪物竊笑一下（落敗時一直笑）
    laughSoundT: 0,       // 落敗後多久竊笑一聲
    dieT: 0,              // 被打倒時閃爍消失
    endT: 0,              // 結束後多久跳出結果
    pops: [],             // 螢幕上的傷害數字
    wins: loadRecord('candy-pinball-adv-wins'),
    losses: loadRecord('candy-pinball-adv-losses'),
  };
  const advActive = () => mode === 'adv' && adv.status === 'playing';
  // 大冒險還沒開始或已經結束時，機台不能操作
  const advLocked = () => mode === 'adv' && adv.status !== 'playing';
  const monsterName = () => adv.monster ? adv.monster.name[lang] : '';

  function startAdventure() {
    Sound.init();
    Sound.coin();
    const m = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
    adv.monster = m;
    adv.maxHp = adv.hp = Math.max(1, Math.round(m.hp * (0.9 + Math.random() * 0.2)));
    adv.status = 'playing';
    adv.hitT = adv.laughT = adv.laughSoundT = adv.dieT = adv.endT = 0;
    adv.pops.length = 0;
    // 每場重新發彈珠
    state.credits = 0;
    state.lastWin = null;
    state.payoutQueue = ADV_BALLS;
    state.started = true;
    tray.length = 0;
    spills.length = 0;
    newRound();
    refreshOverlay();
    say('advAppear', { name: monsterName(), hp: adv.hp });
  }

  function damageMonster(dmg, px) {
    adv.hp = Math.max(0, adv.hp - dmg);
    adv.hitT = 0.5;
    adv.pops.push({ text: '-' + dmg, t: 0 });
    popups.push({ x: px, y: SLOT_TOP - 16, text: t('dmgPop', { d: dmg }), t: 0, color: '#ff6b6b' });
    say('hitMsg', { mult: mult(), bet: round.bet, dmg });
    Sound.hit();
    if (adv.hp === 0) {
      adv.status = 'won';
      adv.dieT = 1.4;
      adv.endT = 1.8;
      adv.wins++;
      saveRecord('candy-pinball-adv-wins', adv.wins);
      say('advWinMsg', { name: monsterName() });
      setTimeout(() => Sound.win(), 350);
    }
  }

  // 每局開始時檢查：彈珠用完、怪物還活著就落敗
  function checkAdvDefeat() {
    if (!advActive() || round.phase !== 'select') return;
    if (state.credits > 0 || state.payoutQueue > 0) return;
    adv.status = 'lost';
    adv.endT = 0.8;
    adv.losses++;
    saveRecord('candy-pinball-adv-losses', adv.losses);
    say('advLoseMsg');
    adv.laughSoundT = 0.7;      // 落敗音效之後竊笑一聲
    Sound.lose();
  }

  // 把托盤裡的珠子直接排好（切換模式時用，不用重新掉一次）
  function rebuildTray() {
    tray.length = 0;
    const n = Math.min(state.credits, TRAY_CAP);
    const perRow = Math.floor((TRAY.right - TRAY.left - BALL_R * 2) / (BALL_R * 2));
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow), col = i % perRow;
      tray.push({
        x: Math.min(TRAY.right - BALL_R, TRAY.left + BALL_R + col * BALL_R * 2 + (row % 2 ? BALL_R : 0)),
        y: TRAY.front - BALL_R - row * BALL_R * 1.75,
        z: 0, vz: 0, vx: 0, vy: 0,
      });
    }
  }

  function switchMode() {
    Sound.init();
    stopBetHold();
    state.charging = false;
    state.power = 0;
    state.floorY = SHOOTER_FLOOR;
    // 這一局還沒結算就切換：投下去的珠和倍率孔的珠都退回
    if (round.phase === 'select' || round.phase === 'bet' || round.phase === 'flying') {
      state.credits += round.bet + round.level * MULT_COST;
    }
    state.credits += state.payoutQueue;
    state.payoutQueue = 0;
    store[mode] = { credits: state.credits, lastWin: state.lastWin, started: state.started };
    mode = mode === 'classic' ? 'adv' : 'classic';
    try { localStorage.setItem('candy-pinball-mode', mode); } catch (e) { /* 無痕模式 */ }
    ({ credits: state.credits, lastWin: state.lastWin, started: state.started } = store[mode]);
    tweens.length = 0;
    spills.length = 0;
    popups.length = 0;
    rebuildTray();
    ball = null;
    newRound();
    applyMode();
  }

  const mult = () => MULTS[round.level];

  function ballAtShooter() {
    return ball && ball.x > LANE_X && ball.y > SHOOTER_FLOOR - 30;
  }

  function rollLit(n) {
    const slots = [...Array(SLOT_COUNT).keys()];
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    round.lit = new Set(slots.slice(0, n));
  }

  function newRound() {
    round.phase = 'select';
    round.bet = 0;
    round.level = 0;
    round.landSlot = -1;
    round.refill = -1;
    rollLit(litFor(0));
    if (!ball) ball = { x: PLUNGER_X, y: SHOOTER_FLOOR - BALL_R - 1, vx: 0, vy: 0, still: 0 };
    if (mode === 'adv') {
      if (adv.status === 'playing') {
        say(state.credits > 0 || state.payoutQueue > 0 ? 'selectHint' : 'advLoseMsg');
        checkAdvDefeat();
      } else if (adv.status === 'intro') say('advPressStart');
    } else {
      say(state.credits > 0 || state.payoutQueue > 0 ? 'selectHint' : 'insertCoin');
    }
  }

  // 藍色按鈕：停止閃燈，決定這一局的落獎點
  function lockLights() {
    Sound.init();
    if (advLocked()) return;
    state.buttonT = 0.15;
    if (round.phase !== 'select') {
      say(round.phase === 'bet' ? 'lockedAlready' : 'roundNotOver');
      Sound.error();
      return;
    }
    rollLit(litFor(round.level));
    round.phase = 'bet';
    Sound.lock();
    if (mode === 'adv') {
      // 定燈後，在沒亮燈的排裡隨機挑一排當補珠燈
      const free = [];
      for (let i = 0; i < SLOT_COUNT; i++) if (!round.lit.has(i)) free.push(i);
      round.refill = free[Math.floor(Math.random() * free.length)];
      say('lockedAdv', { lit: round.lit.size });
    } else {
      say('locked', { mult: mult(), lit: round.lit.size });
    }
  }

  let lastMsg = ['insertCoin', {}];
  let msgText = '', msgT = 0;
  function say(key, vars = {}) {
    lastMsg = [key, vars];
    const text = t(key, vars);
    for (const el of msgEls) el.textContent = text;
    if (text !== msgText) { msgText = text; msgT = performance.now(); }
  }

  function takeBall(hole, delay = 0) {
    state.credits--;
    let from = { x: CHUTE.x, y: TRAY.back + 10 };
    if (tray.length > state.credits) {
      let idx = 0;
      for (let i = 1; i < tray.length; i++) if (tray[i].y < tray[idx].y) idx = i;
      const t = tray.splice(idx, 1)[0];
      from = { x: t.x, y: t.y - t.z };
    }
    tweens.push({ x0: from.x, y0: from.y, x1: hole.x, y1: hole.y, t: -delay / 0.45, dur: 0.45 });
  }

  function hasCredits() {
    if (state.credits > 0) return true;
    say('noBalls');
    Sound.error();
    return false;
  }

  function addBet() {
    Sound.init();
    if (advLocked()) return false;
    if (round.phase === 'select') { say('betBeforeLock'); Sound.error(); return false; }
    if (round.phase !== 'bet') { say('inPlay'); Sound.error(); return false; }
    if (!hasCredits()) return false;
    takeBall(HOLES.bet);
    round.bet++;
    Sound.clunk();
    say(mode === 'adv' ? 'betInfoAdv' : 'betInfo', { bet: round.bet, mult: mult(), win: round.bet * mult() });
    return true;
  }

  // 按住投珠孔：先投 1 顆，停一下後開始自動投，按越久投越快（約 4 顆/秒 → 25 顆/秒）
  const BET_HOLD_DELAY = 0.35;
  const betHold = { active: false, t: 0, next: 0 };
  function startBetHold() {
    if (betHold.active) return;
    if (!addBet()) return;
    betHold.active = true;
    betHold.t = 0;
    betHold.next = BET_HOLD_DELAY;
  }
  function stopBetHold() { betHold.active = false; }
  function updateBetHold(dt) {
    if (!betHold.active) return;
    betHold.t += dt;
    betHold.next -= dt;
    while (betHold.active && betHold.next <= 0) {
      if (!addBet()) { stopBetHold(); break; }
      const held = Math.max(0, betHold.t - BET_HOLD_DELAY);
      betHold.next += Math.max(0.04, 0.25 * Math.pow(0.45, held));
    }
  }

  function addMult() {
    Sound.init();
    if (advLocked()) return;
    if (round.phase !== 'select') { say('multLocked'); Sound.error(); return; }
    if (round.level >= MULTS.length - 1) { say('multMax', { max: MULTS[MULTS.length - 1] }); Sound.error(); return; }
    if (state.credits < MULT_COST) {
      say('multShort', { cost: MULT_COST });
      Sound.error();
      return;
    }
    for (let i = 0; i < MULT_COST; i++) takeBall(HOLES.mult, i * 0.12);
    Sound.clunk();
    round.level++;
    say('multUp', { mult: mult(), lit: litFor(round.level) });
  }

  function insertCoin() {
    Sound.init();
    if (mode === 'adv') { say('advNoCoin'); Sound.error(); return; }
    Sound.coin();
    state.payoutQueue += COIN_BALLS;
    state.started = true;
    overlay.classList.add('hidden');
    if (round.phase === 'select') say('selectHint');
  }

  function land(slot) {
    ball = null;
    round.landSlot = slot;
    round.resetT = 1.6;
    const px = B.left + (slot + 0.5) * SLOT_W;
    if (round.lit.has(slot)) {
      const win = mult() * round.bet;
      round.phase = 'win';
      if (mode === 'adv') {
        state.lastWin = win;
        damageMonster(win, px);
        return;
      }
      state.payoutQueue += win;
      state.lastWin = win;
      if (win > state.bestWin) {
        state.bestWin = win;
        saveRecord('candy-pinball-best-win', win);
      }
      popups.push({ x: px, y: SLOT_TOP - 16, text: t('winPop', { win }), t: 0, color: '#ffd166' });
      say('winMsg', { mult: mult(), bet: round.bet, win });
      Sound.win();
    } else if (mode === 'adv' && slot === round.refill) {
      // 補珠燈：不造成傷害，改成補回 投珠數 × 2 顆彈珠
      const n = round.bet * REFILL_MULT;
      round.phase = 'win';
      state.payoutQueue += n;
      popups.push({ x: px, y: SLOT_TOP - 16, text: t('refillPop', { n }), t: 0, color: '#4ade80' });
      say('refillMsg', { n });
      Sound.coin();
      Sound.win();
    } else {
      round.phase = 'lose';
      state.lastWin = 0;
      popups.push({ x: px, y: SLOT_TOP - 16, text: t('losePop'), t: 0, color: '#cbd5e1' });
      if (mode === 'adv') {
        adv.laughT = 1.3;
        setTimeout(() => Sound.snicker(), 250);
        say('advMissMsg', { name: monsterName() });
      } else {
        say('loseMsg');
      }
      Sound.lose();
    }
  }

  // ===== 物理 =====
  function collideCircle(b, px, py, rad, e, jitter = true) {
    const dx = b.x - px, dy = b.y - py;
    const min = BALL_R + rad;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min || d2 === 0) return 0;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    b.x = px + nx * min;
    b.y = py + ny * min;
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return 0;
    b.vx -= (1 + e) * vn * nx;
    b.vy -= (1 + e) * vn * ny;
    if (jitter) {
      // 一點點隨機，避免鋼珠剛好平衡在釘子頂端
      const j = (Math.random() - 0.5) * 8;
      b.vx += -ny * j;
      b.vy += nx * j;
    }
    return -vn;
  }

  function collideWall(b, s) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const t = Math.max(0, Math.min(1, ((b.x - s.ax) * dx + (b.y - s.ay) * dy) / (dx * dx + dy * dy)));
    return collideCircle(b, s.ax + dx * t, s.ay + dy * t, s.rad, 0.4);
  }

  function stepBall(h) {
    const b = ball;
    b.vy += GRAVITY * h;
    const damp = 1 - 0.1 * h;
    b.vx *= damp; b.vy *= damp;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp; }
    b.x += b.vx * h;
    b.y += b.vy * h;

    let impact = 0;
    for (const p of pins) {
      if (Math.abs(p.x - b.x) > 10 || Math.abs(p.y - b.y) > 10) continue;
      impact = Math.max(impact, collideCircle(b, p.x, p.y, PIN_R, 0.5));
    }
    for (const c of caps) {
      if (Math.abs(c.x - b.x) > 13 || Math.abs(c.y - b.y) > 13) continue;
      impact = Math.max(impact, collideCircle(b, c.x, c.y, CAP_R, 0.6));
    }
    for (const s of walls) impact = Math.max(impact, collideWall(b, s));
    // 發射軌道底部（彈簧頭）
    if (b.x > LANE_X && b.y + BALL_R > state.floorY) {
      b.y = state.floorY - BALL_R;
      if (b.vy > 0) {
        if (b.vy > 150) {
          Sound.thud();
          if (round.phase === 'flying') say('rolledBack');
        }
        b.vy = -b.vy * 0.15;
      }
      b.vx = 0;
    }
    if (impact) Sound.clink(impact);

    if (b.x < LANE_X && b.y > SLOT_FLOOR - BALL_R - 2.5) {
      land(Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor((b.x - B.left) / SLOT_W))));
    } else if (b.y > H || b.x < 0 || b.x > W) {
      ball = null;
      newRound();
    }
  }

  function stepTray(h) {
    const minX = TRAY.left + BALL_R, maxX = TRAY.right - BALL_R;
    const minY = TRAY.back + BALL_R, maxY = TRAY.front - BALL_R;
    for (const t of tray) {
      // 從出珠口掉下來的高度
      if (t.z > 0 || t.vz !== 0) {
        t.vz -= 1400 * h;
        t.z += t.vz * h;
        if (t.z <= 0) {
          t.z = 0;
          if (t.vz < -120) { Sound.clink(-t.vz); t.vz = -t.vz * 0.3; } else t.vz = 0;
        }
      }
      t.vy += TRAY_TILT * h;
      const f = 1 - 0.9 * h;
      t.vx *= f; t.vy *= f;
      t.x += t.vx * h;
      t.y += t.vy * h;
      if (t.x < minX) { t.x = minX; t.vx = Math.abs(t.vx) * 0.3; }
      if (t.x > maxX) { t.x = maxX; t.vx = -Math.abs(t.vx) * 0.3; }
      if (t.y < minY) { t.y = minY; t.vy = Math.abs(t.vy) * 0.3; }
      if (t.y > maxY) {
        if (t.vy > 120) Sound.clink(t.vy);
        t.y = maxY;
        t.vy = -t.vy * 0.25;
      }
    }
    for (let i = 0; i < tray.length; i++) {
      const a = tray[i];
      if (a.z > 4) continue;
      for (let j = i + 1; j < tray.length; j++) {
        const b = tray[j];
        if (b.z > 4) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) >= BALL_R * 2 || Math.abs(dy) >= BALL_R * 2) continue;
        const d2 = dx * dx + dy * dy, min = BALL_R * 2;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01, nx = dx / d || 1, ny = dy / d;
        const push = (min - d) / 2;
        a.x += nx * push; a.y += ny * push;
        b.x -= nx * push; b.y -= ny * push;
        const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vn < 0) {
          if (vn < -120) Sound.clink(-vn);
          const imp = -0.65 * vn;
          a.vx += imp * nx; a.vy += imp * ny;
          b.vx -= imp * nx; b.vy -= imp * ny;
        }
      }
    }
  }

  // 出珠速度：剩不多時一顆一顆（0.07 秒），一次要掉很多時依剩下的數量加速，掉完前會慢慢回到原速
  function payoutInterval() {
    return Math.max(0.006, Math.min(0.07, 1.2 / Math.max(1, state.payoutQueue)));
  }

  function update(dt) {
    if (state.charging) state.power = Math.min(1, state.power + dt / 1.1);
    state.floorY = SHOOTER_FLOOR + state.power * SPRING_TRAVEL;

    const h = dt / SUBSTEPS;
    for (let s = 0; s < SUBSTEPS && ball; s++) stepBall(h);

    // 卡住偵測：太久沒動就輕推一下
    if (ball && !ballAtShooter()) {
      if (Math.hypot(ball.vx, ball.vy) < 10) ball.still += dt; else ball.still = 0;
      if (ball.still > 1.2) {
        ball.vx += (Math.random() - 0.5) * 160;
        ball.vy -= 100;
        ball.still = 0;
      }
    }

    for (let s = 0; s < 4; s++) stepTray(dt / 4);
    updateSpills(dt);

    // 出珠口一顆一顆掉珠
    state.payoutTimer -= dt;
    while (state.payoutQueue > 0 && state.payoutTimer <= 0) {
      state.payoutQueue--;
      state.credits++;
      if (tray.length < TRAY_CAP) {
        tray.push({
          x: CHUTE.x + (Math.random() - 0.5) * 8, y: TRAY.back + BALL_R + 2, z: 24, vz: 0,
          vx: 80 + Math.random() * 300, vy: 10 + Math.random() * 30,
        });
      } else {
        spawnSpill();
      }
      state.payoutTimer += payoutInterval();
    }
    if (state.payoutQueue === 0) state.payoutTimer = Math.max(state.payoutTimer, 0);
    if (mode === 'classic' && state.credits > state.best) {
      state.best = state.credits;
      saveRecord('candy-pinball-best', state.best);
    }

    for (let i = tweens.length - 1; i >= 0; i--) {
      tweens[i].t += dt / tweens[i].dur;
      if (tweens[i].t >= 1) tweens.splice(i, 1);
    }

    state.buttonT = Math.max(0, state.buttonT - dt);
    if (mode === 'adv') {
      adv.hitT = Math.max(0, adv.hitT - dt);
      adv.laughT = Math.max(0, adv.laughT - dt);
      // 落敗：落敗音效之後竊笑一聲（畫面上會一直笑，聲音只出一次）
      if (adv.status === 'lost' && adv.laughSoundT > 0) {
        adv.laughSoundT -= dt;
        if (adv.laughSoundT <= 0) Sound.snicker();
      }
      adv.dieT = Math.max(0, adv.dieT - dt);
      for (let i = adv.pops.length - 1; i >= 0; i--) {
        adv.pops[i].t += dt;
        if (adv.pops[i].t > 1.2) adv.pops.splice(i, 1);
      }
      if (adv.endT > 0) {
        adv.endT -= dt;
        if (adv.endT <= 0) refreshOverlay();
      }
    }
    updateBetHold(dt);
    if (round.phase === 'select') {
      round.flashT -= dt;
      if (round.flashT <= 0) {
        rollLit(litFor(round.level));
        round.flashT = 0.12;
      }
    }

    if (round.phase === 'win' || round.phase === 'lose') {
      round.resetT -= dt;
      if (round.resetT <= 0 && state.payoutQueue === 0) newRound();
    }

    for (let i = popups.length - 1; i >= 0; i--) {
      popups[i].t += dt;
      if (popups[i].t > 1.4) popups.splice(i, 1);
    }
  }

  // ===== 操作 =====
  function startCharge() {
    Sound.init();
    if (advLocked()) return;
    if (!ballAtShooter()) return;
    if (round.phase === 'select') {
      say('lockFirst');
      Sound.error();
      return;
    }
    if (round.phase === 'bet' && round.bet === 0) {
      say(state.credits > 0 ? 'betFirst' : 'insertCoin');
      Sound.error();
      return;
    }
    if (round.phase !== 'bet' && round.phase !== 'flying') return;
    state.charging = true;
  }

  function release() {
    if (!state.charging) return;
    state.charging = false;
    const p = state.power;
    state.power = 0;
    state.floorY = SHOOTER_FLOOR;
    if (ballAtShooter()) {
      ball.y = Math.min(ball.y, SHOOTER_FLOOR - BALL_R);
      ball.vy = -(600 + 640 * p);
      ball.vx = 0;
      round.phase = 'flying';
      Sound.spring(p);
      say('fired');
    }
  }

  // ===== 繪圖 =====
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const staticCanvas = document.createElement('canvas');
  const glassCanvas = document.createElement('canvas');
  let scale = 1;

  const KAI = '"DFKai-SB", "BiauKai", "標楷體", "KaiTi", "STKaiti", serif';
  const SANS = '"Noto Sans TC", "Microsoft JhengHei", sans-serif';
  const MULT_COLS = ['貳倍', '肆倍', '陸倍', '捌倍', '拾倍'];
  const multColX = j => 122 + j * 62;
  const BET_BOX = { x: 33, y: 74, w: 53, h: 40 };   // 四位數也放得下

  function boardPath(c) {
    c.beginPath();
    c.moveTo(B.left, B.bottom);
    c.lineTo(B.left, CORNER.y);
    c.arc(CORNER.x, CORNER.y, CORNER.r, Math.PI, Math.PI * 1.5);
    c.lineTo(ARC.x, B.top);
    c.arc(ARC.x, ARC.y, ARC.r, -Math.PI / 2, 0);
    c.lineTo(B.right, B.bottom);
    c.closePath();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function screw(c, x, y) {
    const g = c.createRadialGradient(x - 1, y - 1, 0.5, x, y, 3.5);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, '#6b7280');
    c.beginPath();
    c.arc(x, y, 3.5, 0, Math.PI * 2);
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = '#4b5563';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x - 2.5, y + 1); c.lineTo(x + 2.5, y - 1);
    c.stroke();
  }

  function steelPin(c, x, y, r) {
    c.beginPath();
    c.arc(x + 1.2, y + 1.4, r, 0, Math.PI * 2);
    c.fillStyle = 'rgba(0, 0, 0, 0.55)';
    c.fill();
    const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.2, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#b8bec6');
    g.addColorStop(1, '#5b626b');
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = g;
    c.fill();
  }

  const LED_COLORS = {
    red: { glow: '#ff2a2a', c0: '#fff0f0', c1: '#ff3b3b', c2: '#b30000', halo: 'rgba(255, 40, 40, 0.18)' },
    green: { glow: '#22e07a', c0: '#effff5', c1: '#34d399', c2: '#047857', halo: 'rgba(34, 224, 122, 0.22)' },
  };
  function led(c, x, y, r, on, color = 'red') {
    if (on) {
      const L = LED_COLORS[color];
      c.save();
      c.shadowColor = L.glow;
      c.shadowBlur = r * 4;
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      g.addColorStop(0, L.c0);
      g.addColorStop(0.35, L.c1);
      g.addColorStop(1, L.c2);
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      c.restore();
      c.beginPath();
      c.arc(x, y, r * 3, 0, Math.PI * 2);
      c.fillStyle = L.halo;
      c.fill();
    } else {
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      g.addColorStop(0, '#a35252');
      g.addColorStop(1, '#3d0b0b');
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
    }
  }

  function drawWood(c, x, y, w, h, seed) {
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#c48d4c');
    g.addColorStop(0.5, '#a8743a');
    g.addColorStop(1, '#8e5e2a');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    const r = mulberry32(seed);
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    c.lineWidth = 1;
    for (let i = 0; i < Math.max(8, w / 10); i++) {
      const x0 = x + r() * w;
      c.strokeStyle = `rgba(90, 50, 15, ${0.12 + r() * 0.2})`;
      c.beginPath();
      for (let yy = y; yy <= y + h; yy += 12) c.lineTo(x0 + Math.sin(yy / 50 + i) * 4, yy);
      c.stroke();
    }
    c.restore();
  }

  function drawStatic() {
    const c = staticCanvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, staticCanvas.width, staticCanvas.height);
    c.setTransform(scale, 0, 0, scale, 0, 0);

    // 木頭機身
    c.save();
    roundRect(c, 0, 0, W, H, 12);
    c.clip();
    drawWood(c, 0, 0, W, H, 3);
    c.restore();

    // ---- 上方獎勵面板 ----
    c.fillStyle = '#5a3818';
    c.fillRect(22, 24, 476, 146);
    const panel = c.createLinearGradient(0, 32, 0, 162);
    panel.addColorStop(0, '#f7f6f1');
    panel.addColorStop(1, '#dcd9cf');
    c.fillStyle = panel;
    c.fillRect(30, 32, 368, 130);
    c.fillStyle = '#1a1a1a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // 左邊：投珠數（數字顯示）
    if (lang === 'zh') {
      c.font = `bold 15px ${KAI}`;
      c.fillText('投', 60, 48);
      c.fillText('珠', 60, 64);
    } else {
      c.font = `bold 14px ${SANS}`;
      c.fillText(t('cvBet'), 60, 58);
    }
    roundRect(c, BET_BOX.x, BET_BOX.y, BET_BOX.w, BET_BOX.h, 4);
    c.fillStyle = '#0b0b0b';
    c.fill();
    c.fillStyle = '#1a1a1a';
    c.font = lang === 'zh' ? `bold 15px ${KAI}` : `bold 12px ${SANS}`;
    c.fillText(t('cvBalls'), 60, 132);
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.beginPath(); c.moveTo(88, 40); c.lineTo(88, 154); c.stroke();
    if (mode === 'adv') {
      drawAdvScreenFrame(c);
    } else {
    // 右邊：倍率欄（毛筆字）
    for (let j = 0; j < MULTS.length; j++) {
      const x = multColX(j);
      c.fillStyle = '#111';
      if (lang === 'zh') {
        c.font = `bold 30px ${KAI}`;
        c.fillText(MULT_COLS[j][0], x, 62);
        c.fillText(MULT_COLS[j][1], x, 96);
      } else {
        c.font = `bold 28px Georgia, "Times New Roman", serif`;
        c.fillText('×' + MULTS[j], x, 80);
      }
      c.font = `bold 13px ${SANS}`;
      c.fillStyle = '#7a1010';
      c.fillText(t('cvLit', { n: litFor(j) }), x, 124);
      led(c, x, 146, 5, false);
    }
    // 金屬投珠板
    const plate = c.createLinearGradient(404, 0, 492, 0);
    plate.addColorStop(0, '#c9ced6');
    plate.addColorStop(0.5, '#f1f3f6');
    plate.addColorStop(1, '#a9b0b9');
    c.fillStyle = plate;
    c.fillRect(404, 32, 88, 130);
    c.strokeStyle = 'rgba(0,0,0,0.08)';
    for (let y = 34; y < 162; y += 3) { c.beginPath(); c.moveTo(404, y); c.lineTo(492, y); c.stroke(); }
    screw(c, 411, 39); screw(c, 485, 39); screw(c, 411, 155); screw(c, 485, 155);
    {
      const s = COIN_SLOT;
      c.fillStyle = '#333';
      c.font = `bold 13px ${SANS}`;
      c.fillText(t('cvCoinSlot'), s.x, s.y - 42);
      const bezel = c.createLinearGradient(s.x - 14, 0, s.x + 14, 0);
      bezel.addColorStop(0, '#8f969f');
      bezel.addColorStop(0.5, '#f4f5f7');
      bezel.addColorStop(1, '#7b828c');
      roundRect(c, s.x - 14, s.y - 30, 28, 62, 8);
      c.fillStyle = bezel;
      c.fill();
      c.strokeStyle = '#5b626b';
      c.lineWidth = 1.5;
      c.stroke();
      roundRect(c, s.x - 3.5, s.y - 22, 7, 46, 3.5);
      c.fillStyle = '#0d0d0d';
      c.fill();
    }
    }

    // ---- 遊戲檯面 ----
    c.fillStyle = '#5a3818';
    c.fillRect(28, 178, 464, 664);
    c.fillStyle = '#ebe9e3';
    c.fillRect(34, 184, 452, 652);
    c.save();
    boardPath(c);
    c.clip();
    const bg = c.createRadialGradient(240, 420, 50, 240, 420, 520);
    bg.addColorStop(0, '#3a2a22');
    bg.addColorStop(1, '#17100c');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    const speck = mulberry32(11);
    c.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 500; i++) c.fillRect(B.left + speck() * 440, B.top + speck() * (B.bottom - B.top), 1, 1);
    // 每一排的 LED 底座
    for (let i = 0; i < SLOT_COUNT; i++) led(c, B.left + (i + 0.5) * SLOT_W, LED_Y, 6, false);
    c.restore();

    // 發射彎軌：外圈金屬條 + 內圈一排釘子
    c.strokeStyle = '#9aa1a9';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(ARC.x, ARC.y, ARC.r - 1.5, -Math.PI / 2, 0);
    c.stroke();
    const railSteps = 14;
    for (let i = 0; i <= railSteps; i++) {
      const a = INNER_END * i / railSteps;
      steelPin(c, ARC.x + INNER_R * Math.cos(a), ARC.y + INNER_R * Math.sin(a), 2.6);
    }
    for (let y = ARC.y + 8; y <= B.bottom; y += 8) steelPin(c, LANE_X, y, 2.4);

    // 釘陣
    for (const p of pins) steelPin(c, p.x, p.y, PIN_R);
    for (const p of caps) {
      c.beginPath();
      c.arc(p.x + 1.5, p.y + 2, CAP_R, 0, Math.PI * 2);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fill();
      const g = c.createRadialGradient(p.x - 1.5, p.y - 1.5, 0.5, p.x, p.y, CAP_R);
      g.addColorStop(0, '#ffd0a0');
      g.addColorStop(0.5, '#f07a22');
      g.addColorStop(1, '#9a3c06');
      c.beginPath();
      c.arc(p.x, p.y, CAP_R, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
    }
    // 底部落點：雙排釘子隔出一排一排
    for (const x of dividers) {
      for (let y = SLOT_TOP; y <= SLOT_FLOOR - 4; y += 9) {
        steelPin(c, x - 2.4, y, 2.2);
        steelPin(c, x + 2.4, y + 4.5, 2.2);
      }
    }
    c.fillStyle = '#5b626b';
    c.fillRect(B.left, SLOT_FLOOR, LANE_X - B.left, 3);

    // ---- 下方回珠區：白色斜板 + 三角板 ----
    c.fillStyle = '#231b17';
    c.fillRect(34, B.bottom, 452, 116);
    if (mode === 'adv') {
      drawMsgScreenFrame(c);
    } else {
    c.fillStyle = '#efede7';
    c.beginPath();
    c.moveTo(34, 742); c.lineTo(452, 768); c.lineTo(452, 788); c.lineTo(34, 762);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.beginPath();
    c.moveTo(34, 762); c.lineTo(452, 788); c.lineTo(452, 792); c.lineTo(34, 766);
    c.closePath();
    c.fill();
    c.fillStyle = '#dfe4ea';
    c.beginPath();
    c.moveTo(372, 762); c.lineTo(452, 728); c.lineTo(452, 767);
    c.closePath();
    c.fill();
    }
    // 發射軌道延伸到下方，裡面是長彈簧
    c.fillStyle = '#17100c';
    c.fillRect(LANE_X, B.bottom, B.right - LANE_X, LANE_BOTTOM - B.bottom);
    for (let y = B.bottom + 6; y <= LANE_BOTTOM; y += 8) steelPin(c, LANE_X, y, 2.4);
    c.strokeStyle = '#9aa1a9';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(B.right - 1.5, ARC.y); c.lineTo(B.right - 1.5, LANE_BOTTOM); c.stroke();

    // ---- 前面板 ----
    c.fillStyle = 'rgba(60,30,10,0.5)';
    c.fillRect(0, 842, W, 3);
    const chrome = c.createLinearGradient(0, 842, 0, 916);
    chrome.addColorStop(0, '#f3f4f6');
    chrome.addColorStop(0.5, '#b7bdc6');
    chrome.addColorStop(1, '#e5e7eb');
    // 藍色定燈按鈕的金屬底板
    roundRect(c, BUTTON.x - 30, BUTTON.y - 30, 60, 60, 4);
    c.fillStyle = chrome;
    c.fill();
    screw(c, BUTTON.x - 24, BUTTON.y - 24); screw(c, BUTTON.x + 24, BUTTON.y - 24);
    screw(c, BUTTON.x - 24, BUTTON.y + 24); screw(c, BUTTON.x + 24, BUTTON.y + 24);
    c.fillStyle = '#3b2412';
    c.font = `bold 11px ${SANS}`;
    c.fillText(t('cvLock'), BUTTON.x, BUTTON.y + 39);
    // 拉桿導槽
    roundRect(c, PLUNGER_X - 16, 844, 32, 72, 6);
    c.fillStyle = chrome;
    c.fill();
    roundRect(c, PLUNGER_X - 4, 848, 8, 62, 4);
    c.fillStyle = '#0d0d0d';
    c.fill();
    c.fillStyle = '#3b2412';
    c.font = `bold 11px ${SANS}`;
    if (lang === 'zh') {
      c.fillText('拉', PLUNGER_X - 26, 870);
      c.fillText('桿', PLUNGER_X - 26, 884);
    } else {
      c.save();
      c.translate(PLUNGER_X - 26, 877);
      c.rotate(-Math.PI / 2);
      c.fillText(t('cvPull'), 0, 0);
      c.restore();
    }
    // 出珠口
    roundRect(c, CHUTE.x - 26, 890, 52, 30, 5);
    c.fillStyle = chrome;
    c.fill();
    c.fillStyle = '#0d0d0d';
    roundRect(c, CHUTE.x - 18, 902, 36, 16, 4);
    c.fill();
    c.fillStyle = '#3b2412';
    c.font = `bold 11px ${SANS}`;
    c.fillText(t('cvChute'), CHUTE.x, 880);
    // 持珠顯示器
    roundRect(c, DISPLAY.x, DISPLAY.y, DISPLAY.w, DISPLAY.h, 4);
    c.fillStyle = '#0b0b0b';
    c.fill();
    c.strokeStyle = '#5a3818';
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#9ca3af';
    c.font = `10px ${SANS}`;
    c.textAlign = 'left';
    c.fillText(t('cvDisplay'), DISPLAY.x + 6, DISPLAY.y + 10);
    c.textAlign = 'center';

    // ---- 托盤：不鏽鋼盤身、後壁、拉絲盤底（前緣在動態層畫，才能蓋住珠子） ----
    const body = c.createLinearGradient(0, 920, 0, 1050);
    body.addColorStop(0, '#f3f4f6');
    body.addColorStop(0.5, '#9ca3af');
    body.addColorStop(1, '#d1d5db');
    roundRect(c, 20, 920, 394, 130, 14);
    c.fillStyle = body;
    c.fill();
    c.save();
    roundRect(c, 30, 927, 374, 112, 10);
    c.clip();
    const floor = c.createLinearGradient(0, 927, 0, 1038);
    floor.addColorStop(0, '#4b5058');
    floor.addColorStop(0.2, '#868d95');
    floor.addColorStop(0.75, '#b9bec5');
    floor.addColorStop(1, '#d6dade');
    c.fillStyle = floor;
    c.fillRect(30, 927, 374, 112);
    const brush = mulberry32(5);
    for (let i = 0; i < 140; i++) {
      const y = 929 + brush() * 108;
      c.strokeStyle = brush() < 0.5 ? `rgba(255,255,255,${0.05 + brush() * 0.1})` : `rgba(0,0,0,${0.04 + brush() * 0.06})`;
      c.lineWidth = 0.6;
      const x0 = 30 + brush() * 200;
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + 100 + brush() * 200, y); c.stroke();
    }
    // 前面板在盤子後壁投下的陰影
    const back = c.createLinearGradient(0, 927, 0, 946);
    back.addColorStop(0, 'rgba(0,0,0,0.55)');
    back.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = back;
    c.fillRect(30, 927, 374, 19);
    // 左右側壁
    for (const [x0, x1] of [[30, 48], [404, 386]]) {
      const side = c.createLinearGradient(x0, 0, x1, 0);
      side.addColorStop(0, 'rgba(0,0,0,0.35)');
      side.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = side;
      c.fillRect(Math.min(x0, x1), 927, 18, 112);
    }
    // 盤底反光
    const sheen = c.createLinearGradient(0, 980, 0, 1038);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.25)');
    c.fillStyle = sheen;
    c.fillRect(30, 980, 374, 58);
    c.restore();

    // ---- 投珠孔（拉桿下方）、倍率孔（定燈按鈕旁）：白邊黑心的圓 ----
    for (const [hole, label] of [[HOLES.bet, t('cvBetHole')], [HOLES.mult, t('cvMultHole')]]) {
      c.beginPath();
      c.arc(hole.x + 1, hole.y + 2, hole.r + 1, 0, Math.PI * 2);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fill();
      const rim = c.createRadialGradient(hole.x - 5, hole.y - 6, 2, hole.x, hole.y, hole.r);
      rim.addColorStop(0, '#ffffff');
      rim.addColorStop(1, '#d9d6cc');
      c.beginPath();
      c.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
      c.fillStyle = rim;
      c.fill();
      const pit = c.createRadialGradient(hole.x - 2, hole.y - 2, 1, hole.x, hole.y, hole.r * 0.62);
      pit.addColorStop(0, '#2a2a2a');
      pit.addColorStop(1, '#000');
      c.beginPath();
      c.arc(hole.x, hole.y, hole.r * 0.62, 0, Math.PI * 2);
      c.fillStyle = pit;
      c.fill();
      c.fillStyle = '#3b2412';
      c.font = `bold 12px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(label, hole.x, hole.y + hole.r + 14);
    }
  }

  function drawGlass() {
    const c = glassCanvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, glassCanvas.width, glassCanvas.height);
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.save();
    c.beginPath();
    c.rect(34, 184, 452, 652);
    c.clip();
    const streaks = [[70, 110, 0.13]];   // 只留左邊一道反光
    for (const [x, w, a] of streaks) {
      const g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.save();
      c.translate(x, 0);
      c.transform(1, 0, -0.3, 1, 0, 0);
      c.fillStyle = g;
      c.fillRect(-x, 0, W, H);
      c.restore();
    }
    c.restore();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.max(1, Math.round(rect.width * dpr));
    const ph = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width === pw && canvas.height === ph) return;
    canvas.width = staticCanvas.width = glassCanvas.width = pw;
    canvas.height = staticCanvas.height = glassCanvas.height = ph;
    scale = pw / W;
    for (const k in advBgCache) delete advBgCache[k];
    buildSprites();
    drawStatic();
    drawGlass();
  }

  // ===== 鋼珠貼圖：先畫一張高解析度的鍍鉻鋼珠，之後每顆直接貼 =====
  // 鋼珠像鏡子：上半反射亮的天花板、中間一條暗的地平線、下半反射底下的檯面或托盤
  const ENV_BOARD = { sky0: '#ffffff', sky1: '#aeb5be', band: '#16110e', ground0: '#2b231e', ground1: '#857b72' };
  const ENV_TRAY = { sky0: '#ffffff', sky1: '#c3c9d0', band: '#353a41', ground0: '#7b828a', ground1: '#dde1e5' };
  const sprites = {};

  function makeBallSprite(env) {
    const S = BALL_R + 1, R = BALL_R;
    const px = Math.max(16, Math.ceil(S * 2 * scale * 2));
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const c = cv.getContext('2d');
    c.scale(px / (S * 2), px / (S * 2));
    c.translate(S, S);
    c.save();
    c.beginPath();
    c.arc(0, 0, R, 0, Math.PI * 2);
    c.clip();
    let g = c.createLinearGradient(0, -R, 0, R);
    g.addColorStop(0, env.sky0);
    g.addColorStop(0.42, env.sky1);
    g.addColorStop(0.52, env.band);
    g.addColorStop(0.64, env.ground0);
    g.addColorStop(1, env.ground1);
    c.fillStyle = g;
    c.fillRect(-R, -R, R * 2, R * 2);
    // 球面讓地平線彎成弧形
    c.globalAlpha = 0.55;
    c.beginPath();
    c.ellipse(0, R * 0.1, R * 1.05, R * 0.17, 0, 0, Math.PI * 2);
    c.fillStyle = env.band;
    c.fill();
    c.globalAlpha = 1;
    // 窗戶 / 日光燈的倒影
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.ellipse(-R * 0.2, -R * 0.58, R * 0.5, R * 0.18, -0.2, 0, Math.PI * 2);
    c.fill();
    // 邊緣變暗，做出球的體積
    g = c.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.15, 0, 0, R);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.72, 'rgba(0,0,0,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = g;
    c.fillRect(-R, -R, R * 2, R * 2);
    // 底部邊緣的反射光
    g = c.createRadialGradient(R * 0.15, R * 0.95, 0, R * 0.15, R * 0.95, R * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(-R, -R, R * 2, R * 2);
    // 最亮的高光點
    g = c.createRadialGradient(-R * 0.38, -R * 0.42, 0, -R * 0.38, -R * 0.42, R * 0.34);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
    c.beginPath();
    c.arc(0, 0, R - 0.2, 0, Math.PI * 2);
    c.lineWidth = 0.4;
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.stroke();
    return cv;
  }

  function makeShadowSprite() {
    const px = Math.max(16, Math.ceil(BALL_R * 4 * scale));
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.6)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, px, px);
    return cv;
  }

  function buildSprites() {
    sprites.board = makeBallSprite(ENV_BOARD);
    sprites.tray = makeBallSprite(ENV_TRAY);
    sprites.shadow = makeShadowSprite();
  }

  function drawBall(x, y, sprite, size = 1) {
    const S = (BALL_R + 1) * size;
    ctx.drawImage(sprite, x - S, y - S, S * 2, S * 2);
  }

  function drawShadow(x, y, alpha = 1, spread = 1) {
    const S = BALL_R * spread;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.drawImage(sprites.shadow, x - S, y - S * 0.7, S * 2, S * 1.4);
    ctx.globalAlpha = 1;
  }


  // ===== 大冒險：上方的像素螢幕 =====
  const SCREEN = { x: 34, y: 38, w: 452, h: 118 };   // 大冒險：整條上方面板都是像素螢幕
  const PX = 6;               // 怪物每個像素的大小

  function drawAdvScreenFrame(c) {
    const bez = c.createLinearGradient(0, 30, 0, 164);
    bez.addColorStop(0, '#e5e7eb');
    bez.addColorStop(0.5, '#9aa1a9');
    bez.addColorStop(1, '#d1d5db');
    roundRect(c, 26, 30, 468, 134, 8);
    c.fillStyle = bez;
    c.fill();
    screw(c, 30, 34); screw(c, 490, 34); screw(c, 30, 160); screw(c, 490, 160);
    roundRect(c, SCREEN.x - 3, SCREEN.y - 3, SCREEN.w + 6, SCREEN.h + 6, 6);
    c.fillStyle = '#0a0a0a';
    c.fill();
    const bg = c.createLinearGradient(0, SCREEN.y, 0, SCREEN.y + SCREEN.h);
    bg.addColorStop(0, '#17351d');
    bg.addColorStop(1, '#0a1a0e');
    roundRect(c, SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 4);
    c.fillStyle = bg;
    c.fill();
    c.fillStyle = 'rgba(140, 255, 160, 0.06)';
    for (let x = SCREEN.x + 2; x < SCREEN.x + SCREEN.w; x += 4) {
      for (let y = SCREEN.y + 2; y < SCREEN.y + SCREEN.h; y += 4) c.fillRect(x, y, 1, 1);
    }
  }


  // ===== 大冒險：怪物所在環境的像素背景 =====
  // 史萊姆＝森林、蝙蝠＝洞窟、幽靈＝墓園、骷髏＝地下墓穴、小惡龍＝地獄
  // 背景先畫到離屏畫布（依畫面大小重建），動態的火光、星星、火星每幀另外畫
  const advBgCache = {};
  const BG_PX = 4;            // 背景的像素格大小

  function advBg(kind) {
    if (!advBgCache[kind]) advBgCache[kind] = buildAdvBg(kind);
    return advBgCache[kind];
  }

  function buildAdvBg(kind) {
    const w = SCREEN.w, h = SCREEN.h, P = BG_PX;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w * scale));
    cv.height = Math.max(1, Math.ceil(h * scale));
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    const r = mulberry32(kind.length * 977 + kind.charCodeAt(0));
    const snap = v => Math.floor(v / P) * P;
    const box = (x, y, bw, bh, color) => {
      c.fillStyle = color;
      c.fillRect(snap(x), snap(y), Math.max(P, Math.round(bw / P) * P), Math.max(P, Math.round(bh / P) * P));
    };
    const bands = (colors, y0, y1) => {
      const step = (y1 - y0) / colors.length;
      colors.forEach((col, i) => box(0, y0 + i * step, w, step + P, col));
    };
    const disc = (cx, cy, rad, color) => {
      for (let dy = -rad; dy <= rad; dy += P) {
        for (let dx = -rad; dx <= rad; dx += P) if (dx * dx + dy * dy <= rad * rad) box(cx + dx, cy + dy, P, P, color);
      }
    };

    if (kind === 'forest') {
      bands(['#6fb7e0', '#82c3e5', '#97cfe9', '#addbec', '#c6e9ea'], 0, 64);
      box(30, 14, 36, 8, '#f4fbff'); box(38, 10, 20, 4, '#f4fbff');            // 雲
      box(270, 22, 44, 8, '#eaf6fb'); box(282, 18, 20, 4, '#eaf6fb');
      // 遠方的樹林
      for (let x = 0; x < w; x += P) {
        const th = 30 + Math.round((Math.sin(x * 0.05) + Math.sin(x * 0.13 + 1)) * 6 + r() * 4);
        box(x, h - 22 - th, P, th, '#3f7f4a');
      }
      // 近處的大樹
      for (let i = 0; i < 6; i++) {
        const tx = 18 + i * 72 + r() * 16, base = h - 22;
        box(tx - 2, base - 26, 8, 26, '#5b3a1e');
        for (let k = 0; k < 4; k++) {
          const rw = 40 - k * 9;
          box(tx + 2 - rw / 2, base - 36 - k * 8, rw, 12, k % 2 ? '#2d6a35' : '#245a2c');
        }
      }
      box(0, h - 24, w, 8, '#4caf50');
      box(0, h - 16, w, 16, '#3a7d3c');
      for (let x = 0; x < w; x += 8) if (r() < 0.5) box(x, h - 28, P, P, '#6fd16f');
      for (let x = 4; x < w; x += 12) if (r() < 0.35) box(x, h - 10, P, P, '#2e6630');
    } else if (kind === 'cave') {
      box(0, 0, w, h, '#1c1828');
      for (let i = 0; i < 260; i++) box(r() * w, r() * h, P, P, r() < 0.5 ? '#262039' : '#14111d');
      // 鐘乳石
      for (let x = 0; x < w; x += 16) {
        const len = 8 + r() * 30;
        for (let y = 0; y < len; y += P) box(x + 8 - Math.max(P, 14 * (1 - y / len)) / 2, y, Math.max(P, 14 * (1 - y / len)), P, '#3a3350');
      }
      // 石筍
      for (let x = 6; x < w; x += 24) {
        const len = 6 + r() * 24;
        for (let y = 0; y < len; y += P) box(x + 8 - Math.max(P, 16 * (1 - y / len)) / 2, h - 12 - y, Math.max(P, 16 * (1 - y / len)), P, '#332d47');
      }
      box(0, h - 8, w, 8, '#2a2438');
      // 發光的水晶
      for (let i = 0; i < 6; i++) {
        const x = r() * (w - 12), y = h - 22 - r() * 10;
        box(x, y, P, 8, '#7dd3fc'); box(x + P, y + P, P, P, '#e0f2fe');
      }
    } else if (kind === 'graveyard') {
      bands(['#080c24', '#0d1434', '#131c45', '#1a2554', '#212e60'], 0, h - 20);
      for (let i = 0; i < 40; i++) box(r() * w, r() * 64, P, P, r() < 0.3 ? '#ffffff' : '#9aa6d8');
      disc(w - 58, 30, 16, '#f5f3c1');                                       // 月亮
      box(w - 64, 26, 8, 4, '#dcd8a0'); box(w - 52, 36, 4, 4, '#dcd8a0');
      for (let x = 0; x < w; x += P) {
        const hh = 10 + Math.round(Math.sin(x * 0.03) * 6 + Math.sin(x * 0.09) * 3);
        box(x, h - 20 - hh, P, hh, '#141a33');
      }
      box(0, h - 20, w, 20, '#0f1429');
      // 墓碑
      for (const x of [0.07, 0.19, 0.78, 0.89].map(f => Math.round(f * w))) {
        box(x, h - 40, 20, 26, '#5b6178');
        box(x + 4, h - 44, 12, 4, '#5b6178');
        box(x + 8, h - 36, 4, 14, '#3e4358');
        box(x + 4, h - 32, 12, 4, '#3e4358');
      }
      // 枯樹
      const tx = Math.round(w * 0.34);
      box(tx, h - 60, 6, 42, '#0a0e1e'); box(tx - 14, h - 56, 16, 4, '#0a0e1e'); box(tx + 4, h - 46, 16, 4, '#0a0e1e');
      c.fillStyle = 'rgba(180, 200, 255, 0.10)';
      c.fillRect(0, h - 30, w, 12);
    } else if (kind === 'crypt') {
      box(0, 0, w, h, '#24242c');
      // 石磚牆
      for (let row = 0; row * 12 < h; row++) {
        for (let col = -1; col * 24 < w; col++) {
          const x = col * 24 + (row % 2 ? 12 : 0);
          box(x + 2, row * 12 + 2, 20, 8, ['#3b3b46', '#36363f', '#42424e'][Math.floor(r() * 3)]);
        }
      }
      box(0, h - 16, w, 16, '#2e2a28');
      for (let x = 0; x < w; x += 32) box(x, h - 16, P, 16, '#24201e');
      // 火把架
      for (const x of [56, w - 64]) {
        box(x, 46, 8, 18, '#5b3a1e');
        box(x - 4, 42, 16, 4, '#7a7a85');
      }
      // 蜘蛛網
      for (let i = 0; i < 6; i++) { box(i * P, i * P, P, P, '#8a8a95'); box(w - P - i * P, i * P, P, P, '#8a8a95'); }
      box(0, 12, 16, P, '#6b6b76'); box(12, 0, P, 16, '#6b6b76');
      box(w - 16, 12, 16, P, '#6b6b76'); box(w - 16, 0, P, 16, '#6b6b76');
    } else if (kind === 'hell') {
      bands(['#1a0303', '#2b0606', '#430a07', '#5e1209', '#7a1e0b', '#93300d'], 0, h - 18);
      // 黑色岩石尖刺
      for (let x = 0; x < w; x += P) {
        const hh = 8 + Math.round(Math.abs(Math.sin(x * 0.045)) * 28 + Math.abs(Math.sin(x * 0.11 + 2)) * 8 + r() * 4);
        box(x, h - 18 - hh, P, hh, '#1a0505');
      }
      box(0, h - 18, w, 18, '#ff5a1f');
      for (let x = 0; x < w; x += 8) {
        box(x, h - 18, P, P, '#ffd166');
        if (r() < 0.6) box(x + 4, h - 12, P, P, '#ff8a3d');
      }
    }
    return cv;
  }

  // 背景上會動的小東西
  function drawAdvBgFx(kind, time) {
    const S = SCREEN;
    if (kind === 'crypt') {
      // 火把的火焰忽大忽小
      for (const x of [56, S.w - 64]) {
        const f = Math.floor(time * 10 + x) % 3;
        const fx = S.x + x, fy = S.y + 30;
        ctx.fillStyle = 'rgba(255, 170, 60, 0.12)';
        ctx.fillRect(fx - 12, fy - 8, 32, 32);
        ctx.fillStyle = '#ff7a1a'; ctx.fillRect(fx, fy + 4 - f, 8, 8 + f);
        ctx.fillStyle = '#ffd166'; ctx.fillRect(fx + 2, fy + 8 - f, 4, 4 + f);
      }
    } else if (kind === 'hell') {
      // 熔岩表面閃動、火星往上飄
      const shift = Math.floor(time * 6) % 2 ? 4 : 0;
      ctx.fillStyle = '#ffd166';
      for (let x = shift; x < S.w; x += 16) ctx.fillRect(S.x + x, S.y + S.h - 14, 4, 4);
      for (let i = 0; i < 14; i++) {
        const x = (i * 53 + Math.sin(time + i) * 10 + S.w) % S.w;
        const y = S.h - 18 - ((time * (18 + (i % 4) * 8) + i * 37) % (S.h - 18));
        ctx.fillStyle = i % 2 ? '#ffb347' : '#ff7043';
        ctx.fillRect(S.x + Math.floor(x / 2) * 2, S.y + Math.floor(y / 2) * 2, 2, 2);
      }
    } else if (kind === 'graveyard') {
      // 幾顆星星一閃一閃
      for (let i = 0; i < 6; i++) {
        if (Math.floor(time * 2 + i * 0.7) % 3 !== 0) continue;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(S.x + 20 + i * 57, S.y + 8 + (i % 3) * 14, 2, 2);
      }
    }
  }

  // 文字底下墊一塊半透明黑底，背景再花也看得清楚
  function textBacking(x, y, w, h) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, w, h);
  }


  // ===== 大冒險：落獎區下方的訊息螢幕 =====
  const MSG_SCREEN = { x: 44, y: 730, w: 400, h: 96 };

  function drawMsgScreenFrame(c) {
    const M = MSG_SCREEN;
    const bez = c.createLinearGradient(0, M.y - 6, 0, M.y + M.h + 6);
    bez.addColorStop(0, '#e5e7eb');
    bez.addColorStop(0.5, '#9aa1a9');
    bez.addColorStop(1, '#d1d5db');
    roundRect(c, M.x - 6, M.y - 6, M.w + 12, M.h + 12, 8);
    c.fillStyle = bez;
    c.fill();
    roundRect(c, M.x - 2, M.y - 2, M.w + 4, M.h + 4, 5);
    c.fillStyle = '#0a0a0a';
    c.fill();
    const bg = c.createLinearGradient(0, M.y, 0, M.y + M.h);
    bg.addColorStop(0, '#17351d');
    bg.addColorStop(1, '#0a1a0e');
    roundRect(c, M.x, M.y, M.w, M.h, 4);
    c.fillStyle = bg;
    c.fill();
    c.fillStyle = 'rgba(140, 255, 160, 0.06)';
    for (let x = M.x + 2; x < M.x + M.w; x += 4) {
      for (let y = M.y + 2; y < M.y + M.h; y += 4) c.fillRect(x, y, 1, 1);
    }
  }

  // 依寬度斷行：中文逐字斷，英文盡量在空白處斷
  function wrapText(text, maxW) {
    const lines = [];
    let line = '';
    for (const ch of text) {
      const test = line + ch;
      if (line && ctx.measureText(test).width > maxW) {
        const sp = line.lastIndexOf(' ');
        if (sp > 0 && /\S/.test(ch) && /[A-Za-z0-9]/.test(ch)) {
          lines.push(line.slice(0, sp));
          line = line.slice(sp + 1) + ch;
        } else {
          lines.push(line);
          line = ch === ' ' ? '' : ch;
        }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawAdvMessage(time) {
    const M = MSG_SCREEN;
    ctx.save();
    roundRect(ctx, M.x, M.y, M.w, M.h, 4);
    ctx.clip();
    ctx.font = `bold 18px ${SANS}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const lines = wrapText(msgText, M.w - 28).slice(0, 3);
    const lh = 26;
    const top = M.y + (M.h - lines.length * lh) / 2 + lh / 2;
    // 打字機效果：一個字一個字跑出來
    let left = Math.floor((performance.now() - msgT) / 1000 * 45);
    let cursor = null;
    lines.forEach((ln, i) => {
      const chars = [...ln];
      const part = chars.slice(0, Math.max(0, left)).join('');
      left -= chars.length;
      ctx.fillStyle = '#c8f7c5';
      ctx.fillText(part, M.x + 14, top + i * lh);
      if (left <= 0 && cursor === null) cursor = { x: M.x + 14 + ctx.measureText(part).width + 3, y: top + i * lh };
    });
    if (!cursor && lines.length) {
      const i = lines.length - 1;
      cursor = { x: M.x + 14 + ctx.measureText(lines[i]).width + 3, y: top + i * lh };
    }
    if (cursor && Math.floor(time * 2.5) % 2 === 0) {
      ctx.fillStyle = '#c8f7c5';
      ctx.fillRect(cursor.x, cursor.y - 8, 9, 16);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = M.y; y < M.y + M.h; y += 3) ctx.fillRect(M.x, y, M.w, 1);
    ctx.restore();
  }

  function drawMonster(m, x0, y0, flash, laughing = false) {
    const map = laughing ? m.laugh : m.map;
    for (let r = 0; r < map.length; r++) {
      const row = map[r];
      for (let col = 0; col < row.length; col++) {
        const ch = row[col];
        if (ch === '.') continue;
        ctx.fillStyle = flash ? '#ffffff' : m.pal[ch];
        ctx.fillRect(x0 + col * PX, y0 + r * PX, PX, PX);
      }
    }
  }

  function drawAdvScreen(time) {
    const S = SCREEN;
    const PIXEL_FONT = '"Courier New", Consolas, monospace';
    ctx.save();
    roundRect(ctx, S.x, S.y, S.w, S.h, 4);
    ctx.clip();
    ctx.textBaseline = 'middle';
    if (!adv.monster) {
      if (Math.floor(time * 2) % 2 === 0) {
        ctx.fillStyle = '#9cf5a6';
        ctx.font = `bold 22px ${PIXEL_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('PRESS START', S.x + S.w / 2, S.y + S.h / 2);
      }
    } else {
      const m = adv.monster;
      ctx.drawImage(advBg(m.bg), S.x, S.y, S.w, S.h);
      drawAdvBgFx(m.bg, time);
      const size = m.map.length * PX;
      const cx = S.x + S.w / 2;                 // 怪物放在螢幕中間
      let ox = 0, oy = Math.round(Math.sin(time * 3) * 3);
      if (adv.hitT > 0) ox = Math.round((Math.random() - 0.5) * 10 * (adv.hitT / 0.5));
      const laughing = adv.monster && (adv.laughT > 0 || adv.status === 'lost');
      if (laughing) {
        oy += Math.floor(time * 16) % 2 ? -3 : 0;
        ox += Math.floor(time * 11) % 2 ? 1 : -1;
      }
      const x0 = cx - size / 2 + ox, y0 = S.y + 8 + oy;
      const visible = adv.status !== 'won' || (adv.dieT > 0 && Math.floor(adv.dieT * 12) % 2 === 0);
      // 影子：腳下一塊圓形影子，怪物往上彈時變小、落下時變大
      if (visible) {
        const k = Math.max(0.75, 1 + oy / 30);
        const sx = cx + ox, sy = S.y + 84;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, size * 0.46 * k, 9 * k, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, size * 0.36 * k, 6 * k, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (visible) drawMonster(m, x0, y0, adv.hitT > 0 && Math.floor(adv.hitT * 20) % 2 === 0, laughing);
      if (laughing && visible) {
        // 「嘻嘻嘻」在怪物頭的右邊
        const word = t('laugh');
        ctx.font = `bold 15px ${SANS}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd166';
        const lx = x0 + size + 6, ly = S.y + 20;
        for (let i = 0; i < word.length; i++) {
          const w = ctx.measureText(word.slice(0, i)).width;
          ctx.fillText(word[i], lx + w, ly + Math.sin(time * 14 + i * 1.3) * 3);
        }
      }
      // 傷害數字
      ctx.font = `bold 22px ${PIXEL_FONT}`;
      ctx.textAlign = 'center';
      for (const p of adv.pops) {
        ctx.globalAlpha = Math.max(0, 1 - p.t / 1.2);
        ctx.fillStyle = '#ff5c5c';
        ctx.fillText(p.text, cx, S.y + 32 - p.t * 26);
      }
      ctx.globalAlpha = 1;

      // 左上：名字；右上：勝敗
      ctx.font = `bold 15px ${SANS}`;
      textBacking(S.x + 4, S.y + 4, ctx.measureText(monsterName()).width + 12, 20);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#c8f7c5';
      ctx.fillText(monsterName(), S.x + 10, S.y + 14);
      ctx.textAlign = 'right';
      ctx.font = `bold 16px ${PIXEL_FONT}`;
      if (adv.status === 'won' || adv.status === 'lost') {
        const label = adv.status === 'won' ? 'VICTORY!' : 'GAME OVER';
        textBacking(S.x + S.w - ctx.measureText(label).width - 16, S.y + 4, ctx.measureText(label).width + 12, 20);
        if (adv.status === 'lost') { ctx.fillStyle = '#ef4444'; ctx.fillText(label, S.x + S.w - 10, S.y + 14); }
        else if (Math.floor(time * 4) % 2 === 0) { ctx.fillStyle = '#facc15'; ctx.fillText(label, S.x + S.w - 10, S.y + 14); }
      }

      // 怪物下面：HP 血條
      const bw = 200, bx = cx - bw / 2, by = S.y + 99, bh = 12;   // 往下一點，讓出影子的位置
      const segs = 20, gap = 2, sw = (bw - gap * (segs - 1)) / segs;
      const ratio = adv.hp / adv.maxHp;
      const filled = Math.ceil(ratio * segs);
      const barColor = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#ef4444';
      textBacking(bx - 36, by - 6, bw + 100, bh + 12);
      for (let i = 0; i < segs; i++) {
        ctx.fillStyle = i < filled ? barColor : 'rgba(255,255,255,0.12)';
        ctx.fillRect(Math.round(bx + i * (sw + gap)), by, Math.max(1, Math.floor(sw)), bh);
      }
      ctx.strokeStyle = 'rgba(200,247,197,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 2.5, by - 2.5, bw + 5, bh + 5);
      ctx.fillStyle = '#c8f7c5';
      ctx.font = `bold 15px ${PIXEL_FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText('HP', bx - 8, by + bh / 2 + 1);
      ctx.textAlign = 'left';
      ctx.fillText(`${adv.hp}/${adv.maxHp}`, bx + bw + 8, by + bh / 2 + 1);
    }
    // 掃描線
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = S.y; y < S.y + S.h; y += 3) ctx.fillRect(S.x, y, S.w, 1);
    ctx.restore();
  }

  function drawLeds(t) {
    const blink = Math.floor(t * 8) % 2 === 0;
    // 面板：投珠數、倍率（大冒險沒有投珠數顯示）
    if (mode === 'classic') {
    ctx.save();
    ctx.font = `bold ${round.bet > 999 ? 16 : round.bet > 99 ? 19 : 24}px "Consolas", "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff2a2a';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff3b3b';
    ctx.fillText(String(Math.min(9999, round.bet)), BET_BOX.x + BET_BOX.w / 2, BET_BOX.y + BET_BOX.h / 2 + 1);
    ctx.restore();
    }
    if (mode === 'classic') led(ctx, multColX(round.level), 146, 5, true);
    // 檯面每一排的 LED
    for (const i of round.lit) {
      const on = round.phase === 'win' && i === round.landSlot ? blink : true;
      led(ctx, B.left + (i + 0.5) * SLOT_W, LED_Y, 6, on);
    }
    if (round.refill >= 0) {
      const on = round.phase === 'win' && round.refill === round.landSlot ? blink : true;
      led(ctx, B.left + (round.refill + 0.5) * SLOT_W, LED_Y, 6, on, 'green');
    }
    if (round.phase === 'lose' && round.landSlot >= 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(B.left + round.landSlot * SLOT_W + 4, SLOT_TOP, SLOT_W - 8, SLOT_FLOOR - SLOT_TOP);
    }
  }

  function drawShooter() {
    const top = state.floorY;
    const x0 = LANE_X + 3, x1 = B.right - 3;
    // 長彈簧：從彈簧頭一路到軌道底
    ctx.strokeStyle = '#b8bec6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const coils = 10, len = LANE_BOTTOM - (top + 5);
    for (let i = 0; i <= coils * 2; i++) {
      ctx.lineTo(i % 2 ? x1 - 1 : x0 + 1, top + 5 + len * i / (coils * 2));
    }
    ctx.stroke();
    ctx.fillStyle = '#c1121f';
    roundRect(ctx, x0, top, x1 - x0, 6, 2);
    ctx.fill();
  }

  function drawKnob() {
    const y = KNOB_Y + state.power * 50;
    ctx.fillStyle = '#9aa1a9';
    ctx.fillRect(PLUNGER_X - 2, 842, 4, y - 842);
    const g = ctx.createRadialGradient(PLUNGER_X - 4, y - 4, 1, PLUNGER_X, y, 11);
    g.addColorStop(0, '#ff8a8a');
    g.addColorStop(0.5, '#c1121f');
    g.addColorStop(1, '#5a050a');
    ctx.beginPath();
    ctx.arc(PLUNGER_X, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // 每個階段閃爍下一步要按的地方；開始拉桿後就不提示
  // ---- 提示：粗亮框 + 往外擴散的波紋 + 會跳動的黃色對話框 ----
  const HINT_COLOR = '#fff36b';

  function hintStroke(t, draw, ripple) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    ctx.save();
    ctx.shadowColor = '#ffd400';
    ctx.shadowBlur = 12 + pulse * 18;
    ctx.strokeStyle = HINT_COLOR;
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    ctx.lineWidth = 5;
    ctx.beginPath();
    draw(0);
    ctx.stroke();
    // 波紋：每秒往外擴散一次
    const ph = (t * 1.1) % 1;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = (1 - ph) * 0.9;
    ctx.lineWidth = 3;
    ctx.beginPath();
    draw(ph * ripple);
    ctx.stroke();
    ctx.restore();
  }

  function hintCircle(t, x, y, r) {
    hintStroke(t, grow => ctx.arc(x, y, r + grow, 0, Math.PI * 2), 18);
  }

  function hintRect(t, x, y, w, h) {
    hintStroke(t, grow => roundRect(ctx, x - grow, y - grow, w + grow * 2, h + grow * 2, 8 + grow), 14);
  }

  // side：對話框在目標的哪一邊（below / above / left），箭頭指向目標
  // align（只用在 above / below）：center 置中、start 往右延伸、end 往左延伸，箭頭都指著目標
  function hintBubble(t, tx, ty, side, text, align = 'center') {
    const bounce = Math.abs(Math.sin(t * 5)) * 7;
    ctx.save();
    ctx.font = `900 19px ${SANS}`;
    const w = ctx.measureText(text).width + 22, h = 32, a = 11;
    let tipX = tx, tipY = ty, bx, by;
    const ax = align === 'start' ? tx - 16 : align === 'end' ? tx + 16 - w : tx - w / 2;
    if (side === 'below') { tipY = ty + bounce; bx = ax; by = tipY + a; }
    else if (side === 'above') { tipY = ty - bounce; bx = ax; by = tipY - a - h; }
    else { tipX = tx - bounce; bx = tipX - a - w; by = ty - h / 2; }
    bx = Math.max(4, Math.min(W - 4 - w, bx));
    ctx.beginPath();
    roundRect(ctx, bx, by, w, h, 8);
    ctx.moveTo(tipX, tipY);
    if (side === 'below') { ctx.lineTo(tipX - 10, tipY + a + 1); ctx.lineTo(tipX + 10, tipY + a + 1); }
    else if (side === 'above') { ctx.lineTo(tipX - 10, tipY - a - 1); ctx.lineTo(tipX + 10, tipY - a - 1); }
    else { ctx.lineTo(tipX - a - 1, tipY - 10); ctx.lineTo(tipX - a - 1, tipY + 10); }
    ctx.closePath();
    // 先描粗邊再填色，填色會蓋掉對話框和箭頭接縫的線，只留外框
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffd400';
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
    ctx.restore();
  }

  // 每個階段閃爍下一步要按的地方；開始拉桿後就不提示
  function drawHints(time) {
    if (state.charging || !state.started || advLocked()) return;
    if (round.phase === 'select') {
      const m = HOLES.mult;
      if (state.credits >= MULT_COST && round.level < MULTS.length - 1) {
        hintCircle(time, m.x, m.y, m.r + 5);
        hintBubble(time, m.x, m.y - m.r - 10, 'above', t('hintMult'), 'start');
      }
      hintCircle(time, BUTTON.x, BUTTON.y, BUTTON.r + 8);
      hintBubble(time, BUTTON.x, BUTTON.y - BUTTON.r - 12, 'above', t('hintLock'), 'end');
    } else if (round.phase === 'bet') {
      const b = HOLES.bet;
      if (state.credits > 0) hintCircle(time, b.x, b.y, b.r + 5);
      if (round.bet === 0) {
        hintBubble(time, b.x - b.r - 8, b.y, 'left', t('hintBet'));
      } else if (ballAtShooter()) {
        hintCircle(time, PLUNGER_X, KNOB_Y, 15);
        hintBubble(time, PLUNGER_X - 20, KNOB_Y, 'left', t('hintPull'));
      }
    }
  }

  function drawButton(t) {
    const pressed = state.buttonT > 0;
    const r = BUTTON.r - (pressed ? 2 : 0);
    ctx.beginPath();
    ctx.arc(BUTTON.x, BUTTON.y, BUTTON.r + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4b5563';
    ctx.fill();
    // 閃燈階段按鈕會一亮一暗，提示可以按
    const glow = round.phase === 'select' ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
    const g = ctx.createRadialGradient(BUTTON.x - 6, BUTTON.y - 7, 2, BUTTON.x, BUTTON.y, r);
    g.addColorStop(0, pressed ? '#6b8cff' : '#9db4ff');
    g.addColorStop(0.5, pressed ? '#1d3fc4' : '#2550f0');
    g.addColorStop(1, '#0b1f7a');
    ctx.save();
    if (glow) { ctx.shadowColor = '#5b8cff'; ctx.shadowBlur = 6 + glow * 14; }
    ctx.beginPath();
    ctx.arc(BUTTON.x, BUTTON.y + (pressed ? 1 : 0), r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function drawDisplay() {
    ctx.save();
    ctx.font = 'bold 28px "Consolas", "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 40, 40, 0.12)';
    ctx.fillText('8888', DISPLAY.x + DISPLAY.w - 8, DISPLAY.y + 27);   // 七段顯示器沒亮的底紋，四位數
    ctx.shadowColor = '#ff2a2a';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff3b3b';
    ctx.fillText(String(Math.min(DISPLAY_MAX, state.credits)), DISPLAY.x + DISPLAY.w - 8, DISPLAY.y + 27);
    ctx.restore();
  }

  function drawTray() {
    const sorted = tray.slice().sort((a, b) => a.y - b.y);
    // 越後面的珠子畫小一點，看起來像從斜上方看盤子
    const depth = t => 0.86 + 0.14 * (t.y - TRAY.back) / (TRAY.front - TRAY.back);
    for (const t of sorted) drawShadow(t.x + 1, t.y + 4, 0.8 - Math.min(0.5, t.z / 50), (1.15 + t.z / 40) * depth(t));
    for (const t of sorted) drawBall(t.x, t.y - t.z, sprites.tray, depth(t));
    // 圓弧前緣蓋住最前排珠子的下半部
    const lip = ctx.createLinearGradient(0, 1030, 0, 1052);
    lip.addColorStop(0, '#6b7280');
    lip.addColorStop(0.3, '#f9fafb');
    lip.addColorStop(0.6, '#b6bcc4');
    lip.addColorStop(1, '#5b626b');
    roundRect(ctx, 20, 1030, 394, 22, 11);
    ctx.fillStyle = lip;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, 1035.5);
    ctx.lineTo(398, 1035.5);
    ctx.stroke();
    // 持珠顯示器最多到 DISPLAY_MAX，超過的部分才在右下角另外顯示
    const hidden = state.credits - DISPLAY_MAX;
    if (hidden > 0) {
      ctx.font = `bold 12px ${SANS}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#374151';
      ctx.fillText(t('moreBalls', { n: hidden }), 398, 1041);
    }
  }

  function drawTweens() {
    for (const tw of tweens) {
      if (tw.t < 0) continue;
      const t = tw.t;
      const x = tw.x0 + (tw.x1 - tw.x0) * t;
      const y = tw.y0 + (tw.y1 - tw.y0) * t - 120 * 4 * t * (1 - t);
      drawBall(x, y, sprites.tray);
    }
  }

  function drawPopups() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups) {
      const a = Math.max(0, 1 - p.t / 1.4);
      ctx.globalAlpha = a;
      ctx.font = `900 22px ${SANS}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1a0d05';
      const y = p.y - p.t * 30;
      const x = Math.max(60, Math.min(LANE_X - 50, p.x));
      ctx.strokeText(p.text, x, y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, x, y);
    }
    ctx.globalAlpha = 1;
  }

  // ===== 托盤滿了：珠子滿出來掉到機台外面 =====
  // 畫在蓋住整個視窗的透明圖層上（pointer-events: none），才能真的掉出機台、掉出畫面
  const spillCanvas = document.createElement('canvas');
  spillCanvas.className = 'spill-layer';
  spillCanvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(spillCanvas);
  const spillCtx = spillCanvas.getContext('2d');
  const spills = [];
  let spillDirty = false;

  function spawnSpill() {
    const rect = canvas.getBoundingClientRect();
    const k = rect.width / W;              // 頁面像素 / 邏輯座標
    spills.push({
      x: rect.left + (CHUTE.x + (Math.random() - 0.5) * 10) * k,
      y: rect.top + CHUTE.y * k,
      vx: (60 + Math.random() * 260) * k,
      vy: (40 + Math.random() * 40) * k,
      g: 1500 * k,
      r: BALL_R * k,
      lipY: rect.top + 1030 * k,           // 托盤前緣
      bounced: false,
    });
  }

  function updateSpills(dt) {
    for (let i = spills.length - 1; i >= 0; i--) {
      const s = spills[i];
      s.vy += s.g * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // 先在堆滿的珠子上彈一下，再翻過前緣掉下去
      if (!s.bounced && s.y >= s.lipY - s.r) {
        s.y = s.lipY - s.r;
        s.vy = -Math.abs(s.vy) * 0.35;
        s.vx *= 1.15;
        s.bounced = true;
        Sound.clink(300);
      }
      if (s.y - s.r > window.innerHeight || s.x + s.r < 0 || s.x - s.r > window.innerWidth) {
        spills.splice(i, 1);
        Sound.floor();
      }
    }
  }

  function drawSpills() {
    if (!spills.length && !spillDirty) return;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(window.innerWidth * dpr), ph = Math.round(window.innerHeight * dpr);
    if (spillCanvas.width !== pw || spillCanvas.height !== ph) {
      spillCanvas.width = pw;
      spillCanvas.height = ph;
    }
    spillCtx.setTransform(1, 0, 0, 1, 0, 0);
    spillCtx.clearRect(0, 0, pw, ph);
    spillCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of spills) {
      const S = s.r * (BALL_R + 1) / BALL_R;
      spillCtx.drawImage(sprites.tray, s.x - S, s.y - S, S * 2, S * 2);
    }
    spillDirty = spills.length > 0;
  }

  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(staticCanvas, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawLeds(t);
    if (mode === 'adv') drawAdvScreen(t);
    drawShooter();
    if (ball) {
      drawShadow(ball.x + 2.5, ball.y + 3.5, 0.9);
      drawBall(ball.x, ball.y, sprites.board);
    }
    drawPopups();
    if (mode === 'adv') drawAdvMessage(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(glassCanvas, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawKnob();
    drawButton(t);
    drawDisplay();
    drawTray();
    drawTweens();
    drawHints(t);
    drawSpills();
  }

  // ===== 介面 =====
  const $ = id => document.getElementById(id);
  const overlay = $('overlay');
  const msgEls = document.querySelectorAll('[data-msg]');   // 手機精簡列和桌機面板各一個
  const helpDlg = $('help');
  const creditsEl = $('credits'), betEl = $('bet'), multEl = $('mult'), winEl = $('win'), bestEl = $('best'), bestWinEl = $('best-win');
  const powerEl = $('power-fill');
  const fireBtn = $('fire');
  const byAction = name => document.querySelectorAll(`[data-action="${name}"]`);
  const shown = {};

  function setText(el, key, val) {
    if (shown[key] !== val) { shown[key] = val; el.textContent = val; }
  }

  function updateHud() {
    setText(creditsEl, 'credits', state.credits);
    setText(betEl, 'bet', round.bet);
    setText(multEl, 'mult', '×' + mult());
    setText(winEl, 'win', state.lastWin === null ? '-' : state.lastWin);
    setText(bestEl, 'best', mode === 'adv' ? adv.losses : state.best);
    setText(bestWinEl, 'bestWin', mode === 'adv' ? adv.wins : state.bestWin);
    powerEl.style.width = (state.power * 100).toFixed(1) + '%';
  }

  window.addEventListener('keydown', e => {
    if (helpDlg.open) return;   // 說明視窗開著時不操作機台（Esc 會關閉視窗）
    if (e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.code === 'Enter')) e.preventDefault();
    if (e.repeat) return;
    switch (e.code) {
      case 'Space': case 'ArrowDown': e.preventDefault(); startCharge(); break;
      case 'KeyB': startBetHold(); break;
      case 'KeyX': addMult(); break;
      case 'KeyD': lockLights(); break;
      case 'KeyC': case 'Enter': e.preventDefault(); insertCoin(); break;
      case 'KeyM': toggleMute(); break;
      case 'KeyH': openHelp(); break;
      case 'KeyL': toggleLang(); break;
      case 'KeyQ': switchMode(); break;
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'ArrowDown') release();
    if (e.code === 'KeyB') stopBetHold();
  });

  function toLogical(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width * W, y: (e.clientY - rect.top) / rect.height * H };
  }
  function hitTarget(p) {
    for (const [key, hole] of Object.entries(HOLES)) {
      const hit = hole.r ? Math.hypot(p.x - hole.x, p.y - hole.y) < hole.r + 14
        : Math.abs(p.x - hole.x) < 34 && Math.abs(p.y - hole.y) < 28;
      if (hit) return key;
    }
    if (Math.hypot(p.x - BUTTON.x, p.y - BUTTON.y) < 32) return 'button';
    if (mode === 'classic' && Math.abs(p.x - COIN_SLOT.x) < 34 && Math.abs(p.y - COIN_SLOT.y) < 50) return 'coin';
    return null;
  }

  canvas.addEventListener('pointerdown', e => {
    const target = hitTarget(toLogical(e));
    e.preventDefault();
    if (target === 'bet') {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 同下 */ }
      startBetHold();
    }
    else if (target === 'mult') addMult();
    else if (target === 'button') lockLights();
    else if (target === 'coin') insertCoin();
    else {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 指標已失效時不影響蓄力 */ }
      startCharge();
    }
  });
  canvas.addEventListener('pointerup', () => { stopBetHold(); release(); });
  // 手機：檯面上連點不要觸發瀏覽器的雙擊放大、雙指縮放（操作改用上面的 pointer 事件）
  const noZoom = e => { if (e.cancelable) e.preventDefault(); };
  canvas.addEventListener('touchstart', noZoom, { passive: false });
  canvas.addEventListener('touchend', noZoom, { passive: false });
  document.addEventListener('dblclick', noZoom, { passive: false });
  document.addEventListener('gesturestart', noZoom, { passive: false });   // iOS Safari 雙指縮放
  canvas.addEventListener('pointercancel', () => { stopBetHold(); release(); });
  canvas.addEventListener('pointermove', e => {
    canvas.style.cursor = hitTarget(toLogical(e)) ? 'pointer' : 'default';
  });

  fireBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { fireBtn.setPointerCapture(e.pointerId); } catch (err) { /* 同上 */ }
    fireBtn.classList.add('pressed');
    startCharge();
  });
  const endFire = () => { fireBtn.classList.remove('pressed'); release(); };
  fireBtn.addEventListener('pointerup', endFire);
  fireBtn.addEventListener('pointercancel', endFire);


  // ---- 遊戲模式的畫面切換 ----
  const ovTitle = $('ov-title'), ovText = $('ov-text'), ovBtn = $('overlay-coin');
  function refreshOverlay() {
    let show = false, title = '', text = '', btn = '';
    if (mode === 'classic') {
      show = !state.started;
      title = t('title'); text = t('overlayText'); btn = t('overlayCoin');
    } else if (adv.status === 'intro') {
      show = true;
      title = t('advTitle'); text = t('advIntro', { n: ADV_BALLS }); btn = t('advStart');
    } else if (adv.status === 'won' && adv.endT <= 0) {
      show = true;
      title = t('advWinTitle'); text = t('advWinText', { name: monsterName(), left: state.credits }); btn = t('advAgain');
    } else if (adv.status === 'lost' && adv.endT <= 0) {
      show = true;
      title = t('advLoseTitle'); text = t('advLoseText', { name: monsterName(), hp: adv.hp }); btn = t('advRetry');
    }
    overlay.classList.toggle('hidden', !show);
    overlay.classList.toggle('below-screen', mode === 'adv');
    ovTitle.textContent = title;
    ovText.textContent = text;
    ovBtn.textContent = btn;
  }

  function overlayPrimary() {
    if (mode === 'classic') insertCoin();
    else startAdventure();
  }

  function applyMode() {
    document.body.dataset.mode = mode;
    applyLang();
  }

  function toggleMute() {
    Sound.muted = !Sound.muted;
    for (const el of byAction('mute')) el.textContent = Sound.muted ? '🔇' : '🔊';
  }

  // 切換語言：更新頁面文字、重畫機台上的字、重新顯示目前的訊息
  function applyLang() {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant-TW' : 'en';
    document.title = t('title');
    for (const el of document.querySelectorAll('[data-i18n]')) {
      el.textContent = t(mode === 'adv' && el.dataset.i18nAdv ? el.dataset.i18nAdv : el.dataset.i18n);
    }
    for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
    for (const el of document.querySelectorAll('[data-lang]')) el.hidden = el.dataset.lang !== lang;
    drawStatic();
    refreshOverlay();
    say(...lastMsg);
  }

  function toggleLang() {
    lang = lang === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('candy-pinball-lang', lang); } catch (e) { /* 無痕模式 */ }
    applyLang();
  }

  function openHelp() {
    release();
    const records = { bestWin: state.bestWin, best: state.best, advWins: adv.wins, advLosses: adv.losses };
    for (const el of document.querySelectorAll('[data-record]')) el.textContent = records[el.dataset.record];
    helpDlg.showModal();
  }

  for (const el of byAction('coin')) el.addEventListener('click', insertCoin);
  for (const el of byAction('help')) el.addEventListener('click', openHelp);
  for (const el of byAction('lang')) el.addEventListener('click', toggleLang);
  for (const el of byAction('mute')) el.addEventListener('click', toggleMute);
  helpDlg.addEventListener('click', e => { if (e.target === helpDlg) helpDlg.close(); });   // 點背景關閉
  $('overlay-coin').addEventListener('click', overlayPrimary);
  for (const el of byAction('mode')) el.addEventListener('click', switchMode);
  {
    const btn = $('bet-btn');
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* 同上 */ }
      btn.classList.add('pressed');
      startBetHold();
    });
    const end = () => { btn.classList.remove('pressed'); stopBetHold(); };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
  }
  $('mult-btn').addEventListener('click', addMult);
  $('lock-btn').addEventListener('click', lockLights);
  window.addEventListener('blur', () => { stopBetHold(); release(); });

  // 依「實際看得到的範圍」縮放機台：手機瀏覽器的網址列、工具列會吃掉高度，
  // 單靠 CSS 的 100vh / 100dvh 在部分瀏覽器會把機台底部切掉
  const appEl = document.querySelector('.app');
  const stageEl = document.querySelector('.stage');
  const cabinetEl = document.querySelector('.cabinet');
  function fitLayout() {
    const vv = window.visualViewport;
    const vh = Math.min(window.innerHeight, vv ? vv.height * vv.scale : Infinity);
    appEl.style.height = Math.floor(vh) + 'px';
    // 桌機有右側面板時，機台寬度 = 視窗寬 - 左右 padding - 間距 - 面板寬；手機版直接用機台區的寬
    const panel = document.querySelector('.panel');
    const availW = panel.offsetWidth ? appEl.clientWidth - 32 - 24 - panel.offsetWidth : stageEl.clientWidth;
    const availH = stageEl.clientHeight;
    const w = Math.max(1, Math.floor(Math.min(availW, availH * W / H)));
    cabinetEl.style.width = w + 'px';
    cabinetEl.style.height = Math.floor(w * H / W) + 'px';
  }
  window.addEventListener('resize', fitLayout);
  window.addEventListener('orientationchange', () => setTimeout(fitLayout, 200));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitLayout);
  if ('ResizeObserver' in window) new ResizeObserver(fitLayout).observe(stageEl);
  fitLayout();

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  newRound();
  applyMode();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    update(dt);
    render(now / 1000);
    updateHud();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
