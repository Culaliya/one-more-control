import type {
  ExperimentDefinition,
  GameSession,
  HypothesisId,
  PlayerBeliefs,
  PlayerPrediction,
  PrivateCaseTruth,
  PublicCaseDefinition,
  VerdictSubmission,
} from "../../types/game";

export const LIKELIHOOD_TOLERANCE = 1e-9;
export const MINIMUM_BELIEF_POINTS = 5;
export const TOTAL_BELIEF_POINTS = 100;

export interface ValidationIssue {
  path: string;
  message: string;
}

export const FORBIDDEN_PUBLIC_CASE_KEYS = new Set([
  "trueHypothesis",
  "trueHypothesisId",
  "actualOutcome",
  "actualOutcomeByExperiment",
  "actualOutcomeMapping",
  "outcomeByExperiment",
  "privateTruth",
  "reveal",
  "debrief",
  "optimalPath",
  "featuredDecisivePath",
]);

export function containsForbiddenTruthFields(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenTruthFields);
  }
  if (value === null || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(
    ([key, nested]) =>
      FORBIDDEN_PUBLIC_CASE_KEYS.has(key) ||
      containsForbiddenTruthFields(nested),
  );
}

export function validatePublicCaseDefinition(
  caseDefinition: PublicCaseDefinition,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const hypothesisIds = caseDefinition.hypotheses.map(({ id }) => id);
  const hypothesisSet = new Set(hypothesisIds);

  if (hypothesisSet.size !== hypothesisIds.length) {
    issues.push({ path: "hypotheses", message: "Hypothesis IDs must be unique." });
  }
  if (containsForbiddenTruthFields(caseDefinition)) {
    issues.push({
      path: "$",
      message: "Public case data contains a private truth field.",
    });
  }

  const experimentIds = new Set<string>();
  for (const experiment of caseDefinition.experiments) {
    const path = `experiments.${experiment.id}`;
    if (experimentIds.has(experiment.id)) {
      issues.push({ path, message: "Experiment IDs must be unique." });
    }
    experimentIds.add(experiment.id);

    if (!Number.isInteger(experiment.cost) || experiment.cost <= 0) {
      issues.push({ path: `${path}.cost`, message: "Cost must be a positive integer." });
    }
    if (!Number.isInteger(experiment.maxRuns) || experiment.maxRuns < 1) {
      issues.push({ path: `${path}.maxRuns`, message: "maxRuns must be a positive integer." });
    }

    const outcomeIds = experiment.possibleOutcomes.map(({ id }) => id);
    const outcomeSet = new Set(outcomeIds);
    if (outcomeSet.size !== outcomeIds.length || outcomeIds.length < 2) {
      issues.push({
        path: `${path}.possibleOutcomes`,
        message: "Experiments need at least two uniquely identified outcomes.",
      });
    }

    for (const hypothesisId of hypothesisIds) {
      const distribution = experiment.likelihoods[hypothesisId];
      if (!distribution) {
        issues.push({
          path: `${path}.likelihoods.${hypothesisId}`,
          message: "Missing likelihood distribution.",
        });
        continue;
      }

      const likelihoodOutcomeIds = Object.keys(distribution);
      if (
        likelihoodOutcomeIds.length !== outcomeIds.length ||
        likelihoodOutcomeIds.some((id) => !outcomeSet.has(id))
      ) {
        issues.push({
          path: `${path}.likelihoods.${hypothesisId}`,
          message: "Likelihood keys must exactly match possible outcomes.",
        });
      }

      let sum = 0;
      for (const outcomeId of outcomeIds) {
        const probability = distribution[outcomeId];
        if (
          probability === undefined ||
          !Number.isFinite(probability) ||
          probability < 0 ||
          probability > 1
        ) {
          issues.push({
            path: `${path}.likelihoods.${hypothesisId}.${outcomeId}`,
            message: "Likelihood must be a finite probability from 0 to 1.",
          });
        } else {
          sum += probability;
        }
      }
      if (Math.abs(sum - 1) > LIKELIHOOD_TOLERANCE) {
        issues.push({
          path: `${path}.likelihoods.${hypothesisId}`,
          message: "Likelihood distribution must sum to 1.",
        });
      }
    }

    for (const likelihoodHypothesisId of Object.keys(experiment.likelihoods)) {
      if (!hypothesisSet.has(likelihoodHypothesisId)) {
        issues.push({
          path: `${path}.likelihoods.${likelihoodHypothesisId}`,
          message: "Likelihood table contains an unknown hypothesis.",
        });
      }
    }
  }

  return issues;
}

export function validatePrivateCaseTruth(
  caseDefinition: PublicCaseDefinition,
  truth: PrivateCaseTruth,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const hypotheses = new Set(caseDefinition.hypotheses.map(({ id }) => id));
  const experiments = new Map(
    caseDefinition.experiments.map((experiment) => [experiment.id, experiment]),
  );

  if (truth.caseId !== caseDefinition.id) {
    issues.push({ path: "caseId", message: "Private truth targets the wrong case." });
  }
  if (!hypotheses.has(truth.trueHypothesisId)) {
    issues.push({ path: "trueHypothesisId", message: "True hypothesis is not public." });
  }

  for (const experiment of caseDefinition.experiments) {
    const outcomeId = truth.actualOutcomeByExperiment[experiment.id];
    if (!outcomeId) {
      issues.push({
        path: `actualOutcomeByExperiment.${experiment.id}`,
        message: "Private outcome is missing.",
      });
    } else if (!experiment.possibleOutcomes.some(({ id }) => id === outcomeId)) {
      issues.push({
        path: `actualOutcomeByExperiment.${experiment.id}`,
        message: "Private outcome does not exist in the public experiment.",
      });
    }
  }

  for (const experimentId of Object.keys(truth.actualOutcomeByExperiment)) {
    if (!experiments.has(experimentId)) {
      issues.push({
        path: `actualOutcomeByExperiment.${experimentId}`,
        message: "Private truth contains an unknown experiment.",
      });
    }
  }
  for (const experimentId of truth.debrief.featuredDecisivePath) {
    if (!experiments.has(experimentId)) {
      issues.push({
        path: "debrief.featuredDecisivePath",
        message: "Featured decisive path contains an unknown experiment.",
      });
    }
  }

  return issues;
}

export function validatePlayerBeliefs(
  beliefs: PlayerBeliefs,
  hypothesisIds: readonly HypothesisId[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const keys = Object.keys(beliefs);
  if (
    keys.length !== hypothesisIds.length ||
    keys.some((key) => !hypothesisIds.includes(key))
  ) {
    issues.push({ path: "beliefs", message: "Beliefs must cover every hypothesis exactly once." });
  }
  const values = hypothesisIds.map((id) => beliefs[id]);
  if (values.some((value) => !Number.isInteger(value))) {
    issues.push({ path: "beliefs", message: "Belief points must be integers." });
  }
  if (values.some((value) => value < MINIMUM_BELIEF_POINTS)) {
    issues.push({ path: "beliefs", message: "Every belief must be at least 5." });
  }
  if (values.reduce((sum, value) => sum + value, 0) !== TOTAL_BELIEF_POINTS) {
    issues.push({ path: "beliefs", message: "Beliefs must total 100." });
  }
  return issues;
}

export function validatePlayerPrediction(
  prediction: PlayerPrediction,
  hypothesisIds: readonly HypothesisId[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const placed = prediction.mode === "split"
    ? prediction.splitGroups.flat()
    : [...prediction.hypothesisIds];
  if (
    placed.length !== hypothesisIds.length ||
    new Set(placed).size !== placed.length ||
    placed.some((id) => !hypothesisIds.includes(id))
  ) {
    issues.push({
      path: prediction.mode === "split" ? "splitGroups" : "hypothesisIds",
      message: "The prediction must include every hypothesis exactly once.",
    });
  }
  if (
    prediction.mode === "split" &&
    prediction.splitGroups.some((group) => group.length === 0)
  ) {
    issues.push({
      path: "splitGroups",
      message: "A split prediction must use both outcome groups.",
    });
  }
  if ((prediction.rationale?.length ?? 0) > 240 || prediction.rationale?.includes("\n")) {
    issues.push({ path: "rationale", message: "Rationale must be one concise line." });
  }
  return issues;
}

export function validateVerdictSubmission(
  verdict: VerdictSubmission,
  session: GameSession,
  hypothesisIds: readonly HypothesisId[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!hypothesisIds.includes(verdict.hypothesisId)) {
    issues.push({ path: "hypothesisId", message: "Verdict hypothesis is unknown." });
  }
  if (!Number.isInteger(verdict.confidence) || verdict.confidence < 34 || verdict.confidence > 100) {
    issues.push({ path: "confidence", message: "Confidence must be an integer from 34 to 100." });
  }
  const evidence = verdict.evidenceRunIndexes;
  if (
    evidence[0] === evidence[1] ||
    evidence.some((index) => !Number.isInteger(index) || index < 0 || index >= session.runs.length)
  ) {
    issues.push({ path: "evidenceRunIndexes", message: "Choose two distinct existing evidence results." });
  }
  if (
    !hypothesisIds.includes(verdict.falsifiedHypothesisId) ||
    verdict.falsifiedHypothesisId === verdict.hypothesisId
  ) {
    issues.push({ path: "falsifiedHypothesisId", message: "Choose a different valid alternative to falsify." });
  }
  if (
    !Number.isInteger(verdict.falsifyingEvidenceRunIndex) ||
    verdict.falsifyingEvidenceRunIndex < 0 ||
    verdict.falsifyingEvidenceRunIndex >= session.runs.length
  ) {
    issues.push({ path: "falsifyingEvidenceRunIndex", message: "Falsifying evidence must reference an existing result." });
  }
  const explanation = verdict.explanation?.trim();
  if (explanation && explanation.split(/[.!?]+/u).filter(Boolean).length > 2) {
    issues.push({ path: "explanation", message: "Explanation may contain at most two sentences." });
  }
  return issues;
}

export function canRunExperiment(
  session: GameSession,
  experiment: ExperimentDefinition,
): boolean {
  const previousRuns = session.runs.filter(
    (run) => run.experimentId === experiment.id,
  ).length;
  return (
    session.phase === "lab" &&
    previousRuns < experiment.maxRuns &&
    session.budgetRemaining >= experiment.cost
  );
}
