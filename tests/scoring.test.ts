import { describe, expect, it } from "vitest";
import { fadingSignalCase, getFadingSignalExperiment } from "../src/data/cases/public/fading-signal";
import { createUniformDistribution, updatePosteriorForOutcome } from "../src/lib/game/bayes";
import { klDivergenceBits } from "../src/lib/game/entropy";
import {
  calculateBudgetEfficiencyScore,
  calculateReasoningFingerprint,
  scoreVerdict,
} from "../src/lib/game/scoring";
import type { ExperimentRun, PrivateCaseTruth, VerdictSubmission } from "../src/types/game";

const truth: PrivateCaseTruth = {
  caseId: "fading-signal",
  trueHypothesisId: "optical_interference",
  actualOutcomeByExperiment: {},
  debrief: { title: "", explanation: "", optimalPath: [], takeaway: "" },
};

function idealRuns(): ExperimentRun[] {
  let prior = createUniformDistribution(fadingSignalCase.hypotheses.map(({ id }) => id));
  return [
    ["post_reaction_spike_in", "immediate_signal_drop"],
    ["orthogonal_product_quantification", "normal_product_amount"],
  ].map(([experimentId, outcomeId], index) => {
    const experiment = getFadingSignalExperiment(experimentId);
    if (!experiment) throw new Error("Missing ideal experiment");
    const posterior = updatePosteriorForOutcome(prior, experiment, outcomeId);
    const run: ExperimentRun = {
      runId: `run-${index}`,
      experimentId,
      outcomeId,
      cost: experiment.cost,
      prediction: { splitGroups: [["competitive_inhibition", "enzyme_loss"], ["optical_interference"]] },
      predictionUseful: true,
      enginePrior: prior,
      enginePosterior: posterior,
      informationGainBits: klDivergenceBits(posterior, prior),
      playerBeliefsBefore: { competitive_inhibition: 34, enzyme_loss: 33, optical_interference: 33 },
      playerBeliefsAfter: { competitive_inhibition: 5, enzyme_loss: 5, optical_interference: 90 },
      createdAt: "2026-07-14T00:00:00.000Z",
    };
    prior = posterior;
    return run;
  });
}

describe("score and reasoning fingerprint", () => {
  const verdict: VerdictSubmission = {
    hypothesisId: "optical_interference",
    confidence: 99,
    evidenceRunIndexes: [0, 1],
    falsifiedHypothesisId: "competitive_inhibition",
    falsifyingEvidenceRunIndex: 0,
  };

  it("awards the full 100 points to the ideal 39-unit evidence chain", () => {
    const runs = idealRuns();
    expect(scoreVerdict({ caseDefinition: fadingSignalCase, truth, runs, verdict })).toEqual({
      correctMechanism: 50,
      evidenceChain: 20,
      budgetEfficiency: 15,
      falsificationQuality: 15,
      total: 100,
    });
  });

  it("computes the documented fingerprint metrics deterministically", () => {
    const runs = idealRuns();
    const fingerprint = calculateReasoningFingerprint({
      runs,
      experiments: fadingSignalCase.experiments,
      verdict,
      enginePosterior: runs[1].enginePosterior,
    });
    expect(fingerprint.falsificationIndex).toBe(1);
    expect(fingerprint.redundancyRate).toBe(0.5);
    expect(fingerprint.evidenceEfficiency).toBeGreaterThan(0);
    expect(fingerprint.calibrationGapPercentagePoints).toBeLessThan(1);
  });

  it("reduces efficiency linearly after par and reaches zero at full budget", () => {
    expect(calculateBudgetEfficiencyScore(39, 39, 100)).toBe(15);
    expect(calculateBudgetEfficiencyScore(100, 39, 100)).toBe(0);
    expect(calculateBudgetEfficiencyScore(70, 39, 100)).toBeGreaterThan(0);
  });
});
