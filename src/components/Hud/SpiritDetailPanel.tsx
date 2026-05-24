import { Mic, Minus, Plus, RotateCcw, Sparkles, Swords } from "lucide-react";
import type { CSSProperties } from "react";
import type { ChildWithProgress, MoralEvaluationResult, SpiritDefinition } from "../../types";
import { getLevelInfo, getSpiritStageLabel, xpProgressPercent } from "../../domain/progression";

interface SpiritDetailPanelProps {
  child: ChildWithProgress;
  spirit: SpiritDefinition;
  spiritAssetUrl?: string;
  teacherMode: boolean;
  lastEvaluation?: MoralEvaluationResult;
  onAdjustXp: (delta: number, reason: string) => void;
  onUndoLast: () => void;
  onOpenDialogue: () => void;
  onOpenPk: () => void;
}

export function SpiritDetailPanel({
  child,
  spirit,
  spiritAssetUrl,
  teacherMode,
  lastEvaluation,
  onAdjustXp,
  onUndoLast,
  onOpenDialogue,
  onOpenPk,
}: SpiritDetailPanelProps) {
  const info = getLevelInfo(child.xp);
  const progress = xpProgressPercent(child.xp);
  const stageLabel = getSpiritStageLabel(child.state);

  return (
    <aside className="spirit-card" style={{ "--spirit-accent": spirit.accent } as CSSProperties}>
      <div className="spirit-card-head">
        <span>当前伙伴</span>
        <strong>#{child.rank}</strong>
      </div>

      <div className="spirit-portrait">
        <div className="portrait-ring" />
        {spiritAssetUrl ? <img src={spiritAssetUrl} alt={`${child.petName} 精灵形态`} /> : <div className="portrait-fallback">{child.name.slice(0, 1)}</div>}
      </div>

      <div className="spirit-nameplate">
        <h2>{child.petName}</h2>
        <p>
          {child.name} · {spirit.name}
        </p>
      </div>

      <div className="xp-gem">
        <div>
          <strong>Lv.{child.level}</strong>
          <span>{child.xp} XP</span>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${progress}%` }} />
        </div>
        <p>
          {info.progressLabel} · {stageLabel}
        </p>
      </div>

      <div className="score-actions">
        {[10, 20, 30].map((value) => (
          <button key={value} className="gain-button" onClick={() => onAdjustXp(value, `手动加分 +${value}`)}>
            <Plus size={18} />
            +{value}
          </button>
        ))}
        {[-10, -20, -30].map((value) => (
          <button key={value} className="deduct-button" onClick={() => onAdjustXp(value, `手动减分 ${value}`)}>
            <Minus size={18} />
            {value}
          </button>
        ))}
      </div>

      <div className="quest-actions">
        <button onClick={onOpenDialogue}>
          <Mic size={20} />
          对话记录
        </button>
        <button onClick={onOpenPk}>
          <Swords size={20} />
          数学 PK
        </button>
        {teacherMode && (
          <button onClick={onUndoLast}>
            <RotateCcw size={20} />
            撤销记录
          </button>
        )}
      </div>

      {lastEvaluation && (
        <div className="agent-suggestion">
          <div>
            <Sparkles size={17} />
            <strong>AI 德育建议</strong>
          </div>
          <p>{lastEvaluation.reasonForChild}</p>
          <small>
            {lastEvaluation.category ?? "待确认"} · {lastEvaluation.xpDelta > 0 ? "+" : ""}
            {lastEvaluation.xpDelta} XP · 置信度 {Math.round(lastEvaluation.confidence * 100)}%
          </small>
        </div>
      )}
    </aside>
  );
}
