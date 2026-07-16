import "server-only";

import { z } from "zod";
import {
  FADING_SIGNAL_EXPERIMENT_IDS,
  FADING_SIGNAL_HYPOTHESIS_IDS,
} from "@/data/cases/public/fading-signal";

export const fadingSignalHypothesisIdSchema = z.enum(
  FADING_SIGNAL_HYPOTHESIS_IDS,
);
export const fadingSignalExperimentIdSchema = z.enum(
  FADING_SIGNAL_EXPERIMENT_IDS,
);

const rationaleSchema = z.string().trim().min(1).max(180).optional();

export const playerPredictionSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("split"),
      splitGroups: z.tuple([
        z.array(fadingSignalHypothesisIdSchema).min(1).max(2),
        z.array(fadingSignalHypothesisIdSchema).min(1).max(2),
      ]),
      rationale: rationaleSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal("no_separation"),
      hypothesisIds: z.array(fadingSignalHypothesisIdSchema).length(3),
      rationale: rationaleSchema,
    })
    .strict(),
]);

export const playerBeliefsSchema = z
  .object({
    competitive_inhibition: z.number().int().min(5).max(90),
    enzyme_loss: z.number().int().min(5).max(90),
    optical_interference: z.number().int().min(5).max(90),
  })
  .strict()
  .refine(
    (beliefs) =>
      beliefs.competitive_inhibition +
        beliefs.enzyme_loss +
        beliefs.optical_interference ===
      100,
    { message: "Player beliefs must total 100." },
  );

export const playerRunTrailEntrySchema = z
  .object({
    experimentId: fadingSignalExperimentIdSchema,
    prediction: playerPredictionSchema,
    playerBeliefsBefore: playerBeliefsSchema,
    playerBeliefsAfter: playerBeliefsSchema,
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const verdictSchema = z
  .object({
    hypothesisId: fadingSignalHypothesisIdSchema,
    confidence: z.number().int().min(34).max(100),
    evidenceRunIndexes: z.tuple([
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
    ]),
    falsifiedHypothesisId: fadingSignalHypothesisIdSchema,
    falsifyingEvidenceRunIndex: z.number().int().nonnegative(),
    explanation: z.string().trim().min(1).max(280).optional(),
  })
  .strict();
