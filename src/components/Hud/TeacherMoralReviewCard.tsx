import { Check, Clock3, Edit3, Shell } from "lucide-react";
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
  const transcriptPreview = transcript?.trim() || "未收到文字";

  return (
    <aside className="teacher-review-corner-card" style={style} aria-label="老师确认">
      <span className="teacher-review-status">
        <Shell size={13} />
        老师确认
      </span>
      <div className="teacher-review-main">
        <span className={canApprove ? "energy-chip" : "energy-chip needs-help"}>
          {canApprove ? getChildEnergyResultText(result) : helpText}
        </span>
        <strong>{child.name}</strong>
      </div>

      <div className="teacher-review-actions" data-mode={canApprove ? "approve" : "adjust"}>
        {canApprove ? (
          <button
            type="button"
            className="approve"
            onClick={onApprove}
            aria-label={`${child.name} 确认点亮`}
          >
            <Check size={18} />
            确认点亮
          </button>
        ) : null}
        <details className={canApprove ? "review-edit-popover" : "review-edit-popover primary"}>
          <summary>
            <Edit3 size={17} />
            改能量
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
          稍后处理
        </button>
      </div>

      <details className="review-transcript">
        <summary>记录</summary>
        <p className="teacher-review-transcript-line">
          <span>听到</span>
          {transcriptPreview}
        </p>
        {canApprove ? (
          <div className="review-confidence">
            <span>确认后能量进精灵</span>
            <em>{Math.round(result.confidence * 100)}%</em>
          </div>
        ) : null}
      </details>
    </aside>
  );
}
