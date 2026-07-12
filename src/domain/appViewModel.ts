/**
 * [INPUT]: 依赖课堂 children/ledger/review 状态、精灵定义和 progression 的成长计算。
 * [OUTPUT]: 对外提供 createAppViewModel 纯函数，生成 App 根组件所需的读模型。
 * [POS]: domain 的应用视图读模型 Module，隔离 App.tsx 中的派生状态、排序和 fallback 规则。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { ChildProfile, ChildWithProgress, LedgerRecord, MoralReviewItem, SpiritDefinition } from "../types";
import { enrichChildren } from "./progression";

export interface AppViewModelInput {
  children: ChildProfile[];
  ledger: LedgerRecord[];
  moralReviews: MoralReviewItem[];
  selectedChildId: string;
  spirits: SpiritDefinition[];
  showcaseChildId?: string;
  pkPair?: { playerId: string; opponentId: string } | null;
}

export interface AppViewModel {
  spiritsById: Map<string, SpiritDefinition>;
  childrenWithProgress: ChildWithProgress[];
  selectedChild: ChildWithProgress;
  selectedSpirit: SpiritDefinition;
  showcaseChild?: ChildWithProgress;
  showcaseSpirit?: SpiritDefinition;
  allRecentRecords: LedgerRecord[];
  bigScreenRecentRecords: LedgerRecord[];
  recentRecords: LedgerRecord[];
  opponent: ChildWithProgress;
  pkPlayer?: ChildWithProgress;
  pkOpponent?: ChildWithProgress;
  pendingReviews: MoralReviewItem[];
}

function getFallbackChild(childrenWithProgress: ChildWithProgress[], selectedChildId: string): ChildWithProgress {
  return (
    childrenWithProgress.find((child) => child.id === selectedChildId) ??
    childrenWithProgress[0] ??
    {
      id: "",
      name: "",
      spiritId: "",
      petName: "",
      voiceType: 0,
      slotId: 0,
      xp: 0,
      level: 1,
      state: "egg-1" as const,
      rank: 1,
    }
  );
}

function getSpiritForChild(spiritsById: Map<string, SpiritDefinition>, spirits: SpiritDefinition[], child?: ChildWithProgress) {
  return (child ? spiritsById.get(child.spiritId) : undefined) ?? spirits[0];
}

function getOpponent(childrenWithProgress: ChildWithProgress[], selectedChild: ChildWithProgress): ChildWithProgress {
  if (!childrenWithProgress.length) return selectedChild;
  const selectedIndex = Math.max(0, childrenWithProgress.findIndex((child) => child.id === selectedChild.id));
  return childrenWithProgress[(selectedIndex + 1) % childrenWithProgress.length] ?? selectedChild;
}

export function createAppViewModel(input: AppViewModelInput): AppViewModel {
  const spiritsById = new Map(input.spirits.map((spirit) => [spirit.id, spirit]));
  const childrenWithProgress = enrichChildren(input.children, input.ledger);
  const selectedChild = getFallbackChild(childrenWithProgress, input.selectedChildId);
  const selectedSpirit = getSpiritForChild(spiritsById, input.spirits, selectedChild);
  const showcaseChild = input.showcaseChildId
    ? childrenWithProgress.find((child) => child.id === input.showcaseChildId)
    : undefined;
  const showcaseSpirit = getSpiritForChild(spiritsById, input.spirits, showcaseChild);
  const allRecentRecords = [...input.ledger]
    .filter((record) => !record.undone)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    spiritsById,
    childrenWithProgress,
    selectedChild,
    selectedSpirit,
    showcaseChild,
    showcaseSpirit: showcaseChild ? showcaseSpirit : undefined,
    allRecentRecords,
    bigScreenRecentRecords: allRecentRecords.filter((record) => record.delta > 0),
    recentRecords: allRecentRecords.filter((record) => record.childId === selectedChild.id),
    opponent: getOpponent(childrenWithProgress, selectedChild),
    pkPlayer: input.pkPair ? childrenWithProgress.find((child) => child.id === input.pkPair?.playerId) : undefined,
    pkOpponent: input.pkPair ? childrenWithProgress.find((child) => child.id === input.pkPair?.opponentId) : undefined,
    pendingReviews: input.moralReviews.filter((review) => review.status === "pending_review"),
  };
}
