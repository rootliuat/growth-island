import { BookOpenText, Clock3, Mic } from "lucide-react";
import type { CSSProperties } from "react";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition } from "../../types";
import { xpProgressPercent } from "../../domain/progression";
import { getChildEnergyLabel } from "../../domain/virtueEnergy";

interface SpiritDetailPanelProps {
  child: ChildWithProgress;
  spirit: SpiritDefinition;
  spiritAssetUrl?: string;
  recentRecords: LedgerRecord[];
  onOpenProfile?: (childId: string) => void;
  onStartSelfService?: (childId: string) => void;
}

function getBigScreenRecordLabel(reason: string) {
  if (reason.includes("自助成长") || reason.includes("语音记录")) return "成长能量";
  if (reason.includes("已有成长")) return "成长点亮";
  if (reason.includes("加分")) return "成长点亮";
  if (reason.includes("数学魔法") || reason.includes("数学光路")) return "数学光点";
  if (reason.includes("课堂积极回应")) return "课堂成长";
  if (reason.includes("减分") || reason.includes("扣分")) return "老师提醒";
  return reason
    .replace(/^课堂记录[:：]?\s*/, "")
    .replace(/^语音记录[:：]?\s*/, "")
    .replace(/\s*[+＋-]\d+\s*XP?$/i, "")
    .slice(0, 12);
}

function getEnergyStage(progress: number) {
  if (progress >= 80) return "满光";
  if (progress >= 50) return "闪亮";
  if (progress >= 25) return "微光";
  return "初亮";
}

function getRecordEnergyToken(record: LedgerRecord) {
  if (record.delta < 0) return "提醒";
  return record.category ? getChildEnergyLabel(record.category) : "点亮";
}

export function SpiritDetailPanel({
  child,
  spirit,
  spiritAssetUrl,
  recentRecords,
  onOpenProfile,
  onStartSelfService,
}: SpiritDetailPanelProps) {
  const progress = xpProgressPercent(child.xp);
  const displayRecords = recentRecords
    .filter((record) => !record.undone && !record.reason.startsWith("演示数据"))
    .slice(0, 2);
  const energyStage = getEnergyStage(progress);

  return (
    <aside className="spirit-card spirit-card-compact" style={{ "--spirit-accent": spirit.accent } as CSSProperties}>
      <div className="spirit-portrait">
        <div className="portrait-ring" />
        {spiritAssetUrl ? <img src={spiritAssetUrl} alt={`${child.name} 精灵形态`} /> : <div className="portrait-fallback">{child.name.slice(0, 1)}</div>}
      </div>

      <div className="spirit-nameplate">
        <h2>{child.name}</h2>
        <p>精灵能量 · {energyStage}</p>
        <div className="spirit-card-actions">
          {onStartSelfService ? (
            <button type="button" className="spirit-self-service-button" onClick={() => onStartSelfService(child.id)}>
              <Mic size={15} />
              说成长
            </button>
          ) : null}
          {onOpenProfile ? (
            <button type="button" className="spirit-profile-button" onClick={() => onOpenProfile(child.id)}>
              <BookOpenText size={15} />
              小屋
            </button>
          ) : null}
        </div>
      </div>

      {displayRecords[0] ? (
        <div className={displayRecords[0].delta < 0 ? "spirit-recent-chip muted" : "spirit-recent-chip"}>
          <span>{getRecordEnergyToken(displayRecords[0])}</span>
          <strong>{getBigScreenRecordLabel(displayRecords[0].reason)}</strong>
        </div>
      ) : null}

      <div className="xp-gem">
        <div>
          <strong>能量槽</strong>
          <span>{energyStage}</span>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <section className="big-screen-story-card" aria-label="大屏成长反馈">
        <div className="big-screen-story-head">
          <span>最近成长</span>
        </div>
        {displayRecords.length === 0 ? (
          <p className="big-screen-empty">新的成长能量会在这里出现。</p>
        ) : (
          <div className="big-screen-records">
            {displayRecords.map((record) => (
              <article key={record.id} className={record.delta < 0 ? "muted" : undefined}>
                <span>{getRecordEnergyToken(record)}</span>
                <div>
                  <strong>{getBigScreenRecordLabel(record.reason)}</strong>
                  <em>
                    <Clock3 size={12} />
                    {record.category ?? "成长记录"}
                  </em>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
