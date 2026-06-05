import { Trophy } from "lucide-react";
import type { ChildWithProgress } from "../types";

interface LeaderboardProps {
  childrenWithProgress: ChildWithProgress[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}

export function Leaderboard({ childrenWithProgress, selectedChildId, onSelectChild }: LeaderboardProps) {
  const ranked = [...childrenWithProgress].sort((a, b) => a.rank - b.rank).slice(0, 3);

  return (
    <section className="leaderboard">
      <div className="section-title">
        <Trophy size={20} />
        <span>成长榜</span>
      </div>
      {ranked.map((child) => (
        <button
          key={child.id}
          className={child.id === selectedChildId ? "leader-row active" : "leader-row"}
          onClick={() => onSelectChild(child.id)}
        >
          <strong>{child.rank}</strong>
          <span>{child.name}</span>
          <em>{child.xp} 能量</em>
        </button>
      ))}
    </section>
  );
}
