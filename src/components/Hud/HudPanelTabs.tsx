import { Home, ScrollText, Sparkles } from "lucide-react";

export type HudPanel = "spirit" | "growth" | "home";

interface HudPanelTabsProps {
  activePanel: HudPanel;
  pendingReviewCount: number;
  teacherMode: boolean;
  onChange: (panel: HudPanel) => void;
}

const tabs: Array<{ id: HudPanel; label: string; icon: typeof Sparkles }> = [
  { id: "spirit", label: "伙伴", icon: Sparkles },
  { id: "growth", label: "成长", icon: ScrollText },
  { id: "home", label: "入住", icon: Home },
];

export function HudPanelTabs({ activePanel, pendingReviewCount, teacherMode, onChange }: HudPanelTabsProps) {
  return (
    <nav className="hud-panel-tabs" aria-label="右侧 HUD 面板">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const disabled = tab.id === "home" && !teacherMode;
        const count = tab.id === "growth" ? pendingReviewCount : 0;
        return (
          <button
            key={tab.id}
            type="button"
            className={activePanel === tab.id ? "active" : undefined}
            disabled={disabled}
            aria-pressed={activePanel === tab.id}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
            {count > 0 && <em>{count}</em>}
          </button>
        );
      })}
    </nav>
  );
}
