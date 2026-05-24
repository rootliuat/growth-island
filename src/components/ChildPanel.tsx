import { Mic, Minus, Plus, RotateCcw, ShieldCheck, Sparkles, Swords } from "lucide-react";
import type { CSSProperties } from "react";
import type { ChildWithProgress, LedgerRecord, MoralEvaluationResult, SpiritDefinition } from "../types";
import { getLevelInfo, getSpiritStageLabel, xpProgressPercent } from "../domain/progression";

interface ChildPanelProps {
  child: ChildWithProgress;
  spirit: SpiritDefinition;
  spiritAssetUrl?: string;
  teacherMode: boolean;
  lastEvaluation?: MoralEvaluationResult;
  recentRecords: LedgerRecord[];
  onAdjustXp: (delta: number, reason: string) => void;
  onUndoLast: () => void;
  onOpenDialogue: () => void;
  onOpenPk: () => void;
}

export function ChildPanel({
  child,
  spirit,
  spiritAssetUrl,
  teacherMode,
  lastEvaluation,
  recentRecords,
  onAdjustXp,
  onUndoLast,
  onOpenDialogue,
  onOpenPk,
}: ChildPanelProps) {
  const info = getLevelInfo(child.xp);
  const progress = xpProgressPercent(child.xp);
  const stageLabel = getSpiritStageLabel(child.state);

  return (
    <aside className="child-panel">
      <div className="panel-eyebrow">当前精灵</div>
      <div className="child-title">
        <div>
          <h2>{child.petName}</h2>
          <p>{child.name} · {spirit.name}</p>
        </div>
        <div className="rank-chip">#{child.rank}</div>
      </div>

      <div className="pet-showcase" style={{ "--pet-accent": spirit.accent } as CSSProperties}>
        <div className="pet-aura" />
        {spiritAssetUrl ? (
          <img src={spiritAssetUrl} alt={`${child.petName} 精灵形态`} />
        ) : (
          <div className="pet-fallback">
            <span>{child.name.slice(0, 1)}</span>
          </div>
        )}
        <div className="pet-stage-pill">{stageLabel}</div>
      </div>

      <div className="xp-block">
        <div className="xp-row">
          <strong>Lv.{child.level}</strong>
          <span>{child.xp} XP</span>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${progress}%` }} />
        </div>
        <p>{info.progressLabel} · {stageLabel}</p>
      </div>

      <div className="action-grid">
        {[10, 20, 30].map((value) => (
          <button key={value} className="gain-button" onClick={() => onAdjustXp(value, `手动加分 +${value}`)}>
            <Plus size={20} />
            +{value}
          </button>
        ))}
        {[-10, -20, -30].map((value) => (
          <button key={value} className="deduct-button" onClick={() => onAdjustXp(value, `手动减分 ${value}`)}>
            <Minus size={20} />
            {value}
          </button>
        ))}
      </div>

      <div className="primary-actions">
        <button onClick={onOpenDialogue}>
          <Mic size={21} />
          对话记录
        </button>
        <button onClick={onOpenPk}>
          <Swords size={21} />
          数学 PK
        </button>
        {teacherMode && (
          <button onClick={onUndoLast}>
            <RotateCcw size={21} />
            撤销最近
          </button>
        )}
      </div>

      {lastEvaluation && (
        <div className="agent-card">
          <div>
            <Sparkles size={18} />
            <strong>德育 Agent mock</strong>
          </div>
          <p>{lastEvaluation.reasonForChild}</p>
          <small>
            {lastEvaluation.category ?? "待确认"} · {lastEvaluation.xpDelta > 0 ? "+" : ""}
            {lastEvaluation.xpDelta} XP · 置信度 {Math.round(lastEvaluation.confidence * 100)}%
          </small>
        </div>
      )}

      <div className="record-list">
        <div className="record-title">
          <ShieldCheck size={17} />
          <span>最近记录</span>
        </div>
        {recentRecords.length === 0 ? (
          <p className="empty-text">还没有成长记录</p>
        ) : (
          recentRecords.slice(0, 4).map((record) => (
            <div className="record-row" key={record.id}>
              <span>{record.delta > 0 ? `+${record.delta}` : record.delta}</span>
              <p>{record.reason}</p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
