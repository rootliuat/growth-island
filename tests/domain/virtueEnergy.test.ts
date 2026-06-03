import { describe, expect, it } from "vitest";
import { canApproveMoralGrowth, getChildEnergyResultText, getTeacherHelpText } from "../../src/domain/virtueEnergy";
import type { MoralEvaluationResult } from "../../src/types";

const positiveResult: MoralEvaluationResult = {
  intent: "reward",
  category: "积极阳光",
  xpDelta: 20,
  confidence: 0.82,
  status: "pending_review",
  reasonForChild: "成长能量",
  reasonForTeacher: "建议记录",
  riskFlags: ["teacher_confirmation_required"],
};

describe("virtue energy review labels", () => {
  it("only treats positive confident reward results as approvable growth", () => {
    expect(canApproveMoralGrowth(positiveResult)).toBe(true);
    expect(getChildEnergyResultText(positiveResult)).toBe("友爱 +20");

    const negativeResult = { ...positiveResult, intent: "deduct" as const, xpDelta: -10 as const };
    expect(canApproveMoralGrowth(negativeResult)).toBe(false);
    expect(getChildEnergyResultText(negativeResult)).toBe("请老师帮忙");
    expect(getTeacherHelpText(negativeResult)).toBe("需老师处理");

    const lowConfidenceResult = { ...positiveResult, confidence: 0.45 };
    expect(canApproveMoralGrowth(lowConfidenceResult)).toBe(false);
    expect(getChildEnergyResultText(lowConfidenceResult)).toBe("请老师帮忙");
  });
});
