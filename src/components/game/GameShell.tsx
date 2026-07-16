"use client";

import { useEffect, useMemo, useState } from "react";
import {
  observationResponseSchema,
  type ObservationResponse,
} from "@/lib/ai/schemas";
import { createInitialPlayerBeliefs } from "@/lib/game/beliefs";
import {
  createInitialGameSession,
  gameReducer,
  GameRuleError,
  type GameAction,
} from "@/lib/game/reducer";
import {
  validatePlayerBeliefs,
  validatePlayerPrediction,
} from "@/lib/game/validation";
import type {
  DebriefResponse,
  ExperimentRunResponse,
} from "@/types/api";
import type {
  ExperimentDefinition,
  ExperimentRun,
  GamePhase,
  GameSession,
  PlayerBeliefs,
  PlayerPrediction,
  ProbabilityDistribution,
  PublicCaseDefinition,
  VerdictSubmission,
} from "@/types/game";
import { BeliefEditor } from "./BeliefEditor";
import { BriefingPanel } from "./BriefingPanel";
import { DebriefPanel } from "./DebriefPanel";
import { GameHeader } from "./GameHeader";
import { HypothesisStack } from "./HypothesisStack";
import { LabBoard } from "./LabBoard";
import { PredictionGate } from "./PredictionGate";
import { ResultPanel } from "./ResultPanel";
import { VerdictForm } from "./VerdictForm";

const STORAGE_KEY = "one-more-control:fading-signal:v2";
const LEGACY_STORAGE_KEY = "one-more-control:fading-signal:v1";
const validPhases = new Set<GamePhase>([
  "briefing",
  "priors",
  "lab",
  "result",
  "belief_update",
  "verdict",
  "debrief",
]);

interface SavedGameEnvelope {
  session: GameSession;
  observation: ObservationResponse | null;
  debrief: DebriefResponse | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readApiError(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

function isProbabilityDistribution(
  value: unknown,
  hypothesisIds: readonly string[],
): value is ProbabilityDistribution {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === hypothesisIds.length &&
    keys.every(
      (key) =>
        hypothesisIds.includes(key) &&
        typeof value[key] === "number" &&
        Number.isFinite(value[key]),
    )
  );
}

function isExperimentRunResponse(
  value: unknown,
  hypothesisIds: readonly string[],
): value is ExperimentRunResponse {
  if (!isRecord(value) || !isRecord(value.outcome)) return false;
  return (
    typeof value.runId === "string" &&
    typeof value.experimentId === "string" &&
    typeof value.cost === "number" &&
    typeof value.budgetRemaining === "number" &&
    typeof value.outcome.id === "string" &&
    typeof value.outcome.title === "string" &&
    typeof value.outcome.summary === "string" &&
    typeof value.outcome.assetSrc === "string" &&
    isProbabilityDistribution(value.enginePrior, hypothesisIds) &&
    isProbabilityDistribution(value.enginePosterior, hypothesisIds) &&
    typeof value.informationGainBits === "number" &&
    Number.isFinite(value.informationGainBits) &&
    typeof value.predictionUseful === "boolean" &&
    typeof value.predictionMessage === "string"
  );
}

function isPlayerPrediction(
  value: unknown,
  hypothesisIds: readonly string[],
): value is PlayerPrediction {
  if (!isRecord(value) || typeof value.mode !== "string") return false;
  const candidate = value as unknown as PlayerPrediction;
  if (value.mode === "split") {
    if (
      !Array.isArray(value.splitGroups) ||
      value.splitGroups.length !== 2 ||
      !value.splitGroups.every(
        (group) => Array.isArray(group) && group.every((id) => typeof id === "string"),
      )
    ) {
      return false;
    }
  } else if (value.mode === "no_separation") {
    if (
      !Array.isArray(value.hypothesisIds) ||
      !value.hypothesisIds.every((id) => typeof id === "string")
    ) {
      return false;
    }
  } else {
    return false;
  }
  return validatePlayerPrediction(candidate, hypothesisIds).length === 0;
}

function isDebriefResponse(
  value: unknown,
  hypothesisIds: readonly string[],
): value is DebriefResponse {
  if (
    !isRecord(value) ||
    !isRecord(value.reveal) ||
    !isRecord(value.score) ||
    !isRecord(value.fingerprint) ||
    !isRecord(value.reasoningReview)
  ) {
    return false;
  }
  return (
    typeof value.trueHypothesisId === "string" &&
    hypothesisIds.includes(value.trueHypothesisId) &&
    typeof value.trueHypothesisTitle === "string" &&
    typeof value.reveal.title === "string" &&
    typeof value.reveal.explanation === "string" &&
    Array.isArray(value.reveal.featuredDecisivePath) &&
    value.reveal.featuredDecisivePath.every((id) => typeof id === "string") &&
    typeof value.reveal.takeaway === "string" &&
    isProbabilityDistribution(value.enginePosterior, hypothesisIds) &&
    typeof value.engineConfidence === "number" &&
    typeof value.playerConfidence === "number" &&
    typeof value.budgetSpent === "number" &&
    typeof value.score.total === "number" &&
    typeof value.score.correctMechanism === "number" &&
    typeof value.score.evidenceChain === "number" &&
    typeof value.score.budgetEfficiency === "number" &&
    typeof value.score.falsificationQuality === "number" &&
    typeof value.fingerprint.falsificationIndex === "number" &&
    typeof value.fingerprint.redundancyRate === "number" &&
    typeof value.fingerprint.evidenceEfficiency === "number" &&
    typeof value.fingerprint.calibrationGapPercentagePoints === "number" &&
    typeof value.fingerprint.predictionAccuracy === "number" &&
    (value.fingerprint.noSeparationRecognition === null ||
      typeof value.fingerprint.noSeparationRecognition === "number") &&
    typeof value.fingerprint.beliefResponsiveness === "number" &&
    typeof value.reasoningReview.claimSupported === "boolean" &&
    typeof value.reasoningReview.strongestReasoningMove === "string" &&
    (value.reasoningReview.unsupportedLeap === null ||
      typeof value.reasoningReview.unsupportedLeap === "string") &&
    (value.reasoningReview.evidencePlayerUnderused === null ||
      typeof value.reasoningReview.evidencePlayerUnderused === "string") &&
    typeof value.reasoningReview.oneMoreControl === "string" &&
    typeof value.reasoningReview.summary === "string" &&
    (value.reasoningReview.source === "gpt-5.6" ||
      value.reasoningReview.source === "fallback")
  );
}

function restoreSession(
  value: unknown,
  caseDefinition: PublicCaseDefinition,
): GameSession | null {
  if (!isRecord(value)) return null;
  const hypothesisIds = caseDefinition.hypotheses.map((hypothesis) => hypothesis.id);
  if (
    value.schemaVersion !== 2 ||
    value.caseId !== caseDefinition.id ||
    value.caseVersion !== caseDefinition.version ||
    typeof value.id !== "string" ||
    typeof value.phase !== "string" ||
    !validPhases.has(value.phase as GamePhase) ||
    typeof value.budgetRemaining !== "number" ||
    value.budgetRemaining < 0 ||
    value.budgetRemaining > caseDefinition.initialBudget ||
    typeof value.priorsLocked !== "boolean" ||
    !isRecord(value.playerBeliefs) ||
    validatePlayerBeliefs(value.playerBeliefs as PlayerBeliefs, hypothesisIds).length > 0 ||
    !isProbabilityDistribution(value.enginePosterior, hypothesisIds) ||
    !Array.isArray(value.runs)
  ) {
    return null;
  }

  let expectedBudget = caseDefinition.initialBudget;
  const runCounts = new Map<string, number>();
  for (const rawRun of value.runs) {
    if (!isRecord(rawRun) || typeof rawRun.experimentId !== "string") return null;
    const experiment = caseDefinition.experiments.find(
      (candidate) => candidate.id === rawRun.experimentId,
    );
    if (
      !experiment ||
      typeof rawRun.outcomeId !== "string" ||
      !experiment.possibleOutcomes.some((outcome) => outcome.id === rawRun.outcomeId) ||
      rawRun.cost !== experiment.cost ||
      typeof rawRun.runId !== "string" ||
      typeof rawRun.informationGainBits !== "number" ||
      !Number.isFinite(rawRun.informationGainBits) ||
      typeof rawRun.predictionUseful !== "boolean" ||
      !isPlayerPrediction(rawRun.prediction, hypothesisIds) ||
      !isRecord(rawRun.playerBeliefsBefore) ||
      validatePlayerBeliefs(
        rawRun.playerBeliefsBefore as PlayerBeliefs,
        hypothesisIds,
      ).length > 0 ||
      (rawRun.playerBeliefsAfter !== undefined &&
        (!isRecord(rawRun.playerBeliefsAfter) ||
          validatePlayerBeliefs(
            rawRun.playerBeliefsAfter as PlayerBeliefs,
            hypothesisIds,
          ).length > 0)) ||
      !isProbabilityDistribution(rawRun.enginePrior, hypothesisIds) ||
      !isProbabilityDistribution(rawRun.enginePosterior, hypothesisIds) ||
      typeof rawRun.createdAt !== "string" ||
      !Number.isFinite(Date.parse(rawRun.createdAt))
    ) {
      return null;
    }
    const nextCount = (runCounts.get(experiment.id) ?? 0) + 1;
    if (nextCount > experiment.maxRuns) return null;
    runCounts.set(experiment.id, nextCount);
    expectedBudget -= experiment.cost;
  }
  if (expectedBudget !== value.budgetRemaining) return null;

  return value as unknown as GameSession;
}

function restoreSavedEnvelope(
  raw: string,
  caseDefinition: PublicCaseDefinition,
): SavedGameEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const session = restoreSession(parsed.session, caseDefinition);
    if (!session) return null;
    const observationResult = parsed.observation
      ? observationResponseSchema.safeParse(parsed.observation)
      : null;
    const hypothesisIds = caseDefinition.hypotheses.map((hypothesis) => hypothesis.id);
    const debrief = parsed.debrief && isDebriefResponse(parsed.debrief, hypothesisIds)
      ? parsed.debrief
      : null;
    if (session.phase === "debrief" && !debrief) return null;
    return {
      session,
      observation: observationResult?.success ? observationResult.data : null,
      debrief,
    };
  } catch {
    return null;
  }
}

function newSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}`;
}

export function GameShell({
  caseDefinition,
}: {
  caseDefinition: PublicCaseDefinition;
}) {
  const hypothesisIds = useMemo(
    () => caseDefinition.hypotheses.map((hypothesis) => hypothesis.id),
    [caseDefinition.hypotheses],
  );
  const [session, setSession] = useState<GameSession>(() =>
    createInitialGameSession(caseDefinition, "session-pending"),
  );
  const [observation, setObservation] = useState<ObservationResponse | null>(null);
  const [debrief, setDebrief] = useState<DebriefResponse | null>(null);
  const [beliefDraft, setBeliefDraft] = useState<PlayerBeliefs>(() =>
    createInitialPlayerBeliefs(hypothesisIds),
  );
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentDefinition | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [apiError, setApiError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const saved = window.localStorage.getItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      const restored = saved ? restoreSavedEnvelope(saved, caseDefinition) : null;
      if (restored) {
        setSession(restored.session);
        setObservation(restored.observation);
        setDebrief(restored.debrief);
        setBeliefDraft(restored.session.playerBeliefs);
      } else {
        const fresh = createInitialGameSession(caseDefinition, newSessionId());
        setSession(fresh);
        setBeliefDraft(fresh.playerBeliefs);
        if (saved) window.localStorage.removeItem(STORAGE_KEY);
      }
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [caseDefinition]);

  useEffect(() => {
    if (!hydrated) return;
    const envelope: SavedGameEnvelope = { session, observation, debrief };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }, [debrief, hydrated, observation, session]);

  function transition(action: GameAction) {
    setApiError("");
    setSession((current) => {
      try {
        return gameReducer(current, action);
      } catch (error) {
        setApiError(
          error instanceof GameRuleError
            ? error.message
            : "That transition is not available yet.",
        );
        return current;
      }
    });
  }

  function resetGame() {
    const fresh = createInitialGameSession(caseDefinition, newSessionId());
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(fresh);
    setBeliefDraft(fresh.playerBeliefs);
    setObservation(null);
    setDebrief(null);
    setSelectedExperiment(null);
    setApiError("");
    setIsBusy(false);
  }

  async function analyzeObservation() {
    setIsBusy(true);
    setApiError("");
    try {
      const response = await fetch("/api/ai/observe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseDefinition.id, sessionId: session.id }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(readApiError(payload, "Observation analysis is unavailable."));
      }
      const parsed = observationResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Observation analysis returned an invalid shape.");
      }
      setObservation(parsed.data);
    } catch {
      setObservation({
        observation: caseDefinition.authoredObservationFallback.observation,
        measuredSignal: caseDefinition.authoredObservationFallback.measuredSignal,
        conditionsCompared: [...caseDefinition.authoredObservationFallback.conditionsCompared],
        visibleControls: [...caseDefinition.authoredObservationFallback.visibleControls],
        missingControls: [...caseDefinition.authoredObservationFallback.missingControls],
        ambiguity: caseDefinition.authoredObservationFallback.ambiguity,
        confidence: caseDefinition.authoredObservationFallback.confidence,
        source: "fallback",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function runExperiment(prediction: PlayerPrediction) {
    if (!selectedExperiment || session.phase !== "lab") return;
    setIsBusy(true);
    setApiError("");
    try {
      const response = await fetch("/api/experiment/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseDefinition.id,
          experimentId: selectedExperiment.id,
          runHistory: session.runs.map((run) => run.experimentId),
          prediction,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(readApiError(payload, "The experiment could not run."));
      }
      if (!isExperimentRunResponse(payload, hypothesisIds)) {
        throw new Error("The experiment engine returned an invalid result.");
      }
      const authoredOutcome = selectedExperiment.possibleOutcomes.find(
        (outcome) => outcome.id === payload.outcome.id,
      );
      if (
        !authoredOutcome ||
        payload.experimentId !== selectedExperiment.id ||
        payload.cost !== selectedExperiment.cost ||
        payload.budgetRemaining !== session.budgetRemaining - selectedExperiment.cost
      ) {
        throw new Error("The experiment result did not match its authored card.");
      }

      const run: ExperimentRun = {
        runId: payload.runId,
        experimentId: selectedExperiment.id,
        cost: selectedExperiment.cost,
        outcomeId: authoredOutcome.id,
        prediction,
        predictionUseful: payload.predictionUseful,
        enginePrior: payload.enginePrior,
        enginePosterior: payload.enginePosterior,
        informationGainBits: payload.informationGainBits,
        playerBeliefsBefore: { ...session.playerBeliefs },
        createdAt: new Date().toISOString(),
      };
      const experiment = selectedExperiment;
      setSession((current) =>
        gameReducer(current, {
          type: "RECORD_RESULT",
          experiment,
          run,
          hypothesisIds,
        }),
      );
      setSelectedExperiment(null);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "The authored experiment could not run.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function submitVerdict(verdict: VerdictSubmission) {
    setIsBusy(true);
    setApiError("");
    try {
      const runHistory = session.runs.map((run) => {
        if (!run.playerBeliefsAfter) {
          throw new Error("Finish the belief update for every result before submitting.");
        }
        return {
          experimentId: run.experimentId,
          prediction: run.prediction,
          playerBeliefsBefore: run.playerBeliefsBefore,
          playerBeliefsAfter: run.playerBeliefsAfter,
          createdAt: run.createdAt,
        };
      });
      const response = await fetch("/api/verdict/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseDefinition.id,
          sessionId: session.id,
          runHistory,
          verdict,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(readApiError(payload, "The verdict could not be scored."));
      }
      if (!isDebriefResponse(payload, hypothesisIds)) {
        throw new Error("The debrief returned an invalid shape.");
      }
      setSession((current) =>
        gameReducer(current, {
          type: "SUBMIT_VERDICT",
          verdict,
          hypothesisIds,
        }),
      );
      setDebrief(payload);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "The verdict could not be scored.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  if (!hydrated) {
    return (
      <main className="game-shell">
        <div className="game-loading" role="status">
          <span className="brand-pulse" aria-hidden="true" />
          <strong>CALIBRATING THE CASE ENGINE</strong>
          <small>AUTHORED TRUTH · LOCAL PLAYER STATE</small>
        </div>
      </main>
    );
  }

  const latestRun = session.runs.at(-1);
  const latestExperiment = latestRun
    ? caseDefinition.experiments.find((experiment) => experiment.id === latestRun.experimentId)
    : undefined;
  const latestOutcome = latestExperiment?.possibleOutcomes.find(
    (outcome) => outcome.id === latestRun?.outcomeId,
  );

  return (
    <main className={`game-shell game-phase-${session.phase}`}>
      <GameHeader phase={session.phase} budget={session.budgetRemaining} onReset={resetGame} />

      {session.phase === "briefing" ? (
        <BriefingPanel
          caseDefinition={caseDefinition}
          observation={observation}
          isAnalyzing={isBusy}
          error={apiError}
          onAnalyze={analyzeObservation}
          onContinue={() => transition({ type: "ENTER_PRIORS" })}
        />
      ) : null}

      {session.phase === "priors" ? (
        <section className="priors-stage" aria-labelledby="priors-title">
          <div className="priors-intro">
            <div>
              <p className="stage-label">BEFORE NEW EVIDENCE</p>
              <h1 id="priors-title">Keep all three mechanisms alive.</h1>
              <p>
                Distribute 100 belief points. These are your priors—not the
                engine&apos;s hidden calculation—and you will revise them after every result.
              </p>
            </div>
            <div className="priors-rule"><span>RULE / 01</span><strong>Minimum 5 points per hypothesis.</strong><p>Certainty before evidence is not allowed.</p></div>
          </div>
          <div className="priors-layout">
            <HypothesisStack hypotheses={caseDefinition.hypotheses} beliefs={beliefDraft} />
            <div>
              <BeliefEditor
                hypotheses={caseDefinition.hypotheses}
                beliefs={beliefDraft}
                onChange={setBeliefDraft}
                heading="What do you believe before testing?"
                description="Moving one slider redistributes the remaining points while preserving every live alternative."
              />
              {apiError ? <p className="form-error" role="alert">{apiError}</p> : null}
              <button
                type="button"
                className="button-primary game-primary-button lock-priors-button"
                onClick={() =>
                  transition({
                    type: "LOCK_PRIORS",
                    beliefs: beliefDraft,
                    hypothesisIds,
                  })
                }
              >
                LOCK MY PRIORS <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {session.phase === "lab" && selectedExperiment ? (
        <PredictionGate
          key={`${selectedExperiment.id}-${session.runs.length}`}
          experiment={selectedExperiment}
          hypotheses={caseDefinition.hypotheses}
          isRunning={isBusy}
          error={apiError}
          onCancel={() => { setSelectedExperiment(null); setApiError(""); }}
          onRun={runExperiment}
        />
      ) : null}

      {session.phase === "lab" && !selectedExperiment ? (
        <LabBoard
          caseDefinition={caseDefinition}
          session={session}
          onSelectExperiment={(experiment) => { setSelectedExperiment(experiment); setApiError(""); }}
          onOpenVerdict={() => transition({ type: "OPEN_VERDICT" })}
        />
      ) : null}

      {session.phase === "result" && latestRun && latestExperiment && latestOutcome ? (
        <ResultPanel
          run={latestRun}
          experiment={latestExperiment}
          outcome={latestOutcome}
          hypotheses={caseDefinition.hypotheses}
          onContinue={() => {
            setBeliefDraft(session.playerBeliefs);
            transition({ type: "BEGIN_BELIEF_UPDATE" });
          }}
        />
      ) : null}

      {session.phase === "belief_update" && latestOutcome ? (
        <section className="belief-update-stage" aria-labelledby="belief-update-title">
          <div className="belief-update-context">
            <p className="stage-label">RESULT {session.runs.length} · UPDATE REQUIRED</p>
            <h1 id="belief-update-title">What changed in your beliefs?</h1>
            <p><strong>{latestOutcome.title}.</strong> {latestOutcome.summary}</p>
            <div className="socratic-prompt">
              <span aria-hidden="true">?</span>
              <p><small>REASONING PROMPT</small>Which explanation became harder to defend—and which alternatives still survive?</p>
            </div>
          </div>
          <BeliefEditor
            hypotheses={caseDefinition.hypotheses}
            beliefs={beliefDraft}
            onChange={setBeliefDraft}
            heading="Revise, or deliberately hold, your beliefs."
            description="The engine keeps its own posterior. This update records your reasoning separately."
          />
          <HypothesisStack hypotheses={caseDefinition.hypotheses} beliefs={beliefDraft} compact />
          {apiError ? <p className="form-error" role="alert">{apiError}</p> : null}
          <button
            type="button"
            className="button-primary game-primary-button commit-beliefs-button"
            onClick={() =>
              transition({
                type: "COMMIT_BELIEF_UPDATE",
                beliefs: beliefDraft,
                hypothesisIds,
              })
            }
          >
            COMMIT UPDATE & RETURN TO LAB <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : null}

      {session.phase === "verdict" ? (
        <VerdictForm
          caseDefinition={caseDefinition}
          runs={session.runs}
          isSubmitting={isBusy}
          apiError={apiError}
          onBack={() => transition({ type: "RETURN_TO_LAB" })}
          onSubmit={submitVerdict}
        />
      ) : null}

      {session.phase === "debrief" && debrief ? (
        <DebriefPanel
          caseDefinition={caseDefinition}
          runs={session.runs}
          debrief={debrief}
          onReset={resetGame}
        />
      ) : null}
    </main>
  );
}
