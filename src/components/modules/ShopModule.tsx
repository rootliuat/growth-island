import { useEffect, useState } from "react";
import { Check, Home, Lock, ShoppingBag, Sparkles } from "lucide-react";
import { shopRewards, type ShopReward } from "../../data/rewards";
import { getSpiritAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, SpiritDefinition } from "../../types";

interface ShopModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  onSelectChild: (childId: string) => void;
  onFocusChild: (childId: string) => void;
}

interface ShopIntent {
  reward: ShopReward;
  childName: string;
  affordable: boolean;
}

function childSummary(child: ChildWithProgress) {
  return `Lv.${child.level} · ${child.xp} XP · #${child.rank}`;
}

export function ShopModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  onSelectChild,
  onFocusChild,
}: ShopModuleProps) {
  const [selectedChildId, setSelectedChildId] = useState(selectedChild.id);
  const [lastIntent, setLastIntent] = useState<ShopIntent | undefined>();
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
    setLastIntent(undefined);
  };

  const chooseReward = (reward: ShopReward) => {
    setLastIntent({
      reward,
      childName: activeChild.name,
      affordable: activeChild.xp >= reward.cost,
    });
  };

  return (
    <section className="module-page reward-page shop-page" aria-labelledby="shop-title">
      <div className="reward-header">
        <div>
          <span className="module-eyebrow">
            <ShoppingBag size={18} />
            奖励兑换
          </span>
          <h1 id="shop-title">积分商店</h1>
          <p>选择孩子查看奖励门槛。本轮只确认资格，不扣减 XP。</p>
        </div>
        <button type="button" className="reward-home-button" onClick={() => onFocusChild(activeChild.id)}>
          <Home size={18} />
          回到成长岛
        </button>
      </div>

      <div className="shop-layout">
        <aside className="shop-balance-panel" aria-label="孩子积分余额">
          <div className="reward-child-card">
            <div className="reward-child-avatar">
              {activeAsset?.url ? <img src={activeAsset.url} alt={`${activeChild.name} 精灵`} /> : activeChild.name.slice(0, 1)}
            </div>
            <div>
              <label htmlFor="shop-child">兑换孩子</label>
              <select id="shop-child" name="shopChild" value={activeChild.id} onChange={(event) => chooseChild(event.target.value)}>
                {childrenWithProgress.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
              <em>{childSummary(activeChild)}</em>
            </div>
          </div>

          <section className="shop-balance-card">
            <span>当前 XP</span>
            <strong>{activeChild.xp}</strong>
            <p>商店不会改变成长 XP；这里只判断是否达到兑换门槛。</p>
          </section>

          <section className="shop-intent-card">
            {lastIntent ? (
              <>
                {lastIntent.affordable ? <Check size={22} /> : <Lock size={22} />}
                <strong>{lastIntent.affordable ? "已选择奖励" : "XP 暂时不足"}</strong>
                <p>
                  {lastIntent.childName} · {lastIntent.reward.name} · 需要 {lastIntent.reward.cost} XP
                </p>
              </>
            ) : (
              <>
                <Sparkles size={22} />
                <strong>选择一个奖品</strong>
                <p>点击奖品卡查看当前孩子是否满足 XP 门槛。</p>
              </>
            )}
          </section>
        </aside>

        <section className="shop-grid-panel" aria-label="商店奖品">
          {shopRewards.map((reward) => {
            const affordable = activeChild.xp >= reward.cost;
            return (
              <article key={reward.id} className={`shop-reward-card ${affordable ? "available" : "locked"}`}>
                <div className="shop-reward-head">
                  <span>{reward.category}</span>
                  <strong>{reward.cost} XP</strong>
                </div>
                <h2>{reward.name}</h2>
                <p>{reward.description}</p>
                <em>{reward.stockLabel}</em>
                <button type="button" onClick={() => chooseReward(reward)}>
                  {affordable ? <Check size={18} /> : <Lock size={18} />}
                  {affordable ? "选择奖励" : "查看门槛"}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </section>
  );
}
