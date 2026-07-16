import type {
  ExperimentDefinition,
  ExperimentRun,
  GamePhase,
  GameSession,
  HypothesisId,
  PlayerBeliefs,
  PublicCaseDefinition,
  VerdictSubmission,
} from "../../types/game";
import { createInitialPlayerBeliefs } from "./beliefs";
import { createUniformDistribution } from "./bayes";
import {
  canRunExperiment,
  validatePlayerBeliefs,
  validatePlayerPrediction,
  validateVerdictSubmission,
} from "./validation";

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameRuleError";
  }
}

export type GameAction =
  | { type: "ENTER_PRIORS" }
  | {
      type: "LOCK_PRIORS";
      beliefs: PlayerBeliefs;
      hypothesisIds: readonly HypothesisId[];
    }
  | {
      type: "RECORD_RESULT";
      experiment: ExperimentDefinition;
      run: ExperimentRun;
      hypothesisIds: readonly HypothesisId[];
    }
  | { type: "BEGIN_BELIEF_UPDATE" }
  | {
      type: "COMMIT_BELIEF_UPDATE";
      beliefs: PlayerBeliefs;
      hypothesisIds: readonly HypothesisId[];
    }
  | { type: "OPEN_VERDICT" }
  | { type: "RETURN_TO_LAB" }
  | {
      type: "SUBMIT_VERDICT";
      verdict: VerdictSubmission;
      hypothesisIds: readonly HypothesisId[];
    }
  | {
      type: "RESET_SESSION";
      caseDefinition: PublicCaseDefinition;
      sessionId: string;
    };

function requirePhase(session: GameSession, phase: GamePhase): void {
  if (session.phase !== phase) {
    throw new GameRuleError(
      `Action requires phase ${phase}; current phase is ${session.phase}.`,
    );
  }
}

function throwValidationIssues(prefix: string, messages: readonly string[]): never {
  throw new GameRuleError(`${prefix}: ${messages.join(" ")}`);
}

export function createInitialGameSession(
  caseDefinition: PublicCaseDefinition,
  sessionId: string,
): GameSession {
  const hypothesisIds = caseDefinition.hypotheses.map(({ id }) => id);
  return {
    schemaVersion: 2,
    id: sessionId,
    caseId: caseDefinition.id,
    caseVersion: caseDefinition.version,
    phase: "briefing",
    budgetRemaining: caseDefinition.initialBudget,
    playerBeliefs: createInitialPlayerBeliefs(hypothesisIds),
    enginePosterior: createUniformDistribution(hypothesisIds),
    priorsLocked: false,
    runs: [],
  };
}

export function gameReducer(
  session: GameSession,
  action: GameAction,
): GameSession {
  switch (action.type) {
    case "ENTER_PRIORS": {
      requirePhase(session, "briefing");
      return { ...session, phase: "priors" };
    }

    case "LOCK_PRIORS": {
      requirePhase(session, "priors");
      const issues = validatePlayerBeliefs(action.beliefs, action.hypothesisIds);
      if (issues.length > 0) {
        return throwValidationIssues(
          "Invalid priors",
          issues.map(({ message }) => message),
        );
      }
      return {
        ...session,
        phase: "lab",
        priorsLocked: true,
        playerBeliefs: { ...action.beliefs },
      };
    }

    case "RECORD_RESULT": {
      requirePhase(session, "lab");
      if (!canRunExperiment(session, action.experiment)) {
        throw new GameRuleError(
          "Experiment is unaffordable, exhausted, or unavailable in this phase.",
        );
      }
      if (
        action.run.experimentId !== action.experiment.id ||
        action.run.cost !== action.experiment.cost
      ) {
        throw new GameRuleError(
          "Experiment result does not match the authored card and cost.",
        );
      }
      const predictionIssues = validatePlayerPrediction(
        action.run.prediction,
        action.hypothesisIds,
      );
      if (predictionIssues.length > 0) {
        return throwValidationIssues(
          "Invalid prediction",
          predictionIssues.map(({ message }) => message),
        );
      }

      const budgetRemaining = session.budgetRemaining - action.experiment.cost;
      if (budgetRemaining < 0) {
        throw new GameRuleError("Budget cannot become negative.");
      }
      const recordedRun: ExperimentRun = {
        ...action.run,
        cost: action.experiment.cost,
        playerBeliefsBefore: { ...session.playerBeliefs },
        playerBeliefsAfter: undefined,
      };
      return {
        ...session,
        phase: "result",
        budgetRemaining,
        enginePosterior: { ...recordedRun.enginePosterior },
        runs: [...session.runs, recordedRun],
      };
    }

    case "BEGIN_BELIEF_UPDATE": {
      requirePhase(session, "result");
      return { ...session, phase: "belief_update" };
    }

    case "COMMIT_BELIEF_UPDATE": {
      requirePhase(session, "belief_update");
      const issues = validatePlayerBeliefs(action.beliefs, action.hypothesisIds);
      if (issues.length > 0) {
        return throwValidationIssues(
          "Invalid belief update",
          issues.map(({ message }) => message),
        );
      }
      const latestIndex = session.runs.length - 1;
      if (latestIndex < 0) {
        throw new GameRuleError("There is no experiment result to update.");
      }
      const runs = session.runs.map((run, index) =>
        index === latestIndex
          ? { ...run, playerBeliefsAfter: { ...action.beliefs } }
          : run,
      );
      return {
        ...session,
        phase: "lab",
        playerBeliefs: { ...action.beliefs },
        runs,
      };
    }

    case "OPEN_VERDICT": {
      requirePhase(session, "lab");
      if (session.runs.length < 2) {
        throw new GameRuleError("At least two experiment results are required.");
      }
      return { ...session, phase: "verdict" };
    }

    case "RETURN_TO_LAB": {
      requirePhase(session, "verdict");
      return { ...session, phase: "lab" };
    }

    case "SUBMIT_VERDICT": {
      requirePhase(session, "verdict");
      const issues = validateVerdictSubmission(
        action.verdict,
        session,
        action.hypothesisIds,
      );
      if (issues.length > 0) {
        return throwValidationIssues(
          "Invalid verdict",
          issues.map(({ message }) => message),
        );
      }
      return {
        ...session,
        phase: "debrief",
        finalVerdict: { ...action.verdict },
      };
    }

    case "RESET_SESSION":
      return createInitialGameSession(action.caseDefinition, action.sessionId);
  }
}
