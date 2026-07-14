"use client";

import { useMemo, useState } from "react";
import type {
  ExperimentRun,
  HypothesisDefinition,
  PublicCaseDefinition,
  VerdictSubmission,
} from "@/types/game";

export function VerdictForm({
  caseDefinition,
  runs,
  isSubmitting,
  apiError,
  onBack,
  onSubmit,
}: {
  caseDefinition: PublicCaseDefinition;
  runs: readonly ExperimentRun[];
  isSubmitting: boolean;
  apiError?: string;
  onBack: () => void;
  onSubmit: (submission: VerdictSubmission) => Promise<void>;
}) {
  const [hypothesisId, setHypothesisId] = useState("");
  const [confidence, setConfidence] = useState(70);
  const [evidenceIndexes, setEvidenceIndexes] = useState<number[]>([]);
  const [falsifiedHypothesisId, setFalsifiedHypothesisId] = useState("");
  const [falsifyingEvidenceRunIndex, setFalsifyingEvidenceRunIndex] = useState(-1);
  const [explanation, setExplanation] = useState("");
  const [localError, setLocalError] = useState("");

  const experimentById = useMemo(
    () =>
      Object.fromEntries(
        caseDefinition.experiments.map((experiment) => [experiment.id, experiment]),
      ),
    [caseDefinition.experiments],
  );

  const falsifyingCandidates = falsifiedHypothesisId
    ? runs
        .map((run, index) => {
          const experiment = experimentById[run.experimentId];
          const likelihood = experiment?.likelihoods[falsifiedHypothesisId]?.[run.outcomeId];
          return { run, index, likelihood: likelihood ?? 1 };
        })
        .filter((candidate) => candidate.likelihood <= 0.1)
    : [];

  function toggleEvidence(index: number) {
    setEvidenceIndexes((current) => {
      if (current.includes(index)) return current.filter((value) => value !== index);
      if (current.length >= 2) return current;
      return [...current, index];
    });
  }

  function chooseHypothesis(nextId: string) {
    setHypothesisId(nextId);
    if (falsifiedHypothesisId === nextId) {
      setFalsifiedHypothesisId("");
      setFalsifyingEvidenceRunIndex(-1);
    }
  }

  function chooseFalsified(hypothesis: HypothesisDefinition) {
    setFalsifiedHypothesisId(hypothesis.id);
    setFalsifyingEvidenceRunIndex(-1);
  }

  async function submitVerdict() {
    setLocalError("");
    if (!hypothesisId) {
      setLocalError("Choose the mechanism you are prepared to defend.");
      return;
    }
    if (evidenceIndexes.length !== 2) {
      setLocalError("Select exactly two evidence results.");
      return;
    }
    if (!falsifiedHypothesisId || falsifyingEvidenceRunIndex < 0) {
      setLocalError("Name one falsified alternative and the result that contradicts it.");
      return;
    }

    await onSubmit({
      hypothesisId,
      confidence,
      evidenceRunIndexes: [evidenceIndexes[0], evidenceIndexes[1]],
      falsifiedHypothesisId,
      falsifyingEvidenceRunIndex,
      ...(explanation.trim() ? { explanation: explanation.trim() } : {}),
    });
  }

  return (
    <section className="verdict-form" aria-labelledby="verdict-title">
      <header>
        <p className="stage-label">FINAL EVIDENCE CHAIN</p>
        <h1 id="verdict-title">Submit a mechanism.</h1>
        <p>
          A claim is only as strong as the alternatives its evidence makes
          impossible. Your verdict locks before the hidden mechanism is revealed.
        </p>
      </header>

      <div className="verdict-section">
        <div className="verdict-step-label"><span>01</span><strong>FINAL MECHANISM</strong></div>
        <fieldset className="verdict-hypotheses">
          <legend>Choose one final mechanism.</legend>
          {caseDefinition.hypotheses.map((hypothesis) => (
            <label
              key={hypothesis.id}
              className={`verdict-hypothesis pattern-${hypothesis.linePattern}${hypothesisId === hypothesis.id ? " is-selected" : ""}`}
              style={{ "--hypothesis-accent": hypothesis.accentColor } as React.CSSProperties}
            >
              <input
                type="radio"
                name="final-hypothesis"
                value={hypothesis.id}
                checked={hypothesisId === hypothesis.id}
                onChange={() => chooseHypothesis(hypothesis.id)}
              />
              <span aria-hidden="true">{hypothesis.icon}</span>
              <b>{hypothesis.shortLabel}</b>
              <strong>{hypothesis.title}</strong>
              <i>{hypothesisId === hypothesis.id ? "SELECTED" : "SELECT"}</i>
            </label>
          ))}
        </fieldset>

        <label className="confidence-control">
          <span><b>CONFIDENCE</b><small>How certain are you?</small></span>
          <input
            type="range"
            min="50"
            max="100"
            step="1"
            value={confidence}
            onChange={(event) => setConfidence(Number(event.target.value))}
            style={{ "--belief-value": `${(confidence - 50) * 2}%` } as React.CSSProperties}
          />
          <output>{confidence}%</output>
        </label>
      </div>

      <div className="verdict-section">
        <div className="verdict-step-label"><span>02</span><strong>TWO PIECES OF EVIDENCE</strong></div>
        <fieldset className="evidence-picker">
          <legend>Select exactly two results that support your verdict.</legend>
          {runs.map((run, index) => {
            const experiment = experimentById[run.experimentId];
            const outcome = experiment?.possibleOutcomes.find((item) => item.id === run.outcomeId);
            const checked = evidenceIndexes.includes(index);
            const atLimit = evidenceIndexes.length >= 2 && !checked;
            return (
              <label key={run.runId} className={checked ? "is-selected" : ""}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={atLimit}
                  onChange={() => toggleEvidence(index)}
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{outcome?.title ?? run.outcomeId}</strong>
                  <small>{experiment?.title ?? run.experimentId} · {run.informationGainBits.toFixed(3)} bits</small>
                </div>
                <b aria-hidden="true">{checked ? "✓" : "+"}</b>
              </label>
            );
          })}
        </fieldset>
      </div>

      <div className="verdict-section falsification-section">
        <div className="verdict-step-label"><span>03</span><strong>FALSIFIED ALTERNATIVE</strong></div>
        <div className="falsification-grid">
          <fieldset>
            <legend>Which competing mechanism did your evidence contradict?</legend>
            {caseDefinition.hypotheses
              .filter((hypothesis) => hypothesis.id !== hypothesisId)
              .map((hypothesis) => (
                <label key={hypothesis.id} className={falsifiedHypothesisId === hypothesis.id ? "is-selected" : ""}>
                  <input
                    type="radio"
                    name="falsified-hypothesis"
                    checked={falsifiedHypothesisId === hypothesis.id}
                    onChange={() => chooseFalsified(hypothesis)}
                  />
                  <span>{hypothesis.shortLabel}</span>
                  <strong>{hypothesis.title}</strong>
                </label>
              ))}
          </fieldset>
          <fieldset>
            <legend>Which result made that alternative unlikely?</legend>
            {!falsifiedHypothesisId ? (
              <p className="empty-choice">Choose an alternative first.</p>
            ) : falsifyingCandidates.length === 0 ? (
              <p className="empty-choice">None of your results strongly contradicts that alternative yet.</p>
            ) : (
              falsifyingCandidates.map(({ run, index }) => {
                const experiment = experimentById[run.experimentId];
                const outcome = experiment?.possibleOutcomes.find((item) => item.id === run.outcomeId);
                return (
                  <label key={run.runId} className={falsifyingEvidenceRunIndex === index ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="falsifying-evidence"
                      checked={falsifyingEvidenceRunIndex === index}
                      onChange={() => setFalsifyingEvidenceRunIndex(index)}
                    />
                    <span>R{index + 1}</span>
                    <strong>{outcome?.title ?? run.outcomeId}</strong>
                  </label>
                );
              })
            )}
          </fieldset>
        </div>
      </div>

      <label className="verdict-explanation">
        <span>OPTIONAL EXPLANATION · TWO SENTENCES MAX</span>
        <textarea
          rows={4}
          maxLength={280}
          value={explanation}
          placeholder="The mechanism is supported because…"
          onChange={(event) => setExplanation(event.target.value)}
        />
        <small>{explanation.length}/280</small>
      </label>

      <div className="verdict-actions">
        <button type="button" className="button-secondary game-secondary-button" onClick={onBack}>
          ← RETURN TO LAB
        </button>
        <div>
          {localError || apiError ? <p className="form-error" role="alert">{localError || apiError}</p> : null}
          <button
            type="button"
            className="button-primary game-primary-button"
            disabled={isSubmitting}
            onClick={submitVerdict}
          >
            {isSubmitting ? "LOCKING VERDICT…" : "LOCK VERDICT & REVEAL"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </section>
  );
}
