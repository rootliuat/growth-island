import { Check, Clock3, Mic, Shell, SkipForward, Wrench } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { virtueCategories } from "../../data/spirits";
import {
  canApproveMoralGrowth,
  getChildEnergyColor,
  getChildEnergyLabel,
  getChildEnergyResultText,
  getTeacherHelpText,
} from "../../domain/virtueEnergy";
import type { ChildWithProgress, MoralEvaluationResult, VirtueCategory } from "../../types";

interface TeacherMoralReviewCardProps {
  child?: ChildWithProgress;
  transcript?: string;
  result?: MoralEvaluationResult;
  busy?: boolean;
  onApprove: () => void;
  onAdjust: (category: VirtueCategory, delta: 10 | 20 | 30) => void;
  onDefer: () => void;
  onRespeak: () => void;
  onSkip: () => void;
}

export function TeacherMoralReviewCard({
  child,
  transcript,
  result,
  busy = false,
  onApprove,
  onAdjust,
  onDefer,
  onRespeak,
  onSkip,
}: TeacherMoralReviewCardProps) {
  const initialCategory = useMemo<VirtueCategory>(
    () => (result?.category && virtueCategories.includes(result.category) ? result.category : virtueCategories[0]),
    [result?.category],
  );
  const [selectedCategory, setSelectedCategory] = useState<VirtueCategory>(initialCategory);

  if (!child || !result) return null;

  const canApprove = canApproveMoralGrowth(result);
  const safeCategory = canApprove ? result.category : undefined;
  const accent = canApprove ? getChildEnergyColor(safeCategory) : "#2d9fb2";
  const style = { "--moral-accent": accent } as CSSProperties;
  const energyLabel = getChildEnergyLabel(safeCategory);
  const helpText = getTeacherHelpText(result);
  const transcriptPreview = transcript?.trim() || "未收到文字";
  const actionLocked = busy === true;

  return (
    <aside className="teacher-review-corner-card" style={style} aria-label="老师确认" aria-busy={actionLocked}>
      <span className="teacher-review-status">
        <Shell size={13} />
        {canApprove ? "等老师" : "请老师帮忙"}
      </span>
      <div className="teacher-review-main">
        <strong>{child.name}</strong>
        <span className={canApprove ? "energy-chip" : "energy-chip needs-help"}>
          {canApprove ? getChildEnergyResultText(result) : helpText}
        </span>
      </div>

      <div className="teacher-review-actions" data-mode={canApprove ? "approve" : "adjust"}>
        {canApprove ? (
          <button
            type="button"
            className="approve"
            onClick={onApprove}
            aria-label={`${child.name} 点亮能量`}
            disabled={actionLocked}
          >
            <Check size={18} />
            点亮
          </button>
        ) : null}
        <details className={canApprove ? "review-edit-popover" : "review-edit-popover primary"}>
          <summary
            aria-disabled={actionLocked}
            tabIndex={actionLocked ? -1 : undefined}
            onClick={(event) => {
              if (actionLocked) event.preventDefault();
            }}
          >
            <Wrench size={17} />
            修正
          </summary>
          <div className="review-edit-panel">
            <label>
              <span>能量词</span>
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as VirtueCategory)}>
                {virtueCategories.map((category) => (
                  <option key={category} value={category}>
                    {getChildEnergyLabel(category)} · {category}
                  </option>
                ))}
              </select>
            </label>
            {[10, 20, 30].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => onAdjust(selectedCategory, delta as 10 | 20 | 30)}
                disabled={actionLocked}
              >
                {getChildEnergyLabel(selectedCategory)} +{delta}
              </button>
            ))}
          </div>
        </details>
        <button type="button" className="defer" onClick={onDefer} aria-label={`${child.name} 稍后确认`} disabled={actionLocked}>
          <Clock3 size={17} />
          稍后
        </button>
        <button type="button" className="respeak" onClick={onRespeak} disabled={actionLocked}>
          <Mic size={17} />
          重说
        </button>
        <button type="button" className="skip" onClick={onSkip} disabled={actionLocked}>
          <SkipForward size={17} />
          跳过
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
