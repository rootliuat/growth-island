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
type LightEventKind = "ready" | "lit" | "try" | "complete";
type AnswerResult = "lit" | "try";

interface LightEvent {
  id: number;
  kind: LightEventKind;
  actor: FighterId;
}

interface SelectedAnswer {
  value: number;
  result: AnswerResult;
  eventId: number;
}

export function MathPkBattle({ player, opponent, spiritsById, onWin }: MathPkBattleProps) {
  const resolveTimerRef = useRef<number | undefined>(undefined);
  const [lights, setLights] = useState<Record<FighterId, number>>({ player: 0, opponent: 0 });
  const [turn, setTurn] = useState<FighterId>("player");
  const [problem, setProblem] = useState(generateProblem);
  const [lastAnswer, setLastAnswer] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<SelectedAnswer | undefined>();
  const [isResolving, setIsResolving] = useState(false);
  const [lightEvent, setLightEvent] = useState<LightEvent>({
    id: 0,
    kind: "ready",
    actor: "player",
  });
  const [log, setLog] = useState("当前小伙伴答题，答对点亮一枚贝壳。");
  const [completedId, setCompletedId] = useState<FighterId | null>(null);
  const fighters: Record<FighterId, ChildWithProgress> = { player, opponent };
  const nextTurnId: FighterId = turn === "player" ? "opponent" : "player";
  const current = fighters[turn];
  const lightGoal = 5;

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
    if (completedId || isResolving) return;
    if (resolveTimerRef.current) window.clearTimeout(resolveTimerRef.current);
    setLastAnswer(value);
    const eventId = Date.now();

    if (value === problem.answer) {
      const nextLights = Math.min(lightGoal, lights[turn] + 1);
      const nextLightState = { ...lights, [turn]: nextLights };
      setLights(nextLightState);
      setSelectedAnswer({ value, result: "lit", eventId });
      setLightEvent({
        id: eventId,
        kind: nextLights >= lightGoal ? "complete" : "lit",
        actor: turn,
      });
      setLog(`${current.name} 答对了，贝壳光路亮起一格。`);

      if (nextLights >= lightGoal) {
        setCompletedId(turn);
        onWin(current);
        return;
      }

      setIsResolving(true);
      resolveTimerRef.current = window.setTimeout(() => {
        setTurn(nextTurnId);
        setProblem(generateProblem());
        setSelectedAnswer(undefined);
        setIsResolving(false);
        resolveTimerRef.current = undefined;
      }, 420);
      return;
    }

    setSelectedAnswer({ value, result: "try", eventId });
    setLightEvent({
      id: eventId,
      kind: "try",
      actor: turn,
    });
    setLog(`${current.name} 这题先留着，换伙伴继续点亮。`);
    setIsResolving(true);
    resolveTimerRef.current = window.setTimeout(() => {
      setTurn(nextTurnId);
      setProblem(generateProblem());
      setSelectedAnswer(undefined);
      setIsResolving(false);
      resolveTimerRef.current = undefined;
    }, 420);
  };

  const completed = completedId ? fighters[completedId] : null;
  const fieldCue = completed ? "complete" : lightEvent.kind;

  return (
    <>
      <div className={`lightfield ${fieldCue} actor-${lightEvent.actor}`} data-light-cue={fieldCue}>
        <div className="light-turn-banner" aria-live="polite">
          <Sparkles size={16} />
          {completed ? `${completed.name} 完成点亮` : `${current.name} 点亮中`}
        </div>
        {lightEvent.kind !== "ready" && (
          <div key={`vfx-${lightEvent.id}`} className={`light-action-vfx ${lightEvent.kind} from-${lightEvent.actor}`} aria-hidden="true">
            <i />
            <span>{lightEvent.kind === "try" ? "再试" : "珍珠光"}</span>
          </div>
        )}
        <LightPartner
          fighter={player}
          lights={lights.player}
          lightGoal={lightGoal}
          side="left"
          active={turn === "player"}
          completed={completedId === "player"}
          glowing={lightEvent.actor === "player" && lightEvent.kind !== "ready"}
          popLabel={lightEvent.kind === "try" ? "再试" : "点亮"}
          eventId={lightEvent.id}
          spiritsById={spiritsById}
        />

        <div className="problem-card">
          <span>这一题</span>
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
                disabled={!!completed || isResolving}
                onClick={() => submit(value)}
              >
                <span>答案贝壳</span>
                <strong>{value}</strong>
                <em>{selectedAnswer?.value === value ? (selectedAnswer.result === "lit" ? "点亮" : "再试") : "待选"}</em>
              </button>
            ))}
          </div>
        </div>

        <LightPartner
          fighter={opponent}
          lights={lights.opponent}
          lightGoal={lightGoal}
          side="right"
          active={turn === "opponent"}
          completed={completedId === "opponent"}
          glowing={lightEvent.actor === "opponent" && lightEvent.kind !== "ready"}
          popLabel={lightEvent.kind === "try" ? "再试" : "点亮"}
          eventId={lightEvent.id}
          spiritsById={spiritsById}
        />
      </div>

      <div key={`log-${lightEvent.id}-${completedId ?? "live"}`} className={`light-log ${fieldCue}`} data-light-log-cue={fieldCue}>
        <Zap size={18} />
        <span>{completed ? `${completed.name} 点亮数学能量。` : log}</span>
        {lastAnswer !== null && <em>最近选择：{lastAnswer}</em>}
      </div>
    </>
  );
}

function LightPartner({
  fighter,
  lights,
  lightGoal,
  side,
  active,
  completed,
  glowing,
  popLabel,
  eventId,
  spiritsById,
}: {
  fighter: ChildWithProgress;
  lights: number;
  lightGoal: number;
  side: "left" | "right";
  active: boolean;
  completed: boolean;
  glowing: boolean;
  popLabel: "点亮" | "再试";
  eventId: number;
  spiritsById?: Map<string, SpiritDefinition>;
}) {
  const spirit = spiritsById?.get(fighter.spiritId);
  const asset = spirit ? getSpiritAsset(spirit, fighter.state) : undefined;

  return (
    <div className={`light-partner ${side} ${active ? "active" : ""} ${completed ? "complete" : ""} ${glowing ? "glowing" : ""}`}>
      <div className="light-shadow" />
      <div className={`light-orb ${asset?.url ? "has-image" : ""}`}>
        {asset?.url ? <img src={asset.url} alt={`${fighter.petName} 精灵`} /> : <span>{fighter.petName.slice(0, 1)}</span>}
      </div>
      {glowing && (
        <span key={`light-${eventId}`} className="light-pop" aria-live="polite">
          {popLabel}
        </span>
      )}
      {completed && <span className="light-complete-medal">数学能量</span>}
      <div className="light-nameplate">
        <strong>{fighter.name}</strong>
        <em>
          {fighter.petName} · 贝壳光路
        </em>
      </div>
      <div className="light-track" aria-label={`${fighter.name} 贝壳光路`}>
        <div style={{ width: `${(lights / lightGoal) * 100}%` }} />
      </div>
      <span className="light-value">{lights}/{lightGoal} 光格</span>
    </div>
  );
}
