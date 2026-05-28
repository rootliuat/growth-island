import { useEffect, useMemo, useState } from "react";
import { Home, Play, RotateCcw, Shield, Sparkles, Swords, Trophy } from "lucide-react";
import { getSpiritAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition } from "../../types";
import { MathPkBattle } from "../MathPkBattle";

interface MathArenaModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  recentRecords: LedgerRecord[];
  onSelectChild: (childId: string) => void;
  onWin: (winner: ChildWithProgress) => void;
  onFocusChild: (childId: string) => void;
}

function childSummary(child: ChildWithProgress) {
  return `Lv.${child.level} · ${child.xp} XP · #${child.rank}`;
}

function getNextOpponent(children: ChildWithProgress[], playerId: string) {
  return children.find((child) => child.id !== playerId);
}

function formatLogTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

export function MathArenaModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  recentRecords,
  onSelectChild,
  onWin,
  onFocusChild,
}: MathArenaModuleProps) {
  const initialOpponent = getNextOpponent(childrenWithProgress, selectedChild.id) ?? childrenWithProgress[0];
  const [playerId, setPlayerId] = useState(selectedChild.id);
  const [opponentId, setOpponentId] = useState(initialOpponent?.id ?? selectedChild.id);
  const [battleStarted, setBattleStarted] = useState(false);
  const [battleKey, setBattleKey] = useState(0);
  const [winnerId, setWinnerId] = useState<string | undefined>();

  const childById = useMemo(() => new Map(childrenWithProgress.map((child) => [child.id, child])), [childrenWithProgress]);
  const player = childById.get(playerId) ?? selectedChild;
  const opponent = childById.get(opponentId) ?? getNextOpponent(childrenWithProgress, player.id);
  const opponentOptions = childrenWithProgress.filter((child) => child.id !== player.id);
  const recentMathRecords = useMemo(
    () => recentRecords.filter((record) => record.source === "math-pk" && !record.undone).slice(0, 5),
    [recentRecords],
  );
  const winner = winnerId ? childById.get(winnerId) : undefined;
  const canStart = Boolean(player && opponent && player.id !== opponent.id);

  useEffect(() => {
    if (childById.has(playerId)) return;
    setPlayerId(selectedChild.id);
  }, [childById, playerId, selectedChild.id]);

  useEffect(() => {
    if (opponent && opponent.id !== player.id) return;
    const fallback = getNextOpponent(childrenWithProgress, player.id);
    if (fallback) setOpponentId(fallback.id);
  }, [childrenWithProgress, opponent, player.id]);

  const resetBattle = () => {
    setWinnerId(undefined);
    setBattleStarted(false);
    setBattleKey((current) => current + 1);
  };

  const startBattle = () => {
    if (!opponent || !canStart) return;
    setWinnerId(undefined);
    setBattleStarted(true);
    setBattleKey((current) => current + 1);
    onSelectChild(player.id);
  };

  const handleWin = (nextWinner: ChildWithProgress) => {
    setWinnerId(nextWinner.id);
    onSelectChild(nextWinner.id);
    onWin(nextWinner);
  };

  const choosePlayer = (childId: string) => {
    setPlayerId(childId);
    onSelectChild(childId);
    setWinnerId(undefined);
    setBattleStarted(false);
    if (childId === opponentId) {
      const fallback = childrenWithProgress.find((child) => child.id !== childId);
      if (fallback) setOpponentId(fallback.id);
    }
  };

  const chooseOpponent = (childId: string) => {
    setOpponentId(childId);
    setWinnerId(undefined);
    setBattleStarted(false);
  };

  return (
    <section className="module-page math-arena-page" aria-labelledby="math-arena-title">
      <div className="math-arena-header">
        <div>
          <span className="module-eyebrow">
            <Swords size={18} />
            数学魔法 PK
          </span>
          <h1 id="math-arena-title">数学竞技场</h1>
          <p>选择两名孩子进行 20 以内加减法对战。答对造成 20 伤害，胜者 +30 XP 并写入成长记录。</p>
        </div>
        <button type="button" className="math-arena-home-button" onClick={() => onFocusChild(winner?.id ?? player.id)}>
          <Home size={18} />
          聚焦成长岛
        </button>
      </div>

      <div className="math-arena-layout">
        <section className="math-arena-stage" aria-label="数学对战区">
          <div className="math-arena-setup">
            <FighterSelectCard
              label="左侧出战"
              selectId="math-arena-player"
              child={player}
              childrenWithProgress={childrenWithProgress}
              spiritsById={spiritsById}
              onChange={choosePlayer}
            />
            <FighterSelectCard
              label="右侧出战"
              selectId="math-arena-opponent"
              child={opponent ?? player}
              childrenWithProgress={opponentOptions}
              spiritsById={spiritsById}
              onChange={chooseOpponent}
            />
            <div className="math-arena-command-panel">
              <button type="button" className="math-arena-primary" onClick={startBattle} disabled={!canStart}>
                <Play size={19} />
                {battleStarted ? "重新开始" : "开始对战"}
              </button>
              <button type="button" className="math-arena-secondary" onClick={resetBattle}>
                <RotateCcw size={18} />
                重置战局
              </button>
            </div>
          </div>

          <div className="math-arena-battle-shell">
            {battleStarted && opponent ? (
              <MathPkBattle key={battleKey} player={player} opponent={opponent} spiritsById={spiritsById} onWin={handleWin} />
            ) : (
              <div className="math-arena-empty">
                <Swords size={34} />
                <strong>等待开战</strong>
                <p>先确认左右两位孩子，再开始 1v1 数学魔法 PK。</p>
              </div>
            )}
          </div>
        </section>

        <aside className="math-arena-side" aria-label="数学竞技场信息">
          <div className="math-arena-scoreboard">
            <div className="math-arena-side-title">
              <Trophy size={19} />
              <strong>本场状态</strong>
            </div>
            <dl>
              <div>
                <dt>规则</dt>
                <dd>20 内加减</dd>
              </div>
              <div>
                <dt>伤害</dt>
                <dd>20 HP</dd>
              </div>
              <div>
                <dt>奖励</dt>
                <dd>+30 XP</dd>
              </div>
            </dl>
            <button
              type="button"
              className="math-arena-focus-winner"
              disabled={!winner}
              onClick={() => winner && onFocusChild(winner.id)}
            >
              <Sparkles size={18} />
              {winner ? `聚焦 ${winner.name}` : "等待胜者"}
            </button>
          </div>

          <div className="math-arena-rules">
            <div className="math-arena-side-title">
              <Shield size={19} />
              <strong>课堂规则</strong>
            </div>
            <ul>
              <li>双方初始 HP 100。</li>
              <li>答对后攻击，对方减少 20 HP。</li>
              <li>答错不扣分，回合交给对方。</li>
              <li>HP 归零的一方失败，胜者写入成长记录。</li>
            </ul>
          </div>

          <div className="math-arena-history">
            <div className="math-arena-side-title">
              <Swords size={19} />
              <strong>最近 PK</strong>
            </div>
            {recentMathRecords.length === 0 ? (
              <p className="math-arena-muted">还没有数学 PK 记录。</p>
            ) : (
              <ol>
                {recentMathRecords.map((record) => {
                  const child = childById.get(record.childId);
                  return (
                    <li key={record.id}>
                      <span>+{record.delta}</span>
                      <div>
                        <strong>{child?.name ?? "未知孩子"}</strong>
                        <em>{formatLogTime(record.createdAt)}</em>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function FighterSelectCard({
  label,
  selectId,
  child,
  childrenWithProgress,
  spiritsById,
  onChange,
}: {
  label: string;
  selectId: string;
  child: ChildWithProgress;
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  onChange: (childId: string) => void;
}) {
  const spirit = spiritsById.get(child.spiritId);
  const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;

  return (
    <article className="math-fighter-card">
      <div className="math-fighter-avatar">
        {asset?.url ? <img src={asset.url} alt={`${child.petName} 精灵`} /> : <span>{child.name.slice(0, 1)}</span>}
      </div>
      <div className="math-fighter-copy">
        <label htmlFor={selectId}>{label}</label>
        <select id={selectId} name={selectId} value={child.id} onChange={(event) => onChange(event.target.value)}>
          {childrenWithProgress.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} · {option.petName}
            </option>
          ))}
        </select>
        <em>{childSummary(child)}</em>
      </div>
    </article>
  );
}
