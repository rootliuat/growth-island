/**
 * [INPUT]: 依赖课堂同步/数据权威状态、地图缩放动作和班级人数。
 * [OUTPUT]: 对外提供 GameTopBar 首页课堂 HUD，并常驻展示真实数据去向。
 * [POS]: components/Hud 的首页顶栏，服务白板教师快速确认保存状态与地图控制。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Cloud, CloudOff, LoaderCircle, MapPinned, Sparkles, Users } from "lucide-react";
import type { ClassroomDataAuthority, SyncStatus } from "../../domain/appState";
import { ZoomControls } from "./ZoomControls";

interface GameTopBarProps {
  childrenCount: number;
  syncStatus: SyncStatus;
  dataAuthority: ClassroomDataAuthority;
  classroomNotice?: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFocusSelected: () => void;
  onFullIsland: () => void;
}

export function GameTopBar({
  childrenCount,
  syncStatus,
  dataAuthority,
  classroomNotice,
  onZoomIn,
  onZoomOut,
  onFocusSelected,
  onFullIsland,
}: GameTopBarProps) {
  const syncMeta = {
    connecting: { label: "连接数据", icon: <LoaderCircle size={18} /> },
    online: { label: "已保存", icon: <Cloud size={18} /> },
    saving: { label: "保存中", icon: <LoaderCircle size={18} /> },
    offline: { label: "离线模式", icon: <CloudOff size={18} /> },
    unavailable: { label: "数据不可用", icon: <CloudOff size={18} /> },
  }[syncStatus];
  const authorityMeta = dataAuthority === "local"
    ? { label: "本机保存", icon: <CloudOff size={18} />, className: "local-authority" }
    : dataAuthority === "unavailable"
      ? { label: "数据不可用", icon: <CloudOff size={18} />, className: "unavailable-authority" }
      : { ...syncMeta, className: syncStatus };

  return (
    <header className="game-topbar">
      <div className="game-brand">
        <div className="game-brand-mark">北</div>
        <div>
          <h1>北海成长岛</h1>
          <p>精灵家园 · 成长能量 · 贝壳算术</p>
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
        <div
          className={`game-pill sync-status authority-status ${authorityMeta.className}`}
          role="status"
          aria-live="polite"
          aria-label={classroomNotice ?? authorityMeta.label}
          title={classroomNotice}
        >
          {authorityMeta.icon}
          {authorityMeta.label}
        </div>
        <div className="game-pill screen-mode-pill">
          <Sparkles size={18} />
          大屏展示
        </div>
      </div>
    </header>
  );
}
