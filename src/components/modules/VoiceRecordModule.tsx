import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  ClipboardCheck,
  Home,
  Mic,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";
import { getSpiritAsset } from "../../domain/spiritAssets";
import { canApproveMoralGrowth, getTeacherHelpText } from "../../domain/virtueEnergy";
import type { ChildWithProgress, LedgerRecord, MoralEvaluationResult, MoralReviewItem, SpiritDefinition } from "../../types";

interface VoiceRecordModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  pendingReviews: MoralReviewItem[];
  recentRecords: LedgerRecord[];
  onSelectChild: (childId: string) => void;
  onAnalyze: (childId: string, transcript: string) => Promise<MoralEvaluationResult>;
  onConfirm: (childId: string, transcript: string, result: MoralEvaluationResult) => void;
  onRejectSuggestion: (result: MoralEvaluationResult) => void;
  onApproveReview: (reviewId: string) => void;
  onRejectReview: (reviewId: string) => void;
  onFocusChild: (childId: string) => void;
}

const sampleTranscripts = [
  "我今天主动帮同学收玩具",
  "我坚持把积木搭完了",
  "排队的时候我能安静等待",
  "我想到了新的办法搭桥",
];

function formatRecordTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function formatEnergyDelta(delta: number) {
  return `${formatDelta(delta)}能量`;
}

export function VoiceRecordModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  pendingReviews,
  recentRecords,
  onSelectChild,
  onAnalyze,
  onConfirm,
  onRejectSuggestion,
  onApproveReview,
  onRejectReview,
  onFocusChild,
}: VoiceRecordModuleProps) {
  const [transcript, setTranscript] = useState(sampleTranscripts[0]);
  const [result, setResult] = useState<MoralEvaluationResult | undefined>();
  const [analysisState, setAnalysisState] = useState<"idle" | "analyzing" | "ready" | "confirmed" | "rejected">("idle");
  const currentSpirit = spiritsById.get(selectedChild.spiritId);
  const currentAsset = currentSpirit ? getSpiritAsset(currentSpirit, selectedChild.state) : undefined;
  const selectedVoiceRecords = useMemo(
    () =>
      recentRecords
        .filter((record) => record.source === "dialogue-agent" && record.childId === selectedChild.id)
        .slice(0, 5),
    [recentRecords, selectedChild.id],
  );
  const childNames = useMemo(() => new Map(childrenWithProgress.map((child) => [child.id, child.name])), [childrenWithProgress]);
  const canSubmit = transcript.trim().length > 0 && analysisState !== "analyzing";
  const canHandleResult = Boolean(result) && analysisState === "ready";
  const canConfirm = canHandleResult && canApproveMoralGrowth(result);

  const updateTranscript = (value: string) => {
    setTranscript(value);
    setResult(undefined);
    setAnalysisState("idle");
  };

  const submitAnalysis = async () => {
    if (!canSubmit) return;
    setAnalysisState("analyzing");
    const nextResult = await onAnalyze(selectedChild.id, transcript.trim());
    setResult(nextResult);
    setAnalysisState("ready");
  };

  const confirmResult = () => {
    if (!result) return;
    if (!canApproveMoralGrowth(result)) return;
    onConfirm(selectedChild.id, transcript.trim(), result);
    setAnalysisState("confirmed");
  };

  const rejectResult = () => {
    if (!result) return;
    onRejectSuggestion(result);
    setAnalysisState("rejected");
  };

  return (
    <section className="module-page voice-record-page" aria-labelledby="voice-record-title">
      <div className="voice-record-header module-compact-header">
        <div>
          <span className="module-eyebrow">
            <Mic size={18} aria-hidden="true" />
            贝壳
          </span>
          <h1 id="voice-record-title">贝壳记录台</h1>
        </div>
        <button type="button" className="voice-home-button" aria-label={`看${selectedChild.name}的精灵`} onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} aria-hidden="true" />
          看精灵
        </button>
      </div>

      <div className="voice-record-layout">
        <section className="voice-record-workbench" aria-label="贝壳记录台">
          <div className="voice-child-card">
            <div className="voice-child-avatar">
              {currentAsset?.url ? <img src={currentAsset.url} alt={`${selectedChild.name} 精灵`} /> : selectedChild.name.slice(0, 1)}
            </div>
            <div>
              <span>当前伙伴</span>
              <strong>{selectedChild.name}</strong>
              <em>
                Lv.{selectedChild.level} · {selectedChild.xp} 能量
              </em>
            </div>
          </div>

          <label className="voice-field">
            <span>
              <UserRound size={16} aria-hidden="true" />
              选择伙伴
            </span>
            <select
              id="voice-record-child"
              name="voiceRecordChild"
              value={selectedChild.id}
              onChange={(event) => {
                onSelectChild(event.target.value);
                setResult(undefined);
                setAnalysisState("idle");
              }}
            >
              {childrenWithProgress.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name} · Lv.{child.level}
                </option>
              ))}
            </select>
          </label>

          <div className="voice-template-row" aria-label="常用表现模板">
            {sampleTranscripts.map((sample) => (
              <button type="button" key={sample} onClick={() => updateTranscript(sample)}>
                {sample}
              </button>
            ))}
          </div>

          <label className="voice-field voice-transcript-field">
            <span>
              <ScrollText size={16} aria-hidden="true" />
              观察内容
            </span>
            <textarea
              id="voice-record-transcript"
              name="voiceRecordTranscript"
              value={transcript}
              onChange={(event) => updateTranscript(event.target.value)}
            />
          </label>

          <div className="voice-actions">
            <button type="button" className="voice-primary-action" onClick={submitAnalysis} disabled={!canSubmit}>
              <WandSparkles size={19} aria-hidden="true" />
              {analysisState === "analyzing" ? "生成中" : "生成建议"}
            </button>
          </div>
        </section>

        <aside className="voice-result-panel" aria-label="贝壳判断">
          <div className="voice-panel-title">
            <Sparkles size={19} aria-hidden="true" />
            <strong>贝壳判断</strong>
            <span>{analysisState === "confirmed" ? "已入账" : analysisState === "rejected" ? "已退回" : result ? "待老师确认" : "等待记录"}</span>
          </div>

          {result ? (
            <div className="voice-result-card">
              <div className="voice-score-row">
                <span>{result.category ?? "待老师选择"}</span>
                <strong>{canApproveMoralGrowth(result) ? formatEnergyDelta(result.xpDelta) : getTeacherHelpText(result)}</strong>
              </div>
              <div className="voice-confidence">
                <span style={{ width: `${Math.round(result.confidence * 100)}%` }} />
              </div>
              <p>{result.reasonForTeacher}</p>
              <em>{result.reasonForChild}</em>
              <div className="voice-result-actions">
                <button type="button" onClick={confirmResult} disabled={!canConfirm}>
                  <Check size={17} aria-hidden="true" />
                  {canConfirm ? "记入成长" : "先处理"}
                </button>
                <button type="button" onClick={rejectResult} disabled={!canHandleResult}>
                  <X size={17} aria-hidden="true" />
                  不采用
                </button>
              </div>
            </div>
          ) : (
            <div className="voice-empty-result">
              <ShieldCheck size={24} aria-hidden="true" />
              <strong>等待记录</strong>
            </div>
          )}

          <details className="voice-review-list voice-secondary-details">
            <summary className="voice-subtitle">
              <ClipboardCheck size={17} aria-hidden="true" />
              <strong>待老师看</strong>
              <span>{pendingReviews.length}</span>
            </summary>
            {pendingReviews.length === 0 ? (
              <p className="voice-muted">暂无待看记录</p>
            ) : (
              pendingReviews.slice(0, 3).map((review) => {
                const canRecord = canApproveMoralGrowth(review.result);
                return (
                  <article className="voice-review-row" key={review.id}>
                    <div>
                      <strong>{childNames.get(review.childId) ?? "幼儿"}</strong>
                      <span>
                        {canRecord ? `${review.result.category ?? "未分类"} · ${formatEnergyDelta(review.result.xpDelta)}` : getTeacherHelpText(review.result)}
                      </span>
                    </div>
                    <p>{review.transcript || review.result.reasonForTeacher}</p>
                    <div className="voice-review-actions">
                      <button type="button" disabled={!canRecord} onClick={() => onApproveReview(review.id)}>
                        {canRecord ? "记入" : "先处理"}
                      </button>
                      <button type="button" onClick={() => onRejectReview(review.id)}>
                        不采用
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </details>

          <details className="voice-history-panel voice-secondary-details">
            <summary className="voice-subtitle">
              <BadgeCheck size={17} aria-hidden="true" />
              <strong>最近入账</strong>
              <span>{selectedVoiceRecords.length}</span>
            </summary>
            {selectedVoiceRecords.length === 0 ? (
              <p className="voice-muted">这个伙伴还没有入账记录</p>
            ) : (
              <div className="voice-history-list">
                {selectedVoiceRecords.map((record) => (
                  <article className={record.delta >= 0 ? "voice-history-row positive" : "voice-history-row negative"} key={record.id}>
                    <span>{formatDelta(record.delta)}</span>
                    <div>
                      <strong>{record.reason}</strong>
                      <em>
                        {record.category ?? "成长记录"} · {formatRecordTime(record.createdAt)}
                      </em>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </details>
        </aside>
      </div>
    </section>
  );
}
