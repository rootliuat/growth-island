/**
 * [INPUT]: 依赖 node:buffer、Playwright Page、home-tools 的 Pixi idle 同步与 data-management-assertions 的分类统计契约。
 * [OUTPUT]: 对外提供记录港、园所运营、设置舵盘、通用 Module 与对应移动端 QA 流程函数。
 * [POS]: scripts/qa 的课堂运营检查 Module，由 runner 调度，不拥有浏览器生命周期或报告汇总。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Buffer } from "node:buffer";
import { matchesCategoryAnalytics } from "./data-management-assertions.mjs";
import { waitForPixiIdle } from "./home-tools.mjs";

export async function exerciseDataManagementFlow(page, dataScreenshot) {
  await page.waitForSelector(".data-page");
  const harborSceneDetails = await page.evaluate(() => {
    const pageText = document.querySelector(".data-page")?.textContent ?? "";
    const drawer = document.querySelector(".data-tools-drawer");
    return {
      hasHarborScene:
        pageText.includes("记录港") &&
        (pageText.includes("本机账本") || pageText.includes("成长账本")) &&
        pageText.includes("待老师看") &&
        pageText.includes("最近入港记录") &&
        pageText.includes("账本潮汐") &&
        pageText.includes("班级船员") &&
        pageText.includes("港口保险箱"),
      toolsDrawerReachable:
        drawer instanceof HTMLDetailsElement &&
        (drawer.querySelector("summary")?.textContent ?? "").includes("账本工具"),
      noAdminTitle: !pageText.includes("数据管理"),
      forbiddenCopy: ["AI 记录", "AI 建议", "待复核", "待靠岸复核", "通过", "驳回", "数据管理", "后台", "管理"].filter((copy) =>
        pageText.includes(copy),
      ),
    };
  });
  await page.screenshot({ path: dataScreenshot, fullPage: false });
  const toolsDrawer = page.locator(".data-tools-drawer").first();
  if ((await toolsDrawer.count()) > 0) {
    const isOpen = await toolsDrawer.evaluate((node) => node instanceof HTMLDetailsElement && node.open);
    if (!isOpen) await toolsDrawer.locator("summary").click();
    await page.waitForSelector(".data-drawer-panel", { timeout: 4000 });
  }
  const originalBackup = await page.evaluate(() => window.__growthIslandCreateBackupForQa?.());
  const importPayload = await page.evaluate(() => {
    const backup = window.__growthIslandCreateBackupForQa?.();
    const beforeLedgerCount = window.__growthIslandLedger?.length ?? 0;
    if (!backup || backup.children.length === 0) {
      return {
        backup: undefined,
        imported: undefined,
        beforeLedgerCount,
        hasBackupPanel: Boolean(document.querySelector(".data-backup-panel")),
        backupContract: false,
      };
    }

    const child = backup.children[0];
    const imported = {
      ...backup,
      exportedAt: new Date().toISOString(),
      organization: {
        activeCurriculumByClassroomId: {
          ...(backup.organization?.activeCurriculumByClassroomId ?? {}),
          "middle-2": "rule-keeper-week",
        },
        parentReportReviewsByChildId: {
          ...(backup.organization?.parentReportReviewsByChildId ?? {}),
          [child.id]: {
            childId: child.id,
            status: "approved",
            updatedAt: new Date().toISOString(),
            reviewedBy: "QA",
          },
        },
      },
      ledger: [
        {
          id: `qa-import-${Date.now()}`,
          childId: child.id,
          operatorChildId: child.id,
          operatorRole: "teacher",
          delta: 10,
          source: "manual",
          category: "积极阳光",
          reason: "QA 导入验证",
          aiSuggested: false,
          reviewStatus: "not_required",
          createdAt: new Date().toISOString(),
        },
        ...backup.ledger,
      ],
    };

    return {
      backup,
      imported,
      beforeLedgerCount,
      hasBackupPanel: (document.querySelector(".data-backup-panel")?.textContent ?? "").includes("导出备份"),
      backupContract:
        backup.product === "beihai-growth-island" &&
        backup.schemaVersion === 1 &&
        backup.children.length > 0 &&
        Array.isArray(backup.ledger) &&
        Array.isArray(backup.moralReviews) &&
        Array.isArray(backup.shopRedemptions) &&
        Array.isArray(backup.lotteryDraws) &&
        typeof backup.settings?.teacherMode === "boolean" &&
        backup.organization?.activeCurriculumByClassroomId &&
        typeof backup.organization.activeCurriculumByClassroomId === "object" &&
        backup.organization?.parentReportReviewsByChildId &&
        typeof backup.organization.parentReportReviewsByChildId === "object",
    };
  });
  const { backup: _backup, imported: importedBackup, beforeLedgerCount, ...backupDetails } = importPayload;

  let restorePreviewDetails = {
    hasRestorePreview: false,
    restoreRequiresConfirmation: false,
    restoreContract: false,
    localBackupPersisted: false,
  };

  if (importedBackup) {
    await page.locator(".data-import-input").setInputFiles({
      name: "qa-import.json",
      mimeType: "application/json",
      buffer: Buffer.from(`${JSON.stringify(importedBackup)}\n`),
    });
    await page.waitForSelector(".data-restore-review", { timeout: 4000 });
    restorePreviewDetails = await page.evaluate(({ beforeLedgerCount }) => {
      const previewText = document.querySelector(".data-restore-review")?.textContent ?? "";
      const currentLedgerCount = window.__growthIslandLedger?.length ?? 0;
      return {
        hasRestorePreview: previewText.includes("恢复前确认") && previewText.includes("导入会覆盖当前本机记录"),
        restoreRequiresConfirmation: currentLedgerCount === beforeLedgerCount && previewText.includes("确认恢复"),
        restoreContract: false,
        localBackupPersisted: false,
      };
    }, { beforeLedgerCount });
    await page.getByRole("button", { name: /确认恢复/ }).click();
    await page.waitForFunction(() => (window.__growthIslandLedger ?? []).some((record) => record.reason === "QA 导入验证"));
    const restoreAfter = await page.evaluate(({ beforeLedgerCount }) => {
      const stored = window.localStorage.getItem("growth-island-classroom-backup") ?? "";
      const backup = window.__growthIslandCreateBackupForQa?.();
      return {
        restoreContract:
          (window.__growthIslandLedger ?? []).length === beforeLedgerCount + 1 &&
          backup?.organization?.activeCurriculumByClassroomId?.["middle-2"] === "rule-keeper-week" &&
          Object.values(backup?.organization?.parentReportReviewsByChildId ?? {}).some((review) => review.status === "approved"),
        localBackupPersisted:
          stored.includes("QA 导入验证") &&
          stored.includes("beihai-growth-island") &&
          stored.includes('"organization"') &&
          stored.includes("rule-keeper-week") &&
          stored.includes('"parentReportReviewsByChildId"'),
      };
    }, { beforeLedgerCount });
    restorePreviewDetails = { ...restorePreviewDetails, ...restoreAfter };
  }

  await page.waitForFunction(() => (window.__growthIslandLedger ?? []).some((record) => record.reason === "QA 导入验证"));
  await page.getByRole("button", { name: /近30天/ }).click();
  await page.locator(".data-category-strip button").filter({ hasText: "积极阳光" }).click();
  await page.fill("#data-search", "帆帆");
  await page.waitForTimeout(250);
  const details = await page.evaluate(() => {
    const toolbarText = document.querySelector(".data-toolbar")?.textContent ?? "";
    const backupText = document.querySelector(".data-backup-panel")?.textContent ?? "";
    const insightText = document.querySelector(".data-insight-panel")?.textContent ?? "";
    const drawerText = document.querySelector(".data-tools-drawer")?.textContent ?? "";
    const activeScopeText = document.querySelector(".data-scope-tabs button.active")?.textContent ?? "";
    const activeCategoryText = document.querySelector(".data-category-strip button.active")?.textContent ?? "";
    const recordScopeText = document.querySelector(".data-record-panel .data-panel-title span")?.textContent ?? "";
    const childText = document.querySelector(".data-child-list")?.textContent ?? "";
    const recordText = document.querySelector(".data-record-list")?.textContent ?? "";
    const reviewText = document.querySelector(".data-review-list")?.textContent ?? "";
    const pendingReviews = (window.__growthIslandReviews ?? []).filter((review) => review.status === "pending_review");
    const metricValues = [...document.querySelectorAll(".data-insight-metrics article strong")].map((metric) =>
      Number((metric.textContent ?? "").replace(/[^\d-]/g, "")),
    );
    return {
      toolbarText,
      childText,
      recordText,
      reviewText,
      pendingReviewCount: pendingReviews.length,
      hasBackupActions: backupText.includes("导出备份") && backupText.includes("导入恢复"),
      hasInsightPanel: insightText.includes("账本潮汐") && insightText.includes("活跃孩子") && insightText.includes("有效记录"),
      hasScopeMetrics:
        (insightText.includes("近30天 能量") || insightText.includes("近30天 XP")) &&
        insightText.includes("活跃孩子") &&
        insightText.includes("有效记录"),
      hasFilterTools: drawerText.includes("账本筛选") && drawerText.includes("记录范围") && drawerText.includes("近7天") && drawerText.includes("近30天"),
      hasVirtueStats: document.querySelectorAll(".data-category-strip button").length >= 8 && drawerText.includes("积极阳光"),
      scopeFilterApplied: activeScopeText.includes("近30天") && recordScopeText.includes("近30天"),
      categoryFilterApplied: activeCategoryText.includes("积极阳光") && toolbarText.includes("积极阳光"),
      categoryAnalyticsInput: {
        records: window.__growthIslandLedger ?? [],
        metrics: { xpDelta: metricValues[0], childCount: metricValues[1], activeRecordCount: metricValues[2] },
        category: "积极阳光",
        scopeDays: 30,
        now: Date.now(),
      },
      hasSearchResult: childText.includes("帆帆"),
      hasLedgerRows: recordText.includes("帆帆") || recordText.includes("已有成长 XP"),
      hasPendingReview: reviewText.includes("帆帆") && reviewText.includes("记入") && reviewText.includes("不采用"),
      hasNoTable: document.querySelectorAll(".data-page table").length === 0,
    };
  });
  details.categoryTotalsMatch = matchesCategoryAnalytics(details.categoryAnalyticsInput);
  delete details.categoryAnalyticsInput;
  const clearPermissionBefore = await page.evaluate(() => {
    const privacyText = document.querySelector(".data-privacy-note")?.textContent ?? "";
    const clearText = document.querySelector(".data-clear-card")?.textContent ?? "";
    const clearInput = document.querySelector(".data-clear-input");
    const clearButton = document.querySelector(".data-clear-card button");
    return {
      hasPrivacyNote: privacyText.includes("当前设备浏览器") && privacyText.includes("导出备份"),
      hasClearPermission:
        clearText.includes("清空演示数据") &&
        clearInput instanceof HTMLInputElement &&
        clearInput.placeholder.includes("清空演示数据"),
      clearDisabledBeforePhrase: clearButton instanceof HTMLButtonElement ? clearButton.disabled : false,
    };
  });
  await page.fill(".data-clear-input", "清空演示数据");
  await page.locator(".data-clear-card button").click();
  await page.waitForFunction(() => (window.__growthIslandLedger ?? []).length === 0);
  const clearDetails = await page.evaluate(() => {
    const stored = window.localStorage.getItem("growth-island-classroom-backup") ?? "";
    const backup = window.__growthIslandCreateBackupForQa?.();
    return {
      clearContract:
        (window.__growthIslandLedger ?? []).length === 0 &&
        (window.__growthIslandReviews ?? []).length === 0 &&
        (window.__growthIslandShopRedemptions ?? []).length === 0 &&
        (window.__growthIslandLotteryDraws ?? []).length === 0 &&
        (backup?.children.length ?? 0) > 0 &&
        Object.keys(backup?.organization?.activeCurriculumByClassroomId ?? {}).length === 0 &&
        Object.keys(backup?.organization?.parentReportReviewsByChildId ?? {}).length === 0,
      clearPersisted:
        stored.includes('"ledger": []') &&
        stored.includes('"moralReviews": []') &&
        stored.includes('"activeCurriculumByClassroomId": {}') &&
        stored.includes('"parentReportReviewsByChildId": {}'),
    };
  });
  if (originalBackup) {
    await page.evaluate((backup) => window.__growthIslandRestoreBackupForQa?.(backup), originalBackup);
  }
  await page.evaluate(() => {
    const drawer = document.querySelector(".data-tools-drawer");
    if (drawer instanceof HTMLDetailsElement) drawer.open = false;
  });
  await page.waitForTimeout(160);
  return { ...harborSceneDetails, ...details, ...backupDetails, ...restorePreviewDetails, ...clearPermissionBefore, ...clearDetails };
}

export async function exerciseOrganizationFlow(page, organizationScreenshot, homeScreenshot) {
  await page.waitForSelector(".organization-page");
  const initial = await page.evaluate(() => {
    const text = document.body.innerText;
    const summaryText = document.querySelector(".organization-summary")?.textContent ?? "";
    const classButtons = [...document.querySelectorAll(".organization-class-list button")].map((button) => button.textContent ?? "");
    return {
      hasTitle: text.includes("班级码头") && text.includes("北海幼儿园"),
      hasSummary:
        summaryText.includes("北海幼儿园") &&
        summaryText.includes("泊位") &&
        summaryText.includes("船员") &&
        summaryText.includes("任务") &&
        summaryText.includes("航线"),
      hasOperatingCopy:
        text.includes("班级泊位") &&
        text.includes("船员协作") &&
        text.includes("孩子任务对象") &&
        text.includes("课程航线") &&
        text.includes("今日任务板"),
      noReportCopy: !/报告|家书|巡检|审批|审核|导出|盖章|退回/.test(text),
      noBackendCopy:
        !text.includes("园所后台") &&
        !text.includes("后台") &&
        !text.includes("运营") &&
        !text.includes("系统") &&
        !text.includes("配置"),
      classroomCount: classButtons.length,
      classButtons,
      childButtonCount: document.querySelectorAll(".organization-report-list button").length,
      teacherCardCount: document.querySelectorAll(".organization-teacher-list article").length,
      taskCount: document.querySelectorAll(".organization-task-list article").length,
      trackCount: document.querySelectorAll(".organization-track-list article").length,
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
    };
  });

  await page.locator(".organization-class-list button").filter({ hasText: "中二班" }).first().click();
  await page.waitForTimeout(200);
  const selectedClass = await page.evaluate(() => {
    const activeText = document.querySelector(".organization-class-list button.active")?.textContent ?? "";
    const classroomText = document.querySelector(".organization-classroom-panel")?.textContent ?? "";
    const reportText = document.querySelector(".organization-report-panel")?.textContent ?? "";
    const curriculumText = document.querySelector(".organization-curriculum-panel")?.textContent ?? "";
    const taskText = document.querySelector(".organization-task-panel")?.textContent ?? "";
    const childButtons = document.querySelectorAll(".organization-report-list button");
    const activeClassChildCount = Number(activeText.match(/(\d+)\s*名/)?.[1] ?? 0);
    return {
      activeText,
      classroomText,
      reportText,
      curriculumText,
      taskText,
      selectedMiddleClass:
        activeText.includes("中二班") &&
        classroomText.includes("中二班") &&
        classroomText.includes("成长贝壳") &&
        classroomText.includes("当前任务"),
      hasTeachers: classroomText.includes("吴老师") && classroomText.includes("陈主任"),
      hasCurriculum: curriculumText.includes("课程航线") && curriculumText.includes("小小帮手周"),
      hasTasks: taskText.includes("今日任务板") && taskText.includes("主动整理玩具"),
      hasChildTaskPanel:
        reportText.includes("孩子任务对象") &&
        reportText.includes("当前孩子") &&
        reportText.includes("看精灵") &&
        childButtons.length >= 1,
      allChildrenReachable: activeClassChildCount > 0 && childButtons.length >= activeClassChildCount,
      noReportCopy: !/报告|家书|巡检|审批|审核|导出|盖章|退回/.test(reportText),
    };
  });

  const childButtonText = await page.locator(".organization-report-list button").first().innerText();
  const childName =
    childButtonText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)[0] ?? "";
  await page.locator(".organization-report-list button").first().click();
  await page.waitForSelector(".organization-report-preview", { timeout: 4000 });
  const childPanel = await page.evaluate(({ childName }) => {
    const previewText = document.querySelector(".organization-report-preview")?.textContent ?? "";
    const activeChildText = document.querySelector(".organization-report-list button.active")?.textContent ?? "";
    return {
      childName,
      activeChildSelected: Boolean(childName) && activeChildText.includes(childName),
      hasPreview: previewText.includes("当前孩子") && previewText.includes("任务板"),
      hasEnergySummary: previewText.includes("能量"),
      hasFocusAction: previewText.includes("看精灵"),
      noReportActions: !/报告|家书|巡检|审批|审核|导出|盖章|退回/.test(previewText),
    };
  }, { childName });
  await page
    .locator(".organization-track-list article")
    .filter({ hasText: "规则守护周" })
    .getByRole("button", { name: /启航本周/ })
    .click();
  await page.waitForFunction(() => {
    const curriculumText = document.querySelector(".organization-curriculum-panel")?.textContent ?? "";
    const taskText = document.querySelector(".organization-task-panel")?.textContent ?? "";
    return curriculumText.includes("中二班已启航「规则守护周」") && taskText.includes("当前航线任务");
  });
  const curriculumPublication = await page.evaluate(() => {
    const curriculumText = document.querySelector(".organization-curriculum-panel")?.textContent ?? "";
    const taskText = document.querySelector(".organization-task-panel")?.textContent ?? "";
    const activeTrackText = document.querySelector(".organization-track-list article.active")?.textContent ?? "";
    const firstTaskText = document.querySelector(".organization-task-list article")?.textContent ?? "";
    return {
      activeRuleWeek: activeTrackText.includes("规则守护周") && activeTrackText.includes("当前航线"),
      noticeShown: curriculumText.includes("中二班已启航「规则守护周」"),
      currentTaskShifted: firstTaskText.includes("排队守规则") && firstTaskText.includes("当前航线任务"),
      helperTaskStillVisible: taskText.includes("主动整理玩具"),
    };
  });
  await page.waitForFunction(() => {
    const backup = window.__growthIslandCreateBackupForQa?.();
    return (
      window.__growthIslandOrganizationState?.activeCurriculumByClassroomId?.["middle-2"] === "rule-keeper-week" &&
      backup?.organization?.activeCurriculumByClassroomId?.["middle-2"] === "rule-keeper-week"
    );
  });
  const curriculumPersistenceBeforeReload = await page.evaluate(() => {
    const backup = window.__growthIslandCreateBackupForQa?.();
    const stored = window.localStorage.getItem("growth-island-classroom-backup") ?? "";
    return {
      appStatePersisted: window.__growthIslandOrganizationState?.activeCurriculumByClassroomId?.["middle-2"] === "rule-keeper-week",
      backupContractPersisted: backup?.organization?.activeCurriculumByClassroomId?.["middle-2"] === "rule-keeper-week",
      localBackupPersisted: stored.includes('"organization"') && stored.includes("rule-keeper-week"),
    };
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".organization-page");
  await page.locator(".organization-class-list button").filter({ hasText: "中二班" }).first().click();
  await page.waitForFunction(() => {
    const activeTrackText = document.querySelector(".organization-track-list article.active")?.textContent ?? "";
    const firstTaskText = document.querySelector(".organization-task-list article")?.textContent ?? "";
    return activeTrackText.includes("规则守护周") && firstTaskText.includes("排队守规则") && firstTaskText.includes("当前航线任务");
  });
  const curriculumPersistenceAfterReload = await page.evaluate(() => {
    const activeTrackText = document.querySelector(".organization-track-list article.active")?.textContent ?? "";
    const firstTaskText = document.querySelector(".organization-task-list article")?.textContent ?? "";
    return {
      activeAfterReload: activeTrackText.includes("规则守护周") && activeTrackText.includes("当前航线"),
      taskContextAfterReload: firstTaskText.includes("排队守规则") && firstTaskText.includes("当前航线任务"),
      appStateAfterReload: window.__growthIslandOrganizationState?.activeCurriculumByClassroomId?.["middle-2"] === "rule-keeper-week",
    };
  });
  let taskTargetReportName = "";
  const taskReportButtons = page.locator(".organization-report-list button");
  const taskReportButtonCount = await taskReportButtons.count();
  for (let index = 0; index < taskReportButtonCount; index += 1) {
    await taskReportButtons.nth(index).click();
    await page.waitForTimeout(120);
    const taskButton = page.locator(".organization-task-list article").filter({ hasText: "排队守规则" }).getByRole("button", { name: /完成/ });
    const taskButtonDisabled = await taskButton.evaluate((button) => button instanceof HTMLButtonElement && button.disabled);
    if (!taskButtonDisabled) {
      const targetText = await taskReportButtons.nth(index).innerText();
      taskTargetReportName =
        targetText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)[0] ?? "";
      break;
    }
  }
  const taskBefore = await page.evaluate(() => {
    const matchingRecords = (window.__growthIslandLedger ?? []).filter(
      (record) => record.reason === "成长任务：排队守规则",
    );
    return {
      matchingCount: matchingRecords.length,
      ledgerCount: (window.__growthIslandLedger ?? []).length,
    };
  });
  if (taskTargetReportName) {
    await page.locator(".organization-task-list article").filter({ hasText: "排队守规则" }).getByRole("button", { name: /完成/ }).click();
    await page.waitForFunction(
      ({ previousCount }) =>
        (window.__growthIslandLedger ?? []).filter((record) => record.reason === "成长任务：排队守规则").length > previousCount,
      { previousCount: taskBefore.matchingCount },
      { timeout: 4000 },
    );
  }
  const taskCompletion = await page.evaluate(({ previousCount, previousLedgerCount }) => {
    const records = (window.__growthIslandLedger ?? [])
      .filter((record) => record.reason === "成长任务：排队守规则")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = records[0];
    const taskText = document.querySelector(".organization-task-panel")?.textContent ?? "";
    return {
      recordAdded: records.length === previousCount + 1 && (window.__growthIslandLedger ?? []).length >= previousLedgerCount + 1,
      taskPanelUpdated: taskText.includes("已完成") && taskText.includes("成长任务：") === false,
      noticeShown: taskText.includes("已完成「排队守规则」"),
      ledgerContract: latest
        ? {
            hasChildId: Boolean(latest.childId),
            delta: latest.delta,
            source: latest.source,
            category: latest.category,
            operatorRole: latest.operatorRole,
            aiSuggested: latest.aiSuggested,
            reviewStatus: latest.reviewStatus,
            reason: latest.reason,
          }
        : undefined,
    };
  }, { previousCount: taskBefore.matchingCount, previousLedgerCount: taskBefore.ledgerCount });
  const taskRepeatGuard = await page.evaluate(({ expectedCount }) => {
    const article = [...document.querySelectorAll(".organization-task-list article")].find((candidate) =>
      (candidate.textContent ?? "").includes("排队守规则"),
    );
    const button = article?.querySelector("button");
    const matchingCount = (window.__growthIslandLedger ?? []).filter(
      (record) => record.reason === "成长任务：排队守规则",
    ).length;
    return {
      buttonDisabled: button instanceof HTMLButtonElement ? button.disabled : false,
      buttonText: button?.textContent ?? "",
      noDuplicateRecord: matchingCount === expectedCount,
    };
  }, { expectedCount: taskBefore.matchingCount + 1 });
  await page.screenshot({ path: organizationScreenshot, fullPage: false });
  const focusReportText = await page.locator(".organization-report-list button.active").innerText();
  const focusReportName =
    focusReportText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)[0] ?? taskTargetReportName;
  await page.locator(".organization-report-actions button").filter({ hasText: "看精灵" }).click();
  await page.waitForSelector(".home-module", { timeout: 5000 });
  await page.waitForTimeout(900);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });
  const home = await page.evaluate(({ reportName }) => {
    const homeText = document.querySelector(".hud-rail")?.textContent ?? document.body.innerText;
    return {
      reportName,
      selectedChildId: window.__growthIslandSelectedChildId,
      homeFocused: Boolean(reportName) && homeText.includes(reportName),
      homeText,
    };
  }, { reportName: focusReportName });

  return {
    initial,
    selectedClass,
    childPanel,
    curriculumPublication,
    curriculumPersistence: {
      ...curriculumPersistenceBeforeReload,
      ...curriculumPersistenceAfterReload,
    },
    taskCompletion,
    taskRepeatGuard: { ...taskRepeatGuard, targetSelected: Boolean(taskTargetReportName) },
    home,
    homeScreenshot,
  };
}

export async function exerciseSettingsFlow(page, settingsScreenshot, homeScreenshot) {
  await page.waitForSelector(".settings-page");
  const before = await page.evaluate(() => ({
    teacherMode: window.__growthIslandTeacherMode,
    changeCount: (window.__growthIslandSettingsChanges ?? []).length,
    ledgerCount: (window.__growthIslandLedger ?? []).length,
  }));

  await page.getByRole("button", { name: /开启掌舵|收起掌舵/ }).first().click();
  await page.waitForFunction(
    ({ previous }) => window.__growthIslandTeacherMode !== previous,
    { previous: before.teacherMode },
  );
  await page.getByRole("button", { name: /保存舵盘/ }).click();
  await page.waitForFunction(
    ({ count }) => (window.__growthIslandSettingsChanges ?? []).length >= count + 2,
    { count: before.changeCount },
  );
  await page.screenshot({ path: settingsScreenshot, fullPage: false });

  const after = await page.evaluate(() => {
    const changes = window.__growthIslandSettingsChanges ?? [];
    return {
      teacherMode: window.__growthIslandTeacherMode,
      changeCount: changes.length,
      ledgerCount: (window.__growthIslandLedger ?? []).length,
      latest: changes[0],
      previous: changes[1],
      panelText: document.querySelector(".settings-action-panel")?.textContent ?? "",
      pageText: document.querySelector(".settings-page")?.textContent ?? "",
      saveCardValue: document.querySelector(".settings-save-card strong")?.textContent?.trim() ?? "",
      firstRecordValue: document.querySelector(".settings-action-list article:first-child em")?.textContent?.trim() ?? "",
    };
  });

  await page.locator(".settings-home-button").click();
  await page.waitForSelector(".home-module");
  await page.waitForTimeout(900);
  await waitForPixiIdle(page);
  await page.screenshot({ path: homeScreenshot, fullPage: false });

  return {
    teacherModeChanged: after.teacherMode !== before.teacherMode,
    savedRecordCreated:
      after.changeCount >= before.changeCount + 2 &&
      after.latest?.key === "settings-save" &&
      after.previous?.key === "teacher-mode",
    recordPanelUpdated:
      after.panelText.includes("舵盘记录") &&
      after.panelText.includes("保存舵盘") &&
      after.panelText.includes("教师掌舵"),
    recordValuesUpdated:
      after.saveCardValue === (after.teacherMode ? "教师掌舵中" : "学生浏览中") &&
      after.firstRecordValue === (after.teacherMode ? "教师掌舵中" : "学生浏览中"),
    sceneCopyUpdated:
      after.pageText.includes("设置舵盘") &&
      after.pageText.includes("教师掌舵") &&
      ["系统设置", "班级配置", "显示模式", "设置记录", "保存当前设置", "开启老师模式", "关闭老师模式"].every(
        (copy) => !after.pageText.includes(copy),
      ),
    ledgerUnchanged: after.ledgerCount === before.ledgerCount,
    homeReturned: true,
    homeScreenshot,
  };
}

export async function inspectMobileSettings(page, screenshot) {
  await page.waitForSelector(".settings-page");
  await page.screenshot({ path: screenshot, fullPage: false });

  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return undefined;
      const r = element.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
      };
    };
    const pageText = document.querySelector(".settings-page")?.textContent ?? "";
    const buttons = [...document.querySelectorAll(".settings-mode-grid button")].map((button) => button.textContent?.trim() ?? "");
    const toggleRect = rect(".settings-mode-grid button[aria-pressed]");
    const saveRect = rect(".settings-save-button");
    const forbiddenCopy = ["系统设置", "班级配置", "显示模式", "设置记录", "保存当前设置", "开启老师模式", "关闭老师模式"].filter((copy) =>
      pageText.includes(copy),
    );

    return {
      hasSceneTitle: pageText.includes("设置舵盘"),
      hasTeacherControl: pageText.includes("教师掌舵") && buttons.some((label) => /开启掌舵|收起掌舵/.test(label)),
      hasSaveAction: buttons.some((label) => /保存舵盘/.test(label)),
      hasRecordRail: pageText.includes("舵盘记录"),
      primaryActionsInFirstViewport:
        Boolean(toggleRect && saveRect) && toggleRect.bottom <= window.innerHeight && saveRect.bottom <= window.innerHeight,
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
      forbiddenCopy,
    };
  });
}

export async function inspectModulePage(page, selector) {
  const drawerSummary = page.locator(".teacher-tools-drawer summary").first();
  const hasTeacherDrawer = (await drawerSummary.count()) > 0;
  if (hasTeacherDrawer) {
    await drawerSummary.click();
    await page.waitForTimeout(120);
  }

  return page.evaluate((moduleSelector) => {
    const root = document.querySelector(moduleSelector);
    if (!root) return { exists: false };
    const rect = root.getBoundingClientRect();
    const dock = document.querySelector(".shell-module-dock");
    const dockRect = dock?.getBoundingClientRect();
    const activeDockButton = document.querySelector(".module-dock-button.active");
    const teacherDrawer = document.querySelector(".teacher-tools-drawer");
    const teacherPanel = document.querySelector(".teacher-tools-panel");
    const teacherPanelRect = teacherPanel?.getBoundingClientRect();
    const dataHeader = root.querySelector(".data-header");
    const dataBackupPanel = root.querySelector(".data-backup-panel");
    const dataHeaderRect = dataHeader?.getBoundingClientRect();
    const dataBackupRect = dataBackupPanel?.getBoundingClientRect();
    return {
      exists: true,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      imageCount: root.querySelectorAll("img").length,
      buttonCount: root.querySelectorAll("button").length,
      hasDock: Boolean(dockRect && dockRect.width > 0 && dockRect.height >= 60),
      hasActiveModuleButton: Boolean(
        activeDockButton?.getClientRects().length ||
          teacherPanel?.querySelector(".active")?.getClientRects().length ||
          [".data-page", ".organization-page", ".settings-page"].includes(moduleSelector),
      ),
      dockDoesNotCoverModule: dockRect ? rect.bottom <= dockRect.top + 1 : false,
      teacherDrawerOpen: Boolean(teacherDrawer?.matches("[open]")),
      teacherToolButtonCount: teacherPanel?.querySelectorAll("button").length ?? 0,
      teacherPanelInViewport:
        teacherPanelRect
          ? teacherPanelRect.left >= -1 &&
            teacherPanelRect.right <= window.innerWidth + 1 &&
            teacherPanelRect.top >= -1 &&
            teacherPanelRect.bottom <= window.innerHeight + 1
          : false,
      noDataHeaderOverlap:
        dataHeaderRect && dataBackupRect
          ? dataHeaderRect.bottom <= dataBackupRect.top + 1
          : true,
    };
  }, selector);
}

export async function inspectMobileDataDrawer(page, screenshot) {
  await page.waitForSelector(".data-page");
  const drawerSummary = page.locator(".data-tools-drawer summary").first();
  if ((await drawerSummary.count()) > 0) {
    await drawerSummary.click();
    await page.waitForSelector(".data-drawer-panel", { timeout: 4000 });
    await page.waitForTimeout(160);
  }
  await page.screenshot({ path: screenshot, fullPage: false });
  return page.evaluate(() => {
    const root = document.querySelector(".data-page");
    const drawer = document.querySelector(".data-tools-drawer");
    const panel = document.querySelector(".data-drawer-panel");
    const panelRect = panel?.getBoundingClientRect();
    const visible = (selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return Boolean(rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth);
    };
    const text = drawer?.textContent ?? "";
    return {
      hasMobileHarbor: Boolean(root?.textContent?.includes("记录港") && root?.textContent?.includes("待老师看")),
      drawerOpen: drawer instanceof HTMLDetailsElement && drawer.open,
      drawerPanelInViewport:
        panelRect
          ? panelRect.left >= -1 &&
            panelRect.right <= innerWidth + 1 &&
            panelRect.top < innerHeight &&
            panelRect.bottom > 0
          : false,
      hasSearch: visible("#data-search"),
      hasFilterTools: text.includes("账本筛选") && text.includes("近7天") && text.includes("近30天") && text.includes("全部维度"),
      hasBackupTools: text.includes("导出备份") && text.includes("导入恢复"),
      hasClearTools: text.includes("清空演示数据") && Boolean(document.querySelector(".data-clear-input")),
      hasRosterTool: text.includes("班级船员名单") && document.querySelectorAll(".data-child-list button").length > 0,
      horizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
    };
  });
}
