import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { PixiWorld } from "../../game/pixi/PixiWorld";
import { buildWorldMapData } from "../../game/layout";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition } from "../../types";

export interface PixiWorldMapHandle {
  focusFullIsland: () => void;
  focusSelected: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface PixiWorldMapProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChildId: string;
  recentLedger: LedgerRecord[];
  onSelectChild: (childId: string) => void;
}

export const PixiWorldMap = forwardRef<PixiWorldMapHandle, PixiWorldMapProps>(function PixiWorldMap(
  { childrenWithProgress, spiritsById, selectedChildId, recentLedger, onSelectChild },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<PixiWorld | null>(null);
  const onSelectRef = useRef(onSelectChild);

  useEffect(() => {
    onSelectRef.current = onSelectChild;
  }, [onSelectChild]);

  const mapData = useMemo(
    () => buildWorldMapData({ childrenWithProgress, spiritsById, selectedChildId, recentLedger }),
    [childrenWithProgress, spiritsById, selectedChildId, recentLedger],
  );

  useImperativeHandle(ref, () => ({
    focusFullIsland: () => worldRef.current?.focusFullIsland(),
    focusSelected: () => worldRef.current?.focusSelected(),
    zoomIn: () => worldRef.current?.zoomBy(0.18),
    zoomOut: () => worldRef.current?.zoomBy(-0.18),
  }));

  useEffect(() => {
    if (!hostRef.current) return;
    const world = new PixiWorld({
      onSelectChild: (childId) => onSelectRef.current(childId),
    });
    worldRef.current = world;
    let cancelled = false;
    world.mount(hostRef.current).then(() => {
      if (cancelled) return;
      world.update(mapData);
    });

    return () => {
      cancelled = true;
      world.destroy();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    worldRef.current?.update(mapData);
  }, [mapData]);

  return (
    <div className="pixi-world-host" ref={hostRef} aria-label="北海成长岛 PixiJS 精灵家园地图">
      <div className="map-hint">拖拽移动 · 滚轮缩放 · 点击精灵之家聚焦</div>
    </div>
  );
});
