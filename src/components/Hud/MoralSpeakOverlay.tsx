import { AudioLines, Mic, Shell, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { canApproveMoralGrowth, getChildEnergyColor, getChildEnergyLabel } from "../../domain/virtueEnergy";
import type { ChildWithProgress, MoralEvaluationResult, SpiritDefinition } from "../../types";

export type MoralSpeakStage = "idle" | "ready" | "listening" | "recognizing" | "pendingReview" | "success" | "error";

export interface MoralSpeakViewState {
  stage: MoralSpeakStage;
  childId?: string;
  transcript?: string;
  summary?: string;
  result?: MoralEvaluationResult;
  reviewId?: string;
  adjusted?: boolean;
  error?: string;
  previousChildName?: string;
  nextChildId?: string;
  nextChildName?: string;
  queueAutoReady?: boolean;
  queueIndex?: number;
  queueTotal?: number;
}

interface MoralSpeakOverlayProps {
  child?: ChildWithProgress;
  spirit?: SpiritDefinition;
  state: MoralSpeakViewState;
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
  onClose: () => void;
}

const flowSteps: Array<{ id: "ready" | "listening" | "pendingReview" | "success"; label: string }> = [
  { id: "ready", label: "找" },
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

export function MoralSpeakOverlay({ child, spirit, state, onStart, onStop, onRetry, onClose }: MoralSpeakOverlayProps) {
  if (!child || state.stage === "idle") return null;

  const safeResult = canApproveMoralGrowth(state.result) ? state.result : undefined;
  const accent = getChildEnergyColor(safeResult?.category) || spirit?.accent || "#f0ae3f";
  const style = { "--moral-accent": accent, "--spirit-accent": spirit?.accent ?? accent } as CSSProperties;
  const energyLabel = getChildEnergyLabel(safeResult?.category);
  const currentStepIndex = flowStepOrder[state.stage];

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

      {state.stage === "ready" ? (
        <>
          {state.queueAutoReady ? (
            <div className="moral-next-turn-card" data-next-turn="true">
              <span>下一位</span>
              <strong>{child.name}</strong>
              {state.queueTotal ? <em>{state.queueIndex}/{state.queueTotal}</em> : null}
            </div>
          ) : null}
          <div className="moral-ready-child" aria-hidden="true">
            {child.name}
          </div>
          <button type="button" className="moral-mic-button" onClick={() => onStart()} aria-label={`${child.name} 开始说成长`}>
            <span className="energy-touch-halo" aria-hidden="true" style={{ pointerEvents: "none" }} />
            <Mic size={42} />
            <span>说成长</span>
          </button>
        </>
      ) : null}

      {state.stage === "listening" ? (
        <button type="button" className="moral-wave-state" onClick={() => onStop()} aria-label="结束说话">
          <AudioLines size={42} />
          <span />
          <span />
          <span />
          <em>说完点我</em>
        </button>
      ) : null}

      {state.stage === "recognizing" ? (
        <>
          <div className="moral-shell-state" role="status" aria-label="正在听孩子刚才说的成长">
            <Shell size={42} />
            <span />
            <span />
            <span />
            <em>贝壳在听</em>
          </div>
          <button type="button" className="moral-cancel-button" onClick={() => onClose()} aria-label="取消识别">
            取消
          </button>
        </>
      ) : null}

      {state.stage === "pendingReview" ? (
        <div className="spirit-speech-bubble">
          <Sparkles size={22} />
          {safeResult ? "等老师点亮" : state.summary ?? "请老师帮忙"}
        </div>
      ) : null}

      {state.stage === "success" ? (
        <div className="spirit-speech-bubble success" data-energy-arrival="true">
          <i className="moral-energy-trail" aria-hidden="true" />
          <i className="energy-confirm-burst" aria-hidden="true" style={{ pointerEvents: "none" }} />
          <i className="energy-arrival-orb" aria-hidden="true" style={{ pointerEvents: "none" }} />
          <i className="moral-energy-sparks" aria-hidden="true" />
          <Sparkles size={24} />
          <strong>{energyLabel}能量进精灵</strong>
          <span className="moral-success-chip">已点亮</span>
          {state.nextChildName ? <span className="moral-next-chip">下一位 {state.nextChildName}</span> : null}
        </div>
      ) : null}

      {state.stage === "error" ? (
        <div className="spirit-speech-bubble error">
          <Sparkles size={22} />
          {state.error ?? "请老师帮忙"}
        </div>
      ) : null}

      {(state.stage === "error" || (state.stage === "pendingReview" && state.result?.xpDelta === 0)) ? (
        <button type="button" className="moral-retry-button" onClick={() => onRetry()}>
          再说一次
        </button>
      ) : null}
    </div>
  );
}
