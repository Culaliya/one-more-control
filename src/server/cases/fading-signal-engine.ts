import "server-only";

import {
  FADING_SIGNAL_HYPOTHESIS_IDS,
  type FadingSignalExperimentId,
  type FadingSignalHypothesisId,
  fadingSignalCase,
  getFadingSignalExperiment,
} from "@/data/cases/public/fading-signal";
import {
  createUniformDistribution,
  updatePosteriorForOutcome,
} from "@/lib/game/bayes";
import { realizedInformationGainBits } from "@/lib/game/entropy";
import type {
  ExperimentRun,
  PlayerBeliefs,
  PlayerPrediction,
  PlayerRunTrailEntry,
  ProbabilityDistribution,
} from "@/types/game";
import {
  validatePlayerBeliefs,
  validatePlayerPrediction,
} from "@/lib/game/validation";
import { fadingSignalTruth } from "./private/fading-signal-truth";

export class CaseEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaseEngineError";
  }
}

function neutralPlayerBeliefs(): PlayerBeliefs {
  return {
    competitive_inhibition: 34,
    enzyme_loss: 33,
    optical_interference: 33,
  };
}

function neutralPrediction(): PlayerPrediction {
  return {
    mode: "no_separation",
    hypothesisIds: [...FADING_SIGNAL_HYPOTHESIS_IDS],
  };
}

export function validateExperimentHistory(
  experimentIds: readonly FadingSignalExperimentId[],
): void {
  let budgetSpent = 0;
  const counts = new Map<string, number>();

  for (const experimentId of experimentIds) {
    const experiment = getFadingSignalExperiment(experimentId);
    if (!experiment) {
      throw new CaseEngineError(`Unknown experiment ${experimentId}.`);
    }
    const nextCount = (counts.get(experimentId) ?? 0) + 1;
    if (nextCount > experiment.maxRuns) {
      throw new CaseEngineError(`Run limit exceeded for ${experimentId}.`);
    }
    counts.set(experimentId, nextCount);
    budgetSpent += experiment.cost;
    if (budgetSpent > fadingSignalCase.initialBudget) {
      throw new CaseEngineError("Experiment history exceeds the case budget.");
    }
  }
}

export function replayFadingSignalHistory(
  experimentIds: readonly FadingSignalExperimentId[],
): {
  runs: ExperimentRun[];
  posterior: ProbabilityDistribution;
  budgetSpent: number;
} {
  validateExperimentHistory(experimentIds);
  let posterior = createUniformDistribution(FADING_SIGNAL_HYPOTHESIS_IDS);
  let budgetSpent = 0;
  const runs: ExperimentRun[] = [];
  const playerBeliefs = neutralPlayerBeliefs();

  experimentIds.forEach((experimentId, index) => {
    const experiment = getFadingSignalExperiment(experimentId);
    const outcomeId = fadingSignalTruth.actualOutcomeByExperiment[experimentId];
    if (!experiment || !outcomeId) {
      throw new CaseEngineError(`Case truth is incomplete for ${experimentId}.`);
    }
    const enginePrior = posterior;
    posterior = updatePosteriorForOutcome(enginePrior, experiment, outcomeId);
    const informationGainBits = realizedInformationGainBits(
      posterior,
      enginePrior,
    );
    budgetSpent += experiment.cost;
    runs.push({
      runId: `run-${index + 1}`,
      experimentId,
      cost: experiment.cost,
      outcomeId,
      prediction: neutralPrediction(),
      predictionUseful: predictionMatchesExperiment(
        experimentId,
        neutralPrediction(),
      ),
      enginePrior,
      enginePosterior: posterior,
      informationGainBits,
      playerBeliefsBefore: playerBeliefs,
      playerBeliefsAfter: playerBeliefs,
      createdAt: `2026-01-01T00:00:${String(index).padStart(2, "0")}.000Z`,
    });
  });

  return { runs, posterior, budgetSpent };
}

function predictedOutcomeForHypothesis(
  experimentId: FadingSignalExperimentId,
  hypothesisId: FadingSignalHypothesisId,
): string | undefined {
  const experiment = getFadingSignalExperiment(experimentId);
  const distribution = experiment?.likelihoods[hypothesisId];
  if (!distribution) return undefined;
  return Object.entries(distribution).sort((left, right) => right[1] - left[1])[0]?.[0];
}

export function predictionMatchesExperiment(
  experimentId: FadingSignalExperimentId,
  prediction: PlayerPrediction,
): boolean {
  if (prediction.mode === "no_separation") {
    const outcomes = new Set(
      prediction.hypothesisIds.map((hypothesisId) =>
        predictedOutcomeForHypothesis(
          experimentId,
          hypothesisId as FadingSignalHypothesisId,
        ),
      ),
    );
    return outcomes.size === 1 && !outcomes.has(undefined);
  }

  const groupOutcomes = prediction.splitGroups.map((group) =>
    new Set(
      group.map((hypothesisId) => {
        if (
          !FADING_SIGNAL_HYPOTHESIS_IDS.includes(
            hypothesisId as FadingSignalHypothesisId,
          )
        ) {
          return undefined;
        }
        return predictedOutcomeForHypothesis(
          experimentId,
          hypothesisId as FadingSignalHypothesisId,
        );
      }),
    ),
  );
  if (groupOutcomes.some((outcomes) => outcomes.size !== 1)) {
    return false;
  }
  return [...groupOutcomes[0]][0] !== [...groupOutcomes[1]][0];
}

function beliefsMatch(left: PlayerBeliefs, right: PlayerBeliefs): boolean {
  return FADING_SIGNAL_HYPOTHESIS_IDS.every(
    (hypothesisId) => left[hypothesisId] === right[hypothesisId],
  );
}

export function replayFadingSignalTrail(
  trail: readonly PlayerRunTrailEntry[],
): {
  runs: ExperimentRun[];
  posterior: ProbabilityDistribution;
  budgetSpent: number;
} {
  validateExperimentHistory(
    trail.map((entry) => entry.experimentId as FadingSignalExperimentId),
  );
  let posterior = createUniformDistribution(FADING_SIGNAL_HYPOTHESIS_IDS);
  let budgetSpent = 0;
  let previousBeliefsAfter: PlayerBeliefs | undefined;
  let previousTimestamp = 0;

  const runs = trail.map((entry, index) => {
    const experimentId = entry.experimentId as FadingSignalExperimentId;
    const experiment = getFadingSignalExperiment(experimentId);
    const outcomeId = fadingSignalTruth.actualOutcomeByExperiment[experimentId];
    if (!experiment || !outcomeId) {
      throw new CaseEngineError(`Case truth is incomplete for ${experimentId}.`);
    }
    const predictionIssues = validatePlayerPrediction(
      entry.prediction,
      FADING_SIGNAL_HYPOTHESIS_IDS,
    );
    const beliefIssues = [
      ...validatePlayerBeliefs(
        entry.playerBeliefsBefore,
        FADING_SIGNAL_HYPOTHESIS_IDS,
      ),
      ...validatePlayerBeliefs(
        entry.playerBeliefsAfter,
        FADING_SIGNAL_HYPOTHESIS_IDS,
      ),
    ];
    if (predictionIssues.length > 0 || beliefIssues.length > 0) {
      throw new CaseEngineError("Player reasoning trail is invalid.");
    }
    if (
      previousBeliefsAfter &&
      !beliefsMatch(previousBeliefsAfter, entry.playerBeliefsBefore)
    ) {
      throw new CaseEngineError("Player belief history is not continuous.");
    }
    const timestamp = Date.parse(entry.createdAt);
    if (!Number.isFinite(timestamp) || timestamp < previousTimestamp) {
      throw new CaseEngineError("Player run timestamps are invalid.");
    }

    const enginePrior = posterior;
    posterior = updatePosteriorForOutcome(enginePrior, experiment, outcomeId);
    const informationGainBits = realizedInformationGainBits(
      posterior,
      enginePrior,
    );
    budgetSpent += experiment.cost;
    previousBeliefsAfter = entry.playerBeliefsAfter;
    previousTimestamp = timestamp;

    return {
      runId: `run-${index + 1}`,
      experimentId,
      cost: experiment.cost,
      outcomeId,
      prediction: entry.prediction,
      predictionUseful: predictionMatchesExperiment(
        experimentId,
        entry.prediction,
      ),
      enginePrior,
      enginePosterior: posterior,
      informationGainBits,
      playerBeliefsBefore: entry.playerBeliefsBefore,
      playerBeliefsAfter: entry.playerBeliefsAfter,
      createdAt: entry.createdAt,
    } satisfies ExperimentRun;
  });

  return { runs, posterior, budgetSpent };
}
