import { describe, expect, it } from "vitest";
import moralRules from "../../shared/moral-rules.json";
import { evaluateMoralText } from "../../src/domain/moralAgent";

describe("moral agent domain", () => {
  it("loads virtue and keyword rules from the shared moral rules file", () => {
    expect(moralRules.categoryRules).toHaveLength(7);
    expect(moralRules.categoryRules.map((rule) => rule.category)).toEqual([
      "家国情怀",
      "意志坚韧",
      "积极阳光",
      "勇毅有力",
      "激浊扬清",
      "开拓创新",
      "尊矩守法",
    ]);
    expect(moralRules.deductKeywords).toContain("没有遵守");
    expect(moralRules.strongKeywords).toContain("主动");
  });

  it("requires clarification for empty text", () => {
    expect(evaluateMoralText("   ")).toMatchObject({
      intent: "needs_clarification",
      xpDelta: 0,
      confidence: 0.2,
      status: "manual_fallback",
      riskFlags: ["empty_text"],
    });
  });

  it("suggests a positive virtue category and XP for matched growth text", () => {
    const result = evaluateMoralText("我今天主动帮同学收玩具");

    expect(result).toMatchObject({
      intent: "reward",
      category: "积极阳光",
      xpDelta: 30,
      status: "pending_review",
      riskFlags: ["teacher_confirmation_required"],
    });
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.reasonForTeacher).toContain("积极阳光");
  });

  it("keeps negative behavior pending teacher review instead of auto-posting", () => {
    const result = evaluateMoralText("我排队的时候推了同学，没有遵守规则");

    expect(result).toMatchObject({
      intent: "deduct",
      category: "尊矩守法",
      xpDelta: -20,
      status: "pending_review",
      riskFlags: ["teacher_required_for_negative"],
    });
  });

  it("falls back to manual review when no category keyword matches", () => {
    expect(evaluateMoralText("今天发生了一件事情")).toMatchObject({
      intent: "needs_clarification",
      xpDelta: 0,
      confidence: 0.45,
      status: "manual_fallback",
      riskFlags: ["no_category_match"],
    });
  });
});
