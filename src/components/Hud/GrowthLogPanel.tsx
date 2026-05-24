import { ClipboardCheck, Clock3, ScrollText, ShieldCheck, Sparkles } from "lucide-react";
import type { ChildWithProgress, LedgerRecord, MoralReviewItem } from "../../types";
import { ReviewQueue } from "../ReviewQueue";

interface GrowthLogPanelProps {
  recentRecords: LedgerRecord[];
  pendingReviews: MoralReviewItem[];
  childrenWithProgress: ChildWithProgress[];
  onApprove: (reviewId: string) => void;
  onReject: (reviewId: string) => void;
}

const sourceLabels: Record<LedgerRecord["source"], string> = {
  manual: "手动调整",
  "dialogue-agent": "对话识别",
  "math-pk": "数学 PK",
  undo: "撤销记录",
};

function formatRecordTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function GrowthLogPanel({
  recentRecords,
  pendingReviews,
  childrenWithProgress,
  onApprove,
  onReject,
}: GrowthLogPanelProps) {
  return (
    <section className="growth-log-panel">
      <details className="review-scroll" open={pendingReviews.length > 0}>
        <summary className="review-scroll-head">
          <span>
            <ClipboardCheck size={18} />
            复核卷轴
          </span>
          <small>Agent 建议</small>
          <em>{pendingReviews.length}</em>
        </summary>
        <ReviewQueue
          reviews={pendingReviews}
          childrenWithProgress={childrenWithProgress}
          onApprove={onApprove}
          onReject={onReject}
        />
      </details>

      <div className="growth-records">
        <div className="growth-records-head">
          <div>
            <ScrollText size={18} />
            <span>成长卷轴</span>
          </div>
          <strong>最近 {Math.min(recentRecords.length, 4)} 条</strong>
        </div>
        {recentRecords.length === 0 ? (
          <div className="growth-empty">
            <Sparkles size={20} />
            <p>今天还没有新的成长能量</p>
          </div>
        ) : (
          <div className="record-scroll-list">
            {recentRecords.slice(0, 4).map((record) => (
              <article className={record.delta >= 0 ? "record-row positive" : "record-row negative"} key={record.id}>
                <span className="record-token">{record.delta > 0 ? `+${record.delta}` : record.delta}</span>
                <div className="record-main">
                  <p>{record.reason}</p>
                  <div className="record-meta">
                    <ShieldCheck size={13} />
                    <span>{record.category ?? sourceLabels[record.source]}</span>
                    <Clock3 size={13} />
                    <span>{formatRecordTime(record.createdAt)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
