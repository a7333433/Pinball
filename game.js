(() => {
  'use strict';

  // 版本號：每次推送前要跟著 CHANGELOG.md 一起更新（index.html 的 ?v= 也要改）
  const VERSION = '1.6.0';

  // ===== 規則 =====
  // 倍率規則依模式不同（倍率越高，亮的燈越少）：
  // 經典：2/4/6/8/10 倍，倍率孔每升一段扣 2 顆，亮燈 5 → 1
  // 大冒險：從 ×1 起跳，倍率孔每投 1 顆 +1 倍、少一顆燈，×1 亮 7 顆 … ×7 亮 1 顆
  const MULT_RULES = {
    classic: { mults: [2, 4, 6, 8, 10], cost: 2 },
    adv: { mults: [1, 2, 3, 4, 5, 6, 7], cost: 1 },
  };
  // 寶箱關卡：燈全亮、不加倍；倍率孔每投 1 顆升一級寶箱（最多 3 顆）
  const CHEST_RULE = { mults: [1, 1, 1, 1], cost: 1 };
  const multRule = () => chestStage() ? CHEST_RULE : MULT_RULES[mode];
  const litFor = level => multRule().mults.length - level;
  const COIN_BALLS = 20;      // 投一次幣換幾顆彈珠
  const SLOT_COUNT = 11;      // 底部落點數，每一排一顆 LED



  // ===== 彈珠台大冒險：怪物 =====
  const ADV_BALLS = 50;       // 每場冒險有幾顆彈珠
  const BET_CAP = 3;          // 大冒險每回合最多投幾顆珠（過關獎勵「投珠上限」可以提高）
  const REFILL_MULT = 2;      // 補珠燈：每顆落進補珠燈的珠補 2 顆彈珠（這回合第一次中還會退回倍率孔的珠）
  const CAMPAIGN_BONUS = 15;  // 冒險模式：每過一關額外補幾顆彈珠（剩下的彈珠也會帶到下一關）
  // 等級：每打倒一隻怪物升 1 級（從 Lv1 開始），每升一級過關補珠 +LEVEL_BONUS，每 2 級每顆珠攻擊 +1
  const LEVEL_BONUS = 2;
  // ===== 寶箱與道具 =====
  // 道具等級：白燈一般、藍燈稀有、紫燈史詩、橘燈傳說
  const TIERS = [
    { name: { zh: '一般', en: 'Common' }, color: '#e5e7eb', led: 'white' },
    { name: { zh: '稀有', en: 'Rare' }, color: '#60a5fa', led: 'blue' },
    { name: { zh: '史詩', en: 'Epic' }, color: '#c084fc', led: 'purple' },
    { name: { zh: '傳說', en: 'Legendary' }, color: '#fb923c', led: 'orange' },
  ];
  // 寶箱投 1 / 2 / 3 顆倍率珠時，累加幾排藍 / 紫 / 橘燈（其餘都是白燈）
  const CHEST_LANES = [0, 3, 2, 1];
  // when：pre = 定燈前、post = 定燈後（發射前）、both = 兩者都可
  const ITEMS = {
    coin: {
      tier: 0, when: 'both',
      name: { zh: '銀幣', en: 'Silver Coin' },
      quote: { zh: '「我要十圓。」── 小屁孩', en: '"I want ten bucks." — Some brat' },
      effect: { zh: '持珠數增加 10 + 第幾關 顆（目前 {n} 顆）', en: '+10 balls plus the stage number (now {n})' },
    },
    laserRed: {
      tier: 0, when: 'pre',
      name: { zh: '雷射筆（紅）', en: 'Red Laser Pointer' },
      quote: { zh: '請勿對眼睛照射。', en: 'Do not shine into eyes.' },
      effect: { zh: '這一關攻擊燈數增加 1', en: '+1 attack light for the rest of this stage' },
    },
    fake: {
      tier: 0, when: 'both',
      name: { zh: '假彈珠', en: 'Fake Marble' },
      quote: { zh: '「這人怎麼彈珠打不完？」── 柑仔店老闆', en: '"How does this kid never run out of marbles?" — The shopkeeper' },
      effect: { zh: '這回合倍率和投珠數各免費 +1（定燈後只會加投珠數）', en: 'This round: free +1 multiplier and +1 bet (only +1 bet after locking)' },
    },
    laserGreen: {
      tier: 0, when: 'pre',
      name: { zh: '雷射筆（綠）', en: 'Green Laser Pointer' },
      quote: { zh: '請勿對眼睛照射，即使他是有益色。', en: 'Do not shine into eyes, even if green is good for them.' },
      effect: { zh: '這一關補珠燈數增加 1', en: '+1 refill light for the rest of this stage' },
    },
    stone: {
      tier: 0, when: 'both',
      name: { zh: '石頭', en: 'Stone' },
      quote: { zh: '一顆手感不錯的石頭。', en: 'A stone that feels nice in the hand.' },
      effect: { zh: '對怪物造成 3 + 2 × 第幾關 + 攻擊加成 點無視防禦的傷害，可以暴擊（目前 {n} 點）', en: 'Deals 3 + 2 × stage + your attack bonus damage that ignores DEF and can crit (now {n})' },
    },
    acid: {
      tier: 1, when: 'both',
      name: { zh: '鹽酸', en: 'Hydrochloric Acid' },
      quote: { zh: '掃廁所必備。', en: 'A must for cleaning toilets.' },
      effect: { zh: '怪物的防禦減少 1', en: 'Monster DEF −1' },
    },
    heavy: {
      tier: 1, when: 'both',
      name: { zh: '沉重彈珠', en: 'Heavy Marble' },
      quote: { zh: '造成拉桿彈簧疲勞的兇手。', en: 'The reason the plunger spring wore out.' },
      effect: { zh: '這回合每顆彈珠的基本傷害增加 1', en: 'Base damage per ball +1 this round' },
    },
    hourglass: {
      tier: 2, when: 'both',
      name: { zh: '沙漏', en: 'Hourglass' },
      quote: { zh: '現在放的是正的還是反的？', en: 'Is it right side up or upside down right now?' },
      effect: { zh: '這回合的鋼珠全部落下後，先預告每顆的結果，可以選擇保留或返回上回合', en: 'After every ball lands this round, preview the results, then keep them or rewind the round' },
    },
    drink: {
      tier: 2, when: 'post',
      name: { zh: '鋁箔包飲料', en: 'Juice Box' },
      quote: { zh: '「嘶～～～～」', en: '"Slurrrrp~"' },
      effect: { zh: '把亮著的紅燈全部變成補珠燈', en: 'Turns every lit red light into a refill light' },
    },
    key: {
      tier: 3, when: 'both',
      name: { zh: '柑仔店老闆的鑰匙', en: 'The Shopkeeper\'s Key' },
      quote: { zh: '好像可以開啟某個重要的鎖。', en: 'Looks like it opens something important.' },
      effect: { zh: '拿回這一關已失去的彈珠（目前 {n} 顆）', en: 'Get back the balls lost in this stage (now {n})' },
    },
    shake: {
      tier: 3, when: 'post',
      name: { zh: '搖晃機台', en: 'Shake the Machine' },
      quote: { zh: '「你不能那樣做！」── 柑仔店老闆', en: '"You can\'t do that!" — The shopkeeper' },
      effect: { zh: '把 1 顆彈珠直接放在檯面上任何地方，讓它從那裡落下，這顆珠的傷害 ×3（其他的珠照常發射）', en: 'Drop 1 ball anywhere on the board; that ball deals ×3 damage (the rest are shot as usual)' },
    },
  };
  const ITEM_IDS = Object.keys(ITEMS);

  // ===== 暴擊、過關獎勵（冒險模式） =====
  const CRIT_BASE_RATE = 0.05;    // 基礎暴擊機率 5%
  const CRIT_BASE_MULT = 1.5;     // 基礎暴擊傷害倍率 150%
  // 每打倒一隻怪物（最後一隻除外）從這裡隨機抽 3 樣選 1 樣，效果持續整個冒險、可以疊加
  const BOONS = {
    balls: { name: { zh: '彈珠補給', en: 'Ball Supply' }, desc: { zh: '持有彈珠數增加 10', en: '+10 balls' } },
    perBall: { name: { zh: '每珠增傷', en: 'Per-ball Damage' }, desc: { zh: '每顆投珠增加攻擊力 1（扣防禦前）', en: '+1 attack per ball bet (before DEF)' } },
    multBase: { name: { zh: '基礎倍率', en: 'Base Multiplier' }, desc: { zh: '倍率從 ×1 改成多 1 倍起跳（每段倍率都 +1）', en: 'Every multiplier step is ×1 higher' } },
    litUp: { name: { zh: '攻擊燈數', en: 'More Red Lights' }, desc: { zh: '每回合紅燈（攻擊燈）多亮 1 顆', en: '+1 red (attack) light every round' } },
    pierce: { name: { zh: '穿透傷害', en: 'Piercing' }, desc: { zh: '攻擊打破防禦時，追加 1 點忽視防禦的傷害', en: '+1 damage that ignores DEF on hits that break DEF' } },
    weight: { name: { zh: '加重彈珠', en: 'Heavier Marble' }, desc: { zh: '彈珠重量增加 0.5（撞釘子彈得比較低、比較不會亂跳）', en: 'Marble weight +0.5 (bounces lower and jitters less)' } },
    pin: { name: { zh: '拔釘子', en: 'Fewer Pins' }, desc: { zh: '落珠區的釘子隨機減少 5 根，之後每關也少長 5 根', en: 'Removes 5 random pins now, and 5 fewer grow in every later stage' } },
    refill: { name: { zh: '補珠加量', en: 'Bigger Refills' }, desc: { zh: '補珠燈補珠時多得 1 顆', en: '+1 ball on every refill light' } },
    refillLight: { name: { zh: '補珠燈數', en: 'More Refill Lights' }, desc: { zh: '每回合補珠燈多 1 顆', en: '+1 refill light every round' } },
    chestRare: { name: { zh: '寶箱升級', en: 'Better Chests' }, desc: { zh: '寶箱關卡的稀有（藍）燈 +1、一般（白）燈 −1', en: 'Chests get +1 rare (blue) lane, −1 common (white) lane' } },
    critRate: { name: { zh: '暴擊率', en: 'Crit Rate' }, desc: { zh: '暴擊機率增加 20%', en: 'Crit chance +20%' } },
    critDmg: { name: { zh: '暴擊傷害', en: 'Crit Damage' }, desc: { zh: '暴擊傷害倍率增加 50%', en: 'Crit damage +50%' } },
    betCap: { name: { zh: '投珠上限', en: 'Bet Limit' }, desc: { zh: '每回合投珠上限 +2', en: '+2 max bet per round' } },
    // 天賦專屬：只有選了該天賦才抽得到
    armor: { talent: 'alloy', name: { zh: '破甲合金', en: 'Armor Breaker' }, desc: { zh: '攻擊時無視 1 點防禦', en: 'Attacks ignore 1 DEF' } },
    light: { talent: 'alloy', name: { zh: '輕量合金', en: 'Light Alloy' }, desc: { zh: '每回合倍率孔多 1 段免費', en: '1 more free multiplier step every round' } },
    chainCrit: { talent: 'alloy', name: { zh: '連鎖暴擊', en: 'Chain Crit' }, desc: { zh: '同一回合內每暴擊一次，這回合後面的珠攻擊 +1（下回合歸零）', en: 'Each crit gives the later balls this round +1 attack (resets next round)' } },
    kindle: { talent: 'burn', name: { zh: '助燃', en: 'Kindling' }, desc: { zh: '每次命中多疊 1 層燃燒', en: '+1 extra burn per hit' } },
    smolder: { talent: 'burn', name: { zh: '悶燒', en: 'Smolder' }, desc: { zh: '回合結束燃燒後保留更多層（減半 → 保留 2/3 → 3/4…）', en: 'Burn decays slower after each round (½ → ⅔ → ¾ kept…)' } },
    tinder: { talent: 'burn', name: { zh: '火種', en: 'Tinder' }, desc: { zh: '落進補珠燈也疊 1 層燃燒', en: 'Refill lights also add 1 burn' } },
    rend: { talent: 'trauma', name: { zh: '撕裂', en: 'Rend' }, desc: { zh: '外傷傷害比例 +25%', en: 'Grind damage +25% of balls refilled' } },
    shatter: { talent: 'trauma', name: { zh: '碎甲', en: 'Shatter' }, desc: { zh: '外傷觸發時這隻怪物防禦 −1（每回合最多一次）', en: 'Grind lowers this monster\u2019s DEF by 1 (once per round)' } },
    roll: { talent: 'trauma', name: { zh: '滾動補給', en: 'Rolling Supply' }, desc: { zh: '沒落進任何燈的珠退回 1 顆', en: 'Balls that land on no light come back' } },
  };
  const BOON_IDS = Object.keys(BOONS);
  // 天賦：冒險模式開始前選 1 個，效果持續整趟冒險
  const TALENTS = {
    alloy: { name: { zh: '合金鋼珠', en: 'Alloy Marble' }, desc: { zh: '每顆珠攻擊 +1（扣防禦前）、暴擊率 +15%', en: '+1 attack per ball (before DEF), +15% crit chance' } },
    burn: { name: { zh: '燒紅彈珠', en: 'Red-hot Marble' }, desc: { zh: '每次落進攻擊燈讓怪物燃燒 +1 層；每回合結束受到「層數」點無視防禦的傷害，之後層數減半', en: 'Each red-light hit adds 1 burn; at round end the monster takes burn damage (ignores DEF), then burn halves' } },
    trauma: { name: { zh: '外傷滾珠', en: 'Grinding Marble' }, desc: { zh: '落進補珠燈時照常補珠，另外造成等於補珠數的無視防禦傷害', en: 'Refill lights still pay out, and also deal damage equal to the balls refilled (ignores DEF)' } },
  };
  const TALENT_IDS = Object.keys(TALENTS);
  let talentPick = 'alloy';
  try { const s = localStorage.getItem('candy-pinball-talent'); if (TALENTS[s]) talentPick = s; } catch (e) { /* 無痕模式 */ }
  // 道具的 12×12 像素圖示（背包、寶箱結果、說明、怪物螢幕都用這個）
  const LASER_MAP = [
      '.........RRR',
      '........RRR.',
      '.......RR...',
      '......KW....',
      '.....KSSK...',
      '....KSSK....',
      '...KSBK.....',
      '..KSSK......',
      '.KSSK.......',
      'KSSK........',
      'KKK.........',
      '............',
    ];
  const ITEM_ICONS = {
    coin: {
      pal: { K: '#3f3f46', S: '#d4d4d8', W: '#ffffff', D: '#a1a1aa' },
      map: [
        '...KKKKKK...',
        '..KSSSSSSK..',
        '.KSWWSSSSDK.',
        'KSWSKSSKKSDK',
        'KSWKKSKSSKDK',
        'KSSSKSKSSKDK',
        'KSSSKSKSSKDK',
        'KSSSKSKSSKDK',
        'KSSKKKSKKSDK',
        '.KSSSSSSSDK.',
        '..KDDDDDDK..',
        '...KKKKKK...',
      ],
    },
    laserRed: { pal: { K: '#1f2937', S: '#9ca3af', W: '#fff0f0', B: '#ef4444', R: '#ff3b3b' }, map: LASER_MAP },
    laserGreen: { pal: { K: '#1f2937', S: '#9ca3af', W: '#effff5', B: '#22c55e', R: '#22e07a' }, map: LASER_MAP },
    fake: {
      pal: { K: '#4a044e', S: '#f9a8d4', W: '#ffffff', D: '#db2777' },
      map: [
        '...KKKKKK...',
        '..KSSSSSSK..',
        '.KSWWSSSSSK.',
        'KSWWSKKKSSDK',
        'KSWSKSSSKSDK',
        'KSSSSSSKSSDK',
        'KSSSSSKSSSDK',
        'KSSSSKSSSSDK',
        'KSSSSSSSSSDK',
        '.KSSSKSSSDK.',
        '..KDDDDDDK..',
        '...KKKKKK...',
      ],
    },
    stone: {
      pal: { K: '#292524', S: '#a8a29e', D: '#78716c', W: '#e7e5e4' },
      map: [
        '............',
        '............',
        '....KKKK....',
        '..KKSSSSKK..',
        '.KSWSSSSSSK.',
        '.KSWSSDSSSDK',
        'KSSSSSSSSDDK',
        'KSSSDSSSSSDK',
        'KSSSSSSSDDK.',
        '.KDDSSSDDDK.',
        '..KKDDDDKK..',
        '....KKKK....',
      ],
    },
    acid: {
      pal: { K: '#1a2e05', G: '#a3e635', W: '#ecfccb', R: '#dc2626', Y: '#facc15' },
      map: [
        '....KKKK....',
        '....KRRK....',
        '....KKKK....',
        '....KWGK....',
        '...KWGGGK...',
        '..KWGGGGGK..',
        '..KWKKKKGK..',
        '..KWKYYKGK..',
        '..KWKKKKGK..',
        '..KWGGGGGK..',
        '..KGGGGGGK..',
        '...KKKKKK...',
      ],
    },
    heavy: {
      pal: { K: '#0b0f17', D: '#4b5563', S: '#1f2937', W: '#d1d5db', Y: '#9ca3af' },
      map: [
        '...KKKKKK...',
        '..KDDDDDDK..',
        '.KDWWDDDDDK.',
        'KDWWDDDDDDSK',
        'KDWDDDDDDDSK',
        'KDDDDDDDDDSK',
        'KDDDDDDDDSSK',
        'KDDDDDDDSSSK',
        '.KDDDDDSSSK.',
        '..KSSSSSSK..',
        '...KKKKKK...',
        'Y.Y......Y.Y',
      ],
    },
    hourglass: {
      pal: { B: '#8b4a1c', K: '#5b3a1e', G: '#bfdbfe', Y: '#fbbf24' },
      map: [
        'BBBBBBBBBBBB',
        '.K........K.',
        '.KGYYYYYYGK.',
        '.K.GYYYYG.K.',
        '.K..GYYG..K.',
        '.K...GG...K.',
        '.K...GG...K.',
        '.K..G.YG..K.',
        '.K.G..Y.G.K.',
        '.KGYYYYYYGK.',
        '.K........K.',
        'BBBBBBBBBBBB',
      ],
    },
    drink: {
      pal: { K: '#451a03', O: '#f59e0b', W: '#fff7ed', R: '#dc2626', S: '#f472b6' },
      map: [
        '.......SS...',
        '......S.....',
        '......S.....',
        '......S.....',
        '..KKKKSKKK..',
        '..KOOOOOOK..',
        '..KOWWWWOK..',
        '..KOWRRWOK..',
        '..KOWRRWOK..',
        '..KOWWWWOK..',
        '..KOOOOOOK..',
        '..KKKKKKKK..',
      ],
    },
    key: {
      pal: { K: '#713f12', Y: '#facc15', W: '#fef9c3' },
      map: [
        '............',
        '............',
        '.KKKK.......',
        'KYWYYK......',
        'KY..YKKKKKK.',
        'KY..YYYYYYYK',
        'KY..YKKYKYKK',
        'KYYYYKKYKYK.',
        '.KKKK..K.K..',
        '............',
        '............',
        '............',
      ],
    },
    shake: {
      pal: { K: '#1f1f1f', R: '#c1121f', Y: '#fde68a', B: '#8b5a2b', W: '#fff36b', S: '#e5e7eb' },
      map: [
        'W..KKKKKK..W',
        'W.KRRRRRRK.W',
        '..KRYYYYRK..',
        'W.KRKYKYRK.W',
        'W.KRYKYKRK.W',
        '..KRKYKYRK..',
        'W.KRYYSYRK.W',
        'W.KRRRRRRK.W',
        '..KBBBBBBK..',
        '..KBBBBBBK..',
        '..KKKKKKKK..',
        '...K....K...',
      ],
    },
  };
  const CHEST = {
    bg: 'treasure',
    name: { zh: '寶箱', en: 'Treasure Chest' }, hp: 1, def: 0,
    pal: { K: '#2a1405', W: '#c98a4b', B: '#8b4a1c', G: '#d4a017', Y: '#ffe08a', R: '#ff5d73' },
    map: [
      '............',
      '............',
      '..KKKKKKKK..',
      '.KWWWWWWWWK.',
      'KWBBBBBBBBWK',
      'KBBBBBBBBBBK',
      'KGGGGYYGGGGK',
      'KBBBBYYBBBBK',
      'KBBBBKKBBBBK',
      'KBBBBBBBBBBK',
      'KGGGGGGGGGGK',
      '.KKKKKKKKKK.',
    ],
    // 打開後：蓋子往後掀，露出裡面的寶物
    open: [
      '.KKKKKKKKKK.',
      'KBBBBBBBBBBK',
      'KWWWWWWWWWWK',
      'KKKKKKKKKKKK',
      'KYYGYRYGYYYK',
      'KGGGGGGGGGGK',
      'KBBBBYYBBBBK',
      'KBBBBKKBBBBK',
      'KBBBBBBBBBBK',
      'KBBBBBBBBBBK',
      'KGGGGGGGGGGK',
      '.KKKKKKKKKK.',
    ],
  };
  CHEST.laugh = CHEST.map;

  // 12×12 像素圖：'.' 透明，其他字元對應 pal 的顏色
  // 投幾顆珠就一次發射幾顆，每顆各自結算：實際傷害 = 倍率 − 防禦（最少 0）
  // 每回合最多投 BET_CAP 顆，前期沒辦法一發打死
  // HP = 舊版 HP ×（1 + 0.15 × 第幾關）。依模擬（多顆發射、起始 50 顆、過關補 15 + 2×等級、有過關獎勵、
  // 不計道具、每回合選最划算的打法）：懂得選獎勵全破約 40%、隨便選約 8%，每隻約 20～30 回合
  const MONSTERS = [
    {
      bg: 'forest',
      name: { zh: '史萊姆', en: 'Slime' }, hp: 25, def: 0,
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
      bg: 'forest',
      name: { zh: '蘑菇怪', en: 'Mushroom' }, hp: 32, def: 0,
      pal: { K: '#2b0f0f', R: '#e53935', W: '#ffffff', S: '#f5deb3', P: '#ff8fa3' },
      map: [
        '............',
        '...KKKKKK...',
        '..KRRWRRRK..',
        '.KRWWRRWRRK.',
        'KRRRRRRWWRRK',
        'KRWRRRRRRRRK',
        'KKKKKKKKKKKK',
        '..KSSSSSSK..',
        '..KSKSSKSK..',
        '..KSSSSSSK..',
        '..KSSKKSSK..',
        '...KKKKKK...',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '............',
        '...KKKKKK...',
        '..KRRWRRRK..',
        '.KRWWRRWRRK.',
        'KRRRRRRWWRRK',
        'KRWRRRRRRRRK',
        'KKKKKKKKKKKK',
        '..KSKSSKSK..',
        '..KSSSSSSK..',
        '..KSKKKKSK..',
        '..KSKPPKSK..',
        '...KKKKKK...',
      ],
    },
    {
      bg: 'cave',
      name: { zh: '蝙蝠', en: 'Bat' }, hp: 42, def: 1,
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
      bg: 'cave',
      name: { zh: '蜘蛛', en: 'Spider' }, hp: 54, def: 1,
      pal: { K: '#111111', P: '#4a148c', V: '#7b1fa2', R: '#ff1744', W: '#ffffff' },
      map: [
        'K..........K',
        '.K...KK...K.',
        '..K.KPPK.K..',
        'KK.KPPPPK.KK',
        '..KPRPPRPK..',
        '.KPPPPPPPPK.',
        'K.KPVVVVPK.K',
        '.K.KPPPPK.K.',
        'K...KPPK...K',
        '.K..KKKK..K.',
        '..K......K..',
        '............',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        'K..........K',
        '.K...KK...K.',
        '..K.KPPK.K..',
        'KK.KPPPPK.KK',
        '..KPKPPKPK..',
        '.KPPPPPPPPK.',
        'K.KPKWWKPK.K',
        '.K.KPKKPK.K.',
        'K...KPPK...K',
        '.K..KKKK..K.',
        '..K......K..',
        '............',
      ],
    },
    {
      bg: 'graveyard',
      name: { zh: '幽靈', en: 'Ghost' }, hp: 67, def: 2,
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
      bg: 'graveyard',
      name: { zh: '南瓜頭', en: 'Pumpkin Head' }, hp: 84, def: 2,
      pal: { K: '#3e1f00', O: '#ff8c00', D: '#cc5500', G: '#2e7d32', Y: '#ffeb3b' },
      map: [
        '.....GG.....',
        '....GG......',
        '..KKKKKKKK..',
        '.KOODOODOOK.',
        'KOODOODOOOOK',
        'KOYYOOOOYYOK',
        'KOYKOOOOKYOK',
        'KOOOOYYOOOOK',
        'KOYOYOOYOYOK',
        'KOOYYYYYYOOK',
        '.KOODOODOOK.',
        '..KKKKKKKK..',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '.....GG.....',
        '....GG......',
        '..KKKKKKKK..',
        '.KOODOODOOK.',
        'KOODOODOOOOK',
        'KOOOOOOOOOOK',
        'KOYYYOOYYYOK',
        'KOOOOYYOOOOK',
        'KOYYYYYYYYOK',
        'KOYKKKKKKYOK',
        '.KOYYYYYYOK.',
        '..KKKKKKKK..',
      ],
    },
    {
      bg: 'graveyard',
      name: { zh: '僵屍', en: 'Zombie' }, hp: 104, def: 3,
      pal: { K: '#141a10', G: '#7fb069', D: '#4a6b3a', C: '#5b4b8a', W: '#f5f5f5', R: '#c0392b' },
      map: [
        '...KKKKKK...',
        '..KGGGGDGK..',
        '.KGGDGGGGGK.',
        '.KGWKGGKWGK.',
        '.KGGGGGGDGK.',
        '.KGKKKKKKGK.',
        '.KGDGKGDGGK.',
        '..KGGGGGGK..',
        '.KCCKGGKCCK.',
        'KCCCCKKCCCCK',
        'KCCDCCCCDCCK',
        'KKKKKKKKKKKK',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '...KKKKKK...',
        '..KGGGGDGK..',
        '.KGGDGGGGGK.',
        '.KGGKGGKGGK.',
        '.KGKGKKGKGK.',
        '.KGKKKKKKGK.',
        '.KGKRRRRKGK.',
        '..KGKKKKGK..',
        '.KCCKGGKCCK.',
        'KCCCCKKCCCCK',
        'KCCDCCCCDCCK',
        'KKKKKKKKKKKK',
      ],
    },
    {
      bg: 'ruins',
      name: { zh: '木乃伊', en: 'Mummy' }, hp: 135, def: 3,
      pal: { K: '#2b2b2b', W: '#e8e2d0', D: '#b8ae96', R: '#ff3b3b' },
      map: [
        '...KKKKKK...',
        '..KWWDWWWK..',
        '.KDWWWWDWWK.',
        '.KWRKWWRKWK.',
        '.KWWWWWWWDK.',
        '.KDWWKKWWWK.',
        '..KWWWWWDK..',
        '.KWDWWWWWWK.',
        'KWWWDWWWDWWK',
        'KWDWWWWWWWDK',
        '.KWWKWWKWWK.',
        '..KK.KK.KK..',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '...KKKKKK...',
        '..KWWDWWWK..',
        '.KDWWWWDWWK.',
        '.KWKKWWKKWK.',
        '.KWWWWWWWDK.',
        '.KDWKRRKWWK.',
        '..KWWKKWDK..',
        '.KWDWWWWWWK.',
        'KWWWDWWWDWWK',
        'KWDWWWWWWWDK',
        '.KWWKWWKWWK.',
        '..KK.KK.KK..',
      ],
    },
    {
      bg: 'crypt',
      name: { zh: '骷髏', en: 'Skeleton' }, hp: 172, def: 4,
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
      bg: 'crypt',
      name: { zh: '吸血鬼', en: 'Vampire' }, hp: 216, def: 4,
      pal: { K: '#120012', S: '#e0d6e8', H: '#1a1a2e', R: '#d50000', C: '#4a0d1a', W: '#ffffff' },
      map: [
        '..KKKKKKKK..',
        '.KHHHHHHHHK.',
        '.KHHSSSSHHK.',
        '.KHSSSSSSHK.',
        '.KSRKSSRKSK.',
        '.KSSSSSSSSK.',
        '.KSSWKKWSSK.',
        'KCKSSSSSSKCK',
        'KCCKKKKKKCCK',
        'KCRCCCCCCRCK',
        'KCRCCCCCCRCK',
        '.KKKKKKKKKK.',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '..KKKKKKKK..',
        '.KHHHHHHHHK.',
        '.KHHSSSSHHK.',
        '.KHSSSSSSHK.',
        '.KSKKSSKKSK.',
        '.KSSSSSSSSK.',
        '.KSWKRRKWSK.',
        'KCKSKKKKSKCK',
        'KCCKKKKKKCCK',
        'KCRCCCCCCRCK',
        'KCRCCCCCCRCK',
        '.KKKKKKKKKK.',
      ],
    },
    {
      bg: 'hell',
      name: { zh: '小惡龍', en: 'Baby Dragon' }, hp: 265, def: 5,
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
    {
      bg: 'hell',
      name: { zh: '地獄犬', en: 'Hellhound' }, hp: 318, def: 5,
      pal: { K: '#1a0000', B: '#3d0c02', R: '#ff3d00', Y: '#ffd600', W: '#ffffff' },
      map: [
        '.K........K.',
        'KRK......KRK',
        'KBBK....KBBK',
        'KBBBKKKKBBBK',
        'KBYKBBBBKYBK',
        'KBBBBBBBBBBK',
        '.KBBBKKBBBK.',
        '.KBWBBBBWBK.',
        '..KBKKKKBK..',
        '.KRBBBBBBRK.',
        'KRK.KBBK.KRK',
        'K...KKKK...K',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '.K........K.',
        'KRK......KRK',
        'KBBK....KBBK',
        'KBBBKKKKBBBK',
        'KBKKBBBBKKBK',
        'KBBBBBBBBBBK',
        '.KBBBKKBBBK.',
        '.KWKRRRRKWK.',
        '..KBKKKKBK..',
        '.KRBBBBBBRK.',
        'KRK.KBBK.KRK',
        'K...KKKK...K',
      ],
    },
    {
      bg: 'ruins',
      name: { zh: '石像怪', en: 'Gargoyle' }, hp: 375, def: 6,
      pal: { K: '#1f1f24', S: '#8b8f99', D: '#5f636c', R: '#ff3b3b' },
      map: [
        'K.K......K.K',
        'KSK.KKKK.KSK',
        'KSSKSSSSKSSK',
        'KSSSSSSSSSSK',
        'KSSKRSSRKSSK',
        'KSSSSSSSSSSK',
        '.KSSKKKKSSK.',
        '..KSSDDSSK..',
        '.KSSSSSSSSK.',
        'KSKSSSSSSKSK',
        'KK.KSKKSK.KK',
        '...KK..KK...',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        'K.K......K.K',
        'KSK.KKKK.KSK',
        'KSSKSSSSKSSK',
        'KSSSSSSSSSSK',
        'KSSKKSSKKSSK',
        'KSSSSSSSSSSK',
        '.KSKKKKKKSK.',
        '..KSKRRKSK..',
        '.KSSSSSSSSK.',
        'KSKSSSSSSKSK',
        'KK.KSKKSK.KK',
        '...KK..KK...',
      ],
    },
    {
      bg: 'crypt',
      name: { zh: '巫妖', en: 'Lich' }, hp: 496, def: 7,
      pal: { K: '#0a0a12', P: '#311b92', V: '#6a1b9a', B: '#e0e0e0', G: '#76ff03', Y: '#ffd600' },
      map: [
        '..Y.Y..Y.Y..',
        '..YYYYYYYY..',
        '..KBBBBBBK..',
        '..KBGKKGBK..',
        '..KBBKKBBK..',
        '...KBBBBK...',
        '.KPKBKBKKPK.',
        'KPPVKKKKVPPK',
        'KPVPPPPPPVPK',
        'KPPVPPPPVPPK',
        '.KPPPVVPPPK.',
        '..KKKKKKKK..',
      ],
      // 竊笑時的表情：眼睛瞇起來、嘴巴張開
      laugh: [
        '..Y.Y..Y.Y..',
        '..YYYYYYYY..',
        '..KBBBBBBK..',
        '..KKGBBGKK..',
        '..KBBKKBBK..',
        '...KKGGKK...',
        '.KPKBKBKKPK.',
        'KPPVKKKKVPPK',
        'KPVPPPPPPVPK',
        'KPPVPPPPVPPK',
        '.KPPPVVPPPK.',
        '..KKKKKKKK..',
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
      betInfoAdv: '投珠 {bet}/{cap} 顆，發射時一次射出 {bet} 顆；每顆 {mult} 倍，中了造成 {win} 點傷害',
      betInfoAdvDef: '投珠 {bet}/{cap} 顆，發射時一次射出 {bet} 顆；每顆 {mult} 倍扣掉防禦 {def}，中了造成 {win} 點傷害',
      betCapMsg: '每回合最多投 {n} 顆珠（過關獎勵可以提高上限）', itemBetCap: '投珠已經到上限了',
      multLocked: '燈已經定了，這一局不能再投倍率孔',
      multMax: '倍率最高 {max} 倍',
      multShort: '彈珠不足 {cost} 顆，不能提升倍率',
      multKeepOne: '加倍後至少要留 1 顆投珠，彈珠不足 {need} 顆時不能提升倍率',
      multUp: '{mult} 倍！定燈後亮 {lit} 顆，按藍色按鈕定燈',
      winPop: '+{win} 顆',
      winMsg: '中了！{mult} 倍 × {bet} 顆 = {win} 顆',
      losePop: '銘謝惠顧',
      loseMsg: '沒落在亮燈的那一排，銘謝惠顧',
      rolledBack: '力道不夠，鋼珠滾回來了，再按一次發射',
      lockFirst: '先按藍色按鈕定燈，再投珠發射',
      betFirst: '請先投珠再按發射鈕',
      fired: '發射！', firedN: '發射！{n} 顆鋼珠一起出發',
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
      planFree: '自由挑戰', planCampaign: '冒險模式',
      campaignIntro: '最佳紀錄：打倒 {best} 隻怪物，全部通關 {clears} 次',
      campaignStart: '開始冒險',
      stageClearTitle: '打倒了{name}！', nextStage: '下一關',
      statusBalls: '目前彈珠', statusItems: '已擁有道具', statusBallsN: '{n} 顆', statusNoItems: '無',
      campaignClearTitle: '全部通關！', campaignClearText: '你一路打倒了全部 {total} 隻怪物，最後還剩 {left} 顆彈珠！', campaignAgain: '再闖一次',
      campaignLoseTitle: '闖關失敗…', campaignLoseText: '在第 {stage} 關被{name}擋下了，要從第 1 關重新開始。', campaignRetry: '從第 1 關重來',
      campaignAppear: '第 {stage} 關：野生的{name}出現了！HP {hp}，防禦 {def}',
      campaignOutTitle: '彈珠用完了…', campaignOutText: '打倒了第 {stage} 關的{name}，但彈珠剛好用完，沒辦法往下一關，要從第 1 關重新開始。',
      advTitle: '彈珠台大冒險', advStart: '開始冒險', advFight: '挑戰{name}', advCleared: '已擊敗',
      advIntro: '選一隻怪物來挑戰',
      advWinTitle: '勝利！', advWinText: '打倒了{name}，還剩 {left} 顆彈珠。', advAgain: '挑戰下一隻',
      advLoseTitle: '落敗…', advLoseText: '彈珠用完了，{name}還剩 {hp} HP。', advRetry: '再試一次',
      advAppear: '野生的{name}出現了！HP {hp}，防禦 {def}',
      hitMsgDef: '命中！{mult} 倍扣掉防禦 {def}，造成 {dmg} 點傷害',
      blockMsg: '被擋下了！{raw} 點攻擊打不破防禦 {def}，造成 0 傷害', blockPop: '擋下！', blockScreen: '0',
      hitMsg: '命中！{mult} 倍，造成 {dmg} 點傷害',
      lockedAdv: '定燈！亮 {lit} 顆紅燈，綠燈是補珠燈。往投珠孔投珠，投幾顆就一次發射幾顆',
      roundSumDmg: '這回合 {n} 顆珠打中 {hit} 顆，共造成 {dmg} 點傷害',
      roundSumGain: '這回合 {n} 顆珠打中 {hit} 顆，補回 {gain} 顆彈珠',
      roundSumBoth: '這回合 {n} 顆珠打中 {hit} 顆，共造成 {dmg} 點傷害、補回 {gain} 顆彈珠',
      refillMsg: '命中補珠燈！補回 {n} 顆彈珠', refillPop: '+{n} 顆',
      refillMsgCombo: '第 {k} 顆落進同一顆補珠燈！多補 {c} 顆，共補回 {n} 顆彈珠', comboPop: '疊{k} {text}',
      hitMsgCombo: '第 {k} 顆落進同一顆攻擊燈！攻擊 +{c} 共 {raw}，扣掉防禦 {def} 造成 {dmg} 點傷害',
      blockMsgCombo: '第 {k} 顆落進同一顆攻擊燈，但攻擊 {raw} 還是打不破防禦 {def}',
      refillMsgMult: '命中補珠燈！退回倍率孔 {refund} 顆，再補 {bonus} 顆，共 {n} 顆',
      advMissMsg: '沒打中！{name}在嘲笑你', advWinMsg: '打倒了{name}！', advWinLv: '打倒了{name}！升到 Lv{lv}，過關補珠 +{bonus}', advWinLvAtk: '打倒了{name}！升到 Lv{lv}，攻擊 +1（共 +{atk}）、過關補珠 +{bonus}', advLoseMsg: '彈珠用完了…',
      dmgPop: '-{d} HP', advNoCoin: '大冒險模式不能投幣',
      advPressStart: '按「開始冒險」', laugh: '嘻嘻嘻',
      stWinAdv: '上次傷害', stBestWinAdv: '勝場', stBestAdv: '敗場',
      hitMsgTotal: '命中！攻擊 {raw}，扣掉防禦 {def}，加上加成共造成 {dmg} 點傷害',
      critMsg: '暴擊！造成 {dmg} 點傷害', critPop: '暴擊 -{d}', chainPop: '連鎖+{c}', chainTag: '（連鎖暴擊 +{c}）',
      talentTitle: '選擇天賦（整趟冒險有效）', stTalent: '天賦', stBurn: '燃燒層數',
      burnStart: '燃燒中…… 🔥 {n} 層',
      burnMsg: '燃燒！怪物受到 {dmg} 點傷害，燃燒剩 {left} 層',
      traumaMsg: '外傷！補回 {n} 顆彈珠，同時造成 {dmg} 點傷害',
      hgRefillHurt: '鋼珠落進補珠燈，將補回 {n} 顆彈珠並造成 {dmg} 點傷害。',
      rewardTalent: '{name}專屬', stArmor: '破甲', stTrauma: '外傷比例',
      rewardTitle: '選擇過關獎勵', rewardReroll: '重骰（{n} 顆彈珠）', rewardHave: '已有 ×{n}',
      statusBoons: '過關獎勵',
      chestName: '寶箱',
      chestAppear: '寶箱出現了！投倍率孔提升寶箱等級（最多 3 顆），定燈後投 1 顆珠打開它',
      chestTierUp: '寶箱升級！{desc}。按藍色按鈕定燈',
      chestDesc1: '藍燈 3 顆', chestDesc2: '藍燈 3 顆、紫燈 2 顆', chestDesc3: '藍燈 3 顆、紫燈 2 顆、橘燈 1 顆',
      chestMultMax: '寶箱最多投 3 顆倍率珠',
      lockedChest: '定燈！投 1 顆珠，再拉彈簧打開寶箱',
      chestBetOne: '寶箱關卡只能投 1 顆珠', chestBetMsg: '投珠 1 顆，拉彈簧發射打開寶箱！',
      chestOpenMsg: '打開寶箱！獲得{tier}道具「{item}」',
      chestWinTitle: '獲得道具！',
      cvBag: '道具', btnBag: '背包', bagTitle: '背包', bagUse: '使用',
      cvStats: '狀態', btnStats: '狀態', statsTitle: '數值狀態',
      stSecBalls: '彈珠', stSecAttack: '攻擊（每顆珠）', stSecOther: '其他',
      stSecLevel: '等級', stLevel: '目前等級', stLevelAtk: '等級攻擊加成',
      stBetCap: '每回合投珠上限', stBonus: '下次過關補',
      stMultBase: '基礎倍率', stLitUp: '紅燈多亮', stPerBall: '每珠增傷', stPierce: '穿透傷害',
      stCritRate: '暴擊機率', stCritDmg: '暴擊傷害',
      stRefillLights: '每回合補珠燈', stRefillLightsN: '{n} 顆', stRefill: '補珠燈每顆補', stWeight: '彈珠重量', stPinsBoard: '檯面釘子', stPinsBoardN: '{n} / {total} 根', stPins: '拔釘子（每關少）', stPinsN: '{n} 根', stChest: '寶箱額外藍燈', stChestN: '{n} 排',
      btnCodex: '寶藏', codexTitle: '寶藏', codexCount: '已取得 {n} / {total} 種', codexBack: '返回',
      bagEmpty: '背包是空的。冒險模式中打開寶箱就能拿到道具。',
      bagNowSelect: '現在：定燈前', bagNowBet: '現在：定燈後、發射前',
      whenPre: '定燈前使用', whenPost: '定燈後、發射前使用', whenBoth: '定燈前或發射前使用',
      itemCampaignOnly: '道具只能在冒險模式的怪物關卡使用', itemNoChest: '寶箱關卡不能使用道具',
      itemNotNow: '鋼珠發射後不能使用道具', itemPreOnly: '只能在定燈前使用', itemPostOnly: '只能在定燈後、發射前使用',
      itemMaxLights: '燈已經亮滿了', itemNoDef: '怪物已經沒有防禦了', itemActive: '這回合已經用過了',
      itemNoLit: '沒有亮著的紅燈', itemKeyEmpty: '還沒有失去任何彈珠', itemNeedBet: '先往投珠孔投珠再使用',
      itemPlacing: '先點檯面放下彈珠',
      useCoin: '使用銀幣：持珠 +{n} 顆', useLaserRed: '雷射筆（紅）：這一關攻擊燈 +1，定燈後亮 {lit} 顆',
      useLaserGreen: '雷射筆（綠）：這一關補珠燈 +1', useFakeBoth: '假彈珠：倍率 +1、投珠 +1，變成 {mult} 倍、{bet} 顆！', useFakeMult: '假彈珠：倍率 +1，變成 {mult} 倍！',
      useFakeBet: '假彈珠：投珠 +1，變成 {bet} 顆！', useStone: '丟石頭！對{name}造成 {d} 點傷害（無視防禦）', useStoneCrit: '丟石頭暴擊！對{name}造成 {d} 點傷害（無視防禦）',
      useAcid: '潑鹽酸！{name}的防禦降到 {def}', useHeavy: '沉重彈珠：這回合每顆珠的基本傷害變成 {n}',
      useHourglass: '沙漏翻過來了：鋼珠落下後可以選擇保留結果或返回上回合',
      useDrink: '嘶～～～ 紅燈全部變成補珠燈了！', useKey: '用老闆的鑰匙打開珠箱，拿回 {n} 顆彈珠！',
      useShake: '搖晃機台！點檯面上任何地方放下彈珠', shakeWhere: '點檯面上（釘子區）放下彈珠',
      shakeHint: '點檯面放珠', shakePlaced: '「你不能那樣做！」彈珠放下去了，這顆傷害 ×3',
      shakePlacedMore: '「你不能那樣做！」彈珠放下去了，剩下 {n} 顆拉彈簧發射',
      outUseItem: '彈珠用完了！背包裡還有能用的道具',
      hgTitle: '沙漏', hgKeep: '保留結果', hgRewindBtn: '返回上回合',
      hgHit: '鋼珠落進亮燈的那一排，將造成 {dmg} 點傷害。',
      hgBlock: '鋼珠落進亮燈的那一排，但 {raw} 點攻擊打不破防禦 {def}，造成 0 傷害。',
      hgRefill: '鋼珠落進補珠燈，將補回 {n} 顆彈珠。', hgMiss: '鋼珠沒落在亮燈的那一排。',
      hgOut: '鋼珠掉出機台了。', hgBall: '第 {i} 顆：{text}',
      hgAsk: '要保留這個結果，還是返回這回合開始前？返回會退回這回合投的彈珠，用掉的道具不會退還。',
      hgRewind: '時間倒轉！退回這回合投的 {n} 顆彈珠',
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
      betInfoAdv: 'Bet {bet}/{cap}: {bet} balls fire together. ×{mult} each, a hit deals {win} damage',
      betInfoAdvDef: 'Bet {bet}/{cap}: {bet} balls fire together. ×{mult} − DEF {def} each, a hit deals {win} damage',
      betCapMsg: 'You can bet at most {n} balls per round (rewards can raise this)', itemBetCap: 'Your bet is already at the limit',
      multLocked: 'Locked. No more multiplier this round',
      multMax: 'Max multiplier is ×{max}',
      multShort: 'Need {cost} balls to raise the multiplier',
      multKeepOne: 'Keep at least 1 ball to bet: you need {need} balls to raise the multiplier',
      multUp: '×{mult}! {lit} lit after locking',
      winPop: '+{win}',
      winMsg: 'Win! ×{mult} × {bet} = {win} balls',
      losePop: 'No luck',
      loseMsg: 'Missed the lit lanes. No luck',
      rolledBack: 'Too weak, ball rolled back. Shoot again',
      lockFirst: 'Press blue to lock first',
      betFirst: 'Bet first, then shoot',
      fired: 'Fire!', firedN: 'Fire! {n} balls are on their way',
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
      planFree: 'Free fight', planCampaign: 'Adventure',
      campaignIntro: 'Best: {best} monsters defeated, {clears} full clears',
      campaignStart: 'Start adventure',
      stageClearTitle: 'You beat the {name}!', nextStage: 'Next stage',
      statusBalls: 'Balls', statusItems: 'Items', statusBallsN: '{n}', statusNoItems: 'None',
      campaignClearTitle: 'Adventure cleared!', campaignClearText: 'You defeated all {total} monsters with {left} balls to spare!', campaignAgain: 'Play again',
      campaignLoseTitle: 'Adventure failed…', campaignLoseText: 'The {name} stopped you at stage {stage}. Start over from stage 1.', campaignRetry: 'Restart from stage 1',
      campaignAppear: 'Stage {stage}: a wild {name} appears! HP {hp}, DEF {def}',
      campaignOutTitle: 'Out of balls…', campaignOutText: 'You beat the {name} on stage {stage}, but you have no balls left to go on. Start over from stage 1.',
      advTitle: 'Pinball Quest', advStart: 'Start', advFight: 'Fight the {name}', advCleared: 'Defeated',
      advIntro: 'Pick a monster to fight',
      advWinTitle: 'Victory!', advWinText: 'You defeated the {name} with {left} balls left.', advAgain: 'Next monster',
      advLoseTitle: 'Defeated…', advLoseText: 'Out of balls. The {name} still has {hp} HP.', advRetry: 'Try again',
      advAppear: 'A wild {name} appears! HP {hp}, DEF {def}',
      hitMsgDef: 'Hit! ×{mult} − DEF {def} = {dmg} damage',
      blockMsg: 'Blocked! {raw} attack can\'t break DEF {def}. 0 damage', blockPop: 'Blocked!', blockScreen: '0',
      hitMsg: 'Hit! ×{mult} = {dmg} damage',
      lockedAdv: 'Locked! {lit} red lights. Green = refill. Every ball you bet is fired at once',
      roundSumDmg: '{hit} of {n} balls hit: {dmg} damage in total',
      roundSumGain: '{hit} of {n} balls hit: {gain} balls back',
      roundSumBoth: '{hit} of {n} balls hit: {dmg} damage and {gain} balls back',
      refillMsg: 'Refill light! +{n} balls', refillPop: '+{n} balls',
      refillMsgCombo: 'Ball #{k} on the same refill light! +{c} extra, {n} balls back', comboPop: 'x{k} {text}',
      hitMsgCombo: 'Ball #{k} on the same red light! +{c} attack = {raw} − DEF {def}: {dmg} damage',
      blockMsgCombo: 'Ball #{k} on the same red light, but {raw} attack is still blocked by DEF {def}',
      refillMsgMult: 'Refill light! {refund} multiplier balls back + {bonus} = {n} balls',
      advMissMsg: 'Missed! The {name} laughs', advWinMsg: 'Defeated the {name}!', advWinLv: 'Defeated the {name}! Level {lv}: stage bonus +{bonus}', advWinLvAtk: 'Defeated the {name}! Level {lv}: attack +1 (total +{atk}), stage bonus +{bonus}', advLoseMsg: 'Out of balls…',
      dmgPop: '-{d} HP', advNoCoin: 'No coins in Quest mode',
      advPressStart: 'Press Start', laugh: 'hehehe',
      stWinAdv: 'Last hit', stBestWinAdv: 'Wins', stBestAdv: 'Losses',
      hitMsgTotal: 'Hit! {raw} attack − DEF {def}, with bonuses {dmg} damage',
      critMsg: 'Critical hit! {dmg} damage', critPop: 'CRIT -{d}', chainPop: 'chain+{c}', chainTag: ' (chain crit +{c})',
      talentTitle: 'Choose a talent (lasts the whole adventure)', stTalent: 'Talent', stBurn: 'Burn',
      burnStart: 'Burning... 🔥 {n} stacks',
      burnMsg: 'Burn! {dmg} damage, {left} burn left',
      traumaMsg: 'Grind! {n} balls back and {dmg} damage',
      hgRefillHurt: 'The ball landed on a refill light: {n} balls back and {dmg} damage.',
      rewardTalent: '{name} only', stArmor: 'Armor break', stTrauma: 'Grind rate',
      rewardTitle: 'Choose a reward', rewardReroll: 'Reroll ({n} balls)', rewardHave: 'Have ×{n}',
      statusBoons: 'Rewards',
      chestName: 'Treasure Chest',
      chestAppear: 'A treasure chest! Use the multiplier hole to upgrade it (up to 3 balls), lock, then bet 1 ball to open it',
      chestTierUp: 'Chest upgraded! {desc}. Press blue to lock',
      chestDesc1: '3 blue', chestDesc2: '3 blue, 2 purple', chestDesc3: '3 blue, 2 purple, 1 orange',
      chestMultMax: 'The chest takes at most 3 multiplier balls',
      lockedChest: 'Locked! Bet 1 ball, then shoot to open the chest',
      chestBetOne: 'Only 1 ball can be bet on the chest', chestBetMsg: 'Bet 1 ball. Shoot to open the chest!',
      chestOpenMsg: 'Chest opened! Got a {tier} item: {item}',
      chestWinTitle: 'New item!',
      cvBag: 'ITEMS', btnBag: 'Backpack', bagTitle: 'Backpack', bagUse: 'Use',
      cvStats: 'STATS', btnStats: 'Stats', statsTitle: 'Stats',
      stSecBalls: 'Balls', stSecAttack: 'Attack (per ball)', stSecOther: 'Other',
      stSecLevel: 'Level', stLevel: 'Level', stLevelAtk: 'Level attack bonus',
      stBetCap: 'Max bet per round', stBonus: 'Next stage bonus',
      stMultBase: 'Base multiplier', stLitUp: 'Extra red lights', stPerBall: 'Per-ball damage', stPierce: 'Piercing',
      stCritRate: 'Crit chance', stCritDmg: 'Crit damage',
      stRefillLights: 'Refill lights per round', stRefillLightsN: '{n}', stRefill: 'Refill per ball', stWeight: 'Marble weight', stPinsBoard: 'Pins on board', stPinsBoardN: '{n} / {total}', stPins: 'Fewer pins (per stage)', stPinsN: '{n}', stChest: 'Extra blue chest lanes', stChestN: '{n}',
      btnCodex: 'Treasures', codexTitle: 'Treasures', codexCount: 'Found {n} / {total}', codexBack: 'Back',
      bagEmpty: 'Your backpack is empty. Open treasure chests in Adventure to get items.',
      bagNowSelect: 'Now: before locking', bagNowBet: 'Now: after locking, before shooting',
      whenPre: 'Use before locking', whenPost: 'Use after locking, before shooting', whenBoth: 'Use before locking or before shooting',
      itemCampaignOnly: 'Items only work in Adventure monster stages', itemNoChest: 'No items at the treasure chest',
      itemNotNow: 'Can\'t use items while the ball is in play', itemPreOnly: 'Only before locking', itemPostOnly: 'Only after locking, before shooting',
      itemMaxLights: 'No room for more lights', itemNoDef: 'The monster has no DEF left', itemActive: 'Already used this round',
      itemNoLit: 'No red lights to convert', itemKeyEmpty: 'You haven\'t lost any balls yet', itemNeedBet: 'Bet first',
      itemPlacing: 'Tap the board to drop the ball first',
      useCoin: 'Silver Coin: +{n} balls', useLaserRed: 'Red laser: +1 attack light this stage ({lit} after locking)',
      useLaserGreen: 'Green laser: +1 refill light this stage', useFakeBoth: 'Fake marble: +1 multiplier and +1 bet, now ×{mult} with {bet}!', useFakeMult: 'Fake marble: multiplier +1, now ×{mult}!',
      useFakeBet: 'Fake marble: +1 bet, now {bet}!', useStone: 'Threw a stone! {d} damage to the {name}, ignoring DEF', useStoneCrit: 'Critical stone! {d} damage to the {name}, ignoring DEF',
      useAcid: 'Acid! The {name}\'s DEF drops to {def}', useHeavy: 'Heavy marble: {n} base damage per ball this round',
      useHourglass: 'Hourglass flipped: after the ball lands, keep the result or rewind the round',
      useDrink: 'Slurrrp~ Every red light is now a refill light!', useKey: 'The shopkeeper\'s key opened the ball box: {n} balls back!',
      useShake: 'Shake the machine! Tap anywhere on the board to drop the ball', shakeWhere: 'Tap the pin area of the board to drop the ball',
      shakeHint: 'Tap to drop', shakePlaced: '"You can\'t do that!" Ball dropped (×3 damage)',
      shakePlacedMore: '"You can\'t do that!" Ball dropped. Shoot the other {n}',
      outUseItem: 'Out of balls! Your backpack still has items that can help',
      hgTitle: 'Hourglass', hgKeep: 'Keep result', hgRewindBtn: 'Rewind',
      hgHit: 'The ball landed in a lit lane: {dmg} damage.',
      hgBlock: 'The ball landed in a lit lane, but {raw} attack can\'t break DEF {def}: 0 damage.',
      hgRefill: 'The ball landed on a refill light: {n} balls back.', hgMiss: 'The ball missed the lit lanes.',
      hgOut: 'The ball fell out of the machine.', hgBall: 'Ball {i}: {text}',
      hgAsk: 'Keep this result, or rewind to the start of the round? Rewinding returns the balls you put in this round; used items are not returned.',
      hgRewind: 'Time rewinds! {n} balls returned',
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
  // 大冒險的托盤往左縮，讓出位置給背包（道具）按鈕
  const TRAY_RIGHT = { classic: 400, adv: 352 };
  const BAG = { x: 398, y: 1000, r: 18 };     // 背包按鈕（大冒險：托盤和投珠孔之間）
  const STATS = { x: 398, y: 934, r: 17 };    // 狀態按鈕（背包上面）
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
  const ALL_PINS = pins.slice();
  // 大冒險的釘子隨關卡增加（adv.pinSet），經典模式永遠是完整的釘陣
  function syncPins() {
    pins.length = 0;
    const keep = mode === 'adv' ? adv.pinSet : null;
    ALL_PINS.forEach((p, i) => { if (!keep || keep.has(i)) pins.push(p); });
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
    ignite() {
      // 點火：「呼──」往上竄
      this.noise(0.5, 0.12);
      this.tone(110, 0.55, 'sawtooth', 0.05, 0, 330);
    },
    burn() {
      // 燃燒爆開：一團火「轟」
      this.noise(0.35, 0.4);
      this.tone(300, 0.4, 'sawtooth', 0.09, 0, 60);
      this.tone(900, 0.2, 'triangle', 0.05, 0.05, 1800);
    },
    miss() {
      // 單顆珠沒中：輕輕的「噗」往下掉，跟傷害的重擊聲分開
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - (this.lastMiss || 0) < 0.05) return;
      this.lastMiss = now;
      this.tone(520, 0.18, 'triangle', 0.07, 0, 260);
    },
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
    crit() {
      // 暴擊：更重的一擊，接著往上竄的「鏘──」
      this.noise(0.25, 0.5);
      this.tone(160, 0.35, 'sawtooth', 0.12, 0, 45);
      this.tone(1200, 0.14, 'square', 0.07, 0.03, 3200);
      this.tone(2400, 0.4, 'triangle', 0.09, 0.15);
      this.tone(3600, 0.3, 'triangle', 0.05, 0.15);
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
    shakeT: 0,            // 搖晃機台時畫面晃動
  };
  const round = {
    phase: 'select',      // select（燈在閃，可投倍率孔）| bet（燈已定，可投珠）| flying | win | lose
    bet: 0,
    level: 0,             // 目前倍率段 multRule().mults[level]
    lit: new Set(),
    landSlot: -1,
    resetT: 0,
    flashT: 0,
    refills: new Set(),   // 大冒險：補珠燈在哪幾排
    tiers: new Array(SLOT_COUNT).fill(0),   // 寶箱：每一排的道具等級（0 白、1 藍、2 紫、3 橘）
    betPaid: 0,           // 這局真的從持珠拿出來的投珠、倍率珠（退還時用；假彈珠送的不算）
    multPaid: 0,
    extraLit: 0,          // 雷射筆（紅）：多亮幾顆攻擊燈
    extraRefill: 0,       // 雷射筆（綠）：多亮幾顆補珠燈
    heavy: 0,             // 沉重彈珠：每顆珠的基本傷害多幾點
    hourglass: false,     // 沙漏：落點後可以選擇保留或返回
    placing: false,       // 搖晃機台：等玩家點檯面放珠
    landed: [],           // 這回合每顆鋼珠落在哪一排（-1 是掉出機台）
    launched: 0,          // 這回合已經發射（或放下）幾顆
    hits: 0,              // 這回合打中攻擊燈幾顆、造成多少傷害、補回幾顆（結算訊息用）
    dmg: 0,
    gain: 0,
    refunded: false,      // 補珠燈退回倍率珠：一回合只退一次
  };
  const balls = [];       // 機台內的鋼珠：大冒險投幾顆就一次發射幾顆，其他時候只有一顆
  const restBall = () => ({ x: PLUNGER_X, y: SHOOTER_FLOOR - BALL_R - 1, vx: 0, vy: 0, still: 0, fired: false });
  // 停在發射軌道下段（可能好幾顆疊在彈簧上），往上飛的不算
  const atShooter = b => b.x > LANE_X && b.y > SHOOTER_FLOOR - 200 && b.vy > -200;
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
    chest: false,         // 目前是寶箱關卡
    items: {},            // 背包：道具 id → 數量（連續闖關從第 1 關開始時清空）
    lost: 0,              // 這次闖關失去的彈珠（老闆的鑰匙用）
    defDown: 0,           // 鹽酸：這隻怪物的防禦被降了幾點
    loot: null,           // 剛從寶箱拿到的道具
    rescueSaid: false,
    boons: {},            // 過關獎勵：id → 疊了幾層（新的冒險開始時清空）
    rewards: null,        // 正在選的 3 個過關獎勵
    rerollCost: 1,        // 下一次重骰要花幾顆
    talent: null,         // 這趟冒險的天賦（TALENTS 的 id）；自由挑戰沒有天賦
    burn: 0,              // 燒紅彈珠：這隻怪物身上的燃燒層數
    stageLit: 0,          // 雷射筆（紅）：這一關多亮幾顆攻擊燈
    stageRefill: 0,       // 雷射筆（綠）：這一關多亮幾顆補珠燈
    pinSet: null,         // 大冒險檯面上有哪些釘子（ALL_PINS 的索引）；null = 還沒開打，顯示完整釘陣
  };
  const boon = id => adv.boons[id] || 0;
  const hasTalent = id => mode === 'adv' && adv.talent === id;
  const talentAtk = () => hasTalent('alloy') ? 1 : 0;
  const traumaRate = () => 1 + 0.25 * boon('rend');
  const critRate = () => Math.min(1, CRIT_BASE_RATE + 0.2 * boon('critRate') + (hasTalent('alloy') ? 0.15 : 0));
  const critMult = () => CRIT_BASE_MULT + 0.5 * boon('critDmg');
  // 每回合投珠上限：寶箱只能投 1 顆
  const betCap = () => chestStage() ? 1 : BET_CAP + 2 * boon('betCap');
  const chestStage = () => mode === 'adv' && adv.chest;
  // 寶藏圖鑑：取得過哪些道具（存在瀏覽器，重新闖關也會保留）
  const itemsSeen = new Set();
  try { (JSON.parse(localStorage.getItem('candy-pinball-items-seen') || '[]')).forEach(id => itemsSeen.add(id)); } catch (e) { /* 無痕模式 */ }
  function markSeen(id) {
    if (itemsSeen.has(id)) return;
    itemsSeen.add(id);
    try { localStorage.setItem('candy-pinball-items-seen', JSON.stringify([...itemsSeen])); } catch (e) { /* 無痕模式 */ }
  }
  const itemCount = () => ITEM_IDS.reduce((s, id) => s + (adv.items[id] || 0), 0);
  const advActive = () => mode === 'adv' && adv.status === 'playing';
  // 大冒險還沒開始或已經結束時，機台不能操作
  const advLocked = () => mode === 'adv' && adv.status !== 'playing';
  const monsterName = () => adv.monster ? adv.monster.name[lang] : '';

  // 玩家自己選要挑戰的怪物；打倒過的怪物會打勾（存在瀏覽器）
  // v1.2 以前只有 7 隻怪物（現在 14 隻）：舊的「已擊敗」和上次選的怪物換到新的位置
  const OLD_MONSTER_IDX = [0, 2, 4, 6, 8, 10, 12];
  let hasNewRecords = false;
  try { hasNewRecords = localStorage.getItem('candy-pinball-adv-cleared2') !== null || localStorage.getItem('candy-pinball-adv-pick2') !== null; } catch (e) { /* 無痕模式 */ }
  let pickIdx = Math.min(MONSTERS.length - 1, hasNewRecords ? loadRecord('candy-pinball-adv-pick2')
    : OLD_MONSTER_IDX[Math.min(6, loadRecord('candy-pinball-adv-pick'))]);
  const cleared = new Set();
  try {
    if (hasNewRecords) (JSON.parse(localStorage.getItem('candy-pinball-adv-cleared2') || '[]')).forEach(i => cleared.add(i));
    else (JSON.parse(localStorage.getItem('candy-pinball-adv-cleared') || '[]')).forEach(i => { if (OLD_MONSTER_IDX[i] !== undefined) cleared.add(OLD_MONSTER_IDX[i]); });
  } catch (e) { /* 無痕模式 */ }
  function setPick(i) {
    pickIdx = Math.max(0, Math.min(MONSTERS.length - 1, i));
    saveRecord('candy-pinball-adv-pick2', pickIdx);
  }
  // 難度星等：1～5 顆
  const monsterStars = i => 1 + Math.floor(i * 4 / (MONSTERS.length - 1));

  // 大冒險的玩法：campaign = 冒險模式（從第 1 隻一路打到最後一隻，預設）、free = 自由挑戰（自己選怪物）
  let advPlan = 'campaign';
  try { if (localStorage.getItem('candy-pinball-adv-plan') === 'free') advPlan = 'free'; } catch (e) { /* 無痕模式 */ }
  function setPlan(p) {
    advPlan = p;
    try { localStorage.setItem('candy-pinball-adv-plan', p); } catch (e) { /* 無痕模式 */ }
  }
  // 連續闖關紀錄：一輪最多打倒幾隻、全部通關幾次
  const campaign = {
    best: loadRecord('candy-pinball-campaign-best'),
    clears: loadRecord('candy-pinball-campaign-clears'),
  };
  const LAST_STAGE = MONSTERS.length - 1;
  // 連續闖關打贏了、後面還有關卡
  // 打倒最後一顆彈珠時沒有珠可以帶到下一關，就算闖關結束
  // 打完怪物下一關是寶箱（會補珠）；打開寶箱後下一關是下一隻怪物（不補珠）
  // 已經打倒幾隻：打怪時是前面那幾隻，打贏或進寶箱後含這一隻（自由挑戰也當作前面都打過）
  const advKills = () => !adv.monster ? 0 : adv.monsterIdx + (adv.chest || adv.status === 'won' ? 1 : 0);
  const advLevel = () => 1 + advKills();
  const levelAtk = () => Math.floor(advKills() / 2);
  // 打倒第 n 隻後補的珠：第 1 隻 30、第 2 隻 35…
  const stageBonus = () => CAMPAIGN_BONUS + LEVEL_BONUS * Math.max(0, advKills() - 1);
  const campaignBalls = () => state.credits + state.payoutQueue + (adv.chest ? 0 : stageBonus());
  const campaignMidRun = () => adv.campaign && adv.status === 'won' && (adv.chest || adv.monsterIdx < LAST_STAGE) && campaignBalls() > 0;

  function startAdventure() {
    if (advPlan === 'campaign') {
      const cont = campaignMidRun();
      adv.campaign = true;
      if (!cont) startFight(0, false);
      else if (adv.chest) startFight(adv.monsterIdx + 1, true, false);
      else startStage(CHEST, adv.monsterIdx, true, true);
    } else {
      adv.campaign = false;
      startFight(pickIdx, false);
    }
  }

  // keepBalls：連續闖關的下一關，持珠不重置；bonus：要不要補 CAMPAIGN_BONUS 顆
  function startFight(idx, keepBalls, bonus = keepBalls) {
    startStage(MONSTERS[idx], idx, keepBalls, bonus);
  }

  // 第 idx 關的釘子數：第 1 關 0 根，平均增加到最後一關全部；「拔釘子」每層少 5 根
  const pinTarget = idx => Math.max(0, Math.round(ALL_PINS.length * idx / LAST_STAGE) - 5 * boon('pin'));
  // 新的一場從空盤開始；之後每關在空位隨機補釘子補到這一關的數量
  function growPins(idx, fresh) {
    if (fresh || !adv.pinSet) adv.pinSet = new Set();
    const empty = ALL_PINS.map((p, i) => i).filter(i => !adv.pinSet.has(i));
    for (let n = pinTarget(idx) - adv.pinSet.size; n > 0 && empty.length; n--) {
      adv.pinSet.add(empty.splice(Math.floor(Math.random() * empty.length), 1)[0]);
    }
    syncPins();
    drawStatic();
  }

  // 寶箱也走這裡（HP 1、不會反擊）；idx 是寶箱前面那一關的怪物
  function startStage(m, idx, keepBalls, bonus) {
    Sound.init();
    Sound.coin();
    adv.monster = m;
    adv.chest = m === CHEST;
    adv.monsterIdx = idx;
    adv.maxHp = adv.hp = adv.chest ? 1 : Math.max(1, Math.round(m.hp * (0.9 + Math.random() * 0.2)));
    adv.status = 'playing';
    adv.hitT = adv.laughT = adv.laughSoundT = adv.dieT = adv.endT = 0;
    adv.pops.length = 0;
    adv.defDown = 0;
    adv.loot = null;
    adv.lost = 0;           // 老闆的鑰匙只拿回這一關失去的彈珠
    if (keepBalls) {
      if (bonus) state.payoutQueue += stageBonus();
    } else {
      // 新的一場（或闖關從第 1 關開始）重新發彈珠，背包也清空
      state.credits = 0;
      state.payoutQueue = ADV_BALLS;
      tray.length = 0;
      spills.length = 0;
      adv.items = {};
      adv.boons = {};
      adv.rewards = null;
      adv.talent = adv.campaign ? talentPick : null;
    }
    adv.burn = 0;
    adv.stageLit = adv.stageRefill = 0;
    // 寶箱沿用前一關的釘子；自由挑戰每場都重新擺
    if (!adv.chest) growPins(idx, !keepBalls);
    state.lastWin = null;
    state.started = true;
    newRound();
    refreshOverlay();
    const info = { name: monsterName(), hp: adv.hp, def: monsterDef(), stage: idx + 1 };
    say(adv.chest ? 'chestAppear' : adv.campaign ? 'campaignAppear' : 'advAppear', info);
  }

  // 鹽酸會把防禦往下降
  const monsterDef = () => adv.monster ? Math.max(0, adv.monster.def - adv.defDown) : 0;
  // 經典模式得珠 = 倍率 × 投珠數 × 每顆的基本傷害（平常 1，沉重彈珠每用一次 +1）
  const attackRaw = () => mult() * round.bet * (1 + round.heavy);
  // 攻擊力扣掉防禦才是實際傷害
  const dmgAfterDef = raw => Math.max(0, raw - monsterDef());
  // 大冒險每顆珠各自計算，加上過關獎勵、暴擊後的傷害：
  // 攻擊 = 倍率 ×（1 + 倍率強化 10%／層）× 基本傷害 + 每珠增傷 → 扣防禦 → × 暴擊
  // → 有打破防禦才加穿透傷害（不然可以每次投 1 顆、只靠穿透慢慢磨死高防禦怪物）
  // combo：這回合前面已經有幾顆珠落進同一顆燈，每多一顆攻擊 +1（扣防禦前）
  function computeHit(crit, combo = 0) {
    const def = Math.max(0, monsterDef() - boon('armor'));
    const raw = mult() * (1 + round.heavy) + boon('perBall') + talentAtk() + levelAtk() + combo + round.crits * boon('chainCrit');
    let dmg = Math.max(0, raw - def);
    if (crit) dmg = Math.round(dmg * critMult());
    if (dmg > 0) dmg += boon('pierce');
    return { raw, def, dmg };
  }
  const hitBonused = () => round.heavy > 0 || levelAtk() > 0 || talentAtk() > 0 || boon('multBase') > 0 || boon('perBall') > 0 || boon('pierce') > 0;
  const refillBonus = () => REFILL_MULT + boon('refill');   // 每顆珠

  // 天賦的額外傷害（燃燒、外傷）：無視防禦、不會暴擊
  function extraDamage(dmg, color) {
    if (dmg <= 0 || adv.status !== 'playing') return;
    adv.hp = Math.max(0, adv.hp - dmg);
    round.dmg += dmg;
    adv.hitT = 0.5;
    adv.pops.push({ text: '-' + dmg, t: 0, color });
    if (adv.hp === 0) defeatMonster();
  }
  // 燒紅彈珠：回合結束時燃燒，之後層數減半
  function burnTick() {
    if (!hasTalent('burn') || !adv.burn || adv.chest || adv.status !== 'playing') return false;
    const dmg = adv.burn;
    // 悶燒 n 層：保留 (n+1)/(n+2)，0 層就是減半
    adv.burn = Math.floor(adv.burn * (boon('smolder') + 1) / (boon('smolder') + 2));
    extraDamage(dmg, '#fb923c');
    say('burnMsg', { dmg, left: adv.burn });
    Sound.burn();
    return true;
  }

  // times：搖晃機台放下的那顆珠傷害 ×3
  function damageMonster(px, combo = 0, times = 1) {
    if (hasTalent('burn')) adv.burn += 1 + boon('kindle');   // 落進攻擊燈就疊燃燒（打不破防禦也算）
    const crit = Math.random() < critRate();
    const hitRes = computeHit(crit, combo);
    const { raw, def } = hitRes, dmg = hitRes.dmg * times;
    const chain = round.crits * boon('chainCrit');   // 這顆吃到的連鎖暴擊加成
    if (crit) round.crits++;
    state.lastWin = dmg;
    if (dmg === 0) {
      // 攻擊沒打破防禦：0 傷害，怪物竊笑
      adv.laughT = 1.3;
      adv.pops.push({ text: t('blockScreen'), t: 0 });
      popups.push({ x: px, y: SLOT_TOP - 16, text: t('blockPop'), t: 0, color: '#cbd5e1' });
      say(combo ? 'blockMsgCombo' : 'blockMsg', { raw, def, k: combo + 1, chain });
      Sound.thud();
      setTimeout(() => Sound.snicker(), 250);
      return;
    }
    adv.hp = Math.max(0, adv.hp - dmg);
    round.dmg += dmg;
    adv.hitT = 0.5;
    adv.pops.push({ text: '-' + dmg, t: 0, color: crit ? '#ffd166' : undefined, big: crit });
    const pop = t(crit ? 'critPop' : 'dmgPop', { d: dmg }) + (chain ? ' ' + t('chainPop', { c: chain }) : '');
    popups.push({ x: px, y: SLOT_TOP - 16, text: combo ? t('comboPop', { k: combo + 1, text: pop }) : pop, t: 0, color: crit ? '#ffd166' : '#ff6b6b', big: crit || combo > 0 });
    const key = crit ? 'critMsg' : combo ? 'hitMsgCombo' : hitBonused() ? 'hitMsgTotal' : def > 0 ? 'hitMsgDef' : 'hitMsg';
    say(key, { mult: mult(), bet: round.bet, raw, def, dmg, k: combo + 1, c: combo, chain });
    if (crit) {
      state.shakeT = Math.max(state.shakeT, 0.25);   // 暴擊時機台晃一下
      Sound.crit();
    } else {
      Sound.hit();
    }
    if (adv.hp === 0) defeatMonster();
  }

  function defeatMonster() {
    adv.status = 'won';
    adv.dieT = 1.4;
    adv.endT = 1.8;
    adv.wins++;
    saveRecord('candy-pinball-adv-wins', adv.wins);
    cleared.add(adv.monsterIdx);
    try { localStorage.setItem('candy-pinball-adv-cleared2', JSON.stringify([...cleared])); } catch (e) { /* 無痕模式 */ }
    setPick(adv.monsterIdx + 1);      // 下一場預設挑戰下一隻（比較強的）
    // 冒險模式：打倒怪物（最後一隻除外）後先選過關獎勵
    if (adv.campaign && adv.monsterIdx < LAST_STAGE) {
      adv.rerollCost = 1;
      rollRewards();
    }
    if (adv.campaign) {
      if (adv.monsterIdx + 1 > campaign.best) {
        campaign.best = adv.monsterIdx + 1;
        saveRecord('candy-pinball-campaign-best', campaign.best);
      }
      if (adv.monsterIdx === LAST_STAGE) saveRecord('candy-pinball-campaign-clears', ++campaign.clears);
    }
    if (adv.campaign && adv.monsterIdx < LAST_STAGE) {
      say(advKills() % 2 === 0 ? 'advWinLvAtk' : 'advWinLv', { name: monsterName(), lv: advLevel(), atk: levelAtk(), bonus: LEVEL_BONUS });
    } else {
      say('advWinMsg', { name: monsterName() });
    }
    setTimeout(() => Sound.win(), 350);
  }

  // ===== 過關獎勵 =====
  // 已經沒有效果的獎勵不抽（寶箱已經沒有白燈、釘子拔光）
  function boonAvailable(id) {
    if (id === 'chestRare') return CHEST_LANES[1] + boon('chestRare') + CHEST_LANES[2] + CHEST_LANES[3] < SLOT_COUNT;
    if (id === 'pin') return pins.length > 0;
    if (BOONS[id].talent && BOONS[id].talent !== adv.talent) return false;
    if (id === 'light') return boon('light') < MULT_RULES.adv.mults.length - 1;
    if (id === 'roll') return !boon('roll');      // 只能拿一次
    return true;
  }
  function rollRewards() {
    const pool = BOON_IDS.filter(boonAvailable);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    adv.rewards = pool.slice(0, 3);
  }
  function rerollRewards() {
    Sound.init();
    if (!adv.rewards || state.credits < adv.rerollCost) { Sound.error(); return; }
    state.credits -= adv.rerollCost;
    if (tray.length > state.credits) tray.length = state.credits;
    adv.lost += adv.rerollCost;
    adv.rerollCost++;
    rollRewards();
    Sound.clunk();
    refreshOverlay();
  }
  function pickReward(id) {
    Sound.init();
    if (!adv.rewards || !adv.rewards.includes(id)) return;
    adv.boons[id] = boon(id) + 1;
    adv.rewards = null;
    if (id === 'balls') state.payoutQueue += 10;
    if (id === 'pin') for (let i = 0; i < 5; i++) removeRandomPin();
    Sound.coin();
    refreshOverlay();
  }
  function removeRandomPin() {
    if (!adv.pinSet) return;
    const left = [...adv.pinSet];
    if (!left.length) return;
    adv.pinSet.delete(left[Math.floor(Math.random() * left.length)]);
    syncPins();
    drawStatic();
  }

  // 寶箱：落在哪一排，就從那一排顏色等級的道具池抽一個
  function openChest(slot, px) {
    const tier = round.tiers[slot];
    const pool = ITEM_IDS.filter(id => ITEMS[id].tier === tier);
    const id = pool[Math.floor(Math.random() * pool.length)];
    adv.items[id] = (adv.items[id] || 0) + 1;
    markSeen(id);
    adv.loot = id;
    adv.hp = 0;
    adv.hitT = 0.3;
    adv.status = 'won';
    adv.endT = 1.8;
    const color = TIERS[tier].color;
    adv.pops.push({ text: ITEMS[id].name[lang], t: 0, color });
    popups.push({ x: px, y: SLOT_TOP - 16, text: TIERS[tier].name[lang], t: 0, color });
    round.phase = 'win';
    say('chestOpenMsg', { tier: TIERS[tier].name[lang], item: ITEMS[id].name[lang] });
    Sound.coin();
    setTimeout(() => Sound.win(), 250);
  }

  // ===== 道具 =====
  const itemName = id => ITEMS[id].name[lang];
  // 會隨關卡變化的數值
  const coinBalls = () => 10 + adv.monsterIdx + 1;
  // 石頭：隨關卡成長，再加上養出來的攻擊（每珠攻擊、天賦攻擊）
  const stoneDmg = () => 3 + 2 * (adv.monsterIdx + 1) + boon('perBall') + talentAtk();
  const ITEM_N = { coin: coinBalls, stone: stoneDmg, key: () => adv.lost };
  const itemEffect = id => ITEMS[id].effect[lang].replace('{n}', ITEM_N[id] ? ITEM_N[id]() : '');

  // 不能用的原因（i18n key），可以用就回傳 null
  function itemBlockGeneral() {
    if (mode !== 'adv' || !adv.campaign || adv.status !== 'playing') return 'itemCampaignOnly';
    if (adv.chest) return 'itemNoChest';
    if (round.placing) return 'itemPlacing';
    if (state.charging || (round.phase !== 'select' && round.phase !== 'bet')) return 'itemNotNow';
    return null;
  }
  function itemBlock(id) {
    const general = itemBlockGeneral();
    if (general) return general;
    const it = ITEMS[id];
    if (it.when === 'pre' && round.phase !== 'select') return 'itemPreOnly';
    if (it.when === 'post' && round.phase !== 'bet') return 'itemPostOnly';
    switch (id) {
      case 'laserRed': case 'laserGreen':
        if (litCount() + 1 + round.extraRefill >= SLOT_COUNT) return 'itemMaxLights';
        break;
      case 'acid': if (monsterDef() === 0) return 'itemNoDef'; break;
      case 'hourglass': if (round.hourglass) return 'itemActive'; break;
      case 'drink': if (!round.lit.size) return 'itemNoLit'; break;
      case 'key': if (adv.lost <= 0) return 'itemKeyEmpty'; break;
      case 'fake':
        if (round.bet >= betCap() && !(round.phase === 'select' && round.level < multRule().mults.length - 1)) return 'itemBetCap';
        break;
      case 'shake':
        if (round.bet === 0) return 'itemNeedBet';
        if (!ballAtShooter()) return 'itemNotNow';
        break;
    }
    return null;
  }

  function useItem(id) {
    Sound.init();
    if (!(adv.items[id] > 0)) return false;
    const why = itemBlock(id);
    if (why) { say(why); Sound.error(); return false; }
    adv.items[id]--;
    ITEM_FX[id]();
    return true;
  }

  const ITEM_FX = {
    coin() {
      const n = coinBalls();
      state.payoutQueue += n;
      say('useCoin', { n });
      Sound.coin();
    },
    laserRed() {
      adv.stageLit++;
      round.extraLit++;
      rollLit(litCount());
      say('useLaserRed', { lit: litCount() });
      Sound.lock();
    },
    laserGreen() {
      adv.stageRefill++;
      round.extraRefill++;
      rollLit(litCount());
      say('useLaserGreen');
      Sound.lock();
    },
    fake() {
      // 定燈前：倍率、投珠各加 1（倍率已經最高就只加投珠，投珠到上限就只加倍率）
      const canMult = round.phase === 'select' && round.level < multRule().mults.length - 1;
      const canBet = round.bet < betCap();
      if (canMult) round.level++;
      if (canBet) {
        round.bet++;
        syncRestBalls();
      }
      if (canMult && canBet) say('useFakeBoth', { mult: mult(), bet: round.bet });
      else if (canMult) say('useFakeMult', { mult: mult() });
      else say('useFakeBet', { bet: round.bet });
      tweens.push({ x0: CHUTE.x, y0: TRAY.back + 10, x1: HOLES.bet.x, y1: HOLES.bet.y, t: 0, dur: 0.45 });
      Sound.clunk();
    },
    stone() {
      // 石頭也會暴擊，算進連鎖暴擊
      const crit = Math.random() < critRate();
      const d = crit ? Math.round(stoneDmg() * critMult()) : stoneDmg();
      if (crit) round.crits++;
      adv.hp = Math.max(0, adv.hp - d);
      adv.hitT = 0.5;
      adv.pops.push({ text: '-' + d, t: 0, color: crit ? '#ffd166' : undefined, big: crit });
      popups.push({ x: W / 2, y: SLOT_TOP - 16, text: t(crit ? 'critPop' : 'dmgPop', { d }), t: 0, color: crit ? '#ffd166' : '#ff6b6b', big: crit });
      say(crit ? 'useStoneCrit' : 'useStone', { name: monsterName(), d });
      Sound.thud();
      if (crit) Sound.crit(); else Sound.hit();
      if (adv.hp === 0) {
        // 這局投下去的珠還沒用到，退回來
        const refund = round.betPaid + round.multPaid;
        state.payoutQueue += refund;
        adv.lost = Math.max(0, adv.lost - refund);
        round.bet = round.level = 0;
        round.lit.clear();
        round.refills.clear();
        round.phase = 'win';
        round.resetT = 1.6;
        round.landSlot = -1;
        defeatMonster();
      }
    },
    acid() {
      adv.defDown++;
      say('useAcid', { name: monsterName(), def: monsterDef() });
      Sound.thud();
    },
    heavy() {
      round.heavy++;
      say('useHeavy', { n: 1 + round.heavy });
      Sound.clunk();
    },
    hourglass() {
      round.hourglass = true;
      say('useHourglass');
      Sound.lock();
    },
    drink() {
      for (const i of round.lit) round.refills.add(i);
      round.lit.clear();
      say('useDrink');
      Sound.coin();
    },
    key() {
      const n = adv.lost;
      state.payoutQueue += n;
      adv.lost = 0;
      say('useKey', { n });
      Sound.coin();
      Sound.win();
    },
    shake() {
      round.placing = true;
      state.shakeT = 0.6;
      say('useShake');
      Sound.thud();
      setTimeout(() => Sound.thud(), 150);
    },
  };

  // 搖晃機台：點檯面放珠（釘子區，避開上方彎軌和下方落獎區）
  const PLACE_ZONE = { x0: B.left + 12, x1: LANE_X - 12, y0: 290, y1: SLOT_TOP - 20 };
  const inPlaceZone = p => p.x > PLACE_ZONE.x0 && p.x < PLACE_ZONE.x1 && p.y > PLACE_ZONE.y0 && p.y < PLACE_ZONE.y1;
  function placeBall(p) {
    if (!inPlaceZone(p)) { say('shakeWhere'); Sound.error(); return; }
    round.placing = false;
    // 拿發射口那顆來放，剩下的珠還是要拉彈簧發射
    const i = balls.findIndex(atShooter);
    if (i >= 0) balls.splice(i, 1);
    balls.push({ x: p.x, y: p.y, vx: 0, vy: 0, still: 0, fired: true, shake: true });
    round.launched++;
    const left = shots() - round.launched;
    syncRestBalls();
    round.phase = 'flying';
    state.shakeT = 0.3;
    say(left > 0 ? 'shakePlacedMore' : 'shakePlaced', { n: left });
    Sound.clunk();
  }

  // 彈珠用完時，背包裡還有能補珠或送投珠的道具，就先不判輸
  function canRescue() {
    if (mode !== 'adv' || !adv.campaign || adv.chest) return false;
    const has = id => (adv.items[id] || 0) > 0;
    return has('coin') || has('fake') || (has('key') && adv.lost > 0);
  }

  // 每局開始時檢查：彈珠用完、怪物還活著就落敗
  function checkAdvDefeat() {
    if (!advActive()) return;
    // 燈在閃，或已定燈但一顆都還沒投：這時沒有彈珠、也沒有珠在掉，就打不下去了
    const idle = (round.phase === 'select' || round.phase === 'bet') && round.bet === 0;
    if (!idle || state.credits > 0 || state.payoutQueue > 0 || tweens.length) return;
    if (canRescue()) {
      if (!adv.rescueSaid) { adv.rescueSaid = true; say('outUseItem'); }
      return;
    }
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
      state.credits += round.betPaid + round.multPaid;
      if (mode === 'adv') adv.lost = Math.max(0, adv.lost - round.betPaid - round.multPaid);
    }
    state.credits += state.payoutQueue;
    state.payoutQueue = 0;
    store[mode] = { credits: state.credits, lastWin: state.lastWin, started: state.started };
    mode = mode === 'classic' ? 'adv' : 'classic';
    TRAY.right = TRAY_RIGHT[mode];
    try { localStorage.setItem('candy-pinball-mode', mode); } catch (e) { /* 無痕模式 */ }
    ({ credits: state.credits, lastWin: state.lastWin, started: state.started } = store[mode]);
    tweens.length = 0;
    spills.length = 0;
    popups.length = 0;
    rebuildTray();
    balls.length = 0;
    newRound();
    applyMode();
  }

  // 過關獎勵「基礎倍率」：大冒險打怪時每段倍率都 +1
  const multBonus = () => mode === 'adv' && !chestStage() ? boon('multBase') : 0;
  const mult = () => multRule().mults[round.level] + multBonus();

  function ballAtShooter() {
    return balls.some(atShooter);
  }

  // 這回合要發射幾顆：大冒險（寶箱除外）投幾顆就一次發射幾顆，其他時候一顆
  const multiBall = () => mode === 'adv' && !chestStage();
  const shots = () => multiBall() ? Math.max(1, round.bet) : 1;

  // 發射軌道上排好這回合還沒發射的珠：大冒險投幾顆就疊幾顆在彈簧上，其他時候一顆
  function syncRestBalls() {
    const want = shots() - round.launched;
    const rest = balls.filter(b => !b.fired).sort((a, b) => a.y - b.y);   // 由上往下
    while (rest.length > want) balls.splice(balls.indexOf(rest.shift()), 1);
    for (let i = rest.length; i < want; i++) {
      const b = restBall();
      b.y -= i * BALL_R * 2;
      balls.push(b);
    }
  }

  function rollLit(n) {
    const slots = [...Array(SLOT_COUNT).keys()];
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    round.lit = new Set(slots.slice(0, n));
    // 寶箱：燈全亮；投 1 顆倍率珠出 3 排藍燈、2 顆再加 2 排紫燈、3 顆再加 1 排橘燈
    round.tiers.fill(0);
    if (chestStage()) {
      let k = 0;
      for (let tier = 1; tier < CHEST_LANES.length; tier++) {
        // 寶箱升級（過關獎勵）：沒投倍率珠也會多出藍燈
        const n = (tier <= round.level ? CHEST_LANES[tier] : 0) + (tier === 1 ? boon('chestRare') : 0);
        for (let j = 0; j < n && k < SLOT_COUNT; j++) round.tiers[slots[k++]] = tier;
      }
    }
  }

  // 這局亮幾顆攻擊燈：寶箱全亮；雷射筆（紅）、過關獎勵「攻擊燈數」多亮，但要留位置給補珠燈
  function litCount() {
    if (chestStage()) return SLOT_COUNT;
    const bonus = mode === 'adv' ? round.extraLit + boon('litUp') : round.extraLit;
    return Math.min(litFor(round.level) + bonus, SLOT_COUNT - 1 - round.extraRefill);
  }

  function newRound() {
    round.phase = 'select';
    round.bet = 0;
    round.level = 0;
    round.landSlot = -1;
    round.refills = new Set();
    round.betPaid = round.multPaid = 0;
    // 雷射筆效果持續整關
    round.extraLit = mode === 'adv' ? adv.stageLit : 0;
    round.extraRefill = mode === 'adv' ? adv.stageRefill : 0;
    round.heavy = 0;
    round.shakeIdx = -1;
    round.hourglass = round.placing = false;
    round.landed = [];
    round.launched = 0;
    round.hits = round.dmg = round.gain = 0;
    round.refunded = false;
    round.stack = {};
    round.crits = 0;          // 連鎖暴擊：這回合暴擊了幾次
    round.shattered = false;  // 碎甲：這回合降過防禦了沒
    adv.rescueSaid = false;
    rollLit(litCount());
    syncRestBalls();
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
    rollLit(litCount());
    round.phase = 'bet';
    Sound.lock();
    if (chestStage()) {
      say('lockedChest');
    } else if (mode === 'adv') {
      // 定燈後，在沒亮燈的排裡隨機挑一排當補珠燈（雷射筆（綠）、過關獎勵「補珠燈數」會多挑幾排；沒空排就不再加，不會擠掉紅燈）
      const free = [];
      for (let i = 0; i < SLOT_COUNT; i++) if (!round.lit.has(i)) free.push(i);
      for (let n = 1 + round.extraRefill + boon('refillLight'); n > 0 && free.length; n--) {
        round.refills.add(free.splice(Math.floor(Math.random() * free.length), 1)[0]);
      }
      say('lockedAdv', { lit: round.lit.size });
    } else {
      say('locked', { mult: mult(), lit: round.lit.size });
    }
  }

  let lastMsg = ['insertCoin', {}];
  let msgText = '', msgT = 0;
  function say(key, vars = {}) {
    lastMsg = [key, vars];
    const text = t(key, vars) + (vars.chain ? t('chainTag', { c: vars.chain }) : '');
    for (const el of msgEls) el.textContent = text;
    if (text !== msgText) { msgText = text; msgT = performance.now(); }
  }

  function takeBall(hole, delay = 0) {
    state.credits--;
    if (mode === 'adv' && adv.campaign) adv.lost++;
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
    if (mode === 'adv' && round.bet >= betCap()) {
      say(chestStage() ? 'chestBetOne' : 'betCapMsg', { n: betCap() });
      Sound.error();
      return false;
    }
    if (!hasCredits()) return false;
    takeBall(HOLES.bet);
    round.bet++;
    round.betPaid++;
    syncRestBalls();
    Sound.clunk();
    const raw = attackRaw();
    if (chestStage()) {
      say('chestBetMsg');
    } else if (mode === 'adv') {
      say(monsterDef() > 0 ? 'betInfoAdvDef' : 'betInfoAdv', { bet: round.bet, cap: betCap(), mult: mult(), win: computeHit(false).dmg, def: monsterDef() });
    } else {
      say('betInfo', { bet: round.bet, mult: mult(), win: raw });
    }
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

  // 升一段倍率需要的持珠數：大冒險要多留 1 顆投珠
  // 輕量合金：大冒險（寶箱除外）前幾段倍率免費
  const multCost = () => mode === 'adv' && !chestStage() && round.level < boon('light') ? 0 : multRule().cost;
  const multNeed = () => multCost() + (mode === 'adv' ? 1 : 0);

  function addMult() {
    Sound.init();
    if (advLocked()) return;
    if (round.phase !== 'select') { say('multLocked'); Sound.error(); return; }
    if (round.level >= multRule().mults.length - 1) {
      if (chestStage()) say('chestMultMax');
      else say('multMax', { max: multRule().mults[multRule().mults.length - 1] + multBonus() });
      Sound.error();
      return;
    }
    if (state.credits < multNeed()) {
      // 大冒險沒辦法投幣，加倍後至少要留 1 顆投珠，不然這局只能直接輸掉
      say(mode === 'adv' ? 'multKeepOne' : 'multShort', { cost: multRule().cost, need: multNeed() });
      Sound.error();
      return;
    }
    const cost = multCost();
    for (let i = 0; i < cost; i++) takeBall(HOLES.mult, i * 0.12);
    Sound.clunk();
    round.level++;
    round.multPaid += cost;
    if (chestStage()) say('chestTierUp', { desc: t('chestDesc' + round.level) });
    else say('multUp', { mult: mult(), lit: litCount() });
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

  // 一顆鋼珠落進第 slot 排（-1 是掉出機台）
  function land(b, slot) {
    balls.splice(balls.indexOf(b), 1);
    round.landed.push(slot);
    if (b.shake) round.shakeIdx = round.landed.length - 1;
    if (!multiBall()) {
      round.landSlot = slot;
      round.resetT = 1.6;
      resolveLanding(slot);
      return;
    }
    // 大冒險：每顆落下就結算（用了沙漏就等全部落下再一起預告）
    if (!round.hourglass && slot >= 0 && adv.status === 'playing') resolveBall(slot, !!b.shake);
    if (adv.status === 'won') { endEarly(); return; }
    if (round.launched < shots() || balls.length) return;    // 還有珠沒發射或還在檯面上
    if (round.hourglass) {
      round.phase = 'choose';
      Sound.lock();
      openChoice();
      return;
    }
    finishRound();
  }

  // 大冒險一顆珠的結果：攻擊燈造成傷害、補珠燈補珠、其他沒中
  function resolveBall(slot, shake = false) {
    const px = B.left + (slot + 0.5) * SLOT_W;
    // 同一顆燈疊珠：這回合第 k 顆落進同一顆燈的珠，攻擊 +(k−1)／補珠 +(k−1)
    const combo = round.stack[slot] || 0;
    round.stack[slot] = combo + 1;
    if (round.lit.has(slot)) {
      round.hits++;
      damageMonster(px, combo, shake ? 3 : 1);
    } else if (round.refills.has(slot)) {
      // 補珠燈：每顆補 2 顆；這回合第一次中還會退回投進倍率孔的珠
      const refund = round.refunded ? 0 : round.multPaid, bonus = refillBonus() + combo, n = refund + bonus;
      round.refunded = true;
      round.hits++;
      round.gain += n;
      state.payoutQueue += n;
      adv.lost = Math.max(0, adv.lost - n);
      const pop = t('refillPop', { n });
      popups.push({ x: px, y: SLOT_TOP - 16, text: combo ? t('comboPop', { k: combo + 1, text: pop }) : pop, t: 0, color: '#4ade80', big: combo > 0 });
      say(combo ? 'refillMsgCombo' : refund ? 'refillMsgMult' : 'refillMsg', { n, refund, bonus, k: combo + 1, c: combo });
      Sound.coin();
      if (hasTalent('burn')) adv.burn += boon('tinder');
      if (hasTalent('trauma')) {
        const dmg = Math.round(n * traumaRate());
        extraDamage(dmg, '#f472b6');
        if (boon('shatter') && !round.shattered && adv.monster && monsterDef() > 0) {
          round.shattered = true;
          adv.defDown = Math.min(adv.monster.def, adv.defDown + boon('shatter'));
        }
        say('traumaMsg', { n, dmg });
      }
    } else if (boon('roll')) {
      // 滾動補給：沒中的珠退回 1 顆
      state.payoutQueue += 1;
      adv.lost = Math.max(0, adv.lost - 1);
      popups.push({ x: px, y: SLOT_TOP - 16, text: t('refillPop', { n: 1 }), t: 0, color: '#cbd5e1' });
      Sound.tone(1320, 0.1, 'square', 0.05);
    } else {
      popups.push({ x: px, y: SLOT_TOP - 16, text: t('losePop'), t: 0, color: '#cbd5e1' });
      if (shots() === 1) say('advMissMsg', { name: monsterName() });
      Sound.miss();
    }
  }

  // 怪物在這回合中途被打倒：檯面上剩下的珠收掉，還沒發射的退回
  function endEarly() {
    const unfired = Math.min(round.betPaid, shots() - round.launched);
    if (unfired > 0) state.payoutQueue += unfired;
    balls.length = 0;
    round.phase = 'win';
    round.resetT = 1.6;
  }

  // 燃燒階段的時間點（秒）：等總結看完 → 點火、數層數 → 爆開扣血 → 收尾
  const BURN_WAIT = 0.7, BURN_BLAST = 1.1, BURN_END = 1.9;
  const burnPending = () => hasTalent('burn') && adv.burn > 0 && !adv.chest && adv.status === 'playing';

  // 大冒險這回合的珠全部落下：顯示總結，有燃燒的話接著跑一段燃燒動畫
  function finishRound() {
    round.resetT = 1.6;
    if (adv.status === 'won') { round.phase = 'win'; return; }
    const anyHit = round.landed.some(s => round.lit.has(s) || round.refills.has(s));
    const result = anyHit ? 'win' : 'lose';
    if (!anyHit) {
      state.lastWin = 0;
      adv.laughT = 1.3;
      setTimeout(() => Sound.snicker(), 250);
      say('advMissMsg', { name: monsterName() });
      Sound.lose();
    } else if (shots() > 1) {
      const key = round.dmg && round.gain ? 'roundSumBoth' : round.gain ? 'roundSumGain' : 'roundSumDmg';
      say(key, { n: shots(), hit: round.hits, dmg: round.dmg, gain: round.gain });
    }
    // 不再播勝利音效：每顆命中時已經各自有音效，勝利音效留給打倒怪物
    if (burnPending()) {
      round.phase = 'burn';
      round.burnT = anyHit || shots() > 1 ? -BURN_WAIT : -BURN_WAIT * 1.4;
      round.burnN = adv.burn;          // 這回合結算的層數
      round.burnLit = round.burnDone = false;
      round.burnNext = result;
      return;
    }
    round.phase = result;
  }

  // 燃燒階段：點火 → 數層數 → 爆開造成傷害 → 回到一般回合結束
  function updateBurn(dt) {
    round.burnT += dt;
    if (!round.burnLit && round.burnT >= 0) {
      round.burnLit = true;
      say('burnStart', { n: round.burnN });
      Sound.ignite();
    }
    if (!round.burnDone && round.burnT >= BURN_BLAST) {
      round.burnDone = true;
      burnTick();
    }
    if (round.burnT >= BURN_END) {
      round.phase = adv.status === 'won' ? 'win' : round.burnNext;
      round.resetT = 0.5;
    }
  }

  function resolveLanding(slot) {
    const px = B.left + (slot + 0.5) * SLOT_W;
    if (chestStage()) {
      openChest(slot, px);
      return;
    }
    if (round.lit.has(slot)) {
      const win = attackRaw();
      round.phase = 'win';
      if (mode === 'adv') {
        damageMonster(px);
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
    } else if (mode === 'adv' && round.refills.has(slot)) {
      // 補珠燈：不造成傷害，改成退回這局投進倍率孔的珠，再補 投珠數 × 2 顆
      const refund = round.multPaid, bonus = refillBonus(), n = refund + bonus;
      round.phase = 'win';
      state.payoutQueue += n;
      adv.lost = Math.max(0, adv.lost - n);
      popups.push({ x: px, y: SLOT_TOP - 16, text: t('refillPop', { n }), t: 0, color: '#4ade80' });
      say(refund ? 'refillMsgMult' : 'refillMsg', { n, refund, bonus });
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

  // 沙漏：預告這回合每顆珠的落點結果
  function landingPreview() {
    let refund = round.multPaid;
    const stack = {};
    const lines = round.landed.map((slot, i) => {
      let text;
      const combo = stack[slot] || 0;
      if (slot >= 0) stack[slot] = combo + 1;
      if (round.lit.has(slot)) {
        const { raw, def, dmg } = computeHit(false, combo);
        text = dmg > 0 ? t('hgHit', { dmg: dmg * (i === round.shakeIdx ? 3 : 1) }) : t('hgBlock', { raw, def });
      } else if (round.refills.has(slot)) {
        const n = refund + refillBonus() + combo;
        text = hasTalent('trauma') ? t('hgRefillHurt', { n, dmg: Math.round(n * traumaRate()) }) : t('hgRefill', { n });
        refund = 0;
      } else {
        text = t(slot < 0 ? 'hgOut' : 'hgMiss');
      }
      return round.landed.length > 1 ? t('hgBall', { i: i + 1, text }) : text;
    });
    return lines.join('\n');
  }

  function chooseHourglass(keep) {
    if (round.phase !== 'choose') return;
    if (keep) {
      round.landed.forEach((slot, i) => { if (slot >= 0 && adv.status === 'playing') resolveBall(slot, i === round.shakeIdx); });
      if (adv.status === 'won') endEarly();
      else finishRound();
      return;
    }
    // 返回上回合：退回這局投的珠（用掉的道具不退）
    const n = round.betPaid + round.multPaid;
    state.payoutQueue += n;
    adv.lost = Math.max(0, adv.lost - n);
    round.phase = 'rewind';
    round.resetT = 0.6;
    round.landSlot = -1;
    round.landed = [];
    say('hgRewind', { n });
    Sound.coin();
  }

  // ===== 物理 =====
  let ballWeight = 1;     // 加重彈珠（每層 +0.5）：撞到東西時反彈係數、隨機抖動都除以重量
  function collideCircle(b, px, py, rad, e, jitter = true) {
    e /= ballWeight;
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
      const j = (Math.random() - 0.5) * 8 / ballWeight;
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

  // 鋼珠互撞（大冒險同時好幾顆在檯面上）
  function collideBalls() {
    const min = BALL_R * 2;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, push = (min - d) / 2;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn >= 0) continue;
        const k = -(1 + 0.8) * vn / 2;
        a.vx -= k * nx; a.vy -= k * ny;
        b.vx += k * nx; b.vy += k * ny;
        if (-vn > 60) Sound.clink(-vn * 0.5);
      }
    }
  }

  function stepBall(b, h) {
    ballWeight = mode === 'adv' ? 1 + 0.5 * boon('weight') : 1;
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
      land(b, Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor((b.x - B.left) / SLOT_W))));
    } else if (b.y > H || b.x < 0 || b.x > W) {
      if (multiBall() && b.fired) { land(b, -1); return; }
      balls.splice(balls.indexOf(b), 1);
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
    for (let s = 0; s < SUBSTEPS && balls.length; s++) {
      for (const b of [...balls]) if (balls.includes(b)) stepBall(b, h);
      if (balls.length > 1) collideBalls();
    }

    // 卡住偵測：太久沒動就輕推一下
    for (const b of balls) {
      if (atShooter(b)) continue;
      if (Math.hypot(b.vx, b.vy) < 10) b.still += dt; else b.still = 0;
      if (b.still > 1.2) {
        b.vx += (Math.random() - 0.5) * 160;
        b.vy -= 100;
        b.still = 0;
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
      checkAdvDefeat();
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
        rollLit(litCount());
        round.flashT = 0.12;
      }
    }

    state.shakeT = Math.max(0, state.shakeT - dt);
    if (round.phase === 'burn') updateBurn(dt);
    if (round.phase === 'win' || round.phase === 'lose' || round.phase === 'rewind') {
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
    if (round.placing) { say('shakeWhere'); return; }
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
      // 彈簧上疊著的珠整疊一起射出：上面的最快、越下面稍慢一點，飛出去後才會拉開距離
      const stack = balls.filter(atShooter).sort((a, b) => b.y - a.y);   // 由下往上
      const v = 600 + 640 * p, n = stack.length;
      stack.forEach((b, i) => {
        b.y = Math.min(b.y, SHOOTER_FLOOR - BALL_R - i * BALL_R * 2);
        b.vy = -v * (1 - 0.05 * (n - 1 - i));
        b.vx = 0;
        if (!b.fired) { b.fired = true; round.launched++; }
      });
      round.phase = 'flying';
      Sound.spring(p);
      say(n > 1 ? 'firedN' : 'fired', { n });
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
    white: { glow: '#ffffff', c0: '#ffffff', c1: '#f1f5f9', c2: '#94a3b8', halo: 'rgba(255, 255, 255, 0.18)' },
    blue: { glow: '#3b82f6', c0: '#eff6ff', c1: '#60a5fa', c2: '#1d4ed8', halo: 'rgba(59, 130, 246, 0.22)' },
    purple: { glow: '#a855f7', c0: '#faf5ff', c1: '#c084fc', c2: '#7e22ce', halo: 'rgba(168, 85, 247, 0.24)' },
    orange: { glow: '#f97316', c0: '#fff7ed', c1: '#fb923c', c2: '#c2410c', halo: 'rgba(249, 115, 22, 0.26)' },
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
    for (let j = 0; j < multRule().mults.length; j++) {
      const x = multColX(j);
      c.fillStyle = '#111';
      if (lang === 'zh') {
        c.font = `bold 30px ${KAI}`;
        c.fillText(MULT_COLS[j][0], x, 62);
        c.fillText(MULT_COLS[j][1], x, 96);
      } else {
        c.font = `bold 28px Georgia, "Times New Roman", serif`;
        c.fillText('×' + multRule().mults[j], x, 80);
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
    const TR = TRAY.right + 14;          // 托盤外緣的右邊（大冒險會往左縮，讓出背包按鈕）
    const body = c.createLinearGradient(0, 920, 0, 1050);
    body.addColorStop(0, '#f3f4f6');
    body.addColorStop(0.5, '#9ca3af');
    body.addColorStop(1, '#d1d5db');
    roundRect(c, 20, 920, TR - 20, 130, 14);
    c.fillStyle = body;
    c.fill();
    c.save();
    roundRect(c, 30, 927, TR - 40, 112, 10);
    c.clip();
    const floor = c.createLinearGradient(0, 927, 0, 1038);
    floor.addColorStop(0, '#4b5058');
    floor.addColorStop(0.2, '#868d95');
    floor.addColorStop(0.75, '#b9bec5');
    floor.addColorStop(1, '#d6dade');
    c.fillStyle = floor;
    c.fillRect(30, 927, TR - 40, 112);
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
    c.fillRect(30, 927, TR - 40, 19);
    // 左右側壁
    for (const [x0, x1] of [[30, 48], [TR - 10, TR - 28]]) {
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
    c.fillRect(30, 980, TR - 40, 58);
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
    } else if (kind === 'treasure') {
      box(0, 0, w, h, '#2b1d3a');
      // 石磚牆
      for (let row = 0; row * 16 < h; row++) {
        for (let col = -1; col * 32 < w; col++) {
          const x = col * 32 + (row % 2 ? 16 : 0);
          box(x + 2, row * 16 + 2, 28, 12, ['#3a2a4d', '#352645', '#402f55'][Math.floor(r() * 3)]);
        }
      }
      // 地上的金幣堆
      for (let x = 0; x < w; x += P) {
        const hh = 6 + Math.round(Math.abs(Math.sin(x * 0.03)) * 14 + Math.abs(Math.sin(x * 0.11 + 1)) * 6);
        box(x, h - 14 - hh, P, hh, '#c8961a');
      }
      box(0, h - 14, w, 14, '#a87a12');
      for (let i = 0; i < 70; i++) box(r() * w, h - 30 + r() * 26, P, P, r() < 0.5 ? '#ffe08a' : '#f5c542');
      // 兩邊的寶石
      for (const [x, col] of [[40, '#ef4444'], [76, '#22d3ee'], [w - 60, '#a855f7'], [w - 96, '#4ade80']]) {
        box(x, h - 40, 8, 8, col);
        box(x + 2, h - 38, P, P, '#ffffff');
      }
    } else if (kind === 'ruins') {
      bands(['#f3d9a4', '#f0c98d', '#ebb877', '#e3a663', '#d99558'], 0, h - 24);
      disc(Math.round(w * 0.82), 30, 14, '#fff1c1');                         // 夕陽
      // 遠方的階梯神殿
      const tx0 = Math.round(w * 0.12), tw = Math.round(w * 0.32);
      for (let k = 0; k < 6; k++) box(tx0 + k * 8, h - 24 - (k + 1) * 8, tw - k * 16, 8, k % 2 ? '#c98a5a' : '#bf7f50');
      // 斷掉的石柱
      [[0.06, 60, true], [0.24, 38, false], [0.64, 52, true], [0.88, 30, false]].forEach(([f, ch, top]) => {
        const x = Math.round(w * f);
        box(x, h - 24 - ch, 16, ch, '#cdb892');
        box(x + 4, h - 24 - ch, 4, ch, '#ad9870');
        box(x + 12, h - 24 - ch, 4, ch, '#bba67e');
        if (top) box(x - 4, h - 24 - ch - 6, 24, 6, '#b8a27a');
        else box(x, h - 24 - ch - 4, 8, 4, '#cdb892');                       // 斷口
        for (let y = h - 24 - ch + 6; y < h - 30; y += 12) if (r() < 0.6) box(x + (r() < 0.5 ? 0 : 12), y, P, 8, '#5f8f3e');
      });
      // 倒在地上的石塊
      box(Math.round(w * 0.36), h - 32, 28, 8, '#b8a27a');
      box(Math.round(w * 0.74), h - 30, 20, 6, '#b8a27a');
      box(0, h - 24, w, 24, '#d8c08a');
      for (let i = 0; i < 40; i++) box(r() * w, h - 22 + r() * 20, P, P, r() < 0.5 ? '#c4ab78' : '#e6d3a3');
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
    } else if (kind === 'ruins') {
      // 風吹起的沙塵往右飄
      ctx.fillStyle = 'rgba(255, 241, 200, 0.7)';
      for (let i = 0; i < 10; i++) {
        const x = (i * 47 + time * (25 + (i % 3) * 12)) % S.w;
        const y = S.h - 30 - (i % 5) * 9 + Math.sin(time * 2 + i) * 3;
        ctx.fillRect(S.x + Math.floor(x / 2) * 2, S.y + Math.floor(y / 2) * 2, 2, 2);
      }
    } else if (kind === 'treasure') {
      // 金幣堆上一閃一閃的光點
      for (let i = 0; i < 8; i++) {
        if (Math.floor(time * 3 + i * 0.9) % 3 !== 0) continue;
        const x = S.x + 18 + ((i * 61) % (S.w - 36)), y = S.y + S.h - 22 - (i % 3) * 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 2, 2);
        ctx.fillRect(x - 2, y + 2, 2, 2);
        ctx.fillRect(x + 2, y + 2, 2, 2);
        ctx.fillRect(x, y + 4, 2, 2);
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

  // 像素盾牌（代表防禦）
  const SHIELD = [
    '.KKKKK.',
    'KSSWSSK',
    'KSSWSSK',
    'KSWWWSK',
    'KSSWSSK',
    '.KSWSK.',
    '..KSK..',
    '...K...',
  ];
  const SHIELD_PAL = { K: '#1e3a8a', S: '#60a5fa', W: '#dbeafe' };
  const SHIELD_PX = 2, SHIELD_W = 7 * SHIELD_PX, SHIELD_H = 8 * SHIELD_PX;
  function drawShield(x, y) {
    SHIELD.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      ctx.fillStyle = SHIELD_PAL[ch];
      ctx.fillRect(Math.round(x) + c * SHIELD_PX, Math.round(y) + r * SHIELD_PX, SHIELD_PX, SHIELD_PX);
    }));
  }

  // ===== 燃燒動畫 =====
  // 火勢 0~1：點火後慢慢變大，爆開時最大，之後退掉
  function burnPower() {
    const t = round.burnT;
    if (t < BURN_BLAST) return Math.min(1, t / BURN_BLAST) * 0.7;
    return Math.max(0, 1 - (t - BURN_BLAST) / (BURN_END - BURN_BLAST)) * (t - BURN_BLAST < 0.15 ? 1.3 : 1);
  }
  // 怪物後面一圈橘紅色火光
  function drawBurnGlow(cx, y0, size, time) {
    const k = burnPower(), cy = y0 + size * 0.6;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 1.2);
    g.addColorStop(0, `rgba(255, 140, 40, ${0.55 * k + 0.08 * Math.sin(time * 20)})`);
    g.addColorStop(1, 'rgba(255, 60, 20, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - size * 1.3, y0 - 20, size * 2.6, size * 1.6);
  }
  // 怪物身上的像素火焰、往上飄的火星、正中間的層數
  function drawBurnFx(m, x0, y0, size, time) {
    const k = burnPower(), P = 4, cx = x0 + size / 2;
    // 怪物整隻被燒得發紅，爆開那一下最亮
    ctx.fillStyle = `rgba(255, ${90 + Math.round(60 * Math.sin(time * 18))}, 0, ${Math.min(0.75, 0.25 + 0.4 * k)})`;
    m.map.forEach((row, r) => [...row].forEach((ch, col) => {
      if (ch !== '.') ctx.fillRect(x0 + col * PX, y0 + r * PX, PX, PX);
    }));
    const tongues = Math.min(12, 5 + round.burnN);
    const base = y0 + size + 4;
    const seed = i => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    for (let i = 0; i < tongues; i++) {
      const fx = cx - size * 0.6 + (i + 0.5) * size * 1.2 / tongues;
      const flick = 0.6 + 0.4 * Math.abs(Math.sin(time * (9 + seed(i) * 6) + i * 1.7));
      const h = Math.round((size * (0.6 + seed(i + 7) * 0.7)) * Math.min(1, k) * flick / P);
      for (let r = 0; r < h; r++) {
        const f = r / Math.max(1, h);                 // 0 底部 → 1 尖端
        const w = Math.max(1, Math.round((1 - f) * 3));
        ctx.fillStyle = f < 0.2 ? '#fef08a' : f < 0.45 ? '#facc15' : f < 0.75 ? '#f97316' : '#dc2626';
        ctx.globalAlpha = Math.min(1, 1.15 - f * 0.6);
        const sway = Math.round(Math.sin(time * 8 + i + r * 0.5) * f * 1.5);
        ctx.fillRect(Math.round(fx / P + sway - w / 2) * P, base - (r + 1) * P, w * P, P);
      }
    }
    // 火星
    for (let i = 0; i < 18; i++) {
      const life = (time * (0.7 + seed(i) * 0.6) + seed(i + 3)) % 1;
      if (life > k + 0.2) continue;
      ctx.globalAlpha = (1 - life) * Math.min(1, k * 1.5);
      ctx.fillStyle = seed(i + 5) > 0.5 ? '#fde047' : '#fb923c';
      const ex = cx + (seed(i + 9) - 0.5) * size * 1.1 + Math.sin(time * 3 + i) * 6;
      ctx.fillRect(Math.round(ex), Math.round(base - life * size * 1.1), 3, 3);
    }
    ctx.globalAlpha = 1;
    // 層數：點火時從 0 數到 n，爆開時放大
    const t = round.burnT;
    const shown = t < BURN_BLAST * 0.8 ? Math.ceil(round.burnN * Math.min(1, t / (BURN_BLAST * 0.7))) : round.burnN;
    if (t < BURN_BLAST + 0.35) {
      const pop = t >= BURN_BLAST ? 1 + (t - BURN_BLAST) * 2.5 : 1;
      ctx.globalAlpha = t >= BURN_BLAST ? Math.max(0, 1 - (t - BURN_BLAST) / 0.35) : Math.min(1, t * 5);
      ctx.font = `bold ${Math.round(24 * pop)}px "Courier New", Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#450a0a';
      const label = `🔥×${Math.max(0, shown)}`, ly = y0 + 10;
      ctx.textBaseline = 'middle';
      ctx.strokeText(label, cx, ly);
      ctx.fillStyle = '#fde047';
      ctx.fillText(label, cx, ly);
      ctx.globalAlpha = 1;
    }
  }

  function drawMonster(m, x0, y0, flash, laughing = false, open = false) {
    const map = open ? m.open : laughing ? m.laugh : m.map;
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
      const opened = adv.chest && adv.status === 'won';
      const laughing = !adv.chest && (adv.laughT > 0 || adv.status === 'lost');
      if (laughing) {
        oy += Math.floor(time * 16) % 2 ? -3 : 0;
        ox += Math.floor(time * 11) % 2 ? 1 : -1;
      }
      const x0 = cx - size / 2 + ox, y0 = S.y + 8 + oy;
      const visible = adv.status !== 'won' || adv.chest || (adv.dieT > 0 && Math.floor(adv.dieT * 12) % 2 === 0);
      if (opened) {
        // 打開的寶箱往外發光
        const g = ctx.createRadialGradient(cx, y0 + 30, 4, cx, y0 + 30, 70);
        g.addColorStop(0, `rgba(255, 224, 138, ${0.55 + 0.2 * Math.sin(time * 6)})`);
        g.addColorStop(1, 'rgba(255, 224, 138, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 80, S.y, 160, S.h);
      }
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
      const burning = round.phase === 'burn' && round.burnT >= 0 && visible;
      if (burning) drawBurnGlow(cx, y0, size, time);
      if (visible) drawMonster(m, x0, y0, adv.hitT > 0 && Math.floor(adv.hitT * 20) % 2 === 0, laughing, opened);
      if (burning) drawBurnFx(m, x0, y0, size, time);
      if (opened && adv.loot) {
        // 拿到的道具從寶箱旁邊浮出來
        const icon = ITEM_ICONS[adv.loot], IP = 4;
        const ix = x0 + size + 14, iy = y0 + 10 + Math.round(Math.sin(time * 4) * 3);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(ix - 3, iy - 3, 12 * IP + 6, 12 * IP + 6);
        icon.map.forEach((row, r) => [...row].forEach((ch, col) => {
          if (ch === '.') return;
          ctx.fillStyle = icon.pal[ch];
          ctx.fillRect(ix + col * IP, iy + r * IP, IP, IP);
        }));
      }
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
        ctx.fillStyle = p.color || '#ff5c5c';
        ctx.font = `bold ${p.big ? 34 : 22}px ${PIXEL_FONT}`;
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
        const label = adv.status === 'won' ? (adv.chest ? 'OPEN!' : 'VICTORY!') : 'GAME OVER';
        textBacking(S.x + S.w - ctx.measureText(label).width - 16, S.y + 4, ctx.measureText(label).width + 12, 20);
        if (adv.status === 'lost') { ctx.fillStyle = '#ef4444'; ctx.fillText(label, S.x + S.w - 10, S.y + 14); }
        else if (Math.floor(time * 4) % 2 === 0) { ctx.fillStyle = '#facc15'; ctx.fillText(label, S.x + S.w - 10, S.y + 14); }
      } else if (adv.campaign) {
        const label = (adv.chest ? 'TREASURE' : `STAGE ${adv.monsterIdx + 1}/${MONSTERS.length}`) + ` LV${advLevel()}`;
        textBacking(S.x + S.w - ctx.measureText(label).width - 16, S.y + 4, ctx.measureText(label).width + 12, 20);
        ctx.fillStyle = '#facc15';
        ctx.fillText(label, S.x + S.w - 10, S.y + 14);
      }

      // 怪物下面：HP 血條 + 盾牌（防禦）
      ctx.font = `bold 15px ${PIXEL_FONT}`;
      const hpText = `${adv.hp}/${adv.maxHp}`, defText = String(monsterDef()) + (adv.burn ? `  🔥${adv.burn}` : '');
      const labelW = ctx.measureText('HP').width, hpW = ctx.measureText(hpText).width, defW = ctx.measureText(defText).width;
      const bw = 200, bh = 12, by = S.y + 99;                       // 往下一點，讓出影子的位置
      const groupW = labelW + 8 + bw + 8 + hpW + 12 + SHIELD_W + 4 + defW;
      const gx = cx - groupW / 2;                                     // 整組置中
      const bx = gx + labelW + 8;
      const segs = 20, gap = 2, sw = (bw - gap * (segs - 1)) / segs;
      const ratio = adv.hp / adv.maxHp;
      const filled = Math.ceil(ratio * segs);
      const barColor = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#ef4444';
      textBacking(gx - 8, by - 6, groupW + 16, bh + 12);
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
      ctx.fillText(hpText, bx + bw + 8, by + bh / 2 + 1);
      const shx = bx + bw + 8 + hpW + 12;
      drawShield(shx, by + bh / 2 - SHIELD_H / 2);
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(defText, shx + SHIELD_W + 4, by + bh / 2 + 1);
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
    const chest = chestStage();
    // 落到珠的那幾排：中了閃燈、沒中蓋一層淡白
    const showLand = round.phase === 'win' || round.phase === 'lose' || round.phase === 'flying' || round.phase === 'burn';
    const landed = new Set(showLand ? round.landed : []);
    for (const i of round.lit) {
      const on = landed.has(i) ? blink : true;
      led(ctx, B.left + (i + 0.5) * SLOT_W, LED_Y, 6, on, chest ? TIERS[round.tiers[i]].led : 'red');
    }
    for (const i of round.refills) {
      const on = landed.has(i) ? blink : true;
      led(ctx, B.left + (i + 0.5) * SLOT_W, LED_Y, 6, on, 'green');
    }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (const i of landed) {
      if (i < 0 || round.lit.has(i) || round.refills.has(i)) continue;
      ctx.fillRect(B.left + i * SLOT_W + 4, SLOT_TOP, SLOT_W - 8, SLOT_FLOOR - SLOT_TOP);
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
    if (state.charging || !state.started || advLocked() || round.placing) return;
    if (round.phase === 'select') {
      const m = HOLES.mult;
      if (state.credits >= multNeed() && round.level < multRule().mults.length - 1) {
        hintCircle(time, m.x, m.y, m.r + 5);
        hintBubble(time, m.x, m.y - m.r - 10, 'above', t('hintMult'), 'start');
      }
      hintCircle(time, BUTTON.x, BUTTON.y, BUTTON.r + 8);
      hintBubble(time, BUTTON.x, BUTTON.y - BUTTON.r - 12, 'above', t('hintLock'), 'end');
    } else if (round.phase === 'bet') {
      const b = HOLES.bet;
      if (state.credits > 0 && !(mode === 'adv' && round.bet >= betCap())) hintCircle(time, b.x, b.y, b.r + 5);
      if (round.bet === 0) {
        // 大冒險：投珠孔左邊是背包按鈕，提示改放在投珠孔上方
        if (mode === 'adv') hintBubble(time, b.x, b.y - b.r - 10, 'above', t('hintBet'), 'end');
        else hintBubble(time, b.x - b.r - 8, b.y, 'left', t('hintBet'));
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
    const TR = TRAY.right + 14;
    roundRect(ctx, 20, 1030, TR - 20, 22, 11);
    ctx.fillStyle = lip;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, 1035.5);
    ctx.lineTo(TR - 16, 1035.5);
    ctx.stroke();
    // 持珠顯示器最多到 DISPLAY_MAX，超過的部分才在右下角另外顯示
    const hidden = state.credits - DISPLAY_MAX;
    if (hidden > 0) {
      ctx.font = `bold 12px ${SANS}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#374151';
      ctx.fillText(t('moreBalls', { n: hidden }), TR - 16, 1041);
    }
  }

  // 背包按鈕：托盤和投珠孔之間，右上角顯示道具數量
  // 白邊圓形按鈕底座（背包、狀態共用），下方寫標籤
  function roundButton(x, y, r, c0, c1, label) {
    ctx.beginPath();
    ctx.arc(x + 1, y + 2, r + 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    const rim = ctx.createRadialGradient(x - 5, y - 6, 2, x, y, r);
    rim.addColorStop(0, '#ffffff');
    rim.addColorStop(1, '#d9d6cc');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();
    const inner = ctx.createRadialGradient(x - 4, y - 5, 1, x, y, r - 3);
    inner.addColorStop(0, c0);
    inner.addColorStop(1, c1);
    ctx.beginPath();
    ctx.arc(x, y, r - 3, 0, Math.PI * 2);
    ctx.fillStyle = inner;
    ctx.fill();
    ctx.fillStyle = '#3b2412';
    ctx.font = `bold 12px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + r + 12);
  }

  // 狀態按鈕：藍底、三根長條圖
  function drawStatsBtn() {
    if (mode !== 'adv') return;
    const { x, y, r } = STATS;
    ctx.save();
    roundButton(x, y, r, '#3d6fa8', '#16304f', t('cvStats'));
    ctx.strokeStyle = '#0b1a2b';
    ctx.lineWidth = 1.2;
    [[-7, 5], [-2, 9], [3, 13]].forEach(([dx, hgt]) => {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(x + dx, y + 6 - hgt, 4, hgt);
      ctx.strokeRect(x + dx, y + 6 - hgt, 4, hgt);
    });
    ctx.fillStyle = '#e8f1ff';
    ctx.fillRect(x - 9, y + 6, 18, 1.5);
    ctx.restore();
  }

  function drawBag() {
    if (mode !== 'adv') return;
    const { x, y, r } = BAG;
    ctx.save();
    roundButton(x, y, r, '#9a6532', '#4a2c12', t('cvBag'));
    // 背包圖案：提把、包身、蓋子、扣環、前口袋（按鈕縮小了，圖案跟著縮）
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.85, 0.85);
    ctx.translate(-x, -y);
    ctx.strokeStyle = '#2a1405';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y - 7, 4.5, Math.PI, 0);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    roundRect(ctx, x - 9, y - 7, 18, 18, 4);
    ctx.fillStyle = '#f0c27a';
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, x - 9, y - 7, 18, 8, 3);
    ctx.fillStyle = '#d49a4f';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - 2, y - 1, 4, 4);
    ctx.strokeRect(x - 2, y - 1, 4, 4);
    roundRect(ctx, x - 5, y + 4, 10, 5, 2);
    ctx.stroke();
    ctx.restore();
    const n = itemCount();
    if (n > 0) {
      const bx = x + r - 3, by = y - r + 3;
      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#e63946';
      ctx.fill();
      ctx.strokeStyle = '#fff3d6';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 11px ${SANS}`;
      ctx.fillText(String(Math.min(99, n)), bx, by + 0.5);
    }
    ctx.restore();
  }

  // 搖晃機台：框出可以放珠的範圍
  function drawPlacing(time) {
    if (!round.placing) return;
    const Z = PLACE_ZONE;
    hintRect(time, Z.x0, Z.y0, Z.x1 - Z.x0, Z.y1 - Z.y0);
    hintBubble(time, (Z.x0 + Z.x1) / 2, Z.y0 + 6, 'below', t('shakeHint'));
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
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1a0d05';
      const y = p.y - p.t * 30;
      const x = Math.max(60, Math.min(LANE_X - 50, p.x));
      if (p.big) {
        // 暴擊：先放大彈出再縮回，金色發光、橘色粗框
        const s = p.t < 0.12 ? 1 + 1.2 * (p.t / 0.12) : 1.4 + 0.8 * Math.max(0, 0.3 - p.t);
        ctx.save();
        ctx.translate(Math.max(90, Math.min(LANE_X - 80, p.x)), y - 6);
        ctx.scale(s, s);
        ctx.rotate(-0.06);
        ctx.font = `900 24px ${SANS}`;
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#7c2d12';
        ctx.strokeText(p.text, 0, 0);
        ctx.shadowColor = '#ffb703';
        ctx.shadowBlur = 16;
        ctx.fillStyle = Math.floor(p.t * 16) % 2 ? '#fff3b0' : p.color;
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
        continue;
      }
      ctx.font = `900 22px ${SANS}`;
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
    for (const b of balls) {
      drawShadow(b.x + 2.5, b.y + 3.5, 0.9);
      drawBall(b.x, b.y, sprites.board);
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
    drawStatsBtn();
    drawBag();
    drawTweens();
    drawHints(t);
    drawPlacing(t);
    drawSpills();
    // 搖晃機台：整台晃一下
    const shaking = state.shakeT > 0;
    if (shaking || canvasShaken) {
      canvas.style.transform = shaking
        ? `translate(${((Math.random() - 0.5) * 10).toFixed(1)}px, ${((Math.random() - 0.5) * 6).toFixed(1)}px) rotate(${((Math.random() - 0.5) * 1.4).toFixed(2)}deg)`
        : '';
      canvasShaken = shaking;
    }
  }
  let canvasShaken = false;

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
    if (document.querySelector('dialog[open]')) return;   // 說明、背包視窗開著時不操作機台（Esc 會關閉視窗）
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
      case 'KeyI': openBag(); break;
      case 'KeyT': openCodex(); break;
      case 'KeyS': openStats(); break;
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
    if (mode === 'adv' && Math.hypot(p.x - BAG.x, p.y - BAG.y) < BAG.r + 8) return 'bag';
    if (mode === 'adv' && Math.hypot(p.x - STATS.x, p.y - STATS.y) < STATS.r + 8) return 'stats';
    if (mode === 'classic' && Math.abs(p.x - COIN_SLOT.x) < 34 && Math.abs(p.y - COIN_SLOT.y) < 50) return 'coin';
    return null;
  }

  canvas.addEventListener('pointerdown', e => {
    const p = toLogical(e);
    const target = hitTarget(p);
    e.preventDefault();
    if (target === 'bag') openBag();
    else if (target === 'stats') openStats();
    else if (round.placing) placeBall(p);
    else if (target === 'bet') {
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


  // ---- 背包 ----
  const bagDlg = $('bag'), bagList = $('bag-list'), bagNote = $('bag-note');
  const choiceDlg = $('choice');

  function cancelCharge() {
    state.charging = false;
    state.power = 0;
    state.floorY = SHOOTER_FLOOR;
    fireBtn.classList.remove('pressed');
  }

  function renderBag() {
    bagList.textContent = '';
    const ids = ITEM_IDS.filter(id => adv.items[id] > 0);
    const general = itemBlockGeneral();
    bagNote.textContent = !ids.length ? t('bagEmpty')
      : general ? t(general)
      : t(round.phase === 'select' ? 'bagNowSelect' : 'bagNowBet');
    for (const id of ids) {
      const it = ITEMS[id], tier = TIERS[it.tier];
      const li = document.createElement('li');
      li.className = 'bag-item';
      li.style.setProperty('--tier', tier.color);
      const head = document.createElement('div');
      head.className = 'bag-head';
      const name = document.createElement('b');
      name.textContent = it.name[lang];
      const tag = document.createElement('span');
      tag.className = 'bag-tier';
      tag.textContent = tier.name[lang];
      const count = document.createElement('span');
      count.className = 'bag-count';
      count.textContent = '×' + adv.items[id];
      head.append(itemIcon(id, 3), name, tag, count);
      const quote = document.createElement('p');
      quote.className = 'bag-quote';
      quote.textContent = it.quote[lang];
      const effect = document.createElement('p');
      effect.textContent = itemEffect(id);
      const when = document.createElement('p');
      when.className = 'bag-when';
      when.textContent = t({ pre: 'whenPre', post: 'whenPost', both: 'whenBoth' }[it.when]);
      const row = document.createElement('div');
      row.className = 'bag-row';
      const why = itemBlock(id);
      const reason = document.createElement('span');
      reason.className = 'bag-reason';
      if (why && why !== general) reason.textContent = t(why);
      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'btn coin';
      use.textContent = t('bagUse');
      use.disabled = !!why;
      use.addEventListener('click', () => { if (useItem(id)) bagDlg.close(); else renderBag(); });
      row.append(reason, use);
      li.append(head, quote, effect, when, row);
      bagList.append(li);
    }
  }

  function openBag() {
    if (mode !== 'adv' || !bagDlg) return;
    Sound.init();
    cancelCharge();
    stopBetHold();
    Sound.clunk();
    renderBag();
    bagDlg.showModal();
  }

  // 沙漏：落點後跳出選擇
  function openChoice() {
    cancelCharge();
    stopBetHold();
    $('choice-text').textContent = landingPreview();
    $('choice-ask').textContent = t('hgAsk');
    choiceDlg.showModal();
  }
  if (choiceDlg) {
    choiceDlg.addEventListener('cancel', e => e.preventDefault());   // 一定要選一個
    $('choice-keep').addEventListener('click', () => { choiceDlg.close(); chooseHourglass(true); });
    $('choice-rewind').addEventListener('click', () => { choiceDlg.close(); chooseHourglass(false); });
  }
  if (bagDlg) bagDlg.addEventListener('click', e => { if (e.target === bagDlg) bagDlg.close(); });

  // ---- 寶藏圖鑑：依稀有度、名稱排列；沒取得過的道具只顯示黑色輪廓、不能點 ----
  const codexDlg = $('codex'), codexGrid = $('codex-grid'), codexDetail = $('codex-detail');
  const BLACK = new Proxy({}, { get: () => '#000000' });

  function renderCodex() {
    codexGrid.textContent = '';
    codexDetail.hidden = true;
    codexGrid.hidden = false;
    $('codex-count').textContent = t('codexCount', { n: ITEM_IDS.filter(id => itemsSeen.has(id)).length, total: ITEM_IDS.length });
    TIERS.forEach((tier, ti) => {
      const head = document.createElement('h3');
      head.className = 'codex-tier';
      head.style.setProperty('--tier', tier.color);
      head.textContent = tier.name[lang];
      const row = document.createElement('div');
      row.className = 'codex-row';
      const ids = ITEM_IDS.filter(id => ITEMS[id].tier === ti)
        .sort((a, b) => ITEMS[a].name[lang].localeCompare(ITEMS[b].name[lang], lang === 'zh' ? 'zh-Hant-TW' : 'en'));
      for (const id of ids) {
        const seen = itemsSeen.has(id);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'codex-cell' + (seen ? '' : ' unknown');
        b.style.setProperty('--tier', tier.color);
        b.disabled = !seen;
        const icon = seen ? itemIcon(id, 3) : pixelCanvas(ITEM_ICONS[id].map, BLACK, 3);
        icon.classList.add('item-icon');
        icon.style.width = icon.style.height = '36px';
        const name = document.createElement('span');
        name.textContent = seen ? ITEMS[id].name[lang] : '？？？';
        b.append(icon, name);
        if (seen) b.addEventListener('click', () => { Sound.clunk(); showCodexItem(id); });
        row.append(b);
      }
      codexGrid.append(head, row);
    });
  }

  function showCodexItem(id) {
    const it = ITEMS[id], tier = TIERS[it.tier];
    codexDetail.textContent = '';
    codexDetail.style.setProperty('--tier', tier.color);
    const name = document.createElement('h3');
    name.textContent = it.name[lang];
    const tag = document.createElement('span');
    tag.className = 'bag-tier';
    tag.textContent = tier.name[lang];
    const quote = document.createElement('p');
    quote.className = 'bag-quote';
    quote.textContent = it.quote[lang];
    const effect = document.createElement('p');
    effect.textContent = it.effect[lang].replace(/\s*[（(][^）)]*\{n\}[^）)]*[）)]/, '');
    const when = document.createElement('p');
    when.className = 'bag-when';
    when.textContent = t({ pre: 'whenPre', post: 'whenPost', both: 'whenBoth' }[it.when]);
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn';
    back.textContent = t('codexBack');
    back.addEventListener('click', () => { codexDetail.hidden = true; codexGrid.hidden = false; });
    codexDetail.append(itemIcon(id, 6), name, tag, quote, effect, when, back);
    codexGrid.hidden = true;
    codexDetail.hidden = false;
  }

  // ---- 數值面板：目前所有的數值狀態 ----
  const statsDlg = $('stats'), statsBody = $('stats-body');
  function renderStats() {
    statsBody.textContent = '';
    const sec = title => {
      const h = document.createElement('h3');
      h.textContent = t(title);
      statsBody.append(h);
    };
    const row = (label, ...content) => {
      const r = document.createElement('div');
      r.className = 'st-row';
      const l = document.createElement('span');
      l.className = 'st-label';
      l.textContent = t(label);
      const v = document.createElement('div');
      v.className = 'st-value';
      v.append(...content.map(String));
      r.append(l, v);
      statsBody.append(r);
    };
    const pct = x => Math.round(x * 100) + '%';
    const plus = n => (n > 0 ? '+' : '') + n;

    sec('stSecLevel');
    if (adv.talent) row('stTalent', TALENTS[adv.talent].name[lang]);
    if (adv.talent === 'burn') row('stBurn', adv.burn);
    if (adv.talent === 'trauma') row('stTrauma', pct(traumaRate()));
    if (boon('armor')) row('stArmor', '−' + boon('armor'));
    row('stLevel', 'Lv' + advLevel());
    row('stLevelAtk', '+' + levelAtk());
    sec('stSecBalls');
    row('stBetCap', t('statusBallsN', { n: betCap() }));
    // 剛打倒怪物、還沒進寶箱時，下一筆補珠就是這次的；其他時候是打倒下一隻之後的
    const nextBonus = adv.status === 'won' && !adv.chest ? stageBonus() : CAMPAIGN_BONUS + LEVEL_BONUS * advKills();
    if (adv.campaign) row('stBonus', t('statusBallsN', { n: nextBonus }));

    sec('stSecAttack');
    row('stMultBase', '+' + boon('multBase'));
    row('stLitUp', plus(boon('litUp')));
    row('stPerBall', plus(boon('perBall') + talentAtk()));
    row('stPierce', plus(boon('pierce')));
    row('stCritRate', pct(critRate()));
    row('stCritDmg', pct(critMult()));

    sec('stSecOther');
    row('stRefillLights', t('stRefillLightsN', { n: 1 + boon('refillLight') }));
    row('stRefill', t('statusBallsN', { n: refillBonus() }));
    row('stWeight', '×' + (1 + 0.5 * boon('weight')).toFixed(1));
    row('stPinsBoard', t('stPinsBoardN', { n: pins.length, total: ALL_PINS.length }));
    row('stPins', t('stPinsN', { n: 5 * boon('pin') }));
    row('stChest', t('stChestN', { n: boon('chestRare') }));

    // 道具、過關獎勵：跟過關卡片同樣的小圖示
    const items = ITEM_IDS.filter(id => adv.items[id] > 0).map(id => {
      const chip = document.createElement('span');
      chip.className = 'st-item';
      chip.title = itemName(id);
      chip.append(itemIcon(id, 2), '×' + adv.items[id]);
      return chip;
    });
    const boons = BOON_IDS.filter(id => boon(id) > 0).map(id => {
      const chip = document.createElement('span');
      chip.className = 'st-item';
      chip.title = BOONS[id].desc[lang];
      chip.textContent = `${BOONS[id].name[lang]} ×${boon(id)}`;
      return chip;
    });
    for (const [title, chips] of [['statusItems', items], ['statusBoons', boons]]) {
      sec(title);
      const v = document.createElement('div');
      v.className = 'st-value';
      v.append(...(chips.length ? chips : [t('statusNoItems')]));
      statsBody.append(v);
    }
  }
  function openStats() {
    if (mode !== 'adv' || !statsDlg) return;
    Sound.init();
    cancelCharge();
    stopBetHold();
    Sound.clunk();
    renderStats();
    statsDlg.showModal();
  }
  if (statsDlg) statsDlg.addEventListener('click', e => { if (e.target === statsDlg) statsDlg.close(); });

  function openCodex() {
    if (mode !== 'adv' || !codexDlg) return;
    Sound.init();
    cancelCharge();
    stopBetHold();
    Sound.clunk();
    renderCodex();
    codexDlg.showModal();
  }
  if (codexDlg) codexDlg.addEventListener('click', e => { if (e.target === codexDlg) codexDlg.close(); });

  // ---- 遊戲模式的畫面切換 ----
  const ovTitle = $('ov-title'), ovText = $('ov-text'), ovBtn = $('overlay-coin'), ovItem = $('ov-item');
  const ovStatus = $('ov-status'), ovRewards = $('ov-rewards');

  // 過關獎勵：3 張卡片選 1 張，下面是重骰按鈕
  function renderRewards() {
    ovRewards.textContent = '';
    const head = document.createElement('p');
    head.className = 'rw-head';
    head.textContent = t('rewardTitle');
    ovRewards.append(head);
    for (const id of adv.rewards) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rw-card';
      const name = document.createElement('b');
      name.textContent = BOONS[id].name[lang];
      const desc = document.createElement('span');
      desc.textContent = BOONS[id].desc[lang];
      b.append(name, desc);
      if (BOONS[id].talent) {
        b.classList.add('rw-talent');
        const tag = document.createElement('small');
        tag.textContent = t('rewardTalent', { name: TALENTS[BOONS[id].talent].name[lang] });
        b.append(tag);
      }
      if (boon(id)) {
        const have = document.createElement('small');
        have.textContent = t('rewardHave', { n: boon(id) });
        b.append(have);
      }
      b.addEventListener('click', () => pickReward(id));
      ovRewards.append(b);
    }
    const re = document.createElement('button');
    re.type = 'button';
    re.className = 'btn rw-reroll';
    re.textContent = t('rewardReroll', { n: adv.rerollCost });
    re.disabled = state.credits < adv.rerollCost;
    re.addEventListener('click', rerollRewards);
    ovRewards.append(re);
  }

  // 冒險模式開始前選天賦：點卡片選取，按「開始冒險」才生效
  function renderTalents() {
    ovRewards.textContent = '';
    const head = document.createElement('p');
    head.className = 'rw-head';
    head.textContent = t('talentTitle');
    ovRewards.append(head);
    for (const id of TALENT_IDS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rw-card' + (id === talentPick ? ' selected' : '');
      b.setAttribute('aria-pressed', String(id === talentPick));
      const name = document.createElement('b');
      name.textContent = TALENTS[id].name[lang];
      const desc = document.createElement('span');
      desc.textContent = TALENTS[id].desc[lang];
      b.append(name, desc);
      b.addEventListener('click', () => {
        Sound.init();
        Sound.clunk();
        talentPick = id;
        try { localStorage.setItem('candy-pinball-talent', id); } catch (e) { /* 無痕模式 */ }
        refreshOverlay();
      });
      ovRewards.append(b);
    }
  }

  // 過關卡片的「目前狀態」：彈珠數、背包裡的道具
  function renderStatus() {
    ovStatus.textContent = '';
    const row = (label, ...content) => {
      const r = document.createElement('div');
      r.className = 'st-row';
      const l = document.createElement('span');
      l.className = 'st-label';
      l.textContent = label;
      const v = document.createElement('div');
      v.className = 'st-value';
      v.append(...content);
      r.append(l, v);
      ovStatus.append(r);
    };
    row(t('statusBalls'), t('statusBallsN', { n: state.credits + state.payoutQueue }));
    const ids = ITEM_IDS.filter(id => adv.items[id] > 0);
    const items = ids.map(id => {
      const chip = document.createElement('span');
      chip.className = 'st-item';
      chip.title = itemName(id);
      chip.append(itemIcon(id, 2), '×' + adv.items[id]);
      return chip;
    });
    row(t('statusItems'), ...(items.length ? items : [t('statusNoItems')]));
    const boons = BOON_IDS.filter(id => boon(id) > 0).map(id => {
      const chip = document.createElement('span');
      chip.className = 'st-item';
      chip.title = BOONS[id].desc[lang];
      chip.textContent = `${BOONS[id].name[lang]} ×${boon(id)}`;
      return chip;
    });
    row(t('statusBoons'), ...(boons.length ? boons : [t('statusNoItems')]));
  }
  const pickEl = $('monster-pick');
  const planEl = $('adv-plan');
  if (planEl) {
    for (const b of planEl.querySelectorAll('[data-plan]')) {
      b.addEventListener('click', () => { Sound.init(); Sound.clunk(); setPlan(b.dataset.plan); refreshOverlay(); });
    }
  }

  // 選怪物的按鈕：像素頭像、名字、HP、防禦、難度星等、已擊敗打勾
  // lineup = 連續闖關的關卡一覽（不能點，標出目前要打的那一關）
  // 12×12 像素圖畫成一個 <canvas>（P = 每格幾像素）
  function pixelCanvas(map, pal, P) {
    const dpr = window.devicePixelRatio || 1;
    const cv = document.createElement('canvas');
    cv.width = cv.height = Math.round(12 * P * dpr);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    map.forEach((row, r) => [...row].forEach((ch, col) => {
      if (ch === '.') return;
      c.fillStyle = pal[ch];
      c.fillRect(col * P, r * P, P, P);
    }));
    return cv;
  }
  const itemIcon = (id, P) => {
    const cv = pixelCanvas(ITEM_ICONS[id].map, ITEM_ICONS[id].pal, P);
    cv.className = 'item-icon';
    cv.style.width = cv.style.height = 12 * P + 'px';
    return cv;
  };

  function renderPicker(lineup = false, target = 0) {
    pickEl.textContent = '';
    const P = 4;
    MONSTERS.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      const sel = lineup ? i === target : i === pickIdx;
      b.className = 'mp-item' + (sel ? ' selected' : '') + (lineup ? ' lineup' : '');
      b.setAttribute('aria-pressed', String(sel));
      if (lineup) b.tabIndex = -1;
      const cv = pixelCanvas(m.map, m.pal, P);
      const name = document.createElement('span');
      name.className = 'mp-name';
      name.textContent = m.name[lang];
      const stats = document.createElement('span');
      stats.className = 'mp-stats';
      stats.textContent = `HP${m.hp} 🛡${m.def}`;
      const stars = document.createElement('span');
      stars.className = 'mp-stars';
      stars.textContent = '★'.repeat(monsterStars(i));
      b.append(cv, name, stats, stars);
      if (lineup) {
        const no = document.createElement('span');
        no.className = 'mp-stage';
        no.textContent = String(i + 1);
        b.append(no);
      }
      if (lineup ? i < campaign.best : cleared.has(i)) {
        const done = document.createElement('span');
        done.className = 'mp-done';
        done.textContent = '✓';
        done.title = t('advCleared');
        b.append(done);
      }
      if (!lineup) b.addEventListener('click', () => { Sound.init(); Sound.clunk(); setPick(i); refreshOverlay(); });
      pickEl.append(b);
    });
  }
  function refreshOverlay() {
    let show = false, title = '', text = '', btn = '';
    if (mode === 'classic') {
      show = !state.started;
      title = t('title'); text = t('overlayText'); btn = t('overlayCoin');
    } else if (adv.status === 'intro' || ((adv.status === 'won' || adv.status === 'lost') && adv.endT <= 0)) {
      show = true;
    }
    const picking = show && mode === 'adv';
    const midRun = picking && campaignMidRun();
    if (picking) {
      const name = monsterName(), stage = adv.monsterIdx + 1, total = MONSTERS.length;
      // 結果只在「上一場的玩法」和目前選的玩法一樣時顯示，否則顯示該玩法的說明
      const hasResult = adv.status !== 'intro' && (adv.campaign ? 'campaign' : 'free') === advPlan;
      if (midRun && adv.rewards) {
        title = t('stageClearTitle', { name });
      } else if (midRun) {
        // 過關卡片：標題 + 目前狀態（彈珠、道具），按鈕只有「下一關」
        title = adv.chest ? t('chestWinTitle') : t('stageClearTitle', { name });
        text = adv.chest ? itemEffect(adv.loot) : '';
        btn = t('nextStage');
      } else if (advPlan === 'campaign') {
        if (hasResult && adv.status === 'won' && adv.monsterIdx < LAST_STAGE) {
          // 打贏了但彈珠剛好用完，沒辦法往下一關
          title = t('campaignOutTitle'); text = t('campaignOutText', { stage, name }); btn = t('campaignRetry');
        } else if (hasResult && adv.status === 'won') {
          title = t('campaignClearTitle'); text = t('campaignClearText', { total, left: state.credits }); btn = t('campaignAgain');
        } else if (hasResult && adv.status === 'lost') {
          title = t('campaignLoseTitle'); text = t('campaignLoseText', { stage, name }); btn = t('campaignRetry');
        } else {
          title = t('advTitle');
          text = t('campaignIntro', { best: campaign.best, clears: campaign.clears });
          btn = t('campaignStart');
        }
      } else {
        if (hasResult && adv.status === 'won') {
          title = t('advWinTitle'); text = t('advWinText', { name, left: state.credits });
        } else if (hasResult && adv.status === 'lost') {
          title = t('advLoseTitle'); text = t('advLoseText', { name, hp: adv.hp });
        } else {
          title = t('advTitle'); text = t('advIntro');
        }
        btn = t('advFight', { name: MONSTERS[pickIdx].name[lang] });
      }
      // 冒險模式的首頁、結果不顯示怪物；過關後的卡片才顯示關卡進度
      if (pickEl && advPlan === 'free' && !midRun) renderPicker();
    }
    if (pickEl) pickEl.hidden = !picking || midRun || advPlan !== 'free';
    if (planEl) {
      planEl.hidden = !picking || midRun;
      for (const b of planEl.querySelectorAll('[data-plan]')) b.classList.toggle('active', b.dataset.plan === advPlan);
    }
    overlay.classList.toggle('hidden', !show);
    overlay.classList.toggle('below-screen', mode === 'adv');
    // 瀏覽器快取到舊版 index.html 時這些元素可能不存在，略過就好，不要讓遊戲壞掉
    if (ovTitle) ovTitle.textContent = title;
    if (ovText) { ovText.textContent = text; ovText.hidden = !text; }
    if (ovBtn) { ovBtn.textContent = btn; ovBtn.hidden = !!(midRun && adv.rewards); }
    // 冒險模式要開新的一趟時先選天賦
    const talents = picking && !midRun && advPlan === 'campaign';
    if (ovRewards) {
      ovRewards.hidden = !(midRun && adv.rewards) && !talents;
      if (midRun && adv.rewards) renderRewards();
      else if (talents) renderTalents();
    }
    if (ovStatus) {
      ovStatus.hidden = !midRun;
      if (midRun) renderStatus();
    }
    // 寶箱結果：顯示拿到的道具圖示
    if (ovItem) {
      const loot = show && mode === 'adv' && adv.chest && adv.status === 'won' && adv.loot;
      ovItem.hidden = !loot;
      ovItem.textContent = '';
      if (loot) {
        const name = document.createElement('b');
        name.textContent = itemName(loot);
        name.style.color = TIERS[ITEMS[loot].tier].color;
        ovItem.append(itemIcon(loot, 5), name);
      }
    }
  }

  function overlayPrimary() {
    if (mode === 'classic') insertCoin();
    else startAdventure();
  }

  function applyMode() {
    document.body.dataset.mode = mode;
    syncPins();
    TRAY.right = TRAY_RIGHT[mode];
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
    const records = {
      bestWin: state.bestWin, best: state.best, advWins: adv.wins, advLosses: adv.losses,
      campaignBest: campaign.best, campaignClears: campaign.clears,
    };
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
  for (const el of byAction('bag')) el.addEventListener('click', openBag);
  for (const el of byAction('stats')) el.addEventListener('click', openStats);
  for (const el of byAction('codex')) {
    // 寶藏按鈕只放寶箱的像素圖示，不寫字
    const icon = pixelCanvas(CHEST.map, CHEST.pal, 2);
    icon.className = 'item-icon';
    icon.style.width = icon.style.height = '24px';
    el.prepend(icon);
    el.addEventListener('click', openCodex);
  }
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
  for (const el of document.querySelectorAll('[data-version]')) el.textContent = VERSION;

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
