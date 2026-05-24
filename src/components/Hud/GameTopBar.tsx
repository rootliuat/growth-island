import { Cloud, CloudOff, Home, LoaderCircle, MapPinned, Shield, Users } from "lucide-react";
import { ZoomControls } from "./ZoomControls";

interface GameTopBarProps {
  teacherMode: boolean;
  onToggleTeacherMode: () => void;
  childrenCount: number;
  syncStatus: "connecting" | "online" | "saving" | "offline";
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFocusSelected: () => void;
  onFullIsland: () => void;
}

export function GameTopBar({
  teacherMode,
  onToggleTeacherMode,
  childrenCount,
  syncStatus,
  onZoomIn,
  onZoomOut,
  onFocusSelected,
  onFullIsland,
}: GameTopBarProps) {
  const syncMeta = {
    connecting: { label: "连接数据", icon: <LoaderCircle size={18} /> },
    online: { label: "已保存", icon: <Cloud size={18} /> },
    saving: { label: "保存中", icon: <LoaderCircle size={18} /> },
    offline: { label: "离线演示", icon: <CloudOff size={18} /> },
  }[syncStatus];

  return (
    <header className="game-topbar">
      <div className="game-brand">
        <div className="game-brand-mark">北</div>
        <div>
          <h1>北海成长岛</h1>
          <p>精灵家园 · 德育 XP · 数学魔法</p>
        </div>
      </div>

      <ZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFocusSelected={onFocusSelected}
        onFullIsland={onFullIsland}
      />

      <div className="game-status-pills">
        <div className="game-pill">
          <Users size={18} />
          {childrenCount} 名幼儿
        </div>
        <div className="game-pill">
          <MapPinned size={18} />
          35 个家园
        </div>
        <div className={`game-pill sync-status ${syncStatus}`}>
          {syncMeta.icon}
          {syncMeta.label}
        </div>
        <button className={teacherMode ? "teacher-toggle active" : "teacher-toggle"} onClick={onToggleTeacherMode}>
          {teacherMode ? <Shield size={18} /> : <Home size={18} />}
          {teacherMode ? "老师模式" : "幼儿模式"}
        </button>
      </div>
    </header>
  );
}
