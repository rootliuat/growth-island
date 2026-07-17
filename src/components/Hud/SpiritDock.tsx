/**
 * [INPUT]: 依赖孩子/精灵进度、精灵资产解析、当前说成长队列与待复核入口动作。
 * [OUTPUT]: 对外提供 SpiritDock 组件，支持当前孩子、全班选择、待复核入口与成功后的下一位快捷动作。
 * [POS]: components/Hud 的首页底部课堂队列，负责孩子导航而不持有业务状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Box, ChevronDown, ClipboardCheck, Search, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChildWithProgress, SpiritDefinition } from "../../types";
import { getSpiritAsset } from "../../domain/spiritAssets";

interface SpiritDockProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  onOpenShowcase?: (childId: string) => void;
  pendingReviewCount?: number;
  onOpenPendingReviews?: () => void;
  nextChild?: ChildWithProgress;
  onSelectNextChild?: (childId: string) => void;
}

const regionFilters = ["全部", "红树林", "贝壳湾", "珍珠湾", "小镇", "老街", "算术湾"];

export function SpiritDock({
  childrenWithProgress,
  spiritsById,
  selectedChildId,
  onSelectChild,
  onOpenShowcase,
  pendingReviewCount = 0,
  onOpenPendingReviews,
  nextChild,
  onSelectNextChild,
}: SpiritDockProps) {
  const dockScrollRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部");
  const [collapsed, setCollapsed] = useState(true);
  const selectedChild = childrenWithProgress.find((child) => child.id === selectedChildId) ?? childrenWithProgress[0];
  const filtered = useMemo(() => {
    const q = query.trim();
    return childrenWithProgress.filter((child, index) => {
      const regionName = regionFilters[Math.min(regionFilters.length - 1, Math.floor(index / 6) + 1)];
      const matchText = !q || child.name.includes(q) || child.petName.includes(q);
      const matchRegion = filter === "全部" || regionName === filter;
      return matchText && matchRegion;
    });
  }, [childrenWithProgress, query, filter]);
  const selectedIsVisible = filtered.some((child) => child.id === selectedChildId);

  useEffect(() => {
    if (selectedIsVisible) return;
    if (query.trim()) setQuery("");
    if (filter !== regionFilters[0]) setFilter(regionFilters[0]);
  }, [filter, query, selectedChildId, selectedIsVisible]);

  useEffect(() => {
    if (collapsed) return;
    const activeCard = dockScrollRef.current?.querySelector<HTMLButtonElement>(".dock-spirit.active");
    activeCard?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [collapsed, filtered, selectedChildId]);

  const selectedSpirit = selectedChild ? spiritsById.get(selectedChild.spiritId) : undefined;
  const selectedAsset = selectedSpirit ? getSpiritAsset(selectedSpirit, selectedChild.state) : undefined;
  const selectedRoleLabel = "找我";
  const selectedAriaLabel = "已选孩子";
  const selectedStatus = "点我说";
  const dockClasses = [
    "spirit-dock",
    collapsed ? "collapsed is-collapsed" : "expanded is-expanded",
    childrenWithProgress.length > 18 ? "has-many-children" : "",
  ].filter(Boolean).join(" ");
  const selectChildFromRoster = (childId: string) => {
    onSelectChild(childId);
    setCollapsed(true);
  };

  if (collapsed) {
    return (
      <section className={dockClasses}>
        <button
          type="button"
          className="dock-selected-summary"
          style={{ "--dock-accent": selectedSpirit?.accent ?? "#6ebf8b" } as CSSProperties}
          data-selected-role="current"
          data-self-service-entry="dock-current"
          aria-label={`${selectedAriaLabel}：${selectedChild.name}，点自己的精灵说成长`}
          onClick={() => onSelectChild(selectedChild.id)}
        >
          <span className="dock-avatar">
            {selectedAsset?.url ? <img src={selectedAsset.url} alt="" width={48} height={48} /> : <span className="dock-avatar-label">{selectedChild.name.slice(0, 1)}</span>}
          </span>
          <span className="dock-summary-copy">
            <small>{selectedRoleLabel}</small>
            <strong title={selectedChild.name}>{selectedChild.name}</strong>
          </span>
          <em className="dock-summary-status">{selectedStatus}</em>
        </button>
        <button
          className="dock-collapse"
          type="button"
          aria-expanded="false"
          aria-label="展开全班孩子"
          onClick={() => setCollapsed(false)}
        >
          <Users size={17} />
          全班
        </button>
        {nextChild ? (
          <button type="button" className="dock-next-child" onClick={() => (onSelectNextChild ?? onSelectChild)(nextChild.id)}>
            一键下一位：{nextChild.name}
          </button>
        ) : null}
        {pendingReviewCount > 0 && onOpenPendingReviews ? (
          <button type="button" className="dock-pending-reviews" onClick={onOpenPendingReviews}>
            <ClipboardCheck size={16} />
            老师待办 {pendingReviewCount}
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className={dockClasses}>
      <div className="dock-tools">
        <div className="dock-tools-head">
          <strong>
            全班
            <small>{filtered.length}/{childrenWithProgress.length}</small>
          </strong>
          <button
            className="dock-collapse"
            type="button"
            aria-expanded="true"
            aria-label="收起全班孩子"
            onClick={() => setCollapsed((current) => !current)}
          >
            <ChevronDown size={16} />
            收起
          </button>
        </div>
        <div className="dock-search">
          <Search size={16} />
          <input
            id="spirit-dock-search"
            name="spiritDockSearch"
            aria-label="搜索孩子名字"
            value={query}
            placeholder="搜名字…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="dock-filters">
          {regionFilters.map((item) => (
            <button key={item} type="button" className={item === filter ? "active" : ""} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div
        role="group"
        className="dock-selected-summary expanded"
        style={{ "--dock-accent": selectedSpirit?.accent ?? "#6ebf8b" } as CSSProperties}
        data-selected-role="current"
        aria-label={`${selectedAriaLabel}：${selectedChild.name}，查看自己的精灵，全班${childrenWithProgress.length}人`}
      >
        <span className="dock-avatar">
          {selectedAsset?.url ? <img src={selectedAsset.url} alt="" width={48} height={48} /> : <span className="dock-avatar-label">{selectedChild.name.slice(0, 1)}</span>}
        </span>
        <span className="dock-selected-copy">
          <strong>{selectedChild.name}</strong>
          <em>{selectedStatus}</em>
          <small>全班 {childrenWithProgress.length}</small>
          {pendingReviewCount > 0 && onOpenPendingReviews ? (
            <button type="button" className="dock-pending-reviews expanded" onClick={onOpenPendingReviews}>
              <ClipboardCheck size={16} />
              老师待办 {pendingReviewCount}
            </button>
          ) : null}
        </span>
        {onOpenShowcase ? (
          <button
            type="button"
            className="dock-showcase-button spirit-showcase-button"
            aria-label={`查看${selectedChild.name}的3D精灵`}
            onClick={() => onOpenShowcase(selectedChild.id)}
          >
            <Box size={15} />
            3D
          </button>
        ) : null}
      </div>
      <div className="dock-scroll" ref={dockScrollRef}>
        {filtered.map((child) => {
          const spirit = spiritsById.get(child.spiritId);
          const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;
          return (
            <button
              key={child.id}
              className={child.id === selectedChildId ? "dock-spirit active" : "dock-spirit"}
              aria-current={child.id === selectedChildId ? "true" : undefined}
              aria-label={`${child.id === selectedChildId ? "已选孩子" : "选择孩子"}：${child.name}，点自己的精灵说成长`}
              data-selected-role={child.id === selectedChildId ? "current" : undefined}
              data-self-service-entry="dock-roster"
              onClick={() => selectChildFromRoster(child.id)}
            >
              <span className="dock-avatar" style={{ "--dock-accent": spirit?.accent ?? "#6ebf8b" } as CSSProperties}>
                {asset?.url ? (
                  <img
                    src={asset.url}
                    alt=""
                    width={60}
                    height={60}
                    loading={child.id === selectedChildId ? undefined : "lazy"}
                    decoding="async"
                  />
                ) : (
                  <span className="dock-avatar-label">{child.name.slice(0, 1)}</span>
                )}
              </span>
              <strong>{child.name}</strong>
              <em>点我说</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
