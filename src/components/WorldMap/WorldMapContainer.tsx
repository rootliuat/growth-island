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
import { MoralSpeakOverlay, type MoralSpeakViewState } from "../Hud/MoralSpeakOverlay";
import { TeacherMoralReviewCard } from "../Hud/TeacherMoralReviewCard";
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
  moralSpeak?: MoralSpeakViewState;
  onStartMoralSpeak?: () => void;
  onRetryMoralSpeak?: () => void;
  onApproveMoralSpeak?: () => void;
  onAdjustMoralSpeak?: (delta: 10 | 20 | 30) => void;
  onDeferMoralSpeak?: () => void;
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

function getMapActivityLabel(reason: string) {
  const cleaned = reason
    .replace(/^演示数据[:：]?\s*/, "")
    .replace(/^课堂记录[:：]?\s*/, "")
    .replace(/^对话[:：]?\s*/, "")
    .replace(/^语音记录[:：]?\s*/, "")
    .trim();
  if (cleaned.includes("已有成长")) return "成长记录";
  if (cleaned.includes("快速加分")) return "课堂记录";
  if (cleaned.includes("快速扣分") || cleaned.includes("减分") || cleaned.includes("扣分")) return "行为提醒";
  return cleaned.replace(/\s*[+＋-]\d+\s*XP?$/i, "").slice(0, 12);
}

function isMapActivityRecord(record: LedgerRecord) {
  return !record.undone && record.source !== "undo" && !record.reason.startsWith("演示数据");
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
  const moralSpeak = props.moralSpeak ?? { stage: "idle" as const };
  const moralSpeakChild = moralSpeak.childId
    ? props.childrenWithProgress.find((child) => child.id === moralSpeak.childId) ?? selectedChild
    : selectedChild;
  const moralSpeakSpirit = moralSpeakChild ? props.spiritsById.get(moralSpeakChild.spiritId) : selectedSpirit;
  const selectedRecord = useMemo(
    () => props.recentLedger.find((record) => record.childId === props.selectedChildId && isMapActivityRecord(record)),
    [props.recentLedger, props.selectedChildId],
  );
  const deltaText = selectedRecord ? `${selectedRecord.delta > 0 ? "+" : ""}${selectedRecord.delta} XP` : "";
  const activityText = selectedRecord ? getMapActivityLabel(selectedRecord.reason) : "";
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
    <section className={`world-map-shell moral-stage-${moralSpeak.stage}`}>
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
          {selectedRecord && (
            <span className={selectedRecord.delta < 0 ? "focus-delta negative" : "focus-delta"}>
              <Sparkles size={15} />
              {deltaText}
            </span>
          )}
          {activityText && <em>{activityText}</em>}
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
      <MoralSpeakOverlay
        child={moralSpeakChild}
        spirit={moralSpeakSpirit}
        state={moralSpeak}
        onStart={props.onStartMoralSpeak ?? (() => undefined)}
        onRetry={props.onRetryMoralSpeak ?? (() => undefined)}
        onClose={props.onDeferMoralSpeak ?? (() => undefined)}
      />
      {moralSpeak.stage === "pendingReview" ? (
        <TeacherMoralReviewCard
          child={moralSpeakChild}
          transcript={moralSpeak.transcript}
          result={moralSpeak.result}
          onApprove={props.onApproveMoralSpeak ?? (() => undefined)}
          onAdjust={props.onAdjustMoralSpeak ?? (() => undefined)}
          onDefer={props.onDeferMoralSpeak ?? (() => undefined)}
        />
      ) : null}
    </section>
  );
});
