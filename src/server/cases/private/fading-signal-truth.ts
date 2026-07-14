import "server-only";

import type { PrivateCaseTruth } from "../../../types/game";

export const fadingSignalTruth = {
  caseId: "fading-signal",
  trueHypothesisId: "optical_interference",
  actualOutcomeByExperiment: {
    repeat_fluorescent_assay: "low_signal_reproduced",
    same_channel_dose_response: "dose_dependent_signal_drop",
    soluble_enzyme_abundance: "abundance_unchanged",
    post_reaction_spike_in: "immediate_signal_drop",
    orthogonal_product_quantification: "normal_product_amount",
    substrate_titration_same_readout: "no_apparent_rescue",
  },
  debrief: {
    title: "THE CHEMISTRY NEVER STOPPED.",
    explanation:
      "V-17 changed the instrument's view of the product, not the amount of product. The decisive evidence was temporal and orthogonal: the signal fell after chemistry was complete, while a different measurement found normal product.",
    optimalPath: [
      "post_reaction_spike_in",
      "orthogonal_product_quantification",
    ],
    takeaway:
      "A timing control and an independent readout can separate changed chemistry from changed observation.",
  },
} as const satisfies PrivateCaseTruth;

