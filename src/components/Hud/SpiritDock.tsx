import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部");
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <section className={collapsed ? "spirit-dock collapsed" : "spirit-dock"}>
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
          <input value={query} placeholder="搜索幼儿或精灵" onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="dock-filters">
          {regionFilters.map((item) => (
            <button key={item} className={item === filter ? "active" : ""} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {collapsed && <div className="dock-selected-summary">{selectedChild.petName}</div>}
      <div className="dock-scroll">
        {filtered.map((child) => {
          const spirit = spiritsById.get(child.spiritId);
          const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;
          return (
            <button
              key={child.id}
              className={child.id === selectedChildId ? "dock-spirit active" : "dock-spirit"}
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
