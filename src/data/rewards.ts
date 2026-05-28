export interface LotteryPrize {
  id: string;
  name: string;
  rarity: "常见" | "惊喜" | "稀有";
  description: string;
}

export interface ShopReward {
  id: string;
  name: string;
  cost: number;
  category: string;
  stockLabel: string;
  description: string;
}

export const lotteryPrizes: LotteryPrize[] = [
  {
    id: "story-choice",
    name: "绘本选择权",
    rarity: "常见",
    description: "今天由孩子挑一本班级绘本。",
  },
  {
    id: "helper-badge",
    name: "老师小助手",
    rarity: "常见",
    description: "担任 5 分钟课堂小助手。",
  },
  {
    id: "line-leader",
    name: "排队领队",
    rarity: "惊喜",
    description: "下一次排队时成为队伍领队。",
  },
  {
    id: "game-priority",
    name: "游戏优先选",
    rarity: "惊喜",
    description: "区域活动时优先选择一个游戏。",
  },
  {
    id: "mystery-card",
    name: "神秘鼓励卡",
    rarity: "稀有",
    description: "获得一张老师手写鼓励卡。",
  },
];

export const shopRewards: ShopReward[] = [
  {
    id: "star-sticker",
    name: "成长星贴",
    cost: 60,
    category: "即时奖励",
    stockLabel: "库存占位",
    description: "贴在个人成长页上的小星星。",
  },
  {
    id: "desk-helper",
    name: "桌面整理官",
    cost: 120,
    category: "班级角色",
    stockLabel: "每日 3 次",
    description: "成为当天桌面整理的小负责人。",
  },
  {
    id: "craft-token",
    name: "手工材料包",
    cost: 300,
    category: "创作材料",
    stockLabel: "库存占位",
    description: "领取一份额外手工材料包。",
  },
  {
    id: "reading-corner",
    name: "阅读角优先",
    cost: 800,
    category: "区域活动",
    stockLabel: "每周 5 次",
    description: "优先进入阅读角选择座位。",
  },
  {
    id: "class-showcase",
    name: "作品展示位",
    cost: 1600,
    category: "荣誉展示",
    stockLabel: "每周 2 次",
    description: "在班级展示墙保留一个作品展示位。",
  },
  {
    id: "guardian-title",
    name: "成长守护称号",
    cost: 2100,
    category: "长期荣誉",
    stockLabel: "高阶占位",
    description: "高 XP 孩子的长期荣誉称号。",
  },
];
