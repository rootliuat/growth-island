import { useMemo, useState } from "react";
import { Check, ClipboardList, Home, Search, Sparkles, X } from "lucide-react";
import { getSpiritAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, LedgerRecord, MoralReviewItem, SpiritDefinition } from "../../types";

interface DataManagementModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  recentRecords: LedgerRecord[];
  pendingReviews: MoralReviewItem[];
  onFocusChild: (childId: string) => void;
  onApproveReview: (reviewId: string) => void;
  onRejectReview: (reviewId: string) => void;
}

const sourceLabels: Record<LedgerRecord["source"], string> = {
  manual: "手动",
  "dialogue-agent": "AI 记录",
  "math-pk": "数学 PK",
  undo: "撤销",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function formatRecordReason(reason: string) {
  return reason.replace(/^演示数据：已有成长 XP$/, "成长记录").replace(/^已有成长 XP$/, "成长记录");
}

export function DataManagementModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  recentRecords,
  pendingReviews,
  onFocusChild,
  onApproveReview,
  onRejectReview,
}: DataManagementModuleProps) {
  const [query, setQuery] = useState("");
  const childById = useMemo(() => new Map(childrenWithProgress.map((child) => [child.id, child])), [childrenWithProgress]);
  const normalizedQuery = normalize(query);
  const filteredChildren = childrenWithProgress
    .filter((child) => {
      if (!normalizedQuery) return true;
      return `${child.name} ${child.petName} ${child.xp} ${child.level}`.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => a.rank - b.rank);
  const filteredRecords = recentRecords.filter((record) => {
    if (!normalizedQuery) return true;
    const child = childById.get(record.childId);
    return `${child?.name ?? ""} ${child?.petName ?? ""} ${record.reason} ${sourceLabels[record.source]}`.toLowerCase().includes(normalizedQuery);
  });
  const filteredReviews = pendingReviews.filter((review) => {
    if (!normalizedQuery) return true;
    const child = childById.get(review.childId);
    return `${child?.name ?? ""} ${child?.petName ?? ""} ${review.transcript} ${review.result.category ?? ""}`.toLowerCase().includes(normalizedQuery);
  });

  return (
    <section className="module-page data-page" aria-labelledby="data-title">
      <div className="data-header">
        <div>
          <span className="module-eyebrow">
            <ClipboardList size={18} />
            老师工作台
          </span>
          <h1 id="data-title">数据管理</h1>
          <p>集中查看孩子列表、成长流水和待复核记录。搜索会同时匹配孩子、精灵、记录原因和 AI 复核文本。</p>
        </div>
        <button type="button" className="data-home-button" onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} />
          回到成长岛
        </button>
      </div>

      <div className="data-toolbar">
        <label htmlFor="data-search">
          <Search size={19} />
          <input
            id="data-search"
            name="dataSearch"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索孩子、精灵、成长记录"
          />
        </label>
        <div>
          <span>{filteredChildren.length} 名孩子</span>
          <span>{filteredRecords.length} 条流水</span>
          <span>{filteredReviews.length} 条待复核</span>
        </div>
      </div>

      <div className="data-layout">
        <section className="data-child-panel" aria-label="幼儿名单">
          <div className="data-panel-title">
            <Sparkles size={19} />
            <strong>幼儿名单</strong>
          </div>
          <div className="data-child-list">
            {filteredChildren.map((child) => {
              const spirit = spiritsById.get(child.spiritId);
              const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;
              return (
                <button key={child.id} type="button" className={child.id === selectedChild.id ? "active" : undefined} onClick={() => onFocusChild(child.id)}>
                  <span className="data-child-avatar">
                    {asset?.url ? <img src={asset.url} alt={`${child.name} 精灵`} /> : child.name.slice(0, 1)}
                  </span>
                  <span className="data-child-copy">
                    <strong>{child.name}</strong>
                    <em>
                      Lv.{child.level} · #{child.rank}
                    </em>
                  </span>
                  <span className="data-child-rank">#{child.rank}</span>
                  <span className="data-child-xp">{child.xp} XP</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="data-record-panel" aria-label="成长流水">
          <div className="data-panel-title">
            <ClipboardList size={19} />
            <strong>成长流水</strong>
          </div>
          <div className="data-record-list">
            {filteredRecords.length === 0 ? (
              <p className="data-empty">没有匹配的成长流水。</p>
            ) : (
              filteredRecords.slice(0, 20).map((record) => {
                const child = childById.get(record.childId);
                return (
                  <article key={record.id} className={record.delta < 0 ? "negative" : undefined}>
                    <span>{record.delta > 0 ? `+${record.delta}` : record.delta}</span>
                    <div>
                      <strong>{child?.name ?? "未知孩子"}</strong>
                      <p>{formatRecordReason(record.reason)}</p>
                      <em>
                        {sourceLabels[record.source]} · {formatShortTime(record.createdAt)}
                      </em>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="data-review-panel" aria-label="待复核记录">
          <div className="data-panel-title">
            <Sparkles size={19} />
            <strong>待复核</strong>
          </div>
          <div className="data-review-list">
            {filteredReviews.length === 0 ? (
              <p className="data-empty">当前没有匹配的待复核记录。</p>
            ) : (
              filteredReviews.slice(0, 8).map((review) => {
                const child = childById.get(review.childId);
                return (
                  <article key={review.id}>
                    <div>
                      <strong>{child?.name ?? "未知孩子"}</strong>
                      <span>{review.result.xpDelta} XP</span>
                    </div>
                    <p>{review.transcript}</p>
                    <em>{review.result.category ?? "待判断"} · {Math.round(review.result.confidence * 100)}%</em>
                    <div className="data-review-actions">
                      <button type="button" onClick={() => onApproveReview(review.id)}>
                        <Check size={16} />
                        通过
                      </button>
                      <button type="button" onClick={() => onRejectReview(review.id)}>
                        <X size={16} />
                        驳回
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
