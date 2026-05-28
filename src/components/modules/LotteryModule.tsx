import { useEffect, useState } from "react";
import { Gift, Home, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { lotteryPrizes, type LotteryPrize } from "../../data/rewards";
import { getSpiritAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, SpiritDefinition } from "../../types";

interface LotteryModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  onSelectChild: (childId: string) => void;
  onFocusChild: (childId: string) => void;
}

interface DrawHistoryItem {
  id: string;
  childName: string;
  prizeName: string;
  rarity: LotteryPrize["rarity"];
}

function childSummary(child: ChildWithProgress) {
  return `Lv.${child.level} · ${child.xp} XP · #${child.rank}`;
}

export function LotteryModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  onSelectChild,
  onFocusChild,
}: LotteryModuleProps) {
  const [selectedChildId, setSelectedChildId] = useState(selectedChild.id);
  const [latestPrize, setLatestPrize] = useState<LotteryPrize | undefined>();
  const [drawHistory, setDrawHistory] = useState<DrawHistoryItem[]>([]);
  const activeChild = childrenWithProgress.find((child) => child.id === selectedChildId) ?? selectedChild;
  const activeSpirit = spiritsById.get(activeChild.spiritId);
  const activeAsset = activeSpirit ? getSpiritAsset(activeSpirit, activeChild.state) : undefined;

  useEffect(() => {
    if (childrenWithProgress.some((child) => child.id === selectedChildId)) return;
    setSelectedChildId(selectedChild.id);
  }, [childrenWithProgress, selectedChild.id, selectedChildId]);

  const chooseChild = (childId: string) => {
    setSelectedChildId(childId);
    onSelectChild(childId);
  };

  const drawPrize = () => {
    const prize = lotteryPrizes[Math.floor(Math.random() * lotteryPrizes.length)];
    setLatestPrize(prize);
    setDrawHistory((current) => [
      { id: `${Date.now()}-${prize.id}`, childName: activeChild.name, prizeName: prize.name, rarity: prize.rarity },
      ...current,
    ]);
  };

  return (
    <section className="module-page reward-page lottery-page" aria-labelledby="lottery-title">
      <div className="reward-header">
        <div>
          <span className="module-eyebrow">
            <Gift size={18} />
            班级激励
          </span>
          <h1 id="lottery-title">积分抽奖</h1>
          <p>选择孩子后进行本地随机抽奖。当前版本只演示奖品结果，不消耗 XP，也不写入成长流水。</p>
        </div>
        <button type="button" className="reward-home-button" onClick={() => onFocusChild(activeChild.id)}>
          <Home size={18} />
          聚焦成长岛
        </button>
      </div>

      <div className="reward-layout">
        <section className="lottery-stage" aria-label="抽奖操作台">
          <div className="reward-child-card">
            <div className="reward-child-avatar">
              {activeAsset?.url ? <img src={activeAsset.url} alt={`${activeChild.petName} 精灵`} /> : activeChild.name.slice(0, 1)}
            </div>
            <div>
              <label htmlFor="lottery-child">抽奖孩子</label>
              <select id="lottery-child" name="lotteryChild" value={activeChild.id} onChange={(event) => chooseChild(event.target.value)}>
                {childrenWithProgress.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name} · {child.petName}
                  </option>
                ))}
              </select>
              <em>{childSummary(activeChild)}</em>
            </div>
          </div>

          <div className="lottery-result-card">
            <div className="lottery-result-orb">
              <Gift size={48} />
            </div>
            {latestPrize ? (
              <>
                <span>{latestPrize.rarity}</span>
                <strong>{latestPrize.name}</strong>
                <p>{latestPrize.description}</p>
              </>
            ) : (
              <>
                <span>等待抽奖</span>
                <strong>本地奖池</strong>
                <p>点击开始抽奖后展示结果。此处不会扣减孩子 XP。</p>
              </>
            )}
          </div>

          <div className="reward-actions">
            <button type="button" className="reward-primary" onClick={drawPrize}>
              <Sparkles size={20} />
              开始抽奖
            </button>
            <button type="button" className="reward-secondary" onClick={() => setLatestPrize(undefined)}>
              <RotateCcw size={19} />
              清空结果
            </button>
          </div>
        </section>

        <aside className="reward-side" aria-label="抽奖奖池和记录">
          <section className="reward-panel">
            <div className="reward-panel-title">
              <Trophy size={19} />
              <strong>静态奖池</strong>
            </div>
            <div className="lottery-prize-grid">
              {lotteryPrizes.map((prize) => (
                <article key={prize.id}>
                  <span>{prize.rarity}</span>
                  <strong>{prize.name}</strong>
                  <p>{prize.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="reward-panel lottery-history-panel">
            <div className="reward-panel-title">
              <Gift size={19} />
              <strong>本地记录</strong>
            </div>
            {drawHistory.length === 0 ? (
              <p className="reward-muted">本轮还没有抽奖结果。</p>
            ) : (
              <ol className="lottery-history-list">
                {drawHistory.slice(0, 6).map((item) => (
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
