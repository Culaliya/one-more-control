import { ExperimentGlyph } from "./ExperimentGlyph";
import { HypothesisStack } from "./HypothesisStack";
import type {
  ExperimentDefinition,
  GameSession,
  PublicCaseDefinition,
} from "@/types/game";

const categoryTime: Record<string, string> = {
  repeat: "SHORT",
  abundance: "MEDIUM",
  orthogonal: "LONG",
  timing: "SHORT",
  rescue: "MEDIUM",
  titration: "MEDIUM",
};

export function LabBoard({
  caseDefinition,
  session,
  onSelectExperiment,
  onOpenVerdict,
}: {
  caseDefinition: PublicCaseDefinition;
  session: GameSession;
  onSelectExperiment: (experiment: ExperimentDefinition) => void;
  onOpenVerdict: () => void;
}) {
  const latestRun = session.runs.at(-1);
  const latestExperiment = latestRun
    ? caseDefinition.experiments.find((experiment) => experiment.id === latestRun.experimentId)
    : undefined;
  const latestOutcome = latestExperiment?.possibleOutcomes.find(
    (outcome) => outcome.id === latestRun?.outcomeId,
  );

  return (
    <section className="lab-board" aria-labelledby="lab-title">
      <header className="lab-title-row">
        <div>
          <p className="stage-label">ACTIVE CASE · AUTHOR THE NEXT TEST</p>
          <h1 id="lab-title">THE FADING SIGNAL</h1>
        </div>
        <div className="lab-progress">
          <span>{session.runs.length} RESULTS</span>
          <i aria-hidden="true"><b style={{ width: `${Math.min(100, session.runs.length * 24)}%` }} /></i>
          <span>{session.budgetRemaining} UNITS LEFT</span>
        </div>
      </header>

      <a className="jump-to-experiments" href="#experiment-deck">
        JUMP TO EXPERIMENTS <span aria-hidden="true">↓</span>
      </a>

      <div className="lab-main-grid">
        <aside className="lab-hypotheses" aria-label="Your current hypothesis beliefs">
          <header><span>YOUR HYPOTHESES</span><small>PLAYER BELIEFS</small></header>
          <HypothesisStack
            hypotheses={caseDefinition.hypotheses}
            beliefs={session.playerBeliefs}
          />
        </aside>

        <div className="lab-canvas">
          <header>
            <div>
              <span className="micro-label">{latestOutcome ? `LATEST RESULT · RUN ${session.runs.length}` : "INITIAL OBSERVATION"}</span>
              <strong>{latestOutcome?.title ?? "Fluorescence fell by 62%."}</strong>
            </div>
            <span className="canvas-status"><i aria-hidden="true" /> EVIDENCE ACTIVE</span>
          </header>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={latestOutcome?.assetSrc ?? caseDefinition.observationAsset.src}
              alt={latestOutcome?.summary ?? caseDefinition.observationAsset.alt}
              width={latestOutcome ? 960 : 1200}
              height={latestOutcome ? 560 : 760}
            />
            <figcaption>{latestOutcome?.summary ?? caseDefinition.brief}</figcaption>
          </figure>
        </div>

        <aside id="experiment-deck" className="experiment-deck" aria-label="Experiment deck">
          <header>
            <div><span>EXPERIMENT DECK</span><small>CHOOSE FOR SEPARATION</small></div>
            <strong>{session.budgetRemaining}<small>/100</small></strong>
          </header>
          <div className="experiment-list">
            {caseDefinition.experiments.map((experiment, index) => {
              const runCount = session.runs.filter((run) => run.experimentId === experiment.id).length;
              const exhausted = runCount >= experiment.maxRuns;
              const unaffordable = experiment.cost > session.budgetRemaining;
              const disabled = exhausted || unaffordable;
              return (
                <article key={experiment.id} className={disabled ? "is-disabled" : ""}>
                  <div className="experiment-card-heading">
                    <div className="experiment-card-mark">
                      <ExperimentGlyph
                        experimentId={experiment.id}
                        size={48}
                        decorative
                      />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div><small>{experiment.category.toUpperCase()}</small><h2>{experiment.title}</h2></div>
                    <b>−{experiment.cost}</b>
                  </div>
                  <p>{experiment.purpose}</p>
                  <div className="experiment-meta">
                    <span aria-label="One synthetic sample set">▧ 1 SAMPLE SET</span>
                    <span aria-label={`${categoryTime[experiment.category]} simulated time`}>◷ {categoryTime[experiment.category]}</span>
                    <span>{runCount}/{experiment.maxRuns} RUN</span>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectExperiment(experiment)}
                  >
                    {exhausted ? "RUN LIMIT REACHED" : unaffordable ? "INSUFFICIENT BUDGET" : "PREDICT BEFORE RUNNING"}
                    {!disabled ? <span aria-hidden="true">↗</span> : null}
                  </button>
                </article>
              );
            })}
          </div>
          <button
            className="submit-mechanism-button"
            type="button"
            disabled={session.runs.length < 2}
            onClick={onOpenVerdict}
          >
            <span>SUBMIT A MECHANISM</span>
            <small>{session.runs.length < 2 ? `${2 - session.runs.length} MORE RESULT${session.runs.length === 1 ? "" : "S"} REQUIRED` : "EVIDENCE CHAIN UNLOCKED"}</small>
            <b aria-hidden="true">→</b>
          </button>
        </aside>
      </div>

      <section className="lab-notebook" aria-labelledby="notebook-title">
        <header><h2 id="notebook-title">LAB NOTEBOOK</h2><span>PLAYER RECORD · LOCAL ONLY</span></header>
        <div className="notebook-timeline">
          <article className="notebook-entry initial-entry">
            <span>00</span><i aria-hidden="true" />
            <div><small>INITIAL OBSERVATION</small><strong>Fluorescence slope −62%</strong><p>Mechanism unresolved.</p></div>
          </article>
          {session.runs.map((run, index) => {
            const experiment = caseDefinition.experiments.find((item) => item.id === run.experimentId);
            const outcome = experiment?.possibleOutcomes.find((item) => item.id === run.outcomeId);
            return (
              <article className="notebook-entry" key={run.runId}>
                <span>{String(index + 1).padStart(2, "0")}</span><i aria-hidden="true" />
                <div><small>{experiment?.category.toUpperCase()} · {run.informationGainBits.toFixed(3)} BITS</small><strong>{outcome?.title ?? run.outcomeId}</strong><p>Cost {run.cost} · beliefs {run.playerBeliefsAfter ? "updated" : "pending"}</p></div>
              </article>
            );
          })}
          <article className="notebook-entry future-entry">
            <span>{String(session.runs.length + 1).padStart(2, "0")}</span><i aria-hidden="true" />
            <div><small>NEXT DECISION</small><strong>Choose a control that separates.</strong></div>
          </article>
        </div>
      </section>
    </section>
  );
}
