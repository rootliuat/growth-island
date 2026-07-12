import { ChevronDown, Home, MapPin, Pencil, Sparkles, Volume2 } from "lucide-react";
import type { ChildProfile, ChildWithProgress } from "../../types";
import { islandSlots } from "../../data/classroom";
import { spirits } from "../../data/spirits";
import { getChildSpiritVoiceType, getSpiritVoiceOption, spiritVoiceOptions } from "../../domain/spiritVoice";

interface TeacherActionPanelProps {
  child: ChildWithProgress;
  teacherMode: boolean;
  onUpdateChild: (patch: Partial<ChildProfile>) => void;
}

export function TeacherActionPanel({ child, teacherMode, onUpdateChild }: TeacherActionPanelProps) {
  if (!teacherMode) return null;
  const currentSpirit = spirits.find((spirit) => spirit.id === child.spiritId) ?? spirits[0];
  const currentSlot = islandSlots.find((slot) => slot.id === child.slotId) ?? islandSlots[0];
  const currentVoiceType = getChildSpiritVoiceType(child);
  const currentVoice = getSpiritVoiceOption(currentVoiceType) ?? spiritVoiceOptions[0];

  return (
    <section className="teacher-action-panel">
      <details>
        <summary>
          <span className="section-title">
            <Pencil size={18} />
            入住通行证
          </span>
          <span>{child.name}</span>
        </summary>
        <div className="teacher-pass">
          <div className="pass-token">
            <Home size={20} />
            <strong>{currentSlot.id}</strong>
          </div>
          <div>
            <strong>{child.petName}</strong>
            <span>{currentSpirit.name} · {currentVoice.label} · {currentSlot.zone}</span>
          </div>
        </div>
        <div className="teacher-field-grid">
          <label>
            <span>
              <Sparkles size={15} />
              精灵昵称
            </span>
            <input
              id="teacher-pet-name"
              name="teacherPetName"
              value={child.petName}
              onChange={(event) => onUpdateChild({ petName: event.target.value })}
            />
          </label>
          <label>
            <span>
              <Sparkles size={15} />
              选择精灵
            </span>
            <span className="select-wrap">
              <select
                id="teacher-spirit-id"
                name="teacherSpiritId"
                value={child.spiritId}
                onChange={(event) => onUpdateChild({ spiritId: event.target.value })}
              >
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
            <span>
              <Volume2 size={15} />
              精灵声音
            </span>
            <span className="select-wrap">
              <select
                id="teacher-voice-type"
                name="teacherVoiceType"
                value={currentVoiceType}
                onChange={(event) => onUpdateChild({ voiceType: Number(event.target.value) })}
              >
                {spiritVoiceOptions.map((voice) => (
                  <option key={voice.voiceType} value={voice.voiceType}>
                    {voice.label}
                  </option>
                ))}
              </select>
              <Volume2 size={18} />
            </span>
          </label>
          <label>
            <span>
              <MapPin size={15} />
              家园点位
            </span>
            <span className="select-wrap">
              <select
                id="teacher-slot-id"
                name="teacherSlotId"
                value={child.slotId}
                onChange={(event) => onUpdateChild({ slotId: Number(event.target.value) })}
              >
                {islandSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.id} 号点位 · {slot.zone}
                  </option>
                ))}
              </select>
              <MapPin size={18} />
            </span>
          </label>
        </div>
      </details>
    </section>
  );
}
