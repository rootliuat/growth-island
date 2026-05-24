import { forwardRef, lazy, Suspense } from "react";
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
  return (
    <section className="world-map-shell">
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
