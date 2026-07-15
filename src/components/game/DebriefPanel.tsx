import Link from "next/link";
import type { DebriefResponse } from "@/types/api";
import type { ExperimentRun, PublicCaseDefinition } from "@/types/game";
import { ReasoningFingerprintGraphic } from "./ReasoningFingerprintGraphic";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function DebriefPanel({
  caseDefinition,
  runs,
  debrief,
  onReset,
}: {
  caseDefinition: PublicCaseDefinition;
  runs: readonly ExperimentRun[];
  debrief: DebriefResponse;
  onReset: () => void;
}) {
  const experimentById = Object.fromEntries(
    caseDefinition.experiments.map((experiment) => [experiment.id, experiment]),
  );
  const finalHypothesis = caseDefinition.hypotheses.find(
    (hypothesis) => hypothesis.id === debrief.trueHypothesisId,
  );

  const fingerprintMetrics = [
    {
      label: "FALSIFICATION INDEX",
      value: percent(debrief.fingerprint.falsificationIndex),
      note: "Tests capable of eliminating an alternative",
    },
    {
      label: "REDUNDANCY RATE",
      value: percent(debrief.fingerprint.redundancyRate),
      note: "Runs returning under 0.10 bits",
    },
    {
      label: "EVIDENCE EFFICIENCY",
      value: `${debrief.fingerprint.evidenceEfficiency.toFixed(3)} b/u`,
      note: "Information gained per budget unit",
    },
    {
      label: "CALIBRATION GAP",
      value: `${debrief.fingerprint.calibrationGapPercentagePoints.toFixed(1)} pts`,
      note: "Your confidence versus the engine posterior",
    },
  ];

  return (
    <section className="debrief-panel" aria-labelledby="debrief-title">
      <div className="debrief-hero">
        <div className="debrief-fingerprint-hero">
          <span>FINAL REASONING SIGNATURE</span>
          <ReasoningFingerprintGraphic
            fingerprint={debrief.fingerprint}
            score={debrief.score.total}
          />
        </div>
        <div className="debrief-reveal">
          <p className="stage-label">CASE RESOLVED · HIDDEN MECHANISM REVEALED</p>
          <h1 id="debrief-title">{debrief.reveal.title}</h1>
          <div
            className={`revealed-hypothesis pattern-${finalHypothesis?.linePattern ?? "dot"}`}
            style={{ "--hypothesis-accent": finalHypothesis?.accentColor ?? "#54dce4" } as React.CSSProperties}
          >
            <span aria-hidden="true">{finalHypothesis?.icon ?? "◉"}</span>
            <div>
              <small>TRUE MECHANISM</small>
              <strong>{debrief.trueHypothesisTitle}</strong>
            </div>
          </div>
          <p>{debrief.reveal.explanation}</p>
        </div>
      </div>

      <figure className="debrief-resolution-field">
        {/* This neutral resolution artwork depicts no authored outcome or true mechanism. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cases/fading-signal/art/resolution-field.webp"
          alt="Three abstract scientific pathways separated by one precise control line."
          width={1672}
          height={941}
        />
        <figcaption>
          <span>SYNTHETIC RESOLUTION ART · NOT EVIDENCE</span>
          <span>THREE PATHWAYS · ONE SEPARATING CONTROL</span>
        </figcaption>
      </figure>

      <div className="debrief-grid">
        <article className="score-breakdown-card">
          <header><span>01</span><h2>SCORE BREAKDOWN</h2></header>
          <dl>
            <div><dt>CORRECT MECHANISM</dt><dd>{debrief.score.correctMechanism}<small>/50</small></dd></div>
            <div><dt>EVIDENCE CHAIN</dt><dd>{debrief.score.evidenceChain}<small>/20</small></dd></div>
            <div><dt>BUDGET EFFICIENCY</dt><dd>{debrief.score.budgetEfficiency}<small>/15</small></dd></div>
            <div><dt>FALSIFICATION QUALITY</dt><dd>{debrief.score.falsificationQuality}<small>/15</small></dd></div>
          </dl>
        </article>

        <article className="posterior-card">
          <header><span>02</span><h2>CALIBRATION</h2></header>
          <div className="confidence-comparison">
            <div>
              <span>YOUR CONFIDENCE</span>
              <strong>{debrief.playerConfidence}%</strong>
              <i><b style={{ width: `${debrief.playerConfidence}%` }} /></i>
            </div>
            <div>
              <span>ENGINE POSTERIOR</span>
              <strong>{percent(debrief.engineConfidence)}</strong>
              <i><b style={{ width: `${debrief.engineConfidence * 100}%` }} /></i>
            </div>
          </div>
          <p>Confidence is useful when it moves with evidence—not when it merely grows.</p>
        </article>
      </div>

      <article className="optimal-path-card">
        <header>
          <div><span>03</span><h2>THE DECISIVE PATH</h2></div>
          <strong>PAR {caseDefinition.parCost} · YOU SPENT {debrief.budgetSpent}</strong>
        </header>
        <div className="optimal-path-steps">
          {debrief.reveal.optimalPath.map((experimentId, index) => {
            const experiment = experimentById[experimentId];
            const playerRunIndex = runs.findIndex((run) => run.experimentId === experimentId);
            return (
              <div key={experimentId} className={playerRunIndex >= 0 ? "was-run" : "was-missed"}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <small>{experiment?.category.toUpperCase()} · COST {experiment?.cost}</small>
                  <strong>{experiment?.title ?? experimentId}</strong>
                  <p>{experiment?.purpose}</p>
                </div>
                <b>{playerRunIndex >= 0 ? `YOUR RUN ${playerRunIndex + 1}` : "NOT RUN"}</b>
              </div>
            );
          })}
        </div>
      </article>

      <section className="reasoning-fingerprint" aria-labelledby="reasoning-fingerprint-title">
        <header>
          <div><span>04</span><h2 id="reasoning-fingerprint-title">YOUR REASONING FINGERPRINT</h2></div>
          <p>Evidence habits made visible.</p>
        </header>
        <div className="fingerprint-metrics">
          {fingerprintMetrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.note}</p>
            </article>
          ))}
        </div>
      </section>

      <article className="one-more-control-card">
        <span>ONE MORE CONTROL</span>
        <div>
          <h2>What would make the conclusion even stronger?</h2>
          <p>{debrief.reveal.takeaway}</p>
        </div>
        <i aria-hidden="true">＋</i>
      </article>

      <div className="debrief-actions">
        <button type="button" className="button-primary game-primary-button" onClick={onReset}>
          REPLAY THE CASE <span aria-hidden="true">↻</span>
        </button>
        <Link href="/#method" className="button-secondary game-secondary-button">
          REVIEW THE METHOD <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
