import { ChevronDown, MapPin, Pencil } from "lucide-react";
import type { ChildProfile, ChildWithProgress } from "../../types";
import { islandSlots } from "../../data/classroom";
import { spirits } from "../../data/spirits";

interface TeacherActionPanelProps {
  child: ChildWithProgress;
  teacherMode: boolean;
  onUpdateChild: (patch: Partial<ChildProfile>) => void;
}

export function TeacherActionPanel({ child, teacherMode, onUpdateChild }: TeacherActionPanelProps) {
  if (!teacherMode) return null;

  return (
    <section className="teacher-action-panel">
      <details>
        <summary>
          <span className="section-title">
            <Pencil size={18} />
            精灵入住设置
          </span>
          <span>昵称 / 精灵 / 家园点位</span>
        </summary>
        <label>
          精灵昵称
          <input value={child.petName} onChange={(event) => onUpdateChild({ petName: event.target.value })} />
        </label>
        <label>
          选择精灵
          <span className="select-wrap">
            <select value={child.spiritId} onChange={(event) => onUpdateChild({ spiritId: event.target.value })}>
              {spirits.map((spirit) => (
                <option key={spirit.id} value={spirit.id}>
                  {spirit.id}. {spirit.name}
                </option>
              ))}
            </select>
            <ChevronDown size={18} />
          </span>
        </label>
        <label>
          家园点位
          <span className="select-wrap">
            <select value={child.slotId} onChange={(event) => onUpdateChild({ slotId: Number(event.target.value) })}>
              {islandSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.id} 号点位 · {slot.zone}
                </option>
              ))}
            </select>
            <MapPin size={18} />
          </span>
        </label>
      </details>
    </section>
  );
}
