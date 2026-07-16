"use client";

import { useMemo, useState } from "react";
import { ExperimentGlyph } from "./ExperimentGlyph";
import type {
  ExperimentDefinition,
  HypothesisDefinition,
  HypothesisId,
  PlayerPrediction,
} from "@/types/game";

type PredictionGroup = "a" | "b" | "unassigned";
type PredictionMode = "split" | "no_separation";

export function PredictionGate({
  experiment,
  hypotheses,
  isRunning,
  error,
  onCancel,
  onRun,
}: {
  experiment: ExperimentDefinition;
  hypotheses: readonly HypothesisDefinition[];
  isRunning: boolean;
  error?: string;
  onCancel: () => void;
  onRun: (prediction: PlayerPrediction) => Promise<void>;
}) {
  const [assignments, setAssignments] = useState<Record<HypothesisId, PredictionGroup>>(
    () => Object.fromEntries(hypotheses.map((hypothesis) => [hypothesis.id, "unassigned"])),
  );
  const [mode, setMode] = useState<PredictionMode>("split");
  const [rationale, setRationale] = useState("");

  const groups = useMemo(() => {
    const groupA = hypotheses
      .filter((hypothesis) => assignments[hypothesis.id] === "a")
      .map((hypothesis) => hypothesis.id);
    const groupB = hypotheses
      .filter((hypothesis) => assignments[hypothesis.id] === "b")
      .map((hypothesis) => hypothesis.id);
    return { groupA, groupB };
  }, [assignments, hypotheses]);

  const allAssigned = hypotheses.every(
    (hypothesis) => assignments[hypothesis.id] !== "unassigned",
  );
  const validSplit = allAssigned && groups.groupA.length > 0 && groups.groupB.length > 0;
  const predictionReady = mode === "no_separation" || validSplit;

  function assign(hypothesisId: HypothesisId, group: "a" | "b") {
    setAssignments((current) => ({ ...current, [hypothesisId]: group }));
  }

  async function submitPrediction() {
    if (!predictionReady) return;
    const conciseRationale = rationale.trim();
    if (mode === "no_separation") {
      await onRun({
        mode,
        hypothesisIds: hypotheses.map((hypothesis) => hypothesis.id),
        ...(conciseRationale ? { rationale: conciseRationale } : {}),
      });
      return;
    }
    await onRun({
      mode,
      splitGroups: [groups.groupA, groups.groupB],
      ...(conciseRationale ? { rationale: conciseRationale } : {}),
    });
  }

  return (
    <section className="prediction-gate" aria-labelledby="prediction-title">
      <header className="prediction-header">
        <div>
          <p className="stage-label">PREDICTION GATE · COST {experiment.cost}</p>
          <h2 id="prediction-title">What result pattern do you expect?</h2>
          <p>
            Commit before the result. A useful prediction may separate mechanisms—or
            honestly predict that all three will look the same.
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onCancel} aria-label="Close prediction gate">
          ×
        </button>
      </header>

      <article className="prediction-experiment-summary">
        <span className="experiment-number">
          <ExperimentGlyph experimentId={experiment.id} size={46} decorative />
        </span>
        <div>
          <span className="micro-label">SELECTED EXPERIMENT</span>
          <strong>{experiment.title}</strong>
          <p>{experiment.purpose}</p>
        </div>
        <b>−{experiment.cost}</b>
      </article>

      <fieldset className="prediction-mode-picker">
        <legend>Choose the structure of your prediction.</legend>
        <button
          type="button"
          className={mode === "split" ? "is-selected" : ""}
          aria-pressed={mode === "split"}
          onClick={() => setMode("split")}
        >
          <strong>SPLIT OUTCOMES</strong>
          <span>At least one mechanism should behave differently.</span>
        </button>
        <button
          type="button"
          className={mode === "no_separation" ? "is-selected" : ""}
          aria-pressed={mode === "no_separation"}
          onClick={() => setMode("no_separation")}
        >
          <strong>NO SEPARATION</strong>
          <span>All three mechanisms should produce the same outcome.</span>
        </button>
      </fieldset>

      {mode === "split" ? (
        <fieldset className="prediction-board">
          <legend>Place every hypothesis into predicted outcome group A or B.</legend>
          {hypotheses.map((hypothesis) => {
            const assignment = assignments[hypothesis.id];
            return (
              <div
                className={`prediction-hypothesis pattern-${hypothesis.linePattern}`}
                key={hypothesis.id}
                style={{ "--hypothesis-accent": hypothesis.accentColor } as React.CSSProperties}
              >
                <div className="prediction-chip-label">
                  <i aria-hidden="true">{hypothesis.icon}</i>
                  <span>{hypothesis.shortLabel}</span>
                  <strong>{hypothesis.title}</strong>
                </div>
                <div className="group-toggle" role="group" aria-label={`Prediction group for ${hypothesis.title}`}>
                  <button
                    type="button"
                    className={assignment === "a" ? "is-selected" : ""}
                    aria-pressed={assignment === "a"}
                    onClick={() => assign(hypothesis.id, "a")}
                  >
                    GROUP A
                  </button>
                  <button
                    type="button"
                    className={assignment === "b" ? "is-selected" : ""}
                    aria-pressed={assignment === "b"}
                    onClick={() => assign(hypothesis.id, "b")}
                  >
                    GROUP B
                  </button>
                </div>
              </div>
            );
          })}
        </fieldset>
      ) : (
        <article className="no-separation-prediction" aria-label="No separation prediction">
          <span>ONE PREDICTED OUTCOME</span>
          <strong>H1 + H2 + H3 remain together.</strong>
          <p>Reproducible data can still carry almost no information about which mechanism is true.</p>
        </article>
      )}

      <label className="rationale-field">
        <span>OPTIONAL RATIONALE · ONE SENTENCE</span>
        <textarea
          value={rationale}
          maxLength={180}
          rows={2}
          placeholder={
            mode === "split"
              ? "I expect this test to separate…"
              : "I expect the same dominant outcome under all three mechanisms because…"
          }
          onChange={(event) => setRationale(event.target.value)}
        />
        <small>{rationale.length}/180</small>
      </label>

      <div className="prediction-footer">
        <p className={predictionReady ? "is-ready" : ""} aria-live="polite">
          <span aria-hidden="true">{predictionReady ? "✓" : "○"}</span>{" "}
          {mode === "no_separation"
            ? "Prediction ready: no separation expected."
            : validSplit
              ? "Prediction ready: both outcome groups are represented."
              : "Assign all three hypotheses and use both groups."}
        </p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button
          type="button"
          className="button-primary game-primary-button"
          disabled={!predictionReady || isRunning}
          onClick={submitPrediction}
        >
          {isRunning ? "RUNNING AUTHORED RESULT…" : `RUN EXPERIMENT · −${experiment.cost}`}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}
