import { describe, expect, it } from "vitest";
import {
  compareClassroomBackups,
  createClassroomBackup,
  createClearedClassroomBackup,
  normalizeClassroomBackup,
  parseClassroomBackupJson,
  serializeClassroomBackup,
  summarizeClassroomBackup,
} from "../../src/domain/classroomBackup";
import { getDefaultSpiritVoiceType } from "../../src/domain/spiritVoice";
import type { ChildProfile, LedgerRecord, MoralReviewItem } from "../../src/types";

const children: ChildProfile[] = [
  {
    id: "child-a",
    name: "安安",
    spiritId: "spirit-a",
    petName: "小浪花",
    voiceType: 101016,
    slotId: 1,
  },
];

const ledger: LedgerRecord[] = [
  {
    id: "record-a",
    childId: "child-a",
    operatorChildId: "child-a",
    operatorRole: "teacher",
    delta: 20,
    source: "dialogue-agent",
    category: "积极阳光",
    reason: "主动帮同学收玩具",
    aiSuggested: true,
    reviewStatus: "approved",
    createdAt: "2026-06-01T08:00:00.000Z",
  },
];

const moralReviews: MoralReviewItem[] = [
  {
    id: "review-a",
    childId: "child-a",
    operatorChildId: "child-a",
    transcript: "我今天主动帮同学收玩具",
    result: {
      intent: "reward",
      category: "积极阳光",
      xpDelta: 20,
      confidence: 0.91,
      status: "pending_review",
      reasonForChild: "你主动帮助同学。",
      reasonForTeacher: "建议加 20 XP。",
      riskFlags: [],
    },
    status: "pending_review",
    createdAt: "2026-06-01T08:01:00.000Z",
  },
];

describe("classroom backup contract", () => {
  it("creates a portable classroom backup with core records", () => {
    const backup = createClassroomBackup(
      {
        children,
        ledger,
        moralReviews,
        shopRedemptions: [
          {
            id: "shop-a",
            childId: "child-a",
            rewardId: "star-sticker",
            rewardName: "成长星贴",
            rewardCategory: "贴纸",
            cost: 100,
            status: "requested",
            createdAt: "2026-06-01T08:02:00.000Z",
          },
        ],
        lotteryDraws: [
          {
            id: "draw-a",
            childId: "child-a",
            childName: "安安",
            prizeId: "shell",
            prizeName: "贝壳贴纸",
            rarity: "常见",
            description: "放入班级奖励盒",
            status: "drawn",
            createdAt: "2026-06-01T08:03:00.000Z",
          },
        ],
        teacherMode: true,
        settingsChanges: [
          {
            id: "setting-a",
            key: "settings-save",
            label: "保存当前设置",
            value: "老师模式已开启",
            createdAt: "2026-06-01T08:04:00.000Z",
          },
        ],
        organization: {
          activeCurriculumByClassroomId: {
            "middle-2": "rule-keeper-week",
          },
          parentReportReviewsByChildId: {
            "child-a": {
              childId: "child-a",
              status: "approved",
              updatedAt: "2026-06-01T08:05:00.000Z",
              reviewedBy: "园所码头",
            },
          },
        },
      },
      "2026-06-01T09:00:00.000Z",
    );

    expect(backup.product).toBe("beihai-growth-island");
    expect(backup.schemaVersion).toBe(1);
    expect(backup.organization.activeCurriculumByClassroomId["middle-2"]).toBe("rule-keeper-week");
    expect(backup.organization.parentReportReviewsByChildId["child-a"]).toMatchObject({
      status: "approved",
      reviewedBy: "园所码头",
    });
    expect(summarizeClassroomBackup(backup)).toMatchObject({
      childCount: 1,
      ledgerCount: 1,
      reviewCount: 1,
      shopRedemptionCount: 1,
      lotteryDrawCount: 1,
      settingsChangeCount: 1,
      activeCurriculumCount: 1,
      parentReportReviewCount: 1,
    });
  });

  it("round-trips through JSON and normalizes ledger defaults", () => {
    const backup = createClassroomBackup({
      children,
      ledger: [{ ...ledger[0], operatorRole: undefined as never, aiSuggested: undefined as never }],
      moralReviews,
      shopRedemptions: [],
      lotteryDraws: [],
      teacherMode: false,
      settingsChanges: [],
    });

    const parsed = parseClassroomBackupJson(serializeClassroomBackup(backup));

    expect(parsed.children[0].name).toBe("安安");
    expect(parsed.ledger[0].operatorRole).toBe("teacher");
    expect(parsed.ledger[0].aiSuggested).toBe(true);
    expect(parsed.settings.teacherMode).toBe(false);
    expect(parsed.organization.activeCurriculumByClassroomId).toEqual({});
    expect(parsed.organization.parentReportReviewsByChildId).toEqual({});
  });

  it("normalizes legacy backups that do not include organization or report review state", () => {
    const backup = createClassroomBackup({
      children,
      ledger,
      moralReviews,
      shopRedemptions: [],
      lotteryDraws: [],
      teacherMode: true,
      settingsChanges: [],
    });
    const legacyBackup = { ...backup, organization: undefined };

    const parsed = normalizeClassroomBackup(legacyBackup);

    expect(parsed.organization.activeCurriculumByClassroomId).toEqual({});
    expect(parsed.organization.parentReportReviewsByChildId).toEqual({});
    expect(summarizeClassroomBackup(parsed).activeCurriculumCount).toBe(0);
    expect(summarizeClassroomBackup(parsed).parentReportReviewCount).toBe(0);
  });

  it("normalizes legacy backups that do not include spirit voice type", () => {
    const backup = createClassroomBackup({
      children,
      ledger,
      moralReviews,
      shopRedemptions: [],
      lotteryDraws: [],
      teacherMode: true,
      settingsChanges: [],
    });
    const legacyBackup = {
      ...backup,
      children: backup.children.map(({ voiceType: _voiceType, ...child }) => child),
    };

    const parsed = normalizeClassroomBackup(legacyBackup);

    expect(parsed.children[0]).toMatchObject({
      id: "child-a",
      spiritId: "spirit-a",
      voiceType: getDefaultSpiritVoiceType({ id: "child-a", spiritId: "spirit-a" }),
    });
  });

  it("rejects invalid JSON and records that reference missing children", () => {
    expect(() => parseClassroomBackupJson("{")).toThrow("备份文件不是有效 JSON");

    const backup = createClassroomBackup({
      children,
      ledger: [{ ...ledger[0], childId: "missing-child" }],
      moralReviews: [],
      shopRedemptions: [],
      lotteryDraws: [],
      teacherMode: true,
      settingsChanges: [],
    });

    expect(() => normalizeClassroomBackup(backup)).toThrow("成长记录引用了不存在的幼儿");

    const reportReviewBackup = createClassroomBackup({
      children,
      ledger: [],
      moralReviews: [],
      shopRedemptions: [],
      lotteryDraws: [],
      teacherMode: true,
      settingsChanges: [],
      organization: {
        activeCurriculumByClassroomId: {},
        parentReportReviewsByChildId: {
          "missing-child": {
            childId: "missing-child",
            status: "submitted",
            updatedAt: "2026-06-01T08:05:00.000Z",
          },
        },
      },
    });

    expect(() => normalizeClassroomBackup(reportReviewBackup)).toThrow("报告审批记录引用了不存在的幼儿");
  });

  it("compares import differences before replacing local data", () => {
    const current = createClassroomBackup({
      children,
      ledger,
      moralReviews,
      shopRedemptions: [],
      lotteryDraws: [],
      teacherMode: true,
      settingsChanges: [],
    });
    const incoming = createClassroomBackup({
      children,
      ledger: [],
      moralReviews: [],
      shopRedemptions: [],
      lotteryDraws: [],
      teacherMode: true,
      settingsChanges: [],
    });

    expect(compareClassroomBackups(current, incoming)).toMatchObject({
      childDelta: 0,
      ledgerDelta: -1,
      reviewDelta: -1,
      activeCurriculumDelta: 0,
      parentReportReviewDelta: 0,
      willReplaceExistingData: true,
    });
  });

  it("creates a cleared local classroom backup while preserving child profiles", () => {
    const cleared = createClearedClassroomBackup({ children, teacherMode: false }, "2026-06-01T10:00:00.000Z");

    expect(cleared.children).toEqual(children);
    expect(cleared.ledger).toEqual([]);
    expect(cleared.moralReviews).toEqual([]);
    expect(cleared.shopRedemptions).toEqual([]);
    expect(cleared.lotteryDraws).toEqual([]);
    expect(cleared.settings.teacherMode).toBe(false);
    expect(cleared.settings.settingsChanges).toEqual([]);
    expect(cleared.organization.activeCurriculumByClassroomId).toEqual({});
    expect(cleared.organization.parentReportReviewsByChildId).toEqual({});
  });
});
