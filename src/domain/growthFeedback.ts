/**
 * [INPUT]: 不依赖运行时 Module，仅接收 ledger reason 文本。
 * [OUTPUT]: 对外提供 GrowthFeedback 类型和 getShortFeedbackReason 文案压缩规则。
 * [POS]: domain 的全局成长反馈契约 Module，被 App 和 HUD 浮层消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type GrowthFeedbackKind = "xp" | "energy" | "draw" | "redeem" | "focus" | "status";
export type GrowthFeedbackTone = "positive" | "watch" | "neutral";

export interface GrowthFeedback {
  id: number;
  kind: GrowthFeedbackKind;
  tone: GrowthFeedbackTone;
  title: string;
  detail?: string;
  delta?: number;
  childName?: string;
}

export function getShortFeedbackReason(reason: string) {
  const cleaned = reason
    .replace(/^课堂记录：/, "")
    .replace(/^抽取台：/, "")
    .replace(/^随机点名：/, "")
    .replace(/^数学魔法 PK 胜利 \+30$/, "数学光路点亮")
    .replace(/^数学光路点亮 \+30$/, "数学光路点亮")
    .replace(/^语音记录：/, "贝壳记录：")
    .replace(/^复核通过：/, "复核通过：")
    .trim();
  if (cleaned.includes("快速加分") || cleaned.includes("课堂积极回应")) return "确认点亮";
  if (cleaned.includes("扣分") || cleaned.includes("减分")) return "老师提醒";
  return cleaned.replace(/\s*[+＋-]\d+\s*XP?$/i, "").slice(0, 34);
}
