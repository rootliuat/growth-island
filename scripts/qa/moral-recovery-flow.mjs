/**
 * [INPUT]: 依赖 Playwright Page、开发期说成长 QA hooks 与 /api/ledger 幂等写入契约。
 * [OUTPUT]: 对外提供 exerciseMoralRecoveryFlow，验证 4xx 可退出、未知写结果恢复、重放锁、老师接管、焦点和下一位动作。
 * [POS]: scripts/qa 的说成长恢复纵切 Module，被 runner 编排且不拥有浏览器生命周期。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

function countMatchingLedger(records, childId, reason) {
  return records.filter((record) => record.childId === childId && record.reason === reason).length;
}

async function clearMoralSpeak(page) {
  await page.evaluate(() => window.__growthIslandClearMoralSpeakForQa?.());
  await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
}

async function exerciseDeterministicApprovalFailure(page) {
  await clearMoralSpeak(page);
  const childId = await page.evaluate(() => window.__growthIslandSelectedChildId);
  const transcript = `我主动帮助同伴整理画笔-${Date.now()}`;
  const reason = `自助成长：${transcript}`;
  const routeHandler = async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    if (body.reason !== reason) return route.continue();
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: "review already handled", code: "review_not_pending", retryable: false }),
    });
  };

  await page.route("**/api/ledger", routeHandler);
  try {
    await page.evaluate((childId) => window.__growthIslandSetMoralRecognizingForQa?.(childId), childId);
    await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "recognizing", null, { timeout: 3500 });
    await page.evaluate(({ childId, transcript }) => {
      window.__growthIslandFinishMoralSpeakForQa?.({ childId, transcript, summary: "确定性驳回" });
    }, { childId, transcript });
    await page.waitForSelector(".teacher-review-corner-card .approve", { timeout: 7000 });
    await page.locator(".teacher-review-corner-card .approve").click();
    await page.waitForFunction(
      () => window.__growthIslandMoralSpeakStage === "error" && window.__growthIslandMoralSpeak?.retryMode === "none",
      null,
      { timeout: 5000 },
    );
    const failure = await page.evaluate(() => ({
      retryMode: window.__growthIslandMoralSpeak?.retryMode,
      syncStatus: window.__growthIslandSyncStatus,
      retryVisible: Boolean(document.querySelector(".moral-retry-button")),
      takeoverVisible: Boolean(document.querySelector(".moral-teacher-takeover")),
      skipVisible: Boolean(document.querySelector(".moral-skip-child")),
      closeVisible: Boolean(document.querySelector(".moral-error-actions .moral-cancel-button")),
    }));
    await page.locator(".moral-error-actions .moral-cancel-button").click();
    await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "idle", null, { timeout: 3500 });
    return { ...failure, afterCloseStage: await page.evaluate(() => window.__growthIslandMoralSpeakStage) };
  } finally {
    await page.unroute("**/api/ledger", routeHandler);
  }
}

async function exerciseUncertainLedgerReplay(page) {
  await clearMoralSpeak(page);
  const seed = await page.evaluate(() => ({
    childId: window.__growthIslandSelectedChildId,
    ledger: window.__growthIslandLedger ?? [],
  }));
  const transcript = `我帮同伴整理画笔-${Date.now()}`;
  const reason = `自助成长：${transcript}`;
  const beforeCount = countMatchingLedger(seed.ledger, seed.childId, reason);
  const operationIds = [];
  let interceptedCount = 0;
  const routeHandler = async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    if (body.reason !== reason) {
      await route.continue();
      return;
    }
    interceptedCount += 1;
    operationIds.push(body.operationId);
    if (interceptedCount <= 2) {
      if (interceptedCount === 1) await route.fetch();
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "response lost after write", code: "classroom_write_failed", retryable: true }),
      });
      return;
    }
    await route.continue();
  };

  await page.route("**/api/ledger", routeHandler);
  try {
    await page.evaluate((childId) => window.__growthIslandSetMoralRecognizingForQa?.(childId), seed.childId);
    await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "recognizing", null, { timeout: 3500 });
    await page.evaluate(({ childId, transcript }) => {
      window.__growthIslandFinishMoralSpeakForQa?.({ childId, transcript, summary: "帮助同伴" });
    }, { childId: seed.childId, transcript });
    await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "pendingReview", null, { timeout: 7000 });
    await page.waitForSelector(".teacher-review-corner-card .approve", { timeout: 5000 });
    const focusInsideReview = await page.evaluate(() => {
      const card = document.querySelector(".teacher-review-corner-card");
      return Boolean(card && document.activeElement && card.contains(document.activeElement));
    });
    await page.locator(".teacher-review-corner-card .approve").click();
    await page.waitForFunction(
      () => window.__growthIslandMoralSpeakStage === "error" && window.__growthIslandMoralSpeak?.retryMode === "reapprove",
      null,
      { timeout: 7000 },
    );
    const failure = await page.evaluate(() => ({
      stage: window.__growthIslandMoralSpeakStage,
      retryMode: window.__growthIslandMoralSpeak?.retryMode,
      syncStatus: window.__growthIslandSyncStatus,
      retryText: document.querySelector(".moral-retry-button")?.textContent?.trim() ?? "",
      takeoverVisible: Boolean(document.querySelector(".moral-teacher-takeover")),
      skipVisible: Boolean(document.querySelector(".moral-skip-child")),
      closeVisible: Boolean(document.querySelector(".moral-error-actions .moral-cancel-button")),
    }));
    await page.locator(".moral-retry-button").click();
    await page.waitForFunction(
      ({ childId, reason, beforeCount }) => {
        const records = window.__growthIslandLedger ?? [];
        return records.filter((record) => record.childId === childId && record.reason === reason).length === beforeCount + 1;
      },
      { childId: seed.childId, reason, beforeCount },
      { timeout: 7000 },
    );
    await page.waitForSelector(".dock-next-child", { timeout: 3000 });
    const beforeNextChildId = await page.evaluate(() => window.__growthIslandSelectedChildId);
    await page.locator(".dock-next-child").click();
    await page.waitForFunction(
      (previousChildId) => window.__growthIslandMoralSpeakStage === "ready" && window.__growthIslandSelectedChildId !== previousChildId,
      beforeNextChildId,
      { timeout: 3500 },
    );
    const final = await page.evaluate(({ childId, reason }) => ({
      matchingLedgerCount: (window.__growthIslandLedger ?? []).filter(
        (record) => record.childId === childId && record.reason === reason,
      ).length,
      nextStage: window.__growthIslandMoralSpeakStage,
      nextChildId: window.__growthIslandSelectedChildId,
      syncStatus: window.__growthIslandSyncStatus,
    }), { childId: seed.childId, reason });
    return { beforeCount, childId: seed.childId, failure, final, focusInsideReview, operationIds };
  } finally {
    await page.unroute("**/api/ledger", routeHandler);
  }
}

async function exerciseTeacherTakeover(page) {
  await clearMoralSpeak(page);
  const seed = await page.evaluate(() => ({
    childId: window.__growthIslandSelectedChildId,
    ledgerCount: (window.__growthIslandLedger ?? []).length,
  }));
  const transcript = `老师补录孩子原话-${Date.now()}`;
  await page.evaluate((childId) => {
    window.__growthIslandForceMoralMicErrorForQa = true;
    window.__growthIslandPrepareMoralSpeakForQa?.(childId);
  }, seed.childId);
  await page.waitForSelector(".moral-mic-button", { timeout: 3500 });
  await page.locator(".moral-mic-button").click();
  await page.waitForSelector(".moral-teacher-takeover", { timeout: 3500 });
  await page.evaluate(() => { window.__growthIslandForceMoralMicErrorForQa = false; });
  await page.locator(".moral-teacher-takeover").click();
  const editor = page.locator(".teacher-review-transcript-editor");
  await editor.waitFor({ state: "visible", timeout: 3500 });
  await editor.fill(transcript);
  await page.locator(".teacher-review-corner-card .review-edit-popover summary").click();
  await page.getByRole("button", { name: /\+10$/ }).click();
  await page.locator(".teacher-review-corner-card .approve").click();
  await page.waitForFunction(
    ({ childId, transcript }) => (window.__growthIslandLedger ?? []).some(
      (record) => record.childId === childId && record.reason === `自助成长：${transcript}`,
    ),
    { childId: seed.childId, transcript },
    { timeout: 7000 },
  );
  const final = await page.evaluate(({ childId, transcript, ledgerCount }) => ({
    matchingLedgerCount: (window.__growthIslandLedger ?? []).filter(
      (record) => record.childId === childId && record.reason === `自助成长：${transcript}`,
    ).length,
    ledgerDelta: (window.__growthIslandLedger ?? []).length - ledgerCount,
    stage: window.__growthIslandMoralSpeakStage,
  }), { childId: seed.childId, transcript, ledgerCount: seed.ledgerCount });
  await clearMoralSpeak(page);
  return final;
}

export async function exerciseMoralRecoveryFlow(page) {
  const deterministicFailure = await exerciseDeterministicApprovalFailure(page);
  const uncertainReplay = await exerciseUncertainLedgerReplay(page);
  const teacherTakeover = await exerciseTeacherTakeover(page);
  return { deterministicFailure, teacherTakeover, uncertainReplay };
}
