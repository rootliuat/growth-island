/**
 * [INPUT]: 依赖 React 的 useMemo/useState、德育能量领域规则、精灵能量分类，以及老师复核动作回调。
 * [OUTPUT]: 对外提供 TeacherMoralReviewCard 组件，展示孩子转写证据并派发确认、修正、稍后、重说和跳过动作。
 * [POS]: components/Hud 的老师说成长复核卡，被首页地图与孩子小屋共同复用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

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
  const transcriptText = transcript?.trim() || "未识别到文字，请孩子重说";
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

      <details className="review-transcript">
        <summary>
          <span className="review-transcript-label">孩子说</span>
          <span className="teacher-review-transcript-preview">{transcriptText}</span>
          <span className="review-transcript-toggle" aria-hidden="true">
            <span className="when-collapsed">全文</span>
            <span className="when-expanded">收起</span>
          </span>
        </summary>
        <p className="teacher-review-transcript-line">{transcriptText}</p>
        <div className="review-confidence">
          <span>识别置信度</span>
          <em>{Math.round(result.confidence * 100)}%</em>
        </div>
      </details>

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
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as VirtueCategory)}
                disabled={actionLocked}
              >
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
    </aside>
  );
}
