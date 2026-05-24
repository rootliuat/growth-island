import { forwardRef } from "react";
import type { PixiWorldMapHandle } from "./PixiWorldMap";
import { PixiWorldMap } from "./PixiWorldMap";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition } from "../../types";

interface WorldMapContainerProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChildId: string;
  recentLedger: LedgerRecord[];
  onSelectChild: (childId: string) => void;
  onOpenDialogue?: () => void;
  onOpenPk?: () => void;
}

export const WorldMapContainer = forwardRef<PixiWorldMapHandle, WorldMapContainerProps>(function WorldMapContainer(
  props,
  ref,
) {
  return (
    <section className="world-map-shell">
      <PixiWorldMap ref={ref} {...props} />
    </section>
  );
});
