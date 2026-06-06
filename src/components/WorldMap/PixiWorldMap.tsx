import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { PixiWorld } from "../../game/pixi/PixiWorld";
import { buildWorldMapData } from "../../game/layout";
import type { RegionId } from "../../game/types";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition } from "../../types";

export interface PixiWorldMapHandle {
  focusFullIsland: () => void;
  focusSelected: () => void;
  focusRegion: (regionId: RegionId) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface PixiWorldMapProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChildId: string;
  recentLedger: LedgerRecord[];
  assetVersion: number;
  onSelectChild: (childId: string) => void;
  onOpenDialogue?: () => void;
  onOpenPk?: () => void;
  onOpenModule?: (moduleId: "shop" | "leaderboard" | "child-profile") => void;
}

export const PixiWorldMap = forwardRef<PixiWorldMapHandle, PixiWorldMapProps>(function PixiWorldMap(
  { childrenWithProgress, spiritsById, selectedChildId, recentLedger, assetVersion, onSelectChild, onOpenDialogue, onOpenPk, onOpenModule },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<PixiWorld | null>(null);
  const onSelectRef = useRef(onSelectChild);
  const onOpenDialogueRef = useRef(onOpenDialogue);
  const onOpenPkRef = useRef(onOpenPk);
  const onOpenModuleRef = useRef(onOpenModule);
  const previousSelectedChildIdRef = useRef(selectedChildId);

  useEffect(() => {
    onSelectRef.current = onSelectChild;
    onOpenDialogueRef.current = onOpenDialogue;
    onOpenPkRef.current = onOpenPk;
    onOpenModuleRef.current = onOpenModule;
  }, [onOpenDialogue, onOpenModule, onOpenPk, onSelectChild]);

  const mapData = useMemo(
    () => buildWorldMapData({ childrenWithProgress, spiritsById, selectedChildId, recentLedger }),
    [assetVersion, childrenWithProgress, spiritsById, selectedChildId, recentLedger],
  );

  useImperativeHandle(ref, () => ({
    focusFullIsland: () => worldRef.current?.focusFullIsland(),
    focusSelected: () => worldRef.current?.focusSelected(),
    focusRegion: (regionId) => worldRef.current?.focusRegion(regionId),
    zoomIn: () => worldRef.current?.zoomBy(0.18),
    zoomOut: () => worldRef.current?.zoomBy(-0.18),
  }));

  useEffect(() => {
    if (!hostRef.current) return;
    const world = new PixiWorld({
      onSelectChild: (childId) => onSelectRef.current(childId),
      onOpenDialogue: () => onOpenDialogueRef.current?.(),
      onOpenPk: () => onOpenPkRef.current?.(),
      onOpenModule: (moduleId) => onOpenModuleRef.current?.(moduleId),
    });
    worldRef.current = world;
    let cancelled = false;
    world.mount(hostRef.current).then(() => {
      if (cancelled) {
        world.destroy();
        return;
      }
      world.update(mapData);
    });

    return () => {
      cancelled = true;
      world.destroy();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    const selectedChanged = previousSelectedChildIdRef.current !== selectedChildId;
    worldRef.current?.update(mapData);
    if (!selectedChanged) return;
    previousSelectedChildIdRef.current = selectedChildId;
    const frame = requestAnimationFrame(() => {
      worldRef.current?.focusChild(selectedChildId);
    });
    return () => cancelAnimationFrame(frame);
  }, [mapData, selectedChildId]);

  return (
    <div className="pixi-world-host" ref={hostRef} aria-label="成长岛精灵家园地图">
      <div className="map-hint">全岛巡览 · 家园能量稳定</div>
    </div>
  );
});
