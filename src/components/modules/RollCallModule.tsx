import { Home, RotateCcw, Search, Sparkles, Trophy, Users } from "lucide-react";
import { getSpiritAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, SpiritDefinition } from "../../types";

interface RollCallModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  currentChildId?: string;
  calledChildIds: string[];
  excludeCalled: boolean;
  onDraw: () => void;
  onReset: () => void;
  onToggleExcludeCalled: () => void;
  onFocusChild: (childId: string) => void;
}

function childSummary(child: ChildWithProgress) {
  return `Lv.${child.level} · ${child.xp} XP · #${child.rank}`;
}

export function RollCallModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  currentChildId,
  calledChildIds,
  excludeCalled,
  onDraw,
  onReset,
  onToggleExcludeCalled,
  onFocusChild,
}: RollCallModuleProps) {
  const calledSet = new Set(calledChildIds);
  const currentChild = childrenWithProgress.find((child) => child.id === currentChildId) ?? selectedChild;
  const currentSpirit = spiritsById.get(currentChild.spiritId);
  const currentAsset = currentSpirit ? getSpiritAsset(currentSpirit, currentChild.state) : undefined;
  const calledChildren = calledChildIds
    .map((childId) => childrenWithProgress.find((child) => child.id === childId))
    .filter((child): child is ChildWithProgress => Boolean(child));
  const uncalledCount = childrenWithProgress.filter((child) => !calledSet.has(child.id)).length;
  const availableCount = excludeCalled ? uncalledCount : childrenWithProgress.length;
  const isPoolEmpty = availableCount === 0;

  return (
    <section className="module-page roll-call-page" aria-labelledby="roll-call-title">
      <div className="roll-call-header">
        <div>
          <span className="module-eyebrow">
            <Sparkles size={18} />
            课堂活动
          </span>
          <h1 id="roll-call-title">随机点名</h1>
          <p>从当前班级里抽取孩子，抽中后可以直接回到成长岛，聚焦到他的精灵家园。</p>
        </div>
        <button type="button" className="roll-call-home-button" onClick={() => onFocusChild(currentChild.id)}>
          <Home size={18} />
          聚焦成长岛
        </button>
      </div>

      <div className="roll-call-layout">
        <section className="roll-call-stage" aria-label="当前抽中孩子">
          <div className="roll-call-stage-top">
            <span>当前抽中</span>
            <strong>{calledChildren.length > 0 ? "本轮点名" : "等待开始"}</strong>
          </div>

          <div className="roll-call-winner">
            <div className="roll-call-ring" aria-hidden="true" />
            <div className="roll-call-avatar">
              {currentAsset?.url ? (
                <img src={currentAsset.url} alt={`${currentChild.petName} 精灵`} />
              ) : (
                <span className="roll-call-fallback">{currentChild.name.slice(0, 1)}</span>
              )}
            </div>
            <div className="roll-call-nameplate">
              <span>{currentChild.name}</span>
              <strong>{currentChild.petName}</strong>
              <em>{childSummary(currentChild)}</em>
            </div>
          </div>

          <div className="roll-call-actions">
            <button type="button" className="roll-call-primary" onClick={onDraw} disabled={isPoolEmpty}>
              <Search size={21} />
              {isPoolEmpty ? "本轮已点完" : "开始点名"}
            </button>
            <button type="button" className="roll-call-secondary" onClick={onReset}>
              <RotateCcw size={19} />
              重置点名池
            </button>
          </div>

          <label className="roll-call-toggle" htmlFor="roll-call-exclude-called">
            <input
              id="roll-call-exclude-called"
              name="rollCallExcludeCalled"
              type="checkbox"
              checked={excludeCalled}
              onChange={onToggleExcludeCalled}
            />
            <span>排除已点过孩子</span>
          </label>

          {isPoolEmpty && (
            <p className="roll-call-hint">本轮所有孩子都已点到，可以重置点名池后继续。</p>
          )}
        </section>

        <aside className="roll-call-side">
          <div className="roll-call-stats">
            <article>
              <Users size={20} />
              <span>点名池</span>
              <strong>{childrenWithProgress.length}</strong>
            </article>
            <article>
              <Trophy size={20} />
              <span>已点名</span>
              <strong>{calledChildren.length}</strong>
            </article>
            <article>
              <Sparkles size={20} />
              <span>未点名</span>
              <strong>{uncalledCount}</strong>
            </article>
          </div>

          <section className="roll-call-list-panel">
            <div className="roll-call-list-title">
              <strong>本轮名单</strong>
              <span>{excludeCalled ? `剩余 ${availableCount}` : "允许重复"}</span>
            </div>

            {calledChildren.length === 0 ? (
              <div className="roll-call-empty">
                <Sparkles size={22} />
                <p>还没有点名记录。点击“开始点名”抽取第一位孩子。</p>
              </div>
            ) : (
              <ol className="roll-call-list">
                {calledChildren.map((child, index) => {
                  const spirit = spiritsById.get(child.spiritId);
                  const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;

                  return (
                    <li key={`${child.id}-${index}`} className={child.id === currentChild.id ? "is-current" : undefined}>
                      <button type="button" onClick={() => onFocusChild(child.id)}>
                        <span className="roll-call-order">{index + 1}</span>
                        <span className="roll-call-mini-avatar">
                          {asset?.url ? <img src={asset.url} alt="" /> : child.name.slice(0, 1)}
                        </span>
                        <span className="roll-call-row-copy">
                          <strong>{child.name}</strong>
                          <em>
                            {child.petName} · {childSummary(child)}
                          </em>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
