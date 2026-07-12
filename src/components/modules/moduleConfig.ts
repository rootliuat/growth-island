import {
  BarChart3,
  ClipboardList,
  Database,
  Gift,
  Home,
  Mic,
  School,
  Settings,
  ShoppingBag,
  Sparkles,
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
  | "organization"
  | "settings";

export type ModuleHudGroup = "dock" | "teacher-tools";

export interface ModuleConfig {
  id: AppModuleId;
  label: string;
  dockLabel: string;
  sceneLabel: string;
  hudGroup: ModuleHudGroup;
  Icon: LucideIcon;
}

export const moduleConfigs: ModuleConfig[] = [
  {
    id: "home",
    label: "成长岛",
    dockLabel: "地图",
    sceneLabel: "成长岛",
    hudGroup: "dock",
    Icon: Home,
  },
  {
    id: "teacher-workbench",
    label: "老师记录港",
    dockLabel: "补记",
    sceneLabel: "老师记录港",
    hudGroup: "teacher-tools",
    Icon: Mic,
  },
  {
    id: "child-profile",
    label: "精灵小屋",
    dockLabel: "小屋",
    sceneLabel: "精灵小屋",
    hudGroup: "dock",
    Icon: ClipboardList,
  },
  {
    id: "roll-call",
    label: "抽取台",
    dockLabel: "抽取",
    sceneLabel: "抽取台",
    hudGroup: "dock",
    Icon: Sparkles,
  },
  {
    id: "math-arena",
    label: "贝壳算术",
    dockLabel: "算术",
    sceneLabel: "算术点亮",
    hudGroup: "dock",
    Icon: Sparkles,
  },
  {
    id: "lottery",
    label: "幸运贝池",
    dockLabel: "抽奖",
    sceneLabel: "幸运贝池",
    hudGroup: "dock",
    Icon: Gift,
  },
  {
    id: "shop",
    label: "海岛小铺",
    dockLabel: "小铺",
    sceneLabel: "海岛小铺",
    hudGroup: "dock",
    Icon: ShoppingBag,
  },
  {
    id: "leaderboard",
    label: "荣誉广场",
    dockLabel: "荣誉",
    sceneLabel: "荣誉广场",
    hudGroup: "dock",
    Icon: BarChart3,
  },
  {
    id: "voice-record",
    label: "贝壳记录台",
    dockLabel: "记录",
    sceneLabel: "记录贝壳",
    hudGroup: "teacher-tools",
    Icon: Mic,
  },
  {
    id: "data-management",
    label: "本机账本",
    dockLabel: "账本",
    sceneLabel: "本机账本",
    hudGroup: "teacher-tools",
    Icon: Database,
  },
  {
    id: "organization",
    label: "班级任务",
    dockLabel: "任务",
    sceneLabel: "班级任务",
    hudGroup: "teacher-tools",
    Icon: School,
  },
  {
    id: "settings",
    label: "本机舵盘",
    dockLabel: "舵盘",
    sceneLabel: "本机舵盘",
    hudGroup: "teacher-tools",
    Icon: Settings,
  },
];

export const moduleConfigById = new Map(moduleConfigs.map((module) => [module.id, module]));
