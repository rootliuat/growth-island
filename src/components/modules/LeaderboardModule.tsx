import { Home } from "lucide-react";
import { getSpiritThumbnailAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, SpiritDefinition } from "../../types";

interface LeaderboardModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  onFocusChild: (childId: string) => void;
}

export function LeaderboardModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  onFocusChild,
}: LeaderboardModuleProps) {
  const ranked = [...childrenWithProgress].sort((a, b) => a.rank - b.rank);

  return (
    <section className="module-page leaderboard-page" aria-labelledby="leaderboard-title">
      <div className="leaderboard-header">
        <div>
          <h1 id="leaderboard-title">排行榜</h1>
        </div>
        <button type="button" className="leaderboard-home-button" onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} />
          回岛
        </button>
      </div>

      <div className="leaderboard-layout">
        <section className="leaderboard-main" aria-label="成长总榜">
          <section className="leaderboard-list-panel">
            <div className="leaderboard-list-title">
              <span>排行榜</span>
            </div>
            <ol className="leaderboard-list">
              {ranked.map((child) => {
                const isSelected = child.id === selectedChild.id;
                const spirit = spiritsById.get(child.spiritId);
                const asset = spirit ? getSpiritThumbnailAsset(spirit, child.state) : undefined;
                return (
                  <li key={child.id} className={isSelected ? "is-selected" : undefined}>
                    <button type="button" onClick={() => onFocusChild(child.id)}>
                      <span className="leaderboard-rank">#{child.rank}</span>
                      <span className="leaderboard-row-avatar">
                        {asset?.url ? <img src={asset.url} alt={`${child.name} 精灵`} loading="lazy" decoding="async" /> : child.name.slice(0, 1)}
                      </span>
                      <span className="leaderboard-child-name">
                        <strong>{child.name}</strong>
                      </span>
                      <span className="leaderboard-level">Lv.{child.level}</span>
                      <span className="leaderboard-xp">{child.xp} XP</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </section>
      </div>
    </section>
  );
}
