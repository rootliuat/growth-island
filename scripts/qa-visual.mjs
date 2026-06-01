import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:5173";
const outputDir = path.resolve("qa-artifacts/latest");
const oneMb = 1024 * 1024;

const viewports = [
  { name: "whiteboard", width: 1850, height: 1150 },
  { name: "compact", width: 1600, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const checks = [
  { name: "home", module: "home", viewports: ["whiteboard"], kind: "home" },
  { name: "moral-speak-flow", module: "home", viewports: ["whiteboard"], kind: "moral-speak-flow", offline: true },
  { name: "moral-review-safety", module: "home", viewports: ["whiteboard"], kind: "moral-review-safety", offline: true },
  { name: "teacher-workbench", module: "teacher-workbench", viewports: ["whiteboard", "compact"], kind: "teacher" },
  { name: "teacher-flow", module: "teacher-workbench", viewports: ["whiteboard"], kind: "teacher-flow", offline: true },
  { name: "voice-record", module: "voice-record", viewports: ["whiteboard"], kind: "voice-flow", offline: true },
  { name: "roll-call", module: "roll-call", viewports: ["whiteboard"], kind: "roll-call" },
  { name: "math-arena", module: "math-arena", viewports: ["whiteboard"], kind: "math-flow", offline: true },
  { name: "child-profile", module: "teacher-workbench", viewports: ["whiteboard"], kind: "profile-flow", offline: true },
  { name: "leaderboard", module: "leaderboard", viewports: ["whiteboard"], kind: "leaderboard-flow" },
  { name: "lottery", module: "lottery", viewports: ["whiteboard"], kind: "lottery-flow" },
  { name: "shop", module: "shop", viewports: ["whiteboard"], kind: "shop-flow" },
  { name: "data-management", module: "data-management", viewports: ["whiteboard"], kind: "data-flow", offline: true },
  { name: "settings", module: "settings", viewports: ["whiteboard"], kind: "module", selector: ".settings-page" },
  { name: "mobile-home", module: "home", viewports: ["mobile"], kind: "module", selector: ".home-module" },
  {
    name: "mobile-teacher-workbench",
    module: "teacher-workbench",
    viewports: ["mobile"],
    kind: "module",
    selector: ".teacher-workbench-page",
  },
  { name: "mobile-roll-call", module: "roll-call", viewports: ["mobile"], kind: "module", selector: ".roll-call-page" },
  {
    name: "mobile-voice-record",
    module: "voice-record",
    viewports: ["mobile"],
    kind: "module",
    selector: ".voice-record-page",
  },
  { name: "mobile-math-arena", module: "math-arena", viewports: ["mobile"], kind: "module", selector: ".math-arena-page" },
  { name: "mobile-shop", module: "shop", viewports: ["mobile"], kind: "module", selector: ".shop-page" },
  { name: "mobile-data-management", module: "data-management", viewports: ["mobile"], kind: "module", selector: ".data-page" },
  { name: "mobile-settings", module: "settings", viewports: ["mobile"], kind: "module", selector: ".settings-page" },
];

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
      .find((line) => !line.includes("XP") && !line.startsWith("Lv.") && line !== "档案" && line !== "查看档案") ?? ""
  );
}

async function measureFrameRate(page, selector) {
  return page.evaluate(async (targetSelector) => {
    const scroller = document.querySelector(targetSelector) || document.scrollingElement;
    const start = performance.now();
    let frames = 0;
    let maxFrameGap = 0;
    let previous = start;
    const initialScrollTop = scroller && "scrollTop" in scroller ? scroller.scrollTop : 0;

    await new Promise((resolve) => {
      function tick(now) {
        frames += 1;
        maxFrameGap = Math.max(maxFrameGap, now - previous);
        previous = now;
        if (scroller && "scrollTop" in scroller) scroller.scrollTop = initialScrollTop + frames * 6;
        if (now - start < 1200) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });

    if (scroller && "scrollTop" in scroller) scroller.scrollTop = initialScrollTop;
    return {
      frames,
      fps: Number((frames / 1.2).toFixed(1)),
      maxFrameGap: Number(maxFrameGap.toFixed(1)),
    };
  }, selector);
}

async function waitForPixiIdle(page) {
  await page.waitForSelector(".pixi-world-canvas[data-render-state='idle']", { timeout: 7000 }).catch(() => undefined);
}

async function inspectPixiRenderState(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".pixi-world-canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return undefined;
    return {
      state: canvas.dataset.renderState || "unknown",
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      cssWidth: canvas.clientWidth,
      cssHeight: canvas.clientHeight,
    };
  });
}

async function inspectHomeBigScreen(page) {
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
    const rootText = root?.innerText ?? "";
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

    return {
      root: rect(".home-module"),
      workspace: rect(".product-workspace"),
      map: rect(".world-map-shell"),
      topbar: rect(".game-topbar"),
      hud: rect(".hud-rail"),
      dock: rect(".spirit-dock"),
      mapShare,
      textLength: rootText.replace(/\s+/g, "").length,
      hasSelectedChild: Boolean(rootText.match(/可可|佳佳|安安|帆帆|石石/)),
      largeHeadings,
      noisyCopy,
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
    };
  });
}

async function measureHomeWheel(page) {
  const stage = page.locator(".pixi-world-canvas").first();
  const box = await stage.boundingBox({ timeout: 7000 }).catch(() => undefined);
  if (!box) return undefined;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -320);
  await page.waitForTimeout(300);
  const fps = await measureFrameRate(page, ".world-map-stage");
  await waitForPixiIdle(page);
  return fps;
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
      const actions = card.querySelector(".student-card-actions");
      if (!avatar || !meta || !actions) continue;

      const cardRect = rect(card);
      const avatarRect = rect(avatar);
      const imgRect = img ? rect(img) : undefined;
      const metaRect = rect(meta);
      const actionsRect = rect(actions);
      const separated = avatarRect.bottom <= metaRect.y + 0.5 && metaRect.bottom <= actionsRect.y + 0.5;
      const imageInsideAvatar = imgRect
        ? imgRect.x >= avatarRect.x - 1 &&
          imgRect.right <= avatarRect.right + 1 &&
          imgRect.y >= avatarRect.y - 1 &&
          imgRect.bottom <= avatarRect.bottom + 1
        : true;
      const cardContains = actionsRect.bottom <= cardRect.bottom + 1;
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
  const startButton = page.getByRole("button", { name: /抽一名|开始(?:点名)?/ }).first();
  await startButton.click();
  await page.waitForTimeout(1250);
  const drawn = await page.evaluate(() => {
    const text = document.body.innerText;
    const selectedChildId = window.__growthIslandSelectedChildId;
    const name = document.querySelector(".roll-call-nameplate strong")?.textContent?.trim() ?? "";
    return {
      hasTitle: text.includes("随机点名"),
      hasDrawnStatus: text.includes("已抽出孩子") || text.includes("本轮点名"),
      hasAvatar: Boolean(document.querySelector(".roll-call-avatar img, .roll-call-fallback")),
      hasFocusAction: text.includes("回岛") || text.includes("回到成长岛"),
      hasRecordAction: text.includes("记录 +10") || /给\s*\S+\s*\+10/.test(text),
      selectedChildId,
      name,
    };
  });
  await page.screenshot({ path: rollCallScreenshot, fullPage: false });
  await page.getByRole("button", { name: /回岛/ }).click();
  await page.waitForSelector(".home-module", { timeout: 5000 });
  await page.waitForSelector(".moral-mic-button", { timeout: 5000 });
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const home = await page.evaluate(({ expectedChildId, expectedName }) => {
    const text = document.body.innerText;
    return {
      selectedChildId: window.__growthIslandSelectedChildId,
      stage: window.__growthIslandMoralSpeakStage,
      hasMicButton: Boolean(document.querySelector(".moral-mic-button")),
      hasSelectedName: Boolean(expectedName) && text.includes(expectedName),
      childIdMatches: window.__growthIslandSelectedChildId === expectedChildId,
    };
  }, { expectedChildId: drawn.selectedChildId, expectedName: drawn.name });

  return {
    ...drawn,
    homeFocused: home.childIdMatches && home.hasSelectedName,
    readyForSelfService: home.stage === "ready" && home.hasMicButton,
    home,
  };
}

async function selectDockChildByIndex(page, index) {
  if ((await page.locator(".dock-spirit").count()) === 0) {
    await page.locator(".dock-collapse").click();
    await page.waitForSelector(".dock-spirit");
  }
  const childButton = page.locator(".dock-spirit").nth(index);
  await childButton.click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "定位当前精灵" }).click();
  await page.waitForTimeout(900);
  return page.evaluate(() => window.__growthIslandSelectedChildId);
}

async function openMoralSpeakFromMap(page) {
  await page.waitForSelector(".pixi-world-canvas");
  const before = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: window.__growthIslandMoralSpeakStage,
  }));
  const box = await page.locator(".pixi-world-canvas").boundingBox({ timeout: 7000 });
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForSelector(".moral-mic-button", { timeout: 5000 });
  const after = await page.evaluate(() => ({
    selectedChildId: window.__growthIslandSelectedChildId,
    stage: window.__growthIslandMoralSpeakStage,
  }));
  return { before, after, openedFromMap: before.stage === "idle" && after.stage === "ready" };
}

async function exerciseSingleMoralSpeak(page, screenshots = {}) {
  const mapEntry = await openMoralSpeakFromMap(page);
  if (screenshots.ready) await page.screenshot({ path: screenshots.ready, fullPage: false });
  const readyDetails = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const selfServiceRecordCount = (window.__growthIslandLedger ?? []).filter(
      (record) => record.childId === selectedChildId && record.reason?.startsWith("自助成长："),
    ).length;
    return { selectedChildId, stage: window.__growthIslandMoralSpeakStage, selfServiceRecordCount };
  });

  await page.locator(".moral-mic-button").click();
  await page.waitForSelector(".teacher-review-corner-card", { timeout: 7000 });
  if (screenshots.pending) await page.screenshot({ path: screenshots.pending, fullPage: false });
  const pendingDetails = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const selfServiceRecordCount = (window.__growthIslandLedger ?? []).filter(
      (record) => record.childId === selectedChildId && record.reason?.startsWith("自助成长："),
    ).length;
    return {
      selectedChildId,
      stage: window.__growthIslandMoralSpeakStage,
      selfServiceRecordCount,
      teacherCardText: document.querySelector(".teacher-review-corner-card")?.textContent ?? "",
      childBubbleText: document.querySelector(".spirit-speech-bubble")?.textContent ?? "",
    };
  });

  await page.locator(".teacher-review-corner-card .approve").evaluate((button) => {
    button.click();
    button.click();
  });
  await page.waitForSelector(".spirit-speech-bubble.success", { timeout: 4000 });
  if (screenshots.success) await page.screenshot({ path: screenshots.success, fullPage: false });
  const successDetails = await page.evaluate(() => ({
    stage: window.__growthIslandMoralSpeakStage,
    successBubble: document.querySelector(".spirit-speech-bubble.success")?.textContent?.trim() ?? "",
    hasTeacherCard: Boolean(document.querySelector(".teacher-review-corner-card")),
  }));

  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 4200 });
  const finalDetails = await page.evaluate(({ initialSelfServiceCount }) => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const selfServiceRecords = (window.__growthIslandLedger ?? []).filter(
      (record) => record.childId === selectedChildId && record.reason?.startsWith("自助成长："),
    );
    const record = selfServiceRecords[0];
    return {
      stage: window.__growthIslandMoralSpeakStage,
      selectedChildId,
      selfServiceRecordCount: selfServiceRecords.length,
      singleLedgerWrite: selfServiceRecords.length === initialSelfServiceCount + 1,
      ledgerContract: record
        ? {
            childIdMatches: record.childId === selectedChildId,
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
  }, { initialSelfServiceCount: readyDetails.selfServiceRecordCount });

  return { mapEntry, ready: readyDetails, pending: pendingDetails, success: successDetails, final: finalDetails };
}

async function exerciseMoralSpeakFlow(page, readyScreenshot, pendingScreenshot, successScreenshot) {
  await page.waitForSelector(".pixi-world-canvas");
  const childIndexes = [0, 4, 8];
  const children = [];

  for (const [index, childIndex] of childIndexes.entries()) {
    await selectDockChildByIndex(page, childIndex);
    const details = await exerciseSingleMoralSpeak(
      page,
      index === 0 ? { ready: readyScreenshot, pending: pendingScreenshot, success: successScreenshot } : {},
    );
    children.push(details);
  }

  const completedChildIds = children.map((child) => child.final.selectedChildId);
  return {
    children,
    completedChildCount: children.length,
    uniqueChildCount: new Set(completedChildIds).size,
    mapEntryCount: children.filter((child) => child.mapEntry.openedFromMap).length,
    ready: children[0]?.ready,
    pending: children[0]?.pending,
    success: children[0]?.success,
    final: children[0]?.final,
  };
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

async function inspectMoralReviewCard(page, transcript, childId) {
  return page.evaluate(({ transcript, childId }) => {
    const approve = document.querySelector(".teacher-review-corner-card .approve");
    const speak = window.__growthIslandMoralSpeak ?? {};
    const records = window.__growthIslandLedger ?? [];
    const matchingRecords = records.filter(
      (record) => record.childId === childId && record.reason === `自助成长：${transcript}`,
    );
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
      approveDisabled: approve instanceof HTMLButtonElement ? approve.disabled : true,
      cardText: document.querySelector(".teacher-review-corner-card")?.textContent ?? "",
      matchingSelfServiceCount: matchingRecords.length,
      hasNegativeLedger: matchingRecords.some((record) => record.delta < 0),
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

async function exerciseMoralReviewSafety(page, pendingScreenshot, adjustedScreenshot) {
  await page.waitForSelector(".pixi-world-canvas");

  const lowConfidence = {
    childId: "child-07",
    transcript: "嗯嗯",
    summary: "嗯嗯",
  };
  const lowStart = await startQaMoralReview(page, lowConfidence);
  await page.screenshot({ path: pendingScreenshot, fullPage: false });
  const lowPending = await inspectMoralReviewCard(page, lowConfidence.transcript, lowConfidence.childId);
  await page.locator(".teacher-review-corner-card .approve").evaluate((button) => button.click());
  await page.waitForTimeout(250);
  const lowAfterApproveAttempt = await inspectMoralReviewCard(page, lowConfidence.transcript, lowConfidence.childId);
  await page.locator(".teacher-review-corner-card .defer").click();
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
  const lowAfterDefer = await inspectMoralReviewCard(page, lowConfidence.transcript, lowConfidence.childId);

  const negative = {
    childId: "child-06",
    transcript: "我今天推了同学",
    summary: "推了同学",
  };
  const negativeStart = await startQaMoralReview(page, negative);
  const negativePending = await inspectMoralReviewCard(page, negative.transcript, negative.childId);
  await page.locator(".teacher-review-corner-card .approve").evaluate((button) => button.click());
  await page.waitForTimeout(250);
  const negativeAfterApproveAttempt = await inspectMoralReviewCard(page, negative.transcript, negative.childId);
  await page.locator(".review-edit-popover summary").click();
  await page.locator(".review-edit-popover button").first().click();
  await page.waitForFunction(() => {
    const approve = document.querySelector(".teacher-review-corner-card .approve");
    return approve instanceof HTMLButtonElement && !approve.disabled;
  });
  await page.screenshot({ path: adjustedScreenshot, fullPage: false });
  const negativeAfterAdjust = await inspectMoralReviewCard(page, negative.transcript, negative.childId);
  await page.locator(".teacher-review-corner-card .approve").click();
  await page.waitForSelector(".spirit-speech-bubble.success", { timeout: 4000 });
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 4200 });
  const negativeFinal = await inspectMoralReviewCard(page, negative.transcript, negative.childId);

  return {
    lowConfidence: {
      start: lowStart,
      pending: lowPending,
      afterApproveAttempt: lowAfterApproveAttempt,
      afterDefer: lowAfterDefer,
      ledgerUnchanged:
        lowStart.before.matchingSelfServiceCount === lowAfterApproveAttempt.matchingSelfServiceCount &&
        lowStart.before.matchingSelfServiceCount === lowAfterDefer.matchingSelfServiceCount,
    },
    negative: {
      start: negativeStart,
      pending: negativePending,
      afterApproveAttempt: negativeAfterApproveAttempt,
      afterAdjust: negativeAfterAdjust,
      final: negativeFinal,
      noDirectLedger:
        negativeStart.before.matchingSelfServiceCount === negativeAfterApproveAttempt.matchingSelfServiceCount,
      noNegativeLedger: !negativeFinal.hasNegativeLedger,
    },
  };
}

async function exerciseTeacherFlow(page, scoreScreenshot, homeScreenshot) {
  await page.waitForSelector(".workbench-student-card");
  const targetCard = page.locator(".workbench-student-card").nth(4);
  await targetCard.locator(".student-card-main").click();
  await page.waitForTimeout(200);

  const selectedBefore = await page.locator(".workbench-selected-child.compact").innerText();
  const name = selectedBefore.match(/当前孩子\s*([^\n]+)/)?.[1]?.trim() ?? extractSelectedChildName(selectedBefore);
  const xpBefore = Number(selectedBefore.match(/(\d+)\s*XP/)?.[1] ?? Number.NaN);
  await page.locator(".workbench-student-card.active .student-card-actions button").first().click();
  await page.waitForFunction(
    ({ expectedXp }) => document.querySelector(".workbench-selected-child.compact")?.textContent?.includes(`${expectedXp} XP`),
    { expectedXp: xpBefore + 10 },
    { timeout: 3000 },
  );

  const selectedAfterQuick = await page.locator(".workbench-selected-child.compact").innerText();
  const xpAfterQuick = Number(selectedAfterQuick.match(/(\d+)\s*XP/)?.[1] ?? Number.NaN);
  const quickLedgerContract = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const record = [...(window.__growthIslandLedger ?? [])].find(
      (item) => item.childId === selectedChildId && item.reason === "课堂记录：快速加分 +10",
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

  await page.getByRole("button", { name: /提交分析/ }).click();
  await page.waitForSelector(".workbench-result-card");
  const beforeConfirmAiRecordCount = await page.evaluate(() =>
    (window.__growthIslandLedger ?? []).filter((record) => record.source === "dialogue-agent").length,
  );
  const resultText = await page.locator(".workbench-result-card").innerText();
  const aiDelta = Number(resultText.match(/([+-]?\d+)\s*XP/)?.[1] ?? 0);
  await page.getByRole("button", { name: /确认入账/ }).click();
  await page.waitForFunction(
    ({ expectedXp }) => document.querySelector(".workbench-selected-child.compact")?.textContent?.includes(`${expectedXp} XP`),
    { expectedXp: xpAfterQuick + aiDelta },
    { timeout: 3000 },
  );
  const aiLedgerContract = await page.evaluate(() => {
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

  const selectedAfter = await page.locator(".workbench-selected-child.compact").innerText();
  const recordText = await page.locator(".workbench-record-list").innerText();
  const xpAfter = Number(selectedAfter.match(/(\d+)\s*XP/)?.[1] ?? Number.NaN);
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
    quickDelta: xpAfterQuick - xpBefore,
    totalDelta: xpAfter - xpBefore,
    aiDelta,
    hasQuickRecord: recordText.includes("课堂记录：快速加分 +10"),
    hasAiRecord: recordText.includes("语音记录："),
    noAiLedgerBeforeConfirm: beforeConfirmAiRecordCount === 0,
    quickLedgerContract,
    aiLedgerContract,
    homeFocused: Boolean(name) && homeText.includes(name) && homeText.includes(`${xpAfter} XP`),
    homeHasRecord:
      homeText.includes("成长记录") ||
      homeText.includes("+10") ||
      homeText.includes("成长能量") ||
      homeText.includes(`+${aiDelta}`),
    homeScreenshot,
  };
}

async function exerciseVoiceFlow(page, confirmedScreenshot, suggestionScreenshot, homeScreenshot) {
  await page.waitForSelector(".voice-record-page");
  await page.selectOption("#voice-record-child", "child-06");
  await page.waitForTimeout(200);

  const selectedBefore = await page.locator(".voice-child-card").innerText();
  const name = selectedBefore.match(/当前记录对象\s*([^\n]+)/)?.[1]?.trim() ?? "";
  const xpBefore = Number(selectedBefore.match(/(\d+)\s*XP/)?.[1] ?? Number.NaN);

  await page.getByRole("button", { name: /提交分析/ }).click();
  await page.waitForSelector(".voice-result-card");
  const beforeConfirmAiRecordCount = await page.evaluate(() =>
    (window.__growthIslandLedger ?? []).filter((record) => record.source === "dialogue-agent").length,
  );
  const resultText = await page.locator(".voice-result-card").innerText();
  const aiDelta = Number(resultText.match(/([+-]?\d+)\s*XP/)?.[1] ?? 0);
  await page.screenshot({ path: suggestionScreenshot, fullPage: false });

  await page.getByRole("button", { name: /确认入账/ }).click();
  await page.waitForFunction(
    ({ expectedXp }) => document.querySelector(".voice-child-card")?.textContent?.includes(`${expectedXp} XP`),
    { expectedXp: xpBefore + aiDelta },
    { timeout: 3000 },
  );
  const selectedAfter = await page.locator(".voice-child-card").innerText();
  const historyText = await page.locator(".voice-history-panel").innerText();
  const xpAfter = Number(selectedAfter.match(/(\d+)\s*XP/)?.[1] ?? Number.NaN);
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

  await page.getByRole("button", { name: /回到成长岛|回岛/ }).click();
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
    hasSuggestion: resultText.includes("XP") && resultText.includes("确认入账"),
    hasHistoryRecord: historyText.includes("语音记录："),
    noAiLedgerBeforeConfirm: beforeConfirmAiRecordCount === 0,
    ledgerContract,
    homeFocused: Boolean(name) && homeText.includes(name) && homeText.includes(`${xpAfter} XP`),
    homeHasRecord: homeText.includes("成长能量") || homeText.includes(`+${aiDelta}`),
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
    return buttons.findIndex((button) => button.textContent?.trim() === String(answer));
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
  const playerSummary = await page.locator(".math-fighter-card .math-fighter-copy em").first().innerText();
  const xpBefore = Number(playerSummary.match(/(\d+)\s*XP/)?.[1] ?? Number.NaN);

  await page.getByRole("button", { name: /开始对战/ }).click();
  await page.waitForSelector(".problem-card");
  const initialBattleText = await page.locator(".math-arena-battle-shell").innerText();

  for (let i = 0; i < 12; i += 1) {
    const log = await page.locator(".battle-log").innerText();
    if (log.includes("获胜")) break;
    await answerCurrentMathProblem(page);
    await page.waitForTimeout(120);
  }

  await page.waitForFunction(() => document.querySelector(".battle-log")?.textContent?.includes("获胜"), undefined, {
    timeout: 3000,
  });
  await page.waitForFunction(
    () => [...(window.__growthIslandLedger ?? [])].some((record) => record.source === "math-pk" && record.delta === 30),
    undefined,
    { timeout: 3000 },
  );
  const battleText = await page.locator(".math-arena-page").innerText();
  const winnerName = (await page.locator(".battle-log").innerText()).match(/^(.+?)\s*获胜/)?.[1]?.trim() ?? "";
  const ledgerContract = await page.evaluate(() => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const record = [...(window.__growthIslandLedger ?? [])].find(
      (item) => item.childId === selectedChildId && item.source === "math-pk" && item.reason.includes("数学魔法 PK"),
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
    winnerName,
    questionSeen: /[+-]\s*\d+\s*=/.test(initialBattleText),
    hpSeen: initialBattleText.includes("HP"),
    battleLogWinner: battleText.includes("获胜") && battleText.includes("+30 XP"),
    ledgerContract,
    homeFocused: Boolean(winnerName) && homeText.includes(winnerName) && homeText.includes(`${xpBefore + 30} XP`),
    homeHasRecord: homeText.includes("数学魔法 PK 胜利 +30"),
    homeScreenshot,
  };
}

async function inspectCurrentProfile(page, expectedXp) {
  return page.evaluate(({ expectedXp }) => {
    const selectedChildId = window.__growthIslandSelectedChildId;
    const ledger = window.__growthIslandLedger ?? [];
    const records = ledger.filter((record) => record.childId === selectedChildId && !record.undone && record.source !== "undo");
    const positiveXp = records.reduce((sum, record) => sum + Math.max(0, record.delta), 0);
    const heroText = document.querySelector(".profile-hero-card")?.textContent ?? "";
    const timelineText = document.querySelector(".profile-timeline")?.textContent ?? "";
    const evidenceText = document.querySelector(".profile-evidence-card")?.textContent ?? "";
    return {
      selectedChildId,
      ledgerRecordCount: records.length,
      positiveXp,
      heroHasExpectedXp: heroText.includes(`${expectedXp} XP`),
      hasSpirit: Boolean(document.querySelector(".profile-portrait img, .profile-portrait")),
      hasTimelineRecord: timelineText.includes("课堂记录：快速加分 +10"),
      evidenceHasRecordCount: evidenceText.includes(`${records.length} 条`),
      evidenceHasPositiveXp: evidenceText.includes(`${positiveXp} XP`),
      hasDimensionStats: document.querySelectorAll(".dimension-list article").length >= 7,
    };
  }, { expectedXp });
}

async function exerciseProfileFlow(page, workbenchProfileScreenshot, homeProfileScreenshot) {
  await page.waitForSelector(".workbench-student-card");
  const targetCard = page.locator(".workbench-student-card").nth(4);
  await targetCard.locator(".student-card-main").click();
  await page.waitForTimeout(200);

  const selectedBefore = await page.locator(".workbench-selected-child.compact").innerText();
  const name = selectedBefore.match(/当前孩子\s*([^\n]+)/)?.[1]?.trim() ?? extractSelectedChildName(selectedBefore);
  const xpBefore = Number(selectedBefore.match(/(\d+)\s*XP/)?.[1] ?? Number.NaN);
  await page.locator(".workbench-student-card.active .student-card-actions button").first().click();
  await page.waitForFunction(
    ({ expectedXp }) => document.querySelector(".workbench-selected-child.compact")?.textContent?.includes(`${expectedXp} XP`),
    { expectedXp: xpBefore + 10 },
    { timeout: 3000 },
  );

  await page.getByRole("button", { name: "档案", exact: true }).click();
  await page.waitForSelector(".profile-page");
  const fromWorkbench = await inspectCurrentProfile(page, xpBefore + 10);
  await page.screenshot({ path: workbenchProfileScreenshot, fullPage: false });

  await page.locator(".profile-home-button").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  const homeText = await page.locator(".hud-rail").innerText();
  await page.getByRole("button", { name: "成长档案" }).click();
  await page.waitForSelector(".profile-page");
  const fromHome = await inspectCurrentProfile(page, xpBefore + 10);
  await page.screenshot({ path: homeProfileScreenshot, fullPage: false });

  return {
    name,
    xpBefore,
    xpAfter: xpBefore + 10,
    homeHadSelectedChild: Boolean(name) && homeText.includes(name) && homeText.includes(`${xpBefore + 10} XP`),
    fromWorkbench,
    fromHome,
    homeProfileScreenshot,
  };
}

async function exerciseLeaderboardFlow(page, leaderboardScreenshot, homeScreenshot) {
  await page.waitForSelector(".leaderboard-page");
  const leaderboardDetails = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".leaderboard-list li button")].map((button) => {
      const text = button.textContent ?? "";
      return {
        text,
        rank: Number(text.match(/#(\d+)/)?.[1] ?? Number.NaN),
        xp: Number(text.match(/(\d+)\s*XP/)?.[1] ?? Number.NaN),
      };
    });
    const podium = [...document.querySelectorAll(".podium-card")].map((card) => card.textContent ?? "");
    const rowAvatarCount = document.querySelectorAll(".leaderboard-row-avatar").length;
    const decorativePanels = document.querySelectorAll(
      ".leaderboard-podium, .leaderboard-side, .leaderboard-stat-panel, .leaderboard-selected-panel, .leaderboard-note-panel",
    );
    const sortedByRank = rows.every((row, index) => row.rank === index + 1);
    const sortedByXp = rows.every((row, index) => index === 0 || rows[index - 1].xp >= row.xp);
    return {
      rowCount: rows.length,
      topThreeCount: podium.length,
      rowAvatarCount,
      decorativePanelCount: decorativePanels.length,
      sortedByRank,
      sortedByXp,
      firstRankText: rows[0]?.text ?? "",
    };
  });
  await page.screenshot({ path: leaderboardScreenshot, fullPage: false });

  const chosenText = await page.locator(".leaderboard-list li button").nth(2).innerText();
  const chosenName =
    chosenText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => !line.startsWith("#") && !line.startsWith("Lv.") && !line.includes("XP")) ?? "";
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
  await page.selectOption("#lottery-child", "child-06");
  await page.waitForTimeout(150);
  const ledgerCountBefore = await page.evaluate(() => (window.__growthIslandLedger ?? []).length);
  await page.getByRole("button", { name: /开始抽奖/ }).click();
  await page.waitForFunction(() => {
    const text = document.querySelector(".lottery-result-card")?.textContent ?? "";
    return !text.includes("等待抽奖") && !text.includes("本地奖池");
  });
  const resultText = await page.locator(".lottery-result-card").innerText();
  const historyText = await page.locator(".lottery-history-panel").innerText();
  const activeChildText = await page.locator(".reward-child-card").innerText();
  const ledgerCountAfter = await page.evaluate(() => (window.__growthIslandLedger ?? []).length);
  await page.screenshot({ path: lotteryScreenshot, fullPage: false });

  await page.locator(".reward-home-button").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const homeText = await page.locator(".hud-rail").innerText();

  return {
    activeChildIsFanFan: activeChildText.includes("帆帆"),
    hasPrizeResult: /常见|惊喜|稀有/.test(resultText),
    hasHistory: historyText.includes("帆帆"),
    ledgerUnchanged: ledgerCountBefore === ledgerCountAfter,
    homeFocused: homeText.includes("帆帆"),
    homeScreenshot,
  };
}

async function exerciseShopFlow(page, shopScreenshot, insufficientScreenshot, homeScreenshot) {
  await page.waitForSelector(".shop-page");
  const ledgerCountBefore = await page.evaluate(() => (window.__growthIslandLedger ?? []).length);
  await page.selectOption("#shop-child", "child-30");
  await page.waitForTimeout(150);
  await page.locator(".shop-reward-card.locked button").last().click();
  await page.waitForFunction(() => (document.querySelector(".shop-intent-card")?.textContent ?? "").includes("XP 暂时不足"));
  const insufficientText = await page.locator(".shop-intent-card").innerText();
  await page.screenshot({ path: insufficientScreenshot, fullPage: false });

  await page.selectOption("#shop-child", "child-10");
  await page.waitForTimeout(150);
  await page.locator(".shop-reward-card.available button").first().click();
  await page.waitForFunction(() => (document.querySelector(".shop-intent-card")?.textContent ?? "").includes("已选择奖励"));
  const availableText = await page.locator(".shop-intent-card").innerText();
  const balanceText = await page.locator(".shop-balance-card").innerText();
  const ledgerCountAfter = await page.evaluate(() => (window.__growthIslandLedger ?? []).length);
  await page.screenshot({ path: shopScreenshot, fullPage: false });

  await page.locator(".reward-home-button").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(1200);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const homeText = await page.locator(".hud-rail").innerText();

  return {
    hasInsufficientState: insufficientText.includes("XP 暂时不足"),
    hasAvailableState: availableText.includes("已选择奖励"),
    hasBalance: balanceText.includes("当前 XP"),
    ledgerUnchanged: ledgerCountBefore === ledgerCountAfter,
    homeFocused: homeText.includes("可可"),
    insufficientScreenshot,
    homeScreenshot,
  };
}

async function exerciseDataManagementFlow(page, dataScreenshot) {
  await page.waitForSelector(".data-page");
  await page.fill("#data-search", "帆帆");
  await page.waitForTimeout(250);
  const details = await page.evaluate(() => {
    const toolbarText = document.querySelector(".data-toolbar")?.textContent ?? "";
    const childText = document.querySelector(".data-child-list")?.textContent ?? "";
    const recordText = document.querySelector(".data-record-list")?.textContent ?? "";
    const reviewText = document.querySelector(".data-review-list")?.textContent ?? "";
    const pendingReviews = (window.__growthIslandReviews ?? []).filter((review) => review.status === "pending_review");
    return {
      toolbarText,
      childText,
      recordText,
      reviewText,
      pendingReviewCount: pendingReviews.length,
      hasSearchResult: childText.includes("帆帆"),
      hasLedgerRows: recordText.includes("帆帆") || recordText.includes("已有成长 XP"),
      hasPendingReview: reviewText.includes("帆帆") && reviewText.includes("通过") && reviewText.includes("驳回"),
      hasNoTable: document.querySelectorAll(".data-page table").length === 0,
    };
  });
  await page.screenshot({ path: dataScreenshot, fullPage: false });
  return details;
}

async function inspectModulePage(page, selector) {
  return page.evaluate((moduleSelector) => {
    const root = document.querySelector(moduleSelector);
    if (!root) return { exists: false };
    const rect = root.getBoundingClientRect();
    return {
      exists: true,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      imageCount: root.querySelectorAll("img").length,
      buttonCount: root.querySelectorAll("button").length,
    };
  }, selector);
}

async function inspectPage(browser, check, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const resources = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (check.offline && request.url().includes(":5174/")) return;
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
  if (check.kind === "home") await waitForPixiIdle(page);
  const screenshot = path.join(outputDir, `${check.name}-${viewport.name}.png`);
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
        )
      : undefined;
  const moralReviewSafetyDetails =
    check.kind === "moral-review-safety"
      ? await exerciseMoralReviewSafety(
          page,
          screenshot,
          path.join(outputDir, `${check.name}-adjusted-${viewport.name}.png`),
        )
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

  if (
    check.kind !== "teacher-flow" &&
    check.kind !== "voice-flow" &&
    check.kind !== "moral-speak-flow" &&
    check.kind !== "moral-review-safety" &&
    check.kind !== "roll-call" &&
    check.kind !== "math-flow" &&
    check.kind !== "profile-flow" &&
    check.kind !== "leaderboard-flow" &&
    check.kind !== "lottery-flow" &&
    check.kind !== "shop-flow" &&
    check.kind !== "data-flow"
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
    const forbiddenVisibleCopy = ["的小伙伴", "今天也在成长", "家园 0", "家园 1", "家园 2", "家园 3", "家园 4"].filter((copy) =>
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

  const resourceSummary = summarizeResources(resources);
  const pngBytes = resourceSummary.png?.bytes ?? 0;
  const pngCount = resourceSummary.png?.count ?? 0;
  const webpBytes = resourceSummary.webp?.bytes ?? 0;
  const webpCount = resourceSummary.webp?.count ?? 0;
  const issues = [];
  const warnings = [];

  if (pageErrors.length) issues.push(`${pageErrors.length} browser page error(s)`);
  if (failedRequests.length) issues.push(`${failedRequests.length} failed request(s)`);
  if (common.failedImageCount) issues.push(`${common.failedImageCount} failed image(s)`);
  if (common.bodyOverflowX) issues.push("horizontal body overflow");
  if (common.forbiddenVisibleCopy.length) issues.push(`forbidden visible copy: ${common.forbiddenVisibleCopy.join(", ")}`);

  let details = {};
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
    if (!teacherFlowDetails?.hasQuickRecord) issues.push("teacher flow recent ledger record missing");
    if (!teacherFlowDetails?.hasAiRecord) issues.push("teacher flow AI confirmation ledger record missing");
    if (!teacherFlowDetails?.noAiLedgerBeforeConfirm) issues.push("AI suggestion entered ledger before teacher confirmation");
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
      issues.push("AI-confirmed ledger contract fields missing");
    }
    if (!teacherFlowDetails?.homeFocused) issues.push("teacher flow home focus did not sync selected child");
    if (!teacherFlowDetails?.homeHasRecord) issues.push("teacher flow home recent record missing");
  }

  if (check.kind === "moral-speak-flow") {
    details = { flow: moralFlowDetails };
    if (moralFlowDetails?.completedChildCount !== 3) issues.push("moral speak did not complete 3 children");
    if (moralFlowDetails?.uniqueChildCount !== 3) issues.push("moral speak did not cover 3 unique children");
    if (moralFlowDetails?.mapEntryCount !== 3) issues.push("moral speak was not opened from map for all children");
    if (moralFlowDetails?.ready?.stage !== "ready") issues.push("moral speak did not enter ready stage");
    if (moralFlowDetails?.pending?.stage !== "pendingReview") issues.push("moral speak did not enter teacher review");
    if (
      moralFlowDetails?.pending?.selfServiceRecordCount !== moralFlowDetails?.ready?.selfServiceRecordCount
    ) {
      issues.push("moral speak entered ledger before teacher confirmation");
    }
    if (!moralFlowDetails?.pending?.teacherCardText.includes("通过")) issues.push("moral speak teacher card missing");
    if (!moralFlowDetails?.pending?.childBubbleText || moralFlowDetails.pending.childBubbleText.length > 12) {
      issues.push("moral speak child bubble missing or too long");
    }
    if (moralFlowDetails?.success?.stage !== "success") issues.push("moral speak success stage missing");
    if (!moralFlowDetails?.success?.successBubble || moralFlowDetails.success.successBubble.includes("自助成长")) {
      issues.push("moral speak success bubble is missing or too verbose");
    }
    if (moralFlowDetails?.success?.hasTeacherCard) issues.push("moral speak teacher card did not close on success");
    if (moralFlowDetails?.final?.stage !== "idle") issues.push("moral speak did not return to idle");
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
      if (childFlow.pending?.stage !== "pendingReview") issues.push(`moral speak child ${index + 1} review stage missing`);
      if (childFlow.pending?.selfServiceRecordCount !== childFlow.ready?.selfServiceRecordCount) {
        issues.push(`moral speak child ${index + 1} entered ledger before confirmation`);
      }
      if (childFlow.success?.stage !== "success") issues.push(`moral speak child ${index + 1} success stage missing`);
      if (childFlow.success?.hasTeacherCard) issues.push(`moral speak child ${index + 1} teacher card stayed open`);
      if (childFlow.final?.stage !== "idle") issues.push(`moral speak child ${index + 1} did not return idle`);
      if (!childFlow.final?.singleLedgerWrite) issues.push(`moral speak child ${index + 1} ledger write count mismatch`);
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

  if (check.kind === "moral-review-safety") {
    details = { flow: moralReviewSafetyDetails };
    const low = moralReviewSafetyDetails?.lowConfidence;
    if (!low?.start?.started) issues.push("low-confidence review did not start through QA hook");
    if (low?.pending?.stage !== "pendingReview") issues.push("low-confidence review did not enter pending stage");
    if (low?.pending?.result?.delta !== 0) issues.push("low-confidence review should not suggest XP");
    if (!low?.pending?.approveDisabled) issues.push("low-confidence review approve button should be disabled");
    if (!low?.ledgerUnchanged) issues.push("low-confidence review entered ledger without teacher decision");
    if (low?.afterDefer?.stage !== "idle") issues.push("low-confidence review did not return idle after defer");

    const negative = moralReviewSafetyDetails?.negative;
    if (!negative?.start?.started) issues.push("negative review did not start through QA hook");
    if (negative?.pending?.stage !== "pendingReview") issues.push("negative review did not enter pending stage");
    if (negative?.pending?.result?.delta >= 0) issues.push("negative review should be detected as a negative suggestion");
    if (!negative?.pending?.approveDisabled) issues.push("negative review approve button should be disabled before adjustment");
    if (!negative?.noDirectLedger) issues.push("negative review entered ledger before adjustment");
    if (!negative?.afterAdjust?.result?.delta || negative.afterAdjust.result.delta <= 0) {
      issues.push("negative review adjustment did not set a positive teacher decision");
    }
    if (negative?.afterAdjust?.approveDisabled) issues.push("adjusted review approve button stayed disabled");
    if (!negative?.final?.hasPositiveLedger) issues.push("adjusted review did not create an approved positive ledger record");
    if (!negative?.noNegativeLedger) issues.push("negative AI suggestion created a negative ledger record");
  }

  if (check.kind === "voice-flow") {
    details = { flow: voiceFlowDetails };
    if (!voiceFlowDetails?.name) issues.push("voice flow selected child missing");
    if (!voiceFlowDetails?.hasSuggestion) issues.push("voice flow suggestion result missing");
    if (voiceFlowDetails?.delta !== voiceFlowDetails?.aiDelta || voiceFlowDetails?.aiDelta === 0) {
      issues.push("voice flow confirmed XP delta missing");
    }
    if (!voiceFlowDetails?.hasHistoryRecord) issues.push("voice flow ledger history missing");
    if (!voiceFlowDetails?.noAiLedgerBeforeConfirm) issues.push("voice flow entered ledger before teacher confirmation");
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

  if (check.kind === "math-flow") {
    details = { flow: mathFlowDetails };
    if (!mathFlowDetails?.playerName) issues.push("math flow player missing");
    if (!mathFlowDetails?.questionSeen) issues.push("math flow question missing");
    if (!mathFlowDetails?.hpSeen) issues.push("math flow HP state missing");
    if (!mathFlowDetails?.battleLogWinner) issues.push("math flow winner log missing");
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
    if (!mathFlowDetails?.homeFocused) issues.push("math flow home focus did not sync winner");
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
      if (!profile?.heroHasExpectedXp) issues.push(`profile flow ${source} XP mismatch`);
      if (!profile?.hasSpirit) issues.push(`profile flow ${source} spirit missing`);
      if (!profile?.hasTimelineRecord) issues.push(`profile flow ${source} timeline record missing`);
      if (!profile?.evidenceHasRecordCount) issues.push(`profile flow ${source} evidence record count mismatch`);
      if (!profile?.evidenceHasPositiveXp) issues.push(`profile flow ${source} positive XP mismatch`);
      if (!profile?.hasDimensionStats) issues.push(`profile flow ${source} dimension stats missing`);
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
    const fps = await measureFrameRate(page, ".world-map-stage");
    const wheelFps = await measureHomeWheel(page);
    const renderState = await inspectPixiRenderState(page);
    const bigScreen = await inspectHomeBigScreen(page);
    details = { fps, wheelFps, renderState, bigScreen };
    if (!bigScreen.hasSelectedChild) issues.push("home selected child is not visible");
    if (bigScreen.mapShare < 0.75) issues.push(`home map does not dominate workspace: ${bigScreen.mapShare}`);
    if (bigScreen.largeHeadings.length) issues.push("home contains oversized heading(s)");
    if (bigScreen.noisyCopy.length) issues.push(`home contains noisy explanatory copy: ${bigScreen.noisyCopy.join(", ")}`);
    if (bigScreen.horizontalOverflow) issues.push("home horizontal overflow");
    if (pngBytes > 40 * oneMb) warnings.push(`home requested ${(pngBytes / oneMb).toFixed(1)} MB of PNG assets`);
    if (pngCount > 35) warnings.push(`home requested ${pngCount} PNG asset(s)`);
    if (fps.fps < 30) warnings.push(`home frame sample is low: ${fps.fps} FPS`);
    if (wheelFps && wheelFps.fps < 24) warnings.push(`home wheel frame sample is low: ${wheelFps.fps} FPS`);
  }

  if (check.kind === "leaderboard-flow") {
    details = { flow: leaderboardFlowDetails };
    if ((leaderboardFlowDetails?.rowCount ?? 0) < 30) issues.push("leaderboard does not show the full class");
    if (leaderboardFlowDetails?.topThreeCount !== 0) issues.push("leaderboard podium should be removed");
    if ((leaderboardFlowDetails?.rowAvatarCount ?? 0) < (leaderboardFlowDetails?.rowCount ?? 0)) {
      issues.push("leaderboard rows are missing spirit avatars");
    }
    if (leaderboardFlowDetails?.decorativePanelCount !== 0) issues.push("leaderboard decorative side panels should be removed");
    if (!leaderboardFlowDetails?.sortedByRank) issues.push("leaderboard rows are not ranked in order");
    if (!leaderboardFlowDetails?.sortedByXp) issues.push("leaderboard rows are not sorted by XP");
    if (!leaderboardFlowDetails?.homeFocused) issues.push("leaderboard home focus failed");
  }

  if (check.kind === "lottery-flow") {
    details = { flow: lotteryFlowDetails };
    if (!lotteryFlowDetails?.activeChildIsFanFan) issues.push("lottery selected child did not update");
    if (!lotteryFlowDetails?.hasPrizeResult) issues.push("lottery result missing after draw");
    if (!lotteryFlowDetails?.hasHistory) issues.push("lottery local history missing");
    if (!lotteryFlowDetails?.ledgerUnchanged) issues.push("lottery changed XP ledger");
    if (!lotteryFlowDetails?.homeFocused) issues.push("lottery home focus failed");
  }

  if (check.kind === "shop-flow") {
    details = { flow: shopFlowDetails };
    if (!shopFlowDetails?.hasInsufficientState) issues.push("shop insufficient XP state missing");
    if (!shopFlowDetails?.hasAvailableState) issues.push("shop available XP state missing");
    if (!shopFlowDetails?.hasBalance) issues.push("shop XP balance missing");
    if (!shopFlowDetails?.ledgerUnchanged) issues.push("shop changed XP ledger");
    if (!shopFlowDetails?.homeFocused) issues.push("shop home focus failed");
  }

  if (check.kind === "data-flow") {
    details = { flow: dataFlowDetails };
    if (!dataFlowDetails?.hasSearchResult) issues.push("data management child search failed");
    if (!dataFlowDetails?.hasLedgerRows) issues.push("data management ledger rows missing");
    if (!dataFlowDetails?.hasPendingReview) issues.push("data management pending review display missing");
    if (!dataFlowDetails?.hasNoTable) issues.push("data management uses a dense table");
    if ((dataFlowDetails?.pendingReviewCount ?? 0) < 1) issues.push("data management pending review was not created");
  }

  if (check.kind === "roll-call") {
    details = { action: actionDetails };
    if (!actionDetails?.hasTitle) issues.push("roll call title missing");
    if (!actionDetails?.hasDrawnStatus) issues.push("roll call draw status missing after draw");
    if (!actionDetails?.hasAvatar) issues.push("roll call selected child avatar missing");
    if (!actionDetails?.hasFocusAction) issues.push("roll call focus action missing");
    if (!actionDetails?.hasRecordAction) issues.push("roll call quick record action missing");
    if (!actionDetails?.homeFocused) issues.push("roll call did not focus drawn child on home");
    if (!actionDetails?.readyForSelfService) issues.push("roll call did not open self-service ready state on home");
  }

  if (check.kind === "module") {
    const moduleDetails = await inspectModulePage(page, check.selector);
    details = { module: moduleDetails };
    if (!moduleDetails.exists) issues.push(`${check.name} module root missing`);
  }

  await page.close();

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

const browser = await chromium.launch({ headless: true });
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
