/**
 * [INPUT]: 依赖 classroomBackup 的解析/序列化规则、moduleConfig 的模块清单和浏览器 localStorage。
 * [OUTPUT]: 对外提供 App 启动状态、本地备份及课堂快照来源偏好的读写 Adapter。
 * [POS]: browser 的持久化 Adapter，把 localStorage 细节从 App 根接线层移走。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { moduleConfigById, type AppModuleId } from "../components/modules/moduleConfig";
import {
  normalizeOrganizationState,
  parseClassroomBackupJson,
  serializeClassroomBackup,
} from "../domain/classroomBackup";
import type {
  ClassroomBackupSnapshot,
  LotteryDrawRecord,
  OrganizationState,
  SettingsChangeRecord,
  ShopRedemption,
} from "../types";

export const activeModuleStorageKey = "growth-island-active-module";
export const classroomBackupStorageKey = "growth-island-classroom-backup";
export const classroomBackupSourceStorageKey = "growth-island-classroom-source";
export const teacherModeStorageKey = "growth-island-teacher-mode";
export const settingsChangesStorageKey = "growth-island-settings-changes";
export const shopRedemptionsStorageKey = "growth-island-shop-redemptions";
export const lotteryDrawsStorageKey = "growth-island-lottery-draws";
export const organizationStateStorageKey = "growth-island-organization-state";

export const emptyOrganizationState: OrganizationState = {
  activeCurriculumByClassroomId: {},
  parentReportReviewsByChildId: {},
};

export function getInitialActiveModule(): AppModuleId {
  if (typeof window === "undefined") return "home";
  const fromQuery = new URLSearchParams(window.location.search).get("module");
  const fromStorage = window.localStorage.getItem(activeModuleStorageKey);
  const candidate = fromQuery || fromStorage;
  return candidate && moduleConfigById.has(candidate as AppModuleId) ? (candidate as AppModuleId) : "home";
}

export function getInitialClassroomBackup(): ClassroomBackupSnapshot | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(classroomBackupStorageKey);
  if (!stored) return null;
  try {
    return parseClassroomBackupJson(stored);
  } catch {
    return null;
  }
}

export function saveClassroomBackupToStorage(snapshot: ClassroomBackupSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(classroomBackupStorageKey, serializeClassroomBackup(snapshot));
}

export function preferLocalClassroomBackup() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(classroomBackupSourceStorageKey, "local");
}

export function getInitialClassroomSource(backup: ClassroomBackupSnapshot | null): "local" | "server" {
  if (typeof window === "undefined") return "server";
  if (window.localStorage.getItem(classroomBackupSourceStorageKey) !== "local") return "server";
  if (backup) return "local";
  window.localStorage.removeItem(classroomBackupSourceStorageKey);
  return "server";
}

export function saveOrganizationStateToStorage(state: OrganizationState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(organizationStateStorageKey, JSON.stringify(state));
}

export function getInitialTeacherMode() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(teacherModeStorageKey);
  return stored === null ? true : stored === "true";
}

export function getInitialSettingsChanges(): SettingsChangeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(settingsChangesStorageKey) ?? "[]") as SettingsChangeRecord[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.key === "string").slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

export function getInitialShopRedemptions(): ShopRedemption[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(shopRedemptionsStorageKey) ?? "[]") as ShopRedemption[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.childId === "string").slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

export function getInitialLotteryDraws(): LotteryDrawRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(lotteryDrawsStorageKey) ?? "[]") as LotteryDrawRecord[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.childId === "string").slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

export function getInitialOrganizationState(): OrganizationState {
  if (typeof window === "undefined") return emptyOrganizationState;
  try {
    return normalizeOrganizationState(JSON.parse(window.localStorage.getItem(organizationStateStorageKey) ?? "{}"));
  } catch {
    return emptyOrganizationState;
  }
}
