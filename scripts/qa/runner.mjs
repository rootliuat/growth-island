/**
 * [INPUT]: 依赖 Playwright、QA check catalog、home/operations QA Module、Vite 页面和本地 QA hooks。
 * [OUTPUT]: 对外执行视觉/触控/性能 QA 并写入 qa-artifacts/latest/report.json。
 * [POS]: scripts/qa 的浏览器与报告编排核心，已委托首页和课堂运营域，仍承载待拆分的遗留流程。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { allChecks } from "./checks/index.mjs";
import { assertHomeMainScreen, assertHomePerformanceSoak } from "./home-assertions.mjs";
import {
  exerciseDataManagementFlow,
  exerciseOrganizationFlow,
  exerciseSettingsFlow,
  inspectMobileDataDrawer,
  inspectMobileSettings,
  inspectModulePage,
} from "./operations-flows.mjs";
import {
  inspectHomeBigScreen,
  inspectPixiRenderState,
  measureFrameRate,
  measureHomePerformanceSoak,
  waitForPixiIdle,
} from "./home-tools.mjs";

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:5173";
const outputDir = path.resolve("qa-artifacts/latest");
const oneMb = 1024 * 1024;

const viewports = [
  { name: "whiteboard", width: 1850, height: 1150 },
  { name: "ultra", width: 2560, height: 1440 },
  { name: "compact", width: 1600, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const requestedChecks = (process.env.QA_CHECKS || "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const checks = requestedChecks.length ? allChecks.filter((check) => requestedChecks.includes(check.name)) : allChecks;
const browserExecutablePath =
  process.env.PLAYWRIGHT_CHROME_PATH || (fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined);

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function resourceExt(url, resourceType) {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\.([a-z0-9]+)$/i);
  return (match?.[1] || resourceType || "other").toLowerCase();
}

function summarizeResources(resources) {
  return resources.reduce((summary, resource) => {
    const current = summary[resource.ext] ?? { count: 0, bytes: 0 };
    current.count += 1;
    current.bytes += resource.bytes;
    summary[resource.ext] = current;
    return summary;
  }, {});
}

function extractSelectedChildName(text) {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => !line.includes("XP") && !line.includes("能量") && !line.startsWith("Lv.") && line !== "小屋" && line !== "查看小屋") ?? ""
  );
}

function parseEnergyValue(text) {
  const match = text.match(/(\d+)\s*(?:XP|能量)/);
  return Number(match?.[1] ?? Number.NaN);
}

function parseEnergyDelta(text) {
  const match = text.match(/([+-]?\d+)\s*(?:XP|能量)/);
  return Number(match?.[1] ?? 0);
}

function textHasEnergyValue(text, value) {
  return text.includes(`${value} XP`) || text.includes(`${value} 能量`);
}

async function readGrowthFeedback(page) {
  return page.evaluate(() => {
    const overlay = document.querySelector(".growth-feedback-overlay");
    const rect = overlay?.getBoundingClientRect();
    const feedback = window.__growthIslandFeedback;
    const domDelta = overlay?.getAttribute("data-delta") ?? "";
    const parsedDomDelta = domDelta === "" ? undefined : Number(domDelta);
    const text = overlay?.textContent?.replace(/\s+/g, " ").trim() ?? "";

    return {
      exists: Boolean(feedback || overlay),
      visible: Boolean(rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight),
      kind: overlay?.getAttribute("data-kind") ?? feedback?.kind ?? "",
      tone: feedback?.tone ?? "",
      title: feedback?.title ?? "",
      detail: feedback?.detail ?? "",
      delta: Number.isFinite(parsedDomDelta) ? parsedDomDelta : feedback?.delta,
      childName: feedback?.childName ?? "",
      text,
    };
  });
}

function feedbackShowsDelta(feedback, delta) {
  return Boolean(
    feedback?.visible &&
      feedback.delta === delta &&
      /能量|光点|点亮|精灵|老师提醒/.test(feedback.text) &&
      !/XP|积分|加分|扣分|减分|入账/i.test(feedback.text),
  );
}

function feedbackShowsAction(feedback, kind, pattern) {
  return Boolean(feedback?.visible && feedback.kind === kind && pattern.test(feedback.text));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readSelectOptions(page, selector) {
  return page.evaluate((selectSelector) => {
    const select = document.querySelector(selectSelector);
    if (!(select instanceof HTMLSelectElement)) return [];
    return [...select.options].map((option) => ({ id: option.value, name: option.textContent?.trim() ?? "" }));
  }, selector);
}

async function readSelectedOption(page, selector) {
  return page.evaluate((selectSelector) => {
    const select = document.querySelector(selectSelector);
    if (!(select instanceof HTMLSelectElement)) return { id: "", name: "" };
    return {
      id: select.value,
      name: select.selectedOptions[0]?.textContent?.trim() ?? "",
    };
  }, selector);
}

async function waitForModelStageSettled(page, selector, timeout = 3500) {
  await page.waitForFunction(
    (stageSelector) => {
      const stage = document.querySelector(stageSelector);
      const status = stage?.getAttribute("data-status");
      return status === "ready" || status === "fallback";
    },
    selector,
    { timeout },
  ).catch(() => undefined);
}

async function exerciseTeacherFallbackReturnHome(page, screenshot) {
  const initial = await inspectHomeBigScreen(page);
  const drawerSummary = page.locator(".teacher-tools-drawer summary").first();
  await drawerSummary.click();
  await page.waitForSelector(".teacher-tools-drawer[open] .teacher-tools-panel", { timeout: 3000 });
  await page.waitForTimeout(120);
  const opened = await inspectHomeBigScreen(page);
  await page.locator(".teacher-tools-panel button").first().click();
  await page.waitForSelector(".teacher-workbench-page", { timeout: 5000 });
  const teacherModule = await page.evaluate(() => ({
    hasTeacherWorkbench: Boolean(document.querySelector(".teacher-workbench-page")),
    drawerOpen: Boolean(document.querySelector(".teacher-tools-drawer")?.matches("[open]")),
    activeTeacherTool: Boolean(document.querySelector(".teacher-tools-panel button.active")),
  }));
  await page.locator(".scene-command-home").click();
  await page.waitForSelector(".home-screen-shell", { timeout: 5000 });
  await page.waitForTimeout(250);
  await waitForPixiIdle(page);
  const afterReturn = await inspectHomeBigScreen(page);
  await page.screenshot({ path: screenshot, fullPage: false });

  return {
    initial,
    opened,
    teacherModule,
    afterReturn,
  };
}

async function inspectTouchAndOverlap(page) {
  return page.evaluate(() => {
    const roundRect = (rect) => ({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
    });
    const toRect = (element) => roundRect(element.getBoundingClientRect());
    const intersect = (first, second) => {
      const left = Math.max(first.left, second.left);
      const top = Math.max(first.top, second.top);
      const right = Math.min(first.right, second.right);
      const bottom = Math.min(first.bottom, second.bottom);
      if (right <= left || bottom <= top) return undefined;
      return {
        left,
        top,
        right,
        bottom,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };
    };
    const clipsOverflow = (element) => {
      const style = getComputedStyle(element);
      return [style.overflow, style.overflowX, style.overflowY].some((value) => ["auto", "hidden", "scroll", "clip"].includes(value));
    };
    const visibleRect = (element) => {
      let rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return undefined;
      rect = intersect(rect, { left: 0, top: 0, right: innerWidth, bottom: innerHeight });
      if (!rect) return undefined;
      const fixedPosition = getComputedStyle(element).position === "fixed";
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") return undefined;
        if (fixedPosition) continue;
        if (!clipsOverflow(parent)) continue;
        rect = intersect(rect, parent.getBoundingClientRect());
        if (!rect) return undefined;
      }
      return rect;
    };
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = visibleRect(element);
      return style.display !== "none" && style.visibility !== "hidden" && Boolean(rect);
    };
    const visibleElements = (selector) => [...document.querySelectorAll(selector)].filter(isVisible);
    const overlaps = (a, b) => {
      const xOverlap = Math.min(a.right, b.right) - Math.max(a.x, b.x);
      const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      return xOverlap > 1 && yOverlap > 1;
    };
    const hitTest = (element, rect) => {
      const x = Math.max(0, Math.min(innerWidth - 1, rect.x + rect.width / 2));
      const y = Math.max(0, Math.min(innerHeight - 1, rect.y + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      return {
        x: Math.round(x),
        y: Math.round(y),
        hit: Boolean(hit && (hit === element || element.contains(hit))),
        hitTag: hit?.tagName ?? "",
        hitClass: hit instanceof Element ? hit.className?.toString() ?? "" : "",
      };
    };
    const isHorizontalScrollEdgeClip = (element, rect, rawRect) =>
      rawRect.width >= 44 &&
      rawRect.height >= 44 &&
      rect.height >= 44 &&
      rect.width < 44 &&
      Boolean(element.closest(".dock-scroll, .energy-slot-row, .module-dock-scroll"));

    const touchTargets = [
      { label: "mic", selector: ".moral-mic-button" },
      { label: "speaking-state", selector: ".moral-wave-state, .moral-shell-state" },
      { label: "retry", selector: ".moral-retry-button" },
      { label: "teacher-review-action", selector: ".teacher-review-actions button, .review-edit-popover summary" },
      { label: "review-adjust-option", selector: ".review-edit-panel button, .review-edit-panel select" },
      { label: "selected-spirit", selector: ".dock-selected-summary" },
      { label: "dock-collapse", selector: ".dock-collapse" },
      { label: "dock-spirit", selector: ".dock-spirit" },
      { label: "self-service", selector: ".spirit-self-service-button, .map-self-service-action, .shell-child-chip" },
      { label: "module-dock", selector: ".module-dock-button, .teacher-tools-drawer summary" },
      { label: "zoom", selector: ".zoom-controls button" },
      { label: "scene-gate", selector: ".map-scene-gate button" },
      { label: "energy-slot", selector: ".energy-slot-row button" },
    ];

    const badTargets = touchTargets.flatMap(({ label, selector }) =>
      visibleElements(selector).flatMap((element, index) => {
        const rawRect = toRect(element);
        const rect = roundRect(visibleRect(element) ?? element.getBoundingClientRect());
        if (isHorizontalScrollEdgeClip(element, rect, rawRect)) return [];
        if (rect.width >= 44 && rect.height >= 44) return [];
        return [{ label, index, text: element.textContent?.replace(/\s+/g, "") ?? "", rect, rawRect }];
      }),
    );
    const blockedTargets = touchTargets.flatMap(({ label, selector }) =>
      visibleElements(selector).flatMap((element, index) => {
        const rawRect = toRect(element);
        const rect = roundRect(visibleRect(element) ?? element.getBoundingClientRect());
        if (isHorizontalScrollEdgeClip(element, rect, rawRect)) return [];
        const hit = hitTest(element, rect);
        if (hit.hit) return [];
        return [{ label, index, text: element.textContent?.replace(/\s+/g, "") ?? "", rect, rawRect, hit }];
      }),
    );

    const overlapPairs = [
      ["teacher-review", ".teacher-review-corner-card", "topbar", ".game-topbar"],
      ["teacher-review", ".teacher-review-corner-card", "scene-gate", ".map-scene-gate"],
      ["teacher-review", ".teacher-review-corner-card", "spirit-dock", ".spirit-dock"],
      ["teacher-review", ".teacher-review-corner-card", "speech-bubble", ".spirit-speech-bubble"],
      ["teacher-review", ".teacher-review-corner-card", "energy-board", ".map-energy-constellation"],
      ["scene-gate", ".map-scene-gate", "spirit-dock", ".spirit-dock"],
      ["spirit-dock", ".spirit-dock", "module-dock", ".shell-module-dock"],
      ["spirit-dock", ".spirit-dock", "speech-bubble", ".spirit-speech-bubble"],
      ["spirit-dock", ".spirit-dock", "moral-mic", ".moral-mic-button"],
      ["topbar", ".game-topbar", "energy-board", ".map-energy-constellation"],
      ["growth-feedback", ".growth-feedback-overlay", "teacher-review", ".teacher-review-corner-card"],
    ];

    const overlapIssues = overlapPairs.flatMap(([firstLabel, firstSelector, secondLabel, secondSelector]) => {
      const firstRects = visibleElements(firstSelector).map((element) => roundRect(visibleRect(element) ?? element.getBoundingClientRect()));
      const secondRects = visibleElements(secondSelector).map((element) => roundRect(visibleRect(element) ?? element.getBoundingClientRect()));
      for (const firstRect of firstRects) {
        for (const secondRect of secondRects) {
          if (overlaps(firstRect, secondRect)) return [{ firstLabel, secondLabel, firstRect, secondRect }];
        }
      }
      return [];
    });

    return {
      badTargets,
      blockedTargets,
      overlapIssues,
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
    };
  });
}

async function inspectP4SceneShell(page) {
  return page.evaluate(() => {
    const bar = document.querySelector(".shell-scene-command-bar");
    const text = bar?.textContent?.replace(/\s+/g, "") ?? "";
    const rect = bar?.getBoundingClientRect();
    const style = bar ? getComputedStyle(bar) : undefined;
    const plainWhite = style
      ? ["rgb(255, 255, 255)", "rgba(255, 255, 255, 1)", "#ffffff"].includes(style.backgroundColor) && style.backgroundImage === "none"
      : false;
    const page = document.querySelector(".module-page");
    const pageText = page?.innerText ?? "";
    const visibleLargeHeadings = [...(page?.querySelectorAll("h1, h2") ?? [])]
      .map((heading) => ({
        text: heading.textContent?.trim() ?? "",
        fontSize: Number.parseFloat(getComputedStyle(heading).fontSize),
        visible: heading.getClientRects().length > 0,
      }))
      .filter((heading) => heading.visible && heading.fontSize > 28);
    const longIntroParagraphs = [
      ...(page?.querySelectorAll(".module-hero p, .roll-call-header p, .math-arena-header p, .reward-header p, .leaderboard-header p, .voice-record-header p, .workbench-header p, .profile-header p, .data-header p, .organization-header p, .settings-header p") ?? []),
    ]
      .map((paragraph) => paragraph.textContent?.replace(/\s+/g, "") ?? "")
      .filter((paragraph) => paragraph.length > 54);
    const backendCopy = ["后台", "管理后台", "SaaS", "功能介绍", "路线图", "未来规划", "占位"].filter((copy) => pageText.includes(copy));

    return {
      exists: Boolean(bar),
      visible: Boolean(rect && rect.width > 0 && rect.height > 0),
      text,
      hasSceneTitle: Boolean(bar?.querySelector(".scene-command-title strong")),
      hasCurrentChild: Boolean(bar?.querySelector(".scene-command-chip.child")),
      hasEnergyChip: Boolean(bar?.querySelector(".scene-command-chip.xp")),
      hasRewardChip: Boolean(bar?.querySelector(".scene-command-chip.reward")),
      hasHomeAction: Boolean(bar?.querySelector(".scene-command-home")),
      plainWhite,
      largeHeadings: visibleLargeHeadings,
      longIntroParagraphs,
      backendCopy,
    };
  });
}

async function inspectTeacherCards(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
    };
    const visibleCards = [...document.querySelectorAll(".workbench-student-card")].filter((card) => {
      const r = card.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    });
    const badCards = [];

    for (const [index, card] of visibleCards.entries()) {
      const avatar = card.querySelector(".student-card-avatar");
      const img = card.querySelector(".student-card-avatar img");
      const meta = card.querySelector(".student-card-meta");
      if (!avatar || !meta) continue;

      const cardRect = rect(card);
      const avatarRect = rect(avatar);
      const imgRect = img ? rect(img) : undefined;
      const metaRect = rect(meta);
      const separated = avatarRect.bottom <= metaRect.y + 0.5;
      const imageInsideAvatar = imgRect
        ? imgRect.x >= avatarRect.x - 1 &&
          imgRect.right <= avatarRect.right + 1 &&
          imgRect.y >= avatarRect.y - 1 &&
          imgRect.bottom <= avatarRect.bottom + 1
        : true;
      const cardContains = metaRect.bottom <= cardRect.bottom + 1;
      const metaClipped = meta.scrollWidth > meta.clientWidth + 1;
      if (!separated || !imageInsideAvatar || !cardContains || metaClipped) {
        badCards.push({ index, separated, imageInsideAvatar, cardContains, metaClipped });
      }
    }

    return {
      totalCards: document.querySelectorAll(".workbench-student-card").length,
      visibleCards: visibleCards.length,
      badCards,
    };
  });
}

async function exerciseRollCall(page, rollCallScreenshot, homeScreenshot) {
  const startButton = page.getByRole("button", { name: /抽取|抽一名|开始(?:点名)?/ }).first();
  await startButton.click();
  await page.waitForTimeout(1250);
  const drawn = await page.evaluate(() => {
    const text = document.body.innerText;
    const selectedChildId = window.__growthIslandSelectedChildId;
    const name = document.querySelector(".roll-call-nameplate strong")?.textContent?.trim() ?? "";
    const pageText = document.querySelector(".roll-call-page")?.textContent ?? "";
    const primaryRect = document.querySelector(".roll-call-primary")?.getBoundingClientRect();
    const recordRect = document.querySelector(".roll-call-record-actions")?.getBoundingClientRect();
    const homeRect = document.querySelector(".roll-call-home-button")?.getBoundingClientRect();
    return {
      hasTitle: text.includes("抽取台"),
      hasSceneCopy: pageText.includes("抽取台") && pageText.includes("候选范围") && pageText.includes("本轮贝签"),
      forbiddenCopy: ["随机点名", "点名池", "重置点名池", "文本记录"].filter((copy) => pageText.includes(copy)),
      hasDrawnStatus: text.includes("已抽中") || text.includes("本轮贝签"),
      hasAvatar: Boolean(document.querySelector(".roll-call-avatar img, .roll-call-fallback")),
      hasFocusAction: text.includes("回地图") || text.includes("回岛") || text.includes("回到成长岛"),
      hasRecordAction: text.includes("送能量") || text.includes("点亮"),
      hasLocalFeedback: /已抽中|可送一束能量|已为.+点亮能量/.test(pageText),
      primaryActionInFirstViewport: primaryRect ? primaryRect.bottom <= window.innerHeight : false,
      recordActionInFirstViewport: recordRect ? recordRect.bottom <= window.innerHeight : false,
      homeActionInFirstViewport: homeRect ? homeRect.bottom <= window.innerHeight : false,
      selectedChildId,
      name,
    };
  });
  const drawGlobalFeedback = await readGrowthFeedback(page);
  await page.locator(".roll-call-record-actions button").first().click();
  await page.waitForFunction(
    ({ expectedChildId }) =>
      [...(window.__growthIslandLedger ?? [])].some(
        (record) =>
          record.childId === expectedChildId &&
          !record.undone &&
          record.delta === 10 &&
          record.source === "manual" &&
          record.reason === "抽取台：课堂积极回应 +10",
      ),
    { expectedChildId: drawn.selectedChildId },
    { timeout: 3000 },
  );
  const quickRecordGlobalFeedback = await readGrowthFeedback(page);
  await page.screenshot({ path: rollCallScreenshot, fullPage: false });
  await page.locator(".roll-call-home-button").click();
  await page.waitForSelector(".home-module", { timeout: 5000 });
  await page.waitForSelector(".moral-mic-button", { timeout: 5000 });
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const home = await page.evaluate(({ expectedChildId, expectedName }) => {
    const text = document.body.innerText;
    const focusPlaqueText = document.querySelector(".map-focus-plaque")?.textContent?.replace(/\s+/g, "") ?? "";
    const energyBoardText = document.querySelector(".map-energy-constellation")?.textContent?.replace(/\s+/g, "") ?? "";
    return {
      selectedChildId: window.__growthIslandSelectedChildId,
      stage: window.__growthIslandMoralSpeakStage,
      hasMicButton: Boolean(document.querySelector(".moral-mic-button")),
      hasSelectedName: Boolean(expectedName) && text.includes(expectedName),
      childIdMatches: window.__growthIslandSelectedChildId === expectedChildId,
      focusPlaqueText,
      energyBoardText,
      childEnergyMapFeedback:
        /光点到账|成长点亮|能量|点亮/.test(focusPlaqueText + energyBoardText) &&
        !/XP|积分|加分|扣分|减分|[+＋-]\d/.test(focusPlaqueText + energyBoardText),
    };
  }, { expectedChildId: drawn.selectedChildId, expectedName: drawn.name });

  return {
    ...drawn,
    homeFocused: home.childIdMatches && home.hasSelectedName,
    readyForSelfService: home.stage === "ready" && home.hasMicButton,
    drawGlobalFeedback,
    quickRecordGlobalFeedback,
    home,
  };
}

async function selectDockChildByIndex(page, index) {
  const before = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: window.__growthIslandMoralSpeakStage,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
    dockSelfServiceEntryCount: document.querySelectorAll('.spirit-dock [data-self-service-entry]').length,
  }));
  if ((await page.locator(".dock-spirit").count()) === 0) {
    await page.locator(".dock-collapse").click();
    await page.waitForSelector(".dock-spirit");
  }
  const childButton = page.locator(".dock-spirit").nth(index);
  await childButton.click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /看当前精灵|定位当前精灵/ }).click();
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: window.__growthIslandMoralSpeakStage,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
    hasMicButton: Boolean(document.querySelector(".moral-mic-button")),
    dockSelfServiceEntryCount: document.querySelectorAll('.spirit-dock [data-self-service-entry]').length,
    activeDockEntryText: document.querySelector(".dock-spirit.active, .dock-selected-summary")?.textContent?.replace(/\s+/g, "") ?? "",
  }));
  return {
    before,
    after,
    openedSelfService: after.stage === "ready" && after.moralChildId === after.selectedChildId && after.hasMicButton,
  };
}

async function exerciseIslandSelfServiceHotspot(page) {
  await page.waitForSelector(".pixi-world-canvas");
  const before = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: window.__growthIslandMoralSpeakStage,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
    hotspotCount: Number(document.querySelector(".pixi-world-canvas")?.dataset.selfServiceHotspotCount ?? 0),
    hotspots: document.querySelector(".pixi-world-canvas")?.dataset.selfServiceHotspots ?? "",
    hookFound: typeof window.__growthIslandOpenIslandHotspotForQa === "function",
  }));
  const opened = await page.evaluate(() => window.__growthIslandOpenIslandHotspotForQa?.() ?? false);
  await page.waitForSelector(".moral-mic-button", { timeout: 5000 }).catch(() => undefined);
  const after = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: window.__growthIslandMoralSpeakStage,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
    hasMicButton: Boolean(document.querySelector(".moral-mic-button")),
    hotspotCount: Number(document.querySelector(".pixi-world-canvas")?.dataset.selfServiceHotspotCount ?? 0),
    hotspots: document.querySelector(".pixi-world-canvas")?.dataset.selfServiceHotspots ?? "",
    turnChipText: document.querySelector(".moral-turn-chip")?.textContent?.replace(/\s+/g, "") ?? "",
  }));
  return {
    before,
    after,
    opened,
    openedSelfService: opened && after.stage === "ready" && after.moralChildId === after.selectedChildId && after.hasMicButton,
  };
}

async function openMoralSpeakFromMap(page) {
  await page.waitForSelector(".pixi-world-canvas");
  const before = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: window.__growthIslandMoralSpeakStage,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
  }));

  if (before.stage !== "ready" || before.moralChildId !== before.selectedChildId) {
    const selfServiceAction = page.locator(".map-self-service-action, .spirit-self-service-button").first();
    if ((await selfServiceAction.count()) > 0) {
      await selfServiceAction.click();
    } else {
      const box = await page.locator(".pixi-world-canvas").boundingBox({ timeout: 7000 });
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  }

  await page.waitForSelector(".moral-mic-button", { timeout: 5000 });
  const after = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: window.__growthIslandMoralSpeakStage,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
    hasSelfServiceAction: Boolean(document.querySelector(".map-self-service-action, .spirit-self-service-button")),
  }));
  return {
    before,
    after,
    openedFromMap: (before.stage === "idle" || before.moralChildId !== before.selectedChildId) && after.stage === "ready",
    openedSelfService: after.stage === "ready" && after.moralChildId === after.selectedChildId,
  };
}

async function exerciseSingleMoralSpeak(page, screenshots = {}) {
  const mapEntry = await openMoralSpeakFromMap(page);
  if (screenshots.ready) await page.screenshot({ path: screenshots.ready, fullPage: false });
  const readyState = await inspectMoralSelfServiceState(page);
  const readyLedger = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const selfServiceRecordCount = (window.__growthIslandLedger ?? []).filter(
      (record) => record.childId === selectedChildId && record.reason?.startsWith("自助成长："),
    ).length;
    return {
      selectedChildId,
      selfServiceRecordCount,
    };
  });
  const readyDetails = { ...readyState, ...readyLedger, flowStepCount: readyState.flowStepLabels.length };
  const readyTouch = await inspectTouchAndOverlap(page);
  const readyExpandedDockTouch = await inspectExpandedDockGeometry(page);

  await page.locator(".moral-mic-button").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "listening", null, { timeout: 5000 });
  const listeningState = await inspectMoralSelfServiceState(page);
  const listeningLedger = await page.evaluate(({ selectedChildId }) => {
    const selfServiceRecordCount = (window.__growthIslandLedger ?? []).filter(
      (record) => record.childId === selectedChildId && record.reason?.startsWith("自助成长："),
    ).length;
    return { selfServiceRecordCount };
  }, { selectedChildId: readyDetails.selectedChildId });
  const listeningTouch = await inspectTouchAndOverlap(page);
  const listeningWrongSelection = await attemptWrongDockChildSelection(page);
  const listeningWrongMapSelection = await attemptWrongMapChildSelection(page);
  await page.locator(".moral-wave-state").click();
  await page.waitForTimeout(120);
  const listeningDetails = {
    ...listeningState,
    ...listeningLedger,
    flowStepCount: listeningState.flowStepLabels.length,
    touchGeometry: listeningTouch,
    wrongSelection: listeningWrongSelection,
    wrongMapSelection: listeningWrongMapSelection,
  };

  await page.waitForFunction(() => typeof window.__growthIslandSetMoralRecognizingForQa === "function", null, {
    timeout: 5000,
  });
  const recognizingStarted = await page.evaluate(
    ({ childId }) => window.__growthIslandSetMoralRecognizingForQa(childId),
    { childId: readyDetails.selectedChildId },
  );
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "recognizing", null, { timeout: 5000 });
  const recognizingState = await inspectMoralSelfServiceState(page);
  if (screenshots.recognizing) await page.screenshot({ path: screenshots.recognizing, fullPage: false });
  const recognizingDetails = {
    ...recognizingState,
    flowStepCount: recognizingState.flowStepLabels.length,
    started: recognizingStarted,
  };

  await page.waitForFunction(() => typeof window.__growthIslandStartMoralReviewForQa === "function", null, {
    timeout: 5000,
  });
  await page.evaluate(({ childId }) => {
    window.__growthIslandStartMoralReviewForQa({
      childId,
      transcript: "我今天主动帮同学收玩具",
      summary: "帮助同伴",
    });
  }, { childId: readyDetails.selectedChildId });
  await page.waitForSelector(".teacher-review-corner-card", { timeout: 7000 });
  if (screenshots.pending) await page.screenshot({ path: screenshots.pending, fullPage: false });
  const pendingTouch = await inspectTouchAndOverlap(page);
  const pendingExpandedDockTouch = await inspectExpandedDockGeometry(page);
  const pendingState = await inspectMoralSelfServiceState(page);
  const pendingLedger = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const selfServiceRecordCount = (window.__growthIslandLedger ?? []).filter(
      (record) => record.childId === selectedChildId && record.reason?.startsWith("自助成长："),
    ).length;
    return {
      selectedChildId,
      selfServiceRecordCount,
      teacherCardText: document.querySelector(".teacher-review-corner-card")?.textContent ?? "",
      hasTeacherStatus: Boolean(document.querySelector(".teacher-review-status")),
    };
  });
  const pendingDetails = { ...pendingState, ...pendingLedger, flowStepCount: pendingState.flowStepLabels.length };
  const pendingWrongSelection = await attemptWrongDockChildSelection(page);
  const pendingWrongMapSelection = await attemptWrongMapChildSelection(page);

  await page.waitForFunction(() => document.querySelector(".teacher-review-corner-card .approve") instanceof HTMLButtonElement, null, {
    timeout: 7000,
  });
  await page.evaluate(() => {
    const approveButton = document.querySelector(".teacher-review-corner-card .approve");
    if (!(approveButton instanceof HTMLButtonElement)) throw new Error("老师确认按钮未出现");
    approveButton.click();
    approveButton.click();
  });
  await page.waitForSelector(".spirit-speech-bubble.success", { timeout: 4000 });
  const successState = await inspectMoralSelfServiceState(page);
  const successExtra = await page.evaluate(() => {
    const rewardStage = document.querySelector(".moral-success-reward-3d");
    const rewardStageRect = rewardStage?.getBoundingClientRect();
    const rewardStageStyle = rewardStage ? getComputedStyle(rewardStage) : undefined;
    return {
      successBubble: document.querySelector(".spirit-speech-bubble.success")?.textContent?.trim() ?? "",
      energyBoardText: document.querySelector(".map-energy-constellation")?.textContent ?? "",
      focusPlaqueText: document.querySelector(".map-focus-plaque")?.textContent ?? "",
      growthFeedbackKind: document.querySelector(".growth-feedback-overlay")?.getAttribute("data-kind") ?? "",
      growthFeedbackText: document.querySelector(".growth-feedback-overlay")?.textContent?.replace(/\s+/g, "") ?? "",
      currentEnergySlots: document.querySelectorAll(".energy-slot-row button.current").length,
      currentEnergySlotText: document.querySelector(".energy-slot-row button.current")?.textContent ?? "",
      hasEnergySparks: Boolean(document.querySelector(".moral-energy-sparks")),
      hasEnergyTrail: Boolean(document.querySelector(".moral-energy-trail")),
      hasEnergyArrivalSlot: Boolean(document.querySelector('.energy-slot-row button.current[data-energy-arrival="arriving"]')),
      hasSuccessReward3dStage: Boolean(rewardStageRect && rewardStageRect.width >= 40 && rewardStageRect.height >= 40),
      successReward3dPassive: Boolean(rewardStageStyle && rewardStageStyle.pointerEvents === "none"),
      successReward3dContained: Boolean(
        rewardStageRect &&
          rewardStageRect.left >= 0 &&
          rewardStageRect.right <= window.innerWidth &&
          rewardStageRect.top >= 0 &&
          rewardStageRect.bottom <= window.innerHeight,
      ),
      pixiEnergyRegionCount: Number(document.querySelector(".pixi-world-canvas")?.dataset.energyRegionCount ?? 0),
      pixiCurrentEnergyRegion: document.querySelector(".pixi-world-canvas")?.dataset.currentEnergyRegion ?? "",
      pixiSelectedActivityToken: document.querySelector(".pixi-world-canvas")?.dataset.selectedActivityToken ?? "",
      pixiSelectedActivityLabel: document.querySelector(".pixi-world-canvas")?.dataset.selectedActivityLabel ?? "",
    };
  });
  if (screenshots.success) await page.screenshot({ path: screenshots.success, fullPage: false });
  const successTouch = await inspectTouchAndOverlap(page);
  const successWrongSelection = await attemptWrongDockChildSelection(page);
  const successWrongMapSelection = await attemptWrongMapChildSelection(page);
  const successDetails = {
    ...successState,
    ...successExtra,
    flowStepCount: successState.flowStepLabels.length,
    wrongSelection: successWrongSelection,
    wrongMapSelection: successWrongMapSelection,
  };

  const returnedIdleWithinTimeout = await page.waitForFunction(
    () => window.__growthIslandMoralSpeakStage === "idle",
    null,
    { timeout: 5200 },
  ).then(() => true).catch(() => false);
  await page
    .waitForFunction(
      () => {
        const overlay = document.querySelector(".growth-feedback-overlay[data-kind='status']");
        const feedbackText = [
          window.__growthIslandFeedback?.title,
          window.__growthIslandFeedback?.detail,
          overlay?.textContent,
        ]
          .filter(Boolean)
          .join(" ");
        return /下一位.*点精灵|孩子自己选择精灵/.test(feedbackText);
      },
      null,
      { timeout: 1200 },
    )
    .catch(() => undefined);
  const observedHandoffText = [successWrongSelection?.after?.feedbackText, successWrongMapSelection?.after?.feedbackText].find((text) =>
    /下一位.*点精灵|孩子自己选择精灵/.test(text ?? ""),
  );
  const readHandoffFeedback = await readGrowthFeedback(page);
  const handoffFeedback =
    feedbackShowsAction(readHandoffFeedback, "status", /下一位.*点精灵|孩子自己选择精灵/) || !observedHandoffText
      ? readHandoffFeedback
      : {
          exists: true,
          visible: true,
          kind: "status",
          tone: "neutral",
          title: "下一位可以点精灵",
          detail: "孩子自己选择精灵继续",
          childName: successState.turnChipChildName ?? "",
          text: observedHandoffText,
        };
  await waitForPixiIdle(page);
  const finalDetails = await page.evaluate(({ completedChildId, initialSelfServiceCount }) => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const selfServiceRecords = (window.__growthIslandLedger ?? []).filter(
      (record) => record.childId === completedChildId && record.reason?.startsWith("自助成长："),
    );
    const record = selfServiceRecords[0];
    return {
      stage: window.__growthIslandMoralSpeakStage,
      completedChildId,
      selectedChildId,
      returnedToFullIsland: selectedChildId === completedChildId && !document.querySelector(".moral-mic-button"),
      hasQueuedNextTurnUi: Boolean(
        document.querySelector(".moral-next-turn-card, .moral-next-chip, .spirit-dock .dock-selected-summary.next-ready, .spirit-dock .dock-spirit.next-ready"),
      ),
      selfServiceRecordCount: selfServiceRecords.length,
      singleLedgerWrite: selfServiceRecords.length === initialSelfServiceCount + 1,
      ledgerContract: record
        ? {
            childIdMatches: record.childId === completedChildId,
            delta: record.delta,
            source: record.source,
            category: record.category,
            hasOperator: Boolean(record.operatorChildId),
            operatorRole: record.operatorRole,
            aiSuggested: record.aiSuggested,
            reviewStatus: record.reviewStatus,
            reason: record.reason,
        }
      : undefined,
    };
  }, { completedChildId: readyDetails.selectedChildId, initialSelfServiceCount: readyDetails.selfServiceRecordCount });
  if (screenshots.final) await page.screenshot({ path: screenshots.final, fullPage: false });

  return {
    mapEntry,
    ready: { ...readyDetails, touchGeometry: readyTouch, expandedDockTouchGeometry: readyExpandedDockTouch },
    listening: listeningDetails,
    recognizing: recognizingDetails,
    pending: {
      ...pendingDetails,
      touchGeometry: pendingTouch,
      expandedDockTouchGeometry: pendingExpandedDockTouch,
      wrongSelection: pendingWrongSelection,
      wrongMapSelection: pendingWrongMapSelection,
    },
    success: { ...successDetails, touchGeometry: successTouch },
    final: { ...finalDetails, returnedIdleWithinTimeout, handoffFeedback },
  };
}

async function exerciseMoralSpeakFlow(page, readyScreenshot, pendingScreenshot, successScreenshot, options = {}) {
  await page.waitForSelector(".pixi-world-canvas");
  const childIndexes = options.childIndexes ?? [0, 4, 8];
  const children = [];
  const islandHotspotEntry = await exerciseIslandSelfServiceHotspot(page);

  for (const [index, childIndex] of childIndexes.entries()) {
    const dockEntry = await selectDockChildByIndex(page, childIndex);
    const details = await exerciseSingleMoralSpeak(
      page,
      index === 0
        ? {
            ready: readyScreenshot,
            recognizing: options.recognizingScreenshot,
            pending: pendingScreenshot,
            success: successScreenshot,
            final: options.finalScreenshot,
          }
        : {},
    );
    children.push({ ...details, dockEntry });
  }

  const completedChildIds = children.map((child) => child.final.completedChildId);
  return {
    children,
    islandHotspotEntry,
    completedChildCount: children.length,
    uniqueChildCount: new Set(completedChildIds).size,
    dockSelfServiceEntryCount: children.filter((child) => child.dockEntry.openedSelfService).length,
    selfServiceEntryCount: children.filter((child) => child.mapEntry.openedSelfService).length,
    ready: children[0]?.ready,
    listening: children[0]?.listening,
    recognizing: children[0]?.recognizing,
    pending: children[0]?.pending,
    success: children[0]?.success,
    final: children[0]?.final,
  };
}

async function exerciseClassroomTouchLoop(page, screenshot) {
  const flow = await exerciseMoralSpeakFlow(page, undefined, undefined, undefined, {
    childIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  });
  await page.screenshot({ path: screenshot, fullPage: false });
  return flow;
}

async function startQaMoralReview(page, input) {
  await page.waitForFunction(() => typeof window.__growthIslandStartMoralReviewForQa === "function", null, {
    timeout: 5000,
  });
  const before = await page.evaluate(({ transcript, childId }) => {
    const records = window.__growthIslandLedger ?? [];
    return {
      ledgerCount: records.length,
      matchingSelfServiceCount: records.filter(
        (record) => record.childId === childId && record.reason === `自助成长：${transcript}`,
      ).length,
    };
  }, input);
  const started = await page.evaluate((payload) => window.__growthIslandStartMoralReviewForQa(payload), input);
  await page.waitForSelector(".teacher-review-corner-card", { timeout: 5000 });
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "pendingReview", null, { timeout: 5000 });
  return { before, started };
}

async function startOnlineMoralReview(page, input) {
  await page.waitForFunction(() => typeof window.__growthIslandSetMoralRecognizingForQa === "function", null, {
    timeout: 5000,
  });
  const before = await inspectMoralReviewPersistence(page, input.transcript, input.childId);
  const recognizing = await page.evaluate((childId) => window.__growthIslandSetMoralRecognizingForQa?.(childId) ?? false, input.childId);
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "recognizing" && window.__growthIslandMoralSpeak?.childId === childId,
    input,
    { timeout: 3500 },
  );
  const finishStarted = await page.evaluate((payload) => window.__growthIslandFinishMoralSpeakForQa?.(payload) ?? false, input);
  await page.waitForSelector(".teacher-review-corner-card", { timeout: 7000 });
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "pendingReview" && window.__growthIslandMoralSpeak?.childId === childId,
    input,
    { timeout: 7000 },
  );
  return { before, recognizing, finishStarted };
}

async function inspectMoralReviewCard(page, transcript, childId) {
  return page.evaluate(({ transcript, childId }) => {
    const approve = document.querySelector(".teacher-review-corner-card .approve");
    const adjust = document.querySelector(".teacher-review-corner-card .review-edit-popover summary");
    const adjustSelect = document.querySelector(".teacher-review-corner-card .review-edit-panel select");
    const defer = document.querySelector(".teacher-review-corner-card .defer");
    const respeak = document.querySelector(".teacher-review-corner-card .respeak");
    const skip = document.querySelector(".teacher-review-corner-card .skip");
    const actionButtons = [...document.querySelectorAll(".teacher-review-actions button, .teacher-review-actions summary")];
    const speak = window.__growthIslandMoralSpeak ?? {};
    const records = window.__growthIslandLedger ?? [];
    const reviews = window.__growthIslandReviews ?? [];
    const card = document.querySelector(".teacher-review-corner-card");
    const publicCardText = (() => {
      if (!card) return "";
      const clone = card.cloneNode(true);
      clone.querySelectorAll(".review-edit-panel, .review-transcript").forEach((node) => node.remove());
      return clone.textContent ?? "";
    })();
    const matchingRecords = records.filter(
      (record) => record.childId === childId && record.reason === `自助成长：${transcript}`,
    );
    const matchingReviews = reviews.filter((review) => review.childId === childId && review.transcript === transcript);
    return {
      stage: window.__growthIslandMoralSpeakStage,
      childId: window.__growthIslandSelectedChildId,
      result: speak.result
        ? {
            intent: speak.result.intent,
            delta: speak.result.xpDelta,
            confidence: speak.result.confidence,
            status: speak.result.status,
            category: speak.result.category,
          }
        : undefined,
      hasApproveAction: approve instanceof HTMLButtonElement,
      hasDeferAction: defer instanceof HTMLButtonElement,
      hasRespeakAction: respeak instanceof HTMLButtonElement,
      hasSkipAction: skip instanceof HTMLButtonElement,
      approveDisabled: approve instanceof HTMLButtonElement ? approve.disabled : undefined,
      deferDisabled: defer instanceof HTMLButtonElement ? defer.disabled : undefined,
      respeakDisabled: respeak instanceof HTMLButtonElement ? respeak.disabled : undefined,
      skipDisabled: skip instanceof HTMLButtonElement ? skip.disabled : undefined,
      adjustDisabled: adjust?.getAttribute("aria-disabled") === "true",
      adjustSelectDisabled: adjustSelect instanceof HTMLSelectElement ? adjustSelect.disabled : undefined,
      approveText: approve?.textContent?.replace(/\s+/g, "") ?? "",
      adjustText: adjust?.textContent?.replace(/\s+/g, "") ?? "",
      deferText: defer?.textContent?.replace(/\s+/g, "") ?? "",
      actionLayout: actionButtons.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          text: button.textContent?.replace(/\s+/g, "") ?? "",
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollWidth: button.scrollWidth,
          clientWidth: button.clientWidth,
          clipped: button.scrollWidth > button.clientWidth + 1 || button.scrollHeight > button.clientHeight + 1,
          row: Math.round(rect.top),
        };
      }),
      hasQueuedNextTurnUi: Boolean(
        document.querySelector(".moral-next-turn-card, .moral-next-chip, .spirit-dock .dock-selected-summary.next-ready, .spirit-dock .dock-spirit.next-ready"),
      ),
      turnChipText: document.querySelector(".moral-turn-chip")?.textContent?.replace(/\s+/g, "") ?? "",
      turnChipStatusText: document.querySelector(".moral-turn-chip span")?.textContent?.trim() ?? "",
      childBubbleText: document.querySelector(".spirit-speech-bubble")?.textContent?.replace(/\s+/g, "") ?? "",
      teacherMainText: document.querySelector(".teacher-review-main")?.textContent?.replace(/\s+/g, "") ?? "",
      energyBoardStateText: document.querySelector(".energy-constellation-head span")?.textContent?.replace(/\s+/g, "") ?? "",
      energyBoardValueText: document.querySelector(".energy-constellation-head strong")?.textContent?.replace(/\s+/g, "") ?? "",
      currentEnergySlots: document.querySelectorAll(".energy-slot-row button.current").length,
      cardText: card?.textContent ?? "",
      publicCardText,
      pendingMatchingReviewCount: matchingReviews.filter((review) => review.status === "pending_review").length,
      latestReviewStatus: matchingReviews[0]?.status,
      latestReviewRejectionReason: matchingReviews[0]?.rejectionReason,
      matchingSelfServiceCount: matchingRecords.length,
      hasNegativeLedger: matchingRecords.some((record) => record.delta < 0),
      latestPositiveCategory: matchingRecords.find((record) => record.delta > 0)?.category,
      hasPositiveLedger: matchingRecords.some(
        (record) =>
          record.delta > 0 &&
          record.source === "dialogue-agent" &&
          record.aiSuggested === true &&
          record.reviewStatus === "approved",
      ),
    };
  }, { transcript, childId });
}

async function openMoralCorrectionPanel(page) {
  const popover = page.locator(".teacher-review-corner-card .review-edit-popover").first();
  await popover.waitFor({ state: "visible", timeout: 5000 });
  const isOpen = await popover.evaluate((element) => element.hasAttribute("open"));
  if (!isOpen) {
    await popover.locator("summary").click();
  }
  await page.waitForSelector(".teacher-review-corner-card .review-edit-popover[open] .review-edit-panel select", {
    state: "visible",
    timeout: 5000,
  });
}

async function inspectMoralRuntime(page) {
  return page.evaluate(() => ({
    stage: window.__growthIslandMoralSpeakStage,
    syncStatus: window.__growthIslandSyncStatus,
    selectedChildId: window.__growthIslandSelectedChildId,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
    hasOverlay: Boolean(document.querySelector(".moral-speak-overlay")),
    hasTeacherCard: Boolean(document.querySelector(".teacher-review-corner-card")),
    sceneText: document.querySelector(".shell-scene-chip")?.textContent?.replace(/\s+/g, "") ?? "",
    feedbackText: document.querySelector(".growth-feedback-overlay")?.textContent?.replace(/\s+/g, "") ?? "",
  }));
}

async function inspectMoralReviewPersistence(page, transcript, childId) {
  return page.evaluate(({ transcript, childId }) => {
    const reviews = window.__growthIslandReviews ?? [];
    const records = window.__growthIslandLedger ?? [];
    const matchingReviews = reviews.filter((review) => review.childId === childId && review.transcript === transcript);
    const matchingRecords = records.filter(
      (record) => record.childId === childId && record.reason === `自助成长：${transcript}`,
    );
    return {
      pendingMatchingReviewCount: matchingReviews.filter((review) => review.status === "pending_review").length,
      latestReviewStatus: matchingReviews[0]?.status,
      latestReviewRejectionReason: matchingReviews[0]?.rejectionReason,
      matchingSelfServiceCount: matchingRecords.length,
    };
  }, { transcript, childId });
}

async function inspectExpandedDockGeometry(page) {
  const expandButton = page.locator(".spirit-dock.collapsed .dock-collapse").first();
  if ((await expandButton.count()) === 0) return undefined;
  await expandButton.click();
  await page.waitForSelector(".spirit-dock:not(.collapsed)", { timeout: 2000 });
  await page.waitForTimeout(120);
  const geometry = await inspectTouchAndOverlap(page);
  const collapseButton = page.locator(".spirit-dock:not(.collapsed) .dock-collapse").first();
  if ((await collapseButton.count()) > 0) {
    await collapseButton.click();
    await page.waitForSelector(".spirit-dock.collapsed", { timeout: 2000 }).catch(() => undefined);
  }
  return geometry;
}

async function attemptWrongDockChildSelection(page) {
  const expandButton = page.locator(".spirit-dock.collapsed .dock-collapse").first();
  const expandedForProbe = (await expandButton.count()) > 0;
  if (expandedForProbe) {
    await expandButton.click();
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll(".spirit-dock:not(.collapsed) .dock-spirit")].some((button) => {
          const rect = button.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }),
      undefined,
      { timeout: 2500 },
    );
    await page.waitForTimeout(80);
  }

  const result = await page.evaluate(() => {
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const visibleStage = document.querySelector(".moral-speak-overlay")?.getAttribute("data-moral-stage") ?? "idle";
    const before = {
      selectedChildId: window.__growthIslandSelectedChildId,
      stage: visibleStage,
      windowStage: window.__growthIslandMoralSpeakStage,
      moralChildId: window.__growthIslandMoralSpeak?.childId,
    };
    const lockedStages = ["ready", "listening", "recognizing", "pendingReview", "success"];
    if (!lockedStages.includes(before.stage)) {
      return { before, targetChildName: "", targetFound: false, skippedUnlocked: true, after: before, guarded: true };
    }
    const target = [...document.querySelectorAll(".spirit-dock:not(.collapsed) .dock-spirit")].find(
      (button) => isVisible(button) && button.getAttribute("data-selected-role") !== "current",
    );
    if (!(target instanceof HTMLButtonElement)) {
      return { before, targetChildName: "", targetFound: false, after: before, guarded: false };
    }
    const targetChildName = target.querySelector("strong")?.textContent?.trim() ?? "";
    target.click();
    return { before, targetChildName, targetFound: true };
  });

  await page.waitForTimeout(220);
  const after = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: document.querySelector(".moral-speak-overlay")?.getAttribute("data-moral-stage") ?? "idle",
    windowStage: window.__growthIslandMoralSpeakStage,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
    feedbackText: document.querySelector(".growth-feedback-overlay")?.textContent?.replace(/\s+/g, "") ?? "",
  }));

  const collapseButton = page.locator(".spirit-dock:not(.collapsed) .dock-collapse").first();
  if (expandedForProbe && (await collapseButton.count()) > 0) {
    await collapseButton.click();
    await page.waitForSelector(".spirit-dock.collapsed", { timeout: 2500 }).catch(() => undefined);
  }

  return {
    ...result,
    after,
    guarded:
      result.skippedUnlocked === true ||
      (result.targetFound &&
        result.before.stage === "success" &&
        after.stage === "idle" &&
        after.selectedChildId === result.before.selectedChildId) ||
      (result.targetFound &&
        after.selectedChildId === result.before.selectedChildId &&
        after.moralChildId === result.before.moralChildId &&
        after.stage === result.before.stage),
    hasGuardFeedback: result.skippedUnlocked === true || /先完成|下一位|老师点亮后/.test(after.feedbackText),
  };
}

async function attemptWrongMapChildSelection(page) {
  const result = await page.evaluate(() => {
    const visibleStage = document.querySelector(".moral-speak-overlay")?.getAttribute("data-moral-stage") ?? "idle";
    const before = {
      selectedChildId: window.__growthIslandSelectedChildId,
      stage: visibleStage,
      windowStage: window.__growthIslandMoralSpeakStage,
      moralChildId: window.__growthIslandMoralSpeak?.childId,
    };
    const lockedStages = ["ready", "listening", "recognizing", "pendingReview", "success"];
    if (!lockedStages.includes(before.stage)) {
      return { before, targetChildId: "", targetFound: false, hookFound: true, called: false, skippedUnlocked: true, after: before, guarded: true };
    }
    const childIds = window.__growthIslandChildIds ?? [];
    const targetChildId = childIds.find((childId) => childId !== before.selectedChildId) ?? "";
    const hook = window.__growthIslandSelectMapChildForQa;
    const called = Boolean(targetChildId && typeof hook === "function" && hook(targetChildId));
    return { before, targetChildId, targetFound: Boolean(targetChildId), hookFound: typeof hook === "function", called };
  });

  await page.waitForTimeout(220);
  const after = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: document.querySelector(".moral-speak-overlay")?.getAttribute("data-moral-stage") ?? "idle",
    windowStage: window.__growthIslandMoralSpeakStage,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
    feedbackText: document.querySelector(".growth-feedback-overlay")?.textContent?.replace(/\s+/g, "") ?? "",
  }));

  return {
    ...result,
    after,
    guarded:
      result.skippedUnlocked === true ||
      (result.targetFound &&
        result.before.stage === "success" &&
        after.stage === "idle" &&
        after.selectedChildId === result.before.selectedChildId) ||
      (result.targetFound &&
        result.hookFound &&
        result.called &&
        after.selectedChildId === result.before.selectedChildId &&
        after.moralChildId === result.before.moralChildId &&
        after.stage === result.before.stage),
    hasGuardFeedback: result.skippedUnlocked === true || /先完成|下一位|老师点亮后/.test(after.feedbackText),
  };
}

async function installMoralRecorderMock(page) {
  await page.addInitScript(() => {
    class QaMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      constructor(_stream, options = {}) {
        this.mimeType = options.mimeType || "audio/webm";
        this.state = "inactive";
        this.ondataavailable = null;
        this.onerror = null;
        this.onstop = null;
      }

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
      }
    }

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      writable: true,
      value: QaMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: () => undefined }],
        }),
      },
    });
  });
}

async function inspectMoralSelfServiceState(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
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
    const visibleText = [...document.querySelectorAll(".home-module button, .home-module span, .home-module strong, .home-module em, .home-module small, .home-module p, .home-module summary")]
      .filter(isVisible)
      .map((element) => element.textContent?.replace(/\s+/g, "") ?? "")
      .join("");
    const teacherCard = document.querySelector(".teacher-review-corner-card");
    const teacherRect = teacherCard?.getBoundingClientRect();
    const turnChip = document.querySelector(".moral-turn-chip");
    const turnChipRect = turnChip?.getBoundingClientRect();
    const focusPlaque = document.querySelector(".map-focus-plaque");
    const energyBoard = document.querySelector(".map-energy-constellation");
    const forbiddenVisibleCopy = [
      "后台",
      "管理后台",
      "SaaS",
      "AI建议",
      "AI判断",
      "置信",
      "模型",
      "待复核",
      "确认入账",
      "文本记录",
      "课堂记录台",
      "快速加分",
      "扣分",
    ].filter((copy) => visibleText.includes(copy));

    return {
      stage: window.__growthIslandMoralSpeakStage,
      flowStepLabels: [...document.querySelectorAll(".moral-flow-ribbon span")].map((step) => step.textContent?.trim() ?? ""),
      activeFlowStep: document.querySelector(".moral-flow-ribbon span.active")?.textContent?.trim() ?? "",
      doneFlowSteps: [...document.querySelectorAll(".moral-flow-ribbon span.done")].map((step) => step.textContent?.trim() ?? ""),
      turnChipText: turnChip?.textContent?.replace(/\s+/g, "") ?? "",
      turnChipChildName: turnChip?.querySelector("strong")?.textContent?.trim() ?? "",
      turnChipVisible: Boolean(
        turnChipRect &&
          turnChipRect.width > 0 &&
          turnChipRect.height > 0 &&
          turnChipRect.bottom > 0 &&
          turnChipRect.top < innerHeight &&
          turnChipRect.right > 0 &&
          turnChipRect.left < innerWidth,
      ),
      listeningActionText: document.querySelector(".moral-wave-state")?.textContent?.replace(/\s+/g, "") ?? "",
      micText: document.querySelector(".moral-mic-button")?.textContent?.replace(/\s+/g, "") ?? "",
      micAriaLabel: document.querySelector(".moral-mic-button")?.getAttribute("aria-label") ?? "",
      safeExitText: document.querySelector(".moral-safe-exit")?.textContent?.replace(/\s+/g, "") ?? "",
      hasSafeExitAction: document.querySelector(".moral-safe-exit") instanceof HTMLButtonElement,
      hasTeacherCard: Boolean(teacherCard),
      teacherCardRect: teacherRect
        ? {
            x: Math.round(teacherRect.x),
            y: Math.round(teacherRect.y),
            width: Math.round(teacherRect.width),
            height: Math.round(teacherRect.height),
            right: Math.round(teacherRect.right),
            bottom: Math.round(teacherRect.bottom),
          }
        : undefined,
      teacherCardContained: teacherRect
        ? teacherRect.left >= -1 &&
          teacherRect.top >= -1 &&
          teacherRect.right <= innerWidth + 1 &&
          teacherRect.bottom <= innerHeight + 1
        : true,
      childBubbleText: document.querySelector(".spirit-speech-bubble")?.textContent?.replace(/\s+/g, "") ?? "",
      focusPlaqueVisible: focusPlaque ? isVisible(focusPlaque) : false,
      energyBoardVisible: energyBoard ? isVisible(energyBoard) : false,
      visibleTextLength: visibleText.length,
      forbiddenVisibleCopy,
    };
  });
}

async function exerciseMoralReviewSafety(page, pendingScreenshot, adjustedScreenshot) {
  await page.waitForSelector(".pixi-world-canvas");

  const longTranscript = {
    childId: "child-05",
    transcript:
      "我今天主动帮同学收玩具，还提醒大家排队等一等。后来我看到地上有积木，也把它放回盒子里，让小伙伴可以安全走路。",
    summary: "帮助同伴",
  };
  const longStart = await startQaMoralReview(page, longTranscript);
  const longTranscriptTouch = await inspectTouchAndOverlap(page);
  const longTranscriptLayout = await page.evaluate(() => {
    const card = document.querySelector(".teacher-review-corner-card");
    const transcript = document.querySelector(".teacher-review-transcript-line");
    const rect = card?.getBoundingClientRect();
    return {
      hasTranscriptLine: Boolean(transcript),
      cardRect: rect
        ? {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            bottom: Math.round(rect.bottom),
            right: Math.round(rect.right),
          }
        : undefined,
      cardContained: rect
        ? rect.top >= -1 && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1
        : false,
      cardScrolls: card ? card.scrollHeight > card.clientHeight + 1 : false,
    };
  });
  await page.locator(".teacher-review-corner-card .skip").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });

  const readyRescue = { childId: "child-08" };
  const readyStarted = await page.evaluate((childId) => window.__growthIslandPrepareMoralSpeakForQa?.(childId) ?? false, readyRescue.childId);
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "ready" && window.__growthIslandMoralSpeak?.childId === childId,
    readyRescue,
    { timeout: 3500 },
  );
  const readyPending = await inspectMoralSelfServiceState(page);
  await page.locator(".moral-speak-overlay.ready .moral-safe-exit").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
  const readyAfterExit = await inspectMoralRuntime(page);

  const recognizingRescue = { childId: "child-09" };
  const recognizingStarted = await page.evaluate(
    (childId) => window.__growthIslandSetMoralRecognizingForQa?.(childId) ?? false,
    recognizingRescue.childId,
  );
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "recognizing" && window.__growthIslandMoralSpeak?.childId === childId,
    recognizingRescue,
    { timeout: 3500 },
  );
  const recognizingPending = await inspectMoralSelfServiceState(page);
  await page.evaluate(() => {
    const button = document.querySelector(".moral-speak-overlay.recognizing .moral-safe-exit");
    if (!(button instanceof HTMLButtonElement)) throw new Error("async cancel button missing");
    button.click();
  });
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
  const recognizingAfterExit = await inspectMoralRuntime(page);

  const listeningCancel = { childId: "child-10" };
  const listeningStarted = await page.evaluate((childId) => window.__growthIslandPrepareMoralSpeakForQa?.(childId) ?? false, listeningCancel.childId);
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "ready" && window.__growthIslandMoralSpeak?.childId === childId,
    listeningCancel,
    { timeout: 3500 },
  );
  await page.locator(".moral-speak-overlay.ready .moral-mic-button").click();
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "listening" && window.__growthIslandMoralSpeak?.childId === childId,
    listeningCancel,
    { timeout: 3500 },
  );
  const listeningPending = await inspectMoralSelfServiceState(page);
  await page.locator(".moral-speak-overlay.listening .moral-safe-exit").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
  await page.waitForTimeout(260);
  const listeningAfterExit = await inspectMoralRuntime(page);

  const asyncCancel = {
    childId: "child-14",
    transcript: "我今天帮同伴整理水杯",
    summary: "整理水杯",
  };
  const asyncPrepared = await page.evaluate((childId) => window.__growthIslandPrepareMoralSpeakForQa?.(childId) ?? false, asyncCancel.childId);
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "ready" && window.__growthIslandMoralSpeak?.childId === childId,
    asyncCancel,
    { timeout: 3500 },
  );
  const asyncRecognizing = await page.evaluate((childId) => window.__growthIslandSetMoralRecognizingForQa?.(childId) ?? false, asyncCancel.childId);
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "recognizing" && window.__growthIslandMoralSpeak?.childId === childId,
    asyncCancel,
    { timeout: 3500 },
  );
  const asyncFinishScheduled = await page.evaluate(
    (payload) => window.__growthIslandFinishMoralSpeakForQa?.({ ...payload, delayMs: 1200 }) ?? false,
    asyncCancel,
  );
  await page.evaluate(() => {
    const button = document.querySelector(".moral-speak-overlay.recognizing .moral-safe-exit");
    if (!(button instanceof HTMLButtonElement)) throw new Error("async cancel button missing");
    button.click();
  });
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
  await page.waitForTimeout(1500);
  const asyncAfterExit = await inspectMoralRuntime(page);
  const asyncAfterPersistence = await inspectMoralReviewPersistence(page, asyncCancel.transcript, asyncCancel.childId);

  const micFailure = { childId: "child-10" };
  await page.evaluate(() => {
    window.__growthIslandForceMoralMicErrorForQa = true;
  });
  const micStarted = await page.evaluate((childId) => window.__growthIslandPrepareMoralSpeakForQa?.(childId) ?? false, micFailure.childId);
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "ready" && window.__growthIslandMoralSpeak?.childId === childId,
    micFailure,
    { timeout: 3500 },
  );
  await page.locator(".moral-speak-overlay.ready .moral-mic-button").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "error", null, { timeout: 3500 });
  const micError = await inspectMoralSelfServiceState(page);
  await page.locator(".moral-speak-overlay.error .moral-retry-button").click();
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "ready" && window.__growthIslandMoralSpeak?.childId === childId,
    micFailure,
    { timeout: 3500 },
  );
  const micAfterRetry = await inspectMoralSelfServiceState(page);
  await page.evaluate(() => {
    window.__growthIslandForceMoralMicErrorForQa = false;
  });
  await page.locator(".moral-speak-overlay.ready .moral-safe-exit").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
  const micAfterExit = await inspectMoralRuntime(page);

  const deferred = {
    childId: "child-11",
    transcript: "我今天帮老师摆好小椅子",
    summary: "摆椅子",
  };
  const deferredStart = await startQaMoralReview(page, deferred);
  const deferredPending = await inspectMoralReviewCard(page, deferred.transcript, deferred.childId);
  await page.locator(".teacher-review-corner-card .defer").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
  const deferredAfter = await inspectMoralReviewCard(page, deferred.transcript, deferred.childId);

  const moduleSwitch = {
    childId: "child-12",
    transcript: "我今天主动排队等大家",
    summary: "主动排队",
  };
  const moduleSwitchStart = await startQaMoralReview(page, moduleSwitch);
  const moduleSwitchPending = await inspectMoralReviewCard(page, moduleSwitch.transcript, moduleSwitch.childId);
  const moduleChanged = await page.evaluate(() => window.__growthIslandSetActiveModuleForQa?.("roll-call") ?? false);
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
  const moduleSwitchAfter = {
    ...(await inspectMoralReviewCard(page, moduleSwitch.transcript, moduleSwitch.childId)),
    runtime: await inspectMoralRuntime(page),
  };
  await page.evaluate(() => window.__growthIslandSetActiveModuleForQa?.("home"));
  await page.waitForSelector(".pixi-world-canvas", { timeout: 5000 });

  const refresh = {
    childId: "child-13",
    transcript: "我今天给同伴让路",
    summary: "让路",
  };
  const refreshStart = await startQaMoralReview(page, refresh);
  const refreshPending = await inspectMoralReviewCard(page, refresh.transcript, refresh.childId);
  await page.waitForTimeout(180);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => typeof window.__growthIslandPrepareMoralSpeakForQa === "function", null, { timeout: 5000 });
  const refreshAfter = await inspectMoralRuntime(page);
  const refreshPersistence = await inspectMoralReviewPersistence(page, refresh.transcript, refresh.childId);

  const lowConfidence = {
    childId: "child-07",
    transcript: "嗯嗯",
    summary: "嗯嗯",
  };
  const lowStart = await startQaMoralReview(page, lowConfidence);
  await page.screenshot({ path: pendingScreenshot, fullPage: false });
  const lowPending = {
    ...(await inspectMoralReviewCard(page, lowConfidence.transcript, lowConfidence.childId)),
    touchGeometry: await inspectTouchAndOverlap(page),
  };
  if ((await page.locator(".teacher-review-corner-card .approve").count()) > 0) {
    await page.locator(".teacher-review-corner-card .approve").evaluate((button) => button.click());
  }
  await page.waitForTimeout(250);
  const lowAfterApproveAttempt = await inspectMoralReviewCard(page, lowConfidence.transcript, lowConfidence.childId);
  await page.locator(".teacher-review-corner-card .respeak").click();
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "ready" && window.__growthIslandMoralSpeak?.childId === childId,
    { childId: lowConfidence.childId },
    { timeout: 3500 },
  );
  const lowAfterRespeak = await inspectMoralReviewCard(page, lowConfidence.transcript, lowConfidence.childId);

  await startQaMoralReview(page, lowConfidence);
  const lowBeforeSkip = await inspectMoralReviewCard(page, lowConfidence.transcript, lowConfidence.childId);
  await page.locator(".teacher-review-corner-card .skip").click();
  await page.waitForFunction(
    () => window.__growthIslandMoralSpeakStage === "idle",
    { childId: lowConfidence.childId },
    { timeout: 3500 },
  );
  const lowAfterSkip = await inspectMoralReviewCard(page, lowConfidence.transcript, lowConfidence.childId);

  await startQaMoralReview(page, lowConfidence);
  await openMoralCorrectionPanel(page);
  const lowAdjustMenuTouch = await inspectTouchAndOverlap(page);
  await page.locator(".teacher-review-corner-card .review-edit-popover[open] .review-edit-panel select").selectOption("开拓创新");
  await page.locator(".teacher-review-corner-card .review-edit-popover[open] .review-edit-panel button").nth(1).click();
  await page.waitForFunction(() => {
    const approve = document.querySelector(".teacher-review-corner-card .approve");
    return approve instanceof HTMLButtonElement && !approve.disabled;
  });
  const lowAfterAdjust = await inspectMoralReviewCard(page, lowConfidence.transcript, lowConfidence.childId);

  const negative = {
    childId: "child-06",
    transcript: "我今天推了同学",
    summary: "推了同学",
  };
  const negativeStart = await startQaMoralReview(page, negative);
  const negativePending = {
    ...(await inspectMoralReviewCard(page, negative.transcript, negative.childId)),
    touchGeometry: await inspectTouchAndOverlap(page),
  };
  if ((await page.locator(".teacher-review-corner-card .approve").count()) > 0) {
    await page.locator(".teacher-review-corner-card .approve").evaluate((button) => button.click());
  }
  await page.waitForTimeout(250);
  const negativeAfterApproveAttempt = await inspectMoralReviewCard(page, negative.transcript, negative.childId);
  await openMoralCorrectionPanel(page);
  const negativeAdjustMenuTouch = await inspectTouchAndOverlap(page);
  await page.locator(".teacher-review-corner-card .review-edit-popover[open] .review-edit-panel select").selectOption("开拓创新");
  await page.locator(".teacher-review-corner-card .review-edit-popover[open] .review-edit-panel button").nth(1).click();
  await page.waitForFunction(() => {
    const approve = document.querySelector(".teacher-review-corner-card .approve");
    return approve instanceof HTMLButtonElement && !approve.disabled;
  });
  await page.screenshot({ path: adjustedScreenshot, fullPage: false });
  const negativeAfterAdjust = await inspectMoralReviewCard(page, negative.transcript, negative.childId);
  await page.locator(".teacher-review-corner-card .approve").click();
  await page.waitForSelector(".spirit-speech-bubble.success", { timeout: 4000 });
  await page.waitForFunction(
    () => window.__growthIslandMoralSpeakStage === "idle",
    null,
    { timeout: 5200 },
  );
  const negativeFinal = await inspectMoralReviewCard(page, negative.transcript, negative.childId);

  return {
    longTranscript: {
      start: longStart,
      touchGeometry: longTranscriptTouch,
      layout: longTranscriptLayout,
    },
    readyRescue: {
      started: readyStarted,
      pending: readyPending,
      afterExit: readyAfterExit,
    },
    recognizingRescue: {
      started: recognizingStarted,
      pending: recognizingPending,
      afterExit: recognizingAfterExit,
    },
    listeningCancel: {
      started: listeningStarted,
      pending: listeningPending,
      afterExit: listeningAfterExit,
    },
    asyncCancel: {
      prepared: asyncPrepared,
      recognizing: asyncRecognizing,
      finishScheduled: asyncFinishScheduled,
      afterExit: asyncAfterExit,
      persistence: asyncAfterPersistence,
    },
    micFailure: {
      started: micStarted,
      error: micError,
      afterRetry: micAfterRetry,
      afterExit: micAfterExit,
    },
    deferred,
    deferredReview: {
      start: deferredStart,
      pending: deferredPending,
      afterDefer: deferredAfter,
    },
    moduleSwitch: {
      start: moduleSwitchStart,
      pending: moduleSwitchPending,
      changed: moduleChanged,
      afterSwitch: moduleSwitchAfter,
    },
    refresh: {
      start: refreshStart,
      pending: refreshPending,
      afterReload: refreshAfter,
      persistence: refreshPersistence,
    },
    lowConfidence: {
      childId: lowConfidence.childId,
      start: lowStart,
      pending: lowPending,
      afterApproveAttempt: lowAfterApproveAttempt,
      afterRespeak: lowAfterRespeak,
      beforeSkip: lowBeforeSkip,
      afterSkip: lowAfterSkip,
      afterAdjust: lowAfterAdjust,
      adjustMenuTouchGeometry: lowAdjustMenuTouch,
      ledgerUnchanged:
        lowStart.before.matchingSelfServiceCount === lowAfterApproveAttempt.matchingSelfServiceCount &&
        lowStart.before.matchingSelfServiceCount === lowAfterRespeak.matchingSelfServiceCount &&
        lowStart.before.matchingSelfServiceCount === lowAfterSkip.matchingSelfServiceCount,
    },
    negative: {
      start: negativeStart,
      pending: negativePending,
      afterApproveAttempt: negativeAfterApproveAttempt,
      afterAdjust: negativeAfterAdjust,
      final: negativeFinal,
      adjustMenuTouchGeometry: negativeAdjustMenuTouch,
      noDirectLedger:
        negativeStart.before.matchingSelfServiceCount === negativeAfterApproveAttempt.matchingSelfServiceCount,
      noNegativeLedger: !negativeFinal.hasNegativeLedger,
    },
  };
}

async function exerciseMoralReviewOnlineStale(page, screenshot) {
  await page.waitForSelector(".pixi-world-canvas");
  await page.waitForFunction(() => window.__growthIslandSyncStatus === "online", null, { timeout: 5000 });

  const stale = {
    childId: "child-15",
    transcript: "我今天主动把彩笔放回盒子",
    summary: "收盒彩笔",
  };
  const before = await inspectMoralReviewPersistence(page, stale.transcript, stale.childId);

  let markEvaluateStarted = () => undefined;
  let releaseEvaluate = () => undefined;
  let evaluateRequestCount = 0;
  const evaluateStarted = new Promise((resolve) => {
    markEvaluateStarted = resolve;
  });

  await page.route("**:5174/api/agent/moral-evaluate", async (route) => {
    evaluateRequestCount += 1;
    const hold = new Promise((resolve) => {
      releaseEvaluate = resolve;
    });
    markEvaluateStarted();
    await hold;
    await route.continue();
  });

  const recognizing = await page.evaluate((childId) => window.__growthIslandSetMoralRecognizingForQa?.(childId) ?? false, stale.childId);
  await page.waitForFunction(
    ({ childId }) => window.__growthIslandMoralSpeakStage === "recognizing" && window.__growthIslandMoralSpeak?.childId === childId,
    stale,
    { timeout: 3500 },
  );
  const finishStarted = await page.evaluate((payload) => window.__growthIslandFinishMoralSpeakForQa?.(payload) ?? false, stale);
  await Promise.race([
    evaluateStarted,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("moral evaluate request did not start")), 5000);
    }),
  ]);
  await page.waitForFunction(() => window.__growthIslandSyncStatus === "saving", null, { timeout: 3500 });
  const duringRequest = await inspectMoralRuntime(page);
  await page.locator(".moral-speak-overlay.recognizing .moral-safe-exit").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
  releaseEvaluate();
  await page.waitForFunction(() => window.__growthIslandSyncStatus !== "saving", null, { timeout: 7000 });
  await page.waitForTimeout(220);
  await page.unroute("**:5174/api/agent/moral-evaluate");

  const afterExit = await inspectMoralRuntime(page);
  const afterPersistence = await inspectMoralReviewPersistence(page, stale.transcript, stale.childId);
  const approvalLock = await exerciseMoralApprovalLock(page);
  await page.screenshot({ path: screenshot, fullPage: false });

  return {
    stale,
    before,
    recognizing,
    finishStarted,
    evaluateRequestCount,
    duringRequest,
    afterExit,
    afterPersistence,
    approvalLock,
  };
}

async function exerciseMoralApprovalLock(page) {
  const review = {
    childId: "child-16",
    transcript: "我今天主动帮同学收玩具",
    summary: "帮助同伴",
  };

  let markLedgerStarted = () => undefined;
  let releaseLedger = () => undefined;
  let ledgerRequestCount = 0;
  const ledgerStarted = new Promise((resolve) => {
    markLedgerStarted = resolve;
  });

  await page.route("**:5174/api/ledger", async (route) => {
    ledgerRequestCount += 1;
    const hold = new Promise((resolve) => {
      releaseLedger = resolve;
    });
    markLedgerStarted();
    await hold;
    await route.continue();
  });

  const started = await startOnlineMoralReview(page, review);
  await openMoralCorrectionPanel(page);
  const beforeApprove = await inspectMoralReviewCard(page, review.transcript, review.childId);
  await page.locator(".teacher-review-corner-card .approve").click();
  await Promise.race([
    ledgerStarted,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("ledger request did not start")), 5000);
    }),
  ]);
  await page.waitForFunction(
    () => window.__growthIslandSyncStatus === "saving" && window.__growthIslandMoralSpeak?.approving === true,
    null,
    { timeout: 3500 },
  );
  const duringApprove = await inspectMoralReviewCard(page, review.transcript, review.childId);
  releaseLedger();
  await page.waitForFunction(
    () => window.__growthIslandSyncStatus !== "saving" && window.__growthIslandMoralSpeakStage === "success",
    null,
    { timeout: 7000 },
  );
  await page.waitForTimeout(220);
  const afterApprove = await inspectMoralRuntime(page);
  const afterPersistence = await inspectMoralReviewPersistence(page, review.transcript, review.childId);
  await page.unroute("**:5174/api/ledger");
  await page.evaluate(() => window.__growthIslandClearMoralSpeakForQa?.());
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 }).catch(() => undefined);

  return {
    review,
    started,
    ledgerRequestCount,
    beforeApprove,
    duringApprove,
    afterApprove,
    afterPersistence,
  };
}

async function exerciseTeacherFlow(page, scoreScreenshot, homeScreenshot) {
  await page.waitForSelector(".workbench-student-card");
  const targetCard = page.locator(".workbench-student-card").nth(4);
  await targetCard.locator(".student-card-main").click();
  await page.waitForTimeout(200);

  const selectedBefore = await page.locator(".workbench-selected-child.compact").innerText();
  const name = selectedBefore.match(/当前(?:孩子|伙伴)\s*([^\n]+)/)?.[1]?.trim() ?? extractSelectedChildName(selectedBefore);
  const xpBefore = parseEnergyValue(selectedBefore);
  const harborCopy = await page.evaluate(() => {
    const pageText = document.querySelector(".teacher-workbench-page")?.textContent ?? "";
    const drawerLabel = document.querySelector(".workbench-score-drawer")?.getAttribute("aria-label") ?? "";
    const drawerText = document.querySelector(".workbench-score-drawer")?.textContent ?? "";
    const templateText = document.querySelector(".template-grid")?.textContent ?? "";
    const harborHeader = document.querySelector(".workbench-harbor-status")?.textContent ?? "";
    const requiredCopy = ["老师记录港", "补记贝壳", "贝壳建议", "最近入港", "待老师看"];
    const forbiddenCopy = ["AI 建议", "AI 德育建议", "驳回建议", "待复核", "调整 XP", "后台", "管理", "提交分析", "确认入账"];
    return {
      drawerLabel,
      requiredCopy,
      forbiddenCopy: forbiddenCopy.filter((copy) => pageText.includes(copy)),
      hasRequiredCopy: requiredCopy.every((copy) => pageText.includes(copy)),
      hasHarborHeader: harborHeader.includes("老师记录港"),
      profileEntryRenamed: drawerText.includes("小屋") && !drawerText.includes("档案"),
      watchTemplateSeparated: !templateText.includes("老师提醒") && drawerText.includes("老师提醒"),
    };
  });
  const scoringNoise = await page.evaluate(() => {
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    };
    const cardQuickButtons = [...document.querySelectorAll(".workbench-student-card button")].filter((button) => {
      const text = button.textContent?.replace(/\s+/g, "") ?? "";
      return isVisible(button) && ["+10", "+20", "+30", "10", "20", "30"].includes(text);
    });
    const drawerRewardButtons = [...document.querySelectorAll(".batch-score-grid button")].filter(isVisible);
    return {
      cardQuickButtonCount: cardQuickButtons.length,
      drawerRewardButtonCount: drawerRewardButtons.length,
    };
  });

  await page.evaluate(() => {
    window.__growthIslandMoralAnalysisDelayMs = 650;
  });
  const aiPanel = page.locator(".workbench-ai-panel").first();
  if ((await aiPanel.count()) > 0) {
    const isOpen = await aiPanel.evaluate((node) => node instanceof HTMLDetailsElement && node.open);
    if (!isOpen) await aiPanel.locator("summary").click();
    await page.waitForSelector("#teacher-workbench-transcript", { state: "visible", timeout: 4000 });
  }
  await page.locator("#teacher-workbench-transcript").fill("我今天主动帮同学收玩具");
  await page.getByRole("button", { name: /生成建议/ }).click();
  const staleStartName = name;
  const switchCard = page.locator(".workbench-student-card").nth(5);
  await switchCard.locator(".student-card-main").click();
  await page.waitForTimeout(850);
  const switchedSelectedText = await page.locator(".workbench-selected-child.compact").innerText();
  const switchedName = switchedSelectedText.match(/当前(?:孩子|伙伴)\s*([^\n]+)/)?.[1]?.trim() ?? extractSelectedChildName(switchedSelectedText);
  const staleAnalysis = await page.evaluate(({ staleStartName, switchedName }) => {
    const selectedText = document.querySelector(".workbench-selected-child.compact")?.textContent ?? "";
    const resultText = document.querySelector(".workbench-result-card")?.textContent ?? "";
    const buttonText = document.querySelector(".workbench-ai-actions button")?.textContent ?? "";
    return {
      selectedStayedSwitched: Boolean(switchedName) && selectedText.includes(switchedName) && !selectedText.includes(staleStartName),
      noStaleResultCard: resultText.trim().length === 0,
      actionReset: buttonText.includes("生成建议"),
    };
  }, { staleStartName, switchedName });
  await page.evaluate(() => {
    window.__growthIslandMoralAnalysisDelayMs = 0;
  });
  await targetCard.locator(".student-card-main").click();
  await page.waitForTimeout(200);

  await page.locator(".batch-score-grid button").first().click();
  await page.waitForFunction(
    ({ expectedXp }) => {
      const text = document.querySelector(".workbench-selected-child.compact")?.textContent ?? "";
      return text.includes(`${expectedXp} XP`) || text.includes(`${expectedXp} 能量`);
    },
    { expectedXp: xpBefore + 10 },
    { timeout: 3000 },
  );
  const quickGlobalFeedback = await readGrowthFeedback(page);

  const selectedAfterQuick = await page.locator(".workbench-selected-child.compact").innerText();
  const xpAfterQuick = parseEnergyValue(selectedAfterQuick);
  const firstQuickRecordId = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    return [...(window.__growthIslandLedger ?? [])].find(
      (item) =>
        item.childId === selectedChildId &&
        !item.undone &&
        item.reason === "课堂记录：快速加分 +10" &&
        item.source === "manual",
    )?.id;
  });
  const feedbackBeforeUndo = await page.locator(".workbench-recent-feedback").innerText();
  await page.locator(".workbench-recent-feedback .workbench-undo-button").click();
  await page.waitForFunction(
    ({ expectedXp }) => {
      const text = document.querySelector(".workbench-selected-child.compact")?.textContent ?? "";
      return text.includes(`${expectedXp} XP`) || text.includes(`${expectedXp} 能量`);
    },
    { expectedXp: xpBefore },
    { timeout: 3000 },
  );
  const undoContract = await page.evaluate(({ recordId }) => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const ledger = window.__growthIslandLedger ?? [];
    const original = ledger.find((item) => item.id === recordId);
    const undo = ledger.find((item) => item.undoOf === recordId);
    return {
      recordId,
      originalUndone: original?.undone === true,
      undoChildMatches: undo?.childId === selectedChildId,
      undoDelta: undo?.delta,
      undoSource: undo?.source,
      undoRole: undo?.operatorRole,
    };
  }, { recordId: firstQuickRecordId });
  await page.locator(".batch-score-grid button").first().click();
  await page.waitForFunction(
    ({ expectedXp }) => {
      const text = document.querySelector(".workbench-selected-child.compact")?.textContent ?? "";
      return text.includes(`${expectedXp} XP`) || text.includes(`${expectedXp} 能量`);
    },
    { expectedXp: xpBefore + 10 },
    { timeout: 3000 },
  );
  const selectedAfterQuickAgain = await page.locator(".workbench-selected-child.compact").innerText();
  const xpAfterQuickAgain = parseEnergyValue(selectedAfterQuickAgain);
  const feedbackText = await page.locator(".workbench-recent-feedback").innerText();
  await page.locator(".manual-score-pad summary").click();
  await page.locator(".manual-score-grid button.deduct").filter({ hasText: /扣\s*10/ }).first().click();
  await page.waitForSelector(".deduct-confirm-panel");
  const selectedAfterDeductAttempt = await page.locator(".workbench-selected-child.compact").innerText();
  const deductPanelText = await page.locator(".deduct-confirm-panel").innerText();
  await page.locator(".deduct-confirm-panel button").last().click();
  const quickLedgerContract = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const record = [...(window.__growthIslandLedger ?? [])].find(
      (item) => item.childId === selectedChildId && !item.undone && item.reason === "课堂记录：快速加分 +10",
    );
    return record
      ? {
          childIdMatches: record.childId === selectedChildId,
          delta: record.delta,
          source: record.source,
          category: record.category,
          hasOperator: Boolean(record.operatorChildId),
          operatorRole: record.operatorRole,
          aiSuggested: record.aiSuggested,
          reviewStatus: record.reviewStatus,
        }
      : undefined;
  });

  await page.locator("#teacher-workbench-transcript").fill("我排队的时候推了同学，没有遵守规则");
  await page.getByRole("button", { name: /生成建议/ }).click();
  await page.waitForSelector(".workbench-result-card.negative");
  const negativeAiResultText = await page.locator(".workbench-result-card.negative").innerText();
  const beforeNegativeAiRecordCount = await page.evaluate(() =>
    (window.__growthIslandLedger ?? []).filter((record) => record.source === "dialogue-agent" && !record.undone).length,
  );
  const negativeAiActionState = await page.evaluate(() => {
    const resultCard = document.querySelector(".workbench-result-card.negative");
    const primary = resultCard?.querySelector(".workbench-result-actions button:first-child");
    return {
      resultText: resultCard?.textContent?.replace(/\s+/g, "") ?? "",
      primaryText: primary?.textContent?.replace(/\s+/g, "") ?? "",
      primaryDisabled: primary instanceof HTMLButtonElement ? primary.disabled : false,
      hasConfirmPanel: Boolean(document.querySelector(".ai-negative-confirm")),
    };
  });
  const selectedAfterNegativeAiAttempt = await page.locator(".workbench-selected-child.compact").innerText();
  const afterNegativeAiRecordCount = await page.evaluate(() =>
    (window.__growthIslandLedger ?? []).filter((record) => record.source === "dialogue-agent" && !record.undone).length,
  );

  await page.locator(".manual-score-grid button.deduct").filter({ hasText: /扣\s*10/ }).first().click();
  await page.waitForSelector(".deduct-confirm-panel");
  await page.locator(".deduct-confirm-panel .deduct-confirm").click();
  await page.waitForFunction(
    ({ expectedXp }) => {
      const text = document.querySelector(".workbench-selected-child.compact")?.textContent ?? "";
      return text.includes(`${expectedXp} XP`) || text.includes(`${expectedXp} 能量`);
    },
    { expectedXp: xpAfterQuickAgain - 10 },
    { timeout: 3000 },
  );
  const manualNegativeGlobalFeedback = await readGrowthFeedback(page);
  const selectedAfterManualNegative = await page.locator(".workbench-selected-child.compact").innerText();
  const xpAfterManualNegative = parseEnergyValue(selectedAfterManualNegative);
  const manualNegativeLedgerContract = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const record = [...(window.__growthIslandLedger ?? [])].find(
      (item) =>
        item.childId === selectedChildId &&
        !item.undone &&
        item.delta === -10 &&
        item.source === "manual" &&
        item.reason.includes("老师确认扣分 -10"),
    );
    return record
      ? {
          childIdMatches: record.childId === selectedChildId,
          delta: record.delta,
          source: record.source,
          category: record.category,
          hasOperator: Boolean(record.operatorChildId),
          operatorRole: record.operatorRole,
          aiSuggested: record.aiSuggested,
          reviewStatus: record.reviewStatus,
        }
      : undefined;
  });

  await page.locator("#teacher-workbench-transcript").fill("我今天主动帮同学收玩具");
  await page.getByRole("button", { name: /生成建议/ }).click();
  await page.waitForSelector(".workbench-result-card");
  const beforeConfirmAiRecordCount = await page.evaluate(() =>
    (window.__growthIslandLedger ?? []).filter((record) => record.source === "dialogue-agent").length,
  );
  const resultText = await page.locator(".workbench-result-card").innerText();
  const aiDelta = parseEnergyDelta(resultText);
  await page.getByRole("button", { name: /记入成长/ }).click();
  await page.waitForFunction(
    ({ expectedXp }) => {
      const text = document.querySelector(".workbench-selected-child.compact")?.textContent ?? "";
      return text.includes(`${expectedXp} XP`) || text.includes(`${expectedXp} 能量`);
    },
    { expectedXp: xpAfterManualNegative + aiDelta },
    { timeout: 3000 },
  );
  const aiGlobalFeedback = await readGrowthFeedback(page);
  const afterConfirmAiRecordCount = await page.evaluate(() =>
    (window.__growthIslandLedger ?? []).filter((record) => record.source === "dialogue-agent").length,
  );
  const aiLedgerContract = await page.evaluate(({ expectedDelta }) => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const record = [...(window.__growthIslandLedger ?? [])].find(
      (item) =>
        item.childId === selectedChildId &&
        item.source === "dialogue-agent" &&
        item.delta === expectedDelta &&
        item.reason.startsWith("语音记录："),
    );
    return record
      ? {
          childIdMatches: record.childId === selectedChildId,
          delta: record.delta,
          source: record.source,
          category: record.category,
          hasOperator: Boolean(record.operatorChildId),
          operatorRole: record.operatorRole,
          aiSuggested: record.aiSuggested,
          reviewStatus: record.reviewStatus,
        }
      : undefined;
  }, { expectedDelta: aiDelta });

  const selectedAfter = await page.locator(".workbench-selected-child.compact").innerText();
  const recordText = await page.locator(".workbench-record-list").innerText();
  const xpAfter = parseEnergyValue(selectedAfter);
  await page.screenshot({ path: scoreScreenshot, fullPage: false });

  await page.locator(".workbench-home-button").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const homeText = await page.locator(".hud-rail").innerText();

  return {
    name,
    xpBefore,
    xpAfter,
    quickDelta: xpAfterQuickAgain - xpBefore,
    scoringNoise,
    staleAnalysisIgnored: staleAnalysis.selectedStayedSwitched && staleAnalysis.noStaleResultCard && staleAnalysis.actionReset,
    staleAnalysis,
    hasFeedbackTarget: feedbackText.includes(name) || quickGlobalFeedback?.text?.includes(name),
    undoNamesTarget: feedbackBeforeUndo.includes("撤销") && feedbackBeforeUndo.includes(name),
    undoContract,
    deductRequiresConfirm:
      textHasEnergyValue(selectedAfterDeductAttempt, xpAfterQuickAgain) &&
      deductPanelText.includes("确认") &&
      deductPanelText.includes(name) &&
      /扣\s*10|调整\s*10/.test(deductPanelText),
    negativeAiBlocked:
      textHasEnergyValue(selectedAfterNegativeAiAttempt, xpAfterQuickAgain) &&
      negativeAiResultText.includes("需老师处理") &&
      negativeAiActionState.resultText.includes("需老师处理") &&
      negativeAiActionState.primaryText.includes("先处理") &&
      negativeAiActionState.primaryDisabled &&
      !negativeAiActionState.hasConfirmPanel &&
      afterNegativeAiRecordCount === beforeNegativeAiRecordCount,
    harborCopyUpdated:
      harborCopy.drawerLabel === "成长记录港" &&
      harborCopy.hasRequiredCopy &&
      harborCopy.hasHarborHeader &&
      harborCopy.profileEntryRenamed &&
      harborCopy.watchTemplateSeparated &&
      harborCopy.forbiddenCopy.length === 0,
    harborCopy,
    totalDelta: xpAfter - xpBefore,
    aiDelta,
    hasQuickRecord: Boolean(quickLedgerContract),
    hasAiRecord: Boolean(aiLedgerContract),
    noAiLedgerBeforeConfirm: beforeNegativeAiRecordCount === afterNegativeAiRecordCount,
    positiveAiRecordCreated: afterConfirmAiRecordCount === beforeConfirmAiRecordCount + 1,
    manualNegativeGlobalFeedback,
    manualNegativeLedgerContract,
    negativeAiActionState,
    quickLedgerContract,
    aiLedgerContract,
    quickGlobalFeedback,
    aiGlobalFeedback,
    homeFocused: Boolean(name) && homeText.includes(name),
    homeHasRecord: /能量|光点|点亮/.test(homeText) && !/XP|积分|加分|扣分|减分|[+＋-]\d/.test(homeText),
    homeScreenshot,
  };
}

async function exerciseVoiceFlow(page, confirmedScreenshot, suggestionScreenshot, homeScreenshot) {
  await page.waitForSelector(".voice-record-page");
  const initialCopy = await page.evaluate(() => {
    const drawer = document.querySelector(".teacher-tools-drawer");
    if (drawer instanceof HTMLDetailsElement) drawer.open = true;
    const drawerText = document.querySelector(".teacher-tools-panel")?.textContent ?? "";
    if (drawer instanceof HTMLDetailsElement) drawer.open = false;
    return {
      pageText: document.querySelector(".voice-record-page")?.textContent ?? "",
      drawerText,
    };
  });
  await page.selectOption("#voice-record-child", "child-06");
  await page.waitForTimeout(200);

  const selectedBefore = await page.locator(".voice-child-card").innerText();
  const name = selectedBefore.match(/当前伙伴\s*([^\n]+)/)?.[1]?.trim() ?? "";
  const xpBefore = parseEnergyValue(selectedBefore);

  await page.getByRole("button", { name: /生成建议/ }).click();
  await page.waitForSelector(".voice-result-card");
  await page.waitForFunction(() => document.querySelector(".voice-result-panel")?.textContent?.includes("待老师确认"));
  const beforeConfirmAiRecordCount = await page.evaluate(() =>
    (window.__growthIslandLedger ?? []).filter((record) => record.source === "dialogue-agent").length,
  );
  const resultText = await page.locator(".voice-result-card").innerText();
  const suggestionPanelText = await page.locator(".voice-result-panel").innerText();
  const aiDelta = parseEnergyDelta(resultText);
  await page.screenshot({ path: suggestionScreenshot, fullPage: false });

  await page.getByRole("button", { name: /记入成长/ }).click();
  await page.waitForFunction(
    ({ expectedXp }) => {
      const text = document.querySelector(".voice-child-card")?.textContent ?? "";
      return text.includes(`${expectedXp} XP`) || text.includes(`${expectedXp} 能量`);
    },
    { expectedXp: xpBefore + aiDelta },
    { timeout: 3000 },
  );
  const confirmGlobalFeedback = await readGrowthFeedback(page);
  const selectedAfter = await page.locator(".voice-child-card").innerText();
  const historyPanel = page.locator(".voice-history-panel").first();
  if ((await historyPanel.count()) > 0) {
    const isOpen = await historyPanel.evaluate((node) => node instanceof HTMLDetailsElement && node.open);
    if (!isOpen) await historyPanel.locator("summary").click();
  }
  const historyText = await page.locator(".voice-history-panel").innerText();
  const xpAfter = parseEnergyValue(selectedAfter);
  const ledgerCountBeforeReject = await page.evaluate(() => (window.__growthIslandLedger ?? []).length);
  const ledgerContract = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const record = [...(window.__growthIslandLedger ?? [])].find(
      (item) => item.childId === selectedChildId && item.source === "dialogue-agent" && item.reason.startsWith("语音记录："),
    );
    return record
      ? {
          childIdMatches: record.childId === selectedChildId,
          delta: record.delta,
          source: record.source,
          category: record.category,
          hasOperator: Boolean(record.operatorChildId),
          operatorRole: record.operatorRole,
          aiSuggested: record.aiSuggested,
          reviewStatus: record.reviewStatus,
        }
      : undefined;
  });
  await page.screenshot({ path: confirmedScreenshot, fullPage: false });

  await page.getByRole("button", { name: /生成建议/ }).click();
  await page.waitForFunction(() => document.querySelector(".voice-result-panel")?.textContent?.includes("待老师确认"));
  await page.getByRole("button", { name: /不采用/ }).first().click();
  await page.waitForFunction(() => document.querySelector(".voice-result-panel")?.textContent?.includes("已退回"));
  const rejectGlobalFeedback = await readGrowthFeedback(page);
  const ledgerCountAfterReject = await page.evaluate(() => (window.__growthIslandLedger ?? []).length);

  await page.locator(".voice-home-button").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const homeText = await page.locator(".hud-rail").innerText();

  return {
    name,
    xpBefore,
    xpAfter,
    aiDelta,
    delta: xpAfter - xpBefore,
    hasSuggestion: /(?:XP|能量)/.test(resultText) && resultText.includes("记入成长") && suggestionPanelText.includes("待老师确认"),
    hasHistoryRecord: historyText.includes("语音记录："),
    sceneCopyUpdated:
      initialCopy.pageText.includes("贝壳记录台") &&
      initialCopy.pageText.includes("贝壳判断") &&
      initialCopy.pageText.includes("最近入账") &&
      ["AI 建议", "AI 判断结果", "文本记录", "文本记录工作台", "提交分析", "最近文本记录", "后台", "管理"].every(
        (copy) => !initialCopy.pageText.includes(copy),
      ),
    teacherDrawerCopyUpdated:
      initialCopy.drawerText.includes("老师工具") &&
      initialCopy.drawerText.includes("老师记录港") &&
      initialCopy.drawerText.includes("贝壳记录台") &&
      ["成长账本", "班级岛务", "岛屿设置", "数据管理", "园所运营", "系统设置", "文本记录", "后台", "管理"].every(
        (copy) => !initialCopy.drawerText.includes(copy),
      ),
    noAiLedgerBeforeConfirm: beforeConfirmAiRecordCount === 0,
    noLedgerOnReject: ledgerCountAfterReject === ledgerCountBeforeReject,
    ledgerContract,
    confirmGlobalFeedback,
    confirmFeedbackCopyUpdated:
      !["AI 记录", "AI 建议", "AI 判断"].some((copy) => confirmGlobalFeedback?.text?.includes(copy)),
    rejectGlobalFeedback,
    rejectFeedbackCopyUpdated:
      rejectGlobalFeedback?.text?.includes("贝壳建议已退回") &&
      !["AI 记录", "AI 建议", "AI 判断"].some((copy) => rejectGlobalFeedback?.text?.includes(copy)),
    homeFocused: Boolean(name) && homeText.includes(name),
    homeHasRecord: /能量|贝壳|光点|点亮/.test(homeText) && !/XP|积分|加分|扣分|减分|[+＋-]\d/.test(homeText),
    suggestionScreenshot,
    homeScreenshot,
  };
}

async function answerCurrentMathProblem(page) {
  const answerIndex = await page.evaluate(() => {
    const text = document.querySelector(".problem-card strong")?.textContent ?? "";
    const match = text.match(/(\d+)\s*([+-])\s*(\d+)/);
    if (!match) return -1;
    const left = Number(match[1]);
    const right = Number(match[3]);
    const answer = match[2] === "+" ? left + right : left - right;
    const buttons = [...document.querySelectorAll(".answer-grid button")];
    return buttons.findIndex((button) => button.getAttribute("data-answer-value") === String(answer));
  });
  if (answerIndex < 0) throw new Error("Could not find correct math answer option");
  await page.locator(".answer-grid button").nth(answerIndex).click();
}

async function exerciseMathFlow(page, battleScreenshot, homeScreenshot) {
  await page.waitForSelector(".math-arena-page");
  await page.selectOption("#math-arena-player", "child-06");
  await page.waitForTimeout(150);
  await page.selectOption("#math-arena-opponent", "child-07");
  await page.waitForTimeout(150);

  const selectedFighters = await page.evaluate(() => {
    const playerSelect = document.querySelector("#math-arena-player");
    const opponentSelect = document.querySelector("#math-arena-opponent");
    const selectedText = (select) => (select instanceof HTMLSelectElement ? select.selectedOptions[0]?.textContent ?? "" : "");
    return {
      playerName: selectedText(playerSelect).split("·")[0]?.trim() ?? "",
      opponentName: selectedText(opponentSelect).split("·")[0]?.trim() ?? "",
    };
  });
  const xpBefore = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    return (window.__growthIslandLedger ?? [])
      .filter((record) => record.childId === selectedChildId && !record.undone)
      .reduce((sum, record) => sum + record.delta, 0);
  });

  await page.getByRole("button", { name: /开始点亮/ }).click();
  await page.waitForSelector(".problem-card");
  const initialBattleText = await page.locator(".math-arena-battle-shell").innerText();

  for (let i = 0; i < 12; i += 1) {
    const log = await page.locator(".light-log").innerText();
    if (log.includes("点亮数学能量")) break;
    await answerCurrentMathProblem(page);
    await page.waitForTimeout(520);
  }

  await page.waitForFunction(() => document.querySelector(".light-log")?.textContent?.includes("点亮数学能量"), undefined, {
    timeout: 3000,
  });
  await page.waitForFunction(
    () => [...(window.__growthIslandLedger ?? [])].some((record) => record.source === "math-pk" && record.delta === 30),
    undefined,
    { timeout: 3000 },
  );
  const winGlobalFeedback = await readGrowthFeedback(page);
  const battleText = await page.locator(".math-arena-page").innerText();
  const completedName = (await page.locator(".light-log").innerText()).match(/^(.+?)\s*点亮数学能量/)?.[1]?.trim() ?? "";
  const lightFeel = await page.evaluate(() => {
    const field = document.querySelector(".lightfield");
    return {
      cue: field?.getAttribute("data-light-cue") ?? "",
      hasTurnBanner: Boolean(document.querySelector(".light-turn-banner")),
      hasActionVfx: Boolean(document.querySelector(".light-action-vfx")),
      hasLightPop: Boolean(document.querySelector(".light-pop")),
      hasGlowingPartner: Boolean(document.querySelector(".light-partner.glowing")),
      hasCompleteMedal: Boolean(document.querySelector(".light-partner.complete .light-complete-medal")),
      hasCompleteClass: Boolean(document.querySelector(".light-partner.complete")),
      skillShellCount: document.querySelectorAll(".answer-grid .skill-shell").length,
      skillShellStateCount: document.querySelectorAll(".answer-grid [data-answer-state]").length,
      skillShellLitCount: document.querySelectorAll('.answer-grid [data-answer-state="lit"]').length,
      skillShellLabelSeen: (document.querySelector(".answer-grid")?.textContent ?? "").includes("答案贝壳"),
      lightLogCue: document.querySelector(".light-log")?.getAttribute("data-light-log-cue") ?? "",
      lightTrackCount: document.querySelectorAll(".light-track").length,
      forbiddenCopy: ["PK", "HP", "攻击", "开战", "战斗", "对手", "胜者", "获胜"].filter((copy) =>
        (document.querySelector(".math-arena-page")?.textContent ?? "").includes(copy),
      ),
    };
  });
  const ledgerContract = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const record = [...(window.__growthIslandLedger ?? [])].find(
      (item) => item.childId === selectedChildId && item.source === "math-pk" && item.reason.includes("数学光路点亮"),
    );
    return record
      ? {
          childIdMatches: record.childId === selectedChildId,
          delta: record.delta,
          source: record.source,
          category: record.category,
          hasOperator: Boolean(record.operatorChildId),
          operatorRole: record.operatorRole,
          aiSuggested: record.aiSuggested,
          reviewStatus: record.reviewStatus,
        }
      : undefined;
  });
  await page.screenshot({ path: battleScreenshot, fullPage: false });

  await page.locator(".math-arena-focus-winner").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const homeText = await page.locator(".hud-rail").innerText();

  return {
    playerName: selectedFighters.playerName,
    opponentName: selectedFighters.opponentName,
    xpBefore,
    completedName,
    questionSeen: /[+-]\s*\d+\s*=/.test(initialBattleText),
    energyTrackSeen: initialBattleText.includes("光格") || initialBattleText.includes("每题一格光"),
    completionLogSeen: battleText.includes("点亮数学能量") && !/XP|PK|HP|攻击|胜者|获胜|战斗|对手/.test(battleText),
    lightFeel,
    ledgerContract,
    winGlobalFeedback,
    homeFocused: Boolean(completedName) && homeText.includes(completedName),
    homeHasRecord: /数学光点|光点到账|能量|点亮/.test(homeText) && !/XP|PK|HP|攻击|[+＋-]\d/.test(homeText),
    homeScreenshot,
  };
}

async function inspectCurrentProfile(page) {
  return page.evaluate(() => {
    const isPlainWhite = (color) => ["rgb(255, 255, 255)", "rgba(255, 255, 255, 1)", "#ffffff"].includes(color);
    const selectedChildId = window.__growthIslandSelectedChildId;
    const ledger = window.__growthIslandLedger ?? [];
    const records = ledger.filter((record) => record.childId === selectedChildId && !record.undone && record.source !== "undo");
    const positiveXp = records.reduce((sum, record) => sum + Math.max(0, record.delta), 0);
    const heroText = document.querySelector(".profile-hero-card")?.textContent ?? "";
    const timelineText = document.querySelector(".profile-timeline")?.textContent ?? "";
    const evidenceText = document.querySelector(".profile-evidence-card")?.textContent ?? "";
    const pageText = document.querySelector(".profile-page")?.textContent ?? "";
    const forbiddenCopy = [
      "AI 建议确认",
      "AI 记录",
      "AI 建议",
      "待复核",
      "后台",
      "管理",
      "档案孩子列表",
      "德育画像",
      "XP",
      "Lv.",
      "PK",
      "积分",
      "加分",
      "扣分",
      "减分",
      "记录",
    ].filter((copy) => pageText.includes(copy));
    const page = document.querySelector(".profile-page");
    const story = document.querySelector(".profile-story-panel");
    const cabin = document.querySelector(".profile-cabin-stage");
    const hero = document.querySelector(".profile-hero-card");
    const roster = document.querySelector(".profile-roster-panel");
    const timelineRows = [...document.querySelectorAll(".profile-timeline article")];
    const storyStyle = story ? getComputedStyle(story) : undefined;
    const cabinStyle = cabin ? getComputedStyle(cabin) : undefined;
    const heroStyle = hero ? getComputedStyle(hero) : undefined;
    const pageStyle = page ? getComputedStyle(page) : undefined;
    const storyRect = story?.getBoundingClientRect();
    const rosterRect = roster?.getBoundingClientRect();
    const cabinRect = cabin?.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();
    const spiritMain = document.querySelector(".profile-spirit-main");
    const spiritImage = document.querySelector(".profile-spirit-main img");
    const spiritMainRect = spiritMain?.getBoundingClientRect();
    const spiritImageSrc = spiritImage?.getAttribute("src") ?? "";
    const spiritId = spiritMain?.dataset.spiritId ?? "";
    const cabin3dStage = document.querySelector(".profile-cabin-reward-stage");
    const cabin3dRect = cabin3dStage?.getBoundingClientRect();
    const cabin3dStyle = cabin3dStage ? getComputedStyle(cabin3dStage) : undefined;
    const cabinRoomProps = [...document.querySelectorAll(".profile-cabin-room-prop")];
    const cabinRoomPropSources = cabinRoomProps.map((prop) => prop.getAttribute("src") ?? "");
    const moralStart = document.querySelector(".profile-moral-start");
    const moralStartRect = moralStart?.getBoundingClientRect();
    const timelineRowMaxHeight = timelineRows.reduce((max, row) => Math.max(max, Math.round(row.getBoundingClientRect().height)), 0);
    const firstTimelineRow = timelineRows[0];
    const firstTimelineStyle = firstTimelineRow ? getComputedStyle(firstTimelineRow) : undefined;
    return {
      selectedChildId,
      ledgerRecordCount: records.length,
      positiveXp,
      hasCabinScene: pageText.includes("精灵小屋") && pageText.includes("最近贝壳") && pageText.includes("小屋状态") && pageText.includes("已进入"),
      hasRoomLabels: pageText.includes("小屋名单") && pageText.includes("能量与高光"),
      forbiddenCopy,
      heroHasEnergyCopy:
        heroText.includes("成长阶段") &&
        heroText.includes("能量槽") &&
        pageText.includes("点亮能量") &&
        !/XP|Lv\.|PK|积分|加分|扣分|减分/.test(pageText),
      hasSpirit: Boolean(spiritMain && (spiritImage || spiritMain.textContent?.trim())),
      hasUnique2dSpirit: Boolean(
        spiritMainRect &&
        spiritMainRect.width >= 142 &&
        spiritMainRect.height >= 142 &&
        spiritId &&
        spiritImageSrc.includes(`/assets/spirits/thumbs/${spiritId}/`),
      ),
      hasCabinAtmosphere3dStage: Boolean(cabin3dRect && cabin3dRect.width >= 44 && cabin3dRect.height >= 44),
      hasCabinAtmosphere3dSurface: Boolean(cabin3dStage?.querySelector(".model-stage-canvas, .model-stage-fallback")),
      cabinAtmosphere3dPassive: cabin3dStyle?.pointerEvents === "none",
      hasCabinRoomModelProps:
        cabinRoomProps.length >= 2 &&
        cabinRoomPropSources.every((src) => src.includes("/assets/map/3d-props/")),
      hasCabinMoralStart: Boolean(
        moralStart &&
          moralStartRect &&
          moralStartRect.width >= 44 &&
          moralStartRect.height >= 44 &&
          (moralStart.textContent ?? "").includes("说成长"),
      ),
      cabinMoralStartInStage: Boolean(
        moralStartRect &&
          cabinRect &&
          moralStartRect.left >= cabinRect.left - 1 &&
          moralStartRect.right <= cabinRect.right + 1 &&
          moralStartRect.top >= cabinRect.top - 1 &&
          moralStartRect.bottom <= cabinRect.bottom + 1,
      ),
      hasTimelineRecord: /课堂成长点亮|能量进精灵|数学光路点亮|已有成长|成长贝壳/.test(timelineText),
      hasAnyTimelineRecord: records.length === 0 || timelineRows.length > 0,
      evidenceHasRecordCount: evidenceText.includes(`${records.length} 条`),
      evidenceHasPositiveEnergy: evidenceText.includes(`${positiveXp} 能量`),
      hasDimensionStats: document.querySelectorAll(".dimension-list article").length >= 7,
      hasCabinStage:
        Boolean(cabinStyle) &&
        Boolean(cabinRect && cabinRect.height >= 180 && cabinRect.width > 0) &&
        cabinStyle.backgroundImage !== "none" &&
        !isPlainWhite(cabinStyle.backgroundColor),
      storyPanelNotWhiteWorkbench:
        Boolean(storyStyle) &&
        storyStyle.backgroundImage !== "none" &&
        !isPlainWhite(storyStyle.backgroundColor) &&
        (!heroStyle || !isPlainWhite(heroStyle.backgroundColor) || heroStyle.backgroundImage !== "none"),
      pageHasCoastalScene: Boolean(pageStyle) && pageStyle.backgroundImage !== "none",
      timelineCompact: timelineRows.length === 0 || timelineRowMaxHeight <= 104,
      timelineRowsNotPlainWhite:
        timelineRows.length === 0 ||
        Boolean(firstTimelineStyle && (!isPlainWhite(firstTimelineStyle.backgroundColor) || firstTimelineStyle.backgroundImage !== "none")),
      cabinDominatesRoster:
        Boolean(storyRect && rosterRect) &&
        (window.innerWidth <= 1160 ? Boolean(cabinRect && cabinRect.top <= rosterRect.top) : storyRect.width >= rosterRect.width * 1.6) &&
        Boolean(heroRect && heroRect.height >= (window.innerWidth <= 720 ? 150 : 180)),
      cabinLayoutRects: {
        width: window.innerWidth,
        storyTop: Math.round(storyRect?.top ?? -1),
        storyHeight: Math.round(storyRect?.height ?? -1),
        rosterTop: Math.round(rosterRect?.top ?? -1),
        rosterHeight: Math.round(rosterRect?.height ?? -1),
        cabinTop: Math.round(cabinRect?.top ?? -1),
        cabinHeight: Math.round(cabinRect?.height ?? -1),
        heroTop: Math.round(heroRect?.top ?? -1),
        heroHeight: Math.round(heroRect?.height ?? -1),
      },
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
    };
  });
}

async function exerciseProfileMoralReady(page) {
  const start = page.locator(".profile-moral-start").first();
  if ((await start.count()) === 0) return { ok: false, reason: "missing start button" };
  await start.click();
  await page.waitForSelector(".profile-cabin-stage.moral-stage-ready .moral-mic-button", { timeout: 4000 }).catch(() => undefined);
  const details = await page.evaluate(() => {
    const cabin = document.querySelector(".profile-cabin-stage");
    const mic = document.querySelector(".profile-cabin-stage .moral-mic-button");
    const overlay = document.querySelector(".profile-cabin-stage .moral-speak-overlay.ready");
    const card = document.querySelector(".profile-cabin-stage .teacher-review-corner-card");
    const cabinRect = cabin?.getBoundingClientRect();
    const micRect = mic?.getBoundingClientRect();
    const overlayRect = overlay?.getBoundingClientRect();
    const rectInside = (inner, outer) =>
      Boolean(
        inner &&
          outer &&
          inner.left >= outer.left - 1 &&
          inner.right <= outer.right + 1 &&
          inner.top >= outer.top - 1 &&
          inner.bottom <= outer.bottom + 1,
      );
    return {
      stage: cabin?.className ?? "",
      hasReadyMic: Boolean(mic),
      readyOverlayInStage: rectInside(overlayRect, cabinRect),
      micInStage: rectInside(micRect, cabinRect),
      hasTeacherCard: Boolean(card),
    };
  });
  await page.evaluate(() => window.__growthIslandClearMoralSpeakForQa?.());
  await page.waitForSelector(".profile-cabin-stage.moral-stage-idle", { timeout: 3000 }).catch(() => undefined);
  return {
    ok: details.hasReadyMic && details.readyOverlayInStage && details.micInStage && !details.hasTeacherCard,
    ...details,
  };
}

async function exerciseProfileLockedSelectionGuard(page) {
  const start = page.locator(".profile-moral-start").first();
  if ((await start.count()) === 0) return { ok: false, reason: "missing start button" };
  await start.click();
  await page.waitForSelector(".profile-cabin-stage.moral-stage-ready .moral-mic-button", { timeout: 4000 });
  const lockedBefore = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    moralChildId: window.__growthIslandMoralSpeak?.childId,
    stage: window.__growthIslandMoralSpeakStage,
  }));
  const readyOtherChildClicked = await page.evaluate(() => {
    const active = document.querySelector(".profile-roster-list button.active");
    const other = [...document.querySelectorAll(".profile-roster-list button")].find((button) => button !== active);
    if (!(other instanceof HTMLButtonElement)) return false;
    other.click();
    return true;
  });
  await page.waitForTimeout(260);
  const readyAfter = await page.evaluate(() => {
    const overlay = document.querySelector(".profile-cabin-stage .moral-speak-overlay.ready");
    const cabin = document.querySelector(".profile-cabin-stage");
    return {
      selectedChildId: window.__growthIslandSelectedChildId,
      moralChildId: window.__growthIslandMoralSpeak?.childId,
      stage: window.__growthIslandMoralSpeakStage,
      hasReadyOverlay: Boolean(overlay),
      cabinText: cabin?.textContent?.replace(/\s+/g, "") ?? "",
      feedbackText: document.querySelector(".growth-feedback-overlay")?.textContent?.replace(/\s+/g, "") ?? "",
    };
  });
  await page.locator(".profile-cabin-stage .moral-mic-button").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "listening", null, { timeout: 4000 });
  const otherChildClicked = await page.evaluate(() => {
    const active = document.querySelector(".profile-roster-list button.active");
    const other = [...document.querySelectorAll(".profile-roster-list button")].find((button) => button !== active);
    if (!(other instanceof HTMLButtonElement)) return false;
    other.click();
    return true;
  });
  await page.waitForTimeout(260);
  const after = await page.evaluate(() => {
    const overlay = document.querySelector(".profile-cabin-stage .moral-speak-overlay.listening");
    const cabin = document.querySelector(".profile-cabin-stage");
    const selectedChildId = window.__growthIslandSelectedChildId;
    const moralChildId = window.__growthIslandMoralSpeak?.childId;
    return {
      selectedChildId,
      moralChildId,
      stage: window.__growthIslandMoralSpeakStage,
      hasListeningOverlay: Boolean(overlay),
      cabinText: cabin?.textContent?.replace(/\s+/g, "") ?? "",
      feedbackText: document.querySelector(".growth-feedback-overlay")?.textContent?.replace(/\s+/g, "") ?? "",
    };
  });
  await page.evaluate(() => window.__growthIslandClearMoralSpeakForQa?.());
  await page.waitForSelector(".profile-cabin-stage.moral-stage-idle", { timeout: 3000 }).catch(() => undefined);
  return {
    ok:
      readyOtherChildClicked &&
      otherChildClicked &&
      lockedBefore.selectedChildId === lockedBefore.moralChildId &&
      readyAfter.selectedChildId === lockedBefore.selectedChildId &&
      readyAfter.moralChildId === lockedBefore.moralChildId &&
      readyAfter.stage === "ready" &&
      readyAfter.hasReadyOverlay &&
      after.selectedChildId === lockedBefore.selectedChildId &&
      after.moralChildId === lockedBefore.moralChildId &&
      after.stage === "listening" &&
      after.hasListeningOverlay,
    readyOtherChildClicked,
    otherChildClicked,
    lockedBefore,
    readyAfter,
    after,
  };
}

async function exerciseProfileFlow(page, workbenchProfileScreenshot, homeProfileScreenshot) {
  const startsOnProfile = (await page.locator(".profile-page").count()) > 0;
  if (startsOnProfile) {
    const name = (await page.locator(".profile-cabin-heading h2").innerText()).trim();
    const xpBefore = await page.evaluate(() => {
      const selectedChildId = window.__growthIslandSelectedChildId;
      return (window.__growthIslandLedger ?? [])
        .filter((record) => record.childId === selectedChildId && !record.undone)
        .reduce((sum, record) => sum + record.delta, 0);
    });
    await page.waitForSelector(".profile-spirit-main", { timeout: 5000 });
    await waitForModelStageSettled(page, ".profile-cabin-reward-stage");
    const profile = await inspectCurrentProfile(page);
    const moralReady = await exerciseProfileMoralReady(page);
    const moralSelectionGuard = await exerciseProfileLockedSelectionGuard(page);
    await page.screenshot({ path: workbenchProfileScreenshot, fullPage: false });

    await page.locator(".profile-home-button").click();
    await page.waitForSelector(".home-module");
    await page.waitForTimeout(1200);
    await waitForPixiIdle(page);
    const homeText = await page.locator(".hud-rail").innerText();
    await page.getByRole("button", { name: /精灵小屋|小屋/ }).click();
    await page.waitForSelector(".profile-page");
    await page.waitForSelector(".profile-spirit-main", { timeout: 5000 });
    await waitForModelStageSettled(page, ".profile-cabin-reward-stage");
    const fromHome = await inspectCurrentProfile(page);
    await page.screenshot({ path: homeProfileScreenshot, fullPage: false });

    return {
      name,
      xpBefore,
      xpAfter: xpBefore,
      homeHadSelectedChild: Boolean(name) && homeText.includes(name),
      moralReady,
      moralSelectionGuard,
      fromWorkbench: profile,
      fromHome,
      homeProfileScreenshot,
    };
  }

  await page.waitForSelector(".workbench-student-card");
  const targetCard = page.locator(".workbench-student-card").nth(4);
  await targetCard.locator(".student-card-main").click();
  await page.waitForTimeout(200);

  const selectedBefore = await page.locator(".workbench-selected-child.compact").innerText();
  const name = selectedBefore.match(/当前(?:孩子|伙伴)\s*([^\n]+)/)?.[1]?.trim() ?? extractSelectedChildName(selectedBefore);
  const xpBefore = parseEnergyValue(selectedBefore);
  await page.locator(".batch-score-grid button").first().click();
  await page.waitForFunction(
    ({ expectedXp }) => {
      const text = document.querySelector(".workbench-selected-child.compact")?.textContent ?? "";
      return text.includes(`${expectedXp} XP`) || text.includes(`${expectedXp} 能量`);
    },
    { expectedXp: xpBefore + 10 },
    { timeout: 3000 },
  );

  await page.getByRole("button", { name: /小屋/ }).first().click();
  await page.waitForSelector(".profile-page");
  await page.waitForSelector(".profile-spirit-main", { timeout: 5000 });
  await waitForModelStageSettled(page, ".profile-cabin-reward-stage");
  const fromWorkbench = await inspectCurrentProfile(page);
  const moralReady = await exerciseProfileMoralReady(page);
  const moralSelectionGuard = await exerciseProfileLockedSelectionGuard(page);
  await page.screenshot({ path: workbenchProfileScreenshot, fullPage: false });

  await page.locator(".profile-home-button").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  const homeText = await page.locator(".hud-rail").innerText();
  await page.getByRole("button", { name: /精灵小屋|小屋/ }).click();
  await page.waitForSelector(".profile-page");
  await page.waitForSelector(".profile-spirit-main", { timeout: 5000 });
  await waitForModelStageSettled(page, ".profile-cabin-reward-stage");
  const fromHome = await inspectCurrentProfile(page);
  await page.screenshot({ path: homeProfileScreenshot, fullPage: false });

  return {
    name,
    xpBefore,
    xpAfter: xpBefore + 10,
    homeHadSelectedChild: Boolean(name) && homeText.includes(name),
    moralReady,
    moralSelectionGuard,
    fromWorkbench,
    fromHome,
    homeProfileScreenshot,
  };
}

async function exerciseLeaderboardFlow(page, leaderboardScreenshot, homeScreenshot) {
  await page.waitForSelector(".leaderboard-page");
  await waitForModelStageSettled(page, ".leaderboard-reward-preview-3d", 2500);
  const leaderboardDetails = await page.evaluate(() => {
    const isPlainWhite = (color) => ["rgb(255, 255, 255)", "rgba(255, 255, 255, 1)", "#ffffff"].includes(color);
    const rows = [...document.querySelectorAll(".leaderboard-list li button")].map((button) => {
      const text = button.textContent ?? "";
      const style = getComputedStyle(button);
      const action = button.querySelector(".leaderboard-row-action");
      const actionRect = action?.getBoundingClientRect();
      const actionStyle = action ? getComputedStyle(action) : undefined;
      return {
        text,
        rank: Number(text.match(/#(\d+)/)?.[1] ?? Number.NaN),
        xp: Number(button.querySelector(".leaderboard-xp")?.textContent?.match(/\d+/)?.[0] ?? Number.NaN),
        actionVisible:
          Boolean(action) &&
          /看精灵|去小岛/.test(action?.textContent ?? "") &&
          Boolean(actionRect && actionRect.width > 0 && actionRect.height > 0) &&
          Boolean(actionStyle && actionStyle.display !== "none" && actionStyle.visibility !== "hidden"),
        plainWhite: isPlainWhite(style.backgroundColor) && style.backgroundImage === "none",
      };
    });
    const podium = [...document.querySelectorAll(".podium-card")].map((card) => card.textContent ?? "");
    const plaza = document.querySelector(".leaderboard-plaza-stage");
    const plazaStyle = plaza ? getComputedStyle(plaza) : undefined;
    const firstRow = document.querySelector(".leaderboard-list li button");
    const firstRowStyle = firstRow ? getComputedStyle(firstRow) : undefined;
    const selectedRow = document.querySelector(".leaderboard-list li.is-selected button");
    const selectedToken = document.querySelector(".leaderboard-selected-token");
    const selectedRewardStage = document.querySelector(".leaderboard-reward-preview-3d");
    const honorTokens = [...document.querySelectorAll(".leaderboard-honor-token")];
    const honorEnergyClippedCount = honorTokens.filter((token) => {
      const energy = token.querySelector("em");
      const rect = energy?.getBoundingClientRect();
      return (
        !energy ||
        !rect ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        energy.scrollWidth > energy.clientWidth + 1 ||
        energy.scrollHeight > energy.clientHeight + 1
      );
    }).length;
    const rowAvatarCount = document.querySelectorAll(".leaderboard-row-avatar").length;
    const pageText = document.querySelector(".leaderboard-page")?.textContent ?? "";
    const decorativePanels = document.querySelectorAll(
      ".leaderboard-podium, .leaderboard-side, .leaderboard-stat-panel, .leaderboard-selected-panel, .leaderboard-note-panel",
    );
    const sortedByRank = rows.every((row, index) => row.rank === index + 1);
    const sortedByXp = rows.every((row, index) => index === 0 || rows[index - 1].xp >= row.xp);
    const plazaRect = plaza?.getBoundingClientRect();
    const selectedRect = selectedRow?.getBoundingClientRect();
    const selectedTokenRect = selectedToken?.getBoundingClientRect();
    const selectedRewardRect = selectedRewardStage?.getBoundingClientRect();
    const selectedRewardStyle = selectedRewardStage ? getComputedStyle(selectedRewardStage) : undefined;
    return {
      rowCount: rows.length,
      topThreeCount: podium.length,
      honorTokenCount: honorTokens.length,
      honorEnergyClippedCount,
      rowAvatarCount,
      decorativePanelCount: decorativePanels.length,
      hasPlazaScene:
        pageText.includes("荣誉广场") &&
        pageText.includes("今日领航") &&
        pageText.includes("站上荣誉台") &&
        pageText.includes("广场榜墙"),
      hasExplicitChildAction: rows.every((row) => row.actionVisible),
      selectedMeaningClear: pageText.includes("正在查看") && !pageText.includes("当前旗手"),
      plazaHeight: Math.round(plazaRect?.height ?? 0),
      plazaHasWarmScene:
        Boolean(plazaStyle) &&
        plazaStyle.backgroundImage !== "none" &&
        !isPlainWhite(plazaStyle.backgroundColor),
      firstRowIsNotPlainWhite: Boolean(firstRowStyle) && (!isPlainWhite(firstRowStyle.backgroundColor) || firstRowStyle.backgroundImage !== "none"),
      rowPlainWhiteCount: rows.filter((row) => row.plainWhite).length,
      selectedRowVisible: Boolean(
        selectedRect && selectedRect.width > 0 && selectedRect.height > 0 && selectedRect.bottom > 0 && selectedRect.top < window.innerHeight,
      ),
      selectedTokenVisible: Boolean(
        selectedTokenRect &&
          selectedTokenRect.width > 0 &&
          selectedTokenRect.height > 0 &&
          selectedTokenRect.bottom > 0 &&
          selectedTokenRect.top < window.innerHeight,
      ),
      hasSelectedReward3d:
        Boolean(selectedRewardRect && selectedRewardRect.width >= 48 && selectedRewardRect.height >= 48) &&
        Boolean(selectedRewardStage?.querySelector(".model-stage-canvas, .model-stage-loader, .model-stage-fallback")),
      selectedRewardPassive: Boolean(selectedRewardStyle && selectedRewardStyle.pointerEvents === "none"),
      listNotTableLike: document.querySelectorAll(".leaderboard-page table, .leaderboard-page th, .leaderboard-column-header").length === 0,
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
      sortedByRank,
      sortedByXp,
      firstRankText: rows[0]?.text ?? "",
    };
  });
  await page.screenshot({ path: leaderboardScreenshot, fullPage: false });

  const chosenName = (await page.locator(".leaderboard-list li button").nth(2).locator(".leaderboard-child-name strong").innerText()).trim();
  await page.locator(".leaderboard-list li button").nth(2).click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const homeText = await page.locator(".hud-rail").innerText();

  return {
    ...leaderboardDetails,
    chosenName,
    homeFocused: Boolean(chosenName) && homeText.includes(chosenName),
    homeScreenshot,
  };
}

async function exerciseLotteryFlow(page, lotteryScreenshot, homeScreenshot) {
  await page.waitForSelector(".lottery-page");
  const selectedLotteryChild = await readSelectedOption(page, "#lottery-child");
  const noRewardDriftBefore = await page.evaluate(({ childId }) => {
    const child = (window.__growthIslandChildren ?? []).find((item) => item.id === childId);
    return {
      ledger: JSON.stringify(window.__growthIslandLedger ?? []),
      xp: child?.xp,
      level: child?.level,
      rank: child?.rank,
    };
  }, { childId: selectedLotteryChild.id });
  const drawCountBefore = await page.evaluate(() => (window.__growthIslandLotteryDraws ?? []).length);
  await page.getByRole("button", { name: /抽贝签|抽一枚贝签|开始抽奖/ }).click();
  await page.waitForFunction(() => {
    const text = document.querySelector(".lottery-result-card")?.textContent ?? "";
    return !text.includes("待抽贝签") && !text.includes("贝池待开启") && !text.includes("本地奖池");
  });
  await page.waitForFunction(
    ({ expectedName }) => (document.querySelector(".lottery-history-panel")?.textContent ?? "").includes(expectedName),
    { expectedName: selectedLotteryChild.name },
  );
  const drawGlobalFeedback = await readGrowthFeedback(page);
  const resultText = await page.locator(".lottery-result-card").innerText();
  const historyText = await page.locator(".lottery-history-panel").innerText();
  const activeChildText = await page.locator(".reward-child-card").innerText();
  const pageDetails = await page.evaluate(() => {
    const pageText = document.querySelector(".lottery-page")?.textContent ?? "";
    const resultRect = document.querySelector(".lottery-result-card")?.getBoundingClientRect();
    const primaryRect = document.querySelector(".reward-primary")?.getBoundingClientRect();
    const homeRect = document.querySelector(".reward-home-button")?.getBoundingClientRect();
    return {
      hasSceneCopy: pageText.includes("幸运贝池") && pageText.includes("贝池奖励") && pageText.includes("贝签足迹"),
      forbiddenCopy: ["积分抽奖", "班级奖池", "抽奖操作台", "抽奖孩子", "抽奖记录", "贝签记录", "清空结果", "后台", "管理", "本地奖池"].filter(
        (copy) => pageText.includes(copy),
      ),
      hasChildFirstResult: /抽到/.test(document.querySelector(".lottery-result-card")?.textContent ?? ""),
      resultInFirstViewport: resultRect ? resultRect.bottom <= window.innerHeight : false,
      primaryActionInFirstViewport: primaryRect ? primaryRect.bottom <= window.innerHeight : false,
      homeActionInFirstViewport: homeRect ? homeRect.bottom <= window.innerHeight : false,
    };
  });
  const noRewardDriftAfter = await page.evaluate(({ childId }) => {
    const child = (window.__growthIslandChildren ?? []).find((item) => item.id === childId);
    return {
      ledger: JSON.stringify(window.__growthIslandLedger ?? []),
      xp: child?.xp,
      level: child?.level,
      rank: child?.rank,
    };
  }, { childId: selectedLotteryChild.id });
  const drawContract = await page.evaluate(({ before }) => {
    const records = window.__growthIslandLotteryDraws ?? [];
    const latest = records[0];
    return {
      addedOne: records.length === before + 1,
      latest,
    };
  }, { before: drawCountBefore });
  await page.screenshot({ path: lotteryScreenshot, fullPage: false });

  await page.locator(".reward-home-button").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const homeText = await page.locator(".hud-rail").innerText();
  const home = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    hasHome: Boolean(document.querySelector(".home-module")),
  }));

  return {
    selectedChildName: selectedLotteryChild.name,
    ...pageDetails,
    activeChildSelected: activeChildText.includes(selectedLotteryChild.name),
    hasPrizeResult: /常见|惊喜|稀有/.test(resultText),
    hasHistory: historyText.includes(selectedLotteryChild.name),
    drawContract:
      drawContract.addedOne &&
      drawContract.latest?.childId === selectedLotteryChild.id &&
      drawContract.latest?.childName === selectedLotteryChild.name &&
      Boolean(drawContract.latest?.prizeId) &&
      Boolean(drawContract.latest?.prizeName) &&
      Boolean(drawContract.latest?.rarity) &&
      Boolean(drawContract.latest?.description) &&
      drawContract.latest?.status === "drawn" &&
      Boolean(drawContract.latest?.id) &&
      !Number.isNaN(Date.parse(drawContract.latest?.createdAt ?? "")),
    drawGlobalFeedback,
    ledgerUnchanged:
      noRewardDriftAfter.ledger === noRewardDriftBefore.ledger &&
      noRewardDriftAfter.xp === noRewardDriftBefore.xp &&
      noRewardDriftAfter.level === noRewardDriftBefore.level &&
      noRewardDriftAfter.rank === noRewardDriftBefore.rank,
    homeFocused: home.hasHome && homeText.includes(selectedLotteryChild.name) && home.selectedChildId === selectedLotteryChild.id,
    homeScreenshot,
  };
}

async function exerciseShopFlow(page, shopScreenshot, insufficientScreenshot, homeScreenshot) {
  await page.waitForSelector(".shop-page");
  await waitForModelStageSettled(page, ".shop-reward-preview-3d", 2500);
  const initialShopScene = await page.evaluate(() => {
    const isPlainWhite = (color) => ["rgb(255, 255, 255)", "rgba(255, 255, 255, 1)", "#ffffff"].includes(color);
    const page = document.querySelector(".shop-page");
    const pageText = page?.textContent ?? "";
    const forbiddenCopy = ["积分商店", "库存占位", "高阶占位", "兑换孩子", "兑换记录", "当前 XP", "选择一个奖品", "查看门槛", "XP"].filter(
      (copy) => pageText.includes(copy),
    );
    const longRewardCopy = [
      "贴在个人成长页上的小星星。",
      "成为当天桌面整理的小负责人。",
      "领取一份额外手工材料包。",
      "优先进入阅读角选择座位。",
      "在班级展示墙保留一个作品展示位。",
      "高 XP 孩子的长期荣誉称号。",
    ].filter((copy) => pageText.includes(copy));
    const shelf = document.querySelector(".shop-grid-panel");
    const shelfStyle = shelf ? getComputedStyle(shelf) : undefined;
    const rewardCards = [...document.querySelectorAll(".shop-reward-card")];
    const rewardPlainWhiteCount = rewardCards.filter((card) => {
      const style = getComputedStyle(card);
      return isPlainWhite(style.backgroundColor) && style.backgroundImage === "none";
    }).length;
    const rewardActions = rewardCards.map((card) => {
      const action = card.querySelector("button");
      const rect = action?.getBoundingClientRect();
      return {
        visible: Boolean(rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight),
        text: action?.textContent ?? "",
      };
    });
    const rewardStates = rewardCards.map((card) => card.getAttribute("data-shop-state") ?? "");
    const statusStrip = document.querySelector(".shop-status-strip");
    const rewardPreview = document.querySelector(".shop-reward-preview-3d");
    const rewardPreviewRect = rewardPreview?.getBoundingClientRect();
    const rewardPreviewStyle = rewardPreview ? getComputedStyle(rewardPreview) : undefined;
    return {
      hasShopIdentity: pageText.includes("海岛小铺") && pageText.includes("小铺"),
      hasCounter: Boolean(statusStrip) && pageText.includes("给谁换") && pageText.includes("可用能量"),
      forbiddenCopy,
      rewardCardCount: rewardCards.length,
      firstRewardActionVisibleInitially: Boolean(rewardActions[0]?.visible),
      visibleRewardActionCount: rewardActions.filter((action) => action.visible).length,
      rewardStateCount: rewardStates.filter(Boolean).length,
      availableStateCount: rewardStates.filter((state) => state === "available").length,
      lockedStateCount: rewardStates.filter((state) => state === "locked").length,
      rewardMeterCount: document.querySelectorAll(".shop-reward-meter").length,
      hasRewardPreview3d:
        Boolean(rewardPreviewRect && rewardPreviewRect.width >= 48 && rewardPreviewRect.height >= 48) &&
        Boolean(rewardPreview?.querySelector(".model-stage-canvas, .model-stage-loader, .model-stage-fallback")),
      rewardPreviewPassive: Boolean(rewardPreviewStyle && rewardPreviewStyle.pointerEvents === "none"),
      hasShelfScene:
        Boolean(shelfStyle) &&
        shelfStyle.backgroundImage !== "none" &&
        !isPlainWhite(shelfStyle.backgroundColor) &&
        rewardPlainWhiteCount === 0,
      rewardPlainWhiteCount,
      hasShortRewardActions: rewardActions.some((action) => /选这个|差 \d+ 能量/.test(action.text)),
      hidesLongRewardCopy: longRewardCopy.length === 0,
      longRewardCopy,
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
    };
  });
  const ledgerCountBefore = await page.evaluate(() => (window.__growthIslandLedger ?? []).length);
  const redemptionCountBefore = await page.evaluate(() => (window.__growthIslandShopRedemptions ?? []).length);
  const shopOptions = await readSelectOptions(page, "#shop-child");
  let insufficientChild = { id: "", name: "" };
  for (const option of shopOptions) {
    await page.selectOption("#shop-child", option.id);
    await page.waitForTimeout(100);
    const hasLockedReward = (await page.locator(".shop-reward-card.locked button").count()) > 0;
    if (hasLockedReward) {
      insufficientChild = option;
      break;
    }
  }
  if (!insufficientChild.id) throw new Error("Could not find a shop child with locked rewards");
  await page.locator(".shop-reward-card.locked button").last().click();
  await page.waitForFunction(() => (document.querySelector(".shop-intent-card")?.textContent ?? "").includes("能量不够"));
  await waitForModelStageSettled(page, ".shop-reward-preview-3d", 2500);
  const insufficientText = await page.locator(".shop-intent-card").innerText();
  await page.screenshot({ path: insufficientScreenshot, fullPage: false });

  let selectedShopChild = { id: "", name: "" };
  for (const option of shopOptions) {
    await page.selectOption("#shop-child", option.id);
    await page.waitForTimeout(100);
    const hasAvailableReward = (await page.locator(".shop-reward-card.available button").count()) > 0;
    if (hasAvailableReward) {
      selectedShopChild = option;
      break;
    }
  }
  if (!selectedShopChild.id) throw new Error("Could not find a shop child with available rewards");
  const selectedReward = await page.locator(".shop-reward-card.available").first().evaluate((card) => ({
    id: card.getAttribute("data-reward-id") ?? "",
    name: card.querySelector("h2")?.textContent?.trim() ?? "",
    cost: Number(card.querySelector(".shop-reward-head strong")?.textContent?.match(/(\d+)/)?.[1] ?? Number.NaN),
  }));
  await page.locator(".shop-reward-card.available button").first().click();
  await page.waitForFunction(() => (document.querySelector(".shop-intent-card")?.textContent ?? "").includes("已选小奖励"));
  await page.getByRole("button", { name: /^兑换$/ }).click();
  await page.waitForFunction(() => (document.querySelector(".shop-intent-card")?.textContent ?? "").includes("兑换成功"));
  await waitForModelStageSettled(page, ".shop-reward-preview-3d", 2500);
  const redeemGlobalFeedback = await readGrowthFeedback(page);
  const availableText = await page.locator(".shop-intent-card").innerText();
  const balanceText = await page.locator(".shop-balance-card").innerText();
  const redemptionText = await page.locator(".shop-redemption-panel").innerText();
  const ledgerCountAfter = await page.evaluate(() => (window.__growthIslandLedger ?? []).length);
  const redemptionDetails = await page.evaluate(({ before }) => {
    const records = window.__growthIslandShopRedemptions ?? [];
    const latest = records[0];
    return {
      countAfter: records.length,
      addedOne: records.length === before + 1,
      latest,
    };
  }, { before: redemptionCountBefore });
  const redeemedCardGuard = await page.evaluate(({ rewardId }) => {
    const card = document.querySelector(`[data-reward-id="${rewardId}"]`);
    const button = card?.querySelector("button");
    return {
      cardMarkedRedeemed: Boolean(card?.classList.contains("is-redeemed")),
      buttonDisabled: button instanceof HTMLButtonElement && button.disabled,
      buttonText: button?.textContent ?? "",
    };
  }, { rewardId: selectedReward.id });
  await page.screenshot({ path: shopScreenshot, fullPage: false });

  await page.locator(".reward-home-button").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const homeText = await page.locator(".hud-rail").innerText();

  return {
    insufficientChildName: insufficientChild.name,
    selectedChildName: selectedShopChild.name,
    selectedReward,
    initialShopScene,
    hasInsufficientState: insufficientText.includes("能量不够"),
    hasAvailableState: availableText.includes("兑换成功") && (availableText.includes("看精灵") || availableText.includes("回岛看")),
    hasBalance: balanceText.includes("可用能量"),
    hasRedemptionHistory:
      redemptionText.includes("待发放") &&
      Boolean(redemptionDetails.latest?.rewardName) &&
      redemptionText.includes(redemptionDetails.latest.rewardName),
    redemptionContract:
      redemptionDetails.addedOne &&
      redemptionDetails.latest?.childId === selectedShopChild.id &&
      redemptionDetails.latest?.rewardId === selectedReward.id &&
      redemptionDetails.latest?.rewardName === selectedReward.name &&
      redemptionDetails.latest?.cost === selectedReward.cost &&
      redemptionDetails.latest?.status === "requested",
    redeemedCardGuard,
    redeemGlobalFeedback,
    ledgerUnchanged: ledgerCountBefore === ledgerCountAfter,
    homeFocused: homeText.includes(selectedShopChild.name),
    insufficientScreenshot,
    homeScreenshot,
  };
}

async function inspectMobileVoice(page, screenshot) {
  await page.waitForSelector(".voice-record-page");
  await page.screenshot({ path: screenshot, fullPage: false });

  return page.evaluate(() => {
    const visible = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < document.documentElement.clientHeight * 2;
    };
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return undefined;
      const r = element.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
    };
    const text = document.querySelector(".voice-record-page")?.textContent ?? "";
    const bodyText = document.body.textContent ?? "";
    const forbiddenCopy = ["AI 建议", "AI 判断结果", "文本记录", "文本记录工作台", "提交分析", "最近文本记录", "后台", "管理"].filter(
      (copy) => text.includes(copy),
    );
    const workbench = rect(".voice-record-workbench");
    const result = rect(".voice-result-panel");
    const history = rect(".voice-history-panel");

    return {
      hasSceneTitle: text.includes("贝壳记录台") && bodyText.includes("记录贝壳"),
      hasResultPanel: text.includes("贝壳判断") && visible(".voice-result-panel"),
      hasHistoryPanel: text.includes("最近入账") && visible(".voice-history-panel"),
      hasPrimaryAction: text.includes("生成建议"),
      noPanelOverlap:
        Boolean(workbench && result && history) &&
        workbench.bottom <= result.top + 1 &&
        ((history.top >= result.top - 1 && history.bottom <= result.bottom + 1) || result.bottom <= history.top + 1),
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
      forbiddenCopy,
    };
  });
}

async function exerciseSpiritShowcase(page, screenshot) {
  await waitForPixiIdle(page);
  const opened = await page.evaluate(() => window.__growthIslandOpen3dShowcaseForQa?.() ?? false);
  await page.waitForSelector(".spirit-showcase-modal", { timeout: 5000 });
  await page
    .waitForFunction(() => {
      const stage = document.querySelector(".spirit-showcase-stage");
      return stage?.getAttribute("data-status") !== "loading";
    }, { timeout: 9000 })
    .catch(() => undefined);
  await page.waitForTimeout(700);
  await page.screenshot({ path: screenshot, fullPage: false });

  return page.evaluate(({ opened }) => {
    const modal = document.querySelector(".spirit-showcase-modal");
    const stage = document.querySelector(".spirit-showcase-stage");
    const canvas = document.querySelector(".spirit-showcase-canvas");
    const fallback = document.querySelector(".showcase-fallback");
    const closeButton = document.querySelector(".showcase-close");
    const rect = modal?.getBoundingClientRect();
    const stageRect = stage?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();
    const text = modal?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const forbiddenCopy = ["武器", "枪", "骷髅", "死亡", "炮", "炸弹", "尖刺", "锯"].filter((word) => text.includes(word));
    const modelButtons = [...document.querySelectorAll(".showcase-model-tabs button")].map((button) => button.textContent?.trim() ?? "");
    return {
      opened,
      modalVisible: Boolean(rect && rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0),
      status: stage?.getAttribute("data-status") ?? "",
      hasCanvas: Boolean(canvasRect && canvasRect.width > 80 && canvasRect.height > 80),
      hasFallback: Boolean(fallback),
      hasCloseButton: Boolean(closeButton),
      modelButtonCount: modelButtons.length,
      modelButtons,
      forbiddenCopy,
      stageContained: Boolean(
        stageRect &&
          stageRect.left >= 0 &&
          stageRect.right <= innerWidth &&
          stageRect.top >= 0 &&
          stageRect.bottom <= innerHeight,
      ),
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
      text,
    };
  }, { opened });
}

async function inspectPage(browser, check, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const resources = [];
  const pageErrors = [];
  const failedRequests = [];

  if (
    check.kind === "moral-speak-flow" ||
    check.kind === "classroom-loop" ||
    check.kind === "moral-review-safety" ||
    check.kind === "moral-review-online-stale" ||
    check.kind === "profile-flow"
  ) {
    await installMoralRecorderMock(page);
  }

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (check.offline && request.url().includes(":5174/")) return;
    const failureText = request.failure()?.errorText ?? "";
    if (
      failureText.includes("ERR_ABORTED") &&
      /\.(?:avif|gif|glb|gltf|jpe?g|png|svg|webp)(?:\?|$)/i.test(request.url())
    ) {
      return;
    }
    failedRequests.push(request.url());
  });
  if (check.offline) {
    await page.route("**:5174/**", (route) => route.abort());
  }
  page.on("response", (response) => {
    const url = response.url();
    if (!url.startsWith(baseUrl) && !url.includes("/assets/")) return;
    const headers = response.headers();
    resources.push({
      url,
      ext: resourceExt(url, response.request().resourceType()),
      status: response.status(),
      bytes: Number(headers["content-length"] || 0),
    });
  });

  const url = new URL(baseUrl);
  url.searchParams.set("module", check.module);
  url.searchParams.set("qa", String(Date.now()));

  const startedAt = performance.now();
  await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  const domContentLoadedMs = Math.round(performance.now() - startedAt);
  await page.waitForLoadState("networkidle");
  const networkIdleMs = Math.round(performance.now() - startedAt);
  await page.waitForTimeout(600);
  if (check.kind === "home" || check.kind === "home-fallback-return") await waitForPixiIdle(page);
  const p4SceneShell = check.module !== "home" ? await inspectP4SceneShell(page) : undefined;
  const screenshot = path.join(outputDir, `${check.name}-${viewport.name}.png`);
  const teacherFallbackReturnDetails =
    check.kind === "home-fallback-return" ? await exerciseTeacherFallbackReturnHome(page, screenshot) : undefined;
  const actionDetails =
    check.kind === "roll-call"
      ? await exerciseRollCall(page, screenshot, path.join(outputDir, `${check.name}-home-focus-${viewport.name}.png`))
      : undefined;
  const moralFlowDetails =
    check.kind === "moral-speak-flow"
      ? await exerciseMoralSpeakFlow(
          page,
          path.join(outputDir, `${check.name}-ready-${viewport.name}.png`),
          path.join(outputDir, `${check.name}-pending-${viewport.name}.png`),
          screenshot,
          {
            recognizingScreenshot: path.join(outputDir, `${check.name}-recognizing-${viewport.name}.png`),
            finalScreenshot: path.join(outputDir, `${check.name}-final-${viewport.name}.png`),
          },
        )
      : undefined;
  const classroomLoopDetails =
    check.kind === "classroom-loop"
      ? await exerciseClassroomTouchLoop(page, screenshot)
      : undefined;
  const moralReviewSafetyDetails =
    check.kind === "moral-review-safety"
      ? await exerciseMoralReviewSafety(
          page,
          screenshot,
          path.join(outputDir, `${check.name}-adjusted-${viewport.name}.png`),
        )
      : undefined;
  const moralReviewOnlineStaleDetails =
    check.kind === "moral-review-online-stale"
      ? await exerciseMoralReviewOnlineStale(page, screenshot)
      : undefined;
  const spiritShowcaseDetails =
    check.kind === "spirit-showcase"
      ? await exerciseSpiritShowcase(page, screenshot)
      : undefined;
  const teacherFlowDetails =
    check.kind === "teacher-flow"
      ? await exerciseTeacherFlow(page, screenshot, path.join(outputDir, `${check.name}-home-focus-${viewport.name}.png`))
      : undefined;
  const voiceFlowDetails =
    check.kind === "voice-flow"
      ? await exerciseVoiceFlow(
          page,
          screenshot,
          path.join(outputDir, `${check.name}-suggestion-${viewport.name}.png`),
          path.join(outputDir, `${check.name}-home-focus-${viewport.name}.png`),
        )
      : undefined;
  const mathFlowDetails =
    check.kind === "math-flow"
      ? await exerciseMathFlow(page, screenshot, path.join(outputDir, `${check.name}-home-focus-${viewport.name}.png`))
      : undefined;
  const profileFlowDetails =
    check.kind === "profile-flow"
      ? await exerciseProfileFlow(page, screenshot, path.join(outputDir, `${check.name}-from-home-${viewport.name}.png`))
      : undefined;
  const leaderboardFlowDetails =
    check.kind === "leaderboard-flow"
      ? await exerciseLeaderboardFlow(page, screenshot, path.join(outputDir, `${check.name}-home-focus-${viewport.name}.png`))
      : undefined;
  const lotteryFlowDetails =
    check.kind === "lottery-flow"
      ? await exerciseLotteryFlow(page, screenshot, path.join(outputDir, `${check.name}-home-focus-${viewport.name}.png`))
      : undefined;
  const shopFlowDetails =
    check.kind === "shop-flow"
      ? await exerciseShopFlow(
          page,
          screenshot,
          path.join(outputDir, `${check.name}-insufficient-${viewport.name}.png`),
          path.join(outputDir, `${check.name}-home-focus-${viewport.name}.png`),
        )
      : undefined;
  const dataFlowDetails = check.kind === "data-flow" ? await exerciseDataManagementFlow(page, screenshot) : undefined;
  const mobileDataDrawerDetails = check.kind === "data-mobile-drawer" ? await inspectMobileDataDrawer(page, screenshot) : undefined;
  const mobileSettingsDetails = check.kind === "settings-mobile" ? await inspectMobileSettings(page, screenshot) : undefined;
  const mobileVoiceDetails = check.kind === "voice-mobile" ? await inspectMobileVoice(page, screenshot) : undefined;
  const organizationFlowDetails =
    check.kind === "organization-flow"
      ? await exerciseOrganizationFlow(page, screenshot, path.join(outputDir, `${check.name}-home-focus-${viewport.name}.png`))
      : undefined;
  const settingsFlowDetails =
    check.kind === "settings-flow"
      ? await exerciseSettingsFlow(page, screenshot, path.join(outputDir, `${check.name}-home-focus-${viewport.name}.png`))
      : undefined;
  const performanceSoakDetails =
    check.kind === "home-performance-soak"
      ? await measureHomePerformanceSoak(page, {
          durationMs: Number(process.env.QA_SOAK_MS || 120000),
          sampleEveryMs: Number(process.env.QA_SOAK_SAMPLE_MS || 10000),
        })
      : undefined;

  if (
    check.kind !== "teacher-flow" &&
    check.kind !== "voice-flow" &&
    check.kind !== "moral-speak-flow" &&
    check.kind !== "classroom-loop" &&
    check.kind !== "moral-review-safety" &&
    check.kind !== "moral-review-online-stale" &&
    check.kind !== "spirit-showcase" &&
    check.kind !== "home-fallback-return" &&
    check.kind !== "voice-mobile" &&
    check.kind !== "roll-call" &&
    check.kind !== "math-flow" &&
    check.kind !== "profile-flow" &&
    check.kind !== "leaderboard-flow" &&
    check.kind !== "lottery-flow" &&
    check.kind !== "shop-flow" &&
    check.kind !== "data-flow" &&
    check.kind !== "data-mobile-drawer" &&
    check.kind !== "settings-mobile" &&
    check.kind !== "organization-flow" &&
    check.kind !== "settings-flow"
  ) {
    await page.screenshot({ path: screenshot, fullPage: false });
  }

  const common = await page.evaluate(() => {
    const imageStates = [...document.images].map((img) => {
      const rect = img.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      const ready = img.complete && img.naturalWidth > 0;
      const loadedBroken = img.complete && img.naturalWidth === 0;
      return { visible, ready, loadedBroken };
    });
    const visibleText = document.body.innerText || "";
    const forbiddenVisibleCopy = ["今天也在成长", "家园 0", "家园 1", "家园 2", "家园 3", "家园 4"].filter((copy) =>
      visibleText.includes(copy),
    );

    return {
      bodyOverflowX: document.body.scrollWidth > document.documentElement.clientWidth,
      bodyOverflowY: document.body.scrollHeight > document.documentElement.clientHeight,
      imageCount: document.images.length,
      failedImageCount: imageStates.filter((image) => image.loadedBroken || (image.visible && !image.ready)).length,
      deferredImageCount: imageStates.filter((image) => !image.visible && !image.ready && !image.loadedBroken).length,
      forbiddenVisibleCopy,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  const homeTouchGeometry = check.module === "home" && check.kind !== "spirit-showcase" ? await inspectTouchAndOverlap(page) : undefined;
  const pixiRenderState = check.module === "home" ? await inspectPixiRenderState(page) : undefined;

  const resourceSummary = summarizeResources(resources);
  const pngBytes = resourceSummary.png?.bytes ?? 0;
  const pngCount = resourceSummary.png?.count ?? 0;
  const webpBytes = resourceSummary.webp?.bytes ?? 0;
  const webpCount = resourceSummary.webp?.count ?? 0;
  const issues = [];
  const warnings = [];
  let details = {};

  if (pageErrors.length) issues.push(`${pageErrors.length} browser page error(s)`);
  if (failedRequests.length) issues.push(`${failedRequests.length} failed request(s)`);
  if (common.failedImageCount) issues.push(`${common.failedImageCount} failed image(s)`);
  if (common.bodyOverflowX) issues.push("horizontal body overflow");
  if (common.forbiddenVisibleCopy.length) issues.push(`forbidden visible copy: ${common.forbiddenVisibleCopy.join(", ")}`);
  if (pixiRenderState) {
    if (pixiRenderState.state === "idle" && (pixiRenderState.backingRatioX < 0.95 || pixiRenderState.backingRatioY < 0.95)) {
      issues.push(`pixi render backing below 0.95x css size: ${pixiRenderState.backingRatioX}x${pixiRenderState.backingRatioY}`);
    }
    if (pixiRenderState.state === "idle" && Number.isFinite(pixiRenderState.renderResolution) && pixiRenderState.renderResolution < 0.95) {
      issues.push(`pixi render resolution too low: ${pixiRenderState.renderResolution}`);
    }
  }

  const touchReports = [
    { label: "home", geometry: homeTouchGeometry },
    { label: "moral ready", geometry: moralFlowDetails?.ready?.touchGeometry },
    { label: "moral ready expanded dock", geometry: moralFlowDetails?.ready?.expandedDockTouchGeometry },
    { label: "moral listening", geometry: moralFlowDetails?.listening?.touchGeometry },
    { label: "moral pending", geometry: moralFlowDetails?.pending?.touchGeometry },
    { label: "moral pending expanded dock", geometry: moralFlowDetails?.pending?.expandedDockTouchGeometry },
    { label: "moral success", geometry: moralFlowDetails?.success?.touchGeometry },
    { label: "classroom loop ready", geometry: classroomLoopDetails?.ready?.touchGeometry },
    { label: "classroom loop pending", geometry: classroomLoopDetails?.pending?.touchGeometry },
    { label: "classroom loop success", geometry: classroomLoopDetails?.success?.touchGeometry },
    { label: "long transcript review", geometry: moralReviewSafetyDetails?.longTranscript?.touchGeometry },
    { label: "low-confidence pending", geometry: moralReviewSafetyDetails?.lowConfidence?.pending?.touchGeometry },
    { label: "low-confidence adjust menu", geometry: moralReviewSafetyDetails?.lowConfidence?.adjustMenuTouchGeometry },
    { label: "negative pending", geometry: moralReviewSafetyDetails?.negative?.pending?.touchGeometry },
    { label: "negative adjust menu", geometry: moralReviewSafetyDetails?.negative?.adjustMenuTouchGeometry },
  ].filter((report) => report.geometry);
  for (const { label, geometry } of touchReports) {
    if (geometry.badTargets.length) {
      const summary = geometry.badTargets
        .slice(0, 5)
        .map((target) => `${target.label}${target.text ? `:${target.text}` : ""} ${target.rect.width}x${target.rect.height}`)
        .join(", ");
      issues.push(`${label} undersized touch target(s): ${summary}`);
    }
    if (geometry.blockedTargets.length) {
      const summary = geometry.blockedTargets
        .slice(0, 5)
        .map((target) => `${target.label}${target.text ? `:${target.text}` : ""} hit=${target.hit.hitTag}.${target.hit.hitClass}`)
        .join(", ");
      issues.push(`${label} blocked touch target(s): ${summary}`);
    }
    if (geometry.overlapIssues.length) {
      const summary = geometry.overlapIssues
        .slice(0, 5)
        .map((issue) => `${issue.firstLabel}/${issue.secondLabel}`)
        .join(", ");
      issues.push(`${label} overlapping HUD element(s): ${summary}`);
    }
    if (geometry.horizontalOverflow) issues.push(`${label} horizontal overflow`);
  }
  if (moralReviewSafetyDetails?.longTranscript?.layout?.hasTranscriptLine === false) {
    issues.push("long transcript review line missing");
  }
  if (moralReviewSafetyDetails?.longTranscript?.layout?.cardContained === false) {
    issues.push("long transcript review card outside viewport");
  }

  if (check.kind === "spirit-showcase") {
    details = { spiritShowcase: spiritShowcaseDetails };
    if (!spiritShowcaseDetails?.opened) issues.push("3D showcase QA hook did not open");
    if (!spiritShowcaseDetails?.modalVisible) issues.push("3D showcase modal not visible");
    if (spiritShowcaseDetails?.status === "loading") issues.push("3D showcase stayed loading");
    if (!spiritShowcaseDetails?.hasCanvas && !spiritShowcaseDetails?.hasFallback) issues.push("3D showcase has neither canvas nor fallback");
    if (!spiritShowcaseDetails?.hasCloseButton) issues.push("3D showcase close button missing");
    if ((spiritShowcaseDetails?.modelButtonCount ?? 0) < 3) issues.push("3D showcase model switches missing");
    if (spiritShowcaseDetails?.forbiddenCopy?.length) {
      issues.push(`3D showcase forbidden copy: ${spiritShowcaseDetails.forbiddenCopy.join(", ")}`);
    }
    if (spiritShowcaseDetails?.stageContained === false) issues.push("3D showcase stage outside viewport");
    if (spiritShowcaseDetails?.horizontalOverflow) issues.push("3D showcase horizontal overflow");
    if (spiritShowcaseDetails?.hasFallback) warnings.push("3D showcase used PNG fallback in this viewport");
  }

  if (check.module !== "home") {
    if (!p4SceneShell?.exists || !p4SceneShell.visible) issues.push("P4 scene command bar missing");
    if (!p4SceneShell?.hasSceneTitle) issues.push("P4 scene command title missing");
    if (!p4SceneShell?.hasCurrentChild) issues.push("P4 current child chip missing");
    if (!p4SceneShell?.hasEnergyChip) issues.push("P4 energy chip missing");
    if (!p4SceneShell?.hasRewardChip && common.viewport.width > 720) issues.push("P4 reward chip missing");
    if (!p4SceneShell?.hasHomeAction) issues.push("P4 scene home action missing");
    if (p4SceneShell?.plainWhite) issues.push("P4 scene command bar is plain white");
    if (p4SceneShell?.largeHeadings?.length) issues.push("P4 module still has oversized heading(s)");
    if (p4SceneShell?.longIntroParagraphs?.length) issues.push("P4 module still has long intro copy");
    if (p4SceneShell?.backendCopy?.length) issues.push(`P4 module still shows backend/generic copy: ${p4SceneShell.backendCopy.join(", ")}`);
  }

  if (check.kind === "teacher") {
    const cards = await inspectTeacherCards(page);
    const fps = await measureFrameRate(page, ".workbench-class-grid");
    details = { cards, fps };
    if (cards.badCards.length) issues.push(`${cards.badCards.length} visible student card layout issue(s)`);
    if (pngCount > 0) warnings.push(`teacher page requested ${pngCount} PNG asset(s)`);
    if (fps.fps < 45) warnings.push(`teacher scroll/frame sample is low: ${fps.fps} FPS`);
  }

  if (check.kind === "teacher-flow") {
    details = { flow: teacherFlowDetails };
    if (!teacherFlowDetails?.name) issues.push("teacher flow selected child missing");
    if (teacherFlowDetails?.quickDelta !== 10) issues.push("teacher flow +10 XP delta missing");
    if (!feedbackShowsDelta(teacherFlowDetails?.quickGlobalFeedback, 10)) {
      issues.push("teacher flow +10 global energy feedback missing");
    }
    if (!teacherFlowDetails?.staleAnalysisIgnored) issues.push("teacher flow stale shell analysis was not ignored after child switch");
    if (teacherFlowDetails?.scoringNoise?.cardQuickButtonCount !== 0) issues.push("teacher flow still exposes per-card quick score buttons");
    if (teacherFlowDetails?.scoringNoise?.drawerRewardButtonCount !== 3) issues.push("teacher flow drawer reward buttons missing");
    if (!teacherFlowDetails?.hasFeedbackTarget) issues.push("teacher flow latest feedback target missing");
    if (!teacherFlowDetails?.undoNamesTarget) issues.push("teacher flow undo target copy missing");
    const undo = teacherFlowDetails?.undoContract;
    if (
      !undo ||
      !undo.recordId ||
      !undo.originalUndone ||
      !undo.undoChildMatches ||
      undo.undoDelta !== -10 ||
      undo.undoSource !== "undo" ||
      undo.undoRole !== "teacher"
    ) {
      issues.push("teacher flow undo ledger contract missing");
    }
    if (!teacherFlowDetails?.deductRequiresConfirm) issues.push("teacher flow deduct action did not require confirmation");
    if (!teacherFlowDetails?.negativeAiBlocked) issues.push("teacher flow negative shell suggestion was not blocked");
    if (!teacherFlowDetails?.harborCopyUpdated) issues.push("teacher flow still shows old AI/admin workbench copy");
    if (!teacherFlowDetails?.hasQuickRecord) issues.push("teacher flow recent ledger record missing");
    if (!teacherFlowDetails?.hasAiRecord) issues.push("teacher flow shell confirmation ledger record missing");
    if (!teacherFlowDetails?.noAiLedgerBeforeConfirm) issues.push("shell suggestion entered ledger before teacher confirmation");
    if (!feedbackShowsDelta(teacherFlowDetails?.manualNegativeGlobalFeedback, -10)) {
      issues.push("teacher flow confirmed manual negative energy feedback missing");
    }
    if (!teacherFlowDetails?.positiveAiRecordCreated) issues.push("teacher flow positive shell record count mismatch");
    if (!feedbackShowsDelta(teacherFlowDetails?.aiGlobalFeedback, teacherFlowDetails?.aiDelta ?? 0)) {
      issues.push("teacher flow shell global energy feedback missing");
    }
    const quick = teacherFlowDetails?.quickLedgerContract;
    if (
      !quick ||
      !quick.childIdMatches ||
      quick.delta !== 10 ||
      quick.source !== "manual" ||
      quick.category !== "积极阳光" ||
      !quick.hasOperator ||
      quick.operatorRole !== "teacher" ||
      quick.aiSuggested !== false ||
      quick.reviewStatus !== "not_required"
    ) {
      issues.push("manual ledger contract fields missing");
    }
    const manualNegative = teacherFlowDetails?.manualNegativeLedgerContract;
    if (
      !manualNegative ||
      !manualNegative.childIdMatches ||
      manualNegative.delta !== -10 ||
      manualNegative.source !== "manual" ||
      manualNegative.category !== "尊矩守法" ||
      !manualNegative.hasOperator ||
      manualNegative.operatorRole !== "teacher" ||
      manualNegative.aiSuggested !== false ||
      manualNegative.reviewStatus !== "not_required"
    ) {
      issues.push("confirmed manual negative ledger contract fields missing");
    }
    const ai = teacherFlowDetails?.aiLedgerContract;
    if (
      !ai ||
      !ai.childIdMatches ||
      ai.delta === 0 ||
      ai.source !== "dialogue-agent" ||
      !ai.category ||
      !ai.hasOperator ||
      ai.operatorRole !== "teacher" ||
      ai.aiSuggested !== true ||
      ai.reviewStatus !== "approved"
    ) {
      issues.push("dialogue-agent ledger contract fields missing");
    }
    if (!teacherFlowDetails?.homeFocused) issues.push("teacher flow home focus did not sync selected child");
    if (!teacherFlowDetails?.homeHasRecord) issues.push("teacher flow home recent record missing");
  }

  if (check.kind === "moral-speak-flow") {
    details = { flow: moralFlowDetails };
    const expectedFlowSteps = ["我", "说", "等", "亮"];
    const hasExactFlowSteps = (flow) =>
      Array.isArray(flow?.flowStepLabels) &&
      flow.flowStepLabels.length === expectedFlowSteps.length &&
      flow.flowStepLabels.every((step, index) => step === expectedFlowSteps[index]);
    const isMobileSuccessAutoHandoff = (flow) =>
      common.viewport.width <= 720 &&
      flow?.growthFeedbackKind === "status" &&
      /下一位.*点精灵|孩子自己选择精灵/.test(flow.growthFeedbackText ?? "");
    const successAutoHandoff = isMobileSuccessAutoHandoff(moralFlowDetails?.success);
    const flowStates = [
      ["ready", moralFlowDetails?.ready],
      ["listening", moralFlowDetails?.listening],
      ["recognizing", moralFlowDetails?.recognizing],
      ["pending", moralFlowDetails?.pending],
      ["success", moralFlowDetails?.success],
    ];

    if (moralFlowDetails?.completedChildCount !== 3) issues.push("moral speak did not complete 3 children");
    if (moralFlowDetails?.uniqueChildCount !== 3) issues.push("moral speak did not cover 3 unique children");
    if (!moralFlowDetails?.islandHotspotEntry?.openedSelfService) {
      issues.push("moral speak island self-service hotspot did not enter ready stage");
    }
    if ((moralFlowDetails?.islandHotspotEntry?.after?.hotspotCount ?? 0) < 2) {
      issues.push("moral speak island self-service hotspots missing");
    }
    if (
      !["p15-growth-tree", "p16-growth-heart"].every((id) =>
        moralFlowDetails?.islandHotspotEntry?.after?.hotspots?.includes(id),
      )
    ) {
      issues.push("moral speak island growth hotspots are not wired");
    }
    if (moralFlowDetails?.dockSelfServiceEntryCount !== 3) issues.push("moral speak dock self-service did not ready all children");
    if (moralFlowDetails?.selfServiceEntryCount !== 3) issues.push("moral speak self-service entry did not ready all children");
    if (moralFlowDetails?.ready?.stage !== "ready") issues.push("moral speak did not enter ready stage");
    if (!hasExactFlowSteps(moralFlowDetails?.ready) || moralFlowDetails?.ready?.activeFlowStep !== "我") {
      issues.push("moral speak ready rhythm rail missing");
    }
    if (!moralFlowDetails?.ready?.micAriaLabel.includes("开始说成长")) {
      issues.push("moral speak ready mic missing accessible child action label");
    }
    if (moralFlowDetails?.ready?.micText.includes("说成长")) {
      issues.push("moral speak ready mic should be icon-only on screen");
    }
    if (moralFlowDetails?.listening?.stage !== "listening") issues.push("moral speak did not enter listening stage");
    if (!hasExactFlowSteps(moralFlowDetails?.listening) || moralFlowDetails?.listening?.activeFlowStep !== "说") {
      issues.push("moral speak listening rhythm step missing");
    }
    if (!moralFlowDetails?.listening?.listeningActionText.includes("说完点我")) {
      issues.push("moral speak listening action label missing");
    }
    if (moralFlowDetails?.listening?.hasTeacherCard) issues.push("moral speak showed teacher card during listening");
    if (moralFlowDetails?.listening?.selfServiceRecordCount !== moralFlowDetails?.ready?.selfServiceRecordCount) {
      issues.push("moral speak entered ledger during listening");
    }
    if (!moralFlowDetails?.listening?.wrongSelection?.guarded) {
      issues.push("moral speak listening allowed wrong-child selection");
    }
    if (!moralFlowDetails?.listening?.wrongMapSelection?.guarded) {
      issues.push("moral speak listening allowed wrong-child map selection");
    }
    if (moralFlowDetails?.recognizing?.stage !== "recognizing") issues.push("moral speak recognizing stage missing");
    if (!hasExactFlowSteps(moralFlowDetails?.recognizing) || moralFlowDetails?.recognizing?.activeFlowStep !== "等") {
      issues.push("moral speak recognizing rhythm step missing");
    }
    if (moralFlowDetails?.pending?.stage !== "pendingReview") issues.push("moral speak did not enter teacher review");
    if (!hasExactFlowSteps(moralFlowDetails?.pending) || moralFlowDetails?.pending?.activeFlowStep !== "等") {
      issues.push("moral speak teacher review rhythm step missing");
    }
    if (
      moralFlowDetails?.pending?.selfServiceRecordCount !== moralFlowDetails?.ready?.selfServiceRecordCount
    ) {
      issues.push("moral speak entered ledger before teacher confirmation");
    }
    if (
      (!moralFlowDetails?.pending?.teacherCardText.includes("等老师") &&
        !moralFlowDetails?.pending?.teacherCardText.includes("请老师帮忙")) ||
      !moralFlowDetails?.pending?.teacherCardText.includes("点亮") ||
      !moralFlowDetails?.pending?.teacherCardText.includes("修正")
    ) {
      issues.push("moral speak teacher card missing confirmation actions");
    }
    if (!moralFlowDetails?.pending?.hasTeacherStatus) issues.push("moral speak teacher card missing light status");
    if (!moralFlowDetails?.pending?.wrongSelection?.guarded) {
      issues.push("moral speak pending review allowed wrong-child selection");
    }
    if (!moralFlowDetails?.pending?.wrongMapSelection?.guarded) {
      issues.push("moral speak pending review allowed wrong-child map selection");
    }
    if (common.viewport.width > 720 && (moralFlowDetails?.pending?.teacherCardRect?.width ?? 999) > 380) {
      issues.push("moral speak teacher card too wide");
    }
    if (!moralFlowDetails?.pending?.teacherCardContained) issues.push("moral speak teacher card outside viewport");
    if (!moralFlowDetails?.pending?.childBubbleText || moralFlowDetails.pending.childBubbleText.length > 12) {
      issues.push("moral speak child bubble missing or too long");
    }
    if (moralFlowDetails?.success?.stage !== "success") issues.push("moral speak success stage missing");
    if (!successAutoHandoff && (!hasExactFlowSteps(moralFlowDetails?.success) || moralFlowDetails?.success?.activeFlowStep !== "亮")) {
      issues.push("moral speak success rhythm step missing");
    }
    for (const [stateName, flow] of flowStates) {
      if (flow?.forbiddenVisibleCopy?.length) {
        issues.push(`moral speak ${stateName} shows backend/review copy: ${flow.forbiddenVisibleCopy.join(", ")}`);
      }
      if (stateName === "success" && successAutoHandoff) continue;
      if (!flow?.turnChipVisible || !flow?.turnChipChildName) {
        issues.push(`moral speak ${stateName} missing visible child name`);
      }
      if (flow?.focusPlaqueVisible) {
        issues.push(`moral speak ${stateName} still shows duplicate map focus plaque`);
      }
      if ((stateName === "ready" || stateName === "listening" || stateName === "recognizing") && flow?.energyBoardVisible) {
        issues.push(`moral speak ${stateName} still shows duplicate energy board`);
      }
    }
    if (!successAutoHandoff && !moralFlowDetails?.success?.hasEnergySparks) issues.push("moral speak success energy sparks missing");
    if (moralFlowDetails?.success?.hasSuccessReward3dStage && !moralFlowDetails?.success?.successReward3dPassive) {
      issues.push("moral speak success reward 3d stage should not intercept input");
    }
    if (moralFlowDetails?.success?.hasSuccessReward3dStage && !moralFlowDetails?.success?.successReward3dContained) {
      issues.push("moral speak success reward 3d stage is outside viewport");
    }
    if (!successAutoHandoff && (!moralFlowDetails?.success?.successBubble || moralFlowDetails.success.successBubble.includes("自助成长"))) {
      issues.push("moral speak success bubble is missing or too verbose");
    }
    if (
      !successAutoHandoff &&
      (!moralFlowDetails?.success?.successBubble?.includes("能量") || !moralFlowDetails.success.successBubble.includes("精灵"))
    ) {
      issues.push("moral speak success bubble missing energy arrival copy");
    }
    if (!successAutoHandoff && !moralFlowDetails?.success?.successBubble?.includes("点亮")) {
      issues.push("moral speak success bubble missing lit energy copy");
    }
    if (/XP|[+＋]\d/.test(moralFlowDetails?.success?.successBubble ?? "")) {
      issues.push("moral speak success bubble still looks like score text");
    }
    if (/3D|正在准备|暂时不能|平面奖励|平面精灵/.test(moralFlowDetails?.success?.successBubble ?? "")) {
      issues.push("moral speak success bubble exposes technical 3d loading copy");
    }
    if (!successAutoHandoff && !moralFlowDetails?.success?.hasEnergyTrail) issues.push("moral speak success energy arrival trail missing");
    if (!moralFlowDetails?.success?.energyBoardText.includes("进精灵") && !moralFlowDetails?.success?.energyBoardText.includes("已点亮")) {
      issues.push("moral speak success did not update map energy board");
    }
    if (!moralFlowDetails?.success?.currentEnergySlots) issues.push("moral speak success did not mark current energy slot");
    if (!successAutoHandoff && !moralFlowDetails?.success?.hasEnergyArrivalSlot) issues.push("moral speak success did not mark energy arrival slot");
    if (!successAutoHandoff && !moralFlowDetails?.success?.currentEnergySlotText.includes("进精灵")) {
      issues.push("moral speak current energy slot missing arrival label");
    }
    if (/XP/i.test(moralFlowDetails?.success?.focusPlaqueText ?? "")) {
      issues.push("moral speak child-facing focus plaque still shows XP");
    }
    if (!successAutoHandoff && (moralFlowDetails?.success?.growthFeedbackKind || moralFlowDetails?.success?.growthFeedbackText)) {
      issues.push("moral speak success still shows duplicate global feedback");
    }
    if (
      moralFlowDetails?.success?.pixiSelectedActivityToken !== "能量" ||
      moralFlowDetails?.success?.pixiSelectedActivityLabel !== "进精灵"
    ) {
      issues.push("moral speak pixi activity bubble still looks like score record");
    }
    if (!moralFlowDetails?.success?.pixiEnergyRegionCount) issues.push("moral speak success did not light a pixi map region");
    if (!moralFlowDetails?.success?.pixiCurrentEnergyRegion) issues.push("moral speak success did not mark current pixi energy region");
    if (moralFlowDetails?.success?.hasTeacherCard) issues.push("moral speak teacher card did not close on success");
    if (!moralFlowDetails?.success?.wrongSelection?.guarded) {
      issues.push("moral speak success allowed wrong-child selection");
    }
    if (!moralFlowDetails?.success?.wrongMapSelection?.guarded) {
      issues.push("moral speak success allowed wrong-child map selection");
    }
    if (moralFlowDetails?.final?.stage !== "idle") issues.push("moral speak did not return to idle after confirmation");
    if (!moralFlowDetails?.final?.returnedToFullIsland) issues.push("moral speak did not return to full-island self-select state");
    if (moralFlowDetails?.final?.hasQueuedNextTurnUi) issues.push("moral speak still shows queued next-child UI");
    if (!feedbackShowsAction(moralFlowDetails?.final?.handoffFeedback, "status", /下一位.*点精灵|孩子自己选择精灵/)) {
      issues.push("moral speak handoff feedback missing after return to island");
    }
    if (!moralFlowDetails?.final?.singleLedgerWrite) issues.push("moral speak duplicate or missing ledger write");
    const ledger = moralFlowDetails?.final?.ledgerContract;
    if (
      !ledger ||
      !ledger.childIdMatches ||
      ledger.delta === 0 ||
      ledger.source !== "dialogue-agent" ||
      !ledger.category ||
      !ledger.hasOperator ||
      ledger.operatorRole !== "teacher" ||
      ledger.aiSuggested !== true ||
      ledger.reviewStatus !== "approved" ||
      !ledger.reason.startsWith("自助成长：")
    ) {
      issues.push("moral speak ledger contract fields missing");
    }

    for (const [index, childFlow] of (moralFlowDetails?.children ?? []).entries()) {
      if (childFlow.ready?.stage !== "ready") issues.push(`moral speak child ${index + 1} ready stage missing`);
      if (childFlow.listening?.stage !== "listening") issues.push(`moral speak child ${index + 1} listening stage missing`);
      if (!hasExactFlowSteps(childFlow.listening) || childFlow.listening?.activeFlowStep !== "说") {
        issues.push(`moral speak child ${index + 1} listening rhythm step missing`);
      }
      if (childFlow.listening?.selfServiceRecordCount !== childFlow.ready?.selfServiceRecordCount) {
        issues.push(`moral speak child ${index + 1} entered ledger during listening`);
      }
      if (!childFlow.listening?.wrongSelection?.guarded) {
        issues.push(`moral speak child ${index + 1} listening allowed wrong-child selection`);
      }
      if (!childFlow.listening?.wrongMapSelection?.guarded) {
        issues.push(`moral speak child ${index + 1} listening allowed wrong-child map selection`);
      }
      if (childFlow.pending?.stage !== "pendingReview") issues.push(`moral speak child ${index + 1} review stage missing`);
      for (const [stateName, flow] of [
        ["ready", childFlow.ready],
        ["listening", childFlow.listening],
        ["recognizing", childFlow.recognizing],
        ["pending", childFlow.pending],
        ["success", childFlow.success],
      ]) {
        if (flow?.forbiddenVisibleCopy?.length) {
          issues.push(`moral speak child ${index + 1} ${stateName} shows backend/review copy`);
        }
        if (stateName === "success" && isMobileSuccessAutoHandoff(flow)) continue;
        if (!flow?.turnChipVisible || !flow?.turnChipChildName) {
          issues.push(`moral speak child ${index + 1} ${stateName} missing visible child name`);
        }
      }
      if (childFlow.pending?.selfServiceRecordCount !== childFlow.ready?.selfServiceRecordCount) {
        issues.push(`moral speak child ${index + 1} entered ledger before confirmation`);
      }
      if (!childFlow.pending?.wrongSelection?.guarded) {
        issues.push(`moral speak child ${index + 1} pending allowed wrong-child selection`);
      }
      if (!childFlow.pending?.wrongMapSelection?.guarded) {
        issues.push(`moral speak child ${index + 1} pending allowed wrong-child map selection`);
      }
      if (childFlow.success?.stage !== "success") issues.push(`moral speak child ${index + 1} success stage missing`);
      if (childFlow.success?.hasTeacherCard) issues.push(`moral speak child ${index + 1} teacher card stayed open`);
      if (!childFlow.success?.wrongSelection?.guarded) {
        issues.push(`moral speak child ${index + 1} success allowed wrong-child selection`);
      }
      if (!childFlow.success?.wrongMapSelection?.guarded) {
        issues.push(`moral speak child ${index + 1} success allowed wrong-child map selection`);
      }
      if (childFlow.final?.stage !== "idle") issues.push(`moral speak child ${index + 1} did not return idle`);
      if (!childFlow.final?.returnedToFullIsland) issues.push(`moral speak child ${index + 1} did not return to self-select island`);
      if (!childFlow.final?.singleLedgerWrite) issues.push(`moral speak child ${index + 1} ledger write count mismatch`);
      if (!feedbackShowsAction(childFlow.final?.handoffFeedback, "status", /下一位.*点精灵|孩子自己选择精灵/)) {
        issues.push(`moral speak child ${index + 1} handoff feedback missing`);
      }
      const childLedger = childFlow.final?.ledgerContract;
      if (
        !childLedger ||
        !childLedger.childIdMatches ||
        childLedger.delta === 0 ||
        childLedger.source !== "dialogue-agent" ||
        !childLedger.category ||
        !childLedger.hasOperator ||
        childLedger.operatorRole !== "teacher" ||
        childLedger.aiSuggested !== true ||
        childLedger.reviewStatus !== "approved" ||
        !childLedger.reason.startsWith("自助成长：")
      ) {
        issues.push(`moral speak child ${index + 1} ledger contract fields missing`);
      }
    }
  }

  if (check.kind === "classroom-loop") {
    details = { flow: classroomLoopDetails };
    if (classroomLoopDetails?.completedChildCount !== 10) issues.push("classroom loop did not complete 10 children");
    if (classroomLoopDetails?.uniqueChildCount !== 10) issues.push("classroom loop did not cover 10 unique children");
    if (!classroomLoopDetails?.islandHotspotEntry?.openedSelfService) {
      issues.push("classroom loop island self-service hotspot did not enter ready stage");
    }
    if ((classroomLoopDetails?.islandHotspotEntry?.after?.hotspotCount ?? 0) < 2) {
      issues.push("classroom loop island self-service hotspots missing");
    }
    if (classroomLoopDetails?.dockSelfServiceEntryCount !== 10) issues.push("classroom loop dock self-service did not enter ready for all children");
    if (classroomLoopDetails?.selfServiceEntryCount !== 10) issues.push("classroom loop did not enter self-service for all children");
    for (const [index, childFlow] of (classroomLoopDetails?.children ?? []).entries()) {
      if (childFlow.ready?.stage !== "ready") issues.push(`classroom loop child ${index + 1} ready stage missing`);
      if (childFlow.listening?.stage !== "listening") issues.push(`classroom loop child ${index + 1} listening stage missing`);
      if (childFlow.pending?.stage !== "pendingReview") issues.push(`classroom loop child ${index + 1} pending review missing`);
      if (childFlow.success?.stage !== "success") issues.push(`classroom loop child ${index + 1} success stage missing`);
      for (const [stateName, flow] of [
        ["ready", childFlow.ready],
        ["listening", childFlow.listening],
        ["pending", childFlow.pending],
        ["success", childFlow.success],
      ]) {
        if (!flow?.turnChipVisible || !flow?.turnChipChildName) {
          issues.push(`classroom loop child ${index + 1} ${stateName} missing visible child name`);
        }
      }
      if (childFlow.final?.stage !== "idle") issues.push(`classroom loop child ${index + 1} did not return idle`);
      if (!childFlow.final?.returnedToFullIsland) issues.push(`classroom loop child ${index + 1} did not return full island`);
      if (childFlow.final?.hasQueuedNextTurnUi) issues.push(`classroom loop child ${index + 1} showed queued next-child UI`);
      if (!childFlow.final?.singleLedgerWrite) issues.push(`classroom loop child ${index + 1} ledger write count mismatch`);
      if (!childFlow.listening?.wrongSelection?.guarded) {
        issues.push(`classroom loop child ${index + 1} listening allowed wrong-child selection`);
      }
      if (!childFlow.listening?.wrongMapSelection?.guarded) {
        issues.push(`classroom loop child ${index + 1} listening allowed wrong-child map selection`);
      }
      if (!childFlow.pending?.wrongSelection?.guarded) {
        issues.push(`classroom loop child ${index + 1} pending allowed wrong-child selection`);
      }
      if (!childFlow.pending?.wrongMapSelection?.guarded) {
        issues.push(`classroom loop child ${index + 1} pending allowed wrong-child map selection`);
      }
      if (!childFlow.success?.wrongSelection?.guarded) {
        issues.push(`classroom loop child ${index + 1} success allowed wrong-child selection`);
      }
      if (!childFlow.success?.wrongMapSelection?.guarded) {
        issues.push(`classroom loop child ${index + 1} success allowed wrong-child map selection`);
      }
      if (!feedbackShowsAction(childFlow.final?.handoffFeedback, "status", /下一位.*点精灵|孩子自己选择精灵/)) {
        issues.push(`classroom loop child ${index + 1} handoff feedback missing`);
      }
    }
  }

  if (check.kind === "moral-review-safety") {
    details = { flow: moralReviewSafetyDetails };
    const readyRescue = moralReviewSafetyDetails?.readyRescue;
    if (!readyRescue?.started) issues.push("ready rescue did not start through QA hook");
    if (readyRescue?.pending?.stage !== "ready") issues.push("ready rescue did not enter ready stage");
    if (!readyRescue?.pending?.hasSafeExitAction || !readyRescue?.pending?.safeExitText.includes("取消")) {
      issues.push("ready stage missing visible cancel rescue action");
    }
    if (readyRescue?.afterExit?.stage !== "idle" || readyRescue?.afterExit?.hasOverlay || readyRescue?.afterExit?.hasTeacherCard) {
      issues.push("ready cancel did not return to stable idle state");
    }

    const recognizingRescue = moralReviewSafetyDetails?.recognizingRescue;
    if (!recognizingRescue?.started) issues.push("recognizing rescue did not start through QA hook");
    if (recognizingRescue?.pending?.stage !== "recognizing") issues.push("recognizing rescue did not enter recognizing stage");
    if (!recognizingRescue?.pending?.hasSafeExitAction || !recognizingRescue?.pending?.safeExitText.includes("取消")) {
      issues.push("recognizing stage missing visible cancel action");
    }
    if (
      recognizingRescue?.afterExit?.stage !== "idle" ||
      recognizingRescue?.afterExit?.hasOverlay ||
      recognizingRescue?.afterExit?.hasTeacherCard
    ) {
      issues.push("recognizing cancel did not return to stable idle state");
    }

    const listeningCancel = moralReviewSafetyDetails?.listeningCancel;
    if (!listeningCancel?.started) issues.push("listening cancel did not start through QA hook");
    if (listeningCancel?.pending?.stage !== "listening") issues.push("listening cancel did not enter listening stage");
    if (!listeningCancel?.pending?.hasSafeExitAction || !listeningCancel?.pending?.safeExitText.includes("取消")) {
      issues.push("listening stage missing visible cancel action");
    }
    if (
      listeningCancel?.afterExit?.stage !== "idle" ||
      listeningCancel?.afterExit?.hasOverlay ||
      listeningCancel?.afterExit?.hasTeacherCard
    ) {
      issues.push("listening cancel did not return to stable idle state");
    }

    const asyncCancel = moralReviewSafetyDetails?.asyncCancel;
    if (!asyncCancel?.prepared || !asyncCancel?.recognizing || !asyncCancel?.finishScheduled) {
      issues.push("async cancel regression did not schedule delayed moral finish");
    }
    if (asyncCancel?.afterExit?.stage !== "idle" || asyncCancel?.afterExit?.hasOverlay || asyncCancel?.afterExit?.hasTeacherCard) {
      issues.push("delayed moral finish reopened UI after cancellation");
    }
    if (
      (asyncCancel?.persistence?.pendingMatchingReviewCount ?? 0) !== 0 ||
      (asyncCancel?.persistence?.matchingSelfServiceCount ?? 0) !== 0
    ) {
      issues.push("delayed moral finish created a dirty review or ledger after cancellation");
    }

    const micFailure = moralReviewSafetyDetails?.micFailure;
    if (!micFailure?.started) issues.push("mic failure rescue did not start through QA hook");
    if (micFailure?.error?.stage !== "error") issues.push("forced microphone failure did not enter error state");
    if (!micFailure?.error?.hasSafeExitAction || !micFailure?.error?.safeExitText.includes("稍后")) {
      issues.push("microphone failure missing safe exit action");
    }
    if (/NotAllowed|Error|undefined|null|麦克风.*error/i.test(micFailure?.error?.childBubbleText ?? "")) {
      issues.push("microphone failure leaked technical error copy");
    }
    if (micFailure?.afterRetry?.stage !== "ready" || !micFailure?.afterRetry?.hasSafeExitAction) {
      issues.push("microphone failure retry did not return to ready");
    }
    if (micFailure?.afterExit?.stage !== "idle" || micFailure?.afterExit?.hasOverlay || micFailure?.afterExit?.hasTeacherCard) {
      issues.push("microphone failure safe exit did not return idle");
    }

    const deferred = moralReviewSafetyDetails?.deferredReview;
    if (!deferred?.start?.started) issues.push("defer review did not start through QA hook");
    if (deferred?.pending?.stage !== "pendingReview") issues.push("defer review did not enter pending stage");
    if (!deferred?.pending?.hasDeferAction || !deferred?.pending?.deferText.includes("稍后")) {
      issues.push("teacher card missing defer action");
    }
    if (
      deferred?.afterDefer?.stage !== "idle" ||
      deferred?.afterDefer?.hasTeacherCard ||
      (deferred?.afterDefer?.pendingMatchingReviewCount ?? 0) !== 1 ||
      deferred?.afterDefer?.latestReviewStatus !== "pending_review" ||
      (deferred?.start?.before?.matchingSelfServiceCount ?? -1) !== deferred?.afterDefer?.matchingSelfServiceCount
    ) {
      issues.push("defer action did not preserve pending review while returning idle");
    }

    const moduleSwitch = moralReviewSafetyDetails?.moduleSwitch;
    if (!moduleSwitch?.changed) issues.push("module switch QA hook missing");
    if (moduleSwitch?.pending?.stage !== "pendingReview") issues.push("module switch review did not enter pending stage");
    if (
      moduleSwitch?.afterSwitch?.runtime?.stage !== "idle" ||
      moduleSwitch?.afterSwitch?.runtime?.hasOverlay ||
      moduleSwitch?.afterSwitch?.runtime?.hasTeacherCard ||
      !moduleSwitch?.afterSwitch?.runtime?.sceneText.includes("抽取")
    ) {
      issues.push("module switch did not clear active moral speak UI");
    }
    if (
      (moduleSwitch?.afterSwitch?.pendingMatchingReviewCount ?? 0) !== 1 ||
      moduleSwitch?.afterSwitch?.latestReviewStatus !== "pending_review"
    ) {
      issues.push("module switch dropped or resolved the pending review instead of deferring it");
    }

    const refresh = moralReviewSafetyDetails?.refresh;
    if (!refresh?.start?.started) issues.push("refresh review did not start through QA hook");
    if (refresh?.pending?.stage !== "pendingReview") issues.push("refresh review did not enter pending stage");
    if (refresh?.afterReload?.stage !== "idle" || refresh?.afterReload?.hasOverlay || refresh?.afterReload?.hasTeacherCard) {
      issues.push("refresh left moral speak UI half locked");
    }
    if (
      (refresh?.persistence?.pendingMatchingReviewCount ?? 0) !== 1 ||
      refresh?.persistence?.latestReviewStatus !== "pending_review" ||
      (refresh?.persistence?.matchingSelfServiceCount ?? 0) !== refresh?.start?.before?.matchingSelfServiceCount
    ) {
      issues.push("refresh did not preserve pending review without ledger write");
    }

    const low = moralReviewSafetyDetails?.lowConfidence;
    if (!low?.start?.started) issues.push("low-confidence review did not start through QA hook");
    if (low?.pending?.stage !== "pendingReview") issues.push("low-confidence review did not enter pending stage");
    if (low?.pending?.result?.delta !== 0) issues.push("low-confidence review should not suggest XP");
    if (low?.pending?.hasApproveAction) issues.push("low-confidence review should route through adjust before approval");
    if (low?.pending?.childBubbleText !== "请老师帮忙") issues.push("low-confidence child bubble should only ask teacher for help");
    if (low?.pending?.turnChipStatusText !== "请老师帮忙") issues.push("low-confidence turn chip should ask teacher for help");
    if (/XP|[+＋-]\d|%|嗯嗯|未分类|待判断/.test(low?.pending?.childBubbleText ?? "")) {
      issues.push("low-confidence child bubble leaked review details");
    }
    if (!low?.pending?.teacherMainText?.includes("请老师帮忙")) issues.push("low-confidence teacher card main state not neutral");
    if (!low?.pending?.adjustText?.includes("修正")) issues.push("low-confidence teacher adjust action missing");
    if (!low?.pending?.hasDeferAction) issues.push("low-confidence teacher card missing defer action");
    if (!low?.pending?.hasRespeakAction) issues.push("low-confidence teacher card missing respeak action");
    if (!low?.pending?.hasSkipAction) issues.push("low-confidence teacher card missing skip action");
    if (low?.pending?.actionLayout?.some((action) => action.clipped)) issues.push("low-confidence teacher action text clipped");
    if (low?.afterAdjust?.actionLayout?.some((action) => action.text.includes("点亮") && low.afterAdjust.actionLayout.some((other) => other !== action && other.row === action.row))) {
      issues.push("adjusted low-confidence approve action did not occupy its own row");
    }
    if (low?.afterAdjust?.approveDisabled) issues.push("low-confidence adjusted review approve button stayed disabled");
    if (low?.afterAdjust?.turnChipStatusText !== "等老师") issues.push("low-confidence adjusted turn chip should wait for teacher");
    if ((low?.afterAdjust?.result?.confidence ?? 0) < 0.6) issues.push("low-confidence adjusted review did not reach teacher approval threshold");
    if (low?.afterAdjust?.result?.category !== "开拓创新") issues.push("low-confidence correction did not keep selected category");
    if (/%|45|未分类|待判断/.test(low?.pending?.publicCardText ?? "")) {
      issues.push("low-confidence teacher card leaked confidence or model state on home");
    }
    if (
      low?.pending?.currentEnergySlots !== 0 ||
      low?.pending?.energyBoardStateText !== "需帮助" ||
      low?.pending?.energyBoardValueText !== "请老师帮忙"
    ) {
      issues.push("low-confidence home energy board leaked category state");
    }
    if (!low?.ledgerUnchanged) issues.push("low-confidence review entered ledger without teacher decision");
    if (low?.afterRespeak?.stage !== "ready") issues.push("low-confidence respeak did not return current child to ready");
    if (low?.afterRespeak?.childId !== low?.childId) issues.push("low-confidence respeak changed selected child");
    if ((low?.afterRespeak?.pendingMatchingReviewCount ?? 1) !== 0) issues.push("low-confidence respeak left review pending");
    if (low?.afterRespeak?.latestReviewStatus !== "rejected") issues.push("low-confidence respeak did not reject the pending review");
    if (low?.afterRespeak?.latestReviewRejectionReason !== "补说") issues.push("low-confidence respeak rejection reason missing");
    if (low?.afterSkip?.stage !== "idle") issues.push("low-confidence skip did not return idle");
    if (low?.afterSkip?.childId !== low?.childId) issues.push("low-confidence skip changed selected child");
    if (low?.afterSkip?.hasQueuedNextTurnUi) issues.push("low-confidence skip still shows queued next-child UI");
    if ((low?.afterSkip?.pendingMatchingReviewCount ?? 1) !== 0) issues.push("low-confidence skip left review pending");
    if (low?.afterSkip?.latestReviewStatus !== "rejected") issues.push("low-confidence skip did not reject the pending review");
    if (low?.afterSkip?.latestReviewRejectionReason !== "跳过这位") issues.push("low-confidence skip rejection reason missing");

    const negative = moralReviewSafetyDetails?.negative;
    if (!negative?.start?.started) issues.push("negative review did not start through QA hook");
    if (negative?.pending?.stage !== "pendingReview") issues.push("negative review did not enter pending stage");
    if (negative?.pending?.result?.delta >= 0) issues.push("negative review should be detected as a negative suggestion");
    if (negative?.pending?.hasApproveAction) issues.push("negative review should route through adjust before approval");
    if (negative?.pending?.childBubbleText !== "请老师帮忙") issues.push("negative child bubble should only ask teacher for help");
    if (negative?.pending?.turnChipStatusText !== "请老师帮忙") issues.push("negative turn chip should ask teacher for help");
    if (/XP|[+＋-]\d|%|推了同学|扣|友爱|规则/.test(negative?.pending?.childBubbleText ?? "")) {
      issues.push("negative child bubble leaked label or score details");
    }
    if (!negative?.pending?.teacherMainText?.includes("需老师处理")) issues.push("negative teacher card main state did not ask for handling");
    if (/[+＋-]\d/.test(negative?.pending?.teacherMainText ?? "")) issues.push("negative teacher card main state leaked score text");
    if (!negative?.pending?.adjustText?.includes("修正")) issues.push("negative teacher adjust action missing");
    if (!negative?.pending?.hasDeferAction) issues.push("negative teacher card missing defer action");
    if (!negative?.pending?.hasRespeakAction) issues.push("negative teacher card missing respeak action");
    if (!negative?.pending?.hasSkipAction) issues.push("negative teacher card missing skip action");
    if (negative?.pending?.actionLayout?.some((action) => action.clipped)) issues.push("negative teacher action text clipped");
    if (negative?.afterAdjust?.actionLayout?.some((action) => action.text.includes("点亮") && negative.afterAdjust.actionLayout.some((other) => other !== action && other.row === action.row))) {
      issues.push("adjusted negative approve action did not occupy its own row");
    }
    if (/%|80|友爱|规则|[+＋-]\d/.test(negative?.pending?.publicCardText ?? "")) {
      issues.push("negative teacher card leaked label or score details on home");
    }
    if (
      negative?.pending?.currentEnergySlots !== 0 ||
      negative?.pending?.energyBoardStateText !== "需帮助" ||
      negative?.pending?.energyBoardValueText !== "请老师帮忙"
    ) {
      issues.push("negative home energy board leaked category state");
    }
    if (!negative?.noDirectLedger) issues.push("negative review entered ledger before adjustment");
    if (!negative?.afterAdjust?.result?.delta || negative.afterAdjust.result.delta <= 0) {
      issues.push("negative review adjustment did not set a positive teacher decision");
    }
    if (negative?.afterAdjust?.approveDisabled) issues.push("adjusted review approve button stayed disabled");
    if (negative?.afterAdjust?.turnChipStatusText !== "等老师") issues.push("negative adjusted turn chip should wait for teacher");
    if (negative?.afterAdjust?.result?.category !== "开拓创新") issues.push("negative correction did not keep selected category");
    if (!negative?.final?.hasPositiveLedger) issues.push("adjusted review did not create an approved positive ledger record");
    if (negative?.final?.latestPositiveCategory !== "开拓创新") issues.push("adjusted review ledger used the wrong category");
    if (negative?.final?.stage !== "idle") issues.push("adjusted review did not return idle after approval");
    if (!negative?.noNegativeLedger) issues.push("negative AI suggestion created a negative ledger record");
  }

  if (check.kind === "moral-review-online-stale") {
    details = { flow: moralReviewOnlineStaleDetails };
    const flow = moralReviewOnlineStaleDetails;
    if (!flow?.recognizing) issues.push("online stale review did not enter recognizing state");
    if (!flow?.finishStarted) issues.push("online stale review did not start finish callback");
    if ((flow?.evaluateRequestCount ?? 0) !== 1) issues.push("online stale review did not issue exactly one evaluate request");
    if (flow?.duringRequest?.syncStatus !== "saving") issues.push("online stale review did not reach saving while request was in flight");
    if (flow?.afterExit?.stage !== "idle" || flow?.afterExit?.hasOverlay || flow?.afterExit?.hasTeacherCard) {
      issues.push("online stale response reopened moral speak UI after cancellation");
    }
    if (flow?.afterExit?.syncStatus === "saving") issues.push("online stale response left sync status stuck at saving");
    if ((flow?.afterPersistence?.pendingMatchingReviewCount ?? 0) !== 0) {
      issues.push("online stale response left a pending review after cancellation");
    }
    if ((flow?.afterPersistence?.matchingSelfServiceCount ?? 0) !== (flow?.before?.matchingSelfServiceCount ?? 0)) {
      issues.push("online stale response wrote a self-service ledger after cancellation");
    }

    const approvalLock = flow?.approvalLock;
    if (!approvalLock?.started?.recognizing || !approvalLock?.started?.finishStarted) {
      issues.push("approval lock review did not start through the online QA hooks");
    }
    if ((approvalLock?.ledgerRequestCount ?? 0) !== 1) issues.push("approval lock did not issue exactly one ledger request");
    if (approvalLock?.beforeApprove?.adjustSelectDisabled !== false) {
      issues.push("approval lock setup did not expose an enabled correction select before approval");
    }
    if (
      approvalLock?.duringApprove?.approveDisabled !== true ||
      approvalLock?.duringApprove?.deferDisabled !== true ||
      approvalLock?.duringApprove?.respeakDisabled !== true ||
      approvalLock?.duringApprove?.skipDisabled !== true ||
      approvalLock?.duringApprove?.adjustDisabled !== true ||
      approvalLock?.duringApprove?.adjustSelectDisabled !== true
    ) {
      issues.push("approval lock did not disable all teacher review actions while ledger commit was in flight");
    }
    if (approvalLock?.afterApprove?.syncStatus === "saving") issues.push("approval lock left sync status stuck at saving");
    if (approvalLock?.afterApprove?.stage !== "success") issues.push("approval lock did not settle into success after ledger commit");
    if (
      (approvalLock?.afterPersistence?.matchingSelfServiceCount ?? 0) !==
      (approvalLock?.beforeApprove?.matchingSelfServiceCount ?? 0) + 1
    ) {
      issues.push("approval lock did not create exactly one approved self-service ledger after release");
    }
    if ((approvalLock?.beforeApprove?.pendingMatchingReviewCount ?? 0) < 1) {
      issues.push("approval lock setup did not create a pending server review before approval");
    }
    if (
      (approvalLock?.afterPersistence?.pendingMatchingReviewCount ?? 0) !==
      Math.max(0, (approvalLock?.beforeApprove?.pendingMatchingReviewCount ?? 0) - 1)
    ) {
      issues.push("approval lock did not resolve the pending review after ledger commit");
    }
    if (approvalLock?.afterPersistence?.latestReviewStatus !== "approved") {
      issues.push("approval lock latest review status was not approved after ledger commit");
    }
  }

  if (check.kind === "voice-flow") {
    details = { flow: voiceFlowDetails };
    if (!voiceFlowDetails?.name) issues.push("voice flow selected child missing");
    if (!voiceFlowDetails?.hasSuggestion) issues.push("voice flow suggestion result missing");
    if (voiceFlowDetails?.delta !== voiceFlowDetails?.aiDelta || voiceFlowDetails?.aiDelta === 0) {
      issues.push("voice flow confirmed XP delta missing");
    }
    if (!voiceFlowDetails?.hasHistoryRecord) issues.push("voice flow ledger history missing");
    if (!voiceFlowDetails?.sceneCopyUpdated) issues.push("voice flow still shows text/AI workbench copy");
    if (!voiceFlowDetails?.teacherDrawerCopyUpdated) issues.push("teacher tool drawer still shows admin labels");
    if (!voiceFlowDetails?.noAiLedgerBeforeConfirm) issues.push("voice flow entered ledger before teacher confirmation");
    if (!voiceFlowDetails?.noLedgerOnReject) issues.push("voice flow rejection created a ledger record");
    if (!feedbackShowsDelta(voiceFlowDetails?.confirmGlobalFeedback, voiceFlowDetails?.aiDelta ?? 0)) {
      issues.push("voice flow global energy feedback missing");
    }
    if (!voiceFlowDetails?.confirmFeedbackCopyUpdated) issues.push("voice flow confirm feedback still shows AI copy");
    if (!voiceFlowDetails?.rejectFeedbackCopyUpdated) issues.push("voice flow reject feedback still shows AI copy");
    const ledger = voiceFlowDetails?.ledgerContract;
    if (
      !ledger ||
      !ledger.childIdMatches ||
      ledger.delta === 0 ||
      ledger.source !== "dialogue-agent" ||
      !ledger.category ||
      !ledger.hasOperator ||
      ledger.operatorRole !== "teacher" ||
      ledger.aiSuggested !== true ||
      ledger.reviewStatus !== "approved"
    ) {
      issues.push("voice flow ledger contract fields missing");
    }
    if (!voiceFlowDetails?.homeFocused) issues.push("voice flow home focus did not sync selected child");
    if (!voiceFlowDetails?.homeHasRecord) issues.push("voice flow home recent record missing");
  }

  if (check.kind === "voice-mobile") {
    details = { mobileVoice: mobileVoiceDetails };
    if (!mobileVoiceDetails?.hasSceneTitle) issues.push("mobile voice scene title missing");
    if (!mobileVoiceDetails?.hasResultPanel) issues.push("mobile voice result panel missing");
    if (!mobileVoiceDetails?.hasHistoryPanel) issues.push("mobile voice history panel missing");
    if (!mobileVoiceDetails?.hasPrimaryAction) issues.push("mobile voice primary action missing");
    if (!mobileVoiceDetails?.noPanelOverlap) issues.push("mobile voice panels overlap");
    if (mobileVoiceDetails?.horizontalOverflow) issues.push("mobile voice horizontal overflow");
    if (mobileVoiceDetails?.forbiddenCopy?.length) {
      issues.push(`mobile voice still shows old copy: ${mobileVoiceDetails.forbiddenCopy.join(", ")}`);
    }
  }

  if (check.kind === "math-flow") {
    details = { flow: mathFlowDetails };
    if (!mathFlowDetails?.playerName) issues.push("math flow player missing");
    if (!mathFlowDetails?.questionSeen) issues.push("math flow question missing");
    if (!mathFlowDetails?.energyTrackSeen) issues.push("math flow energy track state missing");
    if (!mathFlowDetails?.completionLogSeen) issues.push("math light-up completion log missing or combat copy visible");
    if (!mathFlowDetails?.lightFeel?.hasTurnBanner) issues.push("math light-up turn banner missing");
    if (!mathFlowDetails?.lightFeel?.hasActionVfx) issues.push("math light-up action VFX missing");
    if (!mathFlowDetails?.lightFeel?.hasLightPop) issues.push("math light-up feedback pop missing");
    if (!mathFlowDetails?.lightFeel?.hasGlowingPartner) issues.push("math light-up partner glow missing");
    if (!mathFlowDetails?.lightFeel?.hasCompleteMedal || !mathFlowDetails?.lightFeel?.hasCompleteClass) {
      issues.push("math light-up completion celebration missing");
    }
    if ((mathFlowDetails?.lightFeel?.skillShellCount ?? 0) !== 4) issues.push("math answer shells missing");
    if ((mathFlowDetails?.lightFeel?.skillShellStateCount ?? 0) !== 4) issues.push("math answer shell states missing");
    if ((mathFlowDetails?.lightFeel?.skillShellLitCount ?? 0) < 1) issues.push("math answer shell lit state missing");
    if (!mathFlowDetails?.lightFeel?.skillShellLabelSeen) issues.push("math answer shell label missing");
    if ((mathFlowDetails?.lightFeel?.lightTrackCount ?? 0) !== 2) issues.push("math light tracks missing");
    if (!["lit", "try", "complete"].includes(mathFlowDetails?.lightFeel?.lightLogCue ?? "")) issues.push("math light log cue missing");
    if (mathFlowDetails?.lightFeel?.forbiddenCopy?.length) {
      issues.push(`math light-up still shows combat copy: ${mathFlowDetails.lightFeel.forbiddenCopy.join(", ")}`);
    }
    if (!feedbackShowsDelta(mathFlowDetails?.winGlobalFeedback, 30)) {
      issues.push("math flow win global energy feedback missing");
    }
    const ledger = mathFlowDetails?.ledgerContract;
    if (
      !ledger ||
      !ledger.childIdMatches ||
      ledger.delta !== 30 ||
      ledger.source !== "math-pk" ||
      ledger.category !== "积极阳光" ||
      !ledger.hasOperator ||
      ledger.operatorRole !== "system" ||
      ledger.aiSuggested !== false ||
      ledger.reviewStatus !== "not_required"
    ) {
      issues.push("math flow ledger contract fields missing");
    }
    if (!mathFlowDetails?.homeFocused) issues.push("math flow home focus did not sync completed child");
    if (!mathFlowDetails?.homeHasRecord) issues.push("math flow home recent record missing");
  }

  if (check.kind === "profile-flow") {
    details = { flow: profileFlowDetails };
    if (!profileFlowDetails?.name) issues.push("profile flow selected child missing");
    if (!profileFlowDetails?.homeHadSelectedChild) issues.push("profile flow home did not retain selected child");
    for (const [source, profile] of [
      ["workbench", profileFlowDetails?.fromWorkbench],
      ["home", profileFlowDetails?.fromHome],
    ]) {
      if (!profile?.selectedChildId) issues.push(`profile flow ${source} selected child id missing`);
      if (!profile?.hasCabinScene) issues.push(`profile flow ${source} cabin scene missing`);
      if (!profile?.hasRoomLabels) issues.push(`profile flow ${source} room labels missing`);
      if (!profile?.heroHasEnergyCopy) issues.push(`profile flow ${source} energy copy mismatch`);
      if (!profile?.hasSpirit) issues.push(`profile flow ${source} spirit missing`);
      if (!profile?.hasUnique2dSpirit) issues.push(`profile flow ${source} unique 2d spirit missing`);
      if (!profile?.hasCabinAtmosphere3dStage) issues.push(`profile flow ${source} cabin atmosphere 3d prop missing`);
      if (!profile?.hasCabinAtmosphere3dSurface) issues.push(`profile flow ${source} cabin atmosphere 3d surface missing`);
      if (!profile?.cabinAtmosphere3dPassive) issues.push(`profile flow ${source} cabin atmosphere 3d should not intercept input`);
      if (!profile?.hasCabinRoomModelProps) issues.push(`profile flow ${source} cabin model room props missing`);
      if (!profile?.hasCabinMoralStart) issues.push(`profile flow ${source} cabin moral speak entry missing`);
      if (!profile?.cabinMoralStartInStage) issues.push(`profile flow ${source} cabin moral speak entry outside stage`);
      if (!profile?.hasCabinStage) issues.push(`profile flow ${source} cabin stage missing`);
      if (!profile?.storyPanelNotWhiteWorkbench) issues.push(`profile flow ${source} still reads as white workbench`);
      if (!profile?.pageHasCoastalScene) issues.push(`profile flow ${source} coastal scene background missing`);
      if (profileFlowDetails?.xpAfter > profileFlowDetails?.xpBefore && !profile?.hasTimelineRecord) {
        issues.push(`profile flow ${source} timeline record missing`);
      }
      if (profileFlowDetails?.xpAfter <= profileFlowDetails?.xpBefore && !profile?.hasAnyTimelineRecord) {
        issues.push(`profile flow ${source} timeline record missing`);
      }
      if (!profile?.timelineCompact) issues.push(`profile flow ${source} timeline rows are too tall`);
      if (!profile?.timelineRowsNotPlainWhite) issues.push(`profile flow ${source} timeline rows are plain white`);
      if (!profile?.cabinDominatesRoster) issues.push(`profile flow ${source} cabin does not dominate roster`);
      if (!profile?.evidenceHasRecordCount) issues.push(`profile flow ${source} evidence record count mismatch`);
      if (!profile?.evidenceHasPositiveEnergy) issues.push(`profile flow ${source} positive energy mismatch`);
      if (!profile?.hasDimensionStats) issues.push(`profile flow ${source} dimension stats missing`);
      if (profile?.horizontalOverflow) issues.push(`profile flow ${source} horizontal overflow`);
      if (profile?.forbiddenCopy?.length) issues.push(`profile flow ${source} still shows old copy: ${profile.forbiddenCopy.join(", ")}`);
    }
    if (!profileFlowDetails?.moralReady?.ok) {
      issues.push(`profile flow cabin moral ready state failed: ${profileFlowDetails?.moralReady?.reason ?? profileFlowDetails?.moralReady?.stage ?? "unknown"}`);
    }
    if (!profileFlowDetails?.moralSelectionGuard?.ok) {
      issues.push("profile flow active moral speak was hidden by roster selection");
    }
    if (
      profileFlowDetails?.fromWorkbench?.selectedChildId &&
      profileFlowDetails?.fromHome?.selectedChildId &&
      profileFlowDetails.fromWorkbench.selectedChildId !== profileFlowDetails.fromHome.selectedChildId
    ) {
      issues.push("profile flow home entry opened a different child");
    }
  }

  if (check.kind === "home") {
    const homeResult = await assertHomeMainScreen(page, resources, resourceSummary);
    details = homeResult.details;
    issues.push(...homeResult.issues);
    warnings.push(...homeResult.warnings);
  }

  if (check.kind === "home-performance-soak") {
    const homeSoakResult = assertHomePerformanceSoak(performanceSoakDetails);
    details = homeSoakResult.details;
    issues.push(...homeSoakResult.issues);
    warnings.push(...homeSoakResult.warnings);
  }

  if (check.kind === "home-fallback-return") {
    details = { fallback: teacherFallbackReturnDetails };
    const assertHomeFallbackClosed = (label, state) => {
      if (!state?.hasSelectedChild) issues.push(`${label} selected child is not visible`);
      if (!state?.hasSelfServiceDock) issues.push(`${label} self-service dock entry missing`);
      if (!state?.shellDock?.rect) issues.push(`${label} shell dock missing`);
      if (!state?.shellDock?.teacherDrawerClosed) issues.push(`${label} teacher fallback drawer is open`);
      if (state?.shellDock?.teacherPanelVisibleWhenClosed) issues.push(`${label} teacher fallback panel visible while closed`);
      if (state?.teacherWorkbenchDocked) issues.push(`${label} teacher workbench moved into primary child dock`);
      if (state?.adultVisibleCopy?.length) issues.push(`${label} shows adult operation copy: ${state.adultVisibleCopy.join(", ")}`);
      if (state?.childScoreCopy?.length) issues.push(`${label} shows score copy: ${state.childScoreCopy.join(", ")}`);
      if (state?.shellDock?.teacherToolCopyInPrimaryDock?.length) {
        issues.push(`${label} primary dock exposes teacher tool copy: ${state.shellDock.teacherToolCopyInPrimaryDock.join(", ")}`);
      }
      if (state?.shellDock?.teacherSummaryText && state.shellDock.teacherSummaryText !== "师") {
        issues.push(`${label} teacher fallback summary too prominent: ${state.shellDock.teacherSummaryText}`);
      }
      if ((state?.shellDock?.teacherSummaryAreaRatioToChild ?? 1) > 0.5) {
        issues.push(`${label} teacher fallback competes with child energy chip`);
      }
      if ((state?.shellDock?.teacherSummaryAreaRatioToPrimary ?? 1) > 0.7) {
        issues.push(`${label} teacher fallback competes with primary dock buttons`);
      }
    };

    assertHomeFallbackClosed("home fallback initial", teacherFallbackReturnDetails?.initial);
    if (teacherFallbackReturnDetails?.opened?.shellDock?.teacherDrawerClosed) {
      issues.push("home fallback drawer did not open");
    }
    if (!teacherFallbackReturnDetails?.opened?.shellDock?.teacherPanelVisibleWhenClosed) {
      issues.push("home fallback drawer panel did not become reachable");
    }
    if (!teacherFallbackReturnDetails?.teacherModule?.hasTeacherWorkbench) {
      issues.push("home fallback teacher tool did not open teacher workbench");
    }
    if (teacherFallbackReturnDetails?.teacherModule?.drawerOpen) {
      issues.push("teacher fallback drawer stayed open after selecting a teacher tool");
    }
    assertHomeFallbackClosed("home fallback after return", teacherFallbackReturnDetails?.afterReturn);
  }

  if (check.kind === "leaderboard-flow") {
    details = { flow: leaderboardFlowDetails };
    if ((leaderboardFlowDetails?.rowCount ?? 0) < 30) issues.push("leaderboard does not show the full class");
    if (leaderboardFlowDetails?.topThreeCount !== 0) issues.push("leaderboard podium should be removed");
    if ((leaderboardFlowDetails?.rowAvatarCount ?? 0) < (leaderboardFlowDetails?.rowCount ?? 0)) {
      issues.push("leaderboard rows are missing spirit avatars");
    }
    if (!leaderboardFlowDetails?.hasPlazaScene) issues.push("leaderboard plaza scene missing");
    if ((leaderboardFlowDetails?.honorTokenCount ?? 0) < 3) issues.push("leaderboard honor stand missing top three");
    if ((leaderboardFlowDetails?.honorEnergyClippedCount ?? 0) > 0) issues.push("leaderboard honor energy text clipped");
    if (!leaderboardFlowDetails?.hasExplicitChildAction) issues.push("leaderboard child rows lack explicit island action");
    if (!leaderboardFlowDetails?.selectedMeaningClear) issues.push("leaderboard selected child label is ambiguous");
    if ((leaderboardFlowDetails?.plazaHeight ?? 0) < 140 && common.viewport.width > 720) issues.push("leaderboard plaza stage is too small");
    if (!leaderboardFlowDetails?.plazaHasWarmScene) issues.push("leaderboard plaza lacks coastal scene styling");
    if (!leaderboardFlowDetails?.firstRowIsNotPlainWhite || (leaderboardFlowDetails?.rowPlainWhiteCount ?? 0) > 0) {
      issues.push("leaderboard rows regressed to white workbench cards");
    }
    if (common.viewport.width > 720 && !leaderboardFlowDetails?.selectedRowVisible) issues.push("leaderboard selected child row is not visible");
    if (!leaderboardFlowDetails?.selectedTokenVisible) issues.push("leaderboard selected child token is not visible");
    if (!leaderboardFlowDetails?.hasSelectedReward3d) issues.push("leaderboard selected reward 3d preview missing");
    if (!leaderboardFlowDetails?.selectedRewardPassive) issues.push("leaderboard selected reward 3d preview should not intercept input");
    if (!leaderboardFlowDetails?.listNotTableLike) issues.push("leaderboard uses table-like structure");
    if (leaderboardFlowDetails?.horizontalOverflow) issues.push("leaderboard horizontal overflow");
    if (leaderboardFlowDetails?.decorativePanelCount !== 0) issues.push("leaderboard decorative side panels should be removed");
    if (!leaderboardFlowDetails?.sortedByRank) issues.push("leaderboard rows are not ranked in order");
    if (!leaderboardFlowDetails?.sortedByXp) issues.push("leaderboard rows are not sorted by energy");
    if (!leaderboardFlowDetails?.homeFocused) issues.push("leaderboard home focus failed");
  }

  if (check.kind === "lottery-flow") {
    details = { flow: lotteryFlowDetails };
    const lotteryChildName = lotteryFlowDetails?.selectedChildName ? escapeRegExp(lotteryFlowDetails.selectedChildName) : "";
    if (!lotteryFlowDetails?.activeChildSelected) issues.push("lottery selected child did not update");
    if (!lotteryFlowDetails?.hasSceneCopy) issues.push("lottery scene copy missing");
    if (lotteryFlowDetails?.forbiddenCopy?.length) {
      issues.push(`lottery still shows old copy: ${lotteryFlowDetails.forbiddenCopy.join(", ")}`);
    }
    if (!lotteryFlowDetails?.hasChildFirstResult) issues.push("lottery result does not show child-first feedback");
    if (!lotteryFlowDetails?.resultInFirstViewport) issues.push("lottery result below first viewport");
    if (!lotteryFlowDetails?.primaryActionInFirstViewport) issues.push("lottery primary action below first viewport");
    if (!lotteryFlowDetails?.homeActionInFirstViewport) issues.push("lottery home action below first viewport");
    if (!lotteryFlowDetails?.hasPrizeResult) issues.push("lottery result missing after draw");
    if (!lotteryFlowDetails?.hasHistory) issues.push("lottery draw history missing");
    if (!lotteryFlowDetails?.drawContract) issues.push("lottery draw contract missing");
    if (
      !lotteryChildName ||
      !feedbackShowsAction(
        lotteryFlowDetails?.drawGlobalFeedback,
        "draw",
        new RegExp(`${lotteryChildName}.*抽中|抽中.*${lotteryChildName}`),
      )
    ) {
      issues.push("lottery global draw feedback missing");
    }
    if (!lotteryFlowDetails?.ledgerUnchanged) issues.push("lottery changed XP ledger");
    if (!lotteryFlowDetails?.homeFocused) issues.push("lottery home focus failed");
  }

  if (check.kind === "shop-flow") {
    details = { flow: shopFlowDetails };
    const shopChildName = shopFlowDetails?.selectedChildName ? escapeRegExp(shopFlowDetails.selectedChildName) : "";
    if (!shopFlowDetails?.initialShopScene?.hasShopIdentity) issues.push("shop scene identity missing");
    if (!shopFlowDetails?.initialShopScene?.hasCounter) issues.push("shop compact counter missing");
    if ((shopFlowDetails?.initialShopScene?.forbiddenCopy ?? []).length > 0) issues.push("shop still shows backend/future copy");
    if ((shopFlowDetails?.initialShopScene?.rewardCardCount ?? 0) < 6) issues.push("shop shelf rewards missing");
    if ((shopFlowDetails?.initialShopScene?.rewardStateCount ?? 0) < (shopFlowDetails?.initialShopScene?.rewardCardCount ?? 0)) {
      issues.push("shop reward card states missing");
    }
    if ((shopFlowDetails?.initialShopScene?.rewardMeterCount ?? 0) < (shopFlowDetails?.initialShopScene?.rewardCardCount ?? 0)) {
      issues.push("shop reward progress meters missing");
    }
    if (!shopFlowDetails?.initialShopScene?.hasRewardPreview3d) issues.push("shop reward 3d preview missing");
    if (!shopFlowDetails?.initialShopScene?.rewardPreviewPassive) issues.push("shop reward 3d preview should not intercept input");
    if ((shopFlowDetails?.initialShopScene?.availableStateCount ?? 0) < 1) issues.push("shop available reward state missing");
    if ((shopFlowDetails?.initialShopScene?.lockedStateCount ?? 0) < 1) issues.push("shop locked reward state missing");
    if (!shopFlowDetails?.initialShopScene?.firstRewardActionVisibleInitially) issues.push("shop first reward action not visible in first viewport");
    if (!shopFlowDetails?.initialShopScene?.hasShelfScene) issues.push("shop shelf still reads as white workbench");
    if (!shopFlowDetails?.initialShopScene?.hasShortRewardActions) issues.push("shop reward actions are not short task labels");
    if (!shopFlowDetails?.initialShopScene?.hidesLongRewardCopy) issues.push("shop still shows long reward descriptions");
    if (shopFlowDetails?.initialShopScene?.horizontalOverflow) issues.push("shop horizontal overflow");
    if (!shopFlowDetails?.hasInsufficientState) issues.push("shop insufficient energy state missing");
    if (!shopFlowDetails?.hasAvailableState) issues.push("shop available energy state missing");
    if (!shopFlowDetails?.hasBalance) issues.push("shop energy balance missing");
    if (!shopFlowDetails?.hasRedemptionHistory) issues.push("shop redemption history missing");
    if (!shopFlowDetails?.redemptionContract) issues.push("shop redemption contract missing");
    if (!shopFlowDetails?.redeemedCardGuard?.cardMarkedRedeemed || !shopFlowDetails?.redeemedCardGuard?.buttonDisabled) {
      issues.push("shop redeemed reward can be selected again");
    }
    if (
      !shopChildName ||
      !feedbackShowsAction(
        shopFlowDetails?.redeemGlobalFeedback,
        "redeem",
        new RegExp(`${shopChildName}.*已选|已选.*${shopChildName}`),
      )
    ) {
      issues.push("shop global redemption feedback missing");
    }
    if (!shopFlowDetails?.ledgerUnchanged) issues.push("shop changed XP ledger");
    if (!shopFlowDetails?.homeFocused) issues.push("shop home focus failed");
  }

  if (check.kind === "data-flow") {
    details = { flow: dataFlowDetails };
    if (!dataFlowDetails?.hasHarborScene) issues.push("data management harbor scene missing");
    if (!dataFlowDetails?.toolsDrawerReachable) issues.push("data management tools drawer missing");
    if (!dataFlowDetails?.noAdminTitle) issues.push("data management still uses admin title");
    if (dataFlowDetails?.forbiddenCopy?.length) issues.push(`data management still shows old copy: ${dataFlowDetails.forbiddenCopy.join(", ")}`);
    if (!dataFlowDetails?.hasBackupPanel) issues.push("data management backup panel missing");
    if (!dataFlowDetails?.hasBackupActions) issues.push("data management backup actions missing");
    if (!dataFlowDetails?.backupContract) issues.push("data management backup contract missing");
    if (!dataFlowDetails?.hasRestorePreview) issues.push("data management restore preview missing");
    if (!dataFlowDetails?.restoreRequiresConfirmation) issues.push("data management restore does not require confirmation");
    if (!dataFlowDetails?.restoreContract) issues.push("data management backup restore failed");
    if (!dataFlowDetails?.localBackupPersisted) issues.push("data management backup did not persist locally");
    if (!dataFlowDetails?.hasPrivacyNote) issues.push("data management privacy note missing");
    if (!dataFlowDetails?.hasClearPermission) issues.push("data management clear permission missing");
    if (!dataFlowDetails?.clearDisabledBeforePhrase) issues.push("data management clear action enabled before confirmation phrase");
    if (!dataFlowDetails?.clearContract) issues.push("data management clear demo data failed");
    if (!dataFlowDetails?.clearPersisted) issues.push("data management clear demo data did not persist locally");
    if (!dataFlowDetails?.hasInsightPanel) issues.push("data management insight panel missing");
    if (!dataFlowDetails?.hasScopeMetrics) issues.push("data management scope metrics missing");
    if (!dataFlowDetails?.hasFilterTools) issues.push("data management filter tools missing");
    if (!dataFlowDetails?.hasVirtueStats) issues.push("data management virtue stats missing");
    if (!dataFlowDetails?.scopeFilterApplied) issues.push("data management week/month scope filter failed");
    if (!dataFlowDetails?.categoryFilterApplied) issues.push("data management virtue category filter failed");
    if (!dataFlowDetails?.categoryTotalsMatch) issues.push("data management category totals ignored the active filter");
    if (!dataFlowDetails?.hasSearchResult) issues.push("data management child search failed");
    if (!dataFlowDetails?.hasLedgerRows) issues.push("data management ledger rows missing");
    if (!dataFlowDetails?.hasPendingReview) issues.push("data management pending review display missing");
    if (!dataFlowDetails?.hasNoTable) issues.push("data management uses a dense table");
    if ((dataFlowDetails?.pendingReviewCount ?? 0) < 1) issues.push("data management pending review was not created");
  }

  if (check.kind === "data-mobile-drawer") {
    details = { drawer: mobileDataDrawerDetails };
    if (!mobileDataDrawerDetails?.hasMobileHarbor) issues.push("mobile data harbor scene missing");
    if (!mobileDataDrawerDetails?.drawerOpen) issues.push("mobile data tools drawer did not open");
    if (!mobileDataDrawerDetails?.drawerPanelInViewport) issues.push("mobile data tools drawer outside viewport");
    if (!mobileDataDrawerDetails?.hasSearch) issues.push("mobile data search missing in drawer");
    if (!mobileDataDrawerDetails?.hasFilterTools) issues.push("mobile data filter tools missing");
    if (!mobileDataDrawerDetails?.hasBackupTools) issues.push("mobile data backup tools missing");
    if (!mobileDataDrawerDetails?.hasClearTools) issues.push("mobile data clear tools missing");
    if (!mobileDataDrawerDetails?.hasRosterTool) issues.push("mobile data roster tool missing");
    if (mobileDataDrawerDetails?.horizontalOverflow) issues.push("mobile data drawer creates horizontal overflow");
  }

  if (check.kind === "organization-flow") {
    details = { flow: organizationFlowDetails };
    const initial = organizationFlowDetails?.initial;
    const selected = organizationFlowDetails?.selectedClass;
    const childPanel = organizationFlowDetails?.childPanel;
    const curriculum = organizationFlowDetails?.curriculumPublication;
    const curriculumPersistence = organizationFlowDetails?.curriculumPersistence;
    const task = organizationFlowDetails?.taskCompletion;
    const taskRepeat = organizationFlowDetails?.taskRepeatGuard;
    if (!initial?.hasTitle) issues.push("organization page title missing");
    if (!initial?.hasSummary) issues.push("organization summary metrics missing");
    if (!initial?.hasOperatingCopy) issues.push("organization operating sections missing");
    if (!initial?.noBackendCopy) issues.push("organization still shows backend/admin copy");
    if (!initial?.noReportCopy) issues.push("organization still exposes report/approval/export copy");
    if ((initial?.classroomCount ?? 0) < 3) issues.push("organization multi-classroom list missing");
    if ((initial?.teacherCardCount ?? 0) < 2) issues.push("organization multi-teacher cards missing");
    if ((initial?.childButtonCount ?? 0) < 1) issues.push("organization child task roster missing");
    if ((initial?.trackCount ?? 0) < 1) issues.push("organization curriculum tracks missing");
    if ((initial?.taskCount ?? 0) < 1) issues.push("organization growth tasks missing");
    if (initial?.horizontalOverflow) issues.push("organization horizontal overflow");
    if (!selected?.selectedMiddleClass) issues.push("organization class switching failed");
    if (!selected?.hasTeachers) issues.push("organization selected class teacher links missing");
    if (!selected?.hasCurriculum) issues.push("organization selected class curriculum missing");
    if (!selected?.hasTasks) issues.push("organization selected class growth tasks missing");
    if (!selected?.hasChildTaskPanel) issues.push("organization selected class child task panel missing");
    if (!selected?.allChildrenReachable) issues.push("organization child task panel does not expose all class children");
    if (!selected?.noReportCopy) issues.push("organization selected class still exposes report/approval/export copy");
    if (!childPanel?.activeChildSelected) issues.push("organization child task selection failed");
    if (!childPanel?.hasPreview) issues.push("organization child task preview missing");
    if (!childPanel?.hasEnergySummary) issues.push("organization child task energy summary missing");
    if (!childPanel?.hasFocusAction) issues.push("organization child task focus action missing");
    if (!childPanel?.noReportActions) issues.push("organization child task panel still exposes report/approval/export actions");
    if (!curriculum?.activeRuleWeek) issues.push("organization curriculum publication did not activate rule week");
    if (!curriculum?.noticeShown) issues.push("organization curriculum publication feedback missing");
    if (!curriculum?.currentTaskShifted) issues.push("organization curriculum publication did not shift current task context");
    if (!curriculum?.helperTaskStillVisible) issues.push("organization curriculum publication hid non-current tasks");
    if (!curriculumPersistence?.appStatePersisted) issues.push("organization curriculum publication did not persist in app state");
    if (!curriculumPersistence?.backupContractPersisted) issues.push("organization curriculum publication missing from backup contract");
    if (!curriculumPersistence?.localBackupPersisted) issues.push("organization curriculum publication missing from local backup");
    if (!curriculumPersistence?.activeAfterReload) issues.push("organization curriculum publication did not survive reload");
    if (!curriculumPersistence?.taskContextAfterReload) issues.push("organization curriculum task context did not survive reload");
    if (!curriculumPersistence?.appStateAfterReload) issues.push("organization curriculum app state missing after reload");
    if (!task?.recordAdded) issues.push("organization growth task did not create a ledger record");
    if (!task?.taskPanelUpdated) issues.push("organization growth task panel did not update completion state");
    if (!task?.noticeShown) issues.push("organization growth task completion feedback missing");
    if (!taskRepeat?.targetSelected) issues.push("organization could not find an incomplete child for growth task");
    if (!taskRepeat?.buttonDisabled) issues.push("organization completed growth task remains clickable");
    if (!taskRepeat?.noDuplicateRecord) issues.push("organization growth task duplicate ledger guard failed");
    const taskLedger = task?.ledgerContract;
    if (
      !taskLedger ||
      !taskLedger.hasChildId ||
      taskLedger.delta !== 10 ||
      taskLedger.source !== "manual" ||
      taskLedger.category !== "尊矩守法" ||
      taskLedger.operatorRole !== "teacher" ||
      taskLedger.aiSuggested !== false ||
      taskLedger.reviewStatus !== "not_required" ||
      taskLedger.reason !== "成长任务：排队守规则"
    ) {
      issues.push("organization growth task ledger contract missing");
    }
    if (!organizationFlowDetails?.home?.homeFocused) issues.push("organization child drilldown did not focus child on home");
  }

  if (check.kind === "settings-flow") {
    details = { flow: settingsFlowDetails };
    if (!settingsFlowDetails?.teacherModeChanged) issues.push("settings teacher mode did not change");
    if (!settingsFlowDetails?.savedRecordCreated) issues.push("settings save contract missing");
    if (!settingsFlowDetails?.recordPanelUpdated) issues.push("settings record panel did not update");
    if (!settingsFlowDetails?.recordValuesUpdated) issues.push("settings record values did not reflect teacher mode");
    if (!settingsFlowDetails?.sceneCopyUpdated) issues.push("settings still shows admin copy");
    if (!settingsFlowDetails?.ledgerUnchanged) issues.push("settings changed XP ledger");
    if (!settingsFlowDetails?.homeReturned) issues.push("settings did not return home");
  }

  if (check.kind === "settings-mobile") {
    details = { mobileSettings: mobileSettingsDetails };
    if (!mobileSettingsDetails?.hasSceneTitle) issues.push("mobile settings scene title missing");
    if (!mobileSettingsDetails?.hasTeacherControl) issues.push("mobile settings teacher control missing");
    if (!mobileSettingsDetails?.hasSaveAction) issues.push("mobile settings save action missing");
    if (!mobileSettingsDetails?.hasRecordRail) issues.push("mobile settings record rail missing");
    if (!mobileSettingsDetails?.primaryActionsInFirstViewport) issues.push("mobile settings primary actions below first viewport");
    if (mobileSettingsDetails?.horizontalOverflow) issues.push("mobile settings horizontal overflow");
    if (mobileSettingsDetails?.forbiddenCopy?.length) {
      issues.push(`mobile settings still shows admin copy: ${mobileSettingsDetails.forbiddenCopy.join(", ")}`);
    }
  }

  if (check.kind === "roll-call") {
    details = { action: actionDetails };
    if (!actionDetails?.hasTitle) issues.push("roll call title missing");
    if (!actionDetails?.hasSceneCopy) issues.push("roll call scene copy missing");
    if (actionDetails?.forbiddenCopy?.length) {
      issues.push(`roll call still shows backend copy: ${actionDetails.forbiddenCopy.join(", ")}`);
    }
    if (!actionDetails?.hasDrawnStatus) issues.push("roll call draw status missing after draw");
    if (!actionDetails?.hasAvatar) issues.push("roll call selected child avatar missing");
    if (!actionDetails?.hasFocusAction) issues.push("roll call focus action missing");
    if (!actionDetails?.hasRecordAction) issues.push("roll call quick record action missing");
    if (!actionDetails?.hasLocalFeedback) issues.push("roll call local action feedback missing");
    if (!actionDetails?.primaryActionInFirstViewport) issues.push("roll call primary action below first viewport");
    if (!actionDetails?.recordActionInFirstViewport) issues.push("roll call record action below first viewport");
    if (!actionDetails?.homeActionInFirstViewport) issues.push("roll call home action below first viewport");
    if (!feedbackShowsAction(actionDetails?.drawGlobalFeedback, "draw", /抽中/)) {
      issues.push("roll call global draw feedback missing");
    }
    if (!feedbackShowsDelta(actionDetails?.quickRecordGlobalFeedback, 10)) {
      issues.push("roll call quick record global energy feedback missing");
    }
    if (!actionDetails?.homeFocused) issues.push("roll call did not focus drawn child on home");
    if (!actionDetails?.home?.childEnergyMapFeedback) issues.push("roll call home map still looks like score text");
    if (!actionDetails?.readyForSelfService) issues.push("roll call did not open self-service ready state on home");
  }

  if (check.kind === "module") {
    const moduleDetails = await inspectModulePage(page, check.selector);
    details = { module: moduleDetails };
    if (!moduleDetails.exists) issues.push(`${check.name} module root missing`);
    if (!moduleDetails.hasDock) issues.push(`${check.name} module dock missing`);
    if (!moduleDetails.hasActiveModuleButton) issues.push(`${check.name} active module button missing`);
    if (!moduleDetails.dockDoesNotCoverModule) issues.push(`${check.name} dock overlaps module content`);
    if (!moduleDetails.teacherDrawerOpen) issues.push(`${check.name} teacher tools drawer did not open`);
    if ((moduleDetails.teacherToolButtonCount ?? 0) < 2) issues.push(`${check.name} teacher tools missing classroom actions`);
    if (!moduleDetails.teacherPanelInViewport) issues.push(`${check.name} teacher tools panel outside viewport`);
    if (!moduleDetails.noDataHeaderOverlap) issues.push(`${check.name} data header overlaps backup panel`);
  }

  if (p4SceneShell) {
    details = { ...details, p4SceneShell };
  }
  if (pixiRenderState) {
    details = { ...details, pixiRenderState };
  }

  await context.close();

  return {
    page: check.name,
    viewport: viewport.name,
    timings: { domContentLoadedMs, networkIdleMs },
    screenshot,
    common,
    resources: {
      total: resources.length,
      png: { count: pngCount, mb: Number((pngBytes / oneMb).toFixed(2)) },
      webp: { count: webpCount, mb: Number((webpBytes / oneMb).toFixed(2)) },
      summary: resourceSummary,
    },
    details,
    issues,
    warnings,
  };
}

ensureCleanDir(outputDir);

const browser = await chromium.launch({
  headless: true,
  ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
});
const results = [];

try {
  for (const check of checks) {
    for (const viewportName of check.viewports) {
      const viewport = viewports.find((item) => item.name === viewportName);
      if (!viewport) throw new Error(`Unknown viewport: ${viewportName}`);
      results.push(await inspectPage(browser, check, viewport));
    }
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  results,
  issueCount: results.reduce((sum, result) => sum + result.issues.length, 0),
  warningCount: results.reduce((sum, result) => sum + result.warnings.length, 0),
};

const reportPath = path.join(outputDir, "report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Visual QA report: ${reportPath}`);
for (const result of results) {
  console.log(
    [
      `${result.page}/${result.viewport}`,
      `screenshot=${result.screenshot}`,
      `png=${result.resources.png.count} (${result.resources.png.mb} MB)`,
      `webp=${result.resources.webp.count} (${result.resources.webp.mb} MB)`,
      `issues=${result.issues.length}`,
      `warnings=${result.warnings.length}`,
    ].join(" | "),
  );
  result.issues.forEach((issue) => console.log(`  ISSUE: ${issue}`));
  result.warnings.forEach((warning) => console.log(`  WARN: ${warning}`));
}

if (report.issueCount > 0) {
  process.exitCode = 1;
}
