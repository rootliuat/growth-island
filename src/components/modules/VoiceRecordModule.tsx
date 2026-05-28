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
  const canConfirm = Boolean(result) && analysisState === "ready";

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
      <div className="voice-record-header">
        <div>
          <span className="module-eyebrow">
            <Mic size={18} />
            AI 德育识别
          </span>
          <h1 id="voice-record-title">语音记录</h1>
          <p>文本版课堂记录台，老师确认后再把德育建议写入成长记录。</p>
        </div>
        <button type="button" className="voice-home-button" onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} />
          聚焦成长岛
        </button>
      </div>

      <div className="voice-record-layout">
        <section className="voice-record-workbench" aria-label="语音记录工作台">
          <div className="voice-child-card">
            <div className="voice-child-avatar">
              {currentAsset?.url ? <img src={currentAsset.url} alt={`${selectedChild.petName} 精灵`} /> : selectedChild.name.slice(0, 1)}
            </div>
            <div>
              <span>当前记录对象</span>
              <strong>{selectedChild.name}</strong>
              <em>
                {selectedChild.petName} · Lv.{selectedChild.level} · {selectedChild.xp} XP
              </em>
            </div>
          </div>

          <label className="voice-field">
            <span>
              <UserRound size={16} />
              选择孩子
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
                  {child.name} · {child.petName} · Lv.{child.level}
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
              <ScrollText size={16} />
              表现文本
            </span>
            <textarea
              id="voice-record-transcript"
              name="voiceRecordTranscript"
              value={transcript}
              onChange={(event) => updateTranscript(event.target.value)}
            />
          </label>

          <div className="voice-actions">
            <button type="button" className="voice-secondary-action" disabled>
              <Mic size={18} />
              录音占位
            </button>
            <button type="button" className="voice-primary-action" onClick={submitAnalysis} disabled={!canSubmit}>
              <WandSparkles size={19} />
              {analysisState === "analyzing" ? "分析中" : "提交分析"}
            </button>
          </div>
        </section>

        <aside className="voice-result-panel" aria-label="AI 判断结果">
          <div className="voice-panel-title">
            <Sparkles size={19} />
            <strong>AI 判断结果</strong>
            <span>{analysisState === "confirmed" ? "已确认" : analysisState === "rejected" ? "已驳回" : result ? "待确认" : "等待分析"}</span>
          </div>

          {result ? (
            <div className="voice-result-card">
              <div className="voice-score-row">
                <span>{result.category ?? "待老师选择"}</span>
                <strong>{formatDelta(result.xpDelta)} XP</strong>
              </div>
              <div className="voice-confidence">
                <span style={{ width: `${Math.round(result.confidence * 100)}%` }} />
              </div>
              <p>{result.reasonForTeacher}</p>
              <em>{result.reasonForChild}</em>
              <div className="voice-result-actions">
                <button type="button" onClick={confirmResult} disabled={!canConfirm}>
                  <Check size={17} />
                  确认入账
                </button>
                <button type="button" onClick={rejectResult} disabled={!canConfirm}>
                  <X size={17} />
                  驳回建议
                </button>
              </div>
            </div>
          ) : (
            <div className="voice-empty-result">
              <ShieldCheck size={24} />
              <p>选择孩子并提交文本后，会在这里出现德育维度、建议 XP 和判断理由。</p>
            </div>
          )}

          <section className="voice-review-list" aria-label="待复核记录">
            <div className="voice-subtitle">
              <ClipboardCheck size={17} />
              <strong>待复核</strong>
              <span>{pendingReviews.length}</span>
            </div>
            {pendingReviews.length === 0 ? (
              <p className="voice-muted">没有待复核记录</p>
            ) : (
              pendingReviews.slice(0, 3).map((review) => (
                <article className="voice-review-row" key={review.id}>
                  <div>
                    <strong>{childNames.get(review.childId) ?? "幼儿"}</strong>
                    <span>
                      {review.result.category ?? "未分类"} · {formatDelta(review.result.xpDelta)} XP
                    </span>
                  </div>
                  <p>{review.transcript || review.result.reasonForTeacher}</p>
                  <div className="voice-review-actions">
                    <button type="button" onClick={() => onApproveReview(review.id)}>
                      通过
                    </button>
                    <button type="button" onClick={() => onRejectReview(review.id)}>
                      驳回
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </aside>
      </div>

      <section className="voice-history-panel" aria-label="最近语音记录">
        <div className="voice-subtitle">
          <BadgeCheck size={17} />
          <strong>最近语音记录</strong>
          <span>{selectedVoiceRecords.length}</span>
        </div>
        {selectedVoiceRecords.length === 0 ? (
          <p className="voice-muted">当前孩子还没有语音记录入账</p>
        ) : (
          <div className="voice-history-list">
            {selectedVoiceRecords.map((record) => (
              <article className={record.delta >= 0 ? "voice-history-row positive" : "voice-history-row negative"} key={record.id}>
                <span>{formatDelta(record.delta)}</span>
                <div>
                  <strong>{record.reason}</strong>
                  <em>
                    {record.category ?? "德育记录"} · {formatRecordTime(record.createdAt)}
                  </em>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
