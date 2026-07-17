/**
 * [INPUT]: 依赖 moralSpeakSession 的视图与重放锁状态、virtueEnergy 的能量色彩及老师接管/跳过动作。
 * [OUTPUT]: 对外提供 MoralSpeakOverlay 组件与当前孩子 QA 标记，在不确定点亮重放时隐藏可改变载荷的接管动作。
 * [POS]: HUD 的儿童自助说成长浮层，只负责渲染与按钮回调，不持有流程状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { AudioLines, Mic, Shell, Sparkles, X } from "lucide-react";
import type { CSSProperties } from "react";
import {
  getMoralSpeakRetryLabel,
  isMoralApprovalReplayLocked,
  type MoralSpeakStage,
  type MoralSpeakViewState,
} from "../../domain/moralSpeakSession";
import { canApproveMoralGrowth, getChildEnergyColor, getChildEnergyLabel } from "../../domain/virtueEnergy";
import type { ChildWithProgress, SpiritDefinition } from "../../types";

interface MoralSpeakOverlayProps {
  child?: ChildWithProgress;
  spirit?: SpiritDefinition;
  state: MoralSpeakViewState;
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
  onTeacherTakeover?: () => void;
  onSkip?: () => void;
  onClose: () => void;
}

const flowSteps: Array<{ id: "ready" | "listening" | "pendingReview" | "success"; label: string }> = [
  { id: "ready", label: "我" },
  { id: "listening", label: "说" },
  { id: "pendingReview", label: "等" },
  { id: "success", label: "亮" },
];

const flowStepOrder: Record<MoralSpeakStage, number> = {
  idle: -1,
  ready: 0,
  listening: 1,
  recognizing: 2,
  pendingReview: 2,
  success: 3,
  error: 1,
};

function getTurnStatusLabel(stage: MoralSpeakStage, hasSafePendingResult = true) {
  if (stage === "ready") return "准备说";
  if (stage === "listening") return "正在说";
  if (stage === "recognizing") return "贝壳在听";
  if (stage === "pendingReview") return hasSafePendingResult ? "等老师" : "请老师帮忙";
  if (stage === "success") return "已点亮";
  if (stage === "error") return "请老师帮忙";
  return "";
}

export function MoralSpeakOverlay({
  child,
  spirit,
  state,
  onStart,
  onStop,
  onRetry,
  onTeacherTakeover,
  onSkip,
  onClose,
}: MoralSpeakOverlayProps) {
  if (!child || state.stage === "idle") return null;

  const safeResult = canApproveMoralGrowth(state.result) ? state.result : undefined;
  const accent = getChildEnergyColor(safeResult?.category) || spirit?.accent || "#f0ae3f";
  const style = { "--moral-accent": accent, "--spirit-accent": spirit?.accent ?? accent } as CSSProperties;
  const currentStepIndex = flowStepOrder[state.stage];
  const turnStatusLabel = getTurnStatusLabel(state.stage, Boolean(safeResult));
  const recognizingText = state.processingStep === "evaluating" ? "正在判断成长类型…" : "正在识别原话…";
  const retryLabel = getMoralSpeakRetryLabel(state.retryMode);
  const approvalReplayLocked = isMoralApprovalReplayLocked(state);

  return (
    <div
      className={`moral-speak-overlay ${state.stage}`}
      data-moral-stage={state.stage}
      style={style}
      aria-live="polite"
    >
      <div className="moral-flow-ribbon" aria-hidden="true">
        {flowSteps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isDone = index < currentStepIndex && state.stage !== "error";
          return (
            <span key={step.id} className={isActive ? "active" : isDone ? "done" : undefined}>
              {step.label}
            </span>
          );
        })}
      </div>
      <div className="moral-turn-chip" data-child-id={child.id} aria-label={`当前孩子：${child.name}，${turnStatusLabel}`}>
        <strong>{child.name}</strong>
        <span>{turnStatusLabel}</span>
      </div>

      {state.stage === "ready" ? (
        <>
          <button type="button" className="moral-mic-button" onClick={() => onStart()} aria-label={`${child.name} 开始说成长`}>
            <span className="energy-touch-halo" aria-hidden="true" style={{ pointerEvents: "none" }} />
            <Mic size={42} />
          </button>
          <button type="button" className="moral-cancel-button moral-safe-exit" onClick={() => onClose()} aria-label={`${child.name} 稍后再说`}>
            <X size={16} aria-hidden="true" />
            取消
          </button>
        </>
      ) : null}

      {state.stage === "listening" ? (
        <>
          <button type="button" className="moral-wave-state" onClick={() => onStop()} aria-label="结束说话">
            <AudioLines size={42} />
            <span />
            <span />
            <span />
            <em>说完点我</em>
          </button>
          <button type="button" className="moral-cancel-button moral-safe-exit" onClick={() => onClose()} aria-label={`${child.name} 取消录音`}>
            <X size={16} aria-hidden="true" />
            取消
          </button>
        </>
      ) : null}

      {state.stage === "recognizing" ? (
        <>
          <div className="moral-shell-state" role="status" aria-label={recognizingText}>
            <Shell size={42} />
            <span />
            <span />
            <span />
            <em>{recognizingText}</em>
          </div>
          <button type="button" className="moral-cancel-button moral-safe-exit" onClick={() => onClose()} aria-label="取消识别">
            <X size={16} aria-hidden="true" />
            取消
          </button>
        </>
      ) : null}

      {state.stage === "pendingReview" ? (
        <div className="spirit-speech-bubble">
          <Sparkles size={22} />
          请老师确认
        </div>
      ) : null}

      {state.stage === "success" ? (
        <div className="spirit-speech-bubble success" data-energy-arrival="true">
          <i className="moral-energy-trail" aria-hidden="true" />
          <i className="energy-confirm-burst" aria-hidden="true" style={{ pointerEvents: "none" }} />
          <i className="energy-arrival-orb" aria-hidden="true" style={{ pointerEvents: "none" }} />
          <i className="moral-energy-sparks" aria-hidden="true" />
          <Sparkles size={24} />
          <span className="moral-success-copy">
            <strong>{child.name} · {getChildEnergyLabel(safeResult?.category)}能量进精灵</strong>
            <small>已点亮 {safeResult?.xpDelta ?? 0} 能量 · 已写入成长账本</small>
          </span>
        </div>
      ) : null}

      {state.stage === "error" ? (
        <div className="spirit-speech-bubble error">
          <Sparkles size={22} />
          {state.error ?? "请老师帮忙"}
        </div>
      ) : null}

      {((state.stage === "error" && retryLabel) ||
      (state.stage === "pendingReview" && state.result?.xpDelta === 0)) ? (
        <button type="button" className="moral-retry-button" onClick={() => onRetry()}>
          {state.stage === "error" ? retryLabel : "再说一次"}
        </button>
      ) : null}

      {state.stage === "error" && !approvalReplayLocked ? (
        <div className="moral-error-actions">
          <button type="button" className="moral-teacher-takeover" onClick={() => onTeacherTakeover?.()}>
            老师接管
          </button>
          <button type="button" className="moral-skip-child" onClick={() => onSkip?.()} aria-label={`跳过${child.name}`}>
            跳过这位
          </button>
          <button type="button" className="moral-cancel-button moral-safe-exit" onClick={() => onClose()} aria-label={`${child.name} 稍后再说`}>
            <X size={16} aria-hidden="true" />
            关闭
          </button>
        </div>
      ) : null}
    </div>
  );
}
