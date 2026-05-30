import { forwardRef, lazy, Suspense, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  CircleDot,
  Crosshair,
  Home,
  Landmark,
  Leaf,
  MessageCircle,
  Shell,
  Sparkles,
  Sun,
  Swords,
  TreePine,
  type LucideIcon,
} from "lucide-react";
import type { PixiWorldMapHandle } from "./PixiWorldMap";
import { regions } from "../../game/regionConfig";
import type { RegionId } from "../../game/types";
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

const travelMeta: Record<RegionId, { shortName: string; Icon: LucideIcon }> = {
  "growth-plaza": { shortName: "广场", Icon: Sparkles },
  mangrove: { shortName: "红树林", Icon: TreePine },
  "shell-bay": { shortName: "贝壳湾", Icon: Shell },
  "pearl-bay": { shortName: "珍珠湾", Icon: CircleDot },
  "sun-town": { shortName: "小镇", Icon: Sun },
  "math-arena": { shortName: "竞技场", Icon: Swords },
  "old-street": { shortName: "老街", Icon: Landmark },
};

function toCssHex(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export const WorldMapContainer = forwardRef<PixiWorldMapHandle, WorldMapContainerProps>(function WorldMapContainer(
  props,
  ref,
) {
  const pixiMapRef = useRef<PixiWorldMapHandle | null>(null);
  const [activeTravelRegion, setActiveTravelRegion] = useState<RegionId | null>(null);
  const selectedChild =
    props.childrenWithProgress.find((child) => child.id === props.selectedChildId) ?? props.childrenWithProgress[0];
  const selectedSpirit = selectedChild ? props.spiritsById.get(selectedChild.spiritId) : undefined;
  const selectedRecord = useMemo(
    () => props.recentLedger.find((record) => record.childId === props.selectedChildId && !record.undone),
    [props.recentLedger, props.selectedChildId],
  );
  const deltaText = selectedRecord ? `${selectedRecord.delta > 0 ? "+" : ""}${selectedRecord.delta} XP` : "待成长";
  const activityText = selectedRecord ? selectedRecord.reason.slice(0, 16) : "今天还没有新的成长记录";
  const hasCompanionActions = Boolean(props.onOpenDialogue || props.onOpenPk);

  useImperativeHandle(ref, () => ({
    focusFullIsland: () => {
      setActiveTravelRegion(null);
      pixiMapRef.current?.focusFullIsland();
    },
    focusSelected: () => {
      setActiveTravelRegion(null);
      pixiMapRef.current?.focusSelected();
    },
    focusRegion: (regionId) => {
      setActiveTravelRegion(regionId);
      pixiMapRef.current?.focusRegion(regionId);
    },
    zoomIn: () => pixiMapRef.current?.zoomIn(),
    zoomOut: () => pixiMapRef.current?.zoomOut(),
  }));

  const focusTravelRegion = (regionId: RegionId) => {
    setActiveTravelRegion(regionId);
    pixiMapRef.current?.focusRegion(regionId);
  };

  return (
    <section className="world-map-shell">
      {selectedChild && (
        <div className="map-focus-plaque" style={{ "--focus-accent": selectedSpirit?.accent ?? "#59B97C" } as CSSProperties}>
          <span className="focus-home-badge">
            <Home size={17} />
            {selectedChild.name}
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
      <nav className="map-travel-board" aria-label="成长岛区域旅行">
        <strong>
          <Leaf size={15} />
          岛屿旅行
        </strong>
        <div>
          {regions.map((region) => {
            const meta = travelMeta[region.id];
            const Icon = meta.Icon;
            return (
              <button
                key={region.id}
                type="button"
                className={activeTravelRegion === region.id ? "active" : undefined}
                style={{ "--region-accent": toCssHex(region.accent) } as CSSProperties}
                title={region.description}
                onClick={() => focusTravelRegion(region.id)}
              >
                <Icon size={16} />
                <span>{meta.shortName}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {selectedChild && hasCompanionActions && (
        <div className="map-companion-actions" style={{ "--focus-accent": selectedSpirit?.accent ?? "#59B97C" } as CSSProperties}>
          <span className="companion-action-kicker">
            <Sparkles size={15} />
            家门口互动
          </span>
          <strong>{selectedChild.petName}</strong>
          <div>
            <button type="button" disabled={!props.onOpenDialogue} onClick={props.onOpenDialogue}>
              <MessageCircle size={18} />
              对话
            </button>
            <button type="button" disabled={!props.onOpenPk} onClick={props.onOpenPk}>
              <Swords size={18} />
              PK
            </button>
            <button type="button" onClick={() => pixiMapRef.current?.focusSelected()}>
              <Crosshair size={18} />
              家园
            </button>
          </div>
        </div>
      )}
      <Suspense
        fallback={
          <div className="pixi-world-host map-loading" aria-label="成长岛地图加载中">
            <div className="map-hint">地图加载中</div>
          </div>
        }
      >
        <PixiWorldMap ref={pixiMapRef} {...props} />
      </Suspense>
    </section>
  );
});
