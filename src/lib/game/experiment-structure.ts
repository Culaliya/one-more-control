import type { ExperimentDefinition } from "../../types/game";

export const LOW_INCREMENTAL_INFORMATION_BITS = 0.1;

export type ResultInformationRole =
  | "low_value"
  | "independent_confirmation"
  | "evidence_moving";

export function dominantOutcomeForHypothesis(
  experiment: ExperimentDefinition,
  hypothesisId: string,
): string | undefined {
  const distribution = experiment.likelihoods[hypothesisId];
  return distribution
    ? Object.entries(distribution).sort((left, right) => right[1] - left[1])[0]?.[0]
    : undefined;
}

export function predictionPartitionSignature(
  experiment: ExperimentDefinition,
): string {
  return Object.keys(experiment.likelihoods)
    .map(
      (hypothesisId) =>
        `${hypothesisId}:${dominantOutcomeForHypothesis(experiment, hypothesisId) ?? "unknown"}`,
    )
    .sort()
    .join("|");
}

export function experimentHasNoSeparation(
  experiment: ExperimentDefinition,
): boolean {
  const outcomes = new Set(
    Object.keys(experiment.likelihoods).map((hypothesisId) =>
      dominantOutcomeForHypothesis(experiment, hypothesisId),
    ),
  );
  return outcomes.size === 1 && !outcomes.has(undefined);
}

export function measurementFamily(experiment: ExperimentDefinition): string {
  if (["repeat", "titration", "rescue"].includes(experiment.category)) {
    return "same_fluorescent_readout";
  }
  return experiment.category;
}

export function classifyResultInformationRole({
  experiment,
  priorExperiments,
  informationGainBits,
  predictionUseful,
}: {
  experiment: ExperimentDefinition;
  priorExperiments: readonly ExperimentDefinition[];
  informationGainBits: number;
  predictionUseful: boolean;
}): ResultInformationRole {
  if (informationGainBits >= LOW_INCREMENTAL_INFORMATION_BITS) {
    return "evidence_moving";
  }

  if (experimentHasNoSeparation(experiment)) {
    return "low_value";
  }

  const currentFamily = measurementFamily(experiment);
  const usesNewMeasurementFamily = priorExperiments.every(
    (priorExperiment) => measurementFamily(priorExperiment) !== currentFamily,
  );

  if (
    predictionUseful &&
    priorExperiments.length > 0 &&
    usesNewMeasurementFamily
  ) {
    return "independent_confirmation";
  }

  return "low_value";
}
