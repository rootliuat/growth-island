import type { VirtueCategory } from "../types";

export interface EnergyGlyphAsset {
  category: VirtueCategory;
  label: string;
  filename: string;
  motif: string;
  available: boolean;
  publicPath?: string;
  targetPublicPath: string;
  generatedPath: string;
}

const energyGlyphFilenames: Record<VirtueCategory, string> = {
  家国情怀: "energy-aijiaxiang-glyph.png",
  意志坚韧: "energy-jianchi-glyph.png",
  积极阳光: "energy-youai-glyph.png",
  勇毅有力: "energy-yongqi-glyph.png",
  激浊扬清: "energy-zhengjie-glyph.png",
  开拓创新: "energy-chuangxiang-glyph.png",
  尊矩守法: "energy-guize-glyph.png",
};

const energyGlyphLabels: Record<VirtueCategory, string> = {
  家国情怀: "爱家乡",
  意志坚韧: "坚持",
  积极阳光: "友爱",
  勇毅有力: "勇气",
  激浊扬清: "整洁",
  开拓创新: "创想",
  尊矩守法: "规则",
};

const energyGlyphMotifs: Record<VirtueCategory, string> = {
  家国情怀: "warm shell, little roof, heart star",
  意志坚韧: "mangrove leaf, root ring, steady star",
  积极阳光: "sun shell, twin sparkle, soft smile",
  勇毅有力: "coral flame, brave star, shield curve",
  激浊扬清: "clear wave, pearl, clean swirl",
  开拓创新: "crystal idea spark, pearl orbit",
  尊矩守法: "compass shell, dotted path, order star",
};

export function getEnergyGlyphAsset(category: VirtueCategory): EnergyGlyphAsset {
  const filename = energyGlyphFilenames[category];
  const targetPublicPath = `/assets/ui/energy-constellation/${filename}`;
  return {
    category,
    label: energyGlyphLabels[category],
    filename,
    motif: energyGlyphMotifs[category],
    available: true,
    publicPath: targetPublicPath,
    targetPublicPath,
    generatedPath: `assets/generated/ui/energy-constellation/${filename}`,
  };
}
