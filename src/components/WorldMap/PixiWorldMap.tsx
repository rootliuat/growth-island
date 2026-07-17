/**
 * [INPUT]: 依赖 React 生命周期、PixiWorld 运行时、地图布局与最新课堂孩子/账本数据。
 * [OUTPUT]: 对外提供 PixiWorldMap 组件与 PixiWorldMapHandle 命令接口。
 * [POS]: components/WorldMap 的懒加载运行时桥，挂载期由 PixiWorld 保存最新读模型，避免旧闭包覆盖当前孩子。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

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
  onPrepareMoralSpeak?: () => void;
}

export const PixiWorldMap = forwardRef<PixiWorldMapHandle, PixiWorldMapProps>(function PixiWorldMap(
  {
    childrenWithProgress,
    spiritsById,
    selectedChildId,
    recentLedger,
    assetVersion,
    onSelectChild,
    onOpenDialogue,
    onOpenPk,
    onOpenModule,
    onPrepareMoralSpeak,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<PixiWorld | null>(null);
  const onSelectRef = useRef(onSelectChild);
  const onOpenDialogueRef = useRef(onOpenDialogue);
  const onOpenPkRef = useRef(onOpenPk);
  const onOpenModuleRef = useRef(onOpenModule);
  const onPrepareMoralSpeakRef = useRef(onPrepareMoralSpeak);
  const previousSelectedChildIdRef = useRef(selectedChildId);

  useEffect(() => {
    onSelectRef.current = onSelectChild;
    onOpenDialogueRef.current = onOpenDialogue;
    onOpenPkRef.current = onOpenPk;
    onOpenModuleRef.current = onOpenModule;
    onPrepareMoralSpeakRef.current = onPrepareMoralSpeak;
  }, [onOpenDialogue, onOpenModule, onOpenPk, onPrepareMoralSpeak, onSelectChild]);

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
      onPrepareMoralSpeak: () => onPrepareMoralSpeakRef.current?.(),
    });
    worldRef.current = world;
    void world.mount(hostRef.current);

    return () => {
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
