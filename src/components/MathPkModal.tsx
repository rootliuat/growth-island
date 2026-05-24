import { useMemo, useState } from "react";
import { Sparkles, Swords, X, Zap } from "lucide-react";
import type { ChildWithProgress } from "../types";
import { generateProblem } from "../domain/mathPk";

interface MathPkModalProps {
  player: ChildWithProgress;
  opponent: ChildWithProgress;
  onClose: () => void;
  onWin: (winner: ChildWithProgress) => void;
}

type FighterId = "player" | "opponent";

export function MathPkModal({ player, opponent, onClose, onWin }: MathPkModalProps) {
  const [hp, setHp] = useState<Record<FighterId, number>>({ player: 100, opponent: 100 });
  const [turn, setTurn] = useState<FighterId>("player");
  const [problem, setProblem] = useState(generateProblem);
  const [lastAnswer, setLastAnswer] = useState<number | null>(null);
  const [battleCue, setBattleCue] = useState<"ready" | "hit" | "miss">("ready");
  const [log, setLog] = useState("轮到当前小伙伴答题。答对释放魔法，答错不攻击。");
  const [winnerId, setWinnerId] = useState<FighterId | null>(null);
  const fighters: Record<FighterId, ChildWithProgress> = { player, opponent };
  const defenderId: FighterId = turn === "player" ? "opponent" : "player";
  const current = fighters[turn];

  const options = useMemo(() => {
    const values = new Set<number>([problem.answer]);
    while (values.size < 4) {
      values.add(Math.max(0, Math.min(20, problem.answer + Math.floor(Math.random() * 9) - 4)));
    }
    return [...values].sort(() => Math.random() - 0.5);
  }, [problem]);

  const submit = (value: number) => {
    if (winnerId) return;
    setLastAnswer(value);

    if (value === problem.answer) {
      const nextHp = Math.max(0, hp[defenderId] - 20);
      const nextHpState = { ...hp, [defenderId]: nextHp };
      setHp(nextHpState);
      setBattleCue("hit");
      setLog(`${current.name} 答对了，珍珠光波命中，造成 20 伤害。`);

      if (nextHp === 0) {
        setWinnerId(turn);
        onWin(current);
        return;
      }

      setTurn(defenderId);
      setProblem(generateProblem());
      return;
    }

    setBattleCue("miss");
    setLog(`${current.name} 答错了，这一回合没有攻击。`);
    setTurn(defenderId);
    setProblem(generateProblem());
  };

  const winner = winnerId ? fighters[winnerId] : null;

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
            <h2>数学魔法竞技场</h2>
            <p>20 以内算术 · 答对攻击 · 胜者 +30 XP</p>
          </div>
          <div className="turn-banner">
            <Sparkles size={16} />
            {winner ? `${winner.name} 获胜` : `${current.name} 回合`}
          </div>
        </div>

        <div className={`battlefield ${battleCue}`}>
          <BattlePet fighter={player} hp={hp.player} side="left" active={turn === "player"} winner={winnerId === "player"} />

          <div className="problem-card">
            <span>本回合题目</span>
            <strong>{problem.text}</strong>
            <div className="answer-grid">
              {options.map((value) => (
                <button key={value} disabled={!!winner} onClick={() => submit(value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>

          <BattlePet fighter={opponent} hp={hp.opponent} side="right" active={turn === "opponent"} winner={winnerId === "opponent"} />
        </div>

        <div className="battle-log">
          <Zap size={18} />
          <span>{winner ? `${winner.name} 获胜，+30 XP 已记录。` : log}</span>
          {lastAnswer !== null && <em>最近选择：{lastAnswer}</em>}
        </div>
      </section>
    </div>
  );
}

function BattlePet({
  fighter,
  hp,
  side,
  active,
  winner,
}: {
  fighter: ChildWithProgress;
  hp: number;
  side: "left" | "right";
  active: boolean;
  winner: boolean;
}) {
  return (
    <div className={`battle-pet ${side} ${active ? "active" : ""} ${winner ? "winner" : ""}`}>
      <div className="battle-shadow" />
      <div className="battle-orb">
        <span>{fighter.petName.slice(0, 1)}</span>
      </div>
      <div className="battle-nameplate">
        <strong>{fighter.name}</strong>
        <em>{fighter.petName} · Lv.{fighter.level}</em>
      </div>
      <div className="hp-track" aria-label={`${fighter.name} HP`}>
        <div style={{ width: `${hp}%` }} />
      </div>
      <span className="hp-value">{hp} HP</span>
    </div>
  );
}
