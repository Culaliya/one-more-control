import Link from "next/link";
import type { GamePhase } from "@/types/game";

const phaseLabel: Record<GamePhase, string> = {
  briefing: "01 / BRIEFING",
  priors: "02 / PRIORS",
  lab: "03 / LAB",
  result: "04 / RESULT",
  belief_update: "05 / BELIEF UPDATE",
  verdict: "06 / VERDICT",
  debrief: "07 / DEBRIEF",
};

export function GameHeader({
  phase,
  budget,
  onReset,
}: {
  phase: GamePhase;
  budget: number;
  onReset: () => void;
}) {
  return (
    <header className="game-header">
      <Link href="/" className="game-brand" aria-label="Return to landing page">
        <span className="brand-pulse" aria-hidden="true" />
        <span>ONE MORE CONTROL</span>
      </Link>
      <div className="game-phase" aria-live="polite">
        <span>CASE 01</span>
        <strong>{phaseLabel[phase]}</strong>
      </div>
      <div className="game-header-actions">
        <div className="header-budget" aria-label={`${budget} budget units remaining`}>
          <span>BUDGET</span>
          <strong>{budget.toString().padStart(3, "0")}</strong>
        </div>
        {/* TODO(Task 03): enable the accessible hypothesis soundscape. */}
        <button className="header-utility" type="button" disabled>
          SOUND OFF
        </button>
        <button className="header-utility reset-button" type="button" onClick={onReset}>
          RESET
        </button>
      </div>
    </header>
  );
}
