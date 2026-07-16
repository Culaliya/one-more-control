import type {
  ExperimentDefinition,
  ExperimentOutcome,
  ExperimentRun,
  HypothesisDefinition,
} from "@/types/game";
import { classifyResultInformationRole } from "@/lib/game/experiment-structure";
import { ExperimentGlyph } from "./ExperimentGlyph";

export function ResultPanel({
  run,
  experiment,
  priorExperiments,
  outcome,
  hypotheses,
  onContinue,
}: {
  run: ExperimentRun;
  experiment: ExperimentDefinition;
  priorExperiments: readonly ExperimentDefinition[];
  outcome: ExperimentOutcome;
  hypotheses: readonly HypothesisDefinition[];
  onContinue: () => void;
}) {
  const labelById = Object.fromEntries(
    hypotheses.map((hypothesis) => [hypothesis.id, hypothesis.shortLabel]),
  );
  const predictionLabel = run.prediction.mode === "split"
    ? run.prediction.splitGroups
        .map((group) => group.map((id) => labelById[id] ?? id).join(" + "))
        .join("  |  ")
    : run.prediction.hypothesisIds
        .map((id) => labelById[id] ?? id)
        .join(" + ");
  const informationRole = classifyResultInformationRole({
    experiment,
    priorExperiments,
    informationGainBits: run.informationGainBits,
    predictionUseful: run.predictionUseful,
  });
  const resultClass = informationRole === "low_value"
    ? "result-low"
    : informationRole === "independent_confirmation"
      ? "result-confirmation"
      : "result-decisive";
  const calloutClass = informationRole === "low_value"
    ? "is-low"
    : informationRole === "independent_confirmation"
      ? "is-confirmation"
      : "is-decisive";

  return (
    <section
      className={`result-panel ${resultClass}`}
      aria-labelledby="result-title"
    >
      <header className="result-title-row">
        <div className="result-heading-lockup">
          <ExperimentGlyph
            className="result-experiment-glyph"
            experimentId={experiment.id}
            size={62}
            decorative
          />
          <div>
            <p className="stage-label">AUTHORED RESULT · {experiment.category.toUpperCase()}</p>
            <h1 id="result-title">{outcome.title}</h1>
          </div>
        </div>
        <span className="result-index">RESULT {run.runId.split("-").at(-1)}</span>
      </header>

      <div className="result-layout">
        <figure className="result-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={outcome.assetSrc}
            alt={outcome.summary}
            width={960}
            height={560}
          />
          <figcaption>{outcome.summary}</figcaption>
        </figure>

        <aside className="result-analysis" aria-label="Result analysis">
          <div className={`information-callout ${calloutClass}`}>
            <span>REALIZED INFORMATION</span>
            <strong>{run.informationGainBits.toFixed(3)}<small> BITS</small></strong>
            <div className="information-scale" aria-hidden="true">
              <i style={{ width: `${Math.min(100, run.informationGainBits * 72)}%` }} />
            </div>
            {informationRole === "low_value" ? (
              <p>MORE DATA. ALMOST NO INFORMATION.</p>
            ) : informationRole === "independent_confirmation" ? (
              <p>LOW INCREMENTAL UPDATE.<br />INDEPENDENT CONFIRMATION.</p>
            ) : (
              <p>THIS RESULT MOVED THE EVIDENCE.</p>
            )}
            <small className="bits-explainer">
              Bits measure how much this result changed the probability of the competing mechanisms.
            </small>
          </div>

          <dl className="result-facts">
            <div>
              <dt>EXPERIMENT</dt>
              <dd>{experiment.title}</dd>
            </div>
            <div>
              <dt>COST</dt>
              <dd>−{run.cost} UNITS</dd>
            </div>
            <div>
              <dt>{run.prediction.mode === "split" ? "YOUR PREDICTED SPLIT" : "YOUR PREDICTED PATTERN"}</dt>
              <dd>{predictionLabel}</dd>
            </div>
            <div>
              <dt>PREDICTION VALUE</dt>
              <dd className={run.predictionUseful ? "prediction-useful" : "prediction-limited"}>
                <span aria-hidden="true">{run.predictionUseful ? "✓" : "△"}</span>{" "}
                {run.predictionUseful
                  ? run.prediction.mode === "no_separation"
                    ? "CORRECT: NO SEPARATION"
                    : "MATCHED SEPARATION"
                  : run.prediction.mode === "no_separation"
                    ? "SEPARATION WAS AVAILABLE"
                    : "PREDICTION MISSED THE PATTERN"}
              </dd>
            </div>
          </dl>

          <button className="button-primary game-primary-button" type="button" onClick={onContinue}>
            UPDATE MY BELIEFS <span aria-hidden="true">→</span>
          </button>
        </aside>
      </div>
    </section>
  );
}
