import type { PublicCaseDefinition } from "../../../types/game";

export const FADING_SIGNAL_HYPOTHESIS_IDS = [
  "competitive_inhibition",
  "enzyme_loss",
  "optical_interference",
] as const;

export const FADING_SIGNAL_EXPERIMENT_IDS = [
  "repeat_fluorescent_assay",
  "same_channel_dose_response",
  "soluble_enzyme_abundance",
  "post_reaction_spike_in",
  "orthogonal_product_quantification",
  "substrate_titration_same_readout",
] as const;

export const fadingSignalCase = {
  id: "fading-signal",
  version: 1,
  title: "CASE 01 — THE FADING SIGNAL",
  codename: "The Fading Signal",
  difficulty: "intro",
  estimatedMinutes: 12,
  brief:
    "A purified enzyme converts substrate S into a fluorescent product. Adding the synthetic compound V-17 reduces the measured fluorescence slope by 62% compared with the vehicle control. The plate, temperature, enzyme batch, and substrate concentration are matched.",
  question: "What actually changed: chemistry, enzyme amount, or only the readout?",
  initialBudget: 100,
  parCost: 39,
  observationAsset: {
    src: "/cases/fading-signal/initial-observation.png",
    alt: "Synthetic fluorescence traces comparing matched vehicle and V-17 conditions, with the V-17 slope reduced by 62 percent.",
  },
  authoredObservationFallback: {
    observation:
      "The V-17 trace rises more slowly than the matched vehicle trace throughout the measured interval.",
    measuredSignal: "The measured fluorescence slope is 62% lower with V-17.",
    conditionsCompared: ["Vehicle control", "V-17 treatment"],
    visibleControls: [
      "Matched plate",
      "Matched temperature",
      "Same enzyme batch",
      "Same substrate concentration",
    ],
    missingControls: [
      "Independent product readout",
      "Soluble enzyme abundance",
      "Post-reaction spike-in",
    ],
    ambiguity:
      "The image cannot show whether chemistry, enzyme amount, or only the optical readout changed.",
    confidence: 0.98,
  },
  hypotheses: [
    {
      id: "competitive_inhibition",
      shortLabel: "H1",
      title: "Competitive catalytic inhibition",
      mechanism:
        "V-17 binds the enzyme and reduces catalysis. High substrate may partly rescue the reaction. Chemical product remains low.",
      icon: "◇",
      linePattern: "solid",
      accentColor: "#F4B84A",
    },
    {
      id: "enzyme_loss",
      shortLabel: "H2",
      title: "Enzyme loss",
      mechanism:
        "V-17 destabilizes or precipitates the enzyme. Soluble enzyme abundance and chemical product are low.",
      icon: "▽",
      linePattern: "dash",
      accentColor: "#FF5B54",
    },
    {
      id: "optical_interference",
      shortLabel: "H3",
      title: "Optical interference",
      mechanism:
        "V-17 masks the fluorescent signal without reducing product formation. A non-fluorescent product measurement remains normal, and post-reaction addition changes the signal immediately.",
      icon: "◉",
      linePattern: "dot",
      accentColor: "#54DCE4",
    },
  ],
  experiments: [
    {
      id: "repeat_fluorescent_assay",
      title: "Repeat the fluorescent assay",
      purpose: "Check whether the original signal loss is reproducible.",
      category: "repeat",
      cost: 8,
      maxRuns: 2,
      possibleOutcomes: [
        {
          id: "low_signal_reproduced",
          title: "Low signal reproduced",
          summary:
            "The matched repeat again shows a fluorescence slope about 62% below vehicle.",
          assetSrc:
            "/cases/fading-signal/outcomes/low_signal_reproduced.svg",
        },
        {
          id: "signal_not_reproduced",
          title: "Signal loss not reproduced",
          summary:
            "The repeated fluorescence slopes now overlap within expected variation.",
          assetSrc:
            "/cases/fading-signal/outcomes/signal_not_reproduced.svg",
        },
      ],
      likelihoods: {
        competitive_inhibition: {
          low_signal_reproduced: 0.95,
          signal_not_reproduced: 0.05,
        },
        enzyme_loss: {
          low_signal_reproduced: 0.95,
          signal_not_reproduced: 0.05,
        },
        optical_interference: {
          low_signal_reproduced: 0.95,
          signal_not_reproduced: 0.05,
        },
      },
    },
    {
      id: "same_channel_dose_response",
      title: "Same-channel dose response",
      purpose: "Test whether increasing V-17 tracks with the same fluorescent readout.",
      category: "titration",
      cost: 12,
      maxRuns: 1,
      possibleOutcomes: [
        {
          id: "dose_dependent_signal_drop",
          title: "Dose-dependent signal drop",
          summary:
            "Higher V-17 concentrations produce progressively smaller fluorescence slopes.",
          assetSrc:
            "/cases/fading-signal/outcomes/dose_dependent_signal_drop.svg",
        },
        {
          id: "no_dose_response",
          title: "No dose-dependent signal drop",
          summary:
            "Changing V-17 concentration does not produce an ordered change in fluorescence.",
          assetSrc:
            "/cases/fading-signal/outcomes/no_dose_response.svg",
        },
      ],
      likelihoods: {
        competitive_inhibition: {
          dose_dependent_signal_drop: 0.9,
          no_dose_response: 0.1,
        },
        enzyme_loss: {
          dose_dependent_signal_drop: 0.9,
          no_dose_response: 0.1,
        },
        optical_interference: {
          dose_dependent_signal_drop: 0.9,
          no_dose_response: 0.1,
        },
      },
    },
    {
      id: "soluble_enzyme_abundance",
      title: "Measure soluble enzyme abundance",
      purpose: "Test whether V-17 removes enzyme from the soluble fraction.",
      category: "abundance",
      cost: 18,
      maxRuns: 1,
      possibleOutcomes: [
        {
          id: "abundance_unchanged",
          title: "Soluble abundance unchanged",
          summary:
            "The soluble enzyme signal is unchanged between vehicle and V-17 conditions.",
          assetSrc:
            "/cases/fading-signal/outcomes/abundance_unchanged.svg",
        },
        {
          id: "abundance_reduced",
          title: "Soluble abundance reduced",
          summary:
            "The soluble enzyme signal is strongly reduced after V-17 exposure.",
          assetSrc: "/cases/fading-signal/outcomes/abundance_reduced.svg",
        },
      ],
      likelihoods: {
        competitive_inhibition: {
          abundance_unchanged: 0.98,
          abundance_reduced: 0.02,
        },
        enzyme_loss: {
          abundance_unchanged: 0.02,
          abundance_reduced: 0.98,
        },
        optical_interference: {
          abundance_unchanged: 0.98,
          abundance_reduced: 0.02,
        },
      },
    },
    {
      id: "post_reaction_spike_in",
      title: "Post-reaction spike-in",
      purpose: "Add V-17 only after product formation is complete.",
      category: "timing",
      cost: 15,
      maxRuns: 1,
      possibleOutcomes: [
        {
          id: "immediate_signal_drop",
          title: "Signal falls immediately",
          summary:
            "Adding V-17 after the reaction is complete causes an immediate 61% fluorescence drop.",
          assetSrc:
            "/cases/fading-signal/outcomes/immediate_signal_drop.svg",
        },
        {
          id: "no_immediate_change",
          title: "No immediate signal change",
          summary:
            "Adding V-17 after the reaction is complete does not immediately change fluorescence.",
          assetSrc:
            "/cases/fading-signal/outcomes/no_immediate_change.svg",
        },
      ],
      likelihoods: {
        competitive_inhibition: {
          immediate_signal_drop: 0.02,
          no_immediate_change: 0.98,
        },
        enzyme_loss: {
          immediate_signal_drop: 0.02,
          no_immediate_change: 0.98,
        },
        optical_interference: {
          immediate_signal_drop: 0.98,
          no_immediate_change: 0.02,
        },
      },
    },
    {
      id: "orthogonal_product_quantification",
      title: "Orthogonal product quantification",
      purpose: "Measure chemical product with a non-fluorescent method.",
      category: "orthogonal",
      cost: 24,
      maxRuns: 1,
      possibleOutcomes: [
        {
          id: "normal_product_amount",
          title: "Normal product amount",
          summary:
            "The orthogonal measurement finds the same product amount with vehicle and V-17.",
          assetSrc:
            "/cases/fading-signal/outcomes/normal_product_amount.svg",
        },
        {
          id: "low_product_amount",
          title: "Product amount reduced",
          summary:
            "The orthogonal measurement confirms that less chemical product formed with V-17.",
          assetSrc: "/cases/fading-signal/outcomes/low_product_amount.svg",
        },
      ],
      likelihoods: {
        competitive_inhibition: {
          normal_product_amount: 0.02,
          low_product_amount: 0.98,
        },
        enzyme_loss: {
          normal_product_amount: 0.02,
          low_product_amount: 0.98,
        },
        optical_interference: {
          normal_product_amount: 0.98,
          low_product_amount: 0.02,
        },
      },
    },
    {
      id: "substrate_titration_same_readout",
      title: "Substrate titration, same readout",
      purpose: "Raise substrate concentration while retaining the fluorescent readout.",
      category: "rescue",
      cost: 20,
      maxRuns: 1,
      possibleOutcomes: [
        {
          id: "no_apparent_rescue",
          title: "No apparent rescue",
          summary:
            "Higher substrate does not restore the V-17 fluorescence trace toward vehicle.",
          assetSrc:
            "/cases/fading-signal/outcomes/no_apparent_rescue.svg",
        },
        {
          id: "partial_rescue",
          title: "Partial signal rescue",
          summary:
            "Higher substrate partly restores the V-17 fluorescence trace toward vehicle.",
          assetSrc:
            "/cases/fading-signal/outcomes/partial_rescue.svg",
        },
      ],
      likelihoods: {
        competitive_inhibition: {
          no_apparent_rescue: 0.02,
          partial_rescue: 0.98,
        },
        enzyme_loss: {
          no_apparent_rescue: 0.98,
          partial_rescue: 0.02,
        },
        optical_interference: {
          no_apparent_rescue: 0.98,
          partial_rescue: 0.02,
        },
      },
    },
  ],
} as const satisfies PublicCaseDefinition;

export type FadingSignalHypothesisId =
  (typeof FADING_SIGNAL_HYPOTHESIS_IDS)[number];

export type FadingSignalExperimentId =
  (typeof FADING_SIGNAL_EXPERIMENT_IDS)[number];

export function getFadingSignalExperiment(id: string) {
  return fadingSignalCase.experiments.find((experiment) => experiment.id === id);
}
