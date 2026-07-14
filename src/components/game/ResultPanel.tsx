import type {
  ExperimentDefinition,
  ExperimentOutcome,
  ExperimentRun,
  HypothesisDefinition,
} from "@/types/game";

export function ResultPanel({
  run,
  experiment,
  outcome,
  hypotheses,
  onContinue,
}: {
  run: ExperimentRun;
  experiment: ExperimentDefinition;
  outcome: ExperimentOutcome;
  hypotheses: readonly HypothesisDefinition[];
  onContinue: () => void;
}) {
  const labelById = Object.fromEntries(
    hypotheses.map((hypothesis) => [hypothesis.id, hypothesis.shortLabel]),
  );
  const predictionLabel = run.prediction.splitGroups
    .map((group) => group.map((id) => labelById[id] ?? id).join(" + "))
    .join("  |  ");
  const lowInformation = run.informationGainBits < 0.1;

  return (
    <section className="result-panel" aria-labelledby="result-title">
      <header className="result-title-row">
        <div>
          <p className="stage-label">AUTHORED RESULT · {experiment.category.toUpperCase()}</p>
          <h1 id="result-title">{outcome.title}</h1>
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
          <div className={`information-callout${lowInformation ? " is-low" : " is-decisive"}`}>
            <span>REALIZED INFORMATION</span>
            <strong>{run.informationGainBits.toFixed(3)}<small> BITS</small></strong>
            <div className="information-scale" aria-hidden="true">
              <i style={{ width: `${Math.min(100, run.informationGainBits * 72)}%` }} />
            </div>
            {lowInformation ? (
              <p>MORE DATA. ALMOST NO INFORMATION.</p>
            ) : (
              <p>This result moved the evidence.</p>
            )}
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
              <dt>YOUR PREDICTED SPLIT</dt>
              <dd>{predictionLabel}</dd>
            </div>
            <div>
              <dt>PREDICTION VALUE</dt>
              <dd className={run.predictionUseful ? "prediction-useful" : "prediction-limited"}>
                <span aria-hidden="true">{run.predictionUseful ? "✓" : "△"}</span>{" "}
                {run.predictionUseful ? "USEFUL SEPARATION" : "LIMITED SEPARATION"}
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
