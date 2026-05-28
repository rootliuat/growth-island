import { useState } from "react";
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
  offline: "离线演示",
};

const placeholderActions = [
  { id: "save", label: "保存设置", Icon: Save, description: "当前为占位，不写入真实配置。" },
  { id: "export", label: "导出配置", Icon: Download, description: "导出入口占位，后续接真实文件。" },
  { id: "permission", label: "权限配置", Icon: Lock, description: "权限模型占位，后续区分老师和展示端。" },
  { id: "rules", label: "规则编辑", Icon: SlidersHorizontal, description: "XP 规则暂只展示，不开放编辑。" },
];

export function SettingsModule({ childrenCount, teacherMode, syncStatus, onToggleTeacherMode, onReturnHome }: SettingsModuleProps) {
  const [lastAction, setLastAction] = useState("设置页当前只展示配置，不会保存到后端。");

  return (
    <section className="module-page settings-page" aria-labelledby="settings-title">
      <div className="settings-header">
        <div>
          <span className="module-eyebrow">
            <Settings size={18} />
            班级配置
          </span>
          <h1 id="settings-title">系统设置</h1>
          <p>展示班级信息、成长规则、老师模式和大屏说明。保存、导出、权限和规则编辑先做产品化占位。</p>
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
              <p>显示加扣分、复核和孩子入住等操作入口。</p>
              <button type="button" onClick={onToggleTeacherMode}>{teacherMode ? "关闭老师模式" : "开启老师模式"}</button>
            </article>
            <article>
              <span>大屏展示</span>
              <strong>说明占位</strong>
              <p>适合白板展示，后续可隐藏管理操作并放大舞台。</p>
              <button type="button" onClick={() => setLastAction("大屏展示模式仍为说明占位。")}>查看说明</button>
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
            {placeholderActions.map(({ id, label, Icon, description }) => (
              <button key={id} type="button" onClick={() => setLastAction(description)}>
                <Icon size={19} />
                <span>{label}</span>
                <em>占位</em>
              </button>
            ))}
          </div>
          <p className="settings-action-note">{lastAction}</p>
        </aside>
      </div>
    </section>
  );
}
