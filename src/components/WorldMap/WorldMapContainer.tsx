import { forwardRef, lazy, Suspense, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  CircleDot,
  Crosshair,
  Home,
  Landmark,
  Leaf,
  MessageCircle,
  Mic,
  Shell,
  ShoppingBag,
  Sparkles,
  Sun,
  TreePine,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { MoralSpeakOverlay, type MoralSpeakViewState } from "../Hud/MoralSpeakOverlay";
import { TeacherMoralReviewCard } from "../Hud/TeacherMoralReviewCard";
import type { PixiWorldMapHandle } from "./PixiWorldMap";
import { virtueCategories } from "../../data/spirits";
import { getEnergyGlyphAsset } from "../../domain/energyAssets";
import {
  canApproveMoralGrowth,
  getChildEnergyColor,
  getChildEnergyLabel,
} from "../../domain/virtueEnergy";
import { regions } from "../../game/regionConfig";
import type { RegionId } from "../../game/types";
import { virtueRegionMap } from "../../game/virtueRegions";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition, VirtueCategory } from "../../types";

interface WorldMapContainerProps {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChildId: string;
  recentLedger: LedgerRecord[];
  assetVersion: number;
  onSelectChild: (childId: string) => void;
  onOpenModule?: (moduleId: "roll-call" | "math-arena" | "shop" | "leaderboard" | "child-profile") => void;
  onPrepareMoralSpeak?: (childId: string) => void;
  onOpenDialogue?: () => void;
  onOpenPk?: () => void;
  moralSpeak?: MoralSpeakViewState;
  onStartMoralSpeak?: () => void;
  onStopMoralSpeak?: () => void;
  onRetryMoralSpeak?: () => void;
  onApproveMoralSpeak?: () => void;
  onAdjustMoralSpeak?: (category: VirtueCategory, delta: 10 | 20 | 30) => void;
  onRespeakMoralSpeak?: () => void;
  onSkipMoralSpeak?: () => void;
  onDeferMoralSpeak?: () => void;
}

const PixiWorldMap = lazy(() => import("./PixiWorldMap").then((module) => ({ default: module.PixiWorldMap })));

const travelMeta: Record<RegionId, { shortName: string; Icon: LucideIcon }> = {
  "growth-plaza": { shortName: "广场", Icon: Sparkles },
  mangrove: { shortName: "红树林", Icon: TreePine },
  "shell-bay": { shortName: "贝壳湾", Icon: Shell },
  "pearl-bay": { shortName: "珍珠湾", Icon: CircleDot },
  "sun-town": { shortName: "小镇", Icon: Sun },
  "math-arena": { shortName: "算术湾", Icon: Shell },
  "old-street": { shortName: "老街", Icon: Landmark },
};

const sceneGateEntries: Array<{
  moduleId: "roll-call" | "math-arena" | "shop" | "leaderboard";
  label: string;
  status: string;
  accent: string;
  Icon: LucideIcon;
}> = [
  { moduleId: "roll-call", label: "抽取台", status: "开始", accent: "#f6b352", Icon: Sparkles },
  { moduleId: "math-arena", label: "贝壳算术", status: "点亮", accent: "#ff7a59", Icon: Shell },
  { moduleId: "shop", label: "海岛小铺", status: "可换", accent: "#2d9fb2", Icon: ShoppingBag },
  { moduleId: "leaderboard", label: "荣誉广场", status: "看看", accent: "#3b7d53", Icon: Trophy },
];

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
  if (cleaned.includes("已有成长")) return "已有成长";
  if (cleaned.includes("自助成长")) return "能量到账";
  if (cleaned.includes("快速加分") || cleaned.includes("课堂积极回应")) return "确认点亮";
  if (cleaned.includes("数学魔法") || cleaned.includes("数学光路")) return "数学光点";
  if (cleaned.includes("快速扣分") || cleaned.includes("减分") || cleaned.includes("扣分")) return "老师提醒";
  return cleaned.replace(/\s*[+＋-]\d+\s*XP?$/i, "").slice(0, 12);
}

function isMapActivityRecord(record: LedgerRecord) {
  return !record.undone && record.source !== "undo" && !record.reason.startsWith("演示数据");
}

function isSelfServiceEnergyRecord(record?: LedgerRecord) {
  return Boolean(record?.delta && record.delta > 0 && record.reason.startsWith("自助成长："));
}

function EnergyGlyphBadge({ category }: { category: VirtueCategory }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const asset = getEnergyGlyphAsset(category);
  const imagePath = asset.available ? asset.publicPath : undefined;

  return (
    <span className={loaded ? "energy-glyph has-image" : "energy-glyph"} aria-hidden="true">
      <i />
      {imagePath && !failed ? (
        <img
          src={imagePath}
          alt=""
          width={30}
          height={30}
          draggable="false"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
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
  const selectedEnergyCategories = useMemo(
    () =>
      new Set(
        props.recentLedger
          .filter((record) => record.childId === props.selectedChildId && record.delta > 0 && record.category && isMapActivityRecord(record))
          .map((record) => record.category as VirtueCategory),
      ),
    [props.recentLedger, props.selectedChildId],
  );
  const selectedRecordIsSelfService = isSelfServiceEnergyRecord(selectedRecord);
  const deltaText = selectedRecord
    ? selectedRecordIsSelfService
      ? "能量进精灵"
      : selectedRecord.delta > 0
        ? "能量进精灵"
        : "老师提醒"
    : "";
  const activityText = selectedRecord ? getMapActivityLabel(selectedRecord.reason) : "";
  const hasCompanionActions = Boolean(props.onPrepareMoralSpeak || props.onOpenDialogue || props.onOpenPk);
  const safeMoralResult = canApproveMoralGrowth(moralSpeak.result) ? moralSpeak.result : undefined;
  const hasMoralResult = Boolean(moralSpeak.result);
  const currentEnergyCategory = hasMoralResult ? safeMoralResult?.category : selectedRecord?.category;
  const currentEnergyColor = getChildEnergyColor(currentEnergyCategory);
  const currentEnergyLabel = getChildEnergyLabel(currentEnergyCategory);
  const currentEnergyValue = (() => {
    if (moralSpeak.result) {
      if (!safeMoralResult) return "请老师帮忙";
      return `${currentEnergyLabel}能量`;
    }
    if (selectedRecord?.category) return `${getChildEnergyLabel(selectedRecord.category)}能量`;
    return "准备点亮";
  })();
  const currentEnergyState = (() => {
    if (moralSpeak.stage === "ready") return "准备说";
    if (moralSpeak.stage === "listening") return "正在说";
    if (moralSpeak.stage === "recognizing") return "贝壳在听";
    if (moralSpeak.stage === "pendingReview") return safeMoralResult ? "等老师" : "需帮助";
    if (moralSpeak.stage === "success") return "已点亮";
    if (moralSpeak.stage === "error") return "需帮助";
    if (moralSpeak.stage !== "idle") return "准备点亮";
    return selectedRecord ? "能量进精灵" : "能量地图";
  })();

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
            当前
          </span>
          <div className="focus-copy">
            <strong>{selectedChild.name}</strong>
            <p>
              {selectedChild.petName} · 点自己说成长
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
        <nav className="map-travel-board" aria-label="成长岛区域">
        <strong>
          <Leaf size={15} />
          去这里
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
                aria-label={`前往${region.name}，${region.description}`}
                onClick={() => focusTravelRegion(region.id)}
              >
                <Icon size={16} />
                <span>{meta.shortName}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {props.onOpenModule && (
        <nav className="map-scene-gate" aria-label="小岛活动入口">
          <strong>
            <Sparkles size={15} />
            小岛活动
          </strong>
          <div>
            {sceneGateEntries.map(({ moduleId, label, status, accent, Icon }, index) => (
              <button
                key={moduleId}
                type="button"
                className={`scene-hotspot ${moduleId === "math-arena" ? "is-live" : ""}`}
                style={{ "--scene-accent": accent, "--scene-index": index } as CSSProperties}
                data-scene-hotspot={moduleId}
                data-scene-status={status}
                aria-label={`${label}，${status}`}
                onClick={() => props.onOpenModule?.(moduleId)}
              >
                <i aria-hidden="true" />
                <Icon size={17} />
                <span>{label}</span>
                <strong>{status}</strong>
              </button>
            ))}
          </div>
        </nav>
      )}
      <section
        className={`map-energy-constellation moral-${moralSpeak.stage}`}
        aria-label="当前能量状态"
        style={{ "--energy-current": currentEnergyColor } as CSSProperties}
      >
        <div className="energy-constellation-head">
          <span>
            <Sparkles size={15} />
            {currentEnergyState}
          </span>
          <strong>{currentEnergyValue}</strong>
        </div>
        <div className="energy-slot-row">
          {virtueCategories.map((category) => {
            const regionId = virtueRegionMap[category];
            const active = selectedEnergyCategories.has(category);
            const current = currentEnergyCategory === category;
            return (
              <button
                key={category}
                type="button"
                className={`energy-card ${active ? "active" : ""} ${current ? "current" : ""}`.trim()}
                style={{ "--energy-color": getChildEnergyColor(category) } as CSSProperties}
                aria-label={`${getChildEnergyLabel(category)}能量，前往${travelMeta[regionId].shortName}`}
                title={`${getChildEnergyLabel(category)} · ${travelMeta[regionId].shortName}`}
                data-energy-state={current ? "current" : active ? "lit" : "idle"}
                data-energy-arrival={current && moralSpeak.stage === "success" ? "arriving" : undefined}
                onClick={() => focusTravelRegion(regionId)}
              >
                <EnergyGlyphBadge category={category} />
                <span>{getChildEnergyLabel(category)}</span>
                <em>{current ? (moralSpeak.stage === "success" ? "进精灵" : "当前") : active ? "已点亮" : "待点亮"}</em>
                <b>{travelMeta[regionId].shortName}</b>
              </button>
            );
          })}
        </div>
      </section>
      {selectedChild && hasCompanionActions && (
        <div className="map-companion-actions" style={{ "--focus-accent": selectedSpirit?.accent ?? "#59B97C" } as CSSProperties}>
          <span className="companion-action-kicker">
            <Sparkles size={15} />
            点精灵
          </span>
          <strong>{selectedChild.petName}</strong>
          <div>
            {props.onPrepareMoralSpeak ? (
              <button
                type="button"
                className="map-self-service-action"
                onClick={() => props.onPrepareMoralSpeak?.(selectedChild.id)}
              >
                <Mic size={18} />
                说成长
              </button>
            ) : null}
            {props.onOpenDialogue ? (
              <button type="button" onClick={props.onOpenDialogue}>
                <MessageCircle size={18} />
                对话
              </button>
            ) : null}
            {props.onOpenPk ? (
              <button type="button" onClick={props.onOpenPk}>
                <Shell size={18} />
                算术
              </button>
            ) : null}
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
        <PixiWorldMap
          ref={pixiMapRef}
          childrenWithProgress={props.childrenWithProgress}
          spiritsById={props.spiritsById}
          selectedChildId={props.selectedChildId}
          recentLedger={props.recentLedger}
          assetVersion={props.assetVersion}
          onSelectChild={props.onSelectChild}
          onOpenDialogue={props.onOpenDialogue}
          onOpenPk={props.onOpenPk}
          onOpenModule={props.onOpenModule}
          onPrepareMoralSpeak={
            props.onPrepareMoralSpeak && selectedChild ? () => props.onPrepareMoralSpeak?.(selectedChild.id) : undefined
          }
        />
      </Suspense>
      <MoralSpeakOverlay
        child={moralSpeakChild}
        spirit={moralSpeakSpirit}
        state={moralSpeak}
        onStart={props.onStartMoralSpeak ?? (() => undefined)}
        onStop={props.onStopMoralSpeak ?? (() => undefined)}
        onRetry={props.onRetryMoralSpeak ?? (() => undefined)}
        onClose={props.onDeferMoralSpeak ?? (() => undefined)}
      />
      {moralSpeak.stage === "pendingReview" ? (
        <TeacherMoralReviewCard
          key={moralSpeak.reviewId ?? `${moralSpeak.childId ?? "child"}:${moralSpeak.transcript ?? ""}`}
          child={moralSpeakChild}
          transcript={moralSpeak.transcript}
          result={moralSpeak.result}
          onApprove={props.onApproveMoralSpeak ?? (() => undefined)}
          onAdjust={props.onAdjustMoralSpeak ?? (() => undefined)}
          onRespeak={props.onRespeakMoralSpeak ?? (() => undefined)}
          onSkip={props.onSkipMoralSpeak ?? (() => undefined)}
        />
      ) : null}
    </section>
  );
});
