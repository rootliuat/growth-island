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
  return `${child.petName} · 精灵能量`;
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
        <div className="math-arena-title-pack">
          <span className="module-eyebrow">
            <Swords size={18} />
            数学魔法
          </span>
          <h1 id="math-arena-title">数学闯关岛</h1>
          <span className="math-arena-round-chip">{winner ? `${winner.name} 点亮` : battleStarted ? "闯关中" : "待开始"}</span>
        </div>
        <button type="button" className="math-arena-home-button" onClick={() => onFocusChild(winner?.id ?? player.id)}>
          <Home size={18} />
          回岛
        </button>
      </div>

      <div className="math-arena-layout">
        <section className="math-arena-stage" aria-label="数学闯关区">
          <div className="math-arena-setup">
            <div className="math-arena-fighter-lane" aria-label="闯关伙伴">
              <FighterSelectCard
                label="左侧答题"
                selectId="math-arena-player"
                child={player}
                childrenWithProgress={childrenWithProgress}
                spiritsById={spiritsById}
                onChange={choosePlayer}
              />
              <span className="math-arena-vs-token" aria-hidden="true">
                一起
              </span>
              <FighterSelectCard
                label="右侧答题"
                selectId="math-arena-opponent"
                child={opponent ?? player}
                childrenWithProgress={opponentOptions}
                spiritsById={spiritsById}
                onChange={chooseOpponent}
              />
            </div>
            <div className="math-arena-command-panel">
              <button type="button" className="math-arena-primary" onClick={startBattle} disabled={!canStart}>
                <Play size={19} />
                {battleStarted ? "重新开始" : "开始闯关"}
              </button>
              <button type="button" className="math-arena-secondary" onClick={resetBattle}>
                <RotateCcw size={18} />
                重新准备
              </button>
            </div>
          </div>

          <div className={`math-arena-battle-shell ${battleStarted ? "is-live" : "is-idle"} ${winner ? "has-winner" : ""}`}>
            <div className="math-arena-stage-strip" aria-label="闯关状态">
              <span>贝壳赛道</span>
              <strong>{winner ? `${winner.name} 闯关完成` : battleStarted ? "答题进行中" : "选择小伙伴开始"}</strong>
              <em>{winner ? "数学能量点亮" : "每题一束光"}</em>
            </div>
            {winner && (
              <div className="math-arena-victory-badge" role="status" aria-live="polite">
                <Trophy size={18} />
                {winner.name} 点亮数学能量
              </div>
            )}
            {battleStarted && opponent ? (
              <MathPkBattle key={battleKey} player={player} opponent={opponent} spiritsById={spiritsById} onWin={handleWin} />
            ) : (
              <div className="math-arena-empty">
                <Swords size={34} />
                <strong>等待开始</strong>
                <div className="math-arena-empty-chips" aria-label="闯关准备">
                  <span>两位伙伴</span>
                  <span>轮流答题</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="math-arena-side" aria-label="数学竞技场信息">
          <div className="math-arena-scoreboard">
            <div className="math-arena-side-title">
              <Trophy size={19} />
              <strong>奖杯看板</strong>
            </div>
            <dl>
              <div>
                <dt>规则</dt>
                <dd>20 内加减</dd>
              </div>
              <div>
                <dt>光点</dt>
                <dd>每题一束光</dd>
              </div>
              <div>
                <dt>能量</dt>
                <dd>数学光点</dd>
              </div>
            </dl>
            <button
              type="button"
              className="math-arena-focus-winner"
              disabled={!winner}
              onClick={() => winner && onFocusChild(winner.id)}
            >
              <Sparkles size={18} />
              {winner ? `回岛查看 ${winner.name}` : "等待胜者"}
            </button>
          </div>

          <div className="math-arena-rules">
            <div className="math-arena-side-title">
              <Shield size={19} />
              <strong>赛场规则</strong>
            </div>
            <ul>
              <li>两位伙伴轮流答题。</li>
              <li>答对点亮一束光。</li>
              <li>答错不扣能量，换对方继续。</li>
              <li>完成闯关后，胜者点亮数学能量。</li>
            </ul>
          </div>

          <div className="math-arena-history">
            <div className="math-arena-side-title">
              <Swords size={19} />
              <strong>最近闯关</strong>
            </div>
            {recentMathRecords.length === 0 ? (
              <p className="math-arena-muted">还没有数学闯关。</p>
            ) : (
              <ol>
                {recentMathRecords.map((record) => {
                  const child = childById.get(record.childId);
                  return (
                    <li key={record.id}>
                      <span>点亮</span>
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
        {asset?.url ? <img src={asset.url} alt={`${child.name} 精灵`} /> : <span>{child.name.slice(0, 1)}</span>}
      </div>
      <div className="math-fighter-copy">
        <label htmlFor={selectId}>{label}</label>
        <select id={selectId} name={selectId} value={child.id} onChange={(event) => onChange(event.target.value)}>
          {childrenWithProgress.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <em>{childSummary(child)}</em>
      </div>
    </article>
  );
}
