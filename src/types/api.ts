import type {
  ExperimentId,
  ExperimentOutcome,
  HypothesisId,
  ProbabilityDistribution,
  ReasoningFingerprint,
  ScoreBreakdown,
} from "./game";

export interface ExperimentRunResponse {
  runId: string;
  experimentId: ExperimentId;
  cost: number;
  budgetRemaining: number;
  outcome: ExperimentOutcome;
  enginePrior: ProbabilityDistribution;
  enginePosterior: ProbabilityDistribution;
  informationGainBits: number;
  predictionUseful: boolean;
  predictionMessage: string;
}

export interface DebriefResponse {
  trueHypothesisId: HypothesisId;
  trueHypothesisTitle: string;
  reveal: {
    title: string;
    explanation: string;
    optimalPath: readonly ExperimentId[];
    takeaway: string;
  };
  enginePosterior: ProbabilityDistribution;
  engineConfidence: number;
  playerConfidence: number;
  budgetSpent: number;
  score: ScoreBreakdown;
  fingerprint: ReasoningFingerprint;
}

export interface ApiErrorResponse {
  error: string;
}
