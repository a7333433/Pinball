(() => {
  'use strict';

  // 版本號：每次推送前要跟著 CHANGELOG.md 一起更新（index.html 的 ?v= 也要改）
  const VERSION = '1.1.0';

  // ===== 規則 =====
  // 倍率規則依模式不同（倍率越高，亮的燈越少）：
  // 經典：2/4/6/8/10 倍，倍率孔每升一段扣 2 顆，亮燈 5 → 1
  // 大冒險：從 ×1 起跳，倍率孔每投 1 顆 +1 倍、少一顆燈，×1 亮 7 顆 … ×7 亮 1 顆
  const MULT_RULES = {
    classic: { mults: [2, 4, 6, 8, 10], cost: 2 },
    adv: { mults: [1, 2, 3, 4, 5, 6, 7], cost: 1 },
  };
  // 寶箱關卡：燈全亮、不加倍，也不能投倍率孔
  const CHEST_RULE = { mults: [1], cost: 1 };
  const multRule = () => chestStage() ? CHEST_RULE : MULT_RULES[mode];
  const litFor = level => multRule().mults.length - level;
  const COIN_BALLS = 20;      // 投一次幣換幾顆彈珠
  const SLOT_COUNT = 11;      // 底部落點數，每一排一顆 LED



  // ===== 彈珠台大冒險：怪物 =====
  const ADV_BALLS = 30;       // 每場冒險有幾顆彈珠
  const REFILL_MULT = 2;      // 補珠燈：中了退回倍率孔的珠，再得到 投珠數 × 2 顆彈珠
  const CAMPAIGN_BONUS = 20;  // 連續闖關：每過一關額外補幾顆彈珠（剩下的彈珠也會帶到下一關）
  // ===== 寶箱與道具 =====
  // 道具等級：白燈一般、藍燈稀有、紫燈史詩、橘燈傳說
  const TIERS = [
    { name: { zh: '一般', en: 'Common' }, color: '#e5e7eb', led: 'white' },
    { name: { zh: '稀有', en: 'Rare' }, color: '#60a5fa', led: 'blue' },
    { name: { zh: '史詩', en: 'Epic' }, color: '#c084fc', led: 'purple' },
    { name: { zh: '傳說', en: 'Legendary' }, color: '#fb923c', led: 'orange' },
  ];
  // 寶箱關卡固定有幾排白 / 藍 / 紫 / 橘燈（其餘都是白燈）
  const CHEST_LANES = [0, 3, 2, 1];
  // when：pre = 定燈前、post = 定燈後（發射前）、both = 兩者都可
  const ITEMS = {
    coin: {
      tier: 0, when: 'both',
      name: { zh: '銀幣', en: 'Silver Coin' },
      quote: { zh: '「我要十圓。」── 小屁孩', en: '"I want ten bucks." — Some brat' },
      effect: { zh: '持珠數增加 10 顆', en: '+10 balls' },
    },
    laserRed: {
      tier: 0, when: 'pre',
      name: { zh: '雷射筆（紅）', en: 'Red Laser Pointer' },
      quote: { zh: '請勿對眼睛照射。', en: 'Do not shine into eyes.' },
      effect: { zh: '這回合攻擊燈數增加 1', en: '+1 attack light this round' },
    },
    fake: {
      tier: 0, when: 'both',
      name: { zh: '假彈珠', en: 'Fake Marble' },
      quote: { zh: '「這人怎麼彈珠打不完？」── 柑仔店老闆', en: '"How does this kid never run out of marbles?" — The shopkeeper' },
      effect: { zh: '這回合倍率或投珠數隨機增加 1（定燈後只會加投珠數）', en: 'This round: randomly +1 multiplier or +1 bet (only +1 bet after locking)' },
    },
    laserGreen: {
      tier: 0, when: 'pre',
      name: { zh: '雷射筆（綠）', en: 'Green Laser Pointer' },
      quote: { zh: '請勿對眼睛照射，即使他是有益色。', en: 'Do not shine into eyes, even if green is good for them.' },
      effect: { zh: '這回合補珠燈數增加 1', en: '+1 refill light this round' },
    },
    stone: {
      tier: 0, when: 'both',
      name: { zh: '石頭', en: 'Stone' },
      quote: { zh: '一顆手感不錯的石頭。', en: 'A stone that feels nice in the hand.' },
      effect: { zh: '對怪物造成 1 點無視防禦的傷害', en: 'Deals 1 damage that ignores DEF' },
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
      effect: { zh: '這回合鋼珠落下後，可以選擇保留結果或返回上回合', en: 'After the ball lands this round, keep the result or rewind the round' },
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
      effect: { zh: '拿回這次闖關已失去的彈珠（目前 {n} 顆）', en: 'Get back the balls lost this run (now {n})' },
    },
    shake: {
      tier: 3, when: 'post',
      name: { zh: '搖晃機台', en: 'Shake the Machine' },
      quote: { zh: '「你不能那樣做！」── 柑仔店老闆', en: '"You can\'t do that!" — The shopkeeper' },
      effect: { zh: '把彈珠直接放在檯面上任何地方，讓它從那裡落下', en: 'Drop the ball anywhere on the board' },
    },
  };
  const ITEM_IDS = Object.keys(ITEMS);
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
  // 防禦越高的怪物 HP 越少；實際傷害 = 倍率 × 投珠數 − 防禦（最少 0）
  // 數值依「30 顆彈珠、最佳打法」的勝率由易到難排：約 95% → 53%（落點平均的估算）
  // 後面幾隻一擊所需的攻擊超過 ×2 全押（60），一定要用倍率孔才打得倒
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
      bg: 'cave',
      name: { zh: '蝙蝠', en: 'Bat' }, hp: 24, def: 1,
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
      name: { zh: '幽靈', en: 'Ghost' }, hp: 23, def: 5,
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
      name: { zh: '僵屍', en: 'Zombie' }, hp: 22, def: 12,
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
      bg: 'crypt',
      name: { zh: '骷髏', en: 'Skeleton' }, hp: 21, def: 22,
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
      name: { zh: '小惡龍', en: 'Baby Dragon' }, hp: 20, def: 33,
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
      bg: 'ruins',
      name: { zh: '石像怪', en: 'Gargoyle' }, hp: 19, def: 44,
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
      betInfoAdvDef: '投珠 {bet} 顆 × {mult} 倍，扣掉防禦 {def}，中了造成 {win} 點傷害',
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
      hitMsgDef: '命中！{mult} 倍 × {bet} 顆 = {raw}，扣掉防禦 {def}，造成 {dmg} 點傷害',
      blockMsg: '被擋下了！{raw} 點攻擊打不破防禦 {def}，造成 0 傷害', blockPop: '擋下！', blockScreen: '0',
      hitMsg: '命中！{mult} 倍 × {bet} 顆，造成 {dmg} 點傷害',
      lockedAdv: '定燈！亮 {lit} 顆紅燈，綠燈是補珠燈。往投珠孔投珠，再拉彈簧發射',
      refillMsg: '命中補珠燈！補回 {n} 顆彈珠', refillPop: '+{n} 顆',
      refillMsgMult: '命中補珠燈！退回倍率孔 {refund} 顆，再補 {bonus} 顆，共 {n} 顆',
      advMissMsg: '沒打中！{name}在嘲笑你', advWinMsg: '打倒了{name}！', advLoseMsg: '彈珠用完了…',
      dmgPop: '-{d} HP', advNoCoin: '大冒險模式不能投幣',
      advPressStart: '按「開始冒險」', laugh: '嘻嘻嘻',
      stWinAdv: '上次傷害', stBestWinAdv: '勝場', stBestAdv: '敗場',
      hitMsgHeavy: '命中！沉重彈珠 {raw} 點攻擊，扣掉防禦 {def}，造成 {dmg} 點傷害',
      chestName: '寶箱',
      chestAppear: '寶箱出現了！有 3 排藍燈、2 排紫燈、1 排橘燈，按藍色按鈕定燈，再投 1 顆珠打開它',
      chestNoMult: '寶箱關卡不用投倍率孔，直接按藍色按鈕定燈',
      lockedChest: '定燈！投 1 顆珠，再拉彈簧打開寶箱',
      chestBetOne: '寶箱關卡只能投 1 顆珠', chestBetMsg: '投珠 1 顆，拉彈簧發射打開寶箱！',
      chestOpenMsg: '打開寶箱！獲得{tier}道具「{item}」',
      chestWinTitle: '獲得道具！',
      cvBag: '道具', btnBag: '背包', bagTitle: '背包', bagUse: '使用',
      bagEmpty: '背包是空的。冒險模式中打開寶箱就能拿到道具。',
      bagNowSelect: '現在：定燈前', bagNowBet: '現在：定燈後、發射前',
      whenPre: '定燈前使用', whenPost: '定燈後、發射前使用', whenBoth: '定燈前或發射前使用',
      itemCampaignOnly: '道具只能在冒險模式的怪物關卡使用', itemNoChest: '寶箱關卡不能使用道具',
      itemNotNow: '鋼珠發射後不能使用道具', itemPreOnly: '只能在定燈前使用', itemPostOnly: '只能在定燈後、發射前使用',
      itemMaxLights: '燈已經亮滿了', itemNoDef: '怪物已經沒有防禦了', itemActive: '這回合已經用過了',
      itemNoLit: '沒有亮著的紅燈', itemKeyEmpty: '還沒有失去任何彈珠', itemNeedBet: '先往投珠孔投珠再使用',
      itemPlacing: '先點檯面放下彈珠',
      useCoin: '使用銀幣：持珠 +{n} 顆', useLaserRed: '雷射筆（紅）：這回合攻擊燈 +1，定燈後亮 {lit} 顆',
      useLaserGreen: '雷射筆（綠）：這回合補珠燈 +1', useFakeMult: '假彈珠：倍率 +1，變成 {mult} 倍！',
      useFakeBet: '假彈珠：投珠 +1，變成 {bet} 顆！', useStone: '丟石頭！對{name}造成 {d} 點傷害（無視防禦）',
      useAcid: '潑鹽酸！{name}的防禦降到 {def}', useHeavy: '沉重彈珠：這回合每顆珠的基本傷害變成 {n}',
      useHourglass: '沙漏翻過來了：鋼珠落下後可以選擇保留結果或返回上回合',
      useDrink: '嘶～～～ 紅燈全部變成補珠燈了！', useKey: '用老闆的鑰匙打開珠箱，拿回 {n} 顆彈珠！',
      useShake: '搖晃機台！點檯面上任何地方放下彈珠', shakeWhere: '點檯面上（釘子區）放下彈珠',
      shakeHint: '點檯面放珠', shakePlaced: '「你不能那樣做！」彈珠放下去了',
      outUseItem: '彈珠用完了！背包裡還有能用的道具',
      hgTitle: '沙漏', hgKeep: '保留結果', hgRewindBtn: '返回上回合',
      hgHit: '鋼珠落進亮燈的那一排，將造成 {dmg} 點傷害。',
      hgBlock: '鋼珠落進亮燈的那一排，但 {raw} 點攻擊打不破防禦 {def}，造成 0 傷害。',
      hgRefill: '鋼珠落進補珠燈，將補回 {n} 顆彈珠。', hgMiss: '鋼珠沒落在亮燈的那一排。',
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
      betInfoAdv: 'Bet {bet} × {mult}: a hit deals {win} damage',
      betInfoAdvDef: 'Bet {bet} × {mult} − DEF {def}: a hit deals {win} damage',
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
      hitMsgDef: 'Hit! ×{mult} × {bet} = {raw} − DEF {def} = {dmg} damage',
      blockMsg: 'Blocked! {raw} attack can\'t break DEF {def}. 0 damage', blockPop: 'Blocked!', blockScreen: '0',
      hitMsg: 'Hit! ×{mult} × {bet} = {dmg} damage',
      lockedAdv: 'Locked! {lit} red lights. Green = refill. Bet, then shoot',
      refillMsg: 'Refill light! +{n} balls', refillPop: '+{n} balls',
      refillMsgMult: 'Refill light! {refund} multiplier balls back + {bonus} = {n} balls',
      advMissMsg: 'Missed! The {name} laughs', advWinMsg: 'Defeated the {name}!', advLoseMsg: 'Out of balls…',
      dmgPop: '-{d} HP', advNoCoin: 'No coins in Quest mode',
      advPressStart: 'Press Start', laugh: 'hehehe',
      stWinAdv: 'Last hit', stBestWinAdv: 'Wins', stBestAdv: 'Losses',
      hitMsgHeavy: 'Hit! Heavy marbles: {raw} attack − DEF {def} = {dmg} damage',
      chestName: 'Treasure Chest',
      chestAppear: 'A treasure chest! 3 blue, 2 purple and 1 orange lane. Press blue to lock, then bet 1 ball to open it',
      chestNoMult: 'No multiplier on the chest. Just press blue to lock',
      lockedChest: 'Locked! Bet 1 ball, then shoot to open the chest',
      chestBetOne: 'Only 1 ball can be bet on the chest', chestBetMsg: 'Bet 1 ball. Shoot to open the chest!',
      chestOpenMsg: 'Chest opened! Got a {tier} item: {item}',
      chestWinTitle: 'New item!',
      cvBag: 'ITEMS', btnBag: 'Backpack', bagTitle: 'Backpack', bagUse: 'Use',
      bagEmpty: 'Your backpack is empty. Open treasure chests in Adventure to get items.',
      bagNowSelect: 'Now: before locking', bagNowBet: 'Now: after locking, before shooting',
      whenPre: 'Use before locking', whenPost: 'Use after locking, before shooting', whenBoth: 'Use before locking or before shooting',
      itemCampaignOnly: 'Items only work in Adventure monster stages', itemNoChest: 'No items at the treasure chest',
      itemNotNow: 'Can\'t use items while the ball is in play', itemPreOnly: 'Only before locking', itemPostOnly: 'Only after locking, before shooting',
      itemMaxLights: 'No room for more lights', itemNoDef: 'The monster has no DEF left', itemActive: 'Already used this round',
      itemNoLit: 'No red lights to convert', itemKeyEmpty: 'You haven\'t lost any balls yet', itemNeedBet: 'Bet first',
      itemPlacing: 'Tap the board to drop the ball first',
      useCoin: 'Silver Coin: +{n} balls', useLaserRed: 'Red laser: +1 attack light this round ({lit} after locking)',
      useLaserGreen: 'Green laser: +1 refill light this round', useFakeMult: 'Fake marble: multiplier +1, now ×{mult}!',
      useFakeBet: 'Fake marble: +1 bet, now {bet}!', useStone: 'Threw a stone! {d} damage to the {name}, ignoring DEF',
      useAcid: 'Acid! The {name}\'s DEF drops to {def}', useHeavy: 'Heavy marble: {n} base damage per ball this round',
      useHourglass: 'Hourglass flipped: after the ball lands, keep the result or rewind the round',
      useDrink: 'Slurrrp~ Every red light is now a refill light!', useKey: 'The shopkeeper\'s key opened the ball box: {n} balls back!',
      useShake: 'Shake the machine! Tap anywhere on the board to drop the ball', shakeWhere: 'Tap the pin area of the board to drop the ball',
      shakeHint: 'Tap to drop', shakePlaced: '"You can\'t do that!" Ball dropped',
      outUseItem: 'Out of balls! Your backpack still has items that can help',
      hgTitle: 'Hourglass', hgKeep: 'Keep result', hgRewindBtn: 'Rewind',
      hgHit: 'The ball landed in a lit lane: {dmg} damage.',
      hgBlock: 'The ball landed in a lit lane, but {raw} attack can\'t break DEF {def}: 0 damage.',
      hgRefill: 'The ball landed on a refill light: {n} balls back.', hgMiss: 'The ball missed the lit lanes.',
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
  const BAG = { x: 398, y: 980, r: 22 };
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
    pendingSlot: -1,
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
    chest: false,         // 目前是寶箱關卡
    items: {},            // 背包：道具 id → 數量（連續闖關從第 1 關開始時清空）
    lost: 0,              // 這次闖關失去的彈珠（老闆的鑰匙用）
    defDown: 0,           // 鹽酸：這隻怪物的防禦被降了幾點
    loot: null,           // 剛從寶箱拿到的道具
    rescueSaid: false,
  };
  const chestStage = () => mode === 'adv' && adv.chest;
  const itemCount = () => ITEM_IDS.reduce((s, id) => s + (adv.items[id] || 0), 0);
  const advActive = () => mode === 'adv' && adv.status === 'playing';
  // 大冒險還沒開始或已經結束時，機台不能操作
  const advLocked = () => mode === 'adv' && adv.status !== 'playing';
  const monsterName = () => adv.monster ? adv.monster.name[lang] : '';

  // 玩家自己選要挑戰的怪物；打倒過的怪物會打勾（存在瀏覽器）
  let pickIdx = Math.min(MONSTERS.length - 1, loadRecord('candy-pinball-adv-pick'));
  const cleared = new Set();
  try { (JSON.parse(localStorage.getItem('candy-pinball-adv-cleared') || '[]')).forEach(i => cleared.add(i)); } catch (e) { /* 無痕模式 */ }
  function setPick(i) {
    pickIdx = Math.max(0, Math.min(MONSTERS.length - 1, i));
    saveRecord('candy-pinball-adv-pick', pickIdx);
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
  const campaignBalls = () => state.credits + state.payoutQueue + (adv.chest ? 0 : CAMPAIGN_BONUS);
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
    if (keepBalls) {
      if (bonus) state.payoutQueue += CAMPAIGN_BONUS;
    } else {
      // 新的一場（或闖關從第 1 關開始）重新發彈珠，背包也清空
      state.credits = 0;
      state.payoutQueue = ADV_BALLS;
      tray.length = 0;
      spills.length = 0;
      adv.items = {};
      adv.lost = 0;
    }
    state.lastWin = null;
    state.started = true;
    newRound();
    refreshOverlay();
    const info = { name: monsterName(), hp: adv.hp, def: monsterDef(), stage: idx + 1 };
    say(adv.chest ? 'chestAppear' : adv.campaign ? 'campaignAppear' : 'advAppear', info);
  }

  // 鹽酸會把防禦往下降
  const monsterDef = () => adv.monster ? Math.max(0, adv.monster.def - adv.defDown) : 0;
  // 攻擊力 = 倍率 × 投珠數 × 每顆的基本傷害（平常 1，沉重彈珠每用一次 +1）
  const attackRaw = () => mult() * round.bet * (1 + round.heavy);
  // 攻擊力扣掉防禦才是實際傷害
  const dmgAfterDef = raw => Math.max(0, raw - monsterDef());

  function damageMonster(raw, px) {
    const def = monsterDef();
    const dmg = dmgAfterDef(raw);
    state.lastWin = dmg;
    if (dmg === 0) {
      // 攻擊沒打破防禦：0 傷害，怪物竊笑
      adv.laughT = 1.3;
      adv.pops.push({ text: t('blockScreen'), t: 0 });
      popups.push({ x: px, y: SLOT_TOP - 16, text: t('blockPop'), t: 0, color: '#cbd5e1' });
      say('blockMsg', { raw, def });
      Sound.thud();
      setTimeout(() => Sound.snicker(), 250);
      return;
    }
    adv.hp = Math.max(0, adv.hp - dmg);
    adv.hitT = 0.5;
    adv.pops.push({ text: '-' + dmg, t: 0 });
    popups.push({ x: px, y: SLOT_TOP - 16, text: t('dmgPop', { d: dmg }), t: 0, color: '#ff6b6b' });
    say(round.heavy ? 'hitMsgHeavy' : def > 0 ? 'hitMsgDef' : 'hitMsg', { mult: mult(), bet: round.bet, raw, def, dmg });
    Sound.hit();
    if (adv.hp === 0) defeatMonster();
  }

  function defeatMonster() {
    adv.status = 'won';
    adv.dieT = 1.4;
    adv.endT = 1.8;
    adv.wins++;
    saveRecord('candy-pinball-adv-wins', adv.wins);
    cleared.add(adv.monsterIdx);
    try { localStorage.setItem('candy-pinball-adv-cleared', JSON.stringify([...cleared])); } catch (e) { /* 無痕模式 */ }
    setPick(adv.monsterIdx + 1);      // 下一場預設挑戰下一隻（比較強的）
    if (adv.campaign) {
      if (adv.monsterIdx + 1 > campaign.best) {
        campaign.best = adv.monsterIdx + 1;
        saveRecord('candy-pinball-campaign-best', campaign.best);
      }
      if (adv.monsterIdx === LAST_STAGE) saveRecord('candy-pinball-campaign-clears', ++campaign.clears);
    }
    say('advWinMsg', { name: monsterName() });
    setTimeout(() => Sound.win(), 350);
  }

  // 寶箱：落在哪一排，就從那一排顏色等級的道具池抽一個
  function openChest(slot, px) {
    const tier = round.tiers[slot];
    const pool = ITEM_IDS.filter(id => ITEMS[id].tier === tier);
    const id = pool[Math.floor(Math.random() * pool.length)];
    adv.items[id] = (adv.items[id] || 0) + 1;
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
  const itemEffect = id => ITEMS[id].effect[lang].replace('{n}', adv.lost);

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
      state.payoutQueue += 10;
      say('useCoin', { n: 10 });
      Sound.coin();
    },
    laserRed() {
      round.extraLit++;
      rollLit(litCount());
      say('useLaserRed', { lit: litCount() });
      Sound.lock();
    },
    laserGreen() {
      round.extraRefill++;
      rollLit(litCount());
      say('useLaserGreen');
      Sound.lock();
    },
    fake() {
      // 定燈前：倍率、投珠隨機加 1（倍率已經最高或手上沒珠時直接加投珠）
      const canMult = round.phase === 'select' && round.level < multRule().mults.length - 1 && !(state.credits === 0 && round.bet === 0);
      if (canMult && Math.random() < 0.5) {
        round.level++;
        say('useFakeMult', { mult: mult() });
      } else {
        round.bet++;
        say('useFakeBet', { bet: round.bet });
      }
      tweens.push({ x0: CHUTE.x, y0: TRAY.back + 10, x1: HOLES.bet.x, y1: HOLES.bet.y, t: 0, dur: 0.45 });
      Sound.clunk();
    },
    stone() {
      adv.hp = Math.max(0, adv.hp - 1);
      adv.hitT = 0.5;
      adv.pops.push({ text: '-1', t: 0 });
      popups.push({ x: W / 2, y: SLOT_TOP - 16, text: t('dmgPop', { d: 1 }), t: 0, color: '#ff6b6b' });
      say('useStone', { name: monsterName(), d: 1 });
      Sound.thud();
      Sound.hit();
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
    ball = { x: p.x, y: p.y, vx: 0, vy: 0, still: 0 };
    round.phase = 'flying';
    state.shakeT = 0.3;
    say('shakePlaced');
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
    ball = null;
    newRound();
    applyMode();
  }

  const mult = () => multRule().mults[round.level];

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
    // 寶箱：燈全亮，隨機挑 3 排藍燈、2 排紫燈、1 排橘燈
    round.tiers.fill(0);
    if (chestStage()) {
      let k = 0;
      for (let tier = 1; tier < CHEST_LANES.length; tier++) {
        for (let j = 0; j < CHEST_LANES[tier]; j++) round.tiers[slots[k++]] = tier;
      }
    }
  }

  // 這局亮幾顆攻擊燈：寶箱全亮；雷射筆（紅）多亮，但要留位置給補珠燈
  function litCount() {
    if (chestStage()) return SLOT_COUNT;
    return Math.min(litFor(round.level) + round.extraLit, SLOT_COUNT - 1 - round.extraRefill);
  }

  function newRound() {
    round.phase = 'select';
    round.bet = 0;
    round.level = 0;
    round.landSlot = -1;
    round.refills = new Set();
    round.betPaid = round.multPaid = 0;
    round.extraLit = round.extraRefill = round.heavy = 0;
    round.hourglass = round.placing = false;
    round.pendingSlot = -1;
    adv.rescueSaid = false;
    rollLit(litCount());
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
    rollLit(litCount());
    round.phase = 'bet';
    Sound.lock();
    if (chestStage()) {
      say('lockedChest');
    } else if (mode === 'adv') {
      // 定燈後，在沒亮燈的排裡隨機挑一排當補珠燈（雷射筆（綠）會多挑幾排）
      const free = [];
      for (let i = 0; i < SLOT_COUNT; i++) if (!round.lit.has(i)) free.push(i);
      for (let n = 1 + round.extraRefill; n > 0 && free.length; n--) {
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
    const text = t(key, vars);
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
    if (chestStage() && round.bet >= 1) { say('chestBetOne'); Sound.error(); return false; }
    if (!hasCredits()) return false;
    takeBall(HOLES.bet);
    round.bet++;
    round.betPaid++;
    Sound.clunk();
    const raw = attackRaw();
    if (chestStage()) {
      say('chestBetMsg');
    } else if (mode === 'adv') {
      say(monsterDef() > 0 ? 'betInfoAdvDef' : 'betInfoAdv', { bet: round.bet, mult: mult(), win: dmgAfterDef(raw), def: monsterDef() });
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
  const multNeed = () => multRule().cost + (mode === 'adv' ? 1 : 0);

  function addMult() {
    Sound.init();
    if (advLocked()) return;
    if (round.phase !== 'select') { say('multLocked'); Sound.error(); return; }
    if (round.level >= multRule().mults.length - 1) {
      if (chestStage()) say('chestNoMult');
      else say('multMax', { max: multRule().mults[multRule().mults.length - 1] });
      Sound.error();
      return;
    }
    if (state.credits < multNeed()) {
      // 大冒險沒辦法投幣，加倍後至少要留 1 顆投珠，不然這局只能直接輸掉
      say(mode === 'adv' ? 'multKeepOne' : 'multShort', { cost: multRule().cost, need: multNeed() });
      Sound.error();
      return;
    }
    for (let i = 0; i < multRule().cost; i++) takeBall(HOLES.mult, i * 0.12);
    Sound.clunk();
    round.level++;
    round.multPaid += multRule().cost;
    say('multUp', { mult: mult(), lit: litCount() });
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
    // 沙漏：先讓玩家看結果，再決定保留還是返回
    if (mode === 'adv' && round.hourglass && !adv.chest) {
      round.phase = 'choose';
      round.pendingSlot = slot;
      Sound.lock();
      openChoice(slot);
      return;
    }
    resolveLanding(slot);
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
    } else if (mode === 'adv' && round.refills.has(slot)) {
      // 補珠燈：不造成傷害，改成退回這局投進倍率孔的珠，再補 投珠數 × 2 顆
      const refund = round.multPaid, bonus = round.bet * REFILL_MULT, n = refund + bonus;
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

  // 沙漏：預告這次落點的結果
  function landingPreview(slot) {
    if (round.lit.has(slot)) {
      const raw = attackRaw(), dmg = dmgAfterDef(raw);
      return dmg > 0 ? t('hgHit', { dmg }) : t('hgBlock', { raw, def: monsterDef() });
    }
    if (round.refills.has(slot)) return t('hgRefill', { n: round.multPaid + round.bet * REFILL_MULT });
    return t('hgMiss');
  }

  function chooseHourglass(keep) {
    if (round.phase !== 'choose') return;
    if (keep) {
      resolveLanding(round.pendingSlot);
      return;
    }
    // 返回上回合：退回這局投的珠（用掉的道具不退）
    const n = round.betPaid + round.multPaid;
    state.payoutQueue += n;
    adv.lost = Math.max(0, adv.lost - n);
    round.phase = 'rewind';
    round.resetT = 0.6;
    round.landSlot = -1;
    say('hgRewind', { n });
    Sound.coin();
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
      if (visible) drawMonster(m, x0, y0, adv.hitT > 0 && Math.floor(adv.hitT * 20) % 2 === 0, laughing, opened);
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
        const label = adv.chest ? 'TREASURE' : `STAGE ${adv.monsterIdx + 1}/${MONSTERS.length}`;
        textBacking(S.x + S.w - ctx.measureText(label).width - 16, S.y + 4, ctx.measureText(label).width + 12, 20);
        ctx.fillStyle = '#facc15';
        ctx.fillText(label, S.x + S.w - 10, S.y + 14);
      }

      // 怪物下面：HP 血條 + 盾牌（防禦）
      ctx.font = `bold 15px ${PIXEL_FONT}`;
      const hpText = `${adv.hp}/${adv.maxHp}`, defText = String(monsterDef());
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
    for (const i of round.lit) {
      const on = round.phase === 'win' && i === round.landSlot ? blink : true;
      led(ctx, B.left + (i + 0.5) * SLOT_W, LED_Y, 6, on, chest ? TIERS[round.tiers[i]].led : 'red');
    }
    for (const i of round.refills) {
      const on = round.phase === 'win' && i === round.landSlot ? blink : true;
      led(ctx, B.left + (i + 0.5) * SLOT_W, LED_Y, 6, on, 'green');
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
      if (state.credits > 0 && !(chestStage() && round.bet > 0)) hintCircle(time, b.x, b.y, b.r + 5);
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
  function drawBag() {
    if (mode !== 'adv') return;
    const { x, y, r } = BAG;
    ctx.save();
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
    inner.addColorStop(0, '#9a6532');
    inner.addColorStop(1, '#4a2c12');
    ctx.beginPath();
    ctx.arc(x, y, r - 3, 0, Math.PI * 2);
    ctx.fillStyle = inner;
    ctx.fill();
    // 背包圖案：提把、包身、蓋子、扣環、前口袋
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
    // 標籤
    ctx.fillStyle = '#3b2412';
    ctx.font = `bold 12px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('cvBag'), x, y + r + 14);
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
    if (mode === 'classic' && Math.abs(p.x - COIN_SLOT.x) < 34 && Math.abs(p.y - COIN_SLOT.y) < 50) return 'coin';
    return null;
  }

  canvas.addEventListener('pointerdown', e => {
    const p = toLogical(e);
    const target = hitTarget(p);
    e.preventDefault();
    if (target === 'bag') openBag();
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
  function openChoice(slot) {
    cancelCharge();
    stopBetHold();
    $('choice-text').textContent = landingPreview(slot);
    $('choice-ask').textContent = t('hgAsk');
    choiceDlg.showModal();
  }
  if (choiceDlg) {
    choiceDlg.addEventListener('cancel', e => e.preventDefault());   // 一定要選一個
    $('choice-keep').addEventListener('click', () => { choiceDlg.close(); chooseHourglass(true); });
    $('choice-rewind').addEventListener('click', () => { choiceDlg.close(); chooseHourglass(false); });
  }
  if (bagDlg) bagDlg.addEventListener('click', e => { if (e.target === bagDlg) bagDlg.close(); });

  // 說明視窗裡的道具清單
  function renderItemGuide() {
    for (const el of document.querySelectorAll('[data-item-guide]')) {
      const L = el.closest('[data-lang]').dataset.lang;
      el.textContent = '';
      for (const id of ITEM_IDS) {
        const it = ITEMS[id], tier = TIERS[it.tier];
        const li = document.createElement('li');
        const name = document.createElement('b');
        name.style.color = tier.color;
        name.textContent = L === 'zh' ? `${it.name[L]}（${tier.name[L]}）` : `${it.name[L]} (${tier.name[L]})`;
        const when = I18N[L][{ pre: 'whenPre', post: 'whenPost', both: 'whenBoth' }[it.when]];
        const dot = L === 'zh' ? '。' : '. ';
        li.append(itemIcon(id, 2), name, ` ${it.effect[L].replace(/\s*[（(][^）)]*\{n\}[^）)]*[）)]/, '')}${dot}${when}${dot.trim()}`);
        el.append(li);
      }
    }
  }

  // ---- 遊戲模式的畫面切換 ----
  const ovTitle = $('ov-title'), ovText = $('ov-text'), ovBtn = $('overlay-coin'), ovItem = $('ov-item');
  const ovStatus = $('ov-status');

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
      if (midRun) {
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
    if (ovBtn) ovBtn.textContent = btn;
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
    renderItemGuide();
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
