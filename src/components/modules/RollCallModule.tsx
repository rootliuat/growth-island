import { Copy, Filter, Home, MapPinned, PlusCircle, RotateCcw, ScrollText, Sparkles, Trophy, Users } from "lucide-react";
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
  { id: "all", label: "全部阶段", matches: () => true },
  { id: "lv1", label: "初亮", matches: (level: number) => level === 1 },
  { id: "lv2-4", label: "微光", matches: (level: number) => level >= 2 && level <= 4 },
  { id: "lv5-6", label: "闪亮", matches: (level: number) => level >= 5 && level <= 6 },
  { id: "lv7-8", label: "满光", matches: (level: number) => level >= 7 },
] as const;

type LevelFilterId = (typeof levelFilters)[number]["id"];

const slotZoneById = new Map(islandSlots.map((slot) => [slot.id, slot.zone]));

function childSummary(child: ChildWithProgress) {
  return `${child.petName} · 精灵能量`;
}

function getChildRegion(child: ChildWithProgress) {
  return slotZoneById.get(child.slotId) ?? "未分区";
}

function formatRoundText(children: ChildWithProgress[]) {
  return children
    .map((child, index) => `${index + 1}. ${child.name} · ${childSummary(child)}`)
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
  const [actionStatus, setActionStatus] = useState("");
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

  useEffect(() => {
    if (currentChildId && !isRolling) setActionStatus(`已抽中 ${currentChild.name}`);
  }, [currentChild.name, currentChildId, isRolling]);

  useEffect(() => clearRollingTimers, []);

  const handleDraw = () => {
    if (isPoolEmpty || isRolling) return;

    const animationPool = availableChildren.length > 0 ? availableChildren : filteredChildren;
    let index = Math.floor(Math.random() * animationPool.length);
    clearRollingTimers();
    setIsRolling(true);
    setActionStatus("抽取中");
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
      setActionStatus("已抽中");
    }, 900);
  };

  const handleQuickRecord = () => {
    if (!hasDrawnChild || isRolling) return;
    onQuickRecord(currentChild.id);
    setActionStatus(`已为 ${currentChild.name} 点亮能量`);
  };

  const handleReset = () => {
    clearRollingTimers();
    setIsRolling(false);
    setRollingChildId(undefined);
    setActionStatus("");
    setCopyStatus("");
    onReset();
  };

  const handleCopyRound = async () => {
    if (calledChildren.length === 0) {
      setCopyStatus("未开始");
      return;
    }

    const text = formatRoundText(calledChildren);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${calledChildren.length} 条已复制`);
    } catch {
      setCopyStatus("复制失败");
    }
  };

  return (
    <section className="module-page roll-call-page" aria-labelledby="roll-call-title">
      <div className="roll-call-header module-compact-header">
        <div>
          <span className="module-eyebrow">
            <Sparkles size={18} />
            点名
          </span>
          <h1 id="roll-call-title">抽取台</h1>
        </div>
        <button type="button" className="roll-call-home-button" aria-label={`看${currentChild.name}的精灵`} onClick={() => onFocusChild(currentChild.id)}>
          <Home size={18} />
          看精灵
        </button>
      </div>

      <div className="roll-call-layout">
        <section className="roll-call-stage" aria-label="抽取台当前结果">
          <div className="roll-call-stage-top">
            <span>抽取位</span>
            <strong>{isRolling ? "贝签滚动中" : calledChildren.length > 0 ? "本轮贝签" : "等待抽取"}</strong>
          </div>

          <div className="roll-call-command-strip">
            <div className="roll-call-actions">
              <button type="button" className="roll-call-primary" onClick={handleDraw} disabled={isPoolEmpty || isRolling}>
                <Sparkles size={21} />
                {isRolling ? "抽取中" : isPoolEmpty ? "本轮完成" : "抽取"}
              </button>
              <button type="button" className="roll-call-secondary" onClick={handleReset}>
                <RotateCcw size={19} />
                换一轮
              </button>
            </div>

            <div className="roll-call-record-actions" aria-label="抽中后记录成长行为">
              <button type="button" onClick={handleQuickRecord} disabled={!hasDrawnChild || isRolling}>
                <PlusCircle size={19} />
                {hasDrawnChild ? `${currentChild.name} 点亮` : "送能量"}
              </button>
              <button type="button" onClick={() => onOpenVoiceRecord(currentChild.id)} disabled={!hasDrawnChild || isRolling}>
                <ScrollText size={19} />
                补贝壳
              </button>
            </div>
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
              <strong>{displayChild.name}</strong>
            </div>
          </div>

          <p className="roll-call-action-status" aria-live="polite">
            {actionStatus || (hasDrawnChild ? `已抽中 ${currentChild.name}，可送一束能量` : "抽取后可直接送能量")}
          </p>

          <label className="roll-call-toggle" htmlFor="roll-call-exclude-called">
            <input
              id="roll-call-exclude-called"
              name="rollCallExcludeCalled"
              type="checkbox"
              checked={excludeCalled}
              onChange={onToggleExcludeCalled}
            />
            <span>不重复</span>
          </label>

          {isPoolEmpty && (
            <p className="roll-call-hint">本轮已完成</p>
          )}
        </section>

        <aside className="roll-call-side">
          <details className="roll-call-filter-panel roll-call-secondary-details">
            <summary className="roll-call-filter-title">
              <span>
                <Filter size={18} />
                候选范围
              </span>
              <strong>{availableCount}/{filteredChildren.length}</strong>
            </summary>
            <div className="roll-call-chip-row" aria-label="区域筛选">
              {regionOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === regionFilter ? "active" : undefined}
                  aria-pressed={option === regionFilter}
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
                  aria-pressed={option.id === levelFilter}
                  onClick={() => setLevelFilter(option.id)}
                  disabled={isRolling}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </details>

          <div className="roll-call-stats">
            <article>
              <Users size={20} />
              <span>候选</span>
              <strong>{filteredChildren.length}</strong>
            </article>
            <article>
              <Trophy size={20} />
              <span>已抽</span>
              <strong>{calledChildren.length}</strong>
            </article>
            <article>
              <Sparkles size={20} />
              <span>剩余</span>
              <strong>{availableCount}</strong>
            </article>
          </div>

          <details className="roll-call-list-panel roll-call-secondary-details">
            <summary className="roll-call-list-title">
              <div>
                <strong>本轮贝签</strong>
                <span>{excludeCalled ? `剩余 ${uncalledCount}` : "可重复"}</span>
              </div>
            </summary>
            <div className="roll-call-list-actions">
              <button type="button" className="roll-call-copy-button" onClick={handleCopyRound}>
                <Copy size={17} />
                复制
              </button>
            </div>
            {copyStatus && <p className="roll-call-copy-status" aria-live="polite">{copyStatus}</p>}

            {calledChildren.length === 0 ? (
              <div className="roll-call-empty">
                <Sparkles size={22} />
                <p>等待第一枚贝签</p>
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
                          <em>{childSummary(child)}</em>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </details>
        </aside>
      </div>
    </section>
  );
}
