import { Copy, Filter, Home, MapPinned, Mic, PlusCircle, RotateCcw, Search, Sparkles, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { islandSlots } from "../../data/classroom";
import { getSpiritAsset } from "../../domain/spiritAssets";
import type { ChildWithProgress, SpiritDefinition } from "../../types";

interface RollCallModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  currentChildId?: string;
  calledChildIds: string[];
  excludeCalled: boolean;
  onDraw: (eligibleChildIds?: string[]) => void;
  onReset: () => void;
  onToggleExcludeCalled: () => void;
  onQuickRecord: (childId: string) => void;
  onOpenVoiceRecord: (childId: string) => void;
  onFocusChild: (childId: string) => void;
}

const allRegionFilter = "全部区域";
const levelFilters = [
  { id: "all", label: "全部等级", matches: () => true },
  { id: "lv1", label: "Lv.1", matches: (level: number) => level === 1 },
  { id: "lv2-4", label: "Lv.2-4", matches: (level: number) => level >= 2 && level <= 4 },
  { id: "lv5-6", label: "Lv.5-6", matches: (level: number) => level >= 5 && level <= 6 },
  { id: "lv7-8", label: "Lv.7-8", matches: (level: number) => level >= 7 },
] as const;

type LevelFilterId = (typeof levelFilters)[number]["id"];

const slotZoneById = new Map(islandSlots.map((slot) => [slot.id, slot.zone]));

function childSummary(child: ChildWithProgress) {
  return `Lv.${child.level} · ${child.xp} XP · #${child.rank}`;
}

function getChildRegion(child: ChildWithProgress) {
  return slotZoneById.get(child.slotId) ?? "未分区";
}

function formatRoundText(children: ChildWithProgress[]) {
  return children
    .map((child, index) => `${index + 1}. ${child.name} · ${child.petName} · ${childSummary(child)}`)
    .join("\n");
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
  onQuickRecord,
  onOpenVoiceRecord,
  onFocusChild,
}: RollCallModuleProps) {
  const [regionFilter, setRegionFilter] = useState(allRegionFilter);
  const [levelFilter, setLevelFilter] = useState<LevelFilterId>("all");
  const [isRolling, setIsRolling] = useState(false);
  const [rollingChildId, setRollingChildId] = useState<string | undefined>();
  const [actionStatus, setActionStatus] = useState("抽中后可直接记录成长行为，也可以转到语音记录补充说明。");
  const [copyStatus, setCopyStatus] = useState("");
  const rollingIntervalRef = useRef<number | undefined>(undefined);
  const rollingTimeoutRef = useRef<number | undefined>(undefined);
  const calledSet = new Set(calledChildIds);
  const regionOptions = useMemo(() => {
    return [allRegionFilter, ...new Set(childrenWithProgress.map(getChildRegion))];
  }, [childrenWithProgress]);
  const filteredChildren = useMemo(() => {
    const levelOption = levelFilters.find((option) => option.id === levelFilter) ?? levelFilters[0];
    return childrenWithProgress.filter((child) => {
      const matchesRegion = regionFilter === allRegionFilter || getChildRegion(child) === regionFilter;
      return matchesRegion && levelOption.matches(child.level);
    });
  }, [childrenWithProgress, levelFilter, regionFilter]);
  const availableChildren = excludeCalled ? filteredChildren.filter((child) => !calledSet.has(child.id)) : filteredChildren;
  const currentChild = childrenWithProgress.find((child) => child.id === currentChildId) ?? selectedChild;
  const rollingChild = childrenWithProgress.find((child) => child.id === rollingChildId);
  const displayChild = rollingChild ?? currentChild;
  const currentSpirit = spiritsById.get(displayChild.spiritId);
  const currentAsset = currentSpirit ? getSpiritAsset(currentSpirit, displayChild.state) : undefined;
  const calledChildren = calledChildIds
    .map((childId) => childrenWithProgress.find((child) => child.id === childId))
    .filter((child): child is ChildWithProgress => Boolean(child));
  const uncalledCount = filteredChildren.filter((child) => !calledSet.has(child.id)).length;
  const availableCount = availableChildren.length;
  const isPoolEmpty = availableCount === 0;
  const hasDrawnChild = Boolean(currentChildId);

  const clearRollingTimers = () => {
    if (rollingIntervalRef.current) window.clearInterval(rollingIntervalRef.current);
    if (rollingTimeoutRef.current) window.clearTimeout(rollingTimeoutRef.current);
    rollingIntervalRef.current = undefined;
    rollingTimeoutRef.current = undefined;
  };

  useEffect(() => {
    if (!regionOptions.includes(regionFilter)) setRegionFilter(allRegionFilter);
  }, [regionFilter, regionOptions]);

  useEffect(() => clearRollingTimers, []);

  const handleDraw = () => {
    if (isPoolEmpty || isRolling) return;

    const animationPool = availableChildren.length > 0 ? availableChildren : filteredChildren;
    let index = Math.floor(Math.random() * animationPool.length);
    clearRollingTimers();
    setIsRolling(true);
    setActionStatus("点名滚动中...");
    setCopyStatus("");
    setRollingChildId(animationPool[index]?.id);

    rollingIntervalRef.current = window.setInterval(() => {
      index = (index + 1) % animationPool.length;
      setRollingChildId(animationPool[index]?.id);
    }, 75);

    rollingTimeoutRef.current = window.setTimeout(() => {
      clearRollingTimers();
      setIsRolling(false);
      setRollingChildId(undefined);
      onDraw(filteredChildren.map((child) => child.id));
      setActionStatus("已抽出孩子，可以记录成长行为或回到成长岛。");
    }, 900);
  };

  const handleQuickRecord = () => {
    if (!hasDrawnChild || isRolling) return;
    onQuickRecord(currentChild.id);
    setActionStatus(`${currentChild.name} 已记录 +10 课堂积极回应。`);
  };

  const handleCopyRound = async () => {
    if (calledChildren.length === 0) {
      setCopyStatus("本轮还没有点名结果。");
      return;
    }

    const text = formatRoundText(calledChildren);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`已复制 ${calledChildren.length} 条本轮点名结果。`);
    } catch {
      setCopyStatus("复制入口已触发，正式环境可接导出文件。");
    }
  };

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
            <strong>{isRolling ? "滚动抽取中" : calledChildren.length > 0 ? "本轮点名" : "等待开始"}</strong>
          </div>

          <div className={isRolling ? "roll-call-winner is-rolling" : "roll-call-winner"}>
            <div className="roll-call-ring" aria-hidden="true" />
            <div className="roll-call-avatar">
              {currentAsset?.url ? (
                <img src={currentAsset.url} alt={`${displayChild.petName} 精灵`} />
              ) : (
                <span className="roll-call-fallback">{displayChild.name.slice(0, 1)}</span>
              )}
            </div>
            <div className="roll-call-nameplate">
              <span>{displayChild.name}</span>
              <strong>{displayChild.petName}</strong>
              <em>{childSummary(displayChild)}</em>
            </div>
          </div>

          <div className="roll-call-actions">
            <button type="button" className="roll-call-primary" onClick={handleDraw} disabled={isPoolEmpty || isRolling}>
              <Search size={21} />
              {isRolling ? "正在抽取" : isPoolEmpty ? "当前筛选已点完" : "开始点名"}
            </button>
            <button type="button" className="roll-call-secondary" onClick={onReset}>
              <RotateCcw size={19} />
              重置点名池
            </button>
          </div>

          <div className="roll-call-record-actions" aria-label="抽中后记录成长行为">
            <button type="button" onClick={handleQuickRecord} disabled={!hasDrawnChild || isRolling}>
              <PlusCircle size={19} />
              记录 +10 课堂回应
            </button>
            <button type="button" onClick={() => onOpenVoiceRecord(currentChild.id)} disabled={!hasDrawnChild || isRolling}>
              <Mic size={19} />
              转到语音记录
            </button>
          </div>
          <p className="roll-call-action-status">{actionStatus}</p>

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
            <p className="roll-call-hint">当前筛选范围内已没有可抽取孩子，可以切换筛选或重置点名池。</p>
          )}
        </section>

        <aside className="roll-call-side">
          <section className="roll-call-filter-panel" aria-label="点名池筛选">
            <div className="roll-call-filter-title">
              <span>
                <Filter size={18} />
                点名池筛选
              </span>
              <strong>{availableCount}/{filteredChildren.length}</strong>
            </div>
            <div className="roll-call-chip-row" aria-label="区域筛选">
              {regionOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === regionFilter ? "active" : undefined}
                  onClick={() => setRegionFilter(option)}
                  disabled={isRolling}
                >
                  <MapPinned size={15} />
                  {option}
                </button>
              ))}
            </div>
            <div className="roll-call-chip-row compact" aria-label="等级筛选">
              {levelFilters.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === levelFilter ? "active" : undefined}
                  onClick={() => setLevelFilter(option.id)}
                  disabled={isRolling}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <div className="roll-call-stats">
            <article>
              <Users size={20} />
              <span>点名池</span>
              <strong>{filteredChildren.length}</strong>
            </article>
            <article>
              <Trophy size={20} />
              <span>本轮已点</span>
              <strong>{calledChildren.length}</strong>
            </article>
            <article>
              <Sparkles size={20} />
              <span>可抽取</span>
              <strong>{availableCount}</strong>
            </article>
          </div>

          <section className="roll-call-list-panel">
            <div className="roll-call-list-title">
              <div>
                <strong>本轮名单</strong>
                <span>{excludeCalled ? `当前筛选未点 ${uncalledCount}` : "允许重复"}</span>
              </div>
              <button type="button" className="roll-call-copy-button" onClick={handleCopyRound}>
                <Copy size={17} />
                复制
              </button>
            </div>
            {copyStatus && <p className="roll-call-copy-status">{copyStatus}</p>}

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
