/**
 * [INPUT]: 依赖成长账本分析规则、德育复核规则、精灵资产和课堂备份动作。
 * [OUTPUT]: 对外提供 DataManagementModule 记录港组件。
 * [POS]: components/modules 的课堂数据工作台，保证筛选后的流水、复核与统计口径一致。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, BarChart3, CalendarDays, Check, ClipboardList, Download, Home, Search, ShieldCheck, Sparkles, Trash2, Upload, X } from "lucide-react";
import {
  filterLedgerRecordsByCategory,
  filterLedgerRecordsByTimeScope,
  ledgerTimeScopeLabels,
  summarizeLedgerAnalytics,
  type LedgerCategoryFilter,
  type LedgerTimeScope,
} from "../../domain/ledgerAnalytics";
import { getSpiritAsset } from "../../domain/spiritAssets";
import { canApproveMoralGrowth, getTeacherHelpText } from "../../domain/virtueEnergy";
import type {
  ChildWithProgress,
  ClassroomBackupImportPreview,
  ClassroomBackupSnapshot,
  ClassroomBackupSummary,
  ClassroomDataClearSummary,
  LedgerRecord,
  MoralReviewItem,
  SpiritDefinition,
} from "../../types";

interface DataManagementModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  recentRecords: LedgerRecord[];
  pendingReviews: MoralReviewItem[];
  onFocusChild: (childId: string) => void;
  onApproveReview: (reviewId: string) => void;
  onRejectReview: (reviewId: string) => void;
  onExportBackup: () => ClassroomBackupSummary;
  onPreviewImportBackup: (file: File) => Promise<ClassroomBackupImportPreview>;
  onConfirmImportBackup: (backup: ClassroomBackupSnapshot) => ClassroomBackupSummary;
  onClearDemoData: () => ClassroomDataClearSummary;
}

const sourceLabels: Record<LedgerRecord["source"], string> = {
  manual: "手动",
  "dialogue-agent": "贝壳记录",
  "math-pk": "算术点亮",
  undo: "撤销",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function formatRecordReason(reason: string) {
  return reason.replace(/^演示数据：已有成长 XP$/, "成长记录").replace(/^已有成长 XP$/, "成长记录");
}

function formatHarborSpiritName(petName: string) {
  return petName.replace(/的小伙伴$/, "精灵");
}

function formatBackupTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function describeBackupSummary(summary: ClassroomBackupSummary) {
  return `${summary.childCount} 名幼儿 · ${summary.ledgerCount} 条流水 · ${summary.reviewCount} 条待看记录 · ${summary.activeCurriculumCount} 条任务航线 · ${summary.parentReportReviewCount} 条本机状态 · ${formatBackupTime(summary.exportedAt)}`;
}

function describeClearSummary(summary: ClassroomDataClearSummary) {
  return `${summary.childCount} 名幼儿保留 · 清空 ${summary.clearedLedgerCount} 条流水、${summary.clearedReviewCount} 条待看记录、${summary.clearedActiveCurriculumCount} 条任务航线、${summary.clearedParentReportReviewCount} 条本机状态`;
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatXpDelta(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

const clearDemoConfirmPhrase = "清空演示数据";

export function DataManagementModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  recentRecords,
  pendingReviews,
  onFocusChild,
  onApproveReview,
  onRejectReview,
  onExportBackup,
  onPreviewImportBackup,
  onConfirmImportBackup,
  onClearDemoData,
}: DataManagementModuleProps) {
  const [query, setQuery] = useState("");
  const [timeScope, setTimeScope] = useState<LedgerTimeScope>("week");
  const [categoryFilter, setCategoryFilter] = useState<LedgerCategoryFilter>("all");
  const [pendingImport, setPendingImport] = useState<ClassroomBackupImportPreview | null>(null);
  const [clearPhrase, setClearPhrase] = useState("");
  const [backupNotice, setBackupNotice] = useState("");
  const [backupError, setBackupError] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const childById = useMemo(() => new Map(childrenWithProgress.map((child) => [child.id, child])), [childrenWithProgress]);
  const normalizedQuery = normalize(query);
  const scopedRecords = useMemo(() => filterLedgerRecordsByTimeScope(recentRecords, timeScope), [recentRecords, timeScope]);
  const categoryRecords = useMemo(() => filterLedgerRecordsByCategory(scopedRecords, categoryFilter), [categoryFilter, scopedRecords]);
  const analytics = useMemo(() => summarizeLedgerAnalytics(categoryRecords, timeScope), [categoryRecords, timeScope]);
  const filteredChildren = childrenWithProgress
    .filter((child) => {
      if (!normalizedQuery) return true;
      return `${child.name} ${child.petName} ${child.xp} ${child.level}`.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => a.rank - b.rank);
  const filteredRecords = categoryRecords.filter((record) => {
    if (!normalizedQuery) return true;
    const child = childById.get(record.childId);
    return `${child?.name ?? ""} ${child?.petName ?? ""} ${record.reason} ${record.category ?? ""} ${sourceLabels[record.source]}`.toLowerCase().includes(normalizedQuery);
  });
  const filteredReviews = pendingReviews.filter((review) => {
    if (categoryFilter !== "all" && review.result.category !== categoryFilter) return false;
    if (!normalizedQuery) return true;
    const child = childById.get(review.childId);
    return `${child?.name ?? ""} ${child?.petName ?? ""} ${review.transcript} ${review.result.category ?? ""}`.toLowerCase().includes(normalizedQuery);
  });
  const activeCategoryLabel = categoryFilter === "all" ? "全部维度" : categoryFilter;
  const visibleCategoryStats = categoryFilter === "all"
    ? analytics.categoryStats.slice(0, 3)
    : analytics.categoryStats.filter((stat) => stat.category === categoryFilter);
  const harborRecords = filteredRecords.slice(0, 8);
  const rosterPreview = filteredChildren.slice(0, 6);
  const topChild = childrenWithProgress.reduce<ChildWithProgress | undefined>((currentTop, child) => {
    if (!currentTop || child.rank < currentTop.rank) return child;
    return currentTop;
  }, undefined);
  const backupStateLabel = backupError ? "保险箱异常" : backupNotice ? "刚刚更新" : "本机安全";

  const runExport = () => {
    try {
      const summary = onExportBackup();
      setBackupError("");
      setBackupNotice(`已导出备份：${describeBackupSummary(summary)}`);
    } catch (error) {
      setBackupNotice("");
      setBackupError(error instanceof Error ? error.message : "导出备份失败");
    }
  };

  const runImport = async (file: File) => {
    try {
      const preview = await onPreviewImportBackup(file);
      setPendingImport(preview);
      setBackupError("");
      setBackupNotice("备份已读取，确认后才会覆盖当前本机数据。");
    } catch (error) {
      setPendingImport(null);
      setBackupNotice("");
      setBackupError(error instanceof Error ? error.message : "导入备份失败");
    }
  };

  const confirmPendingImport = () => {
    if (!pendingImport) return;
    try {
      const summary = onConfirmImportBackup(pendingImport.snapshot);
      setPendingImport(null);
      setQuery("");
      setBackupError("");
      setBackupNotice(`已恢复备份：${describeBackupSummary(summary)}`);
    } catch (error) {
      setBackupNotice("");
      setBackupError(error instanceof Error ? error.message : "恢复备份失败");
    }
  };

  const clearDemoData = () => {
    if (clearPhrase.trim() !== clearDemoConfirmPhrase) return;
    const summary = onClearDemoData();
    setPendingImport(null);
    setQuery("");
    setClearPhrase("");
    setBackupError("");
    setBackupNotice(`已清空演示数据：${describeClearSummary(summary)}`);
  };

  return (
    <section className="module-page data-page data-harbor-page" aria-labelledby="data-title">
      <div className="data-header data-harbor-header module-compact-header">
        <div>
          <span className="module-eyebrow">
            <ClipboardList size={18} />
            老师港口
          </span>
          <h1 id="data-title">记录港</h1>
          <div className="data-harbor-title-chips" aria-label="本机账本概览">
            <span>本机账本</span>
            <span>{pendingReviews.length} 待老师看</span>
            <span>{recentRecords.length} 流水</span>
          </div>
        </div>
        <button type="button" className="data-home-button" onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} />
          看精灵
        </button>
      </div>

      <section className="data-harbor-dock" aria-label="记录港状态">
        <article>
          <span>待靠岸</span>
          <strong>{filteredReviews.length}</strong>
        </article>
        <article>
          <span>{ledgerTimeScopeLabels[timeScope]} 能量</span>
          <strong>{formatXpDelta(analytics.xpDelta)}</strong>
        </article>
        <article>
          <span>班级船员</span>
          <strong>{childrenWithProgress.length}</strong>
        </article>
        <article>
          <span>保险箱</span>
          <strong>{backupStateLabel}</strong>
        </article>
      </section>

      <div className="data-layout data-harbor-grid">
        <aside className="data-review-panel data-priority-panel" aria-label="待老师看">
          <div className="data-panel-title">
            <Sparkles size={19} />
            <strong>待老师看</strong>
            <span>{filteredReviews.length} 条</span>
          </div>
          <div className="data-review-list">
            {filteredReviews.length === 0 ? (
              <p className="data-empty">当前没有匹配的待老师看记录。</p>
            ) : (
              filteredReviews.map((review) => {
                const child = childById.get(review.childId);
                const canRecord = canApproveMoralGrowth(review.result);
                return (
                  <article key={review.id}>
                    <div>
                      <strong>{child?.name ?? "未知孩子"}</strong>
                      <span>{canRecord ? `${review.result.xpDelta} 能量` : getTeacherHelpText(review.result)}</span>
                    </div>
                    <p>{review.transcript}</p>
                    <em>{review.result.category ?? "待判断"} · {Math.round(review.result.confidence * 100)}%</em>
                    <div className="data-review-actions">
                      <button type="button" disabled={!canRecord} onClick={() => onApproveReview(review.id)}>
                        <Check size={16} />
                        {canRecord ? "记入" : "先处理"}
                      </button>
                      <button type="button" onClick={() => onRejectReview(review.id)}>
                        <X size={16} />
                        不采用
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>

        <section className="data-record-panel data-ledger-panel" aria-label="最近入港记录">
          <div className="data-panel-title">
            <ClipboardList size={19} />
            <strong>最近入港记录</strong>
            <span>{ledgerTimeScopeLabels[timeScope]}</span>
          </div>
          <div className="data-record-list">
            {filteredRecords.length === 0 ? (
              <p className="data-empty">没有匹配的成长流水。</p>
            ) : (
              harborRecords.map((record) => {
                const child = childById.get(record.childId);
                return (
                  <article key={record.id} className={record.delta < 0 ? "negative" : undefined}>
                    <span>{record.delta > 0 ? `+${record.delta}` : record.delta}</span>
                    <div>
                      <strong>{child?.name ?? "未知孩子"}</strong>
                      <p>{formatRecordReason(record.reason)}</p>
                      <em>
                        {sourceLabels[record.source]} · {record.category ?? "无维度"} · {formatShortTime(record.createdAt)}
                      </em>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="data-status-rail" aria-label="记录港侧栏">
          <section className="data-insight-panel data-overview-panel" aria-label="账本潮汐">
            <div className="data-panel-title">
              <CalendarDays size={18} />
              <strong>账本潮汐</strong>
              <span>{activeCategoryLabel}</span>
            </div>
            <div className="data-insight-metrics" aria-label="范围统计">
              <article>
                <span>{ledgerTimeScopeLabels[timeScope]} 能量</span>
                <strong>{formatXpDelta(analytics.xpDelta)}</strong>
              </article>
              <article>
                <span>活跃孩子</span>
                <strong>{analytics.childCount}</strong>
              </article>
              <article>
                <span>有效记录</span>
                <strong>{analytics.activeRecordCount}</strong>
              </article>
            </div>
            <div className="data-chip-row data-category-summary" aria-label="维度摘要">
              <span>{activeCategoryLabel}</span>
              {visibleCategoryStats.map((stat) => (
                <span key={stat.category}>{stat.category} {stat.recordCount === 0 ? "0" : formatXpDelta(stat.xpDelta)}</span>
              ))}
            </div>
          </section>

          <section className="data-status-card data-roster-card" aria-label="班级船员状态">
            <div className="data-status-card-title">
              <Sparkles size={18} />
              <strong>班级船员</strong>
              <span>{filteredChildren.length}/{childrenWithProgress.length}</span>
            </div>
            <div className="data-roster-preview" aria-label="船员预览">
              {rosterPreview.map((child) => {
                const spirit = spiritsById.get(child.spiritId);
                const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;
                return (
                  <button key={child.id} type="button" className={child.id === selectedChild.id ? "active" : undefined} onClick={() => onFocusChild(child.id)} aria-label={`查看 ${child.name}`}>
                    {asset?.url ? <img src={asset.url} alt="" width={44} height={44} /> : child.name.slice(0, 1)}
                  </button>
                );
              })}
            </div>
            <div className="data-roster-current">
              <span>当前停靠</span>
              <strong>{selectedChild.name}</strong>
              <em>
                {formatHarborSpiritName(selectedChild.petName)} · Lv.{selectedChild.level} · #{selectedChild.rank}
              </em>
            </div>
            {topChild && (
              <div className="data-roster-current">
                <span>领航船员</span>
                <strong>{topChild.name}</strong>
                <em>{topChild.xp} 能量 · #{topChild.rank}</em>
              </div>
            )}
          </section>

          <section className="data-status-card data-backup-status-card" aria-label="港口保险箱状态">
            <div className="data-status-card-title">
              <ShieldCheck size={18} />
              <strong>港口保险箱</strong>
              <span>{backupStateLabel}</span>
            </div>
            <div className="data-backup-metrics" aria-label="当前数据量">
              <span>{childrenWithProgress.length} 名幼儿</span>
              <span>{recentRecords.length} 条流水</span>
              <span>{pendingReviews.length} 条待老师看</span>
            </div>
            {(backupNotice || backupError) && (
              <p className={backupError ? "data-backup-error" : "data-backup-notice"} aria-live="polite">
                {backupError || backupNotice}
              </p>
            )}
          </section>
        </aside>
      </div>

      <details className="data-tools-drawer" aria-label="记录港工具抽屉">
        <summary>
          <span>
            <ShieldCheck size={18} />
            账本工具
          </span>
          <em>筛选 / 名单 / 备份</em>
        </summary>
        <div className="data-drawer-panel">
          <section className="data-toolbar data-drawer-search" aria-label="账本搜索">
            <label htmlFor="data-search">
              <Search size={19} />
              <input
                id="data-search"
                name="dataSearch"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索孩子、精灵、成长记录"
                aria-label="搜索孩子、精灵、成长记录"
              />
            </label>
            <div>
              <span>{filteredChildren.length} 名孩子</span>
              <span>{filteredRecords.length} 条流水</span>
              <span>{filteredReviews.length} 条待老师看</span>
              <span>{activeCategoryLabel}</span>
            </div>
          </section>

          <section className="data-drawer-card data-drawer-filter" aria-label="账本筛选">
            <div className="data-panel-title">
              <CalendarDays size={18} />
              <strong>账本筛选</strong>
              <span>{ledgerTimeScopeLabels[timeScope]}</span>
            </div>
            <div className="data-insight-controls">
              <span>
                <CalendarDays size={18} />
                记录范围
              </span>
              <div className="data-scope-tabs" role="group" aria-label="成长流水时间范围">
                {(["week", "month", "all"] as LedgerTimeScope[]).map((scope) => (
                  <button key={scope} type="button" className={scope === timeScope ? "active" : undefined} aria-pressed={scope === timeScope} onClick={() => setTimeScope(scope)}>
                    {ledgerTimeScopeLabels[scope]}
                  </button>
                ))}
              </div>
            </div>
            <div className="data-category-strip" aria-label="德育维度统计">
              <button type="button" className={categoryFilter === "all" ? "active" : undefined} aria-pressed={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>
                <BarChart3 size={16} />
                全部维度
                <em>{analytics.activeRecordCount}</em>
              </button>
              {analytics.categoryStats.map((stat) => (
                <button
                  key={stat.category}
                  type="button"
                  className={`${categoryFilter === stat.category ? "active" : ""} ${stat.recordCount === 0 ? "empty" : ""}`}
                  aria-pressed={categoryFilter === stat.category}
                  onClick={() => setCategoryFilter(stat.category)}
                >
                  {stat.category}
                  <em>{stat.recordCount === 0 ? "0" : formatXpDelta(stat.xpDelta)}</em>
                </button>
              ))}
            </div>
          </section>

          <section className="data-child-panel data-drawer-roster" aria-label="班级船员名单">
            <div className="data-panel-title">
              <Sparkles size={19} />
              <strong>班级船员名单</strong>
            </div>
            <div className="data-child-list">
              {filteredChildren.map((child) => {
                const spirit = spiritsById.get(child.spiritId);
                const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;
                return (
                  <button key={child.id} type="button" className={child.id === selectedChild.id ? "active" : undefined} onClick={() => onFocusChild(child.id)}>
                    <span className="data-child-avatar">
                      {asset?.url ? <img src={asset.url} alt={`${child.name} 精灵`} width={54} height={54} /> : child.name.slice(0, 1)}
                    </span>
                    <span className="data-child-copy">
                      <strong>{child.name}</strong>
                      <em>
                        Lv.{child.level} · #{child.rank}
                      </em>
                    </span>
                    <span className="data-child-rank">#{child.rank}</span>
                    <span className="data-child-xp">{child.xp} 能量</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="data-backup-panel data-drawer-backup" aria-label="港口保险箱">
            <div className="data-backup-copy">
              <span>
                <ShieldCheck size={18} />
                港口保险箱
              </span>
              <strong>导出 / 恢复核心课堂数据</strong>
              <div className="data-backup-scope" aria-label="备份范围">
                <span>小屋</span>
                <span>流水</span>
                <span>确认</span>
                <span>奖励</span>
                <span>园所</span>
              </div>
            </div>
            <div className="data-backup-metrics" aria-label="当前数据量">
              <span>{childrenWithProgress.length} 名幼儿</span>
              <span>{recentRecords.length} 条流水</span>
              <span>{pendingReviews.length} 条待老师看</span>
            </div>
            <div className="data-backup-actions">
              <button type="button" onClick={runExport}>
                <Download size={17} />
                导出备份
              </button>
              <button type="button" onClick={() => importInputRef.current?.click()}>
                <Upload size={17} />
                导入恢复
              </button>
              <input
                ref={importInputRef}
                className="data-import-input"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void runImport(file);
                }}
              />
            </div>
            {pendingImport && (
              <div className="data-restore-review" role="status" aria-label="恢复预览">
                <div>
                  <span>
                    <AlertTriangle size={17} />
                    恢复前确认
                  </span>
                  <strong>导入会覆盖当前本机记录</strong>
                  <p>
                    当前 {pendingImport.comparison.current.ledgerCount} 条流水 / {pendingImport.comparison.current.reviewCount} 条待看；
                    备份 {pendingImport.comparison.incoming.ledgerCount} 条流水 / {pendingImport.comparison.incoming.reviewCount} 条待看。
                  </p>
                </div>
                <div className="data-restore-deltas" aria-label="导入差异">
                  <span>幼儿 {formatDelta(pendingImport.comparison.childDelta)}</span>
                  <span>流水 {formatDelta(pendingImport.comparison.ledgerDelta)}</span>
                  <span>待看 {formatDelta(pendingImport.comparison.reviewDelta)}</span>
                  <span>设置 {formatDelta(pendingImport.comparison.settingsChangeDelta)}</span>
                </div>
                <div className="data-restore-actions">
                  <button type="button" onClick={confirmPendingImport}>
                    <Check size={16} />
                    确认恢复
                  </button>
                  <button type="button" onClick={() => setPendingImport(null)}>
                    <X size={16} />
                    取消
                  </button>
                </div>
              </div>
            )}
            <div className="data-governance-row">
              <article className="data-privacy-note">
                <span>
                  <ShieldCheck size={17} />
                  数据隐私
                </span>
                <p>课堂数据保存在当前设备浏览器；换电脑前请先导出备份，恢复前会显示覆盖差异。</p>
              </article>
              <article className="data-clear-card">
                <span>
                  <Trash2 size={17} />
                  清空演示数据
                </span>
                <p>仅清空本机成长流水、待看记录、抽奖、商店、设置和任务航线记录，保留幼儿小屋资料。</p>
                <div>
                  <input
                    className="data-clear-input"
                    value={clearPhrase}
                    onChange={(event) => setClearPhrase(event.target.value)}
                    placeholder={`输入“${clearDemoConfirmPhrase}”`}
                    aria-label="清空演示数据确认语"
                  />
                  <button type="button" disabled={clearPhrase.trim() !== clearDemoConfirmPhrase} onClick={clearDemoData}>
                    确认清空
                  </button>
                </div>
              </article>
            </div>
            {(backupNotice || backupError) && (
              <p className={backupError ? "data-backup-error" : "data-backup-notice"}>
                {backupError || backupNotice}
              </p>
            )}
          </section>
        </div>
      </details>
    </section>
  );
}
