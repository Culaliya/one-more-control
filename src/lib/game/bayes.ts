import type {
  ExperimentDefinition,
  ExperimentId,
  HypothesisId,
  OutcomeId,
  ProbabilityDistribution,
} from "../../types/game";

export const PROBABILITY_EPSILON = 1e-12;

export class ProbabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProbabilityError";
  }
}

function assertProbabilityValue(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ProbabilityError(`${label} must be a finite non-negative number.`);
  }
}

function assertMatchingKeys(
  left: ProbabilityDistribution,
  right: ProbabilityDistribution,
): HypothesisId[] {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (
    leftKeys.length !== rightKeys.length ||
    leftKeys.some((key) => !Object.hasOwn(right, key))
  ) {
    throw new ProbabilityError(
      "Prior and likelihood distributions must contain the same hypotheses.",
    );
  }

  return leftKeys;
}

export function normalizeDistribution(
  distribution: ProbabilityDistribution,
): ProbabilityDistribution {
  const entries = Object.entries(distribution);
  if (entries.length === 0) {
    throw new ProbabilityError("A probability distribution cannot be empty.");
  }

  let total = 0;
  for (const [id, value] of entries) {
    assertProbabilityValue(value, `Probability for ${id}`);
    total += value;
  }

  if (!Number.isFinite(total) || total <= PROBABILITY_EPSILON) {
    throw new ProbabilityError(
      "A probability distribution must have positive total mass.",
    );
  }

  return Object.fromEntries(
    entries.map(([id, value]) => [id, value / total]),
  );
}

export function createUniformDistribution(
  hypothesisIds: readonly HypothesisId[],
): ProbabilityDistribution {
  const uniqueIds = [...new Set(hypothesisIds)];
  if (uniqueIds.length === 0 || uniqueIds.length !== hypothesisIds.length) {
    throw new ProbabilityError(
      "Uniform distributions require a non-empty set of unique hypotheses.",
    );
  }

  const probability = 1 / uniqueIds.length;
  return Object.fromEntries(uniqueIds.map((id) => [id, probability]));
}

export function bayesianUpdate(
  prior: ProbabilityDistribution,
  observedOutcomeLikelihoods: ProbabilityDistribution,
): ProbabilityDistribution {
  const hypothesisIds = assertMatchingKeys(prior, observedOutcomeLikelihoods);
  const normalizedPrior = normalizeDistribution(prior);
  const unnormalizedPosterior: ProbabilityDistribution = {};

  for (const hypothesisId of hypothesisIds) {
    const likelihood = observedOutcomeLikelihoods[hypothesisId];
    assertProbabilityValue(likelihood, `Likelihood for ${hypothesisId}`);
    if (likelihood > 1) {
      throw new ProbabilityError(
        `Likelihood for ${hypothesisId} must not exceed 1.`,
      );
    }
    unnormalizedPosterior[hypothesisId] =
      normalizedPrior[hypothesisId] * likelihood;
  }

  return normalizeDistribution(unnormalizedPosterior);
}

export function likelihoodsForOutcome(
  experiment: ExperimentDefinition,
  outcomeId: OutcomeId,
): ProbabilityDistribution {
  const possibleOutcomeIds = new Set(
    experiment.possibleOutcomes.map((outcome) => outcome.id),
  );
  if (!possibleOutcomeIds.has(outcomeId)) {
    throw new ProbabilityError(
      `Outcome ${outcomeId} does not belong to experiment ${experiment.id}.`,
    );
  }

  return Object.fromEntries(
    Object.entries(experiment.likelihoods).map(
      ([hypothesisId, distribution]) => {
        const likelihood = distribution[outcomeId];
        if (likelihood === undefined) {
          throw new ProbabilityError(
            `Experiment ${experiment.id} has no likelihood for ${hypothesisId}/${outcomeId}.`,
          );
        }
        return [hypothesisId, likelihood];
      },
    ),
  );
}

export function updatePosteriorForOutcome(
  prior: ProbabilityDistribution,
  experiment: ExperimentDefinition,
  outcomeId: OutcomeId,
): ProbabilityDistribution {
  return bayesianUpdate(prior, likelihoodsForOutcome(experiment, outcomeId));
}

export interface ObservedExperiment {
  experimentId: ExperimentId;
  outcomeId: OutcomeId;
}

export function replayPosterior(
  initialPrior: ProbabilityDistribution,
  observations: readonly ObservedExperiment[],
  experiments: readonly ExperimentDefinition[],
): ProbabilityDistribution {
  const experimentById = new Map(
    experiments.map((experiment) => [experiment.id, experiment]),
  );

  return observations.reduce((posterior, observation) => {
    const experiment = experimentById.get(observation.experimentId);
    if (!experiment) {
      throw new ProbabilityError(
        `Unknown experiment ${observation.experimentId}.`,
      );
    }
    return updatePosteriorForOutcome(
      posterior,
      experiment,
      observation.outcomeId,
    );
  }, normalizeDistribution(initialPrior));
}

