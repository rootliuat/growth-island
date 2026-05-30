import {
  BarChart3,
  ClipboardList,
  Database,
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
  | "teacher-workbench"
  | "child-profile"
  | "voice-record"
  | "roll-call"
  | "math-arena"
  | "lottery"
  | "shop"
  | "leaderboard"
  | "data-management"
  | "settings";

export interface FeatureCardConfig {
  title: string;
  description: string;
}

export interface ModuleConfig {
  id: AppModuleId;
  label: string;
  navGroup: "primary" | "activity" | "admin";
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
    label: "成长岛大屏",
    navGroup: "primary",
    eyebrow: "孩子可见",
    description: "全班精灵家园、升级反馈和班级活动结果的展示大屏。",
    primaryActionLabel: "返回全岛",
    secondaryActionLabel: "定位当前精灵",
    featureCards: [],
    futureItems: [],
    homeLinkDescription: "所有成长行为的结果会回到大屏，以精灵、家园和光效演出来。",
    Icon: Home,
  },
  {
    id: "teacher-workbench",
    label: "课堂记录台",
    navGroup: "primary",
    eyebrow: "老师快操作",
    description: "像点名器一样快速完成选孩子、记行为、加减 XP、批量记录和 AI 建议确认。",
    primaryActionLabel: "开始记录",
    secondaryActionLabel: "查看待复核",
    featureCards: [
      { title: "5 秒记录", description: "选择孩子、套用行为模板或输入文本，确认后立即写入成长流水。" },
      { title: "批量入账", description: "可勾选多个孩子，一次记录同一条课堂行为。" },
      { title: "AI 只建议", description: "AI 给出德育维度和 XP 建议，老师确认后才进入流水账。" },
    ],
    futureItems: ["真实语音 ASR", "更多行为模板", "课堂活动批量结算", "待复核筛选"],
    homeLinkDescription: "确认后的记录会同步成长岛大屏，触发精灵 XP 和成长反馈。",
    Icon: Mic,
  },
  {
    id: "child-profile",
    label: "成长档案",
    navGroup: "primary",
    eyebrow: "成长沉淀",
    description: "按孩子查看成长故事线、德育维度、代表行为和精灵等级变化。",
    primaryActionLabel: "查看档案",
    secondaryActionLabel: "回到成长岛",
    featureCards: [
      { title: "成长故事线", description: "按时间串起老师确认过的成长记录，突出代表性事件。" },
      { title: "德育画像", description: "按七大德育维度汇总孩子的成长证据。" },
      { title: "精灵变化", description: "把 XP、等级、形态和家园变化作为可展示的成长结果。" },
    ],
    futureItems: ["家长分享页", "月度成长报告", "档案导出", "维度趋势图"],
    homeLinkDescription: "从档案可回到成长岛，查看该孩子的精灵和家园。",
    Icon: ClipboardList,
  },
  {
    id: "voice-record",
    label: "文本记录",
    navGroup: "activity",
    eyebrow: "AI 建议",
    description: "选择孩子，输入课堂表现文本，生成德育维度和 XP 建议，老师确认后入账。",
    primaryActionLabel: "开始记录",
    secondaryActionLabel: "查看建议",
    featureCards: [
      { title: "文本先行", description: "先用文本完成课堂记录流程。" },
      { title: "老师确认", description: "AI 只生成建议，确认后才写入成长流水。" },
      { title: "同步成长岛", description: "确认后 XP 和最近成长会同步到首页大屏。" },
    ],
    futureItems: ["语音识别接入", "音频上传", "14 天音频管理", "批量语音整理"],
    homeLinkDescription: "确认后的德育记录会同步成长岛，并选中对应孩子。",
    Icon: Mic,
  },
  {
    id: "roll-call",
    label: "随机点名",
    navGroup: "activity",
    eyebrow: "课堂活动",
    description: "从当前班级中随机抽取孩子，并同步选中成长岛里的精灵家园。",
    primaryActionLabel: "开始点名",
    secondaryActionLabel: "重置点名池",
    featureCards: [
      { title: "点名池", description: "支持按成长区域和等级筛选，并可排除本轮已点过孩子。" },
      { title: "今日已点", description: "记录本轮点名结果，支持复制名单给课堂复盘或会后整理。" },
      { title: "成长岛联动", description: "抽中后可记录成长行为，或回到首页查看对应精灵家园。" },
    ],
    futureItems: ["导出点名报表", "接入课堂大屏模式", "按历史频次智能均衡抽取"],
    homeLinkDescription: "抽中孩子后，返回首页并选中他的精灵家园。",
    Icon: Sparkles,
  },
  {
    id: "math-arena",
    label: "数学竞技场",
    navGroup: "activity",
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
    navGroup: "activity",
    eyebrow: "班级激励",
    description: "选择孩子抽取班级奖励，本轮不消耗 XP。",
    primaryActionLabel: "开始抽奖",
    secondaryActionLabel: "查看奖池",
    featureCards: [
      { title: "选择孩子", description: "默认读取当前选中孩子，后续支持班级批量活动。" },
      { title: "班级奖池", description: "展示班级奖励内容，不引入库存和概率后台。" },
      { title: "抽奖记录", description: "保留本轮抽奖结果，便于课堂复盘。" },
    ],
    futureItems: ["奖池配置", "中奖记录", "活动积分", "抽奖后成长岛动效"],
    homeLinkDescription: "抽奖结果不影响成长 XP，可回首页查看孩子精灵。",
    Icon: Gift,
  },
  {
    id: "shop",
    label: "积分商店",
    navGroup: "activity",
    eyebrow: "奖励兑换",
    description: "选择孩子查看奖励门槛，本轮不扣减 XP。",
    primaryActionLabel: "查看可兑换",
    secondaryActionLabel: "兑换记录",
    featureCards: [
      { title: "奖品卡片", description: "展示奖品名称、所需积分和兑换门槛。" },
      { title: "孩子余额", description: "读取当前孩子 XP，用于展示兑换资格。" },
      { title: "兑换记录", description: "保留选择记录，不改变 XP。" },
    ],
    futureItems: ["扣减规则", "库存管理", "兑换审批", "奖品维护", "可消费积分与成长 XP 拆分"],
    homeLinkDescription: "兑换后可回到首页查看对应孩子和精灵状态。",
    Icon: ShoppingBag,
  },
  {
    id: "leaderboard",
    label: "排行榜",
    navGroup: "activity",
    eyebrow: "成长展示",
    description: "用游戏化榜单展示周榜、月榜和总榜，降低传统排名压力。",
    primaryActionLabel: "查看总榜",
    secondaryActionLabel: "返回成长岛",
    featureCards: [
      { title: "前三名展示", description: "用领奖台或精灵卡突出展示，不做冷冰冰表格。" },
      { title: "总榜排序", description: "第一版按当前 XP 排序，作为可落地的榜单基础。" },
      { title: "个人位置", description: "老师可快速找到某个孩子并回到成长岛查看。" },
    ],
    futureItems: ["周榜", "月榜", "榜单时间范围", "榜单展示模式"],
    homeLinkDescription: "点击孩子后返回首页，查看对应精灵家园。",
    Icon: BarChart3,
  },
  {
    id: "data-management",
    label: "数据管理",
    navGroup: "admin",
    eyebrow: "老师工作台",
    description: "查看孩子列表、成长流水和待复核记录，帮助评审看到系统的数据沉淀。",
    primaryActionLabel: "查看流水",
    secondaryActionLabel: "处理复核",
    featureCards: [
      { title: "孩子列表", description: "按孩子、精灵、等级和 XP 搜索定位。" },
      { title: "成长流水", description: "统一读取 XP ledger，不重复存储记录。" },
      { title: "待复核", description: "AI 建议保持待确认状态，老师通过后才入账。" },
    ],
    futureItems: ["导出报表", "批量筛选", "复核分派", "家长沟通记录"],
    homeLinkDescription: "从数据管理可回到成长岛，查看当前孩子。",
    Icon: Database,
  },
  {
    id: "settings",
    label: "系统设置",
    navGroup: "admin",
    eyebrow: "班级配置",
    description: "管理班级、成长规则、显示模式和奖励入口。",
    primaryActionLabel: "保存设置",
    secondaryActionLabel: "查看规则",
    featureCards: [
      { title: "班级信息", description: "展示当前班级名称、幼儿数量和老师模式说明。" },
      { title: "成长规则", description: "展示 XP 阈值、加扣分范围和数学 PK 奖励规则。" },
      { title: "显示模式", description: "规划老师模式、展示模式和大屏显示设置。" },
    ],
    futureItems: ["配置保存", "奖品设置", "权限配置", "主题配置"],
    homeLinkDescription: "设置影响系统展示和规则说明，不改变首页业务逻辑。",
    Icon: Settings,
  },
];

export const moduleConfigById = new Map(moduleConfigs.map((module) => [module.id, module]));
