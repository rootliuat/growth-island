import { Box, Rotate3D, Sparkles, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ChildWithProgress, SpiritDefinition } from "../../types";
import { getInitialSpirit3DModelKey, SpiritModelStage3D, spirit3dModels, type Spirit3DModelKey } from "./SpiritModelStage3D";

interface SpiritShowcase3DProps {
  child: ChildWithProgress;
  spirit: SpiritDefinition;
  spiritAssetUrl?: string;
  onClose: () => void;
}

export function SpiritShowcase3D({ child, spirit, spiritAssetUrl, onClose }: SpiritShowcase3DProps) {
  const [modelKey, setModelKey] = useState<Spirit3DModelKey>(() => getInitialSpirit3DModelKey(spirit.id));
  const model = useMemo(
    () => spirit3dModels.find((item) => item.key === modelKey) ?? spirit3dModels[0],
    [modelKey],
  );

  useEffect(() => {
    setModelKey(getInitialSpirit3DModelKey(spirit.id));
  }, [child.id, spirit.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="spirit-showcase-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="spirit-showcase-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${child.name} 3D 精灵展示`}
        style={{ "--showcase-accent": spirit.accent } as CSSProperties}
      >
        <header className="spirit-showcase-head">
          <span className="showcase-mark" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <div>
            <span>3D 预览</span>
            <strong>{child.name} · {spirit.name}</strong>
          </div>
          <button type="button" className="showcase-close" aria-label="关闭3D展示" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <SpiritModelStage3D
          child={child}
          spirit={spirit}
          modelKey={model.key}
          accent={spirit.accent}
          className="spirit-showcase-stage"
          canvasClassName="spirit-showcase-canvas"
          fallbackImageUrl={spiritAssetUrl}
          interactive
          size="large"
        />

        <aside className="spirit-showcase-side" aria-label="3D展示控制">
          <div className="showcase-side-title">
            <Box size={18} />
            <div>
              <span>效果模型</span>
              <strong>{model.label}</strong>
            </div>
          </div>
          <p>{model.mood}，用于验证精灵展示间，不进入成长加分逻辑。</p>
          <div className="showcase-model-tabs" role="group" aria-label="切换3D精灵模型">
            {spirit3dModels.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === model.key ? "active" : undefined}
                onClick={() => setModelKey(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="showcase-touch-hint">
            <Rotate3D size={16} />
            <span>触屏拖动看精灵</span>
          </div>
        </aside>
      </section>
    </div>
  );
}
