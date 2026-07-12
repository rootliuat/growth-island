import { Home, MapPinned, Sparkles } from "lucide-react";
import type { ChildWithProgress } from "../../types";
import type { ModuleConfig } from "./moduleConfig";

interface ModulePlaceholderProps {
  module: ModuleConfig;
  selectedChild: ChildWithProgress;
  pendingReviewCount: number;
  onReturnHome: () => void;
}

export function ModulePlaceholder({ module, selectedChild, pendingReviewCount, onReturnHome }: ModulePlaceholderProps) {
  const Icon = module.Icon;

  return (
    <section className="module-page scene-placeholder-page" aria-labelledby={`${module.id}-title`}>
      <header className="scene-header">
        <div>
          <span className="module-eyebrow">
            <Icon size={18} />
            {module.sceneLabel}
          </span>
          <h1 id={`${module.id}-title`}>{module.label}</h1>
        </div>
        <button type="button" className="scene-home-button" onClick={onReturnHome}>
          <Home size={18} />
          回岛
        </button>
      </header>

      <section className="scene-empty-stage" aria-label={`${module.sceneLabel}状态`}>
        <div className="scene-compass">
          <Sparkles size={38} />
        </div>
        <strong>{module.sceneLabel}</strong>
        <div className="scene-chip-row">
          <span>
            <MapPinned size={15} />
            {selectedChild.name}
          </span>
          <span>精灵能量</span>
          <span>能量槽</span>
          <span>{pendingReviewCount} 待老师看</span>
        </div>
        <button type="button" onClick={onReturnHome}>
          看精灵
        </button>
      </section>
    </section>
  );
}
