import {
  createUniformDistribution,
  updatePosteriorForOutcome,
} from "./bayes";
import {
  experimentHasNoSeparation,
  measurementFamily,
  predictionPartitionSignature,
} from "./experiment-structure";
import type {
  ExperimentDefinition,
  ExperimentRun,
  PrivateCaseTruth,
  PublicCaseDefinition,
  ReasoningFingerprint,
  ScoreBreakdown,
  VerdictSubmission,
} from "../../types/game";

const DECISIVE_LIKELIHOOD_GAP = 0.5;
const CONFLICTING_LIKELIHOOD_MAX = 0.1;
const JOINT_SELECTED_POSTERIOR_MIN = 0.95;
const JOINT_ALTERNATIVE_POSTERIOR_MAX = 0.05;

export class ScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoringError";
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function experimentMap(
  experiments: readonly ExperimentDefinition[],
): Map<string, ExperimentDefinition> {
  return new Map(experiments.map((experiment) => [experiment.id, experiment]));
}

function requireExperiment(
  byId: ReadonlyMap<string, ExperimentDefinition>,
  experimentId: string,
): ExperimentDefinition {
  const experiment = byId.get(experimentId);
  if (!experiment) {
    throw new ScoringError(`Unknown experiment ${experimentId}.`);
  }
  return experiment;
}

export function experimentCanFalsify(
  experiment: ExperimentDefinition,
): boolean {
  return experiment.possibleOutcomes.some((outcome) => {
    const likelihoods = Object.values(experiment.likelihoods).map(
      (distribution) => distribution[outcome.id],
    );
    return Math.max(...likelihoods) - Math.min(...likelihoods) >= DECISIVE_LIKELIHOOD_GAP;
  });
}

export function resultSupportsHypothesis(
  run: ExperimentRun,
  experiment: ExperimentDefinition,
  hypothesisId: string,
): boolean {
  const selectedLikelihood = experiment.likelihoods[hypothesisId]?.[run.outcomeId];
  if (selectedLikelihood === undefined) {
    return false;
  }
  const competitorLikelihoods = Object.entries(experiment.likelihoods)
    .filter(([candidateId]) => candidateId !== hypothesisId)
    .map(([, distribution]) => distribution[run.outcomeId]);
  const strongestCompetitor = Math.max(...competitorLikelihoods);
  return selectedLikelihood - strongestCompetitor >= DECISIVE_LIKELIHOOD_GAP;
}

function contradictedAlternatives(
  run: ExperimentRun,
  experiment: ExperimentDefinition,
  selectedHypothesisId: string,
): Set<string> {
  const selectedLikelihood = experiment.likelihoods[selectedHypothesisId]?.[run.outcomeId];
  if (selectedLikelihood === undefined) return new Set();
  return new Set(
    Object.entries(experiment.likelihoods)
      .filter(([hypothesisId, distribution]) => {
        if (hypothesisId === selectedHypothesisId) return false;
        const alternativeLikelihood = distribution[run.outcomeId];
        return (
          alternativeLikelihood <= CONFLICTING_LIKELIHOOD_MAX &&
          selectedLikelihood - alternativeLikelihood >= DECISIVE_LIKELIHOOD_GAP
        );
      })
      .map(([hypothesisId]) => hypothesisId),
  );
}

export function calculateBudgetEfficiencyScore(
  budgetSpent: number,
  parCost: number,
  initialBudget: number,
  evidenceSufficient = true,
): number {
  const rawScore = budgetSpent <= parCost
    ? 15
    : initialBudget <= parCost
      ? 0
      : 15 * clamp(
          (initialBudget - budgetSpent) / (initialBudget - parCost),
          0,
          1,
        );
  return round(evidenceSufficient ? rawScore : Math.min(5, rawScore), 2);
}

function scoreEvidenceChain(
  caseDefinition: PublicCaseDefinition,
  runs: readonly ExperimentRun[],
  verdict: VerdictSubmission,
  byId: ReadonlyMap<string, ExperimentDefinition>,
): number {
  const selectedRuns = verdict.evidenceRunIndexes.map((index) => runs[index]);
  if (selectedRuns.some((run) => !run)) return 0;

  let posterior = createUniformDistribution(
    caseDefinition.hypotheses.map((hypothesis) => hypothesis.id),
  );
  const experiments = selectedRuns.map((run) =>
    requireExperiment(byId, run.experimentId),
  );
  selectedRuns.forEach((run, index) => {
    posterior = updatePosteriorForOutcome(
      posterior,
      experiments[index],
      run.outcomeId,
    );
  });

  const selectedPosterior = posterior[verdict.hypothesisId] ?? 0;
  const alternatives = Object.entries(posterior)
    .filter(([hypothesisId]) => hypothesisId !== verdict.hypothesisId)
    .map(([, probability]) => probability);
  const jointEvidenceSufficient =
    selectedPosterior >= JOINT_SELECTED_POSTERIOR_MIN &&
    alternatives.every(
      (probability) => probability <= JOINT_ALTERNATIVE_POSTERIOR_MAX,
    );
  const contributionSets = selectedRuns.map((run, index) =>
    contradictedAlternatives(
      run,
      experiments[index],
      verdict.hypothesisId,
    ),
  );
  const distinctContributions = contributionSets.every((contribution, index) =>
    [...contribution].some((hypothesisId) =>
      contributionSets.every(
        (other, otherIndex) => otherIndex === index || !other.has(hypothesisId),
      ),
    ),
  );
  const complementaryMeasurements =
    experiments.every((experiment, index) =>
      resultSupportsHypothesis(
        selectedRuns[index],
        experiment,
        verdict.hypothesisId,
      ),
    ) &&
    new Set(experiments.map(measurementFamily)).size === experiments.length;

  if (jointEvidenceSufficient && (distinctContributions || complementaryMeasurements)) {
    return 20;
  }
  if (jointEvidenceSufficient) {
    return 10;
  }
  return selectedPosterior >= 0.75 && contributionSets.some((set) => set.size > 0)
    ? 5
    : 0;
}

function scoreFalsificationQuality(
  runs: readonly ExperimentRun[],
  verdict: VerdictSubmission,
  byId: ReadonlyMap<string, ExperimentDefinition>,
): number {
  const run = runs[verdict.falsifyingEvidenceRunIndex];
  if (!run || verdict.falsifiedHypothesisId === verdict.hypothesisId) {
    return 0;
  }
  const experiment = requireExperiment(byId, run.experimentId);
  return contradictedAlternatives(
    run,
    experiment,
    verdict.hypothesisId,
  ).has(verdict.falsifiedHypothesisId)
    ? 15
    : 0;
}

export interface ScoreVerdictInput {
  caseDefinition: PublicCaseDefinition;
  truth: PrivateCaseTruth;
  runs: readonly ExperimentRun[];
  verdict: VerdictSubmission;
}

export function scoreVerdict({
  caseDefinition,
  truth,
  runs,
  verdict,
}: ScoreVerdictInput): ScoreBreakdown {
  const byId = experimentMap(caseDefinition.experiments);
  const budgetSpent = runs.reduce((sum, run) => sum + run.cost, 0);
  const correctMechanism =
    verdict.hypothesisId === truth.trueHypothesisId ? 50 : 0;
  const evidenceChain = scoreEvidenceChain(
    caseDefinition,
    runs,
    verdict,
    byId,
  );
  const budgetEfficiency = calculateBudgetEfficiencyScore(
    budgetSpent,
    caseDefinition.parCost,
    caseDefinition.initialBudget,
    evidenceChain === 20,
  );
  const falsificationQuality = scoreFalsificationQuality(
    runs,
    verdict,
    byId,
  );

  return {
    correctMechanism,
    evidenceChain,
    budgetEfficiency,
    falsificationQuality,
    total: round(
      correctMechanism +
        evidenceChain +
        budgetEfficiency +
        falsificationQuality,
      2,
    ),
  };
}

function beliefResponsiveness(run: ExperimentRun): number {
  const hypothesisIds = Object.keys(run.enginePosterior);
  const engineDelta = hypothesisIds.map(
    (hypothesisId) =>
      (run.enginePosterior[hypothesisId] ?? 0) -
      (run.enginePrior[hypothesisId] ?? 0),
  );
  const playerAfter = run.playerBeliefsAfter ?? run.playerBeliefsBefore;
  const playerDelta = hypothesisIds.map(
    (hypothesisId) =>
      ((playerAfter[hypothesisId] ?? 0) -
        (run.playerBeliefsBefore[hypothesisId] ?? 0)) /
      100,
  );
  const engineNorm = Math.sqrt(
    engineDelta.reduce((sum, value) => sum + value ** 2, 0),
  );
  const playerNorm = Math.sqrt(
    playerDelta.reduce((sum, value) => sum + value ** 2, 0),
  );
  if (playerNorm < 1e-9) {
    return run.informationGainBits < 0.1 ? 1 : 0;
  }
  if (engineNorm < 1e-9) {
    return 1;
  }
  const dotProduct = engineDelta.reduce(
    (sum, value, index) => sum + value * playerDelta[index],
    0,
  );
  return clamp((dotProduct / (engineNorm * playerNorm) + 1) / 2, 0, 1);
}

export interface ReasoningFingerprintInput {
  runs: readonly ExperimentRun[];
  experiments: readonly ExperimentDefinition[];
  verdict: VerdictSubmission;
  enginePosterior: Readonly<Record<string, number>>;
}

export function calculateReasoningFingerprint({
  runs,
  experiments,
  verdict,
  enginePosterior,
}: ReasoningFingerprintInput): ReasoningFingerprint {
  const byId = experimentMap(experiments);
  const calibrationGapPercentagePoints = round(
    Math.abs(
      verdict.confidence -
        (enginePosterior[verdict.hypothesisId] ?? 0) * 100,
    ),
    2,
  );
  if (runs.length === 0) {
    return {
      falsificationIndex: 0,
      redundancyRate: 0,
      evidenceEfficiency: 0,
      calibrationGapPercentagePoints,
      predictionAccuracy: 0,
      noSeparationRecognition: null,
      beliefResponsiveness: 0,
    };
  }

  let falsifyingRuns = 0;
  let redundantRuns = 0;
  let totalInformation = 0;
  let budgetSpent = 0;
  let accuratePredictions = 0;
  let noSeparationOpportunities = 0;
  let recognizedNoSeparation = 0;
  let responsivenessTotal = 0;
  const previousExperimentSignatures: Array<{
    family: string;
    signature: string;
  }> = [];

  for (const run of runs) {
    const experiment = requireExperiment(byId, run.experimentId);
    const signature = predictionPartitionSignature(experiment);
    const family = measurementFamily(experiment);
    const noSeparation = experimentHasNoSeparation(experiment);
    if (experimentCanFalsify(experiment)) falsifyingRuns += 1;
    if (
      noSeparation ||
      previousExperimentSignatures.some(
        (previous) => previous.signature === signature && previous.family === family,
      )
    ) {
      redundantRuns += 1;
    }
    if (run.predictionUseful) accuratePredictions += 1;
    if (noSeparation) {
      noSeparationOpportunities += 1;
      if (run.prediction.mode === "no_separation" && run.predictionUseful) {
        recognizedNoSeparation += 1;
      }
    }
    responsivenessTotal += beliefResponsiveness(run);
    totalInformation += run.informationGainBits;
    budgetSpent += run.cost;
    previousExperimentSignatures.push({ family, signature });
  }

  return {
    falsificationIndex: round(falsifyingRuns / runs.length),
    redundancyRate: round(redundantRuns / runs.length),
    evidenceEfficiency:
      budgetSpent > 0 ? round(totalInformation / budgetSpent, 6) : 0,
    calibrationGapPercentagePoints,
    predictionAccuracy: round(accuratePredictions / runs.length),
    noSeparationRecognition: noSeparationOpportunities > 0
      ? round(recognizedNoSeparation / noSeparationOpportunities)
      : null,
    beliefResponsiveness: round(responsivenessTotal / runs.length),
  };
}
