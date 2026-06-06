import { useMemo, useState } from "react";
import { BadgeCheck, BookOpenText, History, Home, Search, Sparkles, Star, Trophy, Volume2 } from "lucide-react";
import { getSpiritStageLabel } from "../../domain/progression";
import { getSpiritAsset } from "../../domain/spiritAssets";
import { getChildSpiritVoiceType, getSpiritVoiceOption, spiritVoiceOptions } from "../../domain/spiritVoice";
import { virtueCategories } from "../../data/spirits";
import type { ChildProfile, ChildWithProgress, LedgerRecord, SpiritDefinition } from "../../types";
import { SpiritModelStage3D } from "../Hud/SpiritModelStage3D";

interface ChildProfileModuleProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChild: ChildWithProgress;
  recentRecords: LedgerRecord[];
  onSelectChild: (childId: string) => void;
  onFocusChild: (childId: string) => void;
  onUpdateChild: (patch: Partial<ChildProfile>) => void;
}

const sourceLabels: Record<LedgerRecord["source"], string> = {
  manual: "老师贝壳",
  "dialogue-agent": "贝壳建议",
  "math-pk": "算术点亮",
  undo: "撤销",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatRecordDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDelta(delta: number) {
  return delta > 0 ? "点亮" : "提醒";
}

function getChildRecordLabel(record: LedgerRecord) {
  const reason = record.reason
    .replace(/^演示数据[:：]?\s*/, "")
    .replace(/^课堂记录[:：]?\s*/, "")
    .replace(/^语音记录[:：]?\s*/, "")
    .replace(/^复核通过[:：]?\s*/, "")
    .trim();
  if (record.source === "math-pk") return "数学光路点亮";
  if (reason.includes("快速加分") || reason.includes("课堂积极回应")) return "课堂成长点亮";
  if (reason.includes("自助成长")) return "能量进精灵";
  if (reason.includes("已有成长")) return "已有成长";
  if (record.delta < 0) return "老师提醒";
  return reason.replace(/\s*[+＋-]\d+\s*XP?$/i, "").slice(0, 18) || "成长贝壳";
}

export function ChildProfileModule({
  childrenWithProgress,
  spiritsById,
  selectedChild,
  recentRecords,
  onSelectChild,
  onFocusChild,
  onUpdateChild,
}: ChildProfileModuleProps) {
  const [query, setQuery] = useState("");
  const [voiceNotice, setVoiceNotice] = useState("");
  const selectedSpirit = spiritsById.get(selectedChild.spiritId);
  const selectedAsset = selectedSpirit ? getSpiritAsset(selectedSpirit, selectedChild.state) : undefined;
  const normalizedQuery = normalize(query);
  const filteredChildren = childrenWithProgress
    .filter((child) => {
      if (!normalizedQuery) return true;
      return `${child.name} ${child.petName} ${child.level} ${child.xp}`.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => a.rank - b.rank);
  const childRecords = useMemo(
    () =>
      recentRecords
        .filter((record) => record.childId === selectedChild.id && !record.undone && record.source !== "undo")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [recentRecords, selectedChild.id],
  );
  const positiveRecords = childRecords.filter((record) => record.delta > 0);
  const dimensionStats = virtueCategories.map((category) => {
    const records = childRecords.filter((record) => record.category === category);
    const xp = records.reduce((sum, record) => sum + Math.max(0, record.delta), 0);
    return { category, count: records.length, xp };
  });
  const strongestDimension = [...dimensionStats].sort((a, b) => b.xp - a.xp || b.count - a.count)[0];
  const latestMilestone = positiveRecords[0];
  const stageLabel = getSpiritStageLabel(selectedChild.state);
  const selectedVoiceType = getChildSpiritVoiceType(selectedChild);
  const selectedVoice = getSpiritVoiceOption(selectedVoiceType) ?? spiritVoiceOptions[0];
  const updateVoiceType = (voiceType: number) => {
    const nextVoice = getSpiritVoiceOption(voiceType);
    onUpdateChild({ voiceType });
    setVoiceNotice(`${nextVoice?.label ?? "声音"} 已换`);
  };

  return (
    <section className="module-page profile-page" aria-labelledby="profile-title">
      <div className="profile-header module-compact-header">
        <div>
          <span className="module-eyebrow">
            <BookOpenText size={18} aria-hidden="true" />
            精灵小屋
          </span>
          <h1 id="profile-title">精灵小屋</h1>
        </div>
        <button type="button" className="profile-home-button" onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} aria-hidden="true" />
          看精灵
        </button>
      </div>

      <div className="profile-layout">
        <aside className="profile-roster-panel" aria-label="精灵小屋名单">
          <div className="profile-roster-title">
            <strong>小屋名单</strong>
            <span>{filteredChildren.length} 位</span>
          </div>
          <label className="profile-search" htmlFor="profile-search">
            <Search size={18} aria-hidden="true" />
            <input
              id="profile-search"
              name="profileSearch"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="找孩子 / 精灵"
            />
          </label>
          <div className="profile-roster-list">
            {filteredChildren.map((child) => {
              const spirit = spiritsById.get(child.spiritId);
              const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;
              return (
                <button
                  key={child.id}
                  type="button"
                  aria-current={child.id === selectedChild.id ? "true" : undefined}
                  className={child.id === selectedChild.id ? "active" : undefined}
                  onClick={() => onSelectChild(child.id)}
                >
                  <span>
                    {asset?.url ? <img src={asset.url} alt={`${child.petName} 精灵`} width={48} height={48} /> : child.name.slice(0, 1)}
                  </span>
                  <strong>{child.name}</strong>
                  <em>{child.petName} · 精灵能量</em>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="profile-story-panel" aria-label="精灵小屋主面板">
          <div className="profile-hero-card">
            <div className="profile-cabin-stage" aria-label={`${selectedChild.name} 的精灵小屋`}>
              <div className="profile-cabin-status">
                <span>已进入 {selectedChild.name} 小屋</span>
                <strong>{stageLabel}</strong>
              </div>
              {selectedSpirit ? (
                <SpiritModelStage3D
                  child={selectedChild}
                  spirit={selectedSpirit}
                  accent={selectedSpirit.accent}
                  className="profile-3d-cabin-stage"
                  fallbackImageUrl={selectedAsset?.url}
                  fallbackInitial={selectedChild.name.slice(0, 1)}
                  interactive
                  size="medium"
                />
              ) : (
                <div className="profile-portrait">
                  {selectedAsset?.url ? <img src={selectedAsset.url} alt={`${selectedChild.petName} 精灵`} width={168} height={168} /> : selectedChild.name.slice(0, 1)}
                </div>
              )}
              <div className="profile-cabin-floor" aria-hidden="true" />
            </div>
            <div className="profile-cabin-info">
              <div className="profile-cabin-heading">
                <span>小屋主人</span>
                <h2>{selectedChild.name}</h2>
                <p>{selectedSpirit?.name ?? "小精灵"} · {stageLabel}</p>
              </div>
              <div className="profile-stat-row" aria-label="精灵成长状态">
                <strong>成长阶段</strong>
                <strong>能量槽</strong>
                <strong>小屋伙伴</strong>
              </div>
              <div className="profile-cabin-controls">
                <label className="profile-voice-select">
                  <span>
                    <Volume2 size={16} aria-hidden="true" />
                    精灵声音
                  </span>
                  <select value={selectedVoiceType} onChange={(event) => updateVoiceType(Number(event.target.value))}>
                    {spiritVoiceOptions.map((voice) => (
                      <option key={voice.voiceType} value={voice.voiceType}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="profile-cabin-actions">
                  <span>{voiceNotice || `${selectedVoice.label} 声线`}</span>
                  <button type="button" onClick={() => onFocusChild(selectedChild.id)}>
                    <Home size={16} aria-hidden="true" />
                    看精灵
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-section-title">
            <History size={18} aria-hidden="true" />
            <strong>最近贝壳</strong>
            <span>{childRecords.length} 条</span>
          </div>
          <div className="profile-timeline">
            {childRecords.length === 0 ? (
              <article className="profile-empty-story">
                <Sparkles size={22} aria-hidden="true" />
                <p>暂无成长贝壳</p>
              </article>
            ) : (
              childRecords.slice(0, 8).map((record) => (
                <article key={record.id} className={record.delta < 0 ? "negative" : undefined}>
                  <span>{formatDelta(record.delta)}</span>
                  <div>
                    <strong>{getChildRecordLabel(record)}</strong>
                    <p>{record.category ?? sourceLabels[record.source]}</p>
                    <em>
                      {sourceLabels[record.source]} · {formatRecordDate(record.createdAt)}
                    </em>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="profile-insight-panel" aria-label="能量与高光">
          <div className="profile-insight-title">
            <strong>能量与高光</strong>
            <span>{strongestDimension?.category ?? "暂无"}</span>
          </div>
          <section>
            <div className="profile-section-title">
              <Star size={18} aria-hidden="true" />
              <strong>能量徽章</strong>
              <span>{strongestDimension?.category ?? "暂无"}</span>
            </div>
            <div className="dimension-list">
              {dimensionStats.map((item) => (
                <article key={item.category}>
                  <div>
                    <strong>{item.category}</strong>
                    <span>{item.count} 条</span>
                  </div>
                  <div className="dimension-meter">
                    <span style={{ width: `${Math.min(100, item.xp)}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="profile-milestone-card">
            <div className="profile-section-title">
              <Trophy size={18} aria-hidden="true" />
              <strong>高光贝壳</strong>
            </div>
            {latestMilestone ? (
              <article>
                <span>{formatDelta(latestMilestone.delta)}</span>
                <strong>{getChildRecordLabel(latestMilestone)}</strong>
                <p>
                  {latestMilestone.category ?? "成长贝壳"} · {formatRecordDate(latestMilestone.createdAt)}
                </p>
              </article>
            ) : (
              <p>暂无</p>
            )}
          </section>

          <section className="profile-evidence-card">
            <div className="profile-section-title">
              <BadgeCheck size={18} aria-hidden="true" />
              <strong>小屋状态</strong>
            </div>
            <dl>
              <div>
                <dt>精灵形态</dt>
                <dd>{stageLabel}</dd>
              </div>
              <div>
                <dt>精灵声音</dt>
                <dd>{selectedVoice.label}</dd>
              </div>
              <div>
                <dt>成长贝壳</dt>
                <dd>{childRecords.length} 条</dd>
              </div>
              <div>
                <dt>点亮能量</dt>
                <dd>{positiveRecords.reduce((sum, record) => sum + record.delta, 0)} 能量</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </section>
  );
}
