import { useMemo, useState } from "react";
import { Swords, X, Zap } from "lucide-react";
import type { ChildWithProgress } from "../types";
import { generateProblem } from "../domain/mathPk";

interface MathPkModalProps {
  player: ChildWithProgress;
  opponent: ChildWithProgress;
  onClose: () => void;
  onWin: () => void;
}

export function MathPkModal({ player, opponent, onClose, onWin }: MathPkModalProps) {
  const [playerHp, setPlayerHp] = useState(100);
  const [opponentHp, setOpponentHp] = useState(100);
  const [problem, setProblem] = useState(generateProblem);
  const [answer, setAnswer] = useState("");
  const [log, setLog] = useState("答对造成 20 伤害，先打空对方 HP 获胜。");
  const [winner, setWinner] = useState<string | null>(null);
  const options = useMemo(() => {
    const values = new Set<number>([problem.answer]);
    while (values.size < 4) {
      values.add(Math.max(0, Math.min(20, problem.answer + Math.floor(Math.random() * 9) - 4)));
    }
    return [...values].sort(() => Math.random() - 0.5);
  }, [problem]);

  const submit = (value: number) => {
    if (winner) return;
    setAnswer(String(value));
    if (value === problem.answer) {
      const nextHp = Math.max(0, opponentHp - 20);
      setOpponentHp(nextHp);
      setLog(`${player.name} 答对了，释放星光魔法，造成 20 伤害。`);
      if (nextHp === 0) {
        setWinner(player.name);
        onWin();
      } else {
        setProblem(generateProblem());
      }
      return;
    }
    const nextPlayerHp = Math.max(0, playerHp - 10);
    setPlayerHp(nextPlayerHp);
    setLog("答错了，这一回合没有攻击。练习精灵轻轻反击 10 点。");
    if (nextPlayerHp === 0) {
      setWinner(opponent.name);
    } else {
      setProblem(generateProblem());
    }
  };

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <section className="pk-modal">
        <button className="icon-close" onClick={onClose} aria-label="关闭">
          <X size={24} />
        </button>
        <div className="modal-heading">
          <Swords size={30} />
          <div>
            <h2>数学魔法 PK</h2>
            <p>20 以内算术 · 胜者 +30 XP</p>
          </div>
        </div>

        <div className="battlefield">
          <BattlePet name={player.name} hp={playerHp} side="left" />
          <div className="problem-card">
            <span>第一个核心玩法</span>
            <strong>{problem.text}</strong>
            <div className="answer-grid">
              {options.map((value) => (
                <button key={value} onClick={() => submit(value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          <BattlePet name={opponent.name} hp={opponentHp} side="right" />
        </div>

        <div className="battle-log">
          <Zap size={18} />
          <span>{winner ? `${winner} 获胜。${winner === player.name ? "胜者 XP 已增加。" : ""}` : log}</span>
          {answer && <em>最近选择：{answer}</em>}
        </div>
      </section>
    </div>
  );
}

function BattlePet({ name, hp, side }: { name: string; hp: number; side: "left" | "right" }) {
  return (
    <div className={`battle-pet ${side}`}>
      <div className="battle-orb" />
      <strong>{name}</strong>
      <div className="hp-track">
        <div style={{ width: `${hp}%` }} />
      </div>
      <span>{hp} HP</span>
    </div>
  );
}
