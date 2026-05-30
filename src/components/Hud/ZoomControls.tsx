import { LocateFixed, Maximize2, Minus, Plus } from "lucide-react";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFocusSelected: () => void;
  onFullIsland: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onFocusSelected, onFullIsland }: ZoomControlsProps) {
  return (
    <div className="zoom-controls" aria-label="地图镜头控制">
      <button onClick={onZoomIn} title="放大地图" aria-label="放大地图">
        <Plus size={18} />
      </button>
      <button onClick={onZoomOut} title="缩小地图" aria-label="缩小地图">
        <Minus size={18} />
      </button>
      <button onClick={onFocusSelected} title="定位当前精灵" aria-label="定位当前精灵">
        <LocateFixed size={18} />
      </button>
      <button onClick={onFullIsland} title="返回全岛" aria-label="返回全岛">
        <Maximize2 size={18} />
      </button>
    </div>
  );
}
