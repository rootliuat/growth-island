import { Check, ClipboardCheck, X } from "lucide-react";
import type { ChildWithProgress, MoralReviewItem } from "../types";

interface ReviewQueueProps {
  reviews: MoralReviewItem[];
  childrenWithProgress: ChildWithProgress[];
  onApprove: (reviewId: string) => void;
  onReject: (reviewId: string) => void;
}

export function ReviewQueue({ reviews, childrenWithProgress, onApprove, onReject }: ReviewQueueProps) {
  const childNames = new Map(childrenWithProgress.map((child) => [child.id, child.name]));

  return (
    <section className="review-queue">
      <div className="section-title">
        <ClipboardCheck size={18} />
        <span>Agent 复核</span>
        {reviews.length > 0 && <em>{reviews.length}</em>}
      </div>
      {reviews.length === 0 ? (
        <p className="empty-text review-empty">没有待复核记录</p>
      ) : (
        reviews.slice(0, 3).map((review) => (
          <article className="review-row" key={review.id}>
            <div>
              <strong>{childNames.get(review.childId) ?? "幼儿"}</strong>
              <span>{Math.round(review.result.confidence * 100)}%</span>
            </div>
            <em>
              {review.result.category ?? "未分类"} · {review.result.xpDelta > 0 ? "+" : ""}
              {review.result.xpDelta} 能量
            </em>
            <p>{review.transcript || review.result.reasonForTeacher}</p>
            <div className="review-actions">
              <button onClick={() => onApprove(review.id)}>
                <Check size={16} />
                通过
              </button>
              <button onClick={() => onReject(review.id)}>
                <X size={16} />
                驳回
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
