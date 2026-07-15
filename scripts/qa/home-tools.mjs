/**
 * [INPUT]: 依赖 Playwright Page、Pixi canvas QA data-* 契约和浏览器 performance API。
 * [OUTPUT]: 对外提供首页地图清晰度、拖拽、缩放、精灵浮动和 soak 性能测量工具。
 * [POS]: scripts/qa 的首页性能工具 Module，被 runner 与 operations-flows 的页面编排消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export async function measureFrameRate(page, selector) {
  return page.evaluate(async (targetSelector) => {
    const scroller = document.querySelector(targetSelector) || document.scrollingElement;
    const start = performance.now();
    let frames = 0;
    let maxFrameGap = 0;
    let previous = start;
    const canScroll =
      scroller &&
      "scrollTop" in scroller &&
      "scrollHeight" in scroller &&
      "clientHeight" in scroller &&
      scroller.scrollHeight > scroller.clientHeight;
    const initialScrollTop = canScroll ? scroller.scrollTop : 0;

    await new Promise((resolve) => {
      function tick(now) {
        frames += 1;
        maxFrameGap = Math.max(maxFrameGap, now - previous);
        previous = now;
        if (canScroll) scroller.scrollTop = initialScrollTop + frames * 6;
        if (now - start < 1200) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });

    if (canScroll) scroller.scrollTop = initialScrollTop;
    return {
      frames,
      fps: Number((frames / 1.2).toFixed(1)),
      maxFrameGap: Number(maxFrameGap.toFixed(1)),
    };
  }, selector);
}

export async function measureActiveFramesDuring(page, durationMs) {
  return page.evaluate(async (sampleMs) => {
    const start = performance.now();
    let frames = 0;
    let maxFrameGap = 0;
    let maxFrameGapAtMs = 0;
    const frameGaps = [];
    let previous = start;
    await new Promise((resolve) => {
      function tick(now) {
        frames += 1;
        const frameGap = now - previous;
        frameGaps.push(frameGap);
        if (frameGap > maxFrameGap) {
          maxFrameGap = frameGap;
          maxFrameGapAtMs = now - start;
        }
        previous = now;
        if (now - start < sampleMs) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });

    const elapsed = Math.max(1, previous - start);
    const sortedFrameGaps = [...frameGaps].sort((a, b) => a - b);
    const percentile = (value) => {
      if (!sortedFrameGaps.length) return 0;
      const index = Math.min(sortedFrameGaps.length - 1, Math.max(0, Math.ceil((value / 100) * sortedFrameGaps.length) - 1));
      return Number(sortedFrameGaps[index].toFixed(1));
    };
    return {
      frames,
      fps: Number(((frames * 1000) / elapsed).toFixed(1)),
      maxFrameGap: Number(maxFrameGap.toFixed(1)),
      maxFrameGapAtMs: Number(maxFrameGapAtMs.toFixed(1)),
      p95FrameGap: percentile(95),
      p99FrameGap: percentile(99),
      sampleMs: Number(elapsed.toFixed(1)),
    };
  }, durationMs);
}

export async function waitForPixiIdle(page) {
  await page.waitForSelector(".pixi-world-canvas[data-render-state='idle']", { timeout: 7000 }).catch(() => undefined);
}


export async function inspectPixiRenderState(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".pixi-world-canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return undefined;
    return {
      state: canvas.dataset.renderState || "unknown",
      interactionMode: canvas.dataset.interactionMode || "unknown",
      renderResolution: Number(canvas.dataset.renderResolution || Number.NaN),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      cssWidth: canvas.clientWidth,
      cssHeight: canvas.clientHeight,
      backingRatioX: canvas.clientWidth ? Number((canvas.width / canvas.clientWidth).toFixed(3)) : 0,
      backingRatioY: canvas.clientHeight ? Number((canvas.height / canvas.clientHeight).toFixed(3)) : 0,
      selectedSpiritVisible: canvas.dataset.selectedSpiritVisible === "true",
      selectedSpiritBodyY: Number(canvas.dataset.selectedSpiritBodyY || Number.NaN),
      mapPropLodMode: canvas.dataset.mapPropLodMode || "",
      mapPropVisibleCount: Number(canvas.dataset.mapPropVisibleCount || 0),
      mapPropDetailOnlyCount: Number(canvas.dataset.mapPropDetailOnlyCount || 0),
      mapPropTotalCount: Number(canvas.dataset.mapPropTotalCount || 0),
    };
  });
}

export async function inspectHomeBigScreen(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return undefined;
      const r = element.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
      };
    };
    const root = document.querySelector(".home-module");
    const workspace = document.querySelector(".product-workspace");
    const map = document.querySelector(".world-map-shell");
    const energyBoard = document.querySelector(".map-energy-constellation");
    const sceneGate = document.querySelector(".map-scene-gate");
    const pixiCanvas = document.querySelector(".pixi-world-canvas");
    const rootText = root?.innerText ?? "";
    const isVisibleElement = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < innerHeight &&
        rect.right > 0 &&
        rect.left < innerWidth
      );
    };
    const collectVisibleText = (container) =>
      [...(container?.querySelectorAll("button, span, strong, em, small, p, h1, h2") ?? [])]
        .filter(isVisibleElement)
        .map((element) => (element.innerText || element.textContent || "").replace(/\s+/g, ""))
        .join("");
    const visibleText = collectVisibleText(root);
    const shellDock = document.querySelector(".shell-module-dock");
    const shellDockText = collectVisibleText(shellDock);
    const teacherDrawer = document.querySelector(".shell-module-dock .teacher-tools-drawer");
    const teacherSummary = teacherDrawer?.querySelector("summary");
    const teacherPanel = teacherDrawer?.querySelector(".teacher-tools-panel");
    const childChip = document.querySelector(".shell-child-chip");
    const selectedChildChipText = childChip && isVisibleElement(childChip) ? collectVisibleText(childChip) : "";
    const moduleDockButtons = [...document.querySelectorAll(".shell-module-dock .module-dock-button")];
    const rectArea = (element) => {
      const r = element?.getBoundingClientRect();
      return r ? Math.round(r.width * r.height) : 0;
    };
    const averagePrimaryDockArea =
      moduleDockButtons.length > 0
        ? Math.round(moduleDockButtons.reduce((sum, button) => sum + rectArea(button), 0) / moduleDockButtons.length)
        : 0;
    const primaryDockLabels = moduleDockButtons
      .map((button) => (button.innerText || button.getAttribute("aria-label") || "").replace(/\s+/g, ""))
      .filter(Boolean);
    const primaryDockAriaLabels = moduleDockButtons
      .map((button) => (button.getAttribute("aria-label") || "").replace(/\s+/g, ""))
      .filter(Boolean);
    const teacherSummaryText = teacherSummary && isVisibleElement(teacherSummary) ? collectVisibleText(teacherSummary) : "";
    const teacherPanelRect = teacherPanel?.getBoundingClientRect();
    const teacherPanelVisible = Boolean(
      teacherPanelRect &&
        teacherPanelRect.width > 0 &&
        teacherPanelRect.height > 0 &&
        teacherPanelRect.bottom > 0 &&
        teacherPanelRect.top < innerHeight &&
        teacherPanelRect.right > 0 &&
        teacherPanelRect.left < innerWidth,
    );
    const visibleHomeAndDockText = `${visibleText}${shellDockText}`;
    const teacherToolDockPattern = /课堂记录台|老师记录港|贝壳记录台|快速加分|补记|账本|岛务|设置|后台|管理|数据管理/;
    const adultHomeCopy = [
      "快速加分",
      "扣分",
      "确认给",
      "老师确认扣分",
      "课堂记录台",
      "老师记录港",
      "贝壳记录台",
      "账本",
      "岛务",
      "设置",
      "补记",
      "后台",
      "管理",
      "数据",
      "家长",
      "园所",
    ].filter((copy) => visibleHomeAndDockText.includes(copy));
    const childSurfaceText = [
      ".game-topbar",
      ".map-focus-plaque",
      ".map-scene-gate",
      ".map-energy-constellation",
      ".map-companion-actions",
      ".spirit-card",
      ".spirit-dock",
      ".shell-module-dock",
      ".growth-feedback-overlay",
    ]
      .map((selector) => collectVisibleText(document.querySelector(selector)))
      .join("");
    const childScoreCopy = [
      "XP",
      "Lv.",
      "PK",
      "HP",
      "积分",
      "加分",
      "扣分",
      "减分",
      "入账",
      "记录",
      "记录表",
      "Agent",
      "AI建议",
      "开战",
      "攻击",
    ].filter((copy) => childSurfaceText.includes(copy));
    const workspaceRect = workspace?.getBoundingClientRect();
    const mapRect = map?.getBoundingClientRect();
    const mapShare =
      workspaceRect && mapRect
        ? Number(((mapRect.width * mapRect.height) / (workspaceRect.width * workspaceRect.height)).toFixed(3))
        : 0;
    const largeHeadings = [...(root?.querySelectorAll("h1, h2") ?? [])]
      .map((heading) => ({
        text: heading.textContent?.trim() ?? "",
        fontSize: Number.parseFloat(getComputedStyle(heading).fontSize),
        visible: heading.getClientRects().length > 0,
      }))
      .filter((heading) => heading.visible && heading.fontSize > 28);
    const noisyCopy = [
      "北海成长岛首页",
      "最近成长",
      "升级会",
      "距离 Lv",
      "当前伙伴",
      "大屏成长反馈",
      "今天也在成长",
      "已成长",
      "家园 0",
      "家园 1",
      "家园 2",
      "家园 3",
      "家园 4",
    ].filter((text) => rootText.includes(text));
    const sceneGateText = sceneGate?.textContent?.replace(/\s+/g, "") ?? "";
    const sceneGateMicrocopy = ["贝签光", "数学光", "荣誉光", "贝签", "小票", "兑换"].filter((copy) =>
      sceneGateText.includes(copy),
    );

    return {
      root: rect(".home-module"),
      workspace: rect(".product-workspace"),
      map: rect(".world-map-shell"),
      energyBoard: rect(".map-energy-constellation"),
      sceneGate: rect(".map-scene-gate"),
      topbar: rect(".game-topbar"),
      hud: rect(".hud-rail"),
      dock: rect(".spirit-dock"),
      shellDock: {
        rect: rect(".shell-module-dock"),
        text: shellDockText,
        hasChildChip: Boolean(childChip && isVisibleElement(childChip)),
        primaryDockButtonCount: moduleDockButtons.length,
        primaryDockLabels,
        primaryDockAriaLabels,
        teacherDrawerClosed: Boolean(teacherDrawer && !teacherDrawer.matches("[open]")),
        teacherSummaryText,
        teacherSummaryArea: rectArea(teacherSummary),
        childChipArea: rectArea(childChip),
        averagePrimaryDockArea,
        teacherSummaryAreaRatioToChild: childChip ? Number((rectArea(teacherSummary) / rectArea(childChip)).toFixed(2)) : 0,
        teacherSummaryAreaRatioToPrimary:
          averagePrimaryDockArea > 0 ? Number((rectArea(teacherSummary) / averagePrimaryDockArea).toFixed(2)) : 0,
        teacherPanelVisibleWhenClosed: teacherPanelVisible,
        teacherToolCopyInPrimaryDock: primaryDockLabels
          .concat(primaryDockAriaLabels)
          .filter((label) => teacherToolDockPattern.test(label)),
      },
      mapShare,
      energySlotCount: document.querySelectorAll(".energy-slot-row button").length,
      visibleEnergyCardCount: [...document.querySelectorAll(".energy-slot-row .energy-card")].filter(isVisibleElement).length,
      activeEnergySlotCount: document.querySelectorAll(".energy-slot-row button.active").length,
      currentEnergySlotCount: document.querySelectorAll(".energy-slot-row button.current").length,
      energyCardCount: document.querySelectorAll(".energy-slot-row .energy-card").length,
      energyStateCount: document.querySelectorAll(".energy-slot-row [data-energy-state]").length,
      currentEnergyCardsWithStatus: document.querySelectorAll('.energy-slot-row [data-energy-state="current"] em').length,
      energyBoardText: energyBoard?.textContent ?? "",
      sceneGateButtonCount: document.querySelectorAll(".map-scene-gate button").length,
      sceneHotspotCount: document.querySelectorAll(".map-scene-gate [data-scene-hotspot]").length,
      sceneHotspotStatusCount: document.querySelectorAll(".map-scene-gate [data-scene-status]").length,
      sceneLiveHotspotCount: document.querySelectorAll(".map-scene-gate .scene-hotspot.is-live").length,
      sceneGateText,
      sceneGateMicrocopy,
      dockSelfServiceEntryCount: document.querySelectorAll('.spirit-dock [data-self-service-entry]').length,
      hasChildDockSelfServiceEntry: Boolean(document.querySelector('.spirit-dock [data-self-service-entry="dock-current"]')),
      mapSelfServiceHotspotCount: Number(pixiCanvas?.dataset.selfServiceHotspotCount ?? 0),
      mapSelfServiceHotspots: pixiCanvas?.dataset.selfServiceHotspots ?? "",
      hasSelfServiceAction:
        Boolean(document.querySelector(".map-self-service-action, .spirit-self-service-button, .shell-child-chip[aria-label*='说成长']")) &&
        visibleHomeAndDockText.includes("说成长"),
      hasSelfServiceDock: Boolean(document.querySelector(".shell-child-chip[aria-label*='说成长']")) && shellDockText.includes("说成长"),
      teacherWorkbenchDocked: [...document.querySelectorAll(".module-dock-button")].some((button) =>
        teacherToolDockPattern.test(button.getAttribute("aria-label") ?? button.textContent ?? ""),
      ),
      adultVisibleCopy: adultHomeCopy,
      childScoreCopy,
      pixiEnergyRegionCount: Number(pixiCanvas?.dataset.energyRegionCount ?? 0),
      pixiEnergyRegions: pixiCanvas?.dataset.energyRegions ?? "",
      pixiCurrentEnergyRegion: pixiCanvas?.dataset.currentEnergyRegion ?? "",
      textLength: rootText.replace(/\s+/g, "").length,
      selectedChildChipText,
      hasSelectedChild: Boolean(selectedChildChipText || rootText.match(/可可|佳佳|安安|帆帆|石石|小满/)),
      largeHeadings,
      noisyCopy,
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
    };
  });
}


export async function measureHomeWheel(page) {
  const stage = page.locator(".pixi-world-canvas").first();
  const box = await stage.boundingBox({ timeout: 7000 }).catch(() => undefined);
  if (!box) return undefined;
  const samples = [];
  for (let index = 0; index < 3; index += 1) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -320);
    await page.waitForTimeout(40);
    const renderState = await inspectPixiRenderState(page);
    const activeFrameRate = await measureActiveFramesDuring(page, 360);
    await waitForPixiIdle(page);
    const settledRenderState = await inspectPixiRenderState(page);
    samples.push({ ...activeFrameRate, renderState, settledRenderState });
  }
  return samples.sort((a, b) => a.fps - b.fps)[0];
}

export async function measureHomeDrag(page, options = {}) {
  const stage = page.locator(".pixi-world-canvas").first();
  const box = await stage.boundingBox({ timeout: 7000 }).catch(() => undefined);
  if (!box) return undefined;
  const sampleMs = options.sampleMs ?? 1400;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  const movePromise = (async () => {
    const start = Date.now();
    let index = 0;
    while (Date.now() - start < sampleMs + 160) {
      const angle = index * 0.62;
      await page.mouse.move(centerX + Math.cos(angle) * 54, centerY + Math.sin(angle) * 28, { steps: 1 });
      index += 1;
      await page.waitForTimeout(34);
    }
  })();
  await page.waitForTimeout(80);
  const renderState = await inspectPixiRenderState(page);
  const activeFrameRate = await measureActiveFramesDuring(page, sampleMs);
  await movePromise;
  await page.mouse.up();
  await waitForPixiIdle(page);
  const settledRenderState = await inspectPixiRenderState(page);
  return { ...activeFrameRate, renderState, settledRenderState };
}

const selectedSpiritMotionMinRange = 3;
const selectedSpiritMotionMinSamples = 7;
const selectedSpiritMotionMaxSamples = 15;
const selectedSpiritMotionSampleMs = 220;

function summarizeSelectedSpiritMotion(samples) {
  const visibleSamples = samples.filter(
    (sample) => sample?.selectedSpiritVisible && Number.isFinite(sample?.selectedSpiritBodyY),
  );
  const yValues = visibleSamples.map((sample) => sample.selectedSpiritBodyY);
  return {
    range: yValues.length ? Number((Math.max(...yValues) - Math.min(...yValues)).toFixed(2)) : 0,
    visible: visibleSamples.length > 0,
  };
}

async function collectSelectedSpiritMotion(page) {
  const samples = [];
  while (samples.length < selectedSpiritMotionMaxSamples) {
    samples.push(await inspectPixiRenderState(page));
    const motion = summarizeSelectedSpiritMotion(samples);
    if (
      samples.length >= selectedSpiritMotionMinSamples &&
      motion.visible &&
      motion.range >= selectedSpiritMotionMinRange
    ) {
      return { ...motion, samples };
    }
    if (samples.length < selectedSpiritMotionMaxSamples) await page.waitForTimeout(selectedSpiritMotionSampleMs);
  }
  return { ...summarizeSelectedSpiritMotion(samples), samples };
}

export async function measureSelectedSpiritIdleMotion(page) {
  const target = await page.evaluate(() => {
    const ids = window.__growthIslandChildIds ?? [];
    const current = window.__growthIslandSelectedChildId ?? "";
    const childId = ids.find((id) => id !== current) ?? current;
    const selected = childId ? window.__growthIslandSelectMapChildForQa?.(childId) ?? false : false;
    return { childId, selected };
  });
  if (!target.selected) return { ok: false, reason: "qa child selection hook failed", target };
  await page.waitForSelector(".pixi-world-canvas[data-render-state='idle-animating']", { timeout: 6500 }).catch(() => undefined);
  const { range, samples, visible } = await collectSelectedSpiritMotion(page);
  return {
    ok: visible && range >= selectedSpiritMotionMinRange,
    target,
    visible,
    range,
    samples: samples.map((sample) => ({
      state: sample?.state,
      bodyY: sample?.selectedSpiritBodyY,
      selectedSpiritVisible: sample?.selectedSpiritVisible,
      mapPropLodMode: sample?.mapPropLodMode,
      mapPropVisibleCount: sample?.mapPropVisibleCount,
    })),
  };
}

export async function measureSelectedSpiritWheelIdleMotion(page) {
  const target = await page.evaluate(() => {
    const ids = window.__growthIslandChildIds ?? [];
    const current = window.__growthIslandSelectedChildId ?? "";
    const childId = ids.find((id) => id !== current) ?? current;
    const selected = childId ? window.__growthIslandSelectMapChildForQa?.(childId) ?? false : false;
    return { childId, selected };
  });
  if (!target.selected) return { ok: false, reason: "qa child selection hook failed", target };
  await page.waitForSelector(".pixi-world-canvas[data-render-state='idle-animating']", { timeout: 6500 }).catch(() => undefined);
  const stage = page.locator(".pixi-world-canvas").first();
  const box = await stage.boundingBox({ timeout: 7000 }).catch(() => undefined);
  if (!box) return { ok: false, reason: "missing pixi canvas", target };
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -260);
  await page.waitForSelector(".pixi-world-canvas[data-render-state='idle-animating']", { timeout: 6500 }).catch(() => undefined);
  const { range, samples, visible } = await collectSelectedSpiritMotion(page);
  const stayedAnimating = samples.some((sample) => sample?.state === "idle-animating");
  return {
    ok: visible && stayedAnimating && range >= selectedSpiritMotionMinRange,
    target,
    visible,
    stayedAnimating,
    range,
    samples: samples.map((sample) => ({
      state: sample?.state,
      interactionMode: sample?.interactionMode,
      bodyY: sample?.selectedSpiritBodyY,
      selectedSpiritVisible: sample?.selectedSpiritVisible,
      renderResolution: sample?.renderResolution,
    })),
  };
}

export async function measureHomePerformanceSoak(page, options = {}) {
  const stage = page.locator(".pixi-world-canvas").first();
  const box = await stage.boundingBox({ timeout: 7000 }).catch(() => undefined);
  if (!box) return undefined;
  const durationMs = options.durationMs ?? Number(process.env.QA_SOAK_MS || 120000);
  const sampleEveryMs = options.sampleEveryMs ?? 10000;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const samples = [];
  const startedAt = Date.now();
  let nextSampleAt = startedAt;
  let pointerDown = false;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  pointerDown = true;

  const framePromise = page.evaluate(async (sampleMs) => {
    const start = performance.now();
    let frames = 0;
    let maxFrameGap = 0;
    let maxFrameGapAtMs = 0;
    const frameGaps = [];
    let previous = start;
    await new Promise((resolve) => {
      function tick(now) {
        frames += 1;
        const frameGap = now - previous;
        frameGaps.push(frameGap);
        if (frameGap > maxFrameGap) {
          maxFrameGap = frameGap;
          maxFrameGapAtMs = now - start;
        }
        previous = now;
        if (now - start < sampleMs) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    const elapsed = Math.max(1, previous - start);
    const sortedFrameGaps = [...frameGaps].sort((a, b) => a - b);
    const percentile = (value) => {
      if (!sortedFrameGaps.length) return 0;
      const index = Math.min(sortedFrameGaps.length - 1, Math.max(0, Math.ceil((value / 100) * sortedFrameGaps.length) - 1));
      return Number(sortedFrameGaps[index].toFixed(1));
    };
    return {
      frames,
      fps: Number(((frames * 1000) / elapsed).toFixed(1)),
      maxFrameGap: Number(maxFrameGap.toFixed(1)),
      maxFrameGapAtMs: Number(maxFrameGapAtMs.toFixed(1)),
      p95FrameGap: percentile(95),
      p99FrameGap: percentile(99),
      sampleMs: Number(elapsed.toFixed(1)),
    };
  }, durationMs);

  while (Date.now() - startedAt < durationMs) {
    const elapsed = Date.now() - startedAt;
    const angle = elapsed / 180;
    await page.mouse.move(centerX + Math.cos(angle) * 86, centerY + Math.sin(angle * 0.9) * 46, { steps: 1 });
    if (Date.now() >= nextSampleAt) {
      const renderState = await inspectPixiRenderState(page);
      const memory = await page.evaluate(() => {
        const value = performance.memory;
        return value
          ? {
              usedJSHeapMB: Number((value.usedJSHeapSize / 1024 / 1024).toFixed(1)),
              totalJSHeapMB: Number((value.totalJSHeapSize / 1024 / 1024).toFixed(1)),
            }
          : undefined;
      });
      samples.push({ elapsedMs: elapsed, renderState, memory });
      nextSampleAt += sampleEveryMs;
    }
    await page.waitForTimeout(48);
  }

  const frameRate = await framePromise;
  if (pointerDown) await page.mouse.up();
  await waitForPixiIdle(page);
  const settledRenderState = await inspectPixiRenderState(page);
  return {
    durationMs,
    frameRate,
    samples,
    settledRenderState,
  };
}
