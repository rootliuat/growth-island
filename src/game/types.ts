import type { ChildWithProgress, LedgerRecord, SpiritDefinition, VirtueCategory } from "../types";

export type RegionId =
  | "growth-plaza"
  | "mangrove"
  | "shell-bay"
  | "pearl-bay"
  | "sun-town"
  | "math-arena"
  | "old-street";

export type HomeType = "shell" | "treehouse" | "cottage" | "pearl" | "tent" | "garden";

export type SpiritMood = "happy" | "normal" | "proud" | "sad" | "sleepy";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface MapRegion {
  id: RegionId;
  name: string;
  description: string;
  center: WorldPoint;
  radiusX: number;
  radiusY: number;
  shape: WorldPoint[];
  signPosition: WorldPoint;
  color: number;
  accent: number;
  labelZoom: number;
}

export interface HomeSlot {
  id: string;
  regionId: RegionId;
  type: HomeType;
  position: WorldPoint;
  doorOffset: WorldPoint;
}

export interface WorldHome {
  id: string;
  childId: string;
  petName: string;
  childName: string;
  regionId: RegionId;
  type: HomeType;
  level: number;
  position: WorldPoint;
  doorPosition: WorldPoint;
  accent: number;
}

export interface WorldSpirit {
  id: string;
  child: ChildWithProgress;
  spirit: SpiritDefinition;
  regionId: RegionId;
  homeId: string;
  homeType: HomeType;
  homeLevel: number;
  homePosition: WorldPoint;
  doorPosition: WorldPoint;
  spritePosition: WorldPoint;
  mood: SpiritMood;
  accent: number;
  imageUrl?: string;
  imageKey?: string;
  lastActivity?: string;
  lastActivityDelta?: number;
}

export interface VirtueRegionEnergy {
  regionId: RegionId;
  category: VirtueCategory;
  label: string;
  displayText: string;
  color: number;
  totalDelta: number;
  count: number;
  current: boolean;
}

export interface WorldMapData {
  spirits: WorldSpirit[];
  homes: WorldHome[];
  selectedChildId: string;
  regionEnergy: VirtueRegionEnergy[];
  lastLedger?: LedgerRecord;
}

export interface WorldMapCallbacks {
  onSelectChild: (childId: string) => void;
  onOpenPk?: () => void;
  onOpenDialogue?: () => void;
  onOpenModule?: (moduleId: "shop" | "leaderboard" | "child-profile") => void;
  onPrepareMoralSpeak?: () => void;
}

export interface CameraTarget {
  x: number;
  y: number;
  zoom: number;
}
