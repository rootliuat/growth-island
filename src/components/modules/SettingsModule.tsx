/**
 * [INPUT]: 依赖课堂同步/数据权威状态、教师模式、设置变更记录与导航动作。
 * [OUTPUT]: 对外提供 SettingsModule，展示本机舵盘、数据去向和成长刻度。
 * [POS]: components/modules 的教师设置页，承担数据权威状态的完整文字说明。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { BadgeCheck, ClipboardCheck, Compass, Eye, Home, Save, Shield, ShipWheel, Users, Wifi } from "lucide-react";
import type { ClassroomDataAuthority, SyncStatus } from "../../domain/appState";
import { levelThresholds } from "../../domain/progression";
import type { SettingsChangeRecord } from "../../types";

interface SettingsModuleProps {
  childrenCount: number;
  teacherMode: boolean;
  syncStatus: SyncStatus;
  dataAuthority: ClassroomDataAuthority;
  classroomNotice?: string;
  settingsChanges: SettingsChangeRecord[];
  onToggleTeacherMode: () => void;
  onSaveSettings: () => void;
  onReturnHome: () => void;
}

const syncLabels = {
  connecting: "连接中",
  online: "已同步",
  saving: "保存中",
  offline: "离线模式",
  unavailable: "数据不可用",
};

const syncToneClass = {
  connecting: "connecting",
  online: "online",
  saving: "saving",
  offline: "offline",
  unavailable: "unavailable",
};

function formatSettingTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function getSettingRecordLabel(record: SettingsChangeRecord) {
  if (record.key === "teacher-mode") return "教师掌舵";
  if (record.key === "settings-save") return "保存舵盘";
  return record.label.replaceAll("老师模式", "教师掌舵").replaceAll("保存当前设置", "保存舵盘");
}

function getSettingRecordValue(record: SettingsChangeRecord) {
  const enabled = record.value.includes("已开启") || record.value.includes("掌舵中");
  if (record.key === "teacher-mode") return enabled ? "掌舵中" : "未掌舵";
  if (record.key === "settings-save") return enabled ? "教师掌舵中" : "学生浏览中";
  return record.value.replaceAll("老师模式", "教师掌舵");
}

export function SettingsModule({
  childrenCount,
  teacherMode,
  syncStatus,
  dataAuthority,
  classroomNotice,
  settingsChanges,
  onToggleTeacherMode,
  onSaveSettings,
  onReturnHome,
}: SettingsModuleProps) {
  const latestChange = settingsChanges[0];
  const teacherStateLabel = teacherMode ? "教师掌舵中" : "学生浏览中";
  const latestChangeLabel = latestChange ? getSettingRecordLabel(latestChange) : "等待校准";
  const latestChangeValue = latestChange ? getSettingRecordValue(latestChange) : "暂无舵盘记录";
  const latestChangeTime = latestChange ? formatSettingTime(latestChange.createdAt) : "本机待保存";
  const authorityLabel = dataAuthority === "local" ? "仅存本机" : dataAuthority === "unavailable" ? "数据不可用" : syncLabels[syncStatus];
  const authorityClass = dataAuthority === "local" ? "local-authority" : dataAuthority === "unavailable" ? "unavailable" : syncToneClass[syncStatus];
  const storageLabel = dataAuthority === "server" ? "服务器已存" : dataAuthority === "local" ? "本机已存" : "保存未确认";

  return (
    <section className="module-page settings-page" aria-labelledby="settings-title">
      <div className="settings-header module-compact-header">
        <div>
          <span className="module-eyebrow">
            <ShipWheel size={18} aria-hidden="true" />
            岛务工具
          </span>
          <h1 id="settings-title">设置舵盘</h1>
        </div>
        <button type="button" className="settings-home-button" onClick={onReturnHome}>
          <Home size={18} aria-hidden="true" />
          回岛
        </button>
      </div>

      <div className="settings-layout">
        <section className={teacherMode ? "settings-mode-panel active" : "settings-mode-panel"}>
          <div className="settings-panel-title">
            <ShipWheel size={19} aria-hidden="true" />
            <strong>设置舵盘</strong>
            <span className={teacherMode ? "settings-state-chip active" : "settings-state-chip"}>{teacherStateLabel}</span>
          </div>
          <div className="settings-mode-grid">
            <article className={teacherMode ? "settings-helm-card active" : "settings-helm-card"}>
              <span>教师掌舵</span>
              <strong>{teacherMode ? "掌舵中" : "未掌舵"}</strong>
              <div className="settings-helm-actions">
                <button type="button" aria-pressed={teacherMode} onClick={onToggleTeacherMode}>
                  {teacherMode ? "收起掌舵" : "开启掌舵"}
                </button>
                <button type="button" className="settings-save-button" onClick={onSaveSettings}>
                  <Save size={17} aria-hidden="true" />
                  保存舵盘
                </button>
              </div>
              <em aria-live="polite">{latestChange ? `${latestChangeLabel} · ${latestChangeTime}` : "本机待保存"}</em>
            </article>
            <article className="settings-whiteboard-card">
              <Eye size={18} aria-hidden="true" />
              <span>白板航线</span>
              <strong>白板可用</strong>
              <em>大屏视角</em>
            </article>
          </div>
        </section>

        <section className="settings-class-panel">
          <div className="settings-panel-title">
            <Compass size={19} aria-hidden="true" />
            <strong>当前岛屿</strong>
          </div>
          <div className="settings-class-grid">
            <article>
              <span>课堂岛屿</span>
              <strong>北海幼儿园 · 中一班</strong>
            </article>
            <article>
              <Users size={17} aria-hidden="true" />
              <span>岛上伙伴</span>
              <strong>{childrenCount} 位幼儿</strong>
            </article>
            <article className={`settings-sync-chip ${authorityClass}`}>
              <Wifi size={17} aria-hidden="true" />
              <span>数据保存</span>
              <strong>{authorityLabel}</strong>
              {teacherMode && classroomNotice ? <small>{classroomNotice}</small> : null}
            </article>
          </div>
        </section>

        <section className="settings-rule-panel">
          <div className="settings-panel-title">
            <Shield size={19} aria-hidden="true" />
            <strong>成长刻度</strong>
          </div>
          <div className="settings-rule-grid">
            {levelThresholds.map((threshold) => (
              <article key={threshold.level}>
                <span>Lv.{threshold.level}</span>
                <strong>{threshold.minXp} 能量</strong>
              </article>
            ))}
          </div>
          <div className="settings-score-rules">
            <span>手动加分：+10 / +20 / +30</span>
            <span>手动扣分：-10 / -20 / -30</span>
            <span>算术点亮完成：+30 能量</span>
            <span>语音记录：确认后入账</span>
          </div>
        </section>

        <aside className="settings-action-panel">
          <div className="settings-panel-title">
            <ClipboardCheck size={19} aria-hidden="true" />
            <strong>舵盘记录</strong>
          </div>
          <div className="settings-save-card" role="status" aria-live="polite">
            <BadgeCheck size={22} aria-hidden="true" />
            <strong>{latestChangeValue}</strong>
            <span>{latestChange ? `${latestChangeLabel} · ${latestChangeTime}` : "本机待保存"}</span>
          </div>
          <div className="settings-action-list" aria-label="最近设置记录">
            {settingsChanges.length === 0 ? (
              <p className="settings-empty">暂无舵盘记录</p>
            ) : (
              settingsChanges.slice(0, 6).map((item) => (
                <article key={item.id}>
                  <ClipboardCheck size={19} aria-hidden="true" />
                  <span>{getSettingRecordLabel(item)}</span>
                  <em>{getSettingRecordValue(item)}</em>
                </article>
              ))
            )}
          </div>
          <div className="settings-privacy-note">
            <Shield size={18} aria-hidden="true" />
            <span>{storageLabel}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
