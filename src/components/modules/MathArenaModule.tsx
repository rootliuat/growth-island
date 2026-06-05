import { useEffect, useMemo, useState } from "react";
import { Home, Play, RotateCcw, Shield, Shell, Sparkles, Trophy } from "lucide-react";
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
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [completedChildId, setCompletedChildId] = useState<string | undefined>();

  const childById = useMemo(() => new Map(childrenWithProgress.map((child) => [child.id, child])), [childrenWithProgress]);
  const player = childById.get(playerId) ?? selectedChild;
  const opponent = childById.get(opponentId) ?? getNextOpponent(childrenWithProgress, player.id);
  const opponentOptions = childrenWithProgress.filter((child) => child.id !== player.id);
  const recentMathRecords = useMemo(
    () => recentRecords.filter((record) => record.source === "math-pk" && !record.undone).slice(0, 5),
    [recentRecords],
  );
  const completedChild = completedChildId ? childById.get(completedChildId) : undefined;
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
    setCompletedChildId(undefined);
    setSessionStarted(false);
    setSessionKey((current) => current + 1);
  };

  const startBattle = () => {
    if (!opponent || !canStart) return;
    setCompletedChildId(undefined);
    setSessionStarted(true);
    setSessionKey((current) => current + 1);
    onSelectChild(player.id);
  };

  const handleWin = (nextCompletedChild: ChildWithProgress) => {
    setCompletedChildId(nextCompletedChild.id);
    onSelectChild(nextCompletedChild.id);
    onWin(nextCompletedChild);
  };

  const choosePlayer = (childId: string) => {
    setPlayerId(childId);
    onSelectChild(childId);
    setCompletedChildId(undefined);
    setSessionStarted(false);
    if (childId === opponentId) {
      const fallback = childrenWithProgress.find((child) => child.id !== childId);
      if (fallback) setOpponentId(fallback.id);
    }
  };

  const chooseOpponent = (childId: string) => {
    setOpponentId(childId);
    setCompletedChildId(undefined);
    setSessionStarted(false);
  };

  return (
    <section className="module-page math-arena-page" aria-labelledby="math-arena-title">
      <div className="math-arena-header">
        <div className="math-arena-title-pack">
          <span className="module-eyebrow">
            <Shell size={18} />
            算术点亮
          </span>
          <h1 id="math-arena-title">贝壳算术</h1>
          <span className="math-arena-round-chip">{completedChild ? `${completedChild.name} 点亮` : sessionStarted ? "点亮中" : "待开始"}</span>
        </div>
        <button type="button" className="math-arena-home-button" onClick={() => onFocusChild(completedChild?.id ?? player.id)}>
          <Home size={18} />
          回岛
        </button>
      </div>

      <div className="math-arena-layout">
        <section className="math-arena-stage" aria-label="贝壳算术区">
          <div className="math-arena-setup">
            <div className="math-arena-fighter-lane" aria-label="算术伙伴">
              <FighterSelectCard
                label="小伙伴 A"
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
                label="小伙伴 B"
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
                {sessionStarted ? "重新开始" : "开始点亮"}
              </button>
              <button type="button" className="math-arena-secondary" onClick={resetBattle}>
                <RotateCcw size={18} />
                重新选人
              </button>
            </div>
          </div>

          <div className={`math-arena-battle-shell ${sessionStarted ? "is-live" : "is-idle"} ${completedChild ? "has-winner" : ""}`}>
            <div className="math-arena-stage-strip" aria-label="点亮状态">
              <span>贝壳赛道</span>
              <strong>{completedChild ? `${completedChild.name} 完成点亮` : sessionStarted ? "答题进行中" : "选择小伙伴开始"}</strong>
              <em>{completedChild ? "数学能量点亮" : "每题一格光"}</em>
            </div>
            {completedChild && (
              <div className="math-arena-victory-badge" role="status" aria-live="polite">
                <Trophy size={18} />
                {completedChild.name} 点亮数学能量
              </div>
            )}
            {sessionStarted && opponent ? (
              <MathPkBattle key={sessionKey} player={player} opponent={opponent} spiritsById={spiritsById} onWin={handleWin} />
            ) : (
              <div className="math-arena-empty">
                <Shell size={34} />
                <strong>等待开始</strong>
                <div className="math-arena-empty-chips" aria-label="点亮准备">
                  <span>两位伙伴</span>
                  <span>轮流答题</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="math-arena-side" aria-label="贝壳算术信息">
          <div className="math-arena-scoreboard">
            <div className="math-arena-side-title">
              <Trophy size={19} />
              <strong>光格看板</strong>
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
              disabled={!completedChild}
              onClick={() => completedChild && onFocusChild(completedChild.id)}
            >
              <Sparkles size={18} />
              {completedChild ? `回岛查看 ${completedChild.name}` : "完成后回岛"}
            </button>
          </div>

          <div className="math-arena-rules">
            <div className="math-arena-side-title">
              <Shield size={19} />
              <strong>点亮规则</strong>
            </div>
            <ul>
              <li>两位伙伴轮流答题。</li>
              <li>答对点亮一束光。</li>
              <li>答错不扣能量，换对方继续。</li>
              <li>完成光路后，点亮数学能量。</li>
            </ul>
          </div>

          <div className="math-arena-history">
            <div className="math-arena-side-title">
              <Shell size={19} />
              <strong>最近点亮</strong>
            </div>
            {recentMathRecords.length === 0 ? (
              <p className="math-arena-muted">还没有算术点亮。</p>
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
