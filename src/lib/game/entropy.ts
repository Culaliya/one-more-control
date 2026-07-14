import type { ProbabilityDistribution } from "../../types/game";
import {
  normalizeDistribution,
  PROBABILITY_EPSILON,
  ProbabilityError,
} from "./bayes";

export function shannonEntropyBits(
  distribution: ProbabilityDistribution,
): number {
  const normalized = normalizeDistribution(distribution);

  return Object.values(normalized).reduce((entropy, probability) => {
    if (probability <= PROBABILITY_EPSILON) {
      return entropy;
    }
    return entropy - probability * Math.log2(probability);
  }, 0);
}

export function klDivergenceBits(
  posterior: ProbabilityDistribution,
  prior: ProbabilityDistribution,
): number {
  const posteriorKeys = Object.keys(posterior);
  const priorKeys = Object.keys(prior);
  if (
    posteriorKeys.length !== priorKeys.length ||
    posteriorKeys.some((key) => !Object.hasOwn(prior, key))
  ) {
    throw new ProbabilityError(
      "KL divergence requires distributions over the same hypotheses.",
    );
  }

  const normalizedPosterior = normalizeDistribution(posterior);
  const normalizedPrior = normalizeDistribution(prior);
  const divergence = posteriorKeys.reduce((sum, hypothesisId) => {
    const posteriorProbability = normalizedPosterior[hypothesisId];
    if (posteriorProbability <= PROBABILITY_EPSILON) {
      return sum;
    }
    const safePrior = Math.max(
      normalizedPrior[hypothesisId],
      PROBABILITY_EPSILON,
    );
    return (
      sum +
      posteriorProbability * Math.log2(posteriorProbability / safePrior)
    );
  }, 0);

  if (!Number.isFinite(divergence)) {
    throw new ProbabilityError("KL divergence must be finite.");
  }

  return Math.max(0, divergence);
}

export const realizedInformationGainBits = klDivergenceBits;

