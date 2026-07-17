/**
 * [INPUT]: 依赖 React 的焦点/表单 hooks、德育能量领域规则、精灵能量分类，以及老师复核与原话修订回调。
 * [OUTPUT]: 对外提供 TeacherMoralReviewCard 组件，按孩子状态、原话、能量建议、操作顺序派发复核动作。
 * [POS]: components/Hud 的老师说成长复核卡，被首页右轨与孩子小屋共同复用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Check, Clock3, Mic, Shell, SkipForward, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  manualTakeover?: boolean;
  onTranscriptChange?: (text: string) => void;
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
  manualTakeover = false,
  onTranscriptChange,
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
  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => cardRef.current?.focus({ preventScroll: true }), []);

  if (!child || !result) return null;

  const canApprove = canApproveMoralGrowth(result);
  const safeCategory = canApprove ? result.category : undefined;
  const accent = canApprove ? getChildEnergyColor(safeCategory) : "#2d9fb2";
  const style = { "--moral-accent": accent } as CSSProperties;
  const helpText = getTeacherHelpText(result);
  const transcriptText = transcript?.trim() || "未识别到文字，请孩子重说";
  const actionLocked = busy === true;

  return (
    <aside ref={cardRef} className="teacher-review-corner-card" style={style} aria-label="老师确认" aria-busy={actionLocked} tabIndex={-1}>
      <div className="teacher-review-main">
        <span className="teacher-review-status">
          <Shell size={13} />
          {canApprove ? "等老师确认" : "需要老师判断"}
        </span>
        <strong>{child.name}</strong>
      </div>

      {manualTakeover ? (
        <section className="review-transcript manual-takeover" aria-label="孩子原话">
          <span className="review-transcript-label">孩子原话</span>
          <textarea
            className="teacher-review-transcript-editor"
            name="teacherMoralTranscript"
            value={transcript ?? ""}
            rows={3}
            placeholder="请老师补充孩子原话…"
            aria-label={`修改${child.name}的原话`}
            autoComplete="off"
            disabled={actionLocked}
            onChange={(event) => onTranscriptChange?.(event.target.value)}
          />
        </section>
      ) : (
        <details className="review-transcript">
          <summary>
            <span className="review-transcript-label">孩子原话</span>
            <span className="teacher-review-transcript-preview">{transcriptText}</span>
            <span className="review-transcript-toggle" aria-hidden="true">
              <span className="when-collapsed">全文</span>
              <span className="when-expanded">收起</span>
            </span>
          </summary>
          <p className="teacher-review-transcript-line">{transcriptText}</p>
          <div className="review-confidence">
            <span>成长判断把握</span>
            <em>{Math.round(result.confidence * 100)}%</em>
          </div>
        </details>
      )}

      <section className="teacher-review-suggestion" aria-label="能量建议">
        <span>能量建议</span>
        <strong className={canApprove ? "energy-chip" : "energy-chip needs-help"}>
          {canApprove ? getChildEnergyResultText(result) : helpText}
        </strong>
      </section>

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
            {actionLocked ? "点亮中…" : "确认点亮"}
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
            调能量
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
        <button type="button" className="defer" onClick={onDefer} aria-label={`${child.name} 放入待办`} disabled={actionLocked}>
          <Clock3 size={17} />
          放入待办
        </button>
        <button type="button" className="respeak" onClick={onRespeak} disabled={actionLocked}>
          <Mic size={17} />
          重说
        </button>
        <button type="button" className="skip" onClick={onSkip} disabled={actionLocked}>
          <SkipForward size={17} />
          跳过这位
        </button>
      </div>
    </aside>
  );
}
