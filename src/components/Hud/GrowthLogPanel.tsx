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
  manual: "老师贝壳",
  "dialogue-agent": "贝壳建议",
  "math-pk": "数学闯关",
  undo: "撤销记录",
};

function getRecordLabel(record: LedgerRecord) {
  const reason = record.reason
    .replace(/^演示数据[:：]?\s*/, "")
    .replace(/^课堂记录[:：]?\s*/, "")
    .replace(/^语音记录[:：]?\s*/, "")
    .replace(/^复核通过[:：]?\s*/, "")
    .trim();
  if (record.source === "math-pk") return "数学闯关点亮";
  if (reason.includes("快速加分") || reason.includes("课堂积极回应")) return "课堂成长点亮";
  if (reason.includes("自助成长")) return "能量进精灵";
  if (record.delta < 0) return "老师提醒";
  return reason.replace(/\s*[+＋-]\d+\s*XP?$/i, "").slice(0, 18) || "成长贝壳";
}

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
          <small>贝壳建议</small>
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
                <span className="record-token">{record.delta > 0 ? "点亮" : "提醒"}</span>
                <div className="record-main">
                  <p>{getRecordLabel(record)}</p>
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
