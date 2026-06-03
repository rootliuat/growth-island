import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Zap } from "lucide-react";
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
type BattleEventKind = "ready" | "hit" | "miss" | "win";
type AnswerResult = "hit" | "miss";

interface BattleEvent {
  id: number;
  kind: BattleEventKind;
  attacker: FighterId;
  defender: FighterId;
  damage: number;
}

interface SelectedAnswer {
  value: number;
  result: AnswerResult;
  eventId: number;
}

export function MathPkBattle({ player, opponent, spiritsById, onWin }: MathPkBattleProps) {
  const resolveTimerRef = useRef<number | undefined>(undefined);
  const [hp, setHp] = useState<Record<FighterId, number>>({ player: 100, opponent: 100 });
  const [turn, setTurn] = useState<FighterId>("player");
  const [problem, setProblem] = useState(generateProblem);
  const [lastAnswer, setLastAnswer] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<SelectedAnswer | undefined>();
  const [isResolving, setIsResolving] = useState(false);
  const [battleEvent, setBattleEvent] = useState<BattleEvent>({
    id: 0,
    kind: "ready",
    attacker: "player",
    defender: "opponent",
    damage: 0,
  });
  const [log, setLog] = useState("轮到当前小伙伴答题。答对点亮一束光。");
  const [winnerId, setWinnerId] = useState<FighterId | null>(null);
  const fighters: Record<FighterId, ChildWithProgress> = { player, opponent };
  const defenderId: FighterId = turn === "player" ? "opponent" : "player";
  const current = fighters[turn];
  const defender = fighters[defenderId];

  useEffect(() => {
    return () => {
      if (resolveTimerRef.current) window.clearTimeout(resolveTimerRef.current);
    };
  }, []);

  const options = useMemo(() => {
    const values = new Set<number>([problem.answer]);
    while (values.size < 4) {
      values.add(Math.max(0, Math.min(20, problem.answer + Math.floor(Math.random() * 9) - 4)));
    }
    return [...values].sort(() => Math.random() - 0.5);
  }, [problem]);

  const submit = (value: number) => {
    if (winnerId || isResolving) return;
    if (resolveTimerRef.current) window.clearTimeout(resolveTimerRef.current);
    setLastAnswer(value);
    const eventId = Date.now();

    if (value === problem.answer) {
      const nextHp = Math.max(0, hp[defenderId] - 20);
      const nextHpState = { ...hp, [defenderId]: nextHp };
      setHp(nextHpState);
      setSelectedAnswer({ value, result: "hit", eventId });
      setBattleEvent({
        id: eventId,
        kind: nextHp === 0 ? "win" : "hit",
        attacker: turn,
        defender: defenderId,
        damage: 20,
      });
      setLog(`${current.name} 答对了，贝壳赛道亮起一束光。`);

      if (nextHp === 0) {
        setWinnerId(turn);
        onWin(current);
        return;
      }

      setIsResolving(true);
      resolveTimerRef.current = window.setTimeout(() => {
        setTurn(defenderId);
        setProblem(generateProblem());
        setSelectedAnswer(undefined);
        setIsResolving(false);
        resolveTimerRef.current = undefined;
      }, 420);
      return;
    }

    setSelectedAnswer({ value, result: "miss", eventId });
    setBattleEvent({
      id: eventId,
      kind: "miss",
      attacker: turn,
      defender: defenderId,
      damage: 0,
    });
    setLog(`${current.name} 这题没点亮，换下一位继续。`);
    setIsResolving(true);
    resolveTimerRef.current = window.setTimeout(() => {
      setTurn(defenderId);
      setProblem(generateProblem());
      setSelectedAnswer(undefined);
      setIsResolving(false);
      resolveTimerRef.current = undefined;
    }, 420);
  };

  const winner = winnerId ? fighters[winnerId] : null;
  const fieldCue = winner ? "win" : battleEvent.kind;

  return (
    <>
      <div className={`battlefield ${fieldCue} attacker-${battleEvent.attacker}`} data-battle-cue={fieldCue}>
        <div className="battle-turn-banner" aria-live="polite">
          <Sparkles size={16} />
          {winner ? `${winner.name} 完成闯关` : `${current.name} 回合`}
        </div>
        {battleEvent.kind !== "ready" && (
          <div key={`vfx-${battleEvent.id}`} className={`battle-action-vfx ${battleEvent.kind} from-${battleEvent.attacker}`} aria-hidden="true">
            <i />
            <span>{battleEvent.kind === "miss" ? "再试" : "珍珠光"}</span>
          </div>
        )}
        <BattlePet
          fighter={player}
          hp={hp.player}
          side="left"
          active={turn === "player"}
          winner={winnerId === "player"}
          attacking={battleEvent.attacker === "player" && battleEvent.kind !== "ready"}
          damaged={battleEvent.defender === "player" && (battleEvent.kind === "hit" || battleEvent.kind === "win")}
          damage={battleEvent.defender === "player" ? battleEvent.damage : 0}
          eventId={battleEvent.id}
          spiritsById={spiritsById}
        />

        <div className="problem-card">
          <span>本回合题目</span>
          <strong>{problem.text}</strong>
          <div className="answer-grid" aria-label="技能贝壳答案">
            {options.map((value) => (
              <button
                key={value}
                type="button"
                className={`skill-shell ${selectedAnswer?.value === value ? `selected ${selectedAnswer.result}` : "ready"}`}
                data-answer-value={value}
                data-answer-state={selectedAnswer?.value === value ? selectedAnswer.result : "ready"}
                aria-pressed={selectedAnswer?.value === value}
                disabled={!!winner || isResolving}
                onClick={() => submit(value)}
              >
                <span>技能贝壳</span>
                <strong>{value}</strong>
                <em>{selectedAnswer?.value === value ? (selectedAnswer.result === "hit" ? "点亮" : "再试") : "待选"}</em>
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
          attacking={battleEvent.attacker === "opponent" && battleEvent.kind !== "ready"}
          damaged={battleEvent.defender === "opponent" && (battleEvent.kind === "hit" || battleEvent.kind === "win")}
          damage={battleEvent.defender === "opponent" ? battleEvent.damage : 0}
          eventId={battleEvent.id}
          spiritsById={spiritsById}
        />
      </div>

      <div key={`log-${battleEvent.id}-${winnerId ?? "live"}`} className={`battle-log ${fieldCue}`} data-battle-log-cue={fieldCue}>
        <Zap size={18} />
        <span>{winner ? `${winner.name} 点亮数学能量。` : log}</span>
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
  attacking,
  damaged,
  damage,
  eventId,
  spiritsById,
}: {
  fighter: ChildWithProgress;
  hp: number;
  side: "left" | "right";
  active: boolean;
  winner: boolean;
  attacking: boolean;
  damaged: boolean;
  damage: number;
  eventId: number;
  spiritsById?: Map<string, SpiritDefinition>;
}) {
  const spirit = spiritsById?.get(fighter.spiritId);
  const asset = spirit ? getSpiritAsset(spirit, fighter.state) : undefined;

  return (
    <div className={`battle-pet ${side} ${active ? "active" : ""} ${winner ? "winner" : ""} ${attacking ? "attacking" : ""} ${damaged ? "damaged" : ""}`}>
      <div className="battle-shadow" />
      <div className={`battle-orb ${asset?.url ? "has-image" : ""}`}>
        {asset?.url ? <img src={asset.url} alt={`${fighter.petName} 精灵`} /> : <span>{fighter.petName.slice(0, 1)}</span>}
      </div>
      {damaged && damage > 0 && (
        <span key={`damage-${eventId}`} className="battle-damage-pop" aria-live="polite">
          点亮
        </span>
      )}
      {winner && <span className="battle-winner-medal">数学能量</span>}
      <div className="battle-nameplate">
        <strong>{fighter.name}</strong>
        <em>
          {fighter.petName} · 闯关光
        </em>
      </div>
      <div className="hp-track" aria-label={`${fighter.name} 闯关光`}>
        <div style={{ width: `${hp}%` }} />
      </div>
      <span className="hp-value">{Math.max(0, Math.ceil(hp / 20))} 格光</span>
    </div>
  );
}
