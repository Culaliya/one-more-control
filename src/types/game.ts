export type HypothesisId = string;
export type ExperimentId = string;
export type OutcomeId = string;

export type ProbabilityDistribution = Record<HypothesisId, number>;
export type PlayerBeliefs = Record<HypothesisId, number>;

export interface ObservationInterpretation {
  observation: string;
  measuredSignal: string;
  conditionsCompared: string[];
  visibleControls: string[];
  missingControls: string[];
  ambiguity: string;
  confidence: number;
}

export type HypothesisLinePattern = "solid" | "dash" | "dot";

export interface HypothesisDefinition {
  id: HypothesisId;
  shortLabel: string;
  title: string;
  mechanism: string;
  icon: string;
  linePattern: HypothesisLinePattern;
  accentColor: string;
}

export interface ExperimentOutcome {
  id: OutcomeId;
  title: string;
  summary: string;
  assetSrc: string;
}

export type ExperimentCategory =
  | "repeat"
  | "abundance"
  | "orthogonal"
  | "timing"
  | "rescue"
  | "titration";

export interface ExperimentDefinition {
  id: ExperimentId;
  title: string;
  purpose: string;
  category: ExperimentCategory;
  cost: number;
  maxRuns: number;
  possibleOutcomes: readonly ExperimentOutcome[];
  likelihoods: Readonly<
    Record<HypothesisId, Readonly<Record<OutcomeId, number>>>
  >;
}

export interface PublicCaseDefinition {
  id: string;
  version: 1;
  title: string;
  codename: string;
  difficulty: "intro" | "intermediate";
  estimatedMinutes: number;
  brief: string;
  question: string;
  initialBudget: number;
  /** Full-efficiency benchmark for the featured teaching route, not a minimum. */
  parCost: number;
  observationAsset: {
    src: string;
    alt: string;
  };
  authoredObservationFallback: ObservationInterpretation;
  hypotheses: readonly HypothesisDefinition[];
  experiments: readonly ExperimentDefinition[];
}

export interface PrivateCaseDebrief {
  title: string;
  explanation: string;
  featuredDecisivePath: readonly ExperimentId[];
  takeaway: string;
}

export interface PrivateCaseTruth {
  caseId: string;
  trueHypothesisId: HypothesisId;
  actualOutcomeByExperiment: Readonly<Record<ExperimentId, OutcomeId>>;
  debrief: PrivateCaseDebrief;
}

export interface SplitPlayerPrediction {
  mode: "split";
  splitGroups: readonly [
    readonly HypothesisId[],
    readonly HypothesisId[],
  ];
  rationale?: string;
}

export interface NoSeparationPlayerPrediction {
  mode: "no_separation";
  hypothesisIds: readonly HypothesisId[];
  rationale?: string;
}

export type PlayerPrediction =
  | SplitPlayerPrediction
  | NoSeparationPlayerPrediction;

export interface PlayerRunTrailEntry {
  experimentId: ExperimentId;
  prediction: PlayerPrediction;
  playerBeliefsBefore: PlayerBeliefs;
  playerBeliefsAfter: PlayerBeliefs;
  createdAt: string;
}

export interface ExperimentRun {
  runId: string;
  experimentId: ExperimentId;
  cost: number;
  outcomeId: OutcomeId;
  prediction: PlayerPrediction;
  predictionUseful: boolean;
  enginePrior: ProbabilityDistribution;
  enginePosterior: ProbabilityDistribution;
  informationGainBits: number;
  playerBeliefsBefore: PlayerBeliefs;
  playerBeliefsAfter?: PlayerBeliefs;
  createdAt: string;
}

export type GamePhase =
  | "briefing"
  | "priors"
  | "lab"
  | "result"
  | "belief_update"
  | "verdict"
  | "debrief";

export interface VerdictSubmission {
  hypothesisId: HypothesisId;
  confidence: number;
  evidenceRunIndexes: readonly [number, number];
  falsifiedHypothesisId: HypothesisId;
  falsifyingEvidenceRunIndex: number;
  explanation?: string;
}

export interface GameSession {
  schemaVersion: 2;
  id: string;
  caseId: string;
  caseVersion: number;
  phase: GamePhase;
  budgetRemaining: number;
  playerBeliefs: PlayerBeliefs;
  enginePosterior: ProbabilityDistribution;
  priorsLocked: boolean;
  runs: readonly ExperimentRun[];
  finalVerdict?: VerdictSubmission;
}

export interface ScoreBreakdown {
  correctMechanism: number;
  evidenceChain: number;
  budgetEfficiency: number;
  falsificationQuality: number;
  total: number;
}

export interface ReasoningFingerprint {
  falsificationIndex: number;
  redundancyRate: number;
  evidenceEfficiency: number;
  calibrationGapPercentagePoints: number;
  predictionAccuracy: number;
  noSeparationRecognition: number | null;
  beliefResponsiveness: number;
}
