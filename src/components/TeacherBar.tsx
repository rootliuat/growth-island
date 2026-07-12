import { Cloud, CloudOff, GraduationCap, LoaderCircle, MapPinned, Shield, Users } from "lucide-react";

interface TeacherBarProps {
  teacherMode: boolean;
  onToggleTeacherMode: () => void;
  childrenCount: number;
  syncStatus: "connecting" | "online" | "saving" | "offline";
}

export function TeacherBar({ teacherMode, onToggleTeacherMode, childrenCount, syncStatus }: TeacherBarProps) {
  const syncMeta = {
    connecting: { label: "连接数据", icon: <LoaderCircle size={18} /> },
    online: { label: "已保存", icon: <Cloud size={18} /> },
    saving: { label: "保存中", icon: <LoaderCircle size={18} /> },
    offline: { label: "离线模式", icon: <CloudOff size={18} /> },
  }[syncStatus];

  return (
    <header className="teacher-bar">
      <div className="brand-lockup">
        <div className="brand-mark">北</div>
        <div>
          <h1>北海成长岛</h1>
          <p>班级精灵成长与德育能量系统</p>
        </div>
      </div>
      <div className="toolbar-pills">
        <div className="toolbar-pill">
          <Users size={18} />
          {childrenCount} 名幼儿
        </div>
        <div className="toolbar-pill">
          <MapPinned size={18} />
          40 点位
        </div>
        <div className={`toolbar-pill sync-status ${syncStatus}`}>
          {syncMeta.icon}
          {syncMeta.label}
        </div>
        <button className={teacherMode ? "teacher-toggle active" : "teacher-toggle"} onClick={onToggleTeacherMode}>
          {teacherMode ? <Shield size={18} /> : <GraduationCap size={18} />}
          {teacherMode ? "老师模式开启" : "老师模式"}
        </button>
      </div>
    </header>
  );
}
