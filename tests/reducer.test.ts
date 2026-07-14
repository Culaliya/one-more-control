import { describe, expect, it } from "vitest";
import { fadingSignalCase, getFadingSignalExperiment } from "../src/data/cases/public/fading-signal";
import { updatePosteriorForOutcome } from "../src/lib/game/bayes";
import { klDivergenceBits } from "../src/lib/game/entropy";
import {
  createInitialGameSession,
  gameReducer,
  GameRuleError,
} from "../src/lib/game/reducer";
import type { ExperimentDefinition, ExperimentRun, GameSession } from "../src/types/game";

const hypothesisIds = fadingSignalCase.hypotheses.map(({ id }) => id);

function enterLab(): GameSession {
  let session = createInitialGameSession(fadingSignalCase, "test-session");
  session = gameReducer(session, { type: "ENTER_PRIORS" });
  return gameReducer(session, {
    type: "LOCK_PRIORS",
    beliefs: { competitive_inhibition: 34, enzyme_loss: 33, optical_interference: 33 },
    hypothesisIds,
  });
}

function requireExperiment(id: string): ExperimentDefinition {
  const experiment = getFadingSignalExperiment(id);
  if (!experiment) throw new Error(`Missing experiment ${id}`);
  return experiment;
}

function authoredRun(
  session: GameSession,
  experiment: ExperimentDefinition,
  outcomeId: string,
  runId: string,
): ExperimentRun {
  const posterior = updatePosteriorForOutcome(session.enginePosterior, experiment, outcomeId);
  return {
    runId,
    experimentId: experiment.id,
    cost: experiment.cost,
    outcomeId,
    prediction: { splitGroups: [["competitive_inhibition", "enzyme_loss"], ["optical_interference"]] },
    predictionUseful: true,
    enginePrior: session.enginePosterior,
    enginePosterior: posterior,
    informationGainBits: klDivergenceBits(posterior, session.enginePosterior),
    playerBeliefsBefore: session.playerBeliefs,
    createdAt: "2026-07-14T00:00:00.000Z",
  };
}

function recordAndUpdate(
  session: GameSession,
  experiment: ExperimentDefinition,
  outcomeId: string,
  runId: string,
): GameSession {
  let next = gameReducer(session, {
    type: "RECORD_RESULT",
    experiment,
    run: authoredRun(session, experiment, outcomeId, runId),
    hypothesisIds,
  });
  next = gameReducer(next, { type: "BEGIN_BELIEF_UPDATE" });
  return gameReducer(next, {
    type: "COMMIT_BELIEF_UPDATE",
    beliefs: next.playerBeliefs,
    hypothesisIds,
  });
}

describe("game reducer invariants", () => {
  it("deducts an authored cost once and requires a belief update", () => {
    const lab = enterLab();
    const repeat = requireExperiment("repeat_fluorescent_assay");
    const result = gameReducer(lab, {
      type: "RECORD_RESULT",
      experiment: repeat,
      run: authoredRun(lab, repeat, "low_signal_reproduced", "run-1"),
      hypothesisIds,
    });
    expect(result.budgetRemaining).toBe(92);
    expect(result.phase).toBe("result");
    expect(() =>
      gameReducer(result, {
        type: "RECORD_RESULT",
        experiment: repeat,
        run: authoredRun(result, repeat, "low_signal_reproduced", "run-2"),
        hypothesisIds,
      }),
    ).toThrow(GameRuleError);
  });

  it("never allows a negative budget or a third repeat", () => {
    const repeat = requireExperiment("repeat_fluorescent_assay");
    const poorSession = { ...enterLab(), budgetRemaining: 7 };
    expect(() =>
      gameReducer(poorSession, {
        type: "RECORD_RESULT",
        experiment: repeat,
        run: authoredRun(poorSession, repeat, "low_signal_reproduced", "poor"),
        hypothesisIds,
      }),
    ).toThrow(GameRuleError);
    expect(poorSession.budgetRemaining).toBe(7);

    let session = enterLab();
    session = recordAndUpdate(session, repeat, "low_signal_reproduced", "repeat-1");
    session = recordAndUpdate(session, repeat, "low_signal_reproduced", "repeat-2");
    expect(() =>
      gameReducer(session, {
        type: "RECORD_RESULT",
        experiment: repeat,
        run: authoredRun(session, repeat, "low_signal_reproduced", "repeat-3"),
        hypothesisIds,
      }),
    ).toThrow(GameRuleError);
  });

  it("reaches debrief through authored results without an OpenAI key", () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    let session = enterLab();
    session = recordAndUpdate(session, requireExperiment("post_reaction_spike_in"), "immediate_signal_drop", "spike");
    session = recordAndUpdate(session, requireExperiment("orthogonal_product_quantification"), "normal_product_amount", "orthogonal");
    session = gameReducer(session, { type: "OPEN_VERDICT" });
    session = gameReducer(session, {
      type: "SUBMIT_VERDICT",
      hypothesisIds,
      verdict: {
        hypothesisId: "optical_interference",
        confidence: 99,
        evidenceRunIndexes: [0, 1],
        falsifiedHypothesisId: "competitive_inhibition",
        falsifyingEvidenceRunIndex: 0,
      },
    });
    expect(session.phase).toBe("debrief");
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });
});

