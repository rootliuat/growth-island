import { readFileSync } from "node:fs";

const moralRules = JSON.parse(readFileSync(new URL("../shared/moral-rules.json", import.meta.url), "utf8"));
const { categoryRules, deductKeywords, strongKeywords } = moralRules;

export function evaluateMoralText(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return {
      intent: "needs_clarification",
      xpDelta: 0,
      confidence: 0.2,
      status: "manual_fallback",
      reasonForChild: "我还没有听清楚，可以再说一次。",
      reasonForTeacher: "空文本，无法判断。",
      riskFlags: ["empty_text"],
    };
  }

  const isDeduct = deductKeywords.some((word) => normalized.includes(word));
  const matched = categoryRules
    .map((rule) => ({ ...rule, hits: rule.keywords.filter((word) => normalized.includes(word)).length }))
    .filter((rule) => rule.hits > 0)
    .sort((a, b) => b.hits - a.hits)[0];

  if (!matched) {
    return {
      intent: "needs_clarification",
      xpDelta: 0,
      confidence: 0.45,
      status: "manual_fallback",
      reasonForChild: "我还不确定这是哪一种成长记录，可以请老师帮忙点一下。",
      reasonForTeacher: "未命中德育关键词，需要手动选择类别。",
      riskFlags: ["no_category_match"],
    };
  }

  const strong = strongKeywords.some((word) => normalized.includes(word));
  const medium = normalized.length >= 12 || matched.hits >= 2;
  const magnitude = strong ? 30 : medium ? 20 : 10;
  const xpDelta = isDeduct ? -magnitude : magnitude;
  const confidence = Math.min(0.96, 0.68 + matched.hits * 0.12 + (medium ? 0.07 : 0) + (strong ? 0.07 : 0));
  const status = "pending_review";

  return {
    intent: isDeduct ? "deduct" : "reward",
    category: matched.category,
    xpDelta,
    confidence,
    status,
    reasonForChild: isDeduct
      ? "谢谢你愿意说出来，我们一起把这件事做得更好。"
      : "这是一条很棒的成长记录，精灵收到了新的能量。",
    reasonForTeacher: `${matched.category}；命中 ${matched.hits} 个关键词；建议 ${xpDelta > 0 ? "+" : ""}${xpDelta} XP。`,
    riskFlags: isDeduct ? ["teacher_required_for_negative"] : ["teacher_confirmation_required"],
  };
}
