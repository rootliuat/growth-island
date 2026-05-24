import { ClipboardCheck, ShieldCheck } from "lucide-react";
import type { ChildWithProgress, LedgerRecord, MoralReviewItem } from "../../types";
import { ReviewQueue } from "../ReviewQueue";

interface GrowthLogPanelProps {
  recentRecords: LedgerRecord[];
  pendingReviews: MoralReviewItem[];
  childrenWithProgress: ChildWithProgress[];
  onApprove: (reviewId: string) => void;
  onReject: (reviewId: string) => void;
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
      <details open={pendingReviews.length > 0}>
        <summary>
          <span>
            <ClipboardCheck size={18} />
            Agent 复核
          </span>
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
        <div className="section-title">
          <ShieldCheck size={17} />
          <span>最近成长</span>
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
    </section>
  );
}
