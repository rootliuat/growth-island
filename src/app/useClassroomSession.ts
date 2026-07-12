/**
 * [INPUT]: 依赖课堂种子数据、备份领域规则、classroomApi 快照读取与 browser/appStorage。
 * [OUTPUT]: 对外提供 useClassroomSession，集中课堂快照状态、同步、备份和持久化能力。
 * [POS]: app 的课堂数据会话深 Module，是 children/ledger/review 等持久状态的唯一所有者。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useMemo, useState } from "react";
import {
  getInitialClassroomBackup,
  getInitialClassroomSource,
  getInitialLotteryDraws,
  getInitialOrganizationState,
  getInitialSettingsChanges,
  getInitialShopRedemptions,
  getInitialTeacherMode,
  lotteryDrawsStorageKey,
  preferLocalClassroomBackup,
  saveClassroomBackupToStorage,
  saveOrganizationStateToStorage,
  settingsChangesStorageKey,
  shopRedemptionsStorageKey,
  teacherModeStorageKey,
} from "../browser/appStorage";
import { initialChildren } from "../data/classroom";
import { seededLedger, seededMoralReviews } from "../data/demoRecords";
import {
  compareClassroomBackups,
  createClassroomBackup,
  createClearedClassroomBackup,
  normalizeClassroomBackup,
  parseClassroomBackupJson,
  serializeClassroomBackup,
  summarizeClassroomBackup,
} from "../domain/classroomBackup";
import type { SyncStatus } from "../domain/appState";
import { normalizeLedgerRecord } from "../domain/progression";
import { fetchClassroomSnapshot } from "../services/classroomApi";
import type {
  ClassroomBackupImportPreview,
  ClassroomBackupSnapshot,
  ClassroomDataClearSummary,
  ClassroomSnapshot,
  LedgerRecord,
  LotteryDrawRecord,
  MoralReviewItem,
  OrganizationState,
  SettingsChangeRecord,
  ShopRedemption,
} from "../types";

function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function useClassroomSession() {
  const initialBackup = useMemo(() => getInitialClassroomBackup(), []);
  const initialSource = useMemo(() => getInitialClassroomSource(initialBackup), [initialBackup]);
  const [children, setChildren] = useState(() => initialBackup?.children ?? initialChildren);
  const [ledger, setLedger] = useState<LedgerRecord[]>(() => initialBackup?.ledger ?? seededLedger);
  const [moralReviews, setMoralReviews] = useState<MoralReviewItem[]>(() => initialBackup?.moralReviews ?? seededMoralReviews);
  const [selectedChildId, setSelectedChildId] = useState(initialBackup?.children[0]?.id ?? initialChildren[0].id);
  const [teacherMode, setTeacherMode] = useState(() => initialBackup?.settings.teacherMode ?? getInitialTeacherMode());
  const [settingsChanges, setSettingsChanges] = useState<SettingsChangeRecord[]>(
    () => initialBackup?.settings.settingsChanges ?? getInitialSettingsChanges(),
  );
  const [lotteryDraws, setLotteryDraws] = useState<LotteryDrawRecord[]>(
    () => initialBackup?.lotteryDraws ?? getInitialLotteryDraws(),
  );
  const [shopRedemptions, setShopRedemptions] = useState<ShopRedemption[]>(
    () => initialBackup?.shopRedemptions ?? getInitialShopRedemptions(),
  );
  const [organizationState, setOrganizationState] = useState<OrganizationState>(
    () => initialBackup?.organization ?? getInitialOrganizationState(),
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (initialSource === "local" ? "offline" : "connecting"));

  const applySnapshot = (snapshot: ClassroomSnapshot) => {
    setChildren(snapshot.children);
    setLedger(snapshot.ledger.map(normalizeLedgerRecord));
    setMoralReviews(snapshot.moralReviews ?? []);
    setSyncStatus("online");
  };

  const createCurrentBackup = () =>
    createClassroomBackup({
      children,
      ledger,
      moralReviews,
      shopRedemptions,
      lotteryDraws,
      teacherMode,
      settingsChanges,
      organization: organizationState,
    });

  const restoreBackup = (input: ClassroomBackupSnapshot) => {
    const backup = normalizeClassroomBackup(input);
    saveClassroomBackupToStorage(backup);
    preferLocalClassroomBackup();
    saveOrganizationStateToStorage(backup.organization);
    setChildren(backup.children);
    setLedger(backup.ledger.map(normalizeLedgerRecord));
    setMoralReviews(backup.moralReviews);
    setShopRedemptions(backup.shopRedemptions.slice(0, 50));
    setLotteryDraws(backup.lotteryDraws.slice(0, 50));
    setTeacherMode(backup.settings.teacherMode);
    setSettingsChanges(backup.settings.settingsChanges.slice(0, 50));
    setOrganizationState(backup.organization);
    setSelectedChildId((current) =>
      backup.children.some((child) => child.id === current) ? current : backup.children[0]?.id ?? initialChildren[0].id,
    );
    setSyncStatus("offline");
    return summarizeClassroomBackup(backup);
  };

  const exportBackup = () => {
    const backup = createCurrentBackup();
    saveClassroomBackupToStorage(backup);
    downloadJson(`beihai-growth-island-backup-${backup.exportedAt.slice(0, 10)}.json`, serializeClassroomBackup(backup));
    return summarizeClassroomBackup(backup);
  };

  const previewBackupFile = async (file: File): Promise<ClassroomBackupImportPreview> => {
    const backup = parseClassroomBackupJson(await file.text());
    return { snapshot: backup, comparison: compareClassroomBackups(createCurrentBackup(), backup) };
  };

  const clearDemoData = (): ClassroomDataClearSummary => {
    const clearedAt = new Date().toISOString();
    const summary = {
      childCount: children.length,
      clearedLedgerCount: ledger.length,
      clearedReviewCount: moralReviews.length,
      clearedShopRedemptionCount: shopRedemptions.length,
      clearedLotteryDrawCount: lotteryDraws.length,
      clearedSettingsChangeCount: settingsChanges.length,
      clearedActiveCurriculumCount: Object.keys(organizationState.activeCurriculumByClassroomId).length,
      clearedParentReportReviewCount: Object.keys(organizationState.parentReportReviewsByChildId).length,
      exportedAt: clearedAt,
    };
    const backup = createClearedClassroomBackup({ children, teacherMode }, clearedAt);
    saveClassroomBackupToStorage(backup);
    preferLocalClassroomBackup();
    saveOrganizationStateToStorage(backup.organization);
    setLedger([]);
    setMoralReviews([]);
    setShopRedemptions([]);
    setLotteryDraws([]);
    setSettingsChanges([]);
    setOrganizationState(backup.organization);
    setSelectedChildId((current) =>
      children.some((child) => child.id === current) ? current : children[0]?.id ?? initialChildren[0].id,
    );
    setSyncStatus("offline");
    return summary;
  };

  useEffect(() => {
    if (initialSource === "local") return;
    let cancelled = false;
    fetchClassroomSnapshot()
      .then((snapshot) => {
        if (!cancelled) applySnapshot(snapshot);
      })
      .catch(() => {
        if (!cancelled) setSyncStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => window.localStorage.setItem(teacherModeStorageKey, String(teacherMode)), [teacherMode]);
  useEffect(() => window.localStorage.setItem(settingsChangesStorageKey, JSON.stringify(settingsChanges.slice(0, 50))), [settingsChanges]);
  useEffect(() => window.localStorage.setItem(shopRedemptionsStorageKey, JSON.stringify(shopRedemptions.slice(0, 50))), [shopRedemptions]);
  useEffect(() => window.localStorage.setItem(lotteryDrawsStorageKey, JSON.stringify(lotteryDraws.slice(0, 50))), [lotteryDraws]);
  useEffect(() => saveOrganizationStateToStorage(organizationState), [organizationState]);
  useEffect(() => {
    if (syncStatus === "connecting") return;
    saveClassroomBackupToStorage(createCurrentBackup());
  }, [children, ledger, lotteryDraws, moralReviews, organizationState, settingsChanges, shopRedemptions, syncStatus, teacherMode]);

  return {
    state: { children, ledger, moralReviews, organizationState, settingsChanges, shopRedemptions, lotteryDraws, teacherMode, syncStatus, selectedChildId },
    setters: { setChildren, setLedger, setMoralReviews, setOrganizationState, setSettingsChanges, setShopRedemptions, setLotteryDraws, setTeacherMode, setSyncStatus, setSelectedChildId },
    snapshot: { apply: applySnapshot },
    backup: {
      clear: clearDemoData,
      confirmImport: restoreBackup,
      create: createCurrentBackup,
      export: exportBackup,
      previewFile: previewBackupFile,
      restore: restoreBackup,
    },
  };
}
