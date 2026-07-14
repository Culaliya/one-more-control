import { rebalanceBeliefPoints } from "@/lib/game/beliefs";
import type {
  HypothesisDefinition,
  PlayerBeliefs,
} from "@/types/game";

export function BeliefEditor({
  hypotheses,
  beliefs,
  onChange,
  heading,
  description,
}: {
  hypotheses: readonly HypothesisDefinition[];
  beliefs: PlayerBeliefs;
  onChange: (beliefs: PlayerBeliefs) => void;
  heading: string;
  description: string;
}) {
  const ids = hypotheses.map((hypothesis) => hypothesis.id);
  const total = ids.reduce((sum, id) => sum + (beliefs[id] ?? 0), 0);

  return (
    <section className="belief-editor" aria-labelledby="belief-editor-title">
      <header>
        <div>
          <p className="stage-label">BELIEF ALLOCATION</p>
          <h2 id="belief-editor-title">{heading}</h2>
          <p>{description}</p>
        </div>
        <div className="belief-total" aria-live="polite">
          <span>TOTAL</span>
          <strong>{total}</strong>
          <small>/100</small>
        </div>
      </header>
      <div className="belief-sliders">
        {hypotheses.map((hypothesis) => {
          const value = beliefs[hypothesis.id] ?? 0;
          const inputId = `belief-${hypothesis.id}`;
          return (
            <div
              className={`belief-row pattern-${hypothesis.linePattern}`}
              key={hypothesis.id}
              style={{ "--hypothesis-accent": hypothesis.accentColor } as React.CSSProperties}
            >
              <label htmlFor={inputId}>
                <span className="belief-hypothesis-id">
                  <i aria-hidden="true">{hypothesis.icon}</i>
                  {hypothesis.shortLabel}
                </span>
                <strong>{hypothesis.title}</strong>
                <output htmlFor={inputId}>{value}%</output>
              </label>
              <input
                id={inputId}
                type="range"
                min="5"
                max="90"
                step="1"
                value={value}
                onChange={(event) =>
                  onChange(
                    rebalanceBeliefPoints(
                      beliefs,
                      ids,
                      hypothesis.id,
                      Number(event.target.value),
                    ),
                  )
                }
                style={{ "--belief-value": `${value}%` } as React.CSSProperties}
              />
              <div className="slider-limits" aria-hidden="true">
                <span>5</span><span>MINIMUM BELIEF</span><span>90</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
