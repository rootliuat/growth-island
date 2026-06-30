/**
 * [INPUT]: 依赖 growthFeedback 的视图数据契约。
 * [OUTPUT]: 对外提供 GrowthFeedbackOverlay 组件。
 * [POS]: components/Hud 的全局成长反馈浮层，被 App 置于 shell 末端渲染。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { GrowthFeedback } from "../../domain/growthFeedback";

export function GrowthFeedbackOverlay({ feedback }: { feedback?: GrowthFeedback }) {
  if (!feedback) return null;
  const stageLabel =
    feedback.kind === "focus"
      ? "回岛"
      : feedback.kind === "redeem"
        ? "小铺"
        : feedback.kind === "draw"
          ? "抽取"
          : feedback.kind === "energy"
            ? "能量"
            : feedback.kind === "xp"
              ? "能量"
              : "成长";
  const childInitial = feedback.childName?.slice(0, 1) ?? stageLabel.slice(0, 1);

  return (
    <div
      key={feedback.id}
      className={`growth-feedback-overlay ${feedback.tone}`}
      data-kind={feedback.kind}
      data-delta={feedback.delta ?? ""}
      data-child={feedback.childName ?? ""}
      aria-live="polite"
      role="status"
    >
      {typeof feedback.delta === "number" ? (
        <span className="growth-feedback-float" aria-hidden="true">
          {feedback.delta > 0 ? "能量进精灵" : "老师提醒"}
        </span>
      ) : null}
      <div className="growth-feedback-card">
        <span className="growth-feedback-sigil" aria-hidden="true">{childInitial}</span>
        <div className="growth-feedback-copy">
          <span>{stageLabel}</span>
          <strong>{feedback.title}</strong>
          {feedback.detail ? <em>{feedback.detail}</em> : null}
        </div>
      </div>
    </div>
  );
}
