import { ChevronDown, Search, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChildWithProgress, SpiritDefinition } from "../../types";
import { getSpiritAsset } from "../../domain/spiritAssets";

interface SpiritDockProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChildId: string;
  nextTurnChildId?: string;
  onSelectChild: (childId: string) => void;
}

const regionFilters = ["全部", "红树林", "贝壳湾", "珍珠湾", "小镇", "老街", "竞技场"];

export function SpiritDock({ childrenWithProgress, spiritsById, selectedChildId, nextTurnChildId, onSelectChild }: SpiritDockProps) {
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
  const selectedIsNextTurn = selectedChild?.id === nextTurnChildId;
  const selectedStatus = selectedIsNextTurn ? "下一位" : "说成长";
  const dockClasses = [
    "spirit-dock",
    collapsed ? "collapsed is-collapsed" : "expanded is-expanded",
    childrenWithProgress.length > 18 ? "has-many-children" : "",
    selectedIsNextTurn ? "next-ready" : "",
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
          className={selectedIsNextTurn ? "dock-selected-summary next-ready" : "dock-selected-summary"}
          style={{ "--dock-accent": selectedSpirit?.accent ?? "#6ebf8b" } as CSSProperties}
          data-next-turn={selectedIsNextTurn ? "true" : undefined}
          aria-label={`当前孩子：${selectedChild.name}，${selectedStatus}`}
          onClick={() => onSelectChild(selectedChild.id)}
        >
          <span className="dock-avatar">
            {selectedIsNextTurn ? <span className="next-child-halo next-ready" aria-hidden="true" /> : null}
            {selectedAsset?.url ? <img src={selectedAsset.url} alt="" /> : <span className="dock-avatar-label">{selectedChild.name.slice(0, 1)}</span>}
          </span>
          <span className="dock-summary-copy">
            <small>当前</small>
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
            placeholder="搜名字..."
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
        className={selectedIsNextTurn ? "dock-selected-summary expanded next-ready" : "dock-selected-summary expanded"}
        style={{ "--dock-accent": selectedSpirit?.accent ?? "#6ebf8b" } as CSSProperties}
        data-next-turn={selectedIsNextTurn ? "true" : undefined}
        aria-label={`当前孩子：${selectedChild.name}，${selectedStatus}，全班${childrenWithProgress.length}人`}
      >
        <span className="dock-avatar">
          {selectedIsNextTurn ? <span className="next-child-halo next-ready" aria-hidden="true" /> : null}
          {selectedAsset?.url ? <img src={selectedAsset.url} alt="" /> : <span className="dock-avatar-label">{selectedChild.name.slice(0, 1)}</span>}
        </span>
        <span className="dock-selected-copy">
          <strong>{selectedChild.name}</strong>
          <em>{selectedStatus}</em>
          <small>全班 {childrenWithProgress.length}</small>
        </span>
      </div>
      <div className="dock-scroll" ref={dockScrollRef}>
        {filtered.map((child) => {
          const spirit = spiritsById.get(child.spiritId);
          const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;
          const isNextTurn = child.id === nextTurnChildId;
          return (
            <button
              key={child.id}
              className={`${child.id === selectedChildId ? "dock-spirit active" : "dock-spirit"} ${isNextTurn ? "next-ready" : ""}`.trim()}
              aria-current={child.id === selectedChildId ? "true" : undefined}
              aria-label={`${child.id === selectedChildId ? "当前孩子" : "选择孩子"}：${child.name}${isNextTurn ? "，下一位" : "，说成长"}`}
              data-next-turn={isNextTurn ? "true" : undefined}
              onClick={() => selectChildFromRoster(child.id)}
            >
              <span className="dock-avatar" style={{ "--dock-accent": spirit?.accent ?? "#6ebf8b" } as CSSProperties}>
                {isNextTurn ? <span className="next-child-halo next-ready" aria-hidden="true" /> : null}
                {asset?.url ? <img src={asset.url} alt="" /> : <span className="dock-avatar-label">{child.name.slice(0, 1)}</span>}
              </span>
              <strong>{child.name}</strong>
              <em>{isNextTurn ? "下一位" : "说成长"}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
