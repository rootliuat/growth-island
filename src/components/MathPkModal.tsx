import { Sparkles, Swords, X } from "lucide-react";
import type { ChildWithProgress, SpiritDefinition } from "../types";
import { MathPkBattle } from "./MathPkBattle";

interface MathPkModalProps {
  player: ChildWithProgress;
  opponent: ChildWithProgress;
  spiritsById?: Map<string, SpiritDefinition>;
  onClose: () => void;
  onWin: (winner: ChildWithProgress) => void;
}

export function MathPkModal({ player, opponent, spiritsById, onClose, onWin }: MathPkModalProps) {
  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <section className="pk-modal game-battle-modal">
        <button className="icon-close" onClick={onClose} aria-label="关闭">
          <X size={24} />
        </button>

        <div className="pk-heading">
          <div className="pk-title-mark">
            <Swords size={28} />
          </div>
          <div>
            <h2>数学魔法赛</h2>
            <p>20 以内算术 · 答对点亮 · 完成后获得数学能量</p>
          </div>
          <div className="turn-banner">
            <Sparkles size={16} />
            数学回合
          </div>
        </div>

        <MathPkBattle player={player} opponent={opponent} spiritsById={spiritsById} onWin={onWin} />
      </section>
    </div>
  );
}
