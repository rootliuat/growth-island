import { ArrowRight, BadgeCheck, Home, ListChecks, Sparkles } from "lucide-react";
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
    <section className="module-page" aria-labelledby={`${module.id}-title`}>
      <div className="module-hero">
        <div className="module-hero-copy">
          <span className="module-eyebrow">
            <Icon size={18} />
            {module.eyebrow}
          </span>
          <h1 id={`${module.id}-title`}>{module.label}</h1>
          <p>{module.description}</p>
          <div className="module-actions">
            <button type="button" className="module-primary-action" onClick={onReturnHome}>
              {module.primaryActionLabel}
              <ArrowRight size={18} />
            </button>
            <button type="button" className="module-secondary-action" onClick={onReturnHome}>
              <Home size={18} />
              {module.secondaryActionLabel}
            </button>
          </div>
        </div>

        <aside className="module-current-child" aria-label="当前成长岛选中幼儿">
          <span>当前伙伴</span>
          <strong>{selectedChild.petName}</strong>
          <p>
            {selectedChild.name} · Lv.{selectedChild.level} · {selectedChild.xp} XP
          </p>
          <em>返回首页后会聚焦到这位孩子的精灵家园</em>
        </aside>
      </div>

      <div className="module-card-grid">
        {module.featureCards.map((card) => (
          <article className="module-feature-card" key={card.title}>
            <span>
              <Sparkles size={17} />
            </span>
            <strong>{card.title}</strong>
            <p>{card.description}</p>
          </article>
        ))}
      </div>

      <div className="module-lower-grid">
        <section className="module-panel">
          <div className="module-panel-title">
            <ListChecks size={19} />
            <strong>后续将支持</strong>
          </div>
          <ul>
            {module.futureItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="module-panel island-link-panel">
          <div className="module-panel-title">
            <BadgeCheck size={19} />
            <strong>成长岛联动</strong>
          </div>
          <p>{module.homeLinkDescription}</p>
          <dl>
            <div>
              <dt>待复核</dt>
              <dd>{pendingReviewCount}</dd>
            </div>
            <div>
              <dt>当前等级</dt>
              <dd>Lv.{selectedChild.level}</dd>
            </div>
            <div>
              <dt>当前排名</dt>
              <dd>#{selectedChild.rank}</dd>
            </div>
          </dl>
          <button type="button" onClick={onReturnHome}>
            聚焦成长岛
          </button>
        </section>
      </div>
    </section>
  );
}
