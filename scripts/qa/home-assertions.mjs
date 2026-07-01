/**
 * [INPUT]: 依赖 home-tools 的首页测量能力、资源列表和 QA resource summary。
 * [OUTPUT]: 对外提供首页主屏与持续拖拽性能断言。
 * [POS]: scripts/qa 的首页断言 Module，把卡顿、糊屏、精灵停浮验收从 runner.mjs 抽离。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  inspectHomeBigScreen,
  inspectPixiRenderState,
  measureFrameRate,
  measureHomeDrag,
  measureHomeWheel,
  measureSelectedSpiritIdleMotion,
  measureSelectedSpiritWheelIdleMotion,
} from "./home-tools.mjs";

const oneMb = 1024 * 1024;
const minActiveMapRenderResolution = 0.99;
const minSettledMapRenderResolution = 0.99;

function summarizeMapProps(resources, segment) {
  const props = resources.filter((resource) => resource.url.includes(`/assets/map/3d-props/${segment}/`));
  const uniqueUrls = [...new Set(props.map((resource) => resource.url))];
  const bytes = props.reduce((sum, resource) => sum + resource.bytes, 0);
  return {
    count: props.length,
    uniqueCount: uniqueUrls.length,
    mb: Number((bytes / oneMb).toFixed(2)),
    urls: uniqueUrls.map((url) => new URL(url).pathname),
  };
}

function mergeHomeIssues(issues, bigScreen, p15MapProps, p16MapProps) {
  if (!bigScreen.hasSelectedChild) issues.push("home selected child is not visible");
  if (bigScreen.mapShare < 0.75) issues.push(`home map does not dominate workspace: ${bigScreen.mapShare}`);
  if (!bigScreen.energyBoard) issues.push("home map energy board missing");
  if (!bigScreen.hasSelfServiceAction) issues.push("home self-service speak action missing");
  if (!bigScreen.hasSelfServiceDock) issues.push("home self-service dock entry missing");
  if (bigScreen.teacherWorkbenchDocked) issues.push("teacher workbench should not be in primary child dock");
  if (bigScreen.adultVisibleCopy?.length) issues.push(`home shows adult operation copy: ${bigScreen.adultVisibleCopy.join(", ")}`);
  if (bigScreen.childScoreCopy?.length) issues.push(`home child surface still shows score copy: ${bigScreen.childScoreCopy.join(", ")}`);
  if (!bigScreen.shellDock?.rect) issues.push("home shell dock missing");
  if (!bigScreen.shellDock?.hasChildChip) issues.push("home child energy chip missing from shell dock");
  if (bigScreen.shellDock?.teacherToolCopyInPrimaryDock?.length) {
    issues.push(`home primary dock exposes teacher tool copy: ${bigScreen.shellDock.teacherToolCopyInPrimaryDock.join(", ")}`);
  }
  if (!bigScreen.shellDock?.teacherDrawerClosed) issues.push("home teacher fallback drawer is open by default");
  if (bigScreen.shellDock?.teacherPanelVisibleWhenClosed) issues.push("home teacher fallback panel visible while closed");
  if (bigScreen.shellDock?.teacherSummaryText && bigScreen.shellDock.teacherSummaryText !== "师") {
    issues.push(`home teacher fallback summary too prominent: ${bigScreen.shellDock.teacherSummaryText}`);
  }
  if ((bigScreen.shellDock?.teacherSummaryAreaRatioToChild ?? 1) > 0.5) {
    issues.push("home teacher fallback competes with child energy chip");
  }
  if ((bigScreen.shellDock?.teacherSummaryAreaRatioToPrimary ?? 1) > 0.7) {
    issues.push("home teacher fallback competes with primary dock buttons");
  }
  if (!bigScreen.sceneGate) issues.push("home map scene gate missing");
  if (bigScreen.sceneGateButtonCount !== 4) issues.push(`home map scene gate button count wrong: ${bigScreen.sceneGateButtonCount}`);
  if (bigScreen.sceneHotspotCount !== 4) issues.push(`home map dynamic scene hotspots missing: ${bigScreen.sceneHotspotCount}`);
  if (bigScreen.sceneHotspotStatusCount !== 4) issues.push(`home map scene hotspot status missing: ${bigScreen.sceneHotspotStatusCount}`);
  if (bigScreen.sceneLiveHotspotCount < 1) issues.push("home map live scene hotspot missing");
  if (!bigScreen.hasChildDockSelfServiceEntry) issues.push("home child dock self-service entry missing");
  if (bigScreen.dockSelfServiceEntryCount < 1) issues.push("home child dock self-service markers missing");
  if (bigScreen.mapSelfServiceHotspotCount < 2) issues.push(`home map self-service hotspots missing: ${bigScreen.mapSelfServiceHotspotCount}`);
  if (!["p15-growth-tree", "p16-growth-heart"].every((id) => bigScreen.mapSelfServiceHotspots.includes(id))) {
    issues.push("home map growth self-service hotspot ids missing");
  }
  if (!["抽取台", "贝壳算术", "海岛小铺", "荣誉广场"].every((label) => bigScreen.sceneGateText.includes(label))) {
    issues.push("home map scene gate labels missing");
  }
  if (bigScreen.sceneGateMicrocopy?.length) {
    issues.push(`home map scene gate still shows trial-noise copy: ${bigScreen.sceneGateMicrocopy.join(", ")}`);
  }
  if (bigScreen.energySlotCount !== 7) issues.push(`home map energy slots missing: ${bigScreen.energySlotCount}`);
  if (bigScreen.energyCardCount !== 7) issues.push(`home energy cards missing: ${bigScreen.energyCardCount}`);
  if (bigScreen.energyStateCount !== 7) issues.push(`home energy card states missing: ${bigScreen.energyStateCount}`);
  if (bigScreen.visibleEnergyCardCount > 4) {
    issues.push(`home idle energy board is too visually dense: ${bigScreen.visibleEnergyCardCount} visible cards`);
  }

  const hasIdleEnergyHistory =
    bigScreen.pixiEnergyRegionCount > 0 || /已点亮|进精灵|能量到账/.test(bigScreen.energyBoardText ?? "");
  if (hasIdleEnergyHistory && bigScreen.currentEnergyCardsWithStatus < 1) issues.push("home current energy card status missing");
  if (hasIdleEnergyHistory && bigScreen.activeEnergySlotCount < 1) issues.push("home map has no active virtue energy slot");
  if (hasIdleEnergyHistory && bigScreen.currentEnergySlotCount < 1) issues.push("home map has no current virtue energy slot");
  if (hasIdleEnergyHistory && bigScreen.pixiEnergyRegionCount < 1) issues.push("home pixi map has no lit virtue region");
  if (hasIdleEnergyHistory && !bigScreen.pixiCurrentEnergyRegion) issues.push("home pixi map has no current lit virtue region");

  if (p15MapProps.uniqueCount < 24) issues.push(`home P15 accepted map 3d props missing: ${p15MapProps.uniqueCount}/24 loaded`);
  if (p16MapProps.uniqueCount < 24) issues.push(`home P16 accepted map 3d props missing: ${p16MapProps.uniqueCount}/24 loaded`);
  if (bigScreen.largeHeadings.length) issues.push("home contains oversized heading(s)");
  if (bigScreen.noisyCopy.length) issues.push(`home contains noisy explanatory copy: ${bigScreen.noisyCopy.join(", ")}`);
  if (bigScreen.horizontalOverflow) issues.push("home horizontal overflow");
}

function mergeHomeWarnings(warnings, metrics, resourceSummary) {
  const pngBytes = resourceSummary.png?.bytes ?? 0;
  const pngCount = resourceSummary.png?.count ?? 0;

  if (metrics.p15MapProps.mb > 0.45) warnings.push(`home P15 map 3d props are heavy: ${metrics.p15MapProps.mb} MB`);
  if (metrics.p16MapProps.mb > 0.45) warnings.push(`home P16 map 3d props are heavy: ${metrics.p16MapProps.mb} MB`);
  if (pngBytes > 40 * oneMb) warnings.push(`home requested ${(pngBytes / oneMb).toFixed(1)} MB of PNG assets`);
  if (pngCount > 35) warnings.push(`home requested ${pngCount} PNG asset(s)`);
  if (metrics.fps.fps < 30) warnings.push(`home frame sample is low: ${metrics.fps.fps} FPS`);
  if (metrics.wheelFps && metrics.wheelFps.fps < 18) warnings.push(`home active wheel frame sample is low: ${metrics.wheelFps.fps} FPS`);
  if (metrics.dragFps && metrics.dragFps.fps < 18) warnings.push(`home active drag frame sample is low: ${metrics.dragFps.fps} FPS`);
  if (metrics.wheelFps && metrics.wheelFps.maxFrameGap > 280) warnings.push(`home active wheel frame gap is high: ${metrics.wheelFps.maxFrameGap} ms`);
  if (metrics.dragFps && metrics.dragFps.maxFrameGap > 280) warnings.push(`home active drag frame gap is high: ${metrics.dragFps.maxFrameGap} ms`);
}

function mergeHomeClarityIssues(issues, metrics) {
  if (!metrics.selectedSpiritMotion?.ok) {
    issues.push(`home selected spirit idle float is stuck: range ${metrics.selectedSpiritMotion?.range ?? 0}px`);
  }
  if (!metrics.selectedSpiritWheelMotion?.ok) {
    issues.push(`home selected spirit idle float stops after wheel zoom: range ${metrics.selectedSpiritWheelMotion?.range ?? 0}px`);
  }
  if ((metrics.renderState?.mapPropTotalCount ?? 0) > 0 && (metrics.renderState?.mapPropLodMode ?? "") !== "detail") {
    issues.push(`home model prop LOD did not enter detail mode after selected focus: ${metrics.renderState?.mapPropLodMode || "unknown"}`);
  }
  if (
    (metrics.renderState?.mapPropDetailOnlyCount ?? 0) > 0 &&
    (metrics.renderState?.mapPropVisibleCount ?? 0) <=
      (metrics.renderState?.mapPropTotalCount ?? 0) - (metrics.renderState?.mapPropDetailOnlyCount ?? 0)
  ) {
    issues.push("home detail-only model props are still hidden after selected focus");
  }
  if ((metrics.wheelFps?.renderState?.renderResolution ?? 1) < minActiveMapRenderResolution) {
    issues.push(`home wheel active render resolution too low: ${metrics.wheelFps.renderState.renderResolution}`);
  }
  if ((metrics.dragFps?.renderState?.renderResolution ?? 1) < minActiveMapRenderResolution) {
    issues.push(`home drag active render resolution too low: ${metrics.dragFps.renderState.renderResolution}`);
  }
  if ((metrics.wheelFps?.settledRenderState?.renderResolution ?? 1) < minSettledMapRenderResolution) {
    issues.push(`home wheel did not return to crisp render resolution: ${metrics.wheelFps.settledRenderState.renderResolution}`);
  }
  if ((metrics.dragFps?.settledRenderState?.renderResolution ?? 1) < minSettledMapRenderResolution) {
    issues.push(`home drag did not return to crisp render resolution: ${metrics.dragFps.settledRenderState.renderResolution}`);
  }
}

export async function assertHomeMainScreen(page, resources, resourceSummary) {
  const metrics = {
    fps: await measureFrameRate(page, ".pixi-world-canvas"),
    wheelFps: await measureHomeWheel(page),
    dragFps: await measureHomeDrag(page),
    bigScreen: await inspectHomeBigScreen(page),
    selectedSpiritMotion: await measureSelectedSpiritIdleMotion(page),
    selectedSpiritWheelMotion: await measureSelectedSpiritWheelIdleMotion(page),
    renderState: await inspectPixiRenderState(page),
    p15MapProps: summarizeMapProps(resources, "p15"),
    p16MapProps: summarizeMapProps(resources, "p16"),
  };
  const issues = [];
  const warnings = [];

  mergeHomeIssues(issues, metrics.bigScreen, metrics.p15MapProps, metrics.p16MapProps);
  mergeHomeWarnings(warnings, metrics, resourceSummary);
  mergeHomeClarityIssues(issues, metrics);

  return { details: metrics, issues, warnings };
}

export function assertHomePerformanceSoak(performanceSoakDetails) {
  const samples = performanceSoakDetails?.samples ?? [];
  const heapValues = samples.map((sample) => sample.memory?.usedJSHeapMB).filter((value) => Number.isFinite(value));
  const heapDelta = heapValues.length ? Number((Math.max(...heapValues) - Math.min(...heapValues)).toFixed(1)) : 0;
  const issues = [];
  const warnings = [];
  const details = { soak: performanceSoakDetails, heapDelta };

  if (!performanceSoakDetails) issues.push("home performance soak did not run");
  if ((performanceSoakDetails?.frameRate?.fps ?? 0) < 18) {
    warnings.push(`home sustained drag frame sample is low: ${performanceSoakDetails?.frameRate?.fps} FPS`);
  }
  if ((performanceSoakDetails?.frameRate?.p99FrameGap ?? 0) > 320) {
    warnings.push(`home sustained drag p99 frame gap is high: ${performanceSoakDetails?.frameRate?.p99FrameGap} ms`);
  }
  if (heapDelta > 50) warnings.push(`home sustained drag JS heap moved by ${heapDelta} MB`);
  if ((performanceSoakDetails?.settledRenderState?.renderResolution ?? 1) < minSettledMapRenderResolution) {
    issues.push(`home soak did not return to crisp render resolution: ${performanceSoakDetails?.settledRenderState?.renderResolution}`);
  }
  if (
    samples.some(
      (sample) =>
        Number.isFinite(sample.renderState?.renderResolution) &&
        sample.renderState.renderResolution < minActiveMapRenderResolution,
    )
  ) {
    issues.push("home soak dropped below active drag render resolution floor");
  }

  return { details, issues, warnings };
}
