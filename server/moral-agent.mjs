const categoryRules = [
  { category: "家国情怀", keywords: ["国旗", "祖国", "家乡", "北海", "老街", "升旗"] },
  { category: "意志坚韧", keywords: ["坚持", "没有放弃", "继续", "练习", "完成", "努力"] },
  { category: "积极阳光", keywords: ["帮助", "分享", "开心", "鼓励", "谢谢", "朋友", "同学"] },
  { category: "勇毅有力", keywords: ["勇敢", "保护", "尝试", "挑战", "大胆", "站出来"] },
  { category: "激浊扬清", keywords: ["垃圾", "整理", "干净", "环保", "收拾", "清理", "归位"] },
  { category: "开拓创新", keywords: ["想到", "办法", "发明", "搭建", "创造", "新的"] },
  { category: "尊矩守法", keywords: ["排队", "规则", "轮流", "不抢", "等待", "安静", "遵守"] },
];

const deductKeywords = ["抢", "推", "打", "吵", "乱扔", "插队", "不排队", "弄坏", "没有遵守"];
const strongKeywords = ["主动", "一直", "很多", "大家", "第一次", "勇敢", "坚持完成"];

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
