import { Check, Clock3, Edit3 } from "lucide-react";
import type { CSSProperties } from "react";
import {
  canApproveMoralGrowth,
  formatSignedXp,
  getChildEnergyColor,
  getChildEnergyLabel,
  getChildEnergyResultText,
  getTeacherHelpText,
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

  const canApprove = canApproveMoralGrowth(result);
  const safeCategory = canApprove ? result.category : undefined;
  const accent = canApprove ? getChildEnergyColor(safeCategory) : "#2d9fb2";
  const style = { "--moral-accent": accent } as CSSProperties;
  const energyLabel = getChildEnergyLabel(safeCategory);
  const helpText = getTeacherHelpText(result);
  const adjustmentLabel = canApprove ? energyLabel : "成长";
  const safeAdjustmentLabels: Record<10 | 20 | 30, string> = {
    10: "轻点亮",
    20: "点亮",
    30: "多点亮",
  };

  return (
    <aside className="teacher-review-corner-card" style={style} aria-label="老师确认">
      <span className="teacher-review-status">待老师看</span>
      <div className="teacher-review-main">
        <span className={canApprove ? "energy-chip" : "energy-chip needs-help"}>
          {canApprove ? getChildEnergyResultText(result) : helpText}
        </span>
        <strong>{child.name}</strong>
      </div>

      <div className="teacher-review-actions">
        <button
          type="button"
          className="approve"
          disabled={!canApprove}
          onClick={onApprove}
          aria-label={canApprove ? "通过" : "请先改成成长记录或稍后处理"}
        >
          <Check size={18} />
          {canApprove ? "通过" : "先改"}
        </button>
        <details className="review-edit-popover">
          <summary>
            <Edit3 size={17} />
            改
          </summary>
          <div>
            {[10, 20, 30].map((delta) => (
              <button key={delta} type="button" onClick={() => onAdjust(delta as 10 | 20 | 30)}>
                {canApprove ? `${adjustmentLabel} ${formatSignedXp(delta)}` : safeAdjustmentLabels[delta as 10 | 20 | 30]}
              </button>
            ))}
          </div>
        </details>
        <button type="button" className="defer" onClick={onDefer}>
          <Clock3 size={17} />
          稍后
        </button>
      </div>

      {canApprove ? (
        <details className="review-transcript">
          <summary>听到的话</summary>
          <p>{transcript || "未收到文本"}</p>
          <span>{Math.round(result.confidence * 100)}%</span>
        </details>
      ) : null}
    </aside>
  );
}
