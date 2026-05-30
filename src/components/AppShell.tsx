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
  offline: "离线模式",
};

const navGroups = [
  { id: "primary", label: "三主屏" },
  { id: "activity", label: "课堂活动" },
  { id: "admin", label: "配置" },
] as const;

export function AppShell({
  activeModule,
  childrenCount,
  selectedChildName,
  syncStatus,
  onModuleChange,
  children,
}: AppShellProps) {
  const isHome = activeModule === "home";

  return (
    <div className={isHome ? "product-shell home-screen-shell" : "product-shell"}>
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
          {navGroups.map((group) => (
            <section className="module-nav-group" key={group.id} aria-label={group.label}>
              <strong>{group.label}</strong>
              {moduleConfigs
                .filter((module) => module.navGroup === group.id)
                .map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={activeModule === id ? "active" : undefined}
                    aria-current={activeModule === id ? "page" : undefined}
                    aria-label={label}
                    onClick={() => onModuleChange(id)}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                  </button>
                ))}
            </section>
          ))}
        </nav>

        <button className="sidebar-collapse-hint" type="button" aria-label="窄屏时收起为图标栏">
          <ChevronLeft size={17} />
          <span>三屏工作台</span>
        </button>
      </aside>

      <main className="product-workspace">{children}</main>
    </div>
  );
}
