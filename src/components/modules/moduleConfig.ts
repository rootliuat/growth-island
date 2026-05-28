import {
  BarChart3,
  ClipboardList,
  Gift,
  Home,
  Mic,
  Settings,
  ShoppingBag,
  Sparkles,
  Swords,
  type LucideIcon,
} from "lucide-react";

export type AppModuleId =
  | "home"
  | "roll-call"
  | "voice-record"
  | "math-arena"
  | "lottery"
  | "shop"
  | "leaderboard"
  | "data"
  | "settings";

export interface FeatureCardConfig {
  title: string;
  description: string;
}

export interface ModuleConfig {
  id: AppModuleId;
  label: string;
  eyebrow: string;
  description: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  featureCards: FeatureCardConfig[];
  futureItems: string[];
  homeLinkDescription: string;
  Icon: LucideIcon;
}

export const moduleConfigs: ModuleConfig[] = [
  {
    id: "home",
    label: "首页",
    eyebrow: "北海成长岛",
    description: "全班精灵家园、XP 成长、老师操作和班级活动的主工作台。",
    primaryActionLabel: "返回全岛",
    secondaryActionLabel: "聚焦当前精灵",
    featureCards: [],
    futureItems: [],
    homeLinkDescription: "首页是所有成长行为和模块结果汇聚的位置。",
    Icon: Home,
  },
  {
    id: "roll-call",
    label: "随机点名",
    eyebrow: "课堂活动",
    description: "从当前班级中随机抽取孩子，并可同步聚焦成长岛里的精灵家园。",
    primaryActionLabel: "开始点名",
    secondaryActionLabel: "重置点名池",
    featureCards: [
      { title: "点名池", description: "默认使用当前班级所有孩子，后续支持按区域和状态筛选。" },
      { title: "今日已点", description: "记录本轮点名结果，帮助老师避免重复抽取同一位孩子。" },
      { title: "成长岛联动", description: "抽中后可回到首页，镜头聚焦到对应精灵的小屋门口。" },
    ],
    futureItems: ["排除已点名孩子", "按精灵社区筛选", "点名后直接记录成长行为", "点名结果同步到成长岛"],
    homeLinkDescription: "抽中孩子后，返回首页并选中他的精灵家园。",
    Icon: Sparkles,
  },
  {
    id: "voice-record",
    label: "语音记录",
    eyebrow: "AI 德育识别",
    description: "孩子或老师描述一件成长行为，系统给出德育分类和 XP 建议，老师确认后入库。",
    primaryActionLabel: "提交分析",
    secondaryActionLabel: "查看待复核",
    featureCards: [
      { title: "文本/语音入口", description: "第一阶段先保留文本输入和语音按钮占位，后续接入真实 ASR。" },
      { title: "AI 判断结果", description: "展示建议德育维度、建议 XP、判断理由和置信度。" },
      { title: "老师复核", description: "老师确认、调整或驳回后，才进入成长记录和首页 XP 同步。" },
    ],
    futureItems: ["浏览器录音", "云端 ASR", "音频 14 天复核", "常用表现模板", "按德育维度筛选"],
    homeLinkDescription: "确认后的记录会同步首页精灵 XP、成长记录和地图反馈。",
    Icon: Mic,
  },
  {
    id: "math-arena",
    label: "数学竞技场",
    eyebrow: "数学魔法 PK",
    description: "两个孩子进行 20 以内加减法 1v1 PK，胜者获得成长 XP。",
    primaryActionLabel: "选择对战孩子",
    secondaryActionLabel: "查看规则",
    featureCards: [
      { title: "1v1 对战", description: "双方 HP 100，答对一次造成 20 伤害，HP 归零判负。" },
      { title: "20 以内算术", description: "第一版统一使用加减法，保持低龄儿童可理解。" },
      { title: "胜者奖励", description: "胜者 +30 XP，败者不扣 XP，并写入成长记录。" },
    ],
    futureItems: ["题目难度分层", "战斗记录", "PK 入口与地图建筑联动", "班级挑战赛"],
    homeLinkDescription: "PK 结束后返回首页，胜者精灵 XP 与成长记录同步更新。",
    Icon: Swords,
  },
  {
    id: "lottery",
    label: "积分抽奖",
    eyebrow: "班级激励",
    description: "把成长激励转化为抽奖体验。第一阶段只展示，不消耗 XP。",
    primaryActionLabel: "开始抽奖",
    secondaryActionLabel: "查看奖池",
    featureCards: [
      { title: "选择孩子", description: "默认读取当前选中孩子，后续支持班级批量活动。" },
      { title: "静态奖池", description: "先展示奖池结构，避免引入库存和概率后台。" },
      { title: "抽奖记录", description: "本地记录抽奖结果，后续再接入真实保存。" },
    ],
    futureItems: ["奖池配置", "真实中奖记录", "活动积分", "抽奖后成长岛动效"],
    homeLinkDescription: "抽奖结果不影响成长 XP，可回首页查看孩子精灵。",
    Icon: Gift,
  },
  {
    id: "shop",
    label: "积分商店",
    eyebrow: "奖励兑换",
    description: "班级奖励兑换台。第一阶段展示兑换结构，不做真实扣减。",
    primaryActionLabel: "查看可兑换",
    secondaryActionLabel: "兑换记录",
    featureCards: [
      { title: "奖品卡片", description: "展示奖品名称、所需积分和库存占位。" },
      { title: "孩子余额", description: "读取当前孩子 XP，用于展示兑换资格。" },
      { title: "兑换记录", description: "第一阶段只做本地记录规划，不改变 XP。" },
    ],
    futureItems: ["真实扣减", "真实库存", "兑换审批", "奖品维护", "可消费积分与成长 XP 拆分"],
    homeLinkDescription: "兑换后可回到首页查看对应孩子和精灵状态。",
    Icon: ShoppingBag,
  },
  {
    id: "leaderboard",
    label: "排行榜",
    eyebrow: "成长展示",
    description: "用游戏化榜单展示周榜、月榜和总榜，降低传统排名压力。",
    primaryActionLabel: "查看总榜",
    secondaryActionLabel: "返回成长岛",
    featureCards: [
      { title: "前三名展示", description: "用领奖台或精灵卡突出展示，不做冷冰冰表格。" },
      { title: "总榜排序", description: "第一版按当前 XP 排序，作为可落地的榜单基础。" },
      { title: "个人位置", description: "老师可快速找到某个孩子并回到成长岛聚焦。" },
    ],
    futureItems: ["真实周榜", "真实月榜", "榜单时间范围", "榜单展示模式"],
    homeLinkDescription: "点击孩子后返回首页，聚焦对应精灵家园。",
    Icon: BarChart3,
  },
  {
    id: "data",
    label: "数据管理",
    eyebrow: "老师工作台",
    description: "查看幼儿名单、成长流水、待复核记录和同步状态。",
    primaryActionLabel: "查看成长流水",
    secondaryActionLabel: "导出占位",
    featureCards: [
      { title: "幼儿名单", description: "展示班级孩子、精灵、等级和当前 XP。" },
      { title: "成长流水", description: "集中查看加分、扣分、PK、对话识别等记录。" },
      { title: "复核记录", description: "聚合 AI 待复核项，方便老师统一处理。" },
    ],
    futureItems: ["真实导出", "批量导入", "复核记录详情", "数据同步诊断"],
    homeLinkDescription: "从数据管理选择孩子或记录后，可回首页定位精灵。",
    Icon: ClipboardList,
  },
  {
    id: "settings",
    label: "系统设置",
    eyebrow: "班级配置",
    description: "维护班级、成长规则、显示模式和奖励入口。第一阶段只做静态配置页。",
    primaryActionLabel: "保存设置",
    secondaryActionLabel: "查看规则",
    featureCards: [
      { title: "班级信息", description: "展示当前班级名称、幼儿数量和老师模式说明。" },
      { title: "成长规则", description: "展示 XP 阈值、加扣分范围和数学 PK 奖励规则。" },
      { title: "显示模式", description: "规划老师模式、展示模式和大屏显示设置。" },
    ],
    futureItems: ["真实保存", "奖品设置", "权限配置", "主题配置"],
    homeLinkDescription: "设置影响系统展示和规则说明，第一阶段不改变首页业务逻辑。",
    Icon: Settings,
  },
];

export const moduleConfigById = new Map(moduleConfigs.map((module) => [module.id, module]));
