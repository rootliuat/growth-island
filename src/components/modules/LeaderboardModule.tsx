import { Flag, Home, MapPinned, Sparkles, Trophy } from "lucide-react";
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
  const topChild = ranked[0] ?? selectedChild;
  const topThree = ranked.slice(0, 3);
  const selectedRank = ranked.findIndex((child) => child.id === selectedChild.id) + 1;
  const selectedSpirit = spiritsById.get(selectedChild.spiritId);
  const selectedAsset = selectedSpirit ? getSpiritThumbnailAsset(selectedSpirit, selectedChild.state) : undefined;
  const totalXp = ranked.reduce((sum, child) => sum + child.xp, 0);

  return (
    <section className="module-page leaderboard-page" aria-labelledby="leaderboard-title">
      <div className="leaderboard-header module-compact-header">
        <div>
          <span className="module-eyebrow">
            <Trophy size={18} aria-hidden="true" />
            班级荣誉
          </span>
          <h1 id="leaderboard-title">荣誉广场</h1>
        </div>
        <button type="button" className="leaderboard-home-button" onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} aria-hidden="true" />
          看精灵
        </button>
      </div>

      <div className="leaderboard-layout">
        <section className="leaderboard-main" aria-label="成长总榜">
          <section className="leaderboard-plaza-stage" aria-label="荣誉广场今日领航">
            <div className="leaderboard-plaza-copy">
              <span>
                <Flag size={17} aria-hidden="true" />
                今日领航
              </span>
              <strong>{topChild.name} 站上荣誉台</strong>
              <div className="leaderboard-plaza-stats" aria-label="班级荣誉统计">
                <span>{ranked.length} 位伙伴</span>
                <span>{totalXp} 能量</span>
              </div>
            </div>
            <div className="leaderboard-honor-stand" aria-label="星光前三">
              {topThree.map((child, index) => {
                const spirit = spiritsById.get(child.spiritId);
                const asset = spirit ? getSpiritThumbnailAsset(spirit, child.state) : undefined;
                return (
                  <button key={child.id} type="button" className={`leaderboard-honor-token rank-${index + 1}`} onClick={() => onFocusChild(child.id)}>
                    <span className="leaderboard-honor-rank">#{child.rank}</span>
                    <span className="leaderboard-honor-avatar">
                      {asset?.url ? <img src={asset.url} alt={`${child.name} 精灵`} width={72} height={72} loading="lazy" decoding="async" /> : child.name.slice(0, 1)}
                    </span>
                    <strong>{child.name}</strong>
                    <em>{child.xp} 能量</em>
                    <span className="leaderboard-row-action">看精灵</span>
                  </button>
                );
              })}
            </div>
            <div className="leaderboard-selected-token">
              <span className="leaderboard-selected-avatar">
                {selectedAsset?.url ? <img src={selectedAsset.url} alt={`${selectedChild.name} 精灵`} width={62} height={62} loading="lazy" decoding="async" /> : selectedChild.name.slice(0, 1)}
              </span>
              <div>
                <span>
                  <Sparkles size={16} aria-hidden="true" />
                  正在查看
                </span>
                <strong>{selectedChild.name}</strong>
                <em>第{selectedRank || selectedChild.rank}名 · 成长能量 {selectedChild.xp}</em>
              </div>
            </div>
          </section>

          <section className="leaderboard-list-panel">
            <div className="leaderboard-list-title">
              <span>广场榜墙</span>
              <strong>{ranked.length} 位伙伴</strong>
            </div>
            <ol className="leaderboard-list">
              {ranked.map((child) => {
                const isSelected = child.id === selectedChild.id;
                const spirit = spiritsById.get(child.spiritId);
                const asset = spirit ? getSpiritThumbnailAsset(spirit, child.state) : undefined;
                return (
                  <li key={child.id} className={isSelected ? "is-selected" : undefined}>
                    <button
                      type="button"
                      aria-current={isSelected ? "true" : undefined}
                      aria-label={`第${child.rank}名，${child.name}，成长能量 ${child.xp}，看精灵`}
                      onClick={() => onFocusChild(child.id)}
                    >
                      <span className="leaderboard-rank">#{child.rank}</span>
                      <span className="leaderboard-row-avatar">
                        {asset?.url ? <img src={asset.url} alt={`${child.name} 精灵`} width={50} height={50} loading="lazy" decoding="async" /> : child.name.slice(0, 1)}
                      </span>
                      <span className="leaderboard-child-name">
                        <strong>{child.name}</strong>
                      </span>
                      <span className="leaderboard-level">能量</span>
                      <span className="leaderboard-xp">{child.xp}</span>
                      <span className="leaderboard-row-action">
                        <MapPinned size={15} aria-hidden="true" />
                        看精灵
                      </span>
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
