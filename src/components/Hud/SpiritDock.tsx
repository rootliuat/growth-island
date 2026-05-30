import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChildWithProgress, SpiritDefinition } from "../../types";
import { getSpiritAsset } from "../../domain/spiritAssets";

interface SpiritDockProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}

const regionFilters = ["全部", "红树林", "贝壳湾", "珍珠湾", "小镇", "老街", "竞技场"];

export function SpiritDock({ childrenWithProgress, spiritsById, selectedChildId, onSelectChild }: SpiritDockProps) {
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

  if (collapsed) {
    return (
      <section className="spirit-dock collapsed">
        <button
          type="button"
          className="dock-selected-summary"
          style={{ "--dock-accent": selectedSpirit?.accent ?? "#6ebf8b" } as CSSProperties}
          onClick={() => onSelectChild(selectedChild.id)}
        >
          <span className="dock-avatar">
            {selectedAsset?.url ? <img src={selectedAsset.url} alt="" /> : selectedChild.name.slice(0, 1)}
          </span>
          <strong>{selectedChild.name}</strong>
          <em>Lv.{selectedChild.level}</em>
        </button>
        <button className="dock-collapse" type="button" onClick={() => setCollapsed(false)}>
          <ChevronUp size={16} />
          展开
        </button>
      </section>
    );
  }

  return (
    <section className="spirit-dock">
      <div className="dock-tools">
        <div className="dock-tools-head">
          <strong>
            {collapsed ? `${selectedChild.name} · Lv.${selectedChild.level}` : "精灵队伍"}
            <small>{filtered.length}/{childrenWithProgress.length}</small>
          </strong>
          <button className="dock-collapse" onClick={() => setCollapsed((current) => !current)}>
            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {collapsed ? "展开" : "收起"}
          </button>
        </div>
        <div className="dock-search">
          <Search size={16} />
          <input
            id="spirit-dock-search"
            name="spiritDockSearch"
            aria-label="搜索幼儿或精灵"
            value={query}
            placeholder="搜索幼儿或精灵"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="dock-filters">
          {regionFilters.map((item) => (
            <button key={item} className={item === filter ? "active" : ""} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
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
              onClick={() => onSelectChild(child.id)}
            >
              <span className="dock-avatar" style={{ "--dock-accent": spirit?.accent ?? "#6ebf8b" } as CSSProperties}>
                {asset?.url ? <img src={asset.url} alt="" /> : child.name.slice(0, 1)}
              </span>
              <strong>{child.name}</strong>
              <em>Lv.{child.level}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
