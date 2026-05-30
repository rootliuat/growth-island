import { Database, Download, Eye, Home, Lock, Save, Settings, Shield, SlidersHorizontal } from "lucide-react";
import { levelThresholds } from "../../domain/progression";

interface SettingsModuleProps {
  childrenCount: number;
  teacherMode: boolean;
  syncStatus: "connecting" | "online" | "saving" | "offline";
  onToggleTeacherMode: () => void;
  onReturnHome: () => void;
}

const syncLabels = {
  connecting: "连接中",
  online: "已同步",
  saving: "保存中",
  offline: "离线模式",
};

const placeholderActions = [
  { id: "save", label: "设置保存", Icon: Save, status: "只读" },
  { id: "export", label: "配置导出", Icon: Download, status: "稍后" },
  { id: "permission", label: "权限模型", Icon: Lock, status: "规划中" },
  { id: "rules", label: "规则编辑", Icon: SlidersHorizontal, status: "只读" },
];

export function SettingsModule({ childrenCount, teacherMode, syncStatus, onToggleTeacherMode, onReturnHome }: SettingsModuleProps) {
  return (
    <section className="module-page settings-page" aria-labelledby="settings-title">
      <div className="settings-header">
        <div>
          <span className="module-eyebrow">
            <Settings size={18} />
            班级配置
          </span>
          <h1 id="settings-title">系统设置</h1>
        </div>
        <button type="button" className="settings-home-button" onClick={onReturnHome}>
          <Home size={18} />
          返回成长岛
        </button>
      </div>

      <div className="settings-layout">
        <section className="settings-class-panel">
          <div className="settings-panel-title">
            <Database size={19} />
            <strong>班级信息</strong>
          </div>
          <div className="settings-class-grid">
            <article>
              <span>班级</span>
              <strong>北海幼儿园 · 中一班</strong>
            </article>
            <article>
              <span>幼儿数</span>
              <strong>{childrenCount}</strong>
            </article>
            <article>
              <span>同步状态</span>
              <strong>{syncLabels[syncStatus]}</strong>
            </article>
          </div>
        </section>

        <section className="settings-mode-panel">
          <div className="settings-panel-title">
            <Eye size={19} />
            <strong>显示模式</strong>
          </div>
          <div className="settings-mode-grid">
            <article className={teacherMode ? "active" : undefined}>
              <span>老师模式</span>
              <strong>{teacherMode ? "已开启" : "已关闭"}</strong>
              <button type="button" onClick={onToggleTeacherMode}>{teacherMode ? "关闭老师模式" : "开启老师模式"}</button>
            </article>
            <article>
              <span>大屏展示</span>
              <strong>大屏模式</strong>
              <em>白板</em>
            </article>
          </div>
        </section>

        <section className="settings-rule-panel">
          <div className="settings-panel-title">
            <Shield size={19} />
            <strong>成长规则</strong>
          </div>
          <div className="settings-rule-grid">
            {levelThresholds.map((threshold) => (
              <article key={threshold.level}>
                <span>Lv.{threshold.level}</span>
                <strong>{threshold.minXp} XP</strong>
              </article>
            ))}
          </div>
          <div className="settings-score-rules">
            <span>手动加分：+10 / +20 / +30</span>
            <span>手动扣分：-10 / -20 / -30</span>
            <span>数学 PK 胜者：+30 XP</span>
            <span>AI 记录：老师确认后入账</span>
          </div>
        </section>

        <aside className="settings-action-panel">
          <div className="settings-panel-title">
            <SlidersHorizontal size={19} />
            <strong>管理入口</strong>
          </div>
          <div className="settings-action-list">
            {placeholderActions.map(({ id, label, Icon, status }) => (
              <article key={id}>
                <Icon size={19} />
                <span>{label}</span>
                <em>{status}</em>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
