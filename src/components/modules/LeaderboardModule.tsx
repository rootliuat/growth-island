import { Home, Medal, Sparkles, Trophy, Users } from "lucide-react";
import { getSpiritAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, SpiritDefinition } from "../../types";

interface LeaderboardModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  onFocusChild: (childId: string) => void;
}

const podiumLabels = ["冠军", "亚军", "季军"];
const podiumOrder = [1, 0, 2];

function childSummary(child: ChildWithProgress) {
  return `Lv.${child.level} · ${child.xp} XP`;
}

export function LeaderboardModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  onFocusChild,
}: LeaderboardModuleProps) {
  const ranked = [...childrenWithProgress].sort((a, b) => a.rank - b.rank);
  const topThree = ranked.slice(0, 3);
  const podiumChildren = podiumOrder.map((index) => topThree[index]).filter((child): child is ChildWithProgress => Boolean(child));
  const totalXp = childrenWithProgress.reduce((sum, child) => sum + child.xp, 0);
  const levelTwoPlus = childrenWithProgress.filter((child) => child.level >= 2).length;
  const selectedRank = ranked.find((child) => child.id === selectedChild.id)?.rank ?? selectedChild.rank;

  return (
    <section className="module-page leaderboard-page" aria-labelledby="leaderboard-title">
      <div className="leaderboard-header">
        <div>
          <span className="module-eyebrow">
            <Trophy size={18} />
            成长总榜
          </span>
          <h1 id="leaderboard-title">排行榜</h1>
          <p>按当前 XP 展示全班总榜，前三名突出展示。点击孩子即可回到成长岛聚焦对应精灵家园。</p>
        </div>
        <button type="button" className="leaderboard-home-button" onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} />
          聚焦成长岛
        </button>
      </div>

      <div className="leaderboard-layout">
        <section className="leaderboard-main" aria-label="成长总榜">
          <div className="leaderboard-podium">
            {podiumChildren.map((child) => (
              <PodiumCard key={child.id} child={child} spiritsById={spiritsById} onFocusChild={onFocusChild} />
            ))}
          </div>

          <section className="leaderboard-list-panel">
            <div className="leaderboard-list-title">
              <span>
                <Medal size={19} />
                总榜名单
              </span>
              <strong>{ranked.length} 名孩子</strong>
            </div>
            <ol className="leaderboard-list">
              {ranked.map((child) => {
                const isSelected = child.id === selectedChild.id;
                return (
                  <li key={child.id} className={isSelected ? "is-selected" : undefined}>
                    <button type="button" onClick={() => onFocusChild(child.id)}>
                      <span className="leaderboard-rank">#{child.rank}</span>
                      <span className="leaderboard-child-name">
                        <strong>{child.name}</strong>
                        <em>{child.petName}</em>
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

        <aside className="leaderboard-side" aria-label="排行榜统计">
          <section className="leaderboard-stat-panel">
            <div className="leaderboard-panel-title">
              <Sparkles size={19} />
              <strong>班级概览</strong>
            </div>
            <div className="leaderboard-stats">
              <article>
                <Users size={20} />
                <span>幼儿数</span>
                <strong>{childrenWithProgress.length}</strong>
              </article>
              <article>
                <Trophy size={20} />
                <span>总 XP</span>
                <strong>{totalXp}</strong>
              </article>
              <article>
                <Sparkles size={20} />
                <span>Lv.2+</span>
                <strong>{levelTwoPlus}</strong>
              </article>
            </div>
          </section>

          <section className="leaderboard-selected-panel">
            <div className="leaderboard-panel-title">
              <Home size={19} />
              <strong>当前孩子</strong>
            </div>
            <SelectedChildCard child={selectedChild} rank={selectedRank} spiritsById={spiritsById} onFocusChild={onFocusChild} />
          </section>

          <section className="leaderboard-note-panel">
            <div className="leaderboard-panel-title">
              <Medal size={19} />
              <strong>榜单范围</strong>
            </div>
            <p>当前版本展示总榜，分周榜和月榜先保留为后续能力，不影响首页 XP 和成长记录。</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

function PodiumCard({
  child,
  spiritsById,
  onFocusChild,
}: {
  child: ChildWithProgress;
  spiritsById: Map<string, SpiritDefinition>;
  onFocusChild: (childId: string) => void;
}) {
  const spirit = spiritsById.get(child.spiritId);
  const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;
  const podiumLabel = podiumLabels[child.rank - 1] ?? `第 ${child.rank} 名`;

  return (
    <button type="button" className={`podium-card rank-${child.rank}`} onClick={() => onFocusChild(child.id)}>
      <span className="podium-badge">#{child.rank}</span>
      <div className="podium-avatar">
        {asset?.url ? <img src={asset.url} alt={`${child.petName} 精灵`} /> : <span>{child.name.slice(0, 1)}</span>}
      </div>
      <strong>{child.name}</strong>
      <em>{child.petName}</em>
      <span className="podium-xp">{childSummary(child)}</span>
      <small>{podiumLabel}</small>
    </button>
  );
}

function SelectedChildCard({
  child,
  rank,
  spiritsById,
  onFocusChild,
}: {
  child: ChildWithProgress;
  rank: number;
  spiritsById: Map<string, SpiritDefinition>;
  onFocusChild: (childId: string) => void;
}) {
  const spirit = spiritsById.get(child.spiritId);
  const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;

  return (
    <article className="leaderboard-selected-card">
      <div className="leaderboard-selected-avatar">
        {asset?.url ? <img src={asset.url} alt={`${child.petName} 精灵`} /> : <span>{child.name.slice(0, 1)}</span>}
      </div>
      <div>
        <span>当前排名 #{rank}</span>
        <strong>{child.name}</strong>
        <em>
          {child.petName} · {childSummary(child)}
        </em>
      </div>
      <button type="button" onClick={() => onFocusChild(child.id)}>
        <Home size={18} />
        回到成长岛
      </button>
    </article>
  );
}
