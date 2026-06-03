import { describe, expect, it } from "vitest";
import { organizationConfig } from "../../src/data/organization";
import {
  buildOrganizationRuntime,
  buildParentReportDocument,
  createGrowthTaskLedgerInput,
  formatParentReportMarkdown,
  getGrowthTaskReason,
  publishCurriculumTrack,
  updateParentReportReview,
  validateOrganizationConfig,
} from "../../src/domain/organization";
import { enrichChildren } from "../../src/domain/progression";
import { initialChildren } from "../../src/data/classroom";
import type { LedgerRecord, MoralReviewItem } from "../../src/types";

function record(input: Partial<LedgerRecord> & Pick<LedgerRecord, "id" | "childId" | "delta" | "createdAt">): LedgerRecord {
  return {
    operatorChildId: input.childId,
    operatorRole: "teacher",
    source: "manual",
    category: "积极阳光",
    reason: "测试记录",
    aiSuggested: false,
    reviewStatus: "not_required",
    ...input,
  };
}

function pendingReview(input: Pick<MoralReviewItem, "id" | "childId" | "createdAt">): MoralReviewItem {
  return {
    ...input,
    operatorChildId: input.childId,
    transcript: "我今天主动帮同学收玩具",
    result: {
      intent: "reward",
      category: "积极阳光",
      xpDelta: 20,
      confidence: 0.92,
      status: "pending_review",
      reasonForChild: "你主动帮助同学。",
      reasonForTeacher: "建议老师复核后加分。",
      riskFlags: [],
    },
    status: "pending_review",
  };
}

describe("organization runtime", () => {
  it("keeps the seed organization links valid", () => {
    expect(validateOrganizationConfig(organizationConfig)).toMatchObject({
      classroomCount: 3,
      teacherCount: 5,
      valid: true,
      invalidTeacherLinks: [],
      invalidClassLinks: [],
    });
  });

  it("builds a multi-classroom, multi-teacher operating view", () => {
    const runtime = buildOrganizationRuntime(organizationConfig, enrichChildren(initialChildren, []), [], []);

    expect(runtime.kindergartenName).toBe("北海幼儿园");
    expect(runtime.classrooms.map((classroom) => classroom.name)).toEqual(["中一班", "中二班", "大一班"]);
    expect(runtime.teacherCount).toBe(5);
    expect(runtime.childCount).toBe(initialChildren.length);
    expect(runtime.curriculumCount).toBe(3);
    expect(runtime.growthTaskCount).toBe(4);
    expect(runtime.classrooms[0]).toMatchObject({
      name: "中一班",
      childCount: 12,
      teachers: expect.arrayContaining([expect.objectContaining({ name: "林老师" }), expect.objectContaining({ name: "陈主任" })]),
    });
  });

  it("summarizes class records, pending reviews, curriculum, tasks, and parent report drafts", () => {
    const firstClass = organizationConfig.classrooms[0];
    const children = enrichChildren(initialChildren, []);
    const ledger = [
      record({ id: "latest", childId: firstClass.childIds[0], delta: 20, category: "积极阳光", createdAt: "2026-06-02T08:00:00.000Z" }),
      record({ id: "older", childId: firstClass.childIds[0], delta: 10, category: "尊矩守法", createdAt: "2026-06-01T08:00:00.000Z" }),
      record({ id: "undone", childId: firstClass.childIds[1], delta: 30, category: "开拓创新", undone: true, createdAt: "2026-06-01T09:00:00.000Z" }),
      record({ id: "undo", childId: firstClass.childIds[1], delta: -30, source: "undo", createdAt: "2026-06-01T09:01:00.000Z" }),
    ];
    const reviews = [pendingReview({ id: "review-a", childId: firstClass.childIds[0], createdAt: "2026-06-02T08:01:00.000Z" })];

    const runtime = buildOrganizationRuntime(organizationConfig, children, ledger, reviews);
    const classroom = runtime.classrooms[0];
    const firstReport = classroom.reportDrafts[0];

    expect(classroom.activeRecordCount).toBe(2);
    expect(classroom.pendingReviewCount).toBe(1);
    expect(classroom.curriculumTracks.length).toBeGreaterThanOrEqual(2);
    expect(classroom.growthTasks.length).toBeGreaterThanOrEqual(3);
    expect(firstReport).toMatchObject({
      childId: firstClass.childIds[0],
      recordCount: 2,
      categories: ["积极阳光", "尊矩守法"],
      latestRecordAt: "2026-06-02T08:00:00.000Z",
      status: "ready",
      reviewStatus: "draft",
    });
    expect(runtime.activeReportDraftCount).toBe(1);
  });

  it("tracks parent report review status in runtime", () => {
    const firstClass = organizationConfig.classrooms[0];
    const childId = firstClass.childIds[0];
    const children = enrichChildren(initialChildren, []);
    const ledger = [
      record({ id: "latest", childId, delta: 20, category: "积极阳光", createdAt: "2026-06-02T08:00:00.000Z" }),
    ];
    const initialState = {
      activeCurriculumByClassroomId: {},
      parentReportReviewsByChildId: {},
    };
    const submitted = updateParentReportReview(
      organizationConfig,
      initialState,
      childId,
      "submitted",
      "2026-06-02T09:00:00.000Z",
      "陈主任",
    );
    const approved = updateParentReportReview(
      organizationConfig,
      submitted!,
      childId,
      "approved",
      "2026-06-02T10:00:00.000Z",
      "陈主任",
    );

    expect(submitted?.parentReportReviewsByChildId[childId]).toMatchObject({
      status: "submitted",
      reviewedBy: "陈主任",
    });
    expect(updateParentReportReview(organizationConfig, approved!, "missing-child", "submitted")).toBeUndefined();

    const runtime = buildOrganizationRuntime(
      organizationConfig,
      children,
      ledger,
      [],
      {},
      approved?.parentReportReviewsByChildId,
    );
    const report = runtime.classrooms[0].reportDrafts.find((draft) => draft.childId === childId);

    expect(report).toMatchObject({
      status: "ready",
      reviewStatus: "approved",
      reviewUpdatedAt: "2026-06-02T10:00:00.000Z",
    });
  });

  it("generates a readable parent report without undone ledger noise", () => {
    const firstClass = organizationConfig.classrooms[0];
    const children = enrichChildren(initialChildren, []);
    const ledger = [
      record({ id: "latest", childId: firstClass.childIds[0], delta: 20, category: "积极阳光", reason: "主动帮同学收玩具", createdAt: "2026-06-02T08:00:00.000Z" }),
      record({ id: "older", childId: firstClass.childIds[0], delta: 10, category: "尊矩守法", reason: "排队时主动提醒同伴", createdAt: "2026-06-01T08:00:00.000Z" }),
      record({ id: "undone", childId: firstClass.childIds[0], delta: 30, category: "开拓创新", reason: "已撤销记录", undone: true, createdAt: "2026-06-01T09:00:00.000Z" }),
      record({ id: "undo", childId: firstClass.childIds[0], delta: -30, source: "undo", reason: "撤销记录", createdAt: "2026-06-01T09:01:00.000Z" }),
    ];
    const reviews = [pendingReview({ id: "review-a", childId: firstClass.childIds[0], createdAt: "2026-06-02T08:01:00.000Z" })];

    const report = buildParentReportDocument(
      organizationConfig,
      children,
      ledger,
      reviews,
      firstClass.childIds[0],
      "2026-06-02T10:00:00.000Z",
    );

    expect(report).toMatchObject({
      kindergartenName: "北海幼儿园",
      classroomName: "中一班",
      recordCount: 2,
      positiveXp: 30,
      pendingReviewCount: 1,
    });
    expect(report?.categories.map((category) => category.category)).toEqual(["积极阳光", "尊矩守法"]);
    expect(report?.highlights.map((record) => record.reason)).toEqual(["主动帮同学收玩具", "排队时主动提醒同伴"]);
    expect(report?.nextTasks.length).toBeGreaterThan(0);

    const markdown = formatParentReportMarkdown(report!);

    expect(markdown).toContain("# 北海幼儿园中一班");
    expect(markdown).toContain("主动帮同学收玩具");
    expect(markdown).toContain("下阶段成长任务");
    expect(markdown).not.toContain("已撤销记录");
    expect(markdown).not.toContain("撤销记录");
  });

  it("creates task completion ledger input and summarizes task progress", () => {
    const firstClass = organizationConfig.classrooms[0];
    const task = organizationConfig.growthTasks.find((item) => item.id === "help-cleanup")!;
    const children = enrichChildren(initialChildren, []);
    const input = createGrowthTaskLedgerInput(organizationConfig, task.id, firstClass.childIds[0], firstClass.childIds[0]);

    expect(input).toMatchObject({
      childId: firstClass.childIds[0],
      operatorChildId: firstClass.childIds[0],
      operatorRole: "teacher",
      delta: task.xpDelta,
      source: "manual",
      category: task.category,
      reason: getGrowthTaskReason(task),
      aiSuggested: false,
      reviewStatus: "not_required",
    });

    expect(createGrowthTaskLedgerInput(organizationConfig, "creative-try", firstClass.childIds[0], firstClass.childIds[0])).toBeUndefined();

    const ledger = [
      record({
        id: "task-a",
        childId: firstClass.childIds[0],
        delta: task.xpDelta,
        category: task.category,
        reason: getGrowthTaskReason(task),
        createdAt: "2026-06-02T08:00:00.000Z",
      }),
      record({
        id: "task-b",
        childId: firstClass.childIds[1],
        delta: task.xpDelta,
        category: task.category,
        reason: getGrowthTaskReason(task),
        createdAt: "2026-06-02T09:00:00.000Z",
      }),
      record({
        id: "task-undone",
        childId: firstClass.childIds[2],
        delta: task.xpDelta,
        category: task.category,
        reason: getGrowthTaskReason(task),
        undone: true,
        createdAt: "2026-06-02T10:00:00.000Z",
      }),
    ];

    const runtime = buildOrganizationRuntime(organizationConfig, children, ledger, []);
    const taskRuntime = runtime.classrooms[0].growthTasks.find((item) => item.id === task.id);

    expect(taskRuntime).toMatchObject({
      completionCount: 2,
      completedChildCount: 2,
      completedChildIds: [firstClass.childIds[1], firstClass.childIds[0]],
      latestCompletedAt: "2026-06-02T09:00:00.000Z",
    });
  });

  it("publishes a curriculum week and marks matching tasks as current", () => {
    const firstClass = organizationConfig.classrooms[0];
    const children = enrichChildren(initialChildren, []);
    const published = publishCurriculumTrack(organizationConfig, firstClass.id, "rule-keeper-week");

    expect(published).toEqual({ [firstClass.id]: "rule-keeper-week" });
    expect(publishCurriculumTrack(organizationConfig, firstClass.id, "innovation-lab-week")).toBeUndefined();

    const runtime = buildOrganizationRuntime(organizationConfig, children, [], [], published);
    const classroom = runtime.classrooms[0];
    const activeTrack = classroom.curriculumTracks.find((track) => track.status === "active");
    const ruleTask = classroom.growthTasks.find((task) => task.id === "line-up-rule");
    const helperTask = classroom.growthTasks.find((task) => task.id === "help-cleanup");

    expect(activeTrack).toMatchObject({
      id: "rule-keeper-week",
      category: "尊矩守法",
      taskCount: 1,
      completedTaskCount: 0,
    });
    expect(ruleTask).toMatchObject({ curriculumActive: true, category: "尊矩守法" });
    expect(helperTask).toMatchObject({ curriculumActive: false, category: "积极阳光" });
    expect(classroom.growthTasks[0].id).toBe("line-up-rule");
  });
});
