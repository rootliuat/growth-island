/**
 * [INPUT]: 依赖 React state/ref/effect 与 GrowthFeedback 契约。
 * [OUTPUT]: 对外提供 useGrowthFeedback，返回当前反馈及 show/clear 动作。
 * [POS]: app 的全局成长反馈深 Module，独占自动消退 timer 生命周期。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef, useState } from "react";
import type { GrowthFeedback } from "../domain/growthFeedback";

export function useGrowthFeedback() {
  const [feedback, setFeedback] = useState<GrowthFeedback>();
  const timerRef = useRef<number | undefined>(undefined);

  const show = (next: Omit<GrowthFeedback, "id">) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setFeedback({ ...next, id: Date.now() });
    timerRef.current = window.setTimeout(() => {
      setFeedback(undefined);
      timerRef.current = undefined;
    }, 4800);
  };

  const clear = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    setFeedback(undefined);
  };

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return { clear, feedback, show };
}
