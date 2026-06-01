import type { ChildProfile } from "../types";

export interface SpiritVoiceOption {
  voiceType: number;
  label: string;
  providerName: string;
  tone: string;
}

export const spiritVoiceOptions: SpiritVoiceOption[] = [
  { voiceType: 101016, label: "清甜声", providerName: "智甜", tone: "女童声" },
  { voiceType: 101015, label: "元气声", providerName: "智萌", tone: "男童声" },
  { voiceType: 502007, label: "小虎声", providerName: "智小虎", tone: "聊天童声" },
  { voiceType: 603002, label: "软萌声", providerName: "软萌心心", tone: "特色童声" },
  { voiceType: 603000, label: "少年声", providerName: "懂事少年", tone: "少年感" },
];

const voiceTypes = new Set(spiritVoiceOptions.map((voice) => voice.voiceType));

export function normalizeSpiritVoiceType(value: unknown) {
  const voiceType = Number(value);
  return Number.isInteger(voiceType) && voiceTypes.has(voiceType) ? voiceType : undefined;
}

function hashText(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getDefaultSpiritVoiceType(child: Pick<ChildProfile, "id" | "spiritId">) {
  const numericSpiritId = Number(child.spiritId);
  const basis = Number.isInteger(numericSpiritId) && numericSpiritId > 0 ? numericSpiritId - 1 : hashText(child.id);
  return spiritVoiceOptions[basis % spiritVoiceOptions.length].voiceType;
}

export function getChildSpiritVoiceType(child: Pick<ChildProfile, "id" | "spiritId" | "voiceType">) {
  return normalizeSpiritVoiceType(child.voiceType) ?? getDefaultSpiritVoiceType(child);
}

export function getSpiritVoiceOption(voiceType: unknown) {
  const normalized = normalizeSpiritVoiceType(voiceType);
  return spiritVoiceOptions.find((voice) => voice.voiceType === normalized);
}
