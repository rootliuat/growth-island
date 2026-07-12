import { useEffect, useState, type ReactNode } from "react";
import { ChevronUp, Cloud, CloudOff, Home, LoaderCircle, MoreHorizontal, Sprout, Trophy, Users } from "lucide-react";
import { moduleConfigs, type AppModuleId } from "./modules/moduleConfig";

interface AppShellProps {
  activeModule: AppModuleId;
  childrenCount: number;
  selectedChildName: string;
  selectedChildEnergy: number;
  syncStatus: "connecting" | "online" | "saving" | "offline";
  onModuleChange: (moduleId: AppModuleId) => void;
  onSelfServiceChild: () => void;
  children: ReactNode;
}

const syncMeta = {
  connecting: { label: "连接中", Icon: LoaderCircle },
  online: { label: "已同步", Icon: Cloud },
  saving: { label: "保存中", Icon: LoaderCircle },
  offline: { label: "离线", Icon: CloudOff },
};

const dockModules = moduleConfigs.filter((module) => module.hudGroup === "dock");
const allTeacherToolModules = moduleConfigs.filter((module) => module.hudGroup === "teacher-tools");
const teacherToolModules = allTeacherToolModules;

const sceneRewardMeta: Record<AppModuleId, string> = {
  home: "能量地图",
  "teacher-workbench": "老师补记",
  "child-profile": "小屋成长",
  "voice-record": "贝壳建议",
  "roll-call": "贝签点亮",
  "math-arena": "数学光点",
  lottery: "幸运奖票",
  shop: "兑换票",
  leaderboard: "荣誉能量",
  "data-management": "本机账本",
  organization: "班级任务",
  settings: "本机舵盘",
};

export function AppShell({
  activeModule,
  childrenCount,
  selectedChildName,
  selectedChildEnergy,
  syncStatus,
  onModuleChange,
  onSelfServiceChild,
  children,
}: AppShellProps) {
  const isHome = activeModule === "home";
  const activeModuleConfig = moduleConfigs.find((module) => module.id === activeModule) ?? moduleConfigs[0];
  const SyncIcon = syncMeta[syncStatus].Icon;
  const teacherToolActive = allTeacherToolModules.some((module) => module.id === activeModule);
  const [teacherDrawerOpen, setTeacherDrawerOpen] = useState(false);
  const teacherDrawerClassName = [
    "teacher-tools-drawer",
    isHome ? "teacher-tools-fallback" : "",
    teacherToolActive ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const teacherDrawerLabel = teacherDrawerOpen ? "收起老师工具" : "打开老师工具";

  useEffect(() => {
    if (isHome) {
      setTeacherDrawerOpen(false);
    }
  }, [isHome]);

  const handleTeacherToolChange = (moduleId: AppModuleId) => {
    setTeacherDrawerOpen(false);
    onModuleChange(moduleId);
  };

  return (
    <div className={isHome ? "product-shell game-hud-shell home-screen-shell" : "product-shell game-hud-shell module-screen-shell"}>
      <header className="shell-top-hud" aria-label="成长岛状态">
        <button type="button" className="shell-brand-chip" onClick={() => onModuleChange("home")}>
          <span className="shell-brand-mark">
            <Sprout size={19} />
          </span>
          <strong>成长岛</strong>
        </button>

        <div className="shell-status-strip" aria-label="班级状态">
          <span className="shell-status-chip">
            <Users size={16} />
            {childrenCount} 名幼儿
          </span>
          <span className="shell-status-chip active-child" title={selectedChildName}>{selectedChildName}</span>
          <span className={`shell-status-chip sync ${syncStatus}`}>
            <SyncIcon size={16} />
            {syncMeta[syncStatus].label}
          </span>
        </div>

        <span className="shell-scene-chip">{activeModuleConfig.sceneLabel}</span>
      </header>

      <main className="product-workspace">
        {!isHome && (
          <section className="shell-scene-command-bar" aria-label="当前场景状态">
            <button type="button" className="scene-command-home" onClick={() => onModuleChange("home")}>
              <Home size={17} />
              回岛
            </button>
            <div className="scene-command-title">
              <span>{activeModuleConfig.dockLabel}</span>
              <strong>{activeModuleConfig.sceneLabel}</strong>
            </div>
            <div className="scene-command-status" aria-label="当前孩子与场景奖励">
              <span className="scene-command-chip child">
                {selectedChildName}
                <em>说成长</em>
              </span>
              <span className="scene-command-chip xp">
                <Sprout size={15} />
                {selectedChildEnergy} 能量
              </span>
              <span className="scene-command-chip reward">
                <Trophy size={15} />
                {sceneRewardMeta[activeModule]}
              </span>
            </div>
          </section>
        )}
        <div className="scene-workspace-body">{children}</div>
      </main>

      <footer className="shell-module-dock" aria-label="成长岛快捷入口">
        <button type="button" className="shell-child-chip" onClick={onSelfServiceChild} aria-label={`${selectedChildName} 说成长`}>
          <span>{selectedChildName.slice(0, 1)}</span>
          <strong title={selectedChildName}>{selectedChildName}</strong>
          <em>说成长</em>
        </button>

        <nav className="module-dock-scroll" aria-label="成长岛模块">
          {dockModules.map(({ id, dockLabel, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={activeModule === id ? "module-dock-button active" : "module-dock-button"}
              aria-current={activeModule === id ? "page" : undefined}
              aria-label={label}
              onClick={() => onModuleChange(id)}
            >
              <Icon size={20} />
              <span>{dockLabel}</span>
            </button>
          ))}
        </nav>

        <details
          className={teacherDrawerClassName}
          open={teacherDrawerOpen}
          onToggle={(event) => setTeacherDrawerOpen(event.currentTarget.open)}
        >
          <summary aria-label={teacherDrawerLabel}>
            <MoreHorizontal size={20} />
            <span className="teacher-tools-label">老师</span>
            <span className="teacher-tools-badge" aria-hidden="true">师</span>
            <ChevronUp size={15} />
          </summary>
          <div className="teacher-tools-panel" aria-label="老师工具">
            <div className="teacher-tools-panel-head">
              <strong>老师工具</strong>
              <span>课堂需要时再打开</span>
            </div>
            {teacherToolModules.map(({ id, dockLabel, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={activeModule === id ? "active" : undefined}
                aria-current={activeModule === id ? "page" : undefined}
                onClick={() => handleTeacherToolChange(id)}
              >
                <Icon size={18} />
                <span>{dockLabel}</span>
                <small>{label}</small>
              </button>
            ))}
          </div>
        </details>
      </footer>
    </div>
  );
}
