import { BookOpenText, Clock3 } from "lucide-react";
import type { CSSProperties } from "react";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition } from "../../types";
import { xpProgressPercent } from "../../domain/progression";

interface SpiritDetailPanelProps {
  child: ChildWithProgress;
  spirit: SpiritDefinition;
  spiritAssetUrl?: string;
  recentRecords: LedgerRecord[];
  onOpenProfile?: (childId: string) => void;
}

export function SpiritDetailPanel({
  child,
  spirit,
  spiritAssetUrl,
  recentRecords,
  onOpenProfile,
}: SpiritDetailPanelProps) {
  const progress = xpProgressPercent(child.xp);
  const displayRecords = recentRecords.filter((record) => !record.undone).slice(0, 2);

  return (
    <aside className="spirit-card spirit-card-compact" style={{ "--spirit-accent": spirit.accent } as CSSProperties}>
      <div className="spirit-portrait">
        <div className="portrait-ring" />
        {spiritAssetUrl ? <img src={spiritAssetUrl} alt={`${child.name} 精灵形态`} /> : <div className="portrait-fallback">{child.name.slice(0, 1)}</div>}
      </div>

      <div className="spirit-nameplate">
        <h2>{child.name}</h2>
        <p>Lv.{child.level} · {child.xp} XP</p>
        {onOpenProfile ? (
          <button type="button" className="spirit-profile-button" onClick={() => onOpenProfile(child.id)}>
            <BookOpenText size={15} />
            档案
          </button>
        ) : null}
      </div>

      <div className="xp-gem">
        <div>
          <strong>Lv.{child.level}</strong>
          <span>{child.xp} XP</span>
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
                <span>{record.delta > 0 ? `+${record.delta}` : record.delta}</span>
                <div>
                  <strong>{record.reason}</strong>
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
