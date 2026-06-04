import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  BookOpenText,
  Check,
  ClipboardCheck,
  Home,
  Minus,
  Plus,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";
import { getSpiritThumbnailAsset } from "../../domain/spiritAssets";
import { canApproveMoralGrowth, getTeacherHelpText } from "../../domain/virtueEnergy";
import type {
  ChildWithProgress,
  LedgerRecord,
  MoralEvaluationResult,
  MoralReviewItem,
  SpiritDefinition,
  VirtueCategory,
} from "../../types";

interface TeacherWorkbenchModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  pendingReviews: MoralReviewItem[];
  recentRecords: LedgerRecord[];
  onSelectChild: (childId: string) => void;
  onQuickRecord: (childIds: string[], delta: number, reason: string, category: VirtueCategory) => void;
  onAnalyze: (childId: string, transcript: string) => Promise<MoralEvaluationResult>;
  onConfirm: (childId: string, transcript: string, result: MoralEvaluationResult) => void;
  onRejectSuggestion: (result: MoralEvaluationResult) => void;
  onApproveReview: (reviewId: string) => void;
  onRejectReview: (reviewId: string) => void;
  onUndoLast: (recordId?: string) => void;
  onFocusChild: (childId: string) => void;
  onOpenProfile: (childId: string) => void;
}

type BehaviorTemplate = {
  label: string;
  reason: string;
  delta: 10 | 20 | 30 | -10;
  category: VirtueCategory;
};

const behaviorTemplates: BehaviorTemplate[] = [
  { label: "主动帮助", reason: "课堂记录：主动帮助同伴", delta: 20, category: "积极阳光" },
  { label: "坚持完成", reason: "课堂记录：坚持完成任务", delta: 20, category: "意志坚韧" },
  { label: "遵守规则", reason: "课堂记录：遵守排队和活动规则", delta: 10, category: "尊矩守法" },
  { label: "大胆尝试", reason: "课堂记录：大胆尝试新的挑战", delta: 20, category: "勇毅有力" },
  { label: "创新办法", reason: "课堂记录：想到了新的解决办法", delta: 30, category: "开拓创新" },
  { label: "整理归位", reason: "课堂记录：主动整理物品并归位", delta: 10, category: "激浊扬清" },
];

const watchTemplate = {
  label: "老师提醒",
  reason: "课堂记录：需要老师提醒后调整行为",
  delta: -10,
  category: "尊矩守法",
} as const;

const transcriptSamples = [
  "我今天主动帮同学收玩具",
  "我坚持把积木搭完了",
  "排队的时候我能安静等待",
  "我想到了新的办法搭桥",
];

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function formatRecordTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function TeacherWorkbenchModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  pendingReviews,
  recentRecords,
  onSelectChild,
  onQuickRecord,
  onAnalyze,
  onConfirm,
  onRejectSuggestion,
  onApproveReview,
  onRejectReview,
  onUndoLast,
  onFocusChild,
  onOpenProfile,
}: TeacherWorkbenchModuleProps) {
  const [transcript, setTranscript] = useState(transcriptSamples[0]);
  const [result, setResult] = useState<MoralEvaluationResult | undefined>();
  const [analysisState, setAnalysisState] = useState<"idle" | "analyzing" | "ready" | "confirmed" | "rejected">("idle");
  const [pendingDeduct, setPendingDeduct] = useState<{
    delta: -10 | -20 | -30;
    reason: string;
    category: VirtueCategory;
  }>();
  const [analysisContext, setAnalysisContext] = useState<{
    childId: string;
    transcript: string;
  }>();
  const analysisRequestRef = useRef(0);
  const childNames = useMemo(() => new Map(childrenWithProgress.map((child) => [child.id, child.name])), [childrenWithProgress]);
  const selectedSpirit = spiritsById.get(selectedChild.spiritId);
  const selectedAsset = selectedSpirit ? getSpiritThumbnailAsset(selectedSpirit, selectedChild.state) : undefined;
  const rankedChildren = useMemo(() => [...childrenWithProgress].sort((a, b) => a.rank - b.rank), [childrenWithProgress]);
  const selectedRecords = recentRecords.filter((record) => record.childId === selectedChild.id).slice(0, 5);
  const latestUndoableRecord = selectedRecords.find((record) => !record.undoOf);
  const canAnalyze = transcript.trim().length > 0 && analysisState !== "analyzing";
  const canHandleResult = Boolean(result) && analysisState === "ready";
  const canConfirm = canHandleResult && canApproveMoralGrowth(result);

  const invalidateAnalysis = () => {
    analysisRequestRef.current += 1;
  };

  useEffect(() => {
    analysisRequestRef.current += 1;
    setResult(undefined);
    setAnalysisContext(undefined);
    setAnalysisState("idle");
    setPendingDeduct(undefined);
  }, [selectedChild.id]);

  const chooseChild = (childId: string) => {
    invalidateAnalysis();
    onSelectChild(childId);
    setResult(undefined);
    setAnalysisContext(undefined);
    setAnalysisState("idle");
    setPendingDeduct(undefined);
  };

  const applyTemplate = (template: BehaviorTemplate) => {
    if (template.delta < 0) {
      setPendingDeduct({ delta: template.delta as -10 | -20 | -30, reason: template.reason, category: template.category });
      return;
    }
    onQuickRecord([selectedChild.id], template.delta, template.reason, template.category);
    setPendingDeduct(undefined);
  };

  const scoreSelected = (delta: number, reason: string, category: VirtueCategory) => {
    onQuickRecord([selectedChild.id], delta, reason, category);
    setPendingDeduct(undefined);
  };

  const requestDeduct = (delta: -10 | -20 | -30) => {
    setPendingDeduct({ delta, reason: `课堂记录：老师确认扣分 ${delta}`, category: "尊矩守法" });
  };

  const confirmDeduct = () => {
    if (!pendingDeduct) return;
    onQuickRecord([selectedChild.id], pendingDeduct.delta, pendingDeduct.reason, pendingDeduct.category);
    setPendingDeduct(undefined);
  };

  const updateTranscript = (value: string) => {
    invalidateAnalysis();
    setTranscript(value);
    setResult(undefined);
    setAnalysisContext(undefined);
    setAnalysisState("idle");
  };

  const submitAnalysis = async () => {
    if (!canAnalyze) return;
    const requestId = analysisRequestRef.current + 1;
    const analyzedChildId = selectedChild.id;
    const analyzedTranscript = transcript.trim();
    analysisRequestRef.current = requestId;
    setAnalysisState("analyzing");
    const nextResult = await onAnalyze(analyzedChildId, analyzedTranscript);
    if (analysisRequestRef.current !== requestId) return;
    setResult(nextResult);
    setAnalysisContext({ childId: analyzedChildId, transcript: analyzedTranscript });
    setAnalysisState("ready");
  };

  const confirmResult = () => {
    if (!result || !analysisContext) return;
    if (!canApproveMoralGrowth(result)) return;
    onConfirm(analysisContext.childId, analysisContext.transcript, result);
    setAnalysisContext(undefined);
    setAnalysisState("confirmed");
  };

  const rejectResult = () => {
    if (!result) return;
    onRejectSuggestion(result);
    setAnalysisContext(undefined);
    setAnalysisState("rejected");
  };

  return (
    <section className="module-page teacher-workbench-page" aria-label="老师记录港">
      <div className="workbench-header module-compact-header">
        <div className="workbench-harbor-status" aria-label="老师记录港状态">
          <span className="module-eyebrow">
            <ScrollText size={18} aria-hidden="true" />
            老师记录港
          </span>
          <em>{pendingReviews.length > 0 ? `待看 ${pendingReviews.length}` : "轻补记"}</em>
        </div>
        <button type="button" className="workbench-home-button" aria-label={`回岛定位${selectedChild.name}`} onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} aria-hidden="true" />
          定位
        </button>
      </div>

      <div className="workbench-board-layout">
        <section className="workbench-class-board" aria-label="班级精灵补记看板">
          <div className="workbench-class-grid">
            {rankedChildren.map((child) => {
              const spirit = spiritsById.get(child.spiritId);
              const asset = spirit ? getSpiritThumbnailAsset(spirit, child.state) : undefined;
              return (
                <article key={child.id} className={child.id === selectedChild.id ? "workbench-student-card active" : "workbench-student-card"}>
                  <div className="student-card-topline">
                    <div className="student-card-top-actions">
                      <em>Lv.{child.level}</em>
                      <button type="button" className="student-card-focus" aria-label={`回岛定位${child.name}`} onClick={() => onFocusChild(child.id)}>
                        <Home size={13} aria-hidden="true" />
                        定位
                      </button>
                    </div>
                  </div>
                  <button type="button" className="student-card-main" onClick={() => chooseChild(child.id)}>
                    <span className="student-card-avatar">
                      {asset?.url ? <img src={asset.url} alt={`${child.petName} 精灵`} loading="lazy" decoding="async" /> : child.name.slice(0, 1)}
                    </span>
                    <span className="student-card-meta">
                      <strong>{child.name}</strong>
                      <span className="student-card-xp">{child.xp} XP</span>
                    </span>
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="workbench-score-drawer" aria-label="成长记录港">
          <div className="workbench-selected-child compact">
            <span className="workbench-child-avatar">
              {selectedAsset?.url ? <img src={selectedAsset.url} alt={`${selectedChild.petName} 精灵`} decoding="async" /> : selectedChild.name.slice(0, 1)}
            </span>
            <div>
              <span>当前伙伴</span>
              <strong>{selectedChild.name}</strong>
              <em>
                Lv.{selectedChild.level} · {selectedChild.xp} XP
              </em>
              <button type="button" className="workbench-profile-button" onClick={() => onOpenProfile(selectedChild.id)}>
                <BookOpenText size={15} aria-hidden="true" />
                小屋
              </button>
            </div>
          </div>

          {latestUndoableRecord ? (
            <div className={latestUndoableRecord.delta < 0 ? "workbench-recent-feedback negative" : "workbench-recent-feedback"} aria-live="polite">
              <span>{formatDelta(latestUndoableRecord.delta)} XP</span>
              <div>
                <strong>
                  {latestUndoableRecord.delta >= 0 ? "已给" : "已记录"} {selectedChild.name}
                </strong>
                <em>{latestUndoableRecord.reason}</em>
              </div>
              <button type="button" className="workbench-undo-button" onClick={() => onUndoLast(latestUndoableRecord.id)}>
                <RotateCcw size={17} />
                撤销 {selectedChild.name} {formatDelta(latestUndoableRecord.delta)}
              </button>
            </div>
          ) : null}

          <div className="workbench-section-title">
            <Sparkles size={18} />
            <strong>补记贝壳</strong>
          </div>
          <div className="batch-score-grid">
            {[10, 20, 30].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`为${selectedChild.name}补记+${value} XP`}
                onClick={() => scoreSelected(value, `课堂记录：快速加分 +${value}`, "积极阳光")}
              >
                <Plus size={18} />
                +{value}
              </button>
            ))}
          </div>

          <div className="template-grid">
            {behaviorTemplates.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => applyTemplate(template)}
              >
                <span>{formatDelta(template.delta)}</span>
                <strong>{template.label}</strong>
              </button>
            ))}
          </div>

          <details className="manual-score-pad">
            <summary className="workbench-section-title">
              <UserRound size={18} />
              <strong>谨慎记录</strong>
              <span>要确认</span>
            </summary>
            <div className="manual-score-grid">
              <button
                type="button"
                className="deduct watch-template"
                onClick={() => applyTemplate(watchTemplate)}
              >
                <Minus size={18} />
                {watchTemplate.label} {formatDelta(watchTemplate.delta)}
              </button>
              {[-10, -20, -30].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="deduct"
                  onClick={() => requestDeduct(value as -10 | -20 | -30)}
                >
                  <Minus size={18} />
                  扣 {Math.abs(value)}
                </button>
              ))}
            </div>
          </details>
          {pendingDeduct ? (
            <div className="deduct-confirm-panel" role="alert">
              <strong>
                确认给 {selectedChild.name} 扣 {Math.abs(pendingDeduct.delta)} XP？
              </strong>
              <p>{pendingDeduct.reason}</p>
              <div>
                <button type="button" className="deduct-confirm" onClick={confirmDeduct}>
                  <Check size={16} />
                  确认调整
                </button>
                <button type="button" onClick={() => setPendingDeduct(undefined)}>
                  <X size={16} />
                  取消
                </button>
              </div>
            </div>
          ) : null}

          <details className="workbench-ai-panel workbench-secondary-details">
            <summary className="workbench-section-title">
              <ShieldCheck size={18} />
              <strong>贝壳建议</strong>
              <span>{result ? "有建议" : "打开"}</span>
            </summary>
            <div className="transcript-samples">
              {transcriptSamples.map((sample) => (
                <button key={sample} type="button" onClick={() => updateTranscript(sample)}>
                  {sample}
                </button>
              ))}
            </div>
            <label className="workbench-transcript" htmlFor="teacher-workbench-transcript">
              <ScrollText size={16} />
              <textarea
                id="teacher-workbench-transcript"
                name="teacherWorkbenchTranscript"
                aria-label="行为描述"
                value={transcript}
                onChange={(event) => updateTranscript(event.target.value)}
              />
            </label>
            <div className="workbench-ai-actions">
              <button type="button" className="workbench-primary-action" onClick={submitAnalysis} disabled={!canAnalyze}>
                <WandSparkles size={18} />
                {analysisState === "analyzing" ? "判断中…" : "生成建议"}
              </button>
            </div>
            {result ? (
              <article className={result.xpDelta < 0 ? "workbench-result-card negative" : "workbench-result-card"}>
                <div>
                  <strong>{result.category ?? "待老师选择"}</strong>
                  <span>{canApproveMoralGrowth(result) ? `${formatDelta(result.xpDelta)} XP` : getTeacherHelpText(result)}</span>
                </div>
                <p>{result.reasonForTeacher}</p>
                <div className="workbench-result-actions">
                  <button type="button" onClick={confirmResult} disabled={!canConfirm}>
                    <Check size={17} />
                    {canConfirm ? "记入成长" : "先处理"}
                  </button>
                  <button type="button" onClick={rejectResult} disabled={!canHandleResult}>
                    <X size={17} />
                    不采用
                  </button>
                </div>
              </article>
            ) : null}
          </details>

          <details className="workbench-secondary-details">
            <summary className="workbench-section-title">
              <BadgeCheck size={18} />
              <strong>最近入港</strong>
              <span>{selectedRecords.length}</span>
            </summary>
            <div className="workbench-record-list">
              {selectedRecords.length === 0 ? (
                <p>暂无入账</p>
              ) : (
                selectedRecords.map((record) => (
                  <article key={record.id} className={record.delta < 0 ? "negative" : undefined}>
                    <span>{formatDelta(record.delta)}</span>
                    <div>
                      <strong>{record.reason}</strong>
                      <em>
                        {record.category ?? "成长记录"} · {formatRecordTime(record.createdAt)}
                      </em>
                    </div>
                  </article>
                ))
              )}
            </div>
          </details>

          <details className="workbench-review-panel workbench-secondary-details">
            <summary className="workbench-section-title">
              <ClipboardCheck size={18} />
              <strong>待老师看</strong>
              <span>{pendingReviews.length}</span>
            </summary>
            <div className="workbench-review-list">
              {pendingReviews.length === 0 ? (
                <p>暂无待确认</p>
              ) : (
                pendingReviews.slice(0, 5).map((review) => {
                  const canRecord = canApproveMoralGrowth(review.result);
                  return (
                    <article key={review.id}>
                      <div>
                        <strong>{childNames.get(review.childId) ?? "幼儿"}</strong>
                        <span>{canRecord ? `${formatDelta(review.result.xpDelta)} XP` : getTeacherHelpText(review.result)}</span>
                      </div>
                      <p>{review.transcript || review.result.reasonForTeacher}</p>
                      <em>{review.result.category ?? "待分类"}</em>
                      <div className="workbench-review-actions">
                        <button type="button" disabled={!canRecord} onClick={() => onApproveReview(review.id)}>
                          <Check size={16} />
                          {canRecord ? "记入" : "先处理"}
                        </button>
                        <button type="button" onClick={() => onRejectReview(review.id)}>
                          <X size={16} />
                          不采用
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </details>
        </aside>
      </div>
    </section>
  );
}
