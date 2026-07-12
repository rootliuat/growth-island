import { useEffect, useState } from "react";
import { Gift, Home, RotateCcw, Shell, Sparkles, Trophy } from "lucide-react";
import { lotteryPrizes, type LotteryPrize } from "../../data/rewards";
import { getSpiritAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, LotteryDrawRecord, SpiritDefinition } from "../../types";

interface LotteryModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  drawRecords: LotteryDrawRecord[];
  onSelectChild: (childId: string) => void;
  onDrawPrize: (childId: string, prize: LotteryPrize) => LotteryDrawRecord | undefined;
  onFocusChild: (childId: string) => void;
}

function childSummary(child: ChildWithProgress) {
  return `${child.petName} · 精灵能量`;
}

export function LotteryModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  drawRecords,
  onSelectChild,
  onDrawPrize,
  onFocusChild,
}: LotteryModuleProps) {
  const [selectedChildId, setSelectedChildId] = useState(selectedChild.id);
  const [latestPrize, setLatestPrize] = useState<LotteryPrize | undefined>();
  const activeChild = childrenWithProgress.find((child) => child.id === selectedChildId) ?? selectedChild;
  const activeSpirit = spiritsById.get(activeChild.spiritId);
  const activeAsset = activeSpirit ? getSpiritAsset(activeSpirit, activeChild.state) : undefined;
  const activeDraws = drawRecords.filter((record) => record.childId === activeChild.id).slice(0, 6);

  useEffect(() => {
    if (childrenWithProgress.some((child) => child.id === selectedChildId)) return;
    setSelectedChildId(selectedChild.id);
  }, [childrenWithProgress, selectedChild.id, selectedChildId]);

  const chooseChild = (childId: string) => {
    setSelectedChildId(childId);
    setLatestPrize(undefined);
    onSelectChild(childId);
  };

  const drawPrize = () => {
    const prize = lotteryPrizes[Math.floor(Math.random() * lotteryPrizes.length)];
    onDrawPrize(activeChild.id, prize);
    setLatestPrize(prize);
  };

  return (
    <section className="module-page reward-page lottery-page" aria-labelledby="lottery-title">
      <div className="reward-header module-compact-header">
        <div>
          <span className="module-eyebrow">
            <Shell size={18} aria-hidden="true" />
            贝池任务
          </span>
          <h1 id="lottery-title">幸运贝池</h1>
        </div>
        <button type="button" className="reward-home-button" onClick={() => onFocusChild(activeChild.id)}>
          <Home size={18} aria-hidden="true" />
          看精灵
        </button>
      </div>

      <div className="reward-layout">
        <section className="lottery-stage" aria-label="幸运贝池">
          <div className="reward-child-card">
            <div className="reward-child-avatar">
              {activeAsset?.url ? (
                <img src={activeAsset.url} alt={`${activeChild.name} 精灵`} width="94" height="94" />
              ) : (
                activeChild.name.slice(0, 1)
              )}
            </div>
            <div>
              <label htmlFor="lottery-child">本轮孩子</label>
              <select id="lottery-child" name="lotteryChild" value={activeChild.id} onChange={(event) => chooseChild(event.target.value)}>
                {childrenWithProgress.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
              <em>{childSummary(activeChild)}</em>
            </div>
          </div>

          <div className="lottery-result-card" role="status" aria-live="polite">
            <div className="lottery-result-orb">
              <Gift size={46} aria-hidden="true" />
            </div>
            {latestPrize ? (
              <>
                <div className="lottery-result-meta">
                  <span>{latestPrize.rarity}</span>
                  <em>{activeChild.name} 抽到</em>
                </div>
                <strong>{latestPrize.name}</strong>
                <p>{latestPrize.description}</p>
              </>
            ) : (
              <>
                <div className="lottery-result-meta">
                  <span>待抽贝签</span>
                  <em>{activeChild.name}</em>
                </div>
                <strong>贝池待开启</strong>
                <p>抽到后会留下贝签足迹。</p>
              </>
            )}
          </div>

          <div className="reward-actions">
            <button type="button" className="reward-primary" onClick={drawPrize}>
              <Sparkles size={20} aria-hidden="true" />
              抽贝签
            </button>
            <button type="button" className="reward-secondary" onClick={() => setLatestPrize(undefined)}>
              <RotateCcw size={19} aria-hidden="true" />
              收起结果
            </button>
          </div>
        </section>

        <aside className="reward-side" aria-label="贝池奖励和贝签足迹">
          <section className="reward-panel">
            <div className="reward-panel-title">
              <Trophy size={19} aria-hidden="true" />
              <strong>贝池奖励</strong>
            </div>
            <div className="lottery-prize-grid">
              {lotteryPrizes.map((prize) => (
                <article key={prize.id}>
                  <span>{prize.rarity}</span>
                  <strong>{prize.name}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="reward-panel lottery-history-panel">
            <div className="reward-panel-title">
              <Gift size={19} aria-hidden="true" />
              <strong>贝签足迹</strong>
            </div>
            {activeDraws.length === 0 ? (
              <p className="reward-muted">还没有贝签足迹。</p>
            ) : (
              <ol className="lottery-history-list">
                {activeDraws.map((item) => (
                  <li key={item.id}>
                    <span>{item.rarity}</span>
                    <strong>{item.childName}</strong>
                    <em>{item.prizeName}</em>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
