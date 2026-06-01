import { useMemo, useState } from "react";
import { BadgeCheck, BookOpenText, History, Home, Search, Sparkles, Star, Trophy, Volume2 } from "lucide-react";
import { getSpiritStageLabel } from "../../domain/progression";
import { getSpiritAsset } from "../../domain/spiritAssets";
import { getChildSpiritVoiceType, getSpiritVoiceOption, spiritVoiceOptions } from "../../domain/spiritVoice";
import { virtueCategories } from "../../data/spirits";
import type { ChildProfile, ChildWithProgress, LedgerRecord, SpiritDefinition } from "../../types";

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
  manual: "老师记录",
  "dialogue-agent": "AI 建议确认",
  "math-pk": "数学 PK",
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
  return delta > 0 ? `+${delta}` : String(delta);
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

  return (
    <section className="module-page profile-page" aria-labelledby="profile-title">
      <div className="profile-header">
        <div>
          <span className="module-eyebrow">
            <BookOpenText size={18} />
            成长沉淀
          </span>
          <h1 id="profile-title">孩子成长档案</h1>
        </div>
        <button type="button" className="profile-home-button" onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} />
          回岛
        </button>
      </div>

      <div className="profile-layout">
        <aside className="profile-roster-panel" aria-label="档案孩子列表">
          <label className="profile-search" htmlFor="profile-search">
            <Search size={18} />
            <input
              id="profile-search"
              name="profileSearch"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索孩子或精灵"
            />
          </label>
          <div className="profile-roster-list">
            {filteredChildren.map((child) => {
              const spirit = spiritsById.get(child.spiritId);
              const asset = spirit ? getSpiritAsset(spirit, child.state) : undefined;
              return (
                <button key={child.id} type="button" className={child.id === selectedChild.id ? "active" : undefined} onClick={() => onSelectChild(child.id)}>
                  <span>
                    {asset?.url ? <img src={asset.url} alt={`${child.petName} 精灵`} /> : child.name.slice(0, 1)}
                  </span>
                  <strong>{child.name}</strong>
                  <em>
                    Lv.{child.level} · {child.xp} XP
                  </em>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="profile-story-panel" aria-label="成长故事线">
          <div className="profile-hero-card">
            <div className="profile-portrait">
              {selectedAsset?.url ? <img src={selectedAsset.url} alt={`${selectedChild.petName} 精灵`} /> : selectedChild.name.slice(0, 1)}
            </div>
            <div>
              <span>成长档案</span>
              <h2>{selectedChild.name}</h2>
              <p>{selectedSpirit?.name ?? "小精灵"} · {stageLabel}</p>
              <div className="profile-stat-row">
                <strong>Lv.{selectedChild.level}</strong>
                <strong>{selectedChild.xp} XP</strong>
                <strong>全班 #{selectedChild.rank}</strong>
              </div>
              <label className="profile-voice-select">
                <span>
                  <Volume2 size={16} />
                  精灵声音
                </span>
                <select value={selectedVoiceType} onChange={(event) => onUpdateChild({ voiceType: Number(event.target.value) })}>
                  {spiritVoiceOptions.map((voice) => (
                    <option key={voice.voiceType} value={voice.voiceType}>
                      {voice.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="profile-section-title">
            <History size={18} />
            <strong>成长故事线</strong>
            <span>{childRecords.length} 条确认记录</span>
          </div>
          <div className="profile-timeline">
            {childRecords.length === 0 ? (
              <article className="profile-empty-story">
                <Sparkles size={22} />
                <p>暂无记录</p>
              </article>
            ) : (
              childRecords.slice(0, 8).map((record) => (
                <article key={record.id} className={record.delta < 0 ? "negative" : undefined}>
                  <span>{formatDelta(record.delta)}</span>
                  <div>
                    <strong>{record.reason}</strong>
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

        <aside className="profile-insight-panel" aria-label="德育画像和代表事件">
          <section>
            <div className="profile-section-title">
              <Star size={18} />
              <strong>德育画像</strong>
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
              <Trophy size={18} />
              <strong>代表成长</strong>
            </div>
            {latestMilestone ? (
              <article>
                <span>{formatDelta(latestMilestone.delta)} XP</span>
                <strong>{latestMilestone.reason}</strong>
                <p>
                  {latestMilestone.category ?? "成长记录"} · {formatRecordDate(latestMilestone.createdAt)}
                </p>
              </article>
            ) : (
              <p>暂无</p>
            )}
          </section>

          <section className="profile-evidence-card">
            <div className="profile-section-title">
              <BadgeCheck size={18} />
              <strong>展示证据</strong>
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
                <dt>成长记录</dt>
                <dd>{childRecords.length} 条</dd>
              </div>
              <div>
                <dt>正向 XP</dt>
                <dd>{positiveRecords.reduce((sum, record) => sum + record.delta, 0)} XP</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </section>
  );
}
