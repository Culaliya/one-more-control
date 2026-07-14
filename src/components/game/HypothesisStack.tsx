import type {
  HypothesisDefinition,
  PlayerBeliefs,
} from "@/types/game";

function beliefState(value: number, highest: number): string {
  if (value === highest && value >= 40) return "PLAYER FAVORS";
  if (value <= 15) return "WEAKENED";
  return "ALIVE";
}

export function HypothesisStack({
  hypotheses,
  beliefs,
  compact = false,
}: {
  hypotheses: readonly HypothesisDefinition[];
  beliefs: PlayerBeliefs;
  compact?: boolean;
}) {
  const highest = Math.max(...hypotheses.map((hypothesis) => beliefs[hypothesis.id] ?? 0));

  return (
    <div className={`game-hypothesis-stack${compact ? " is-compact" : ""}`}>
      {hypotheses.map((hypothesis) => {
        const value = beliefs[hypothesis.id] ?? 0;
        const status = beliefState(value, highest);
        return (
          <article
            className={`game-hypothesis pattern-${hypothesis.linePattern}`}
            key={hypothesis.id}
            style={{ "--hypothesis-accent": hypothesis.accentColor } as React.CSSProperties}
          >
            <div className="hypothesis-heading">
              <span className="hypothesis-symbol" aria-hidden="true">
                {hypothesis.icon}
              </span>
              <div>
                <span className="micro-label">{hypothesis.shortLabel}</span>
                <h3>{hypothesis.title}</h3>
              </div>
              <span className="hypothesis-status">
                <i aria-hidden="true" /> {status}
              </span>
            </div>
            {!compact ? <p>{hypothesis.mechanism}</p> : null}
            <div className="belief-meter" aria-label={`${value} percent player belief`}>
              <span style={{ width: `${value}%` }} />
              <b>{value}%</b>
            </div>
          </article>
        );
      })}
    </div>
  );
}
