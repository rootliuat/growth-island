import { forwardRef, lazy, Suspense, useMemo, type CSSProperties } from "react";
import { Home, Sparkles } from "lucide-react";
import type { PixiWorldMapHandle } from "./PixiWorldMap";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition } from "../../types";

interface WorldMapContainerProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChildId: string;
  recentLedger: LedgerRecord[];
  assetVersion: number;
  onSelectChild: (childId: string) => void;
  onOpenDialogue?: () => void;
  onOpenPk?: () => void;
}

const PixiWorldMap = lazy(() => import("./PixiWorldMap").then((module) => ({ default: module.PixiWorldMap })));

export const WorldMapContainer = forwardRef<PixiWorldMapHandle, WorldMapContainerProps>(function WorldMapContainer(
  props,
  ref,
) {
  const selectedChild =
    props.childrenWithProgress.find((child) => child.id === props.selectedChildId) ?? props.childrenWithProgress[0];
  const selectedSpirit = selectedChild ? props.spiritsById.get(selectedChild.spiritId) : undefined;
  const selectedRecord = useMemo(
    () => props.recentLedger.find((record) => record.childId === props.selectedChildId && !record.undone),
    [props.recentLedger, props.selectedChildId],
  );
  const deltaText = selectedRecord ? `${selectedRecord.delta > 0 ? "+" : ""}${selectedRecord.delta} XP` : "待成长";
  const activityText = selectedRecord ? selectedRecord.reason.slice(0, 16) : "今天还没有新的成长记录";

  return (
    <section className="world-map-shell">
      {selectedChild && (
        <div className="map-focus-plaque" style={{ "--focus-accent": selectedSpirit?.accent ?? "#59B97C" } as CSSProperties}>
          <span className="focus-home-badge">
            <Home size={17} />
            {selectedChild.slotId}号家园
          </span>
          <div className="focus-copy">
            <strong>{selectedChild.petName}</strong>
            <p>
              Lv.{selectedChild.level} · {selectedChild.xp} XP · {selectedSpirit?.name ?? "精灵伙伴"}
            </p>
          </div>
          <span className={selectedRecord && selectedRecord.delta < 0 ? "focus-delta negative" : "focus-delta"}>
            <Sparkles size={15} />
            {deltaText}
          </span>
          <em>{activityText}</em>
        </div>
      )}
      <Suspense
        fallback={
          <div className="pixi-world-host map-loading" aria-label="成长岛地图加载中">
            <div className="map-hint">地图加载中</div>
          </div>
        }
      >
        <PixiWorldMap ref={ref} {...props} />
      </Suspense>
    </section>
  );
});
