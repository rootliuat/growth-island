import { useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { generateProblem } from "../domain/mathPk";
import { getSpiritAsset } from "../domain/spiritAssets";
import type { ChildWithProgress, SpiritDefinition } from "../types";

interface MathPkBattleProps {
  player: ChildWithProgress;
  opponent: ChildWithProgress;
  spiritsById?: Map<string, SpiritDefinition>;
  onWin: (winner: ChildWithProgress) => void;
}

type FighterId = "player" | "opponent";

export function MathPkBattle({ player, opponent, spiritsById, onWin }: MathPkBattleProps) {
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
    <>
      <div className={`battlefield ${battleCue}`}>
        <BattlePet
          fighter={player}
          hp={hp.player}
          side="left"
          active={turn === "player"}
          winner={winnerId === "player"}
          spiritsById={spiritsById}
        />

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

        <BattlePet
          fighter={opponent}
          hp={hp.opponent}
          side="right"
          active={turn === "opponent"}
          winner={winnerId === "opponent"}
          spiritsById={spiritsById}
        />
      </div>

      <div className="battle-log">
        <Zap size={18} />
        <span>{winner ? `${winner.name} 获胜，+30 XP 已记录。` : log}</span>
        {lastAnswer !== null && <em>最近选择：{lastAnswer}</em>}
      </div>
    </>
  );
}

function BattlePet({
  fighter,
  hp,
  side,
  active,
  winner,
  spiritsById,
}: {
  fighter: ChildWithProgress;
  hp: number;
  side: "left" | "right";
  active: boolean;
  winner: boolean;
  spiritsById?: Map<string, SpiritDefinition>;
}) {
  const spirit = spiritsById?.get(fighter.spiritId);
  const asset = spirit ? getSpiritAsset(spirit, fighter.state) : undefined;

  return (
    <div className={`battle-pet ${side} ${active ? "active" : ""} ${winner ? "winner" : ""}`}>
      <div className="battle-shadow" />
      <div className={`battle-orb ${asset?.url ? "has-image" : ""}`}>
        {asset?.url ? <img src={asset.url} alt={`${fighter.petName} 精灵`} /> : <span>{fighter.petName.slice(0, 1)}</span>}
      </div>
      <div className="battle-nameplate">
        <strong>{fighter.name}</strong>
        <em>
          {fighter.petName} · Lv.{fighter.level}
        </em>
      </div>
      <div className="hp-track" aria-label={`${fighter.name} HP`}>
        <div style={{ width: `${hp}%` }} />
      </div>
      <span className="hp-value">{hp} HP</span>
    </div>
  );
}
