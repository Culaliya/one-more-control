import { describe, expect, it } from "vitest";
import {
  fadingSignalCase,
  getFadingSignalExperiment,
} from "../src/data/cases/public/fading-signal";
import {
  createUniformDistribution,
  updatePosteriorForOutcome,
} from "../src/lib/game/bayes";
import { klDivergenceBits } from "../src/lib/game/entropy";
import { validatePlayerPrediction } from "../src/lib/game/validation";
import { predictionMatchesExperiment } from "../src/server/cases/fading-signal-engine";

function requireExperiment(id: string) {
  const experiment = getFadingSignalExperiment(id);
  if (!experiment) {
    throw new Error(`Missing experiment ${id}`);
  }
  return experiment;
}

describe("The Fading Signal scientific invariants", () => {
  const neutralPrior = createUniformDistribution(
    fadingSignalCase.hypotheses.map(({ id }) => id),
  );

  it("keeps the repeated fluorescent assay below 0.02 bits", () => {
    const repeat = requireExperiment("repeat_fluorescent_assay");
    const posterior = updatePosteriorForOutcome(
      neutralPrior,
      repeat,
      "low_signal_reproduced",
    );
    expect(klDivergenceBits(posterior, neutralPrior)).toBeLessThan(0.02);
    expect(repeat.maxRuns).toBe(2);
  });

  it("makes the exact 39-unit timing plus orthogonal route decisive", () => {
    const spike = requireExperiment("post_reaction_spike_in");
    const orthogonal = requireExperiment("orthogonal_product_quantification");
    const afterSpike = updatePosteriorForOutcome(
      neutralPrior,
      spike,
      "immediate_signal_drop",
    );
    const finalPosterior = updatePosteriorForOutcome(
      afterSpike,
      orthogonal,
      "normal_product_amount",
    );
    expect(spike.cost + orthogonal.cost).toBe(39);
    expect(finalPosterior.optical_interference).toBeGreaterThan(0.99);
    expect(Object.values(finalPosterior).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
  });

  it("treats no separation as a first-class prediction", () => {
    const noSeparation = {
      mode: "no_separation" as const,
      hypothesisIds: fadingSignalCase.hypotheses.map(({ id }) => id),
    };
    const decisiveSplit = {
      mode: "split" as const,
      splitGroups: [
        ["competitive_inhibition", "enzyme_loss"],
        ["optical_interference"],
      ] as const,
    };
    expect(
      validatePlayerPrediction(
        noSeparation,
        fadingSignalCase.hypotheses.map(({ id }) => id),
      ),
    ).toEqual([]);
    expect(
      predictionMatchesExperiment("repeat_fluorescent_assay", noSeparation),
    ).toBe(true);
    expect(
      predictionMatchesExperiment("post_reaction_spike_in", noSeparation),
    ).toBe(false);
    expect(
      predictionMatchesExperiment("post_reaction_spike_in", decisiveSplit),
    ).toBe(true);
  });
});
