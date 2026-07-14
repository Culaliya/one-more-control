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
const REDUNDANT_INFORMATION_BITS = 0.1;

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
  const likelihoods = Object.values(experiment.likelihoods).map(
    (distribution) => distribution[run.outcomeId],
  );
  const strongest = Math.max(...likelihoods);
  const weakest = Math.min(...likelihoods);
  return (
    selectedLikelihood >= strongest - 1e-9 &&
    strongest - weakest >= DECISIVE_LIKELIHOOD_GAP
  );
}

export function calculateBudgetEfficiencyScore(
  budgetSpent: number,
  parCost: number,
  initialBudget: number,
): number {
  if (budgetSpent <= parCost) {
    return 15;
  }
  if (initialBudget <= parCost) {
    return 0;
  }
  const remainingShare =
    (initialBudget - budgetSpent) / (initialBudget - parCost);
  return round(15 * clamp(remainingShare, 0, 1), 2);
}

function scoreEvidenceChain(
  runs: readonly ExperimentRun[],
  verdict: VerdictSubmission,
  byId: ReadonlyMap<string, ExperimentDefinition>,
): number {
  const uniqueIndexes = new Set(verdict.evidenceRunIndexes);
  let score = 0;
  for (const index of uniqueIndexes) {
    const run = runs[index];
    if (!run) {
      continue;
    }
    const experiment = requireExperiment(byId, run.experimentId);
    if (resultSupportsHypothesis(run, experiment, verdict.hypothesisId)) {
      score += 10;
    }
  }
  return Math.min(20, score);
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
  const falsifiedLikelihood =
    experiment.likelihoods[verdict.falsifiedHypothesisId]?.[run.outcomeId];
  const selectedLikelihood =
    experiment.likelihoods[verdict.hypothesisId]?.[run.outcomeId];
  if (falsifiedLikelihood === undefined || selectedLikelihood === undefined) {
    return 0;
  }
  return falsifiedLikelihood <= CONFLICTING_LIKELIHOOD_MAX &&
    selectedLikelihood - falsifiedLikelihood >= DECISIVE_LIKELIHOOD_GAP
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
  const evidenceChain = scoreEvidenceChain(runs, verdict, byId);
  const budgetEfficiency = calculateBudgetEfficiencyScore(
    budgetSpent,
    caseDefinition.parCost,
    caseDefinition.initialBudget,
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
  if (runs.length === 0) {
    return {
      falsificationIndex: 0,
      redundancyRate: 0,
      evidenceEfficiency: 0,
      calibrationGapPercentagePoints: round(
        Math.abs(verdict.confidence - (enginePosterior[verdict.hypothesisId] ?? 0) * 100),
        2,
      ),
    };
  }

  let falsifyingRuns = 0;
  let redundantRuns = 0;
  let totalInformation = 0;
  let budgetSpent = 0;
  for (const run of runs) {
    const experiment = requireExperiment(byId, run.experimentId);
    if (experimentCanFalsify(experiment)) {
      falsifyingRuns += 1;
    }
    if (run.informationGainBits < REDUNDANT_INFORMATION_BITS) {
      redundantRuns += 1;
    }
    totalInformation += run.informationGainBits;
    budgetSpent += run.cost;
  }

  return {
    falsificationIndex: round(falsifyingRuns / runs.length),
    redundancyRate: round(redundantRuns / runs.length),
    evidenceEfficiency:
      budgetSpent > 0 ? round(totalInformation / budgetSpent, 6) : 0,
    calibrationGapPercentagePoints: round(
      Math.abs(
        verdict.confidence -
          (enginePosterior[verdict.hypothesisId] ?? 0) * 100,
      ),
      2,
    ),
  };
}

