import { AudioLines, Mic, Shell, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { getChildEnergyColor, getChildEnergyResultText } from "../../domain/virtueEnergy";
import type { ChildWithProgress, MoralEvaluationResult, SpiritDefinition } from "../../types";

export type MoralSpeakStage = "idle" | "ready" | "listening" | "recognizing" | "pendingReview" | "success";

export interface MoralSpeakViewState {
  stage: MoralSpeakStage;
  childId?: string;
  transcript?: string;
  summary?: string;
  result?: MoralEvaluationResult;
  reviewId?: string;
  adjusted?: boolean;
}

interface MoralSpeakOverlayProps {
  child?: ChildWithProgress;
  spirit?: SpiritDefinition;
  state: MoralSpeakViewState;
  onStart: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export function MoralSpeakOverlay({ child, spirit, state, onStart, onRetry, onClose }: MoralSpeakOverlayProps) {
  if (!child || state.stage === "idle") return null;

  const accent = getChildEnergyColor(state.result?.category) || spirit?.accent || "#f0ae3f";
  const style = { "--moral-accent": accent, "--spirit-accent": spirit?.accent ?? accent } as CSSProperties;
  const resultText = getChildEnergyResultText(state.result);

  return (
    <div className={`moral-speak-overlay ${state.stage}`} style={style} aria-live="polite">
      {state.stage === "ready" ? (
        <button type="button" className="moral-mic-button" onClick={onStart} aria-label={`${child.name} 开始说成长`}>
          <Mic size={42} />
        </button>
      ) : null}

      {state.stage === "listening" ? (
        <button type="button" className="moral-wave-state" onClick={onClose} aria-label="结束说话">
          <AudioLines size={42} />
          <span />
          <span />
          <span />
        </button>
      ) : null}

      {state.stage === "recognizing" ? (
        <button type="button" className="moral-shell-state" onClick={onClose} aria-label="结束识别">
          <Shell size={42} />
          <span />
          <span />
          <span />
        </button>
      ) : null}

      {state.stage === "pendingReview" ? (
        <div className="spirit-speech-bubble">
          <Sparkles size={22} />
          {state.summary ?? "帮助同伴"}
        </div>
      ) : null}

      {state.stage === "success" ? (
        <div className="spirit-speech-bubble success">
          <Sparkles size={24} />
          {resultText}
        </div>
      ) : null}

      {state.stage === "pendingReview" && state.result?.xpDelta === 0 ? (
        <button type="button" className="moral-retry-button" onClick={onRetry}>
          再说一次
        </button>
      ) : null}
    </div>
  );
}
