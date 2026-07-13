/**
 * [INPUT]: 依赖课堂种子数据、备份领域规则、classroomApi 快照读取与 browser/appStorage。
 * [OUTPUT]: 对外提供 useClassroomSession，集中课堂快照、数据权威、降级提交、备份和持久化能力。
 * [POS]: app 的课堂数据会话深 Module，是课堂持久状态与 server/local/unavailable 权威的唯一所有者。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getInitialClassroomBackup,
  getInitialClassroomSource,
  getInitialLotteryDraws,
  getInitialOrganizationState,
  getInitialSettingsChanges,
  getInitialShopRedemptions,
  getInitialTeacherMode,
  lotteryDrawsStorageKey,
  persistAuthoritativeClassroomBackup,
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
import type { ClassroomDataAuthority, SyncStatus } from "../domain/appState";
import { normalizeLedgerRecord } from "../domain/progression";
import { fetchClassroomSnapshot, isClassroomAvailabilityFailure } from "../services/classroomApi";
import type {
  ChildProfile,
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

interface LocalClassroomState {
  children: ChildProfile[];
  ledger: LedgerRecord[];
  moralReviews: MoralReviewItem[];
  shopRedemptions: ShopRedemption[];
  lotteryDraws: LotteryDrawRecord[];
  teacherMode: boolean;
  settingsChanges: SettingsChangeRecord[];
  organizationState: OrganizationState;
}

type LocalClassroomChanges = Partial<LocalClassroomState>;

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
  const [dataAuthority, setDataAuthority] = useState<ClassroomDataAuthority>(() => (initialSource === "local" ? "local" : "server"));
  const [classroomNotice, setClassroomNotice] = useState<string | undefined>(() =>
    initialSource === "local" ? "当前使用本机课堂数据；刷新后仍保留本机版本，请定期导出备份。" : undefined,
  );
  const dataAuthorityRef = useRef<ClassroomDataAuthority>(initialSource === "local" ? "local" : "server");
  const currentStateRef = useRef<LocalClassroomState>({
    children,
    ledger,
    moralReviews,
    shopRedemptions,
    lotteryDraws,
    teacherMode,
    settingsChanges,
    organizationState,
  });
  currentStateRef.current = { children, ledger, moralReviews, shopRedemptions, lotteryDraws, teacherMode, settingsChanges, organizationState };

  const applySnapshot = (snapshot: ClassroomSnapshot) => {
    if (dataAuthorityRef.current !== "server") return false;
    setChildren(snapshot.children);
    setLedger(snapshot.ledger.map(normalizeLedgerRecord));
    setMoralReviews(snapshot.moralReviews ?? []);
    setDataAuthority("server");
    setClassroomNotice(undefined);
    setSyncStatus("online");
    return true;
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

  const commitLocalChanges = (
    update: LocalClassroomChanges | ((current: LocalClassroomState) => LocalClassroomChanges),
    notice = "服务器保存失败，已切换为本机保存；刷新后不会回到服务器，请尽快导出备份。",
  ) => {
    const current = currentStateRef.current;
    const changes = typeof update === "function" ? update(current) : update;
    const next = { ...current, ...changes };
    const backup = createClassroomBackup({
      children: next.children,
      ledger: next.ledger,
      moralReviews: next.moralReviews,
      shopRedemptions: next.shopRedemptions,
      lotteryDraws: next.lotteryDraws,
      teacherMode: next.teacherMode,
      settingsChanges: next.settingsChanges,
      organization: next.organizationState,
    });
    if (!persistAuthoritativeClassroomBackup(backup).ok) {
      setDataAuthority("unavailable");
      dataAuthorityRef.current = "unavailable";
      setClassroomNotice("本机保存失败，请停止新增课堂记录并立即检查浏览器存储。当前数据未被标记为已保存。");
      setSyncStatus("unavailable");
      return false;
    }
    currentStateRef.current = next;
    dataAuthorityRef.current = "local";
    if (changes.children) setChildren(backup.children);
    if (changes.ledger) setLedger(backup.ledger.map(normalizeLedgerRecord));
    if (changes.moralReviews) setMoralReviews(backup.moralReviews);
    if (changes.shopRedemptions) setShopRedemptions(backup.shopRedemptions.slice(0, 50));
    if (changes.lotteryDraws) setLotteryDraws(backup.lotteryDraws.slice(0, 50));
    if (changes.teacherMode !== undefined) setTeacherMode(backup.settings.teacherMode);
    if (changes.settingsChanges) setSettingsChanges(backup.settings.settingsChanges.slice(0, 50));
    if (changes.organizationState) setOrganizationState(backup.organization);
    setDataAuthority("local");
    setClassroomNotice(notice);
    setSyncStatus("offline");
    return true;
  };

  const markServerWriteUncertain = () => {
    dataAuthorityRef.current = "unavailable";
    setDataAuthority("unavailable");
    setClassroomNotice("服务器保存结果无法确认，已暂停新增记录以避免重复。请检查服务后刷新；现有本机备份仍保留。");
    setSyncStatus("unavailable");
  };

  const restoreBackup = (input: ClassroomBackupSnapshot) => {
    const backup = normalizeClassroomBackup(input);
    if (!persistAuthoritativeClassroomBackup(backup).ok) throw new Error("本机备份保存失败");
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
    dataAuthorityRef.current = "local";
    setDataAuthority("local");
    setClassroomNotice("当前使用已恢复的本机课堂数据；刷新后仍保留本机版本，请定期导出备份。");
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
    if (!persistAuthoritativeClassroomBackup(backup).ok) throw new Error("本机清空结果保存失败");
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
    dataAuthorityRef.current = "local";
    setDataAuthority("local");
    setClassroomNotice("当前使用已清空的本机课堂数据；刷新后仍保留本机版本，请定期导出备份。");
    return summary;
  };

  useEffect(() => {
    if (initialSource === "local") return;
    let cancelled = false;
    fetchClassroomSnapshot()
      .then((snapshot) => {
        if (!cancelled) applySnapshot(snapshot);
      })
      .catch((error) => {
        if (cancelled) return;
        if (initialBackup && isClassroomAvailabilityFailure(error)) {
          commitLocalChanges({}, "服务器暂不可用，已继续使用本机课堂备份；刷新后不会回到服务器，请尽快导出备份。");
          return;
        }
        setDataAuthority("unavailable");
        dataAuthorityRef.current = "unavailable";
        setClassroomNotice("课堂数据暂不可用，且没有有效本机备份。请恢复备份或修复服务器后刷新；演示数据不会自动保存。");
        setSyncStatus("unavailable");
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
    if (syncStatus === "connecting" || dataAuthority === "unavailable") return;
    saveClassroomBackupToStorage(createCurrentBackup());
  }, [children, dataAuthority, ledger, lotteryDraws, moralReviews, organizationState, settingsChanges, shopRedemptions, syncStatus, teacherMode]);

  return {
    state: { children, ledger, moralReviews, organizationState, settingsChanges, shopRedemptions, lotteryDraws, teacherMode, syncStatus, selectedChildId, dataAuthority, classroomNotice },
    setters: { setChildren, setLedger, setMoralReviews, setOrganizationState, setSettingsChanges, setShopRedemptions, setLotteryDraws, setTeacherMode, setSyncStatus, setSelectedChildId },
    snapshot: { apply: applySnapshot },
    authority: { commitLocalChanges, markServerWriteUncertain },
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
