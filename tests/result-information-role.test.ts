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
import { classifyResultInformationRole } from "../src/lib/game/experiment-structure";

function requireExperiment(id: string) {
  const experiment = getFadingSignalExperiment(id);
  if (!experiment) throw new Error(`Missing experiment ${id}.`);
  return experiment;
}

const neutralPrior = createUniformDistribution(
  fadingSignalCase.hypotheses.map(({ id }) => id),
);

function informationAfter(
  prior: Record<string, number>,
  experimentId: string,
  outcomeId: string,
) {
  const experiment = requireExperiment(experimentId);
  const posterior = updatePosteriorForOutcome(prior, experiment, outcomeId);
  return {
    experiment,
    posterior,
    informationGainBits: klDivergenceBits(posterior, prior),
  };
}

describe("result information roles", () => {
  it("keeps a neutral repeat at zero bits and low value", () => {
    const result = informationAfter(
      neutralPrior,
      "repeat_fluorescent_assay",
      "low_signal_reproduced",
    );

    expect(result.informationGainBits).toBeCloseTo(0, 12);
    expect(
      classifyResultInformationRole({
        experiment: result.experiment,
        priorExperiments: [],
        informationGainBits: result.informationGainBits,
        predictionUseful: true,
      }),
    ).toBe("low_value");
  });

  it("keeps another non-separating same-channel measurement low value", () => {
    const repeat = requireExperiment("repeat_fluorescent_assay");
    const result = informationAfter(
      neutralPrior,
      "same_channel_dose_response",
      "dose_dependent_signal_drop",
    );

    expect(result.informationGainBits).toBeCloseTo(0, 12);
    expect(
      classifyResultInformationRole({
        experiment: result.experiment,
        priorExperiments: [repeat],
        informationGainBits: result.informationGainBits,
        predictionUseful: true,
      }),
    ).toBe("low_value");
  });

  it("treats orthogonal quantification after the timing control as independent confirmation", () => {
    const first = informationAfter(
      neutralPrior,
      "post_reaction_spike_in",
      "immediate_signal_drop",
    );
    const second = informationAfter(
      first.posterior,
      "orthogonal_product_quantification",
      "normal_product_amount",
    );

    expect(second.informationGainBits).toBeLessThan(0.1);
    expect(
      classifyResultInformationRole({
        experiment: second.experiment,
        priorExperiments: [first.experiment],
        informationGainBits: second.informationGainBits,
        predictionUseful: true,
      }),
    ).toBe("independent_confirmation");
  });

  it("also treats the timing control second as independent confirmation", () => {
    const first = informationAfter(
      neutralPrior,
      "orthogonal_product_quantification",
      "normal_product_amount",
    );
    const second = informationAfter(
      first.posterior,
      "post_reaction_spike_in",
      "immediate_signal_drop",
    );

    expect(second.informationGainBits).toBeLessThan(0.1);
    expect(
      classifyResultInformationRole({
        experiment: second.experiment,
        priorExperiments: [first.experiment],
        informationGainBits: second.informationGainBits,
        predictionUseful: true,
      }),
    ).toBe("independent_confirmation");
  });
});
