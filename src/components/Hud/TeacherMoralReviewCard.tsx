import { Check, Clock3, Edit3 } from "lucide-react";
import type { CSSProperties } from "react";
import {
  formatSignedXp,
  getChildEnergyColor,
  getChildEnergyLabel,
  getChildEnergyResultText,
} from "../../domain/virtueEnergy";
import type { ChildWithProgress, MoralEvaluationResult } from "../../types";

interface TeacherMoralReviewCardProps {
  child?: ChildWithProgress;
  transcript?: string;
  result?: MoralEvaluationResult;
  onApprove: () => void;
  onAdjust: (delta: 10 | 20 | 30) => void;
  onDefer: () => void;
}

export function TeacherMoralReviewCard({
  child,
  transcript,
  result,
  onApprove,
  onAdjust,
  onDefer,
}: TeacherMoralReviewCardProps) {
  if (!child || !result) return null;

  const accent = getChildEnergyColor(result.category);
  const style = { "--moral-accent": accent } as CSSProperties;
  const energyLabel = getChildEnergyLabel(result.category);
  const canApprove = result.intent === "reward" && result.xpDelta > 0 && result.confidence >= 0.6;

  return (
    <aside className="teacher-review-corner-card" style={style} aria-label="老师确认">
      <div className="teacher-review-main">
        <span className="energy-chip">{getChildEnergyResultText(result)}</span>
        <strong>{child.name}</strong>
      </div>

      <div className="teacher-review-actions">
        <button
          type="button"
          className="approve"
          disabled={!canApprove}
          onClick={onApprove}
          aria-label={canApprove ? "通过" : "需要修改或稍后复核"}
        >
          <Check size={18} />
          通过
        </button>
        <details className="review-edit-popover">
          <summary>
            <Edit3 size={17} />
            改
          </summary>
          <div>
            {[10, 20, 30].map((delta) => (
              <button key={delta} type="button" onClick={() => onAdjust(delta as 10 | 20 | 30)}>
                {energyLabel} {formatSignedXp(delta)}
              </button>
            ))}
          </div>
        </details>
        <button type="button" className="defer" onClick={onDefer}>
          <Clock3 size={17} />
          稍后
        </button>
      </div>

      <details className="review-transcript">
        <summary>详情</summary>
        <p>{transcript || "未收到文本"}</p>
        <span>{Math.round(result.confidence * 100)}%</span>
      </details>
    </aside>
  );
}
