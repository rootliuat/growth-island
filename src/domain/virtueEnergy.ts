import type { MoralEvaluationResult, VirtueCategory } from "../types";

export const childEnergyLabels: Record<VirtueCategory, string> = {
  家国情怀: "爱家乡",
  意志坚韧: "坚持",
  积极阳光: "友爱",
  勇毅有力: "勇气",
  激浊扬清: "整洁",
  开拓创新: "创想",
  尊矩守法: "规则",
};

export const childEnergyColors: Record<VirtueCategory, string> = {
  家国情怀: "#d9793d",
  意志坚韧: "#4f9f65",
  积极阳光: "#f0ae3f",
  勇毅有力: "#e46f4c",
  激浊扬清: "#3fa894",
  开拓创新: "#b884dc",
  尊矩守法: "#4c91c7",
};

export function formatSignedXp(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta}`;
}

export function getChildEnergyLabel(category?: VirtueCategory) {
  return category ? childEnergyLabels[category] : "成长";
}

export function getChildEnergyColor(category?: VirtueCategory) {
  return category ? childEnergyColors[category] : "#f0ae3f";
}

export function canApproveMoralGrowth(result?: MoralEvaluationResult) {
  return Boolean(
    result &&
      result.intent === "reward" &&
      result.category &&
      result.xpDelta > 0 &&
      result.confidence >= 0.6,
  );
}

export function getTeacherHelpText(result?: MoralEvaluationResult) {
  if (!result) return "请老师帮忙";
  if (result.intent === "deduct" || result.xpDelta < 0) return "需老师处理";
  return "请老师帮忙";
}

export function getChildEnergyResultText(result?: MoralEvaluationResult) {
  if (!result || !canApproveMoralGrowth(result)) return "请老师帮忙";
  return `${getChildEnergyLabel(result.category)} ${formatSignedXp(result.xpDelta)}`;
}
