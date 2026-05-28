import type { ReactNode } from "react";
import { ChevronLeft, Sprout } from "lucide-react";
import { moduleConfigs, type AppModuleId } from "./modules/moduleConfig";

interface AppShellProps {
  activeModule: AppModuleId;
  childrenCount: number;
  selectedChildName: string;
  syncStatus: "connecting" | "online" | "saving" | "offline";
  onModuleChange: (moduleId: AppModuleId) => void;
  children: ReactNode;
}

const syncLabels = {
  connecting: "连接中",
  online: "已同步",
  saving: "保存中",
  offline: "离线演示",
};

export function AppShell({
  activeModule,
  childrenCount,
  selectedChildName,
  syncStatus,
  onModuleChange,
  children,
}: AppShellProps) {
  return (
    <div className="product-shell">
      <aside className="product-sidebar" aria-label="成长岛系统导航">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <Sprout size={25} />
          </div>
          <div>
            <strong>成长小精灵</strong>
            <span>Classroom Elf</span>
          </div>
        </div>

        <div className="classroom-card">
          <span>当前班级</span>
          <strong>北海幼儿园 · 中一班</strong>
          <p>
            {childrenCount} 名幼儿 · 当前 {selectedChildName}
          </p>
          <em className={`sidebar-sync ${syncStatus}`}>{syncLabels[syncStatus]}</em>
        </div>

        <nav className="module-nav" aria-label="成长岛模块">
          {moduleConfigs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={activeModule === id ? "active" : undefined}
              aria-current={activeModule === id ? "page" : undefined}
              onClick={() => onModuleChange(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className="sidebar-collapse-hint" type="button" aria-label="窄屏时收起为图标栏">
          <ChevronLeft size={17} />
          <span>大屏工作台</span>
        </button>
      </aside>

      <main className="product-workspace">{children}</main>
    </div>
  );
}
