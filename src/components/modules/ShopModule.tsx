import { useEffect, useState, type CSSProperties } from "react";
import { Check, Home, Lock, ShoppingBag, Sparkles } from "lucide-react";
import { shopRewards, type ShopReward } from "../../data/rewards";
import { getSpiritAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, ShopRedemption, SpiritDefinition } from "../../types";

interface ShopModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  redemptions: ShopRedemption[];
  onSelectChild: (childId: string) => void;
  onFocusChild: (childId: string) => void;
  onRedeemReward: (childId: string, reward: ShopReward) => void;
}

interface ShopIntent {
  reward: ShopReward;
  childName: string;
  affordable: boolean;
  redeemed?: boolean;
}

function childSummary(child: ChildWithProgress) {
  return `${child.petName} · 可用能量 ${child.xp}`;
}

function shopStatusLabel(intent?: ShopIntent) {
  if (!intent) return "选一个小奖励";
  if (intent.redeemed) return "兑换成功";
  return intent.affordable ? "已选小奖励" : "能量不够";
}

export function ShopModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  redemptions,
  onSelectChild,
  onFocusChild,
  onRedeemReward,
}: ShopModuleProps) {
  const [selectedChildId, setSelectedChildId] = useState(selectedChild.id);
  const [lastIntent, setLastIntent] = useState<ShopIntent | undefined>();
  const activeChild = childrenWithProgress.find((child) => child.id === selectedChildId) ?? selectedChild;
  const activeSpirit = spiritsById.get(activeChild.spiritId);
  const activeAsset = activeSpirit ? getSpiritAsset(activeSpirit, activeChild.state) : undefined;
  const activeChildRedemptions = redemptions.filter((item) => item.childId === activeChild.id);
  const activeRedemptions = activeChildRedemptions.slice(0, 4);
  const pendingRewardIds = new Set(activeChildRedemptions.map((item) => item.rewardId));

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

  const redeemReward = () => {
    if (!lastIntent?.affordable) return;
    if (pendingRewardIds.has(lastIntent.reward.id)) return;
    onRedeemReward(activeChild.id, lastIntent.reward);
    setLastIntent({ ...lastIntent, redeemed: true });
  };

  return (
    <section className="module-page reward-page shop-page" aria-labelledby="shop-title">
      <div className="reward-header">
        <div>
          <span className="module-eyebrow">
            <ShoppingBag size={18} aria-hidden="true" />
            小铺
          </span>
          <h1 id="shop-title">海岛小铺</h1>
        </div>
        <button type="button" className="reward-home-button" onClick={() => onFocusChild(activeChild.id)}>
          <Home size={18} aria-hidden="true" />
          回岛
        </button>
      </div>

      <div className="shop-layout">
        <section className="shop-status-strip" aria-label="小铺柜台">
          <div className="shop-counter-awning" aria-hidden="true">
            <span>海岛柜台</span>
            <span>奖励票</span>
            <span>待发放</span>
          </div>
          <div className="reward-child-card">
            <div className="reward-child-avatar">
              {activeAsset?.url ? <img src={activeAsset.url} alt={`${activeChild.name} 精灵`} width={94} height={94} /> : activeChild.name.slice(0, 1)}
            </div>
            <div>
              <label htmlFor="shop-child">给谁换</label>
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
            <span>可用能量</span>
            <strong>{activeChild.xp}</strong>
          </section>

          <section className={`shop-intent-card ${lastIntent?.redeemed ? "is-redeemed" : lastIntent ? "has-intent" : "is-empty"}`}>
            {lastIntent ? (
              <>
                {lastIntent.affordable ? <Check size={22} aria-hidden="true" /> : <Lock size={22} aria-hidden="true" />}
                <div className="shop-intent-copy">
                  <strong>{shopStatusLabel(lastIntent)}</strong>
                  <p>
                    {lastIntent.childName} · {lastIntent.reward.name} · {lastIntent.reward.cost} 能量
                  </p>
                  {lastIntent.redeemed && <span className="shop-ticket-pop">兑换票已入袋</span>}
                </div>
                {lastIntent.redeemed ? (
                  <button type="button" className="shop-return-action" onClick={() => onFocusChild(activeChild.id)}>
                    <Home size={16} aria-hidden="true" />
                    回岛看{activeChild.name}
                  </button>
                ) : (
                  <button type="button" className="shop-redeem-button" onClick={redeemReward} disabled={!lastIntent.affordable}>
                    {lastIntent.affordable ? "兑换" : "暂不能换"}
                  </button>
                )}
              </>
            ) : (
              <>
                <Sparkles size={22} aria-hidden="true" />
                <div className="shop-intent-copy">
                  <strong>{shopStatusLabel()}</strong>
                  <p>先从货架上选一件。</p>
                </div>
              </>
            )}
          </section>
        </section>

        <section className="shop-grid-panel" aria-label="小铺货架">
          {shopRewards.map((reward) => {
            const affordable = activeChild.xp >= reward.cost;
            const isSelected = lastIntent?.reward.id === reward.id;
            const isRedeemed = pendingRewardIds.has(reward.id) || Boolean(isSelected && lastIntent?.redeemed);
            const missingXp = Math.max(0, reward.cost - activeChild.xp);
            const progress = Math.min(100, Math.round((activeChild.xp / reward.cost) * 100));
            const shelfStatus = isRedeemed ? "待发放" : affordable ? "可换" : `还差 ${missingXp} 能量`;
            const rewardState = isRedeemed ? "redeemed" : affordable ? "available" : "locked";
            return (
              <article
                key={reward.id}
                className={`shop-reward-card ${affordable ? "available" : "locked"} ${isSelected ? "is-selected" : ""} ${isRedeemed ? "is-redeemed" : ""}`}
                data-reward-id={reward.id}
                data-shop-state={rewardState}
                data-missing-xp={missingXp}
                style={{ "--reward-progress": `${progress}%` } as CSSProperties}
                aria-label={`${reward.name}，${reward.cost} 能量，${shelfStatus}`}
              >
                <div className="shop-reward-head">
                  <span>{reward.category}</span>
                  <strong>{reward.cost} 能量</strong>
                </div>
                <h2>{reward.name}</h2>
                <div className="shop-reward-meter" aria-hidden="true">
                  <i />
                </div>
                <div className="shop-reward-ticket">
                  <span>{reward.stockLabel}</span>
                  <em>{shelfStatus}</em>
                </div>
                <button type="button" onClick={() => chooseReward(reward)} disabled={isRedeemed}>
                  {affordable ? <Check size={18} aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
                  {isRedeemed ? "已兑换" : affordable ? (isSelected ? "已选" : "选这个") : `差 ${missingXp} 能量`}
                </button>
              </article>
            );
          })}
        </section>

        <section className="shop-redemption-panel" aria-label="兑换票">
          <div>
            <ShoppingBag size={18} aria-hidden="true" />
            <strong>兑换票</strong>
          </div>
          {activeRedemptions.length === 0 ? (
            <p>还没兑换。</p>
          ) : (
            <ol>
              {activeRedemptions.map((item) => (
                <li key={item.id}>
                  <span>{item.rewardCategory}</span>
                  <strong>{item.rewardName}</strong>
                  <em>{item.cost} 能量 · 待发放</em>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </section>
  );
}
