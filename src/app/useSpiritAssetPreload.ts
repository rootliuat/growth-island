/**
 * [INPUT]: 依赖当前模块、成长儿童、精灵索引与 spiritAssets 加载能力。
 * [OUTPUT]: 对外提供 useSpiritAssetPreload，返回已加载资产版本号。
 * [POS]: app 的首页精灵资产预载 Module，独占优先级、分批 timer 和取消状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useState } from "react";
import type { AppModuleId } from "../components/modules/moduleConfig";
import { loadSpiritAsset } from "../domain/spiritAssets";
import type { ChildWithProgress, SpiritDefinition } from "../types";

const batchSize = 2;
const batchDelayMs = 1100;
const initialDelayMs = 1400;
const preloadLimit = 12;

function assetKey(child: ChildWithProgress) {
  return `${child.spiritId}:${child.state}`;
}

function getPriority(child: ChildWithProgress, selectedChild: ChildWithProgress) {
  if (child.rank <= 3) return child.rank;
  const slotDistance = Math.abs(child.slotId - selectedChild.slotId);
  const levelBias = child.level >= 7 ? -4 : 0;
  return 10 + Math.min(slotDistance, 18) + child.rank / 100 + levelBias;
}

export function useSpiritAssetPreload(input: {
  activeModule: AppModuleId;
  children: ChildWithProgress[];
  selectedChild: ChildWithProgress;
  spiritsById: Map<string, SpiritDefinition>;
}) {
  const [assetVersion, setAssetVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    if (input.activeModule !== "home") {
      return () => {
        cancelled = true;
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    const targets = new Map<string, { child: ChildWithProgress; spirit: SpiritDefinition }>();
    input.children.forEach((child) => {
      const spirit = input.spiritsById.get(child.spiritId);
      if (spirit) targets.set(assetKey(child), { child, spirit });
    });
    const selectedTarget = targets.get(assetKey(input.selectedChild));
    const backgroundTargets = [...targets.values()]
      .filter(({ child }) => child.id !== input.selectedChild.id)
      .sort((a, b) => getPriority(a.child, input.selectedChild) - getPriority(b.child, input.selectedChild))
      .slice(0, preloadLimit);
    const applyLoaded = (loaded: boolean[]) => {
      if (!cancelled && loaded.some(Boolean)) setAssetVersion((current) => current + 1);
    };
    if (selectedTarget) {
      loadSpiritAsset(selectedTarget.spirit, selectedTarget.child.state).then((loaded) => applyLoaded([loaded]));
    }

    let cursor = 0;
    const schedule = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay));
    };
    const loadNextBatch = () => {
      if (cancelled || cursor >= backgroundTargets.length) return;
      const batch = backgroundTargets.slice(cursor, cursor + batchSize);
      cursor += batchSize;
      Promise.all(batch.map(({ child, spirit }) => loadSpiritAsset(spirit, child.state))).then((loaded) => {
        applyLoaded(loaded);
        if (!cancelled && cursor < backgroundTargets.length) schedule(loadNextBatch, batchDelayMs);
      });
    };
    schedule(loadNextBatch, initialDelayMs);
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [input.activeModule, input.children, input.selectedChild, input.spiritsById]);

  return assetVersion;
}
